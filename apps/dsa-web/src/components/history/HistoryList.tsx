import type React from 'react';
import { useRef, useCallback, useEffect } from 'react';
import { Clock3 } from 'lucide-react';
import type { HistoryItem } from '../../types/analysis';
import { getSentimentColor } from '../../types/analysis';
import { cn } from '../../utils/cn';
import { formatDateTime } from '../../utils/format';
import { EmptyState } from '../common';

interface HistoryListProps {
  items: HistoryItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  selectedId?: number;
  onItemClick: (recordId: number) => void;
  onLoadMore: () => void;
  className?: string;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  isLoading,
  isLoadingMore,
  hasMore,
  selectedId,
  onItemClick,
  onLoadMore,
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isLoading && !isLoadingMore) {
        const container = scrollContainerRef.current;
        if (container && container.scrollHeight > container.clientHeight) {
          onLoadMore();
        }
      }
    },
    [hasMore, isLoading, isLoadingMore, onLoadMore],
  );

  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    const container = scrollContainerRef.current;
    if (!trigger || !container) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: container,
      rootMargin: '20px',
      threshold: 0.1,
    });

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [handleObserver]);

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-border bg-card/70 shadow-sm', className)}>
      <div className="shrink-0 border-b border-border px-4 py-4">
        <h3 className="text-sm font-semibold text-foreground">历史记录</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">按时间查看该股票的历史分析结果。</p>
      </div>

      <div ref={scrollContainerRef} className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="暂无历史记录" description="该股票目前还没有分析历史，稍后执行分析后会自动出现在这里。" className="border-none bg-transparent py-8 shadow-none" />
        ) : (
          <>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onItemClick(item.id)}
                className={[
                  'w-full rounded-xl border px-2.5 py-2.5 text-left transition-all',
                  selectedId === item.id ? 'border-primary/20 bg-primary/10 shadow-sm' : 'border-border bg-background hover:bg-accent/40',
                ].join(' ')}
              >
                <div className="flex items-start gap-2.5">
                  {item.sentimentScore !== undefined ? (
                    <span
                      className="mt-0.5 h-9 w-1 rounded-full"
                      style={{ backgroundColor: getSentimentColor(item.sentimentScore) }}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-foreground">{item.stockName || item.stockCode}</span>
                          {item.operationAdvice ? (
                            <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {item.operationAdvice}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {item.sentimentScore !== undefined ? (
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ color: getSentimentColor(item.sentimentScore), backgroundColor: `${getSentimentColor(item.sentimentScore)}15` }}
                        >
                          {item.sentimentScore}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDateTime(item.createdAt)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            <div ref={loadMoreTriggerRef} className="flex justify-center py-2 text-xs text-muted-foreground">
              {isLoadingMore ? '正在加载更多...' : hasMore ? '继续下滑加载更多' : '已经到底了'}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
