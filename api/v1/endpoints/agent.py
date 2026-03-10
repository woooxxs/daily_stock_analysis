# -*- coding: utf-8 -*-
"""
Agent API endpoints.
"""

import asyncio
import json
import logging
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.config import get_config

# Tool name -> Chinese display name mapping
TOOL_DISPLAY_NAMES: Dict[str, str] = {
    "get_realtime_quote": "获取实时行情",
    "get_daily_history": "获取历史K线",
    "get_chip_distribution": "分析筹码分布",
    "get_analysis_context": "获取分析上下文",
    "get_stock_info": "获取股票基本面",
    "search_stock_news": "搜索股票新闻",
    "search_comprehensive_intel": "搜索综合情报",
    "analyze_trend": "分析技术趋势",
    "calculate_ma": "计算均线系统",
    "get_volume_analysis": "分析量能变化",
    "analyze_pattern": "识别K线形态",
    "get_market_indices": "获取市场指数",
    "get_sector_rankings": "分析行业板块",
}

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    skills: Optional[List[str]] = None
    context: Optional[Dict[str, Any]] = None
    model: Optional[str] = None


class ChatResponse(BaseModel):
    success: bool
    content: str
    session_id: str
    error: Optional[str] = None


class StrategyInfo(BaseModel):
    id: str
    name: str
    description: str


class StrategiesResponse(BaseModel):
    strategies: List[StrategyInfo]


class ChatModelInfo(BaseModel):
    value: str
    label: str


class ChatModelsResponse(BaseModel):
    current_model: Optional[str] = None
    models: List[ChatModelInfo]


class SessionItem(BaseModel):
    session_id: str
    title: str
    message_count: int
    created_at: Optional[str] = None
    last_active: Optional[str] = None


class SessionsResponse(BaseModel):
    sessions: List[SessionItem]


class SessionMessagesResponse(BaseModel):
    session_id: str
    messages: List[Dict[str, Any]]


def _normalize_model_candidate(value: Optional[str]) -> str:
    candidate = (value or "").strip()
    if not candidate or candidate.startswith("__legacy_"):
        return ""
    return candidate


def _collect_chat_models(config) -> List[ChatModelInfo]:
    ordered_values: List[str] = []
    labels_by_value: Dict[str, str] = {}

    def register(value: Optional[str], label: Optional[str] = None):
        candidate = _normalize_model_candidate(value)
        if not candidate:
            return
        if candidate not in labels_by_value:
            ordered_values.append(candidate)
        labels_by_value[candidate] = (label or candidate).strip() or candidate

    register(getattr(config, "litellm_model", ""))
    for fallback in getattr(config, "litellm_fallback_models", []) or []:
        register(fallback)

    for entry in getattr(config, "llm_model_list", []) or []:
        model_name = _normalize_model_candidate(entry.get("model_name"))
        actual_model = _normalize_model_candidate((entry.get("litellm_params") or {}).get("model"))
        candidate = model_name or actual_model
        if not candidate:
            continue
        label = candidate
        if model_name and actual_model and model_name != actual_model:
            label = f"{candidate} ({actual_model})"
        register(candidate, label)

    return [ChatModelInfo(value=value, label=labels_by_value[value]) for value in ordered_values]


@router.get("/strategies", response_model=StrategiesResponse)
async def get_strategies():
    """
    Get available agent strategies.
    """
    config = get_config()
    from src.agent.factory import get_skill_manager

    skill_manager = get_skill_manager(config)
    strategies = [
        StrategyInfo(id=skill_id, name=skill.display_name, description=skill.description)
        for skill_id, skill in skill_manager._skills.items()
    ]
    return StrategiesResponse(strategies=strategies)


@router.get("/models", response_model=ChatModelsResponse)
async def get_models():
    """Get available agent models for strategy chat."""
    config = get_config()
    models = _collect_chat_models(config)
    current_model = _normalize_model_candidate(getattr(config, "litellm_model", ""))
    if not current_model and models:
        current_model = models[0].value
    return ChatModelsResponse(current_model=current_model or None, models=models)


