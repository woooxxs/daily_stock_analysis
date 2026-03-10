import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, CircleHelp, MessageSquarePlus, Trash2 } from 'lucide-react';
import { agentApi, type ChatModelInfo, type ChatSessionItem, type StrategyInfo } from '../../api/agent';
import { historyApi } from '../../api/history';
import { generateUUID } from '../../utils/uuid';
import {
  inferStockCodeFromText,
  normalizeStockCode,
  persistSessionStockMap,
  readSessionStockMap,
  resolveSessionStockCodeValue,
  type SessionStockMap,
} from '../../utils/chatSessionStock';
import { resolveDisplayStockName } from '../../utils/stock';
import { Select } from '../common';

type ProgressStep = {
  type: string;
  step?: number;
  tool?: string;
  display_name?: string;
  success?: boolean;
  duration?: number;
  message?: string;
  content?: string;
};

type FollowUpContext = {
  stock_code: string;
  stock_name: string | null;
  previous_analysis_summary?: unknown;
  previous_strategy?: unknown;
  previous_price?: number;
  previous_change_pct?: number;
};

type ChatStreamPayload = {
  message: string;
  session_id?: string;
  skills?: string[];
  context?: FollowUpContext;
  model?: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  strategy?: string;
  strategyName?: string;
  thinkingSteps?: ProgressStep[];
};

type StockAskPanelProps = {
  stockCode: string;
  stockName?: string;
  recordId?: number;
};

