import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  LayoutDashboard,
  ListTodo,
  PlayCircle,
  Plus,
  RefreshCcw,
  X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { HistoryItem, TaskInfo } from '../types/analysis';
import { historyApi } from '../api/history';
import { analysisApi, DuplicateTaskError } from '../api/analysis';
import { getParsedApiError } from '../api/error';
import { validateStockCode } from '../utils/validation';
import { getRecentStartDate, getTodayInShanghai } from '../utils/format';
import { resolveDisplayStockName } from '../utils/stock';
import { useAnalysisStore } from '../stores/analysisStore';
import {
  AppPage,
  Button,
  EmptyState,
  Input,
  PageHeader,
  SectionCard,
  Select,
  ToastViewport,
  type ToastMessage,
} from '../components/common';
import { TaskPanel } from '../components/tasks';
import StockPoolCard from '../components/stock/StockPoolCard';
import { StockDetailModal, type StockDetailTab } from '../components/stock/StockDetailModal';
import { ImageStockExtractor } from '../components/settings';
import { useStockPool, useSystemConfig, useTaskStream } from '../hooks';


const historyPageSize = 100;
const AUTO_REFRESH_PRESET_STORAGE_KEY = 'home_watchlist_auto_refresh_preset';
const AUTO_REFRESH_CUSTOM_SECONDS_STORAGE_KEY = 'home_watchlist_auto_refresh_custom_seconds';
const AUTO_REFRESH_PRESET_OPTIONS = [
  { value: 'off', label: '关闭' },
  { value: '10', label: '10 秒' },
  { value: '30', label: '30 秒' },
  { value: '60', label: '60 秒' },
  { value: '300', label: '300 秒' },
  { value: '600', label: '600 秒' },
  { value: 'custom', label: '自定义' },
] as const;

type AutoRefreshPreset = (typeof AUTO_REFRESH_PRESET_OPTIONS)[number]['value'];

function getInitialAutoRefreshPreset(): AutoRefreshPreset {
  if (typeof window === 'undefined') {
    return 'off';
  }

  const savedPreset = window.localStorage.getItem(AUTO_REFRESH_PRESET_STORAGE_KEY);
  return AUTO_REFRESH_PRESET_OPTIONS.some((option) => option.value === savedPreset)
    ? (savedPreset as AutoRefreshPreset)
    : 'off';
}

function getInitialCustomAutoRefreshSeconds(): string {
  if (typeof window === 'undefined') {
    return '120';
  }

  return window.localStorage.getItem(AUTO_REFRESH_CUSTOM_SECONDS_STORAGE_KEY) || '120';
}

type ActiveStockDetail = {
  code: string;
  stockName?: string;
  currentPrice?: number;
  changePercent?: number;
  recordId?: number;
  defaultTab: StockDetailTab;
};