@router.post("/chat", response_model=ChatResponse)
async def agent_chat(request: ChatRequest):
    """
    Chat with the AI Agent.
    """
    config = get_config()

    if not config.agent_mode:
        raise HTTPException(status_code=400, detail="Agent mode is not enabled")

    session_id = request.session_id or str(uuid.uuid4())

    try:
        executor = _build_executor(config, request.skills, request.model)

        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            lambda: executor.chat(
                message=request.message,
                session_id=session_id,
                context=request.context,
            ),
        )

        return ChatResponse(
            success=result.success,
            content=result.content,
            session_id=session_id,
            error=result.error,
        )

    except Exception as exc:
        logger.error("Agent chat API failed: %s", exc)
        logger.exception("Agent chat error details:")
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/chat/sessions", response_model=SessionsResponse)
async def list_chat_sessions(limit: int = 50):
    """获取聊天会话列表"""
    from src.storage import get_db

    sessions = get_db().get_chat_sessions(limit=limit)
    return SessionsResponse(sessions=sessions)


@router.get("/chat/sessions/{session_id}", response_model=SessionMessagesResponse)
async def get_chat_session_messages(session_id: str, limit: int = 100):
    """获取单个会话的完整消息"""
    from src.storage import get_db

    messages = get_db().get_conversation_messages(session_id, limit=limit)
    return SessionMessagesResponse(session_id=session_id, messages=messages)


@router.delete("/chat/sessions/{session_id}")
async def delete_chat_session(session_id: str):
    """删除指定会话"""
    from src.storage import get_db

    count = get_db().delete_conversation_session(session_id)
    return {"deleted": count}


def _build_executor(config, skills: Optional[List[str]] = None, model_override: Optional[str] = None):
    """Build and return a configured AgentExecutor (sync helper)."""
    from src.agent.factory import build_agent_executor

    return build_agent_executor(config, skills=skills, model_override=model_override)


@router.post("/chat/stream")
async def agent_chat_stream(request: ChatRequest):
    """
    Chat with the AI Agent, streaming progress via SSE.
    Each SSE event is a JSON object with a 'type' field:
      - tool_start: a tool call has begun
      - tool_done: a tool call finished
      - generating: final answer being generated
      - done: analysis complete, contains 'content' and 'success'
      - error: error occurred, contains 'message'
    """
    config = get_config()
    if not config.agent_mode:
        raise HTTPException(status_code=400, detail="Agent mode is not enabled")

    session_id = request.session_id or str(uuid.uuid4())
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()

    def progress_callback(event: dict):
        if event.get("type") in ("tool_start", "tool_done"):
            tool = event.get("tool", "")
            event["display_name"] = TOOL_DISPLAY_NAMES.get(tool, tool)
        asyncio.run_coroutine_threadsafe(queue.put(event), loop)

    def run_sync():
        try:
            executor = _build_executor(config, request.skills, request.model)
            result = executor.chat(
                message=request.message,
                session_id=session_id,
                progress_callback=progress_callback,
                context=request.context,
            )
            asyncio.run_coroutine_threadsafe(
                queue.put(
                    {
                        "type": "done",
                        "success": result.success,
                        "content": result.content,
                        "error": result.error,
                        "total_steps": result.total_steps,
                        "session_id": session_id,
                    }
                ),
                loop,
            )
        except Exception as exc:
            logger.error("Agent stream error: %s", exc)
            asyncio.run_coroutine_threadsafe(
                queue.put({"type": "error", "message": str(exc)}),
                loop,
            )

    async def event_generator():
        fut = loop.run_in_executor(None, run_sync)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=300.0)
                except asyncio.TimeoutError:
                    yield "data: " + json.dumps({"type": "error", "message": "分析超时"}, ensure_ascii=False) + "\n\n"
                    break
                yield "data: " + json.dumps(event, ensure_ascii=False) + "\n\n"
                if event.get("type") in ("done", "error"):
                    break
        finally:
            try:
                await asyncio.wait_for(fut, timeout=5.0)
            except Exception:
                pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
