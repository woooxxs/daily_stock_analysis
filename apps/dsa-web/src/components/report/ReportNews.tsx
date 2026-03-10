import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { RefreshCcw } from 'lucide-react';
import { Card, EmptyState } from '../common';
import { historyApi } from '../../api/history';
import type { NewsIntelItem } from '../../types/analysis';

interface ReportNewsProps {
  recordId?: number;
  limit?: number;
}

export const ReportNews: React.FC<ReportNewsProps> = ({ recordId, limit = 20 }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<NewsIntelItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    if (!recordId) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await historyApi.getNews(recordId, limit);
      setItems(response.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载资讯失败');
    } finally {
      setIsLoading(false);
    }
  }, [recordId, limit]);

  useEffect(() => {
    setItems([]);
    setError(null);
    if (recordId) {
      void fetchNews();
    }
  }, [recordId, fetchNews]);

  if (!recordId) {
    return null;
  }

  return (
    <Card variant="bordered" padding="lg">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="label-uppercase">News Feed</span>
            <h3 className="text-base font-semibold text-foreground">相关资讯</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">自动拉取与本次历史报告相关的资讯内容。</p>
        </div>
        <button type="button" onClick={() => void fetchNews()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {error && !isLoading ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      {isLoading && !error ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          正在加载资讯...
        </div>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <EmptyState title="暂无相关资讯" description="当前历史记录还没有关联到新闻资讯。" className="border-none bg-transparent px-0 py-8 shadow-none" />
      ) : null}

      <div className="space-y-3">
        {items.map((item) => (
          <article key={`${item.url}-${item.title}`} className="rounded-2xl border border-border bg-background p-4 transition-colors hover:bg-accent/40">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.snippet}</p>
              </div>
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  跳转
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14" />
                  </svg>
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
};
