import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { historyApi } from '../../api/history';
import type { AnalysisReport, HistoryItem } from '../../types/analysis';
import { resolveDisplayStockName } from '../../utils/stock';
import { EmptyState, InlineAlert, SectionCard } from '../common';
import { HistoryList } from '../history';
import { ReportSummary } from '../report';

const pageSize = 20;

type StockHistoryPanelProps = {
  stockCode: string;
  fallbackName?: string;
  listClassName?: string;
};

export const StockHistoryPanel: React.FC<StockHistoryPanelProps> = ({ stockCode, fallbackName, listClassName = 'h-full' }) => {
  const normalizedCode = stockCode.toUpperCase();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);

  const currentPageRef = useRef(currentPage);
  const historyItemsRef = useRef(historyItems);
  const selectedReportRef = useRef<AnalysisReport | null>(selectedReport);
  const requestIdRef = useRef(0);

  currentPageRef.current = currentPage;
  historyItemsRef.current = historyItems;
  selectedReportRef.current = selectedReport;

  const loadReport = useCallback(async (recordId: number) => {
    const requestId = ++requestIdRef.current;
    setIsLoadingReport(true);
    setLoadError(null);

    try {
      const report = await historyApi.getDetail(recordId);
      if (requestId === requestIdRef.current) {
        setSelectedReport(report);
      }
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setLoadError(error instanceof Error ? error.message : '报告加载失败');
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoadingReport(false);
      }
    }
  }, []);

  const fetchHistory = useCallback(async (reset = true, silent = false) => {
    if (!silent) {
      if (reset) {
        setIsLoadingHistory(true);
      } else {
        setIsLoadingMore(true);
      }
    }

    const page = reset ? 1 : currentPageRef.current + 1;

    try {
      const response = await historyApi.getList({ stockCode: normalizedCode, page, limit: pageSize });
      const nextItems = reset ? response.items : [...historyItemsRef.current, ...response.items];

      setHistoryItems(nextItems);
      setCurrentPage(page);
      setHasMore(nextItems.length < response.total);
      setLoadError(null);

      const shouldSelectFirst =
        response.items.length > 0 &&
        (!selectedReportRef.current || !nextItems.some((item) => item.id === selectedReportRef.current?.meta.id));

      if (shouldSelectFirst) {
        void loadReport(response.items[0].id);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '历史记录加载失败');
    } finally {
      if (!silent) {
        setIsLoadingHistory(false);
        setIsLoadingMore(false);
      }
    }
  }, [loadReport, normalizedCode]);

  useEffect(() => {
    setHistoryItems([]);
    setSelectedReport(null);
    setCurrentPage(1);
    setHasMore(true);
    void fetchHistory(true);
  }, [fetchHistory]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchHistory(true, true);
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [fetchHistory]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchHistory(true, true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchHistory]);

  const stockName = useMemo(
    () => resolveDisplayStockName(normalizedCode, selectedReport?.meta.stockName, historyItems[0]?.stockName, fallbackName),
    [fallbackName, historyItems, normalizedCode, selectedReport?.meta.stockName],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      {loadError ? <InlineAlert tone="error" message={loadError} /> : null}

      <div className="grid min-h-0 flex-1 items-stretch gap-4 overflow-hidden xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="h-full min-h-0 overflow-hidden">
          <HistoryList
            items={historyItems}
            isLoading={isLoadingHistory}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            selectedId={selectedReport?.meta.id}
            onItemClick={(recordId) => void loadReport(recordId)}
            onLoadMore={() => void fetchHistory(false)}
            className={listClassName}
          />
        </div>

        <div className="h-full min-h-0 overflow-hidden">
          {isLoadingReport ? (
            <SectionCard className="h-full overflow-hidden">
              <div className="space-y-3">
                <div className="h-4 w-40 animate-pulse rounded bg-muted/40" />
                <div className="h-32 animate-pulse rounded-2xl bg-muted/20" />
                <div className="h-32 animate-pulse rounded-2xl bg-muted/20" />
              </div>
            </SectionCard>
          ) : selectedReport ? (
            <div className="custom-scrollbar h-full min-h-0 overflow-y-auto pr-1">
              <ReportSummary data={selectedReport} isHistory />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                title={`暂无 ${stockName} 的历史报告`}
                description="当前股票还没有可复盘的分析结果。先发起一次分析，后续这里会自动沉淀专属历史记录。"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