export const StockAskPanel: React.FC<StockAskPanelProps> = ({ stockCode, stockName, recordId }) => {
  const normalizedCode = stockCode.toUpperCase();
  const displayName = resolveDisplayStockName(normalizedCode, stockName);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('bull_trend');
  const [availableModels, setAvailableModels] = useState<ChatModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(() => generateUUID());
  const [sessionStockMap, setSessionStockMap] = useState<SessionStockMap>(() => readSessionStockMap());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(sessionId);
  const followUpContextRef = useRef<FollowUpContext | null>(null);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const knownCodes = useMemo(() => [normalizedCode], [normalizedCode]);

  const updateSessionStockMap = useCallback((updater: (previous: SessionStockMap) => SessionStockMap) => {
    setSessionStockMap((previous) => {
      const next = updater(previous);
      persistSessionStockMap(next);
      return next;
    });
  }, []);

  const visibleSessions = useMemo(
    () => sessions.filter((session) => resolveSessionStockCodeValue(session, sessionStockMap, knownCodes) === normalizedCode),
    [knownCodes, normalizedCode, sessionStockMap, sessions],
  );

  const selectedStrategyInfo = useMemo(
    () => strategies.find((strategy) => strategy.id === selectedStrategy) || null,
    [selectedStrategy, strategies],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, progressSteps]);

  useEffect(() => {
    agentApi
      .getStrategies()
      .then((res) => {
        setStrategies(res.strategies);
        const defaultId = res.strategies.find((strategy) => strategy.id === 'bull_trend')?.id || res.strategies[0]?.id || '';
        setSelectedStrategy(defaultId);
      })
      .catch(() => {});

    agentApi
      .getModels()
      .then((res) => {
        setAvailableModels(res.models);
        setSelectedModel(res.current_model || res.models[0]?.value || '');
      })
      .catch(() => {});
  }, []);

  const loadSessions = useCallback(() => {
    setSessionsLoading(true);
    agentApi
      .getChatSessions()
      .then((items) => {
        setSessions(items);
        updateSessionStockMap((previous) => {
          const next = { ...previous };
          items.forEach((session) => {
            const resolvedCode = resolveSessionStockCodeValue(session, next, knownCodes);
            if (resolvedCode === normalizedCode) {
              next[session.session_id] = normalizedCode;
            }
          });
          return next;
        });
      })
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, [knownCodes, normalizedCode, updateSessionStockMap]);

  const prepareFollowUpContext = useCallback(async () => {
    const context: FollowUpContext = { stock_code: normalizedCode, stock_name: displayName };
    if (recordId) {
      try {
        const report = await historyApi.getDetail(recordId);
        if (report.summary) context.previous_analysis_summary = report.summary;
        if (report.strategy) context.previous_strategy = report.strategy;
        if (report.meta) {
          context.previous_price = report.meta.currentPrice;
          context.previous_change_pct = report.meta.changePct;
        }
      } catch {
        // Ignore preload failure and keep base context only.
      }
    }
    followUpContextRef.current = context;
  }, [displayName, normalizedCode, recordId]);

  useEffect(() => {
    if (bootstrappedRef.current) {
      return;
    }

    bootstrappedRef.current = true;
    setSessionsLoading(true);
    agentApi
      .getChatSessions()
      .then(async (sessionList) => {
        setSessions(sessionList);

        const nextStockMap = { ...readSessionStockMap() };
        sessionList.forEach((session) => {
          const resolvedCode = resolveSessionStockCodeValue(session, nextStockMap, knownCodes);
          if (resolvedCode === normalizedCode) {
            nextStockMap[session.session_id] = normalizedCode;
          }
        });
        persistSessionStockMap(nextStockMap);
        setSessionStockMap(nextStockMap);

        const stockSessions = sessionList.filter((session) => resolveSessionStockCodeValue(session, nextStockMap, knownCodes) === normalizedCode);
        if (stockSessions.length > 0) {
          const activeSession = stockSessions[0];
          setSessionId(activeSession.session_id);
          sessionIdRef.current = activeSession.session_id;
          const sessionMessages = await agentApi.getChatSessionMessages(activeSession.session_id).catch(() => []);
          if (sessionMessages.length > 0) {
            setMessages(sessionMessages.map((message) => ({ id: message.id, role: message.role, content: message.content })));
          }
          await prepareFollowUpContext();
          return;
        }

        const newId = generateUUID();
        setSessionId(newId);
        sessionIdRef.current = newId;
        setInput(`请深入分析 ${displayName}(${normalizedCode})`);
        await prepareFollowUpContext();
      })
      .catch(async () => {
        await prepareFollowUpContext();
      })
      .finally(() => setSessionsLoading(false));
  }, [displayName, knownCodes, normalizedCode, prepareFollowUpContext]);

  const switchSession = useCallback((targetSessionId: string) => {
    setMessages([]);
    setSessionId(targetSessionId);
    sessionIdRef.current = targetSessionId;
    agentApi
      .getChatSessionMessages(targetSessionId)
      .then((sessionMessages) => {
        setMessages(sessionMessages.map((message) => ({ id: message.id, role: message.role, content: message.content })));
      })
      .catch(() => {});
  }, []);

  const startNewChat = useCallback(async () => {
    const newId = generateUUID();
    setSessionId(newId);
    sessionIdRef.current = newId;
    setMessages([]);
    setProgressSteps([]);
    setInput(`请深入分析 ${displayName}(${normalizedCode})`);
    await prepareFollowUpContext();
  }, [displayName, normalizedCode, prepareFollowUpContext]);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirmId) return;
    agentApi
      .deleteChatSession(deleteConfirmId)
      .then(() => {
        setSessions((previous) => previous.filter((session) => session.session_id !== deleteConfirmId));
        updateSessionStockMap((previous) => {
          const next = { ...previous };
          delete next[deleteConfirmId];
          return next;
        });
        if (deleteConfirmId === sessionIdRef.current) {
          void startNewChat();
        }
      })
      .catch(() => {})
      .finally(() => setDeleteConfirmId(null));
  }, [deleteConfirmId, startNewChat, updateSessionStockMap]);

  const handleSend = useCallback(async () => {
    const msgText = input.trim();
    if (!msgText || loading) {
      return;
    }

    const usedStrategy = selectedStrategy;
    const usedStrategyName = selectedStrategyInfo?.name || (usedStrategy ? usedStrategy : '通用');
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msgText,
      strategy: usedStrategy,
      strategyName: usedStrategyName,
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput('');
    setLoading(true);
    setProgressSteps([]);

    const currentSessionId = sessionIdRef.current;
    const inferredCode = normalizeStockCode(followUpContextRef.current?.stock_code) || inferStockCodeFromText(msgText, knownCodes) || normalizedCode;

    updateSessionStockMap((previous) => ({ ...previous, [currentSessionId]: inferredCode || normalizedCode }));
    setSessions((previous) => {
      if (previous.some((session) => session.session_id === currentSessionId)) {
        return previous;
      }

      return [
        {
          session_id: currentSessionId,
          title: msgText.slice(0, 60),
          message_count: 1,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
        },
        ...previous,
      ];
    });

    const payload: ChatStreamPayload = {
      message: userMessage.content,
      session_id: currentSessionId,
      skills: usedStrategy ? [usedStrategy] : undefined,
      model: selectedModel || undefined,
      context: followUpContextRef.current || {
        stock_code: normalizedCode,
        stock_name: displayName,
      },
    };
    followUpContextRef.current = null;

    try {
      const response = await fetch('/api/v1/agent/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const detail = (errData as { detail?: string }).detail || `HTTP ${response.status}`;
        if (response.status === 400 && String(detail).includes('not enabled')) {
          throw new Error('⚠️ Agent 模式未启用，请在 .env 中设置 AGENT_MODE=true 并重启服务。');
        }
        throw new Error(`❌ 服务端错误: ${detail}`);
      }

      if (!response.body) {
        throw new Error('未收到流式响应，请稍后重试。');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let finalContent: string | null = null;
      const currentProgressSteps: ProgressStep[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          const payloadLine = trimmedLine.startsWith('data:') ? trimmedLine.slice(5).trim() : trimmedLine;
          if (!payloadLine) continue;

          const data = JSON.parse(payloadLine) as ProgressStep & { error?: string; content?: string; message?: string };
          if (data.type === 'tool_start' || data.type === 'tool_done' || data.type === 'generating') {
            currentProgressSteps.push(data);
            setProgressSteps([...currentProgressSteps]);
          } else if (data.type === 'done') {
            finalContent = data.content || '';
          } else if (data.type === 'error') {
            throw new Error(data.message || data.error || '发送失败');
          }
        }
      }

      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: finalContent || '未收到分析结果，请稍后重试。',
          strategy: usedStrategy,
          strategyName: usedStrategyName,
          thinkingSteps: [...currentProgressSteps],
        },
      ]);
      loadSessions();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '发送失败';
      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-error`,
          role: 'assistant',
          content: errorMessage,
          strategy: usedStrategy,
          strategyName: usedStrategyName,
        },
      ]);
    } finally {
      setLoading(false);
      setProgressSteps([]);
    }
  }, [displayName, input, knownCodes, loadSessions, loading, normalizedCode, selectedModel, selectedStrategy, selectedStrategyInfo, updateSessionStockMap]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-border bg-card/70 shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Sessions</p>
            <h3 className="mt-2 text-sm font-semibold text-foreground">{displayName} 问股记录</h3>
          </div>
          <button
            type="button"
            onClick={() => void startNewChat()}
            className="rounded-2xl p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="新对话"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {sessionsLoading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">加载中...</div>
          ) : visibleSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/60 p-4 text-center text-xs text-muted-foreground">
              暂无单股问股记录，点击右上角开始新对话。
            </div>
          ) : (
            <div className="space-y-2">
              {visibleSessions.map((session) => (
                <button
                  key={session.session_id}
                  type="button"
                  onClick={() => switchSession(session.session_id)}
                  className={[
                    'group w-full rounded-2xl border px-3 py-3 text-left transition-all',
                    session.session_id === sessionId ? 'border-primary/25 bg-primary/10 text-foreground shadow-sm' : 'border-border bg-background/70 hover:border-primary/20 hover:bg-accent/60',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{session.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {session.message_count} 条消息
                        {session.last_active
                          ? ` · ${new Date(session.last_active).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                          : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteConfirmId(session.session_id);
                      }}
                      className="rounded-xl p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      title="删除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-border bg-card/60 shadow-sm">
        <div className="border-b border-border bg-background/70 px-4 py-4 md:px-6">
          <div className="relative">
            <div className="custom-scrollbar flex items-center gap-3 overflow-x-auto py-1 pr-12 whitespace-nowrap">
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-medium text-foreground">分析策略</span>
              <Select
                value={selectedStrategy}
                onChange={setSelectedStrategy}
                options={[{ value: '', label: '通用分析' }, ...strategies.map((strategy) => ({ value: strategy.id, label: strategy.name }))]}
                placeholder="请选择策略"
                className="w-[220px] shrink-0"
              />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-medium text-foreground">对话模型</span>
              <Select
                value={selectedModel}
                onChange={setSelectedModel}
                options={availableModels}
                placeholder={availableModels.length > 0 ? '请选择模型' : '暂无可用模型'}
                disabled={availableModels.length === 0}
                className="w-[220px] shrink-0"
              />
            </div>

            </div>

            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <div className="group relative inline-flex shrink-0">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  title="查看当前股票上下文"
                  aria-label="查看当前股票上下文"
                >
                  <CircleHelp className="h-4 w-4 text-primary" />
                </button>

                <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-80 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground opacity-0 shadow-xl transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
                  <p className="font-medium text-foreground">{displayName}（{normalizedCode}）</p>
                  <p className="mt-1 leading-6 text-muted-foreground">
                    {selectedStrategyInfo?.description || '不限定策略模板，问题会固定围绕当前股票展开分析。'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto space-y-5 p-4 md:p-5">
          {messages.length === 0 && !loading ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">开始单股追问</h3>
              <p className="mb-2 max-w-md text-sm text-muted-foreground">
                当前对话会固定绑定 {displayName}（{normalizedCode}），不会跳到其他股票或通用策略分组。
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground'}`}>
                  {message.role === 'user' ? 'U' : 'AI'}
                </div>
                <div className={`max-w-[86%] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'rounded-tr-sm bg-primary text-primary-foreground shadow-md' : 'rounded-tl-sm border border-border bg-card text-foreground shadow-sm'}`}>
                  {message.role === 'assistant' && message.strategyName ? (
                    <div className="mb-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {message.strategyName}
                      </span>
                    </div>
                  ) : null}
                  <div className={`prose prose-sm max-w-none break-words text-[13px] leading-6 ${message.role === 'user' ? 'prose-invert text-primary-foreground prose-p:text-[13px] prose-li:text-[13px] prose-headings:text-sm prose-code:text-[12px]' : 'text-foreground prose-headings:text-foreground prose-headings:text-sm prose-p:text-foreground prose-p:text-[13px] prose-li:text-[13px] prose-strong:text-foreground prose-code:text-[12px] prose-code:text-primary'}`}>
                    <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
                  </div>
                </div>
              </div>
            ))
          )}

          {loading ? (
            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-foreground">AI</div>
              <div className="min-w-[200px] max-w-[82%] rounded-2xl rounded-tl-sm border border-border bg-card px-5 py-4 shadow-sm">
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <div className="relative h-4 w-4 flex-shrink-0">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                    <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                  <span className="font-medium text-foreground">{progressSteps.at(-1)?.message || 'AI 正在思考中...'}</span>
                </div>
              </div>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border bg-card/80 p-4 backdrop-blur-md md:p-6">
          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`例如：分析 ${normalizedCode} 当前走势与买点`}
              disabled={loading}
              rows={1}
              className="input-terminal min-h-[48px] max-h-[220px] w-full flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50"
              style={{ height: 'auto' }}
              onInput={(event) => {
                const target = event.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 220)}px`;
              }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || loading}
              className="btn-primary flex h-[48px] flex-shrink-0 items-center justify-center gap-2 px-6 shadow-lg"
            >
              发送
            </button>
          </div>
        </div>
      </div>

      {deleteConfirmId ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/50 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}>
          <div className="mx-4 max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-2 font-bold text-foreground">删除对话</h3>
            <p className="mb-5 text-sm text-muted-foreground">删除后，该单股对话将不可恢复，确认删除吗？</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-lg border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-destructive px-4 py-1.5 text-sm text-destructive-foreground transition-colors hover:bg-destructive/90"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
