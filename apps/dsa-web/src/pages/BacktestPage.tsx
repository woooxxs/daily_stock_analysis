import type React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Filter, PlayCircle, TrendingUp } from 'lucide-react';
import { backtestApi } from '../api/backtest';
import { systemConfigApi } from '../api/systemConfig';
import {
  AppPage,
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Pagination,
  SectionCard,
  Select,
} from '../components/common';
import type { BacktestResultItem, BacktestRunResponse, PerformanceMetrics } from '../types/backtest';

function pct(value?: number | null): string {
  if (value == null) return '--';
  return `${value.toFixed(1)}%`;
}

function outcomeBadge(outcome?: string) {
  if (!outcome) return <Badge variant="default">--</Badge>;
  switch (outcome) {
    case 'win':
      return <Badge variant="success">WIN</Badge>;
    case 'loss':
      return <Badge variant="danger">LOSS</Badge>;
    case 'neutral':
      return <Badge variant="warning">NEUTRAL</Badge>;
    default:
      return <Badge variant="default">{outcome}</Badge>;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="success">completed</Badge>;
    case 'insufficient':
      return <Badge variant="warning">insufficient</Badge>;
    case 'error':
      return <Badge variant="danger">error</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

function boolIcon(value?: boolean | null) {
  if (value === true) return <span className="text-emerald-500">&#10003;</span>;
  if (value === false) return <span className="text-red-500">&#10007;</span>;
  return <span className="text-muted-foreground">--</span>;
}

function normalizeWatchlistCodes(value: string): string[] {
  const uniqueCodes = new Set<string>();

  value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .forEach((code) => uniqueCodes.add(code));

  return [...uniqueCodes];
}

const MetricRow: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`text-sm font-mono font-semibold ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</span>
  </div>
);

const PerformanceCard: React.FC<{ metrics: PerformanceMetrics; title: string }> = ({ metrics, title }) => (
  <SectionCard title={title} eyebrow="Performance" description="基于当前筛选条件统计的回测表现摘要。">
    <div className="space-y-1">
      <MetricRow label="Direction Accuracy" value={pct(metrics.directionAccuracyPct)} accent />
      <MetricRow label="Win Rate" value={pct(metrics.winRatePct)} accent />
      <MetricRow label="Avg Sim. Return" value={pct(metrics.avgSimulatedReturnPct)} />
      <MetricRow label="Avg Stock Return" value={pct(metrics.avgStockReturnPct)} />
      <MetricRow label="SL Trigger Rate" value={pct(metrics.stopLossTriggerRate)} />
      <MetricRow label="TP Trigger Rate" value={pct(metrics.takeProfitTriggerRate)} />
      <MetricRow label="Avg Days to Hit" value={metrics.avgDaysToFirstHit != null ? metrics.avgDaysToFirstHit.toFixed(1) : '--'} />
    </div>
    <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-background/70 p-4 sm:grid-cols-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Evaluations</p>
        <p className="mt-1 font-mono text-sm text-foreground">
          {Number(metrics.completedCount)} / {Number(metrics.totalEvaluations)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">W / L / N</p>
        <p className="mt-1 font-mono text-sm text-foreground">
          <span className="text-emerald-500">{metrics.winCount}</span>
          {' / '}
          <span className="text-red-500">{metrics.lossCount}</span>
          {' / '}
          <span className="text-amber-500">{metrics.neutralCount}</span>
        </p>
      </div>
    </div>
  </SectionCard>
);

const RunSummary: React.FC<{ data: BacktestRunResponse }> = ({ data }) => (
  <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-sm">
    <span className="text-muted-foreground">Processed: <span className="text-foreground">{data.processed}</span></span>
    <span className="text-muted-foreground">Saved: <span className="text-primary">{data.saved}</span></span>
    <span className="text-muted-foreground">Completed: <span className="text-emerald-500">{data.completed}</span></span>
    <span className="text-muted-foreground">Insufficient: <span className="text-amber-500">{data.insufficient}</span></span>
    {data.errors > 0 ? <span className="text-muted-foreground">Errors: <span className="text-red-500">{data.errors}</span></span> : null}
  </div>
);

const BacktestPage: React.FC = () => {
  const [watchlistCodes, setWatchlistCodes] = useState<string[]>([]);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true);
  const [codeFilter, setCodeFilter] = useState('');
  const [evalDays, setEvalDays] = useState('');
  const [forceRerun, setForceRerun] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<BacktestRunResponse | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const [results, setResults] = useState<BacktestResultItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const pageSize = 20;

  const [overallPerf, setOverallPerf] = useState<PerformanceMetrics | null>(null);
  const [stockPerf, setStockPerf] = useState<PerformanceMetrics | null>(null);
  const [isLoadingPerf, setIsLoadingPerf] = useState(false);

  const stockOptions = useMemo(
    () => [
      { value: '', label: '全部股票' },
      ...watchlistCodes.map((code) => ({
        value: code,
        label: code,
      })),
    ],
    [watchlistCodes],
  );

  useEffect(() => {
    let isActive = true;

    const syncWatchlistFromConfig = async () => {
      setIsLoadingWatchlist(true);
      try {
        const config = await systemConfigApi.getConfig(false);
        const stockListValue = config.items.find((item) => item.key === 'STOCK_LIST')?.value ?? '';
        if (isActive) {
          setWatchlistCodes(normalizeWatchlistCodes(stockListValue));
        }
      } catch (error) {
        console.error('Failed to sync watchlist from system config:', error);
      } finally {
        if (isActive) {
          setIsLoadingWatchlist(false);
        }
      }
    };

    void syncWatchlistFromConfig();

    return () => {
      isActive = false;
    };
  }, []);

  const fetchResults = useCallback(async (page = 1, code?: string, windowDays?: number) => {
    setIsLoadingResults(true);
    try {
      const response = await backtestApi.getResults({ code: code || undefined, evalWindowDays: windowDays, page, limit: pageSize });
      setResults(response.items);
      setTotalResults(response.total);
      setCurrentPage(response.page);
    } catch (error) {
      console.error('Failed to fetch backtest results:', error);
    } finally {
      setIsLoadingResults(false);
    }
  }, []);

  const fetchPerformance = useCallback(async (code?: string, windowDays?: number) => {
    setIsLoadingPerf(true);
    try {
      const overall = await backtestApi.getOverallPerformance(windowDays);
      setOverallPerf(overall);

      if (code) {
        const stock = await backtestApi.getStockPerformance(code, windowDays);
        setStockPerf(stock);
      } else {
        setStockPerf(null);
      }
    } catch (error) {
      console.error('Failed to fetch performance:', error);
    } finally {
      setIsLoadingPerf(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const overall = await backtestApi.getOverallPerformance();
      setOverallPerf(overall);
      const windowDays = overall?.evalWindowDays;
      if (windowDays && !evalDays) {
        setEvalDays(String(windowDays));
      }
      fetchResults(1, undefined, windowDays);
    };
    void init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (page: number) => {
    const code = codeFilter.trim() || undefined;
    const days = evalDays ? parseInt(evalDays, 10) : undefined;
    void fetchResults(page, code, days);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setRunResult(null);
    setRunError(null);
    try {
      const code = codeFilter.trim() || undefined;
      const evalWindowDays = evalDays ? parseInt(evalDays, 10) : undefined;
      const response = await backtestApi.run({
        code,
        force: forceRerun || undefined,
        minAgeDays: forceRerun ? 0 : undefined,
        evalWindowDays,
      });
      setRunResult(response);
      void fetchResults(1, codeFilter.trim() || undefined, evalWindowDays);
      void fetchPerformance(codeFilter.trim() || undefined, evalWindowDays);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'Backtest failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleFilter = () => {
    const code = codeFilter.trim() || undefined;
    const windowDays = evalDays ? parseInt(evalDays, 10) : undefined;
    setCurrentPage(1);
    void fetchResults(1, code, windowDays);
    void fetchPerformance(code, windowDays);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleFilter();
    }
  };

  return (
    <AppPage className="space-y-6">
      <PageHeader
        eyebrow="Backtest"
        icon={<TrendingUp className="h-4 w-4" />}
        title="策略回测"
        description="通过统一的筛选工具条、表现摘要和结果表格查看策略历史表现。"
      />

      <SectionCard eyebrow="Control Panel" title="回测控制台" description="先设置筛选条件，再执行回测。">
        <div className="custom-scrollbar overflow-x-auto">
          <div className="flex min-w-max items-center gap-4 py-1">
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-sm font-medium text-foreground">股票代码</span>
              <div className="w-[220px] shrink-0">
                <Select
                  value={codeFilter}
                  onChange={setCodeFilter}
                  options={stockOptions}
                  placeholder={isLoadingWatchlist ? '加载自选股中...' : '请选择股票代码'}
                  disabled={isLoadingWatchlist}
                  searchable
                  searchPlaceholder="输入股票代码搜索"
                  emptyText={isLoadingWatchlist ? '自选股加载中...' : watchlistCodes.length > 0 ? '没有匹配的股票' : '当前自选股池为空'}
                  className="w-full"
                />
              </div>
            </div>

            <div className="h-8 w-px shrink-0 bg-border" />

            <div className="flex items-center gap-3">
              <span className="shrink-0 text-sm font-medium text-foreground">评估窗口（天）</span>
              <input
                type="number"
                placeholder="默认窗口"
                value={evalDays}
                onChange={(event) => setEvalDays(event.target.value)}
                onKeyDown={handleKeyDown}
                className="h-10 w-36 shrink-0 rounded-xl border border-input bg-background px-3.5 py-2 text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div className="h-8 w-px shrink-0 bg-border" />

            <div className="flex items-center gap-3">
              <span className="shrink-0 text-sm font-medium text-foreground">执行选项</span>
              <label className="flex h-10 shrink-0 cursor-pointer items-center gap-3 rounded-xl border border-input bg-background px-3.5 text-sm text-foreground shadow-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary/20"
                  checked={forceRerun}
                  onChange={(event) => setForceRerun(event.target.checked)}
                />
                <span className="whitespace-nowrap text-muted-foreground">强制重跑，忽略已有缓存结果</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleFilter}>
            <Filter className="h-4 w-4" />
            应用筛选
          </Button>
          <Button type="button" onClick={() => void handleRun()} isLoading={isRunning}>
            <PlayCircle className="h-4 w-4" />
            {isRunning ? '运行中...' : '开始回测'}
          </Button>
        </div>
      </SectionCard>

      {runResult || runError ? (
        <SectionCard eyebrow="Execution" title="本次运行摘要" description="展示最近一次回测执行结果。">
          <div className="flex flex-col gap-3">
            {runResult ? <RunSummary data={runResult} /> : null}
            {runError ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">Error: {runError}</div> : null}
          </div>
        </SectionCard>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {isLoadingPerf ? (
          <>
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/30" />
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/30" />
          </>
        ) : (
          <>
            {overallPerf ? <PerformanceCard title="Overall Performance" metrics={overallPerf} /> : <EmptyState title="暂无整体回测数据" description="当前筛选条件下还没有可展示的整体表现摘要。" />}
            {stockPerf ? (
              <PerformanceCard title={`Performance: ${codeFilter}`} metrics={stockPerf} />
            ) : (
              <EmptyState title={codeFilter ? '该股票暂无回测数据' : '选择股票代码查看个股表现'} description="从自选股下拉框中选择股票并应用筛选后，这里会展示对应个股表现摘要。" />
            )}
          </>
        )}
      </div>

      <SectionCard eyebrow="Results" title="详细回测记录" description={`当前结果总数：${totalResults}`} contentClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Initial Price</th>
                <th className="px-4 py-3 font-medium">Strategy</th>
                <th className="px-4 py-3 font-medium">Sim. Return</th>
                <th className="px-4 py-3 font-medium">Outcome</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Hit TP/SL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoadingResults ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    加载中...
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    暂无回测记录
                  </td>
                </tr>
              ) : (
                results.map((item) => (
                  <tr key={item.analysisHistoryId} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-medium text-foreground">{item.code}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.analysisDate ? new Date(item.analysisDate).toLocaleDateString() : '--'}
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground">{item.startPrice?.toFixed(2) ?? '--'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md border border-border bg-accent/50 px-2 py-1 text-xs font-medium text-foreground">
                        {item.operationAdvice || '--'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-mono font-medium ${(item.simulatedReturnPct || 0) > 0 ? 'text-emerald-500' : (item.simulatedReturnPct || 0) < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {pct(item.simulatedReturnPct)}
                    </td>
                    <td className="px-4 py-3">{outcomeBadge(item.outcome)}</td>
                    <td className="px-4 py-3">{statusBadge(item.evalStatus)}</td>
                    <td className="space-x-2 px-4 py-3 text-center text-xs">
                      <span title="Take Profit Hit">{boolIcon(item.hitTakeProfit)}</span>
                      <span className="text-border">|</span>
                      <span title="Stop Loss Hit">{boolIcon(item.hitStopLoss)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border px-4 py-3">
          <Pagination currentPage={currentPage} totalItems={totalResults} pageSize={pageSize} onPageChange={handlePageChange} />
        </div>
      </SectionCard>
    </AppPage>
  );
};

export default BacktestPage;