const HomePage: React.FC = () => {
  const { setLoading, setError: setStoreError } = useAnalysisStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const stockPool = useStockPool();
  const { load: loadSystemConfig, configVersion, maskToken } = useSystemConfig();

  const [isSubmittingAddStock, setIsSubmittingAddStock] = useState(false);
  const [isSubmittingBatchAnalyze, setIsSubmittingBatchAnalyze] = useState(false);
  const [isTaskMenuOpen, setIsTaskMenuOpen] = useState(false);
  const [isBatchAnalyzeConfirmOpen, setIsBatchAnalyzeConfirmOpen] = useState(false);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [addStockCode, setAddStockCode] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [activeTasks, setActiveTasks] = useState<TaskInfo[]>([]);
  const [activeStockDetail, setActiveStockDetail] = useState<ActiveStockDetail | null>(null);
  const [autoRefreshPreset, setAutoRefreshPreset] = useState<AutoRefreshPreset>(() => getInitialAutoRefreshPreset());
  const [customAutoRefreshSeconds, setCustomAutoRefreshSeconds] = useState(() => getInitialCustomAutoRefreshSeconds());

  const activeTaskCount = useMemo(
    () => activeTasks.filter((task) => task.status === 'pending' || task.status === 'processing').length,
    [activeTasks],
  );

  const resolvedAutoRefreshSeconds = useMemo(() => {
    if (autoRefreshPreset === 'off') {
      return 0;
    }

    if (autoRefreshPreset === 'custom') {
      const parsedValue = Number.parseInt(customAutoRefreshSeconds, 10);
      return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
    }

    return Number.parseInt(autoRefreshPreset, 10);
  }, [autoRefreshPreset, customAutoRefreshSeconds]);

  const stockCodes = stockPool.codes;
  const refreshStockQuotes = stockPool.refreshQuotes;

  const taskMenuRef = useRef<HTMLDivElement | null>(null);
  const batchAnalyzeConfirmRef = useRef<HTMLDivElement | null>(null);
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
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(AUTO_REFRESH_PRESET_STORAGE_KEY, autoRefreshPreset);
  }, [autoRefreshPreset]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(AUTO_REFRESH_CUSTOM_SECONDS_STORAGE_KEY, customAutoRefreshSeconds);
  }, [customAutoRefreshSeconds]);

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
    if (!isBatchAnalyzeConfirmOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (batchAnalyzeConfirmRef.current && !batchAnalyzeConfirmRef.current.contains(event.target as Node)) {
        setIsBatchAnalyzeConfirmOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsBatchAnalyzeConfirmOpen(false);
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
  }, [isBatchAnalyzeConfirmOpen]);

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
      setStoreError(getParsedApiError(task.error || '分析失败'));
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
        const isPending = activeTaskCodeSet.has(item.code) || !latestHistory?.createdAt;
        const statusLabel = isPending ? '待更新' : '已分析';
        const statusTone = isPending ? ('default' as const) : ('active' as const);

        return {
          code: item.code,
          stockName: resolveDisplayStockName(item.code, liveQuote?.stockName, latestHistory?.stockName),
          currentPrice: liveQuote?.currentPrice,
          changePercent: liveQuote?.changePercent,
          latestAnalysisTime: latestHistory?.createdAt,
          sentimentScore: latestHistory?.sentimentScore,
          operationAdvice: latestHistory?.operationAdvice,
          trendPrediction: latestHistory?.trendPrediction,
          quoteError: item.quote?.error,
          recordId: latestHistory?.id,
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
        setStoreError(getParsedApiError(result.message || '分析失败'));
      }

      setLoading(false);
    },
    [pushToast, setLoading, setStoreError, submitAnalysisRequest],
  );

  const handleRefreshRealtimePrices = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (stockCodes.length === 0) {
        if (!silent) {
          pushToast('info', '当前没有可刷新的自选股。');
        }
        return;
      }

      try {
        await refreshStockQuotes(stockCodes);
        if (!silent) {
          pushToast('success', '实时价格已刷新。');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '刷新股价失败';
        if (!silent) {
          pushToast('error', message);
        }
        setStoreError(getParsedApiError(message));
        if (silent) {
          console.warn('Auto refresh quotes failed:', message);
        }
      }
    },
    [pushToast, refreshStockQuotes, setStoreError, stockCodes],
  );

  useEffect(() => {
    if (resolvedAutoRefreshSeconds <= 0 || stockCodes.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      void handleRefreshRealtimePrices({ silent: true });
    }, resolvedAutoRefreshSeconds * 1000);

    return () => window.clearInterval(intervalId);
  }, [handleRefreshRealtimePrices, resolvedAutoRefreshSeconds, stockCodes.length]);

  const handleReanalyzeAllStocks = useCallback(async () => {
    if (stockPool.codes.length === 0) {
      pushToast('info', '当前没有可重新分析的自选股。');
      return;
    }

    setIsSubmittingBatchAnalyze(true);
    setStoreError(null);

    try {
      let submittedCount = 0;
      let duplicateCount = 0;
      let failedCount = 0;
      const failedCodes: string[] = [];

      for (const code of stockPool.codes) {
        const result = await submitAnalysisRequest(code);
        if (result.success) {
          submittedCount += 1;
          continue;
        }

        if ('duplicate' in result && result.duplicate) {
          duplicateCount += 1;
          continue;
        }

        failedCount += 1;
        failedCodes.push(code);
      }

      if (failedCount > 0 && submittedCount === 0 && duplicateCount === 0) {
        const message = `批量分析失败：${failedCodes.slice(0, 3).join('、')}${failedCodes.length > 3 ? ' 等股票提交失败' : ' 提交失败'}`;
        pushToast('error', message);
        setStoreError(getParsedApiError(message));
      } else {
        const summary = [`已提交 ${submittedCount} 只`];
        if (duplicateCount > 0) {
          summary.push(`跳过 ${duplicateCount} 只进行中股票`);
        }
        if (failedCount > 0) {
          summary.push(`失败 ${failedCount} 只`);
        }
        pushToast(submittedCount > 0 ? 'success' : 'info', `全部重新分析完成：${summary.join('，')}。`);
        if (failedCount > 0) {
          setStoreError(getParsedApiError(`以下股票提交失败：${failedCodes.join('、')}`));
        }
      }
    } finally {
      setIsSubmittingBatchAnalyze(false);
    }
  }, [pushToast, setStoreError, stockPool.codes, submitAnalysisRequest]);

  const handleConfirmReanalyzeAllStocks = useCallback(async () => {
    setIsBatchAnalyzeConfirmOpen(false);
    await handleReanalyzeAllStocks();
  }, [handleReanalyzeAllStocks]);

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
    (code: string, defaultTab: StockDetailTab = 'history') => {
      const card = stockCards.find((stock) => stock.code === code);
      const latestHistory = latestHistoryByCode.get(code);

      setActiveStockDetail({
        code,
        stockName: resolveDisplayStockName(code, card?.stockName, latestHistory?.stockName),
        currentPrice: card?.currentPrice,
        changePercent: card?.changePercent,
        recordId: latestHistory?.id,
        defaultTab,
      });
    },
    [latestHistoryByCode, stockCards],
  );

  const handleAskStock = useCallback(
    (code: string) => {
      handleOpenStockDetail(code, 'ask');
    },
    [handleOpenStockDetail],
  );

  const handleCustomAutoRefreshSecondsChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value.replace(/[^\d]/g, '').slice(0, 5);
    setCustomAutoRefreshSeconds(nextValue);
  }, []);

  useEffect(() => {
    const rawStockCode = searchParams.get('stock');
    if (!rawStockCode) {
      return;
    }

    const code = rawStockCode.trim().toUpperCase();
    const latestHistory = latestHistoryByCode.get(code);
    const card = stockCards.find((stock) => stock.code === code);
    const tab = searchParams.get('tab') === 'ask' ? 'ask' : 'history';
    const rawRecordId = searchParams.get('recordId');
    const recordId = rawRecordId ? Number(rawRecordId) : latestHistory?.id;

    setActiveStockDetail({
      code,
      stockName: resolveDisplayStockName(code, searchParams.get('name'), card?.stockName, latestHistory?.stockName),
      currentPrice: card?.currentPrice,
      changePercent: card?.changePercent,
      recordId: Number.isFinite(recordId) ? recordId : undefined,
      defaultTab: tab,
    });
    setSearchParams({}, { replace: true });
  }, [latestHistoryByCode, searchParams, setSearchParams, stockCards]);

  return (
    <AppPage className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        icon={<LayoutDashboard className="h-4 w-4" />}
        title="选股工作台"
        description="统一查看自选股的实时行情、趋势判断、操作建议与历史复盘，并支持单股追问。"
        actions={(
          <>
            <div ref={taskMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsTaskMenuOpen((previous) => !previous)}
                className={[
                  'relative inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-card shadow-sm transition-colors',
                  isTaskMenuOpen ? 'border-primary/20 bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
                ].join(' ')}
                title={activeTaskCount > 0 ? `进行中的任务（${activeTaskCount}）` : '进行中的任务'}
                aria-label={activeTaskCount > 0 ? `进行中的任务，当前 ${activeTaskCount} 个` : '进行中的任务'}
              >
                <ListTodo className="h-4 w-4" />
                {activeTaskCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground shadow-sm">
                    {activeTaskCount}
                  </span>
                ) : null}
              </button>
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
        description="聚合查看自选股的实时行情、趋势判断、操作建议与历史复盘，并支持单股追问。"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 shadow-sm">
              <span className="text-sm font-medium text-foreground">自动刷新</span>
              <Select
                value={autoRefreshPreset}
                onChange={(value) => setAutoRefreshPreset(value as AutoRefreshPreset)}
                options={AUTO_REFRESH_PRESET_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                className="w-[116px]"
              />
              {autoRefreshPreset === 'custom' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customAutoRefreshSeconds}
                    onChange={handleCustomAutoRefreshSecondsChange}
                    placeholder="秒数"
                    className="h-10 w-20 rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                  <span className="text-sm text-muted-foreground">秒</span>
                </div>
              ) : null}
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleRefreshRealtimePrices()}
              disabled={stockPool.codes.length === 0 || stockPool.isRefreshingQuotes}
            >
              <RefreshCcw className={`h-4 w-4 ${stockPool.isRefreshingQuotes ? 'animate-spin' : ''}`} />
              刷新股价
            </Button>
            <Button
              type="button"
              onClick={() => setIsBatchAnalyzeConfirmOpen(true)}
              disabled={stockPool.codes.length === 0}
              isLoading={isSubmittingBatchAnalyze}
            >
              <PlayCircle className="h-4 w-4" />
              全量重析
            </Button>
          </div>
        }
      >
        {stockPool.isLoading && stockPool.items.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="h-48 animate-pulse rounded-2xl border border-border bg-muted/30" />
            ))}
          </div>
        ) : stockCards.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {stockCards.map((stock) => (
              <StockPoolCard
                key={stock.code}
                {...stock}
                onAnalyze={(code) => void handleQuickAnalyze(code)}
                onRemove={(code) => void handleRemoveStock(code)}
                onViewReport={(code) => handleOpenStockDetail(code, 'history')}
                onAsk={handleAskStock}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="当前还没有可展示的股票" description="先把关注的股票加入自选股池，后续这里会持续聚合行情、分析建议与复盘记录。" />
        )}
      </SectionCard>

      {isBatchAnalyzeConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4 py-6 backdrop-blur-sm dark:bg-slate-950/45">
          <div
            ref={batchAnalyzeConfirmRef}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">确认重新分析全部自选股</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  这会按当前自选股列表重新发起详细分析任务。已经在进行中的股票会自动跳过，不会重复创建任务。
                </p>
                <p className="mt-3 text-sm font-medium text-foreground">当前自选股：{stockPool.codes.length} 只</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsBatchAnalyzeConfirmOpen(false)}
                disabled={isSubmittingBatchAnalyze}
              >
                取消
              </Button>
              <Button type="button" onClick={() => void handleConfirmReanalyzeAllStocks()} disabled={isSubmittingBatchAnalyze}>
                确认重新分析
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isAddStockModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4 py-6 backdrop-blur-sm dark:bg-slate-950/45">
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

      <StockDetailModal
        key={activeStockDetail ? `${activeStockDetail.code}-${activeStockDetail.defaultTab}-${activeStockDetail.recordId || 'none'}` : 'stock-detail-closed'}
        isOpen={Boolean(activeStockDetail)}
        onClose={() => setActiveStockDetail(null)}
        stockCode={activeStockDetail?.code || ''}
        stockName={activeStockDetail?.stockName}
        currentPrice={activeStockDetail?.currentPrice}
        changePercent={activeStockDetail?.changePercent}
        recordId={activeStockDetail?.recordId}
        defaultTab={activeStockDetail?.defaultTab || 'history'}
      />
    </AppPage>
  );
};

export default HomePage;
