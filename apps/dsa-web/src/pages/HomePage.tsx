import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Clock3,
  LayoutDashboard,
  Loader2,
  Plus,
  RefreshCcw,
  Upload,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { HistoryItem, TaskInfo } from '../types/analysis';
import { historyApi } from '../api/history';
import { analysisApi, DuplicateTaskError } from '../api/analysis';
import { validateStockCode } from '../utils/validation';
import { getRecentStartDate, getTodayInShanghai } from '../utils/format';
import { useAnalysisStore } from '../stores/analysisStore';
import {
  AppPage,
  Button,
  EmptyState,
  Input,
  PageHeader,
  SectionCard,
  ToastViewport,
  type ToastMessage,
} from '../components/common';
import { TaskPanel } from '../components/tasks';
import StockPoolCard from '../components/stock/StockPoolCard';
import { ImageStockExtractor } from '../components/settings';
import { useStockPool, useSystemConfig, useTaskStream } from '../hooks';

const historyPageSize = 100;

const HomePage: React.FC = () => {
  const { setLoading, setError: setStoreError } = useAnalysisStore();
  const navigate = useNavigate();
  const stockPool = useStockPool();
  const { load: loadSystemConfig, configVersion, maskToken } = useSystemConfig();

  const [isSubmittingAddStock, setIsSubmittingAddStock] = useState(false);
  const [isTaskMenuOpen, setIsTaskMenuOpen] = useState(false);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [addStockCode, setAddStockCode] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [activeTasks, setActiveTasks] = useState<TaskInfo[]>([]);

  const activeTaskCount = useMemo(
    () => activeTasks.filter((task) => task.status === 'pending' || task.status === 'processing').length,
    [activeTasks],
  );

  const taskMenuRef = useRef<HTMLDivElement | null>(null);
  const addStockModalRef = useRef<HTMLDivElement | null>(null);
  const toastTimersRef = useRef<Record<number, number>>({});

  const dismissToast = useCallback((toastId: number) => {
    const timerId = toastTimersRef.current[toastId];
    if (timerId) {
      window.clearTimeout(timerId);
      delete toastTimersRef.current[toastId];
    }

    setToasts((previous) => previous.filter((toast) => toast.id !== toastId));
  }, []);

  const pushToast = useCallback((type: ToastMessage['type'], message: string, title?: string) => {
    const toastId = Date.now() + Math.floor(Math.random() * 1000);

    setToasts((previous) => [...previous, { id: toastId, type, title, message }].slice(-4));
    toastTimersRef.current[toastId] = window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== toastId));
      delete toastTimersRef.current[toastId];
    }, 3600);
  }, []);

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      Object.values(timers).forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  useEffect(() => {
    if (!isTaskMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (taskMenuRef.current && !taskMenuRef.current.contains(event.target as Node)) {
        setIsTaskMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsTaskMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isTaskMenuOpen]);

  useEffect(() => {
    if (!isAddStockModalOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (addStockModalRef.current && !addStockModalRef.current.contains(event.target as Node)) {
        setIsAddStockModalOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAddStockModalOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isAddStockModalOpen]);

  useEffect(() => {
    void loadSystemConfig();
  }, [loadSystemConfig]);

  const updateTask = useCallback((updatedTask: TaskInfo) => {
    setActiveTasks((previous) => {
      const index = previous.findIndex((task) => task.taskId === updatedTask.taskId);
      if (index >= 0) {
        const next = [...previous];
        next[index] = updatedTask;
        return next;
      }
      return previous;
    });
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setActiveTasks((previous) => previous.filter((task) => task.taskId !== taskId));
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await historyApi.getList({
        startDate: getRecentStartDate(90),
        endDate: getTodayInShanghai(),
        page: 1,
        limit: historyPageSize,
      });
      setHistoryItems(response.items);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  }, []);

  useTaskStream({
    onTaskCreated: (task) => {
      setActiveTasks((previous) => {
        if (previous.some((item) => item.taskId === task.taskId)) {
          return previous;
        }
        return [...previous, task];
      });
    },
    onTaskStarted: updateTask,
    onTaskCompleted: (task) => {
      updateTask(task);
      pushToast('success', task.message || `${task.stockName || task.stockCode} 分析完成`);
      void fetchHistory();
      window.setTimeout(() => {
        removeTask(task.taskId);
      }, 1200);
    },
    onTaskFailed: (task) => {
      updateTask(task);
      pushToast('error', task.error || task.message || `${task.stockName || task.stockCode} 分析失败`);
      setStoreError(task.error || '分析失败');
      window.setTimeout(() => removeTask(task.taskId), 1600);
    },
    onError: () => {
      console.warn('SSE 连接断开，正在重连...');
    },
    enabled: true,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchHistory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchHistory]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchHistory();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [fetchHistory]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchHistory();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchHistory]);

  const latestHistoryByCode = useMemo(() => {
    const map = new Map<string, HistoryItem>();
    historyItems.forEach((item) => {
      if (!map.has(item.stockCode)) {
        map.set(item.stockCode, item);
      }
    });
    return map;
  }, [historyItems]);

  const activeTaskCodeSet = useMemo(
    () => new Set(activeTasks.filter((task) => task.status === 'pending' || task.status === 'processing').map((task) => task.stockCode.toUpperCase())),
    [activeTasks],
  );

  const stockCards = useMemo(
    () =>
      stockPool.items.map((item) => {
        const latestHistory = latestHistoryByCode.get(item.code);
        const liveQuote = item.quote?.error ? undefined : item.quote;
        const advice = latestHistory?.operationAdvice || '';
        const isPending = activeTaskCodeSet.has(item.code) || !latestHistory?.createdAt;
        const statusLabel = isPending ? '待更新' : advice || '已分析';
        const statusTone = isPending ? ('default' as const) : ('active' as const);

        return {
          code: item.code,
          stockName: liveQuote?.stockName || latestHistory?.stockName,
          currentPrice: liveQuote?.currentPrice,
          changePercent: liveQuote?.changePercent,
          latestAnalysisTime: latestHistory?.createdAt,
          sentimentScore: latestHistory?.sentimentScore,
          operationAdvice: latestHistory?.operationAdvice,
          trendPrediction: latestHistory?.trendPrediction,
          quoteError: item.quote?.error,
          statusLabel,
          statusTone,
        };
      }),
    [activeTaskCodeSet, latestHistoryByCode, stockPool.items],
  );

  const submitAnalysisRequest = useCallback(async (normalizedCode: string) => {
    try {
      await analysisApi.analyzeAsync({ stockCode: normalizedCode, reportType: 'detailed' });
      return { success: true };
    } catch (error) {
      if (error instanceof DuplicateTaskError) {
        return { success: false, duplicate: true, message: `股票 ${error.stockCode} 正在分析中，请等待完成` };
      }

      return { success: false, message: error instanceof Error ? error.message : '分析失败' };
    }
  }, []);

  const handleQuickAnalyze = useCallback(
    async (rawCode: string) => {
      const validation = validateStockCode(rawCode);
      if (!validation.valid || !validation.normalized) {
        pushToast('error', validation.message || '请输入有效的股票代码');
        return;
      }

      setLoading(true);
      setStoreError(null);

      const result = await submitAnalysisRequest(validation.normalized);

      if (result.success) {
        pushToast('success', `${validation.normalized} 已加入分析队列。`);
      } else if ('duplicate' in result && result.duplicate) {
        pushToast('info', result.message || '该股票正在分析中。');
      } else {
        pushToast('error', result.message || '分析失败');
        setStoreError(result.message || '分析失败');
      }

      setLoading(false);
    },
    [pushToast, setLoading, setStoreError, submitAnalysisRequest],
  );

  const handleRemoveStock = useCallback(
    async (code: string) => {
      const result = await stockPool.removeStock(code);
      if (result.success) {
        pushToast('success', `${code} 已从自选股移除。`);
      } else {
        pushToast('error', result.error || '移除失败');
      }
    },
    [pushToast, stockPool],
  );

  const handleAddStock = useCallback(async () => {
    if (!addStockCode.trim()) {
      pushToast('error', '请输入股票代码');
      return;
    }

    setIsSubmittingAddStock(true);
    const result = await stockPool.addStock(addStockCode);

    if (result.success) {
      const normalized = validateStockCode(addStockCode).normalized || addStockCode.toUpperCase();
      pushToast('success', `${normalized} 已加入自选股。`);
      setAddStockCode('');
      setIsAddStockModalOpen(false);
    } else {
      pushToast('error', result.error || '加入自选股失败');
    }

    setIsSubmittingAddStock(false);
  }, [addStockCode, pushToast, stockPool]);

  const handleOpenStockDetail = useCallback(
    (code: string, stockName?: string) => {
      const search = new URLSearchParams();
      if (stockName) {
        search.set('name', stockName);
      }
      const query = search.toString();
      navigate(`/stocks/${code}${query ? `?${query}` : ''}`);
    },
    [navigate],
  );

  const handleAskStock = useCallback(
    (code: string) => {
      const latestHistory = latestHistoryByCode.get(code);
      const search = new URLSearchParams({ stock: code });

      if (latestHistory?.stockName) {
        search.set('name', latestHistory.stockName);
      }
      if (latestHistory?.id) {
        search.set('recordId', String(latestHistory.id));
      }

      navigate(`/chat?${search.toString()}`);
    },
    [latestHistoryByCode, navigate],
  );

  return (
    <AppPage className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        icon={<LayoutDashboard className="h-4 w-4" />}
        title="选股工作台"
        description="统一查看自选股、进行中的任务和最近分析记录。添加选股已收口到顶部入口。"
        actions={(
          <>
            <div ref={taskMenuRef} className="relative">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsTaskMenuOpen((previous) => !previous)}
                className={activeTaskCount > 0 ? 'border-primary/20 text-primary' : ''}
              >
                {activeTaskCount > 0 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock3 className="h-4 w-4 text-muted-foreground" />
                )}
                进行中的任务
                <span className={`rounded-full px-2 py-0.5 text-xs shadow-sm ${activeTaskCount > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{activeTaskCount}</span>
                <ChevronRight className={`h-4 w-4 transition-transform ${isTaskMenuOpen ? 'rotate-90' : ''}`} />
              </Button>
              {isTaskMenuOpen ? (
                <div className="absolute right-0 top-full z-30 mt-3 w-[360px] max-w-[calc(100vw-2rem)]">
                  <TaskPanel tasks={activeTasks} title="进行中的任务" className="shadow-2xl" />
                </div>
              ) : null}
            </div>
            <Button type="button" onClick={() => setIsAddStockModalOpen(true)}>
              <Plus className="h-4 w-4" />
              添加选股
            </Button>
          </>
        )}
      />

      <ToastViewport items={toasts} onDismiss={dismissToast} />

      <SectionCard
        eyebrow="Watchlist"
        title="自选股池"
        description="以统一的高密度卡片视图查看行情、建议、详情与快捷操作。"
        actions={
          <Button type="button" variant="secondary" onClick={() => void stockPool.load()} disabled={stockPool.isLoading}>
            <RefreshCcw className={`h-4 w-4 ${stockPool.isLoading ? 'animate-spin' : ''}`} />
            刷新自选股池
          </Button>
        }
      >
        {stockPool.isLoading && stockPool.items.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="h-48 animate-pulse rounded-2xl border border-border bg-muted/30" />
            ))}
          </div>
        ) : stockCards.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {stockCards.map((stock) => (
              <StockPoolCard
                key={stock.code}
                {...stock}
                onAnalyze={(code) => void handleQuickAnalyze(code)}
                onRemove={(code) => void handleRemoveStock(code)}
                onViewReport={(code) => handleOpenStockDetail(code, stock.stockName)}
                onAsk={handleAskStock}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="当前还没有可展示的股票" description="你可以先从顶部“添加选股”入口手动输入股票代码，或通过图片识别合并到自选股池。" />
        )}
      </SectionCard>

      {isAddStockModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <div ref={addStockModalRef} className="w-full max-w-5xl rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Add Stock</p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">添加选股</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">统一处理手动输入股票代码和从图片中提取股票代码。完成后会直接加入自选股。</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStockModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="关闭弹窗"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
              <SectionCard eyebrow="Manual Entry" title="手动输入股票代码" description="输入一个股票代码，例如 600519、300750 或 AAPL。">
                <div className="space-y-4">
                  <Input
                    label="股票代码"
                    placeholder="例如：600519"
                    value={addStockCode}
                    onChange={(event) => setAddStockCode(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handleAddStock();
                      }
                    }}
                    hint="支持 A 股、美股和港股代码"
                  />
                  <Button type="button" className="w-full" onClick={() => void handleAddStock()} isLoading={isSubmittingAddStock}>
                    {!isSubmittingAddStock ? <Plus className="h-4 w-4" /> : null}
                    加入自选股
                  </Button>
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="Image Extractor"
                title="从图片提取股票"
                description="上传自选股截图，自动识别股票代码。需配置 Gemini、Anthropic 或 OpenAI API Key 方可使用。建议人工核对后再合并。"
              >
                <div className="space-y-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Upload className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    拖拽或点击上传图片（JPG/PNG/WebP，≤5MB）。大图识别约需 30–60 秒。
                  </p>
                  <ImageStockExtractor
                    stockListValue={stockPool.codes.join(',')}
                    configVersion={configVersion}
                    maskToken={maskToken}
                    onMerged={async () => {
                      await stockPool.load();
                      pushToast('success', '已从图片识别并添加股票到自选股。');
                      setIsAddStockModalOpen(false);
                    }}
                    disabled={stockPool.isSaving}
                    embedded
                  />
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      ) : null}
    </AppPage>
  );
};

export default HomePage;
