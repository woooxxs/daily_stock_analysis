import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, CircleHelp, FolderOpen, Info, MessageSquarePlus, Trash2 } from 'lucide-react';
import { agentApi } from '../api/agent';
import { generateUUID } from '../utils/uuid';
import type { StrategyInfo, ChatSessionItem, ChatModelInfo } from '../api/agent';
import { historyApi } from '../api/history';
import { Select } from '../components/common';
import {
  DEFAULT_STOCK_CODE,
  DEFAULT_STOCK_DESCRIPTION,
  DEFAULT_STOCK_LABEL,
  STORAGE_KEY_SESSION,
  isDefaultStockCode,
  normalizeStockCode,
  persistSessionStockMap,
  readSessionStockMap,
  resolveSessionStockCodeValue,
  type SessionStockMap,
} from '../utils/chatSessionStock';
import { isMeaningfulStockName, resolveDisplayStockName } from '../utils/stock';
import { useStockPool } from '../hooks';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  strategy?: string;
  strategyName?: string;
  thinkingSteps?: ProgressStep[];
}

interface ProgressStep {
  type: string;
  step?: number;
  tool?: string;
  display_name?: string;
  success?: boolean;
  duration?: number;
  message?: string;
  content?: string;
}

interface FollowUpContext {
  stock_code: string;
  stock_name: string | null;
  previous_analysis_summary?: unknown;
  previous_strategy?: unknown;
  previous_price?: number;
  previous_change_pct?: number;
}

interface ChatStreamPayload {
  message: string;
  session_id?: string;
  skills?: string[];
  context?: FollowUpContext;
  model?: string;
}

type StockTab = {
  code: string;
  label: string;
  secondaryLabel: string;
  count: number;
  isDefault?: boolean;
};


const QUICK_QUESTIONS = [
  { label: '用缠论分析茅台', strategy: 'chan_theory' },
  { label: '波浪理论看宁德时代', strategy: 'wave_theory' },
  { label: '分析比亚迪趋势', strategy: 'bull_trend' },
  { label: '箱体震荡策略看中芯国际', strategy: 'box_oscillation' },
  { label: '分析腾讯 hk00700', strategy: 'bull_trend' },
  { label: '用情绪周期分析东方财富', strategy: 'emotion_cycle' },
];

function inferStockCodeFromText(text: string, knownCodes: string[]): string | null {
  const normalizedText = text.toUpperCase();

  for (const code of knownCodes) {
    if (normalizedText.includes(code.toUpperCase())) {
      return code.toUpperCase();
    }
  }

  const aShareMatch = normalizedText.match(/\b\d{6}\b/);
  if (aShareMatch) {
    return aShareMatch[0];
  }

  const hkMatch = normalizedText.match(/\bHK0?\d{4,5}\b/);
  if (hkMatch) {
    return hkMatch[0];
  }

  const usMatch = normalizedText.match(/\b[A-Z]{2,5}\b/);
  if (usMatch) {
    return usMatch[0];
  }

  return null;
}

const ChatPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const stockPool = useStockPool();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('bull_trend');
  const [availableModels, setAvailableModels] = useState<ChatModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialFollowUpHandled = useRef(false);

  const [sessionId, setSessionId] = useState<string>(() => localStorage.getItem(STORAGE_KEY_SESSION) || generateUUID());
  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sessionStockMap, setSessionStockMap] = useState<SessionStockMap>(() => readSessionStockMap());
  const [selectedStockCode, setSelectedStockCode] = useState<string>('');
  const [isStrategyInfoOpen, setIsStrategyInfoOpen] = useState(false);
  const [isStockInfoOpen, setIsStockInfoOpen] = useState(false);

  const followUpContextRef = useRef<FollowUpContext | null>(null);

  const knownCodes = useMemo(() => stockPool.codes.map((code) => code.toUpperCase()), [stockPool.codes]);
  const stockNameByCode = useMemo(
    () =>
      stockPool.items.reduce<Record<string, string>>((accumulator, item) => {
        const stockName = resolveDisplayStockName(item.code, item.quote?.stockName);
        if (isMeaningfulStockName(stockName, item.code)) {
          accumulator[item.code] = stockName;
        }
        return accumulator;
      }, {}),
    [stockPool.items],
  );

  const updateSessionStockMap = useCallback((updater: (previous: SessionStockMap) => SessionStockMap) => {
    setSessionStockMap((previous) => {
      const next = updater(previous);
      persistSessionStockMap(next);
      return next;
    });
  }, []);

  const resolveSessionStockCode = useCallback(
    (session: ChatSessionItem): string => resolveSessionStockCodeValue(session, sessionStockMap, knownCodes),
    [knownCodes, sessionStockMap],
  );

  const stockTabs = useMemo<StockTab[]>(() => {
    const counts = new Map<string, number>();
    sessions.forEach((session) => {
      const code = resolveSessionStockCode(session);
      counts.set(code, (counts.get(code) || 0) + 1);
    });

    const buildStockTab = (code: string): StockTab => {
      if (isDefaultStockCode(code)) {
        return {
          code,
          label: DEFAULT_STOCK_LABEL,
          secondaryLabel: DEFAULT_STOCK_DESCRIPTION,
          count: counts.get(code) || 0,
          isDefault: true,
        };
      }

      const stockName = stockNameByCode[code];
      return {
        code,
        label: resolveDisplayStockName(code, stockName),
        secondaryLabel: stockName ? code : '股票代码',
        count: counts.get(code) || 0,
      };
    };

    const poolTabs = stockPool.codes.map((code) => buildStockTab(code));
    const extraTabs = [...counts.keys()]
      .filter((code) => !stockPool.codes.includes(code))
      .map((code) => buildStockTab(code));

    return [...poolTabs, ...extraTabs];
  }, [resolveSessionStockCode, sessions, stockNameByCode, stockPool.codes]);

  useEffect(() => {
    if (!selectedStockCode) {
      const stockFromQuery = normalizeStockCode(searchParams.get('stock'));
      if (stockFromQuery) {
        setSelectedStockCode(stockFromQuery);
        return;
      }

      if (stockTabs.length > 0) {
        setSelectedStockCode(stockTabs[0].code);
      }
    }
  }, [searchParams, selectedStockCode, stockTabs]);

  const visibleSessions = useMemo(
    () => sessions.filter((session) => resolveSessionStockCode(session) === selectedStockCode),
    [resolveSessionStockCode, selectedStockCode, sessions],
  );

  const selectedStrategyInfo = useMemo(
    () => strategies.find((strategy) => strategy.id === selectedStrategy) || null,
    [selectedStrategy, strategies],
  );

  const selectedModelInfo = useMemo(
    () => availableModels.find((model) => model.value === selectedModel) || null,
    [availableModels, selectedModel],
  );

  const selectedStockTab = useMemo(
    () => stockTabs.find((tab) => tab.code === selectedStockCode) || null,
    [selectedStockCode, stockTabs],
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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
  }, []);

  useEffect(() => {
    agentApi
      .getModels()
      .then((res) => {
        setAvailableModels(res.models);
        setSelectedModel((previous) => {
          if (previous && res.models.some((model) => model.value === previous)) {
            return previous;
          }
          return res.current_model || res.models[0]?.value || '';
        });
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
            next[session.session_id] = resolveSessionStockCodeValue(session, next, knownCodes);
          });
          return next;
        });
      })
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, [knownCodes, updateSessionStockMap]);

  const sessionRestoredRef = useRef(false);
  useEffect(() => {
    if (sessionRestoredRef.current) return;
    sessionRestoredRef.current = true;
    const savedId = localStorage.getItem(STORAGE_KEY_SESSION);
    setSessionsLoading(true);
    agentApi
      .getChatSessions()
      .then((sessionList) => {
        setSessions(sessionList);

        let restoredStockCode = '';
        updateSessionStockMap((previous) => {
          const next = { ...previous };
          sessionList.forEach((session) => {
            next[session.session_id] = resolveSessionStockCodeValue(session, next, knownCodes);
          });
          if (savedId) {
            const savedSession = sessionList.find((session) => session.session_id === savedId);
            if (savedSession) {
              restoredStockCode = next[savedSession.session_id];
            }
          }
          return next;
        });

        if (savedId) {
          const sessionExists = sessionList.some((session) => session.session_id === savedId);
          if (sessionExists) {
            if (restoredStockCode) {
              setSelectedStockCode(restoredStockCode);
            }
            return agentApi.getChatSessionMessages(savedId).then((msgs) => {
              if (msgs.length > 0) {
                setMessages(msgs.map((message) => ({ id: message.id, role: message.role, content: message.content })));
              }
            });
          }
          const newId = generateUUID();
          setSessionId(newId);
          sessionIdRef.current = newId;
        }
      })
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, [knownCodes, updateSessionStockMap]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SESSION, sessionId);
  }, [sessionId]);

  const switchSession = useCallback(
    (targetSessionId: string) => {
      if (targetSessionId === sessionId && messages.length > 0) return;
      setMessages([]);
      setSessionId(targetSessionId);
      sessionIdRef.current = targetSessionId;
      setMobileSidebarOpen(false);
      const targetSession = sessions.find((session) => session.session_id === targetSessionId);
      if (targetSession) {
        setSelectedStockCode(resolveSessionStockCode(targetSession));
      }
      agentApi
        .getChatSessionMessages(targetSessionId)
        .then((msgs) => {
          setMessages(msgs.map((message) => ({ id: message.id, role: message.role, content: message.content })));
        })
        .catch(() => {});
    },
    [messages.length, resolveSessionStockCode, sessionId, sessions],
  );

  const startNewChat = useCallback(() => {
    const newId = generateUUID();
    setSessionId(newId);
    sessionIdRef.current = newId;
    setMessages([]);
    setProgressSteps([]);
    followUpContextRef.current = null;
    setMobileSidebarOpen(false);
  }, []);

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
        if (deleteConfirmId === sessionId) startNewChat();
      })
      .catch(() => {});
    setDeleteConfirmId(null);
  }, [deleteConfirmId, sessionId, startNewChat, updateSessionStockMap]);

  useEffect(() => {
    if (initialFollowUpHandled.current) return;
    const stock = normalizeStockCode(searchParams.get('stock'));
    const name = searchParams.get('name');
    const recordId = searchParams.get('recordId');
    if (stock) {
      initialFollowUpHandled.current = true;
      setSelectedStockCode(stock);
      const displayName = name ? `${name}(${stock})` : stock;
      setInput(`请深入分析 ${displayName}`);
      if (recordId) {
        historyApi
          .getDetail(Number(recordId))
          .then((report) => {
            const context: FollowUpContext = { stock_code: stock, stock_name: name };
            if (report.summary) context.previous_analysis_summary = report.summary;
            if (report.strategy) context.previous_strategy = report.strategy;
            if (report.meta) {
              context.previous_price = report.meta.currentPrice;
              context.previous_change_pct = report.meta.changePct;
            }
            followUpContextRef.current = context;
          })
          .catch(() => {});
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSend = async (overrideMessage?: string, overrideStrategy?: string) => {
    const msgText = overrideMessage || input.trim();
    if (!msgText || loading) return;

    const usedStrategy = overrideStrategy || selectedStrategy;
    const usedStrategyName = strategies.find((strategy) => strategy.id === usedStrategy)?.name || (usedStrategy ? usedStrategy : '通用');
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
    const activeSelectedStockCode = isDefaultStockCode(selectedStockCode) ? '' : selectedStockCode;
    const inferredCode = activeSelectedStockCode || followUpContextRef.current?.stock_code || inferStockCodeFromText(msgText, knownCodes) || DEFAULT_STOCK_CODE;

    updateSessionStockMap((previous) => ({ ...previous, [currentSessionId]: inferredCode }));
    if (!selectedStockCode || isDefaultStockCode(selectedStockCode)) {
      setSelectedStockCode(inferredCode);
    }

    setSessions((previous) => {
      if (previous.some((session) => session.session_id === currentSessionId)) return previous;
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
    };

    if (followUpContextRef.current) {
      payload.context = followUpContextRef.current;
      followUpContextRef.current = null;
    } else if (activeSelectedStockCode) {
      payload.context = {
        stock_code: activeSelectedStockCode,
        stock_name: stockNameByCode[activeSelectedStockCode] || null,
      };
    }

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

          try {
            const data = JSON.parse(payloadLine) as ProgressStep & { error?: string; content?: string; message?: string };
            if (data.type === 'tool_start' || data.type === 'tool_done' || data.type === 'generating') {
              currentProgressSteps.push(data);
              setProgressSteps([...currentProgressSteps]);
            } else if (data.type === 'done') {
              finalContent = data.content || '';
            } else if (data.type === 'error') {
              throw new Error(data.message || data.error || '发送失败');
            }
          } catch (streamError) {
            if (streamError instanceof Error) {
              throw streamError;
            }
          }
        }
      }

      const assistantMessage: Message = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: finalContent || '未收到分析结果，请稍后重试。',
        strategy: usedStrategy,
        strategyName: usedStrategyName,
        thinkingSteps: [...currentProgressSteps],
      };
      setMessages((previous) => [...previous, assistantMessage]);
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
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleQuickQuestion = (question: typeof QUICK_QUESTIONS[number]) => {
    setInput(question.label);
    setSelectedStrategy(question.strategy);
  };

  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set());

  const toggleThinkingExpanded = (messageId: string) => {
    setExpandedThinking((previous) => {
      const next = new Set(previous);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const getCurrentStage = (steps: ProgressStep[]): string => {
    if (steps.length === 0) return 'AI 正在思考中...';
    const lastStep = steps[steps.length - 1];
    if (lastStep.type === 'tool_start' || lastStep.type === 'tool_call') {
      return lastStep.display_name || lastStep.tool || '正在调用工具';
    }
    if (lastStep.type === 'generating') return lastStep.message || '正在生成分析';
    return 'AI 正在处理...';
  };

  const renderThinkingBlock = (message: Message) => {
    if (!message.thinkingSteps || message.thinkingSteps.length === 0) return null;
    const isExpanded = expandedThinking.has(message.id);

    return (
      <button
        type="button"
        onClick={() => toggleThinkingExpanded(message.id)}
        className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
      >
        <span>{isExpanded ? '收起思考过程' : '查看思考过程'}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{message.thinkingSteps.length} 步</span>
      </button>
    );
  };

  const renderThinkingDetails = (steps: ProgressStep[]) => (
    <div className="mb-3 space-y-1 rounded-2xl border border-border bg-background/70 p-3 text-xs text-muted-foreground">
      {steps.map((step, index) => {
        let icon = '•';
        let text = step.message || step.display_name || step.tool || step.type;
        let colorClass = 'text-muted-foreground';
        if (step.type === 'tool_start' || step.type === 'tool_call') {
          icon = '🛠';
          colorClass = 'text-primary';
          text = step.display_name || step.tool || '工具调用';
        } else if (step.type === 'tool_done') {
          icon = step.success ? '✅' : '❌';
          colorClass = step.success ? 'text-success' : 'text-destructive';
          text = `${step.display_name || step.tool} (${step.duration || 0}s)`;
        } else if (step.type === 'generating') {
          icon = '✍️';
          colorClass = 'text-primary';
          text = step.message || '生成分析';
        }
        return (
          <div key={index} className={`flex items-center gap-2 py-0.5 ${colorClass}`}>
            <span className="w-4 shrink-0 text-center">{icon}</span>
            <span className="leading-relaxed">{text}</span>
          </div>
        );
      })}
    </div>
  );

  const stockSidebar = (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-border bg-card/70 shadow-sm backdrop-blur-sm">
      <div className="border-b border-border px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Stocks</p>
        <h3 className="mt-2 text-sm font-semibold text-foreground">股票分组</h3>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {stockTabs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background/60 p-4 text-center text-xs text-muted-foreground">
            暂无股票分组
          </div>
        ) : (
          stockTabs.map((tab) => (
            <button
              key={tab.code}
              type="button"
              onClick={() => {
                setSelectedStockCode(tab.code);
                setMobileSidebarOpen(false);
              }}
              className={[
                'w-full rounded-2xl border px-3 py-3 text-left transition-all',
                selectedStockCode === tab.code
                  ? 'border-primary/25 bg-primary/10 text-primary shadow-sm'
                  : 'border-border bg-background/70 text-foreground hover:border-primary/20 hover:bg-accent/60',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{tab.label}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{tab.secondaryLabel}</p>
                </div>
                <span className="rounded-full bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground shadow-sm">{tab.count}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  const sessionSidebar = (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-border bg-card/70 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Sessions</p>
          <h3 className="mt-2 text-sm font-semibold text-foreground">历史对话</h3>
        </div>
        <button
          type="button"
          onClick={startNewChat}
          className="rounded-2xl p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="新对话"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {sessionsLoading ? (
          <div className="p-4 text-center text-xs text-muted-foreground">加载中...</div>
        ) : visibleSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background/60 p-4 text-center text-xs text-muted-foreground">
            {selectedStockTab ? `${selectedStockTab.label} 暂无历史对话` : '请选择股票分组'}
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
                  session.session_id === sessionId
                    ? 'border-primary/25 bg-primary/10 text-foreground shadow-sm'
                    : 'border-border bg-background/70 hover:border-primary/20 hover:bg-accent/60',
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
  );

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1600px] gap-3 px-4 pb-6 pt-3 md:px-6 xl:grid-cols-[180px_300px_minmax(0,1fr)]">
      <div className="hidden xl:block">{stockSidebar}</div>
      <div className="hidden xl:block">{sessionSidebar}</div>

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-40 xl:hidden" onClick={() => setMobileSidebarOpen(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <div className="absolute inset-y-0 left-0 flex w-[92vw] max-w-[680px] gap-3 p-3" onClick={(event) => event.stopPropagation()}>
            <div className="w-[38%]">{stockSidebar}</div>
            <div className="w-[62%]">{sessionSidebar}</div>
          </div>
        </div>
      ) : null}

      {deleteConfirmId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm dark:bg-slate-950/40" onClick={() => setDeleteConfirmId(null)}>
          <div className="mx-4 max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-2 font-bold text-foreground">删除对话</h3>
            <p className="mb-5 text-sm text-muted-foreground">删除后，该对话将不可恢复，确认删除吗？</p>
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

      <div className="flex min-w-0 flex-1 flex-col xl:col-span-1">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">策略问答</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setMobileSidebarOpen(true)} className="btn-secondary xl:hidden">
              <FolderOpen className="mr-2 h-4 w-4" />
              股票 / 对话
            </button>
            <button type="button" onClick={startNewChat} className="btn-primary">
              新建对话
            </button>
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-border bg-card/60 shadow-sm backdrop-blur-sm">
          <div className="border-b border-border bg-background/70 px-4 py-3 md:px-5">
            <div className="relative">
              <div className="custom-scrollbar flex items-center gap-3 overflow-x-auto py-1 pr-20 whitespace-nowrap">
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-medium text-foreground">分析策略</span>
                  <Select
                    value={selectedStrategy}
                    onChange={(value) => {
                      setSelectedStrategy(value);
                      setIsStrategyInfoOpen(false);
                    }}
                    options={[
                      { value: '', label: '通用分析' },
                      ...strategies.map((strategy) => ({ value: strategy.id, label: strategy.name })),
                    ]}
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

              <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1.5 bg-background/80 pl-2 backdrop-blur-sm">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsStrategyInfoOpen((previous) => !previous);
                      setIsStockInfoOpen(false);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="查看当前策略说明"
                    title="当前策略说明"
                  >
                    <Info className="h-4 w-4" />
                  </button>

                  {isStrategyInfoOpen ? (
                    <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-border bg-card p-4 shadow-xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">当前策略说明</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{selectedStrategyInfo?.name || '通用分析'}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {selectedStrategyInfo?.description || '不限定策略模板，由系统按通用分析流程回答。'}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        当前模型：<span className="font-medium text-foreground">{selectedModelInfo?.label || selectedModel || '未配置'}</span>
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsStockInfoOpen((previous) => !previous);
                      setIsStrategyInfoOpen(false);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="查看当前股票分组"
                    title="查看当前股票分组"
                  >
                    <CircleHelp className="h-4 w-4" />
                  </button>

                  {isStockInfoOpen ? (
                    <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-border bg-card p-4 shadow-xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">当前分组</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{selectedStockTab?.label || '未选择股票分组'}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {selectedStockTab?.secondaryLabel || '先从左侧选择股票分组，再开始针对该分组的策略问答。'}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 custom-scrollbar flex-1 overflow-y-auto space-y-4 p-4 md:p-5">
            {messages.length === 0 && !loading ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">开始分析</h3>
                <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                  先从左侧选择股票分组，然后输入问题；也可以点击下方推荐问题快速开始。
                </p>
                <div className="flex max-w-lg flex-wrap justify-center gap-2">
                  {QUICK_QUESTIONS.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickQuestion(question)}
                      className="rounded-full border border-border bg-accent/40 px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                    >
                      {question.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground'
                  }`}>
                    {message.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div
                    className={`max-w-[86%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'rounded-tr-sm bg-primary text-primary-foreground shadow-md'
                        : 'rounded-tl-sm border border-border bg-card text-foreground shadow-sm'
                    }`}
                  >
                    {message.role === 'assistant' && message.strategyName ? (
                      <div className="mb-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {message.strategyName}
                        </span>
                      </div>
                    ) : null}
                    {message.role === 'assistant' && renderThinkingBlock(message)}
                    {message.role === 'assistant' && expandedThinking.has(message.id) && message.thinkingSteps ? renderThinkingDetails(message.thinkingSteps) : null}
                    <div
                      className={`prose prose-sm max-w-none break-words text-[13px] leading-6 ${
                        message.role === 'user'
                          ? 'prose-invert text-primary-foreground prose-p:text-[13px] prose-li:text-[13px] prose-headings:text-sm prose-code:text-[12px]'
                          : 'text-foreground prose-headings:text-foreground prose-headings:text-sm prose-p:text-foreground prose-p:text-[13px] prose-li:text-[13px] prose-strong:text-foreground prose-code:text-[12px] prose-code:text-primary'
                      }`}
                    >
                      <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
                    </div>
                  </div>
                </div>
              ))
            )}

            {loading ? (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-foreground text-xs font-bold">
                  AI
                </div>
                <div className="min-w-[200px] max-w-[82%] rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3.5 shadow-sm">
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <div className="relative h-4 w-4 flex-shrink-0">
                      <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                      <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                    <span className="font-medium text-foreground">{getCurrentStage(progressSteps)}</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <div className="relative z-20 border-t border-border bg-card/80 p-3 backdrop-blur-md md:p-4">
            <div className="flex items-end gap-2.5">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  !selectedStockCode
                    ? '先从左侧选择股票分组，再输入你的问题'
                    : isDefaultStockCode(selectedStockCode)
                      ? '例如：请帮我分析当前市场里最值得关注的机会'
                      : `例如：分析 ${selectedStockCode} 当前走势与买点`
                }
                disabled={loading}
                rows={1}
                className="input-terminal flex-1 min-h-[46px] max-h-[220px] w-full resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50"
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
                className="btn-primary flex h-[46px] flex-shrink-0 items-center justify-center gap-2 px-5 shadow-lg"
              >
                {loading ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : null}
                发送
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
