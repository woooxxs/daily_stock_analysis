import type React from 'react';
import type { ReportMeta, ReportSummary as ReportSummaryType } from '../../types/analysis';
import { Card, ScoreGauge } from '../common';
import { formatDateTime } from '../../utils/format';

interface ReportOverviewProps {
  meta: ReportMeta;
  summary: ReportSummaryType;
  isHistory?: boolean;
}

export const ReportOverview: React.FC<ReportOverviewProps> = ({ meta, summary }) => {
  const getPriceChangeColor = (changePct: number | undefined): string => {
    if (changePct === undefined || changePct === null) return 'text-muted-foreground';
    if (changePct > 0) return 'text-red-500';
    if (changePct < 0) return 'text-emerald-500';
    return 'text-muted-foreground';
  };

  const formatChangePct = (changePct: number | undefined): string => {
    if (changePct === undefined || changePct === null) return '--';
    const sign = changePct > 0 ? '+' : '';
    return `${sign}${changePct.toFixed(2)}%`;
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_360px]">
      <div className="space-y-4">
        <Card variant="gradient" padding="lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold text-foreground">{meta.stockName || meta.stockCode}</h2>
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium font-mono text-muted-foreground">{meta.stockCode}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDateTime(meta.createdAt)}
              </div>
            </div>
            {meta.currentPrice != null ? (
              <div className="rounded-2xl border border-border bg-background px-4 py-3 text-right shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Price</p>
                <p className={`mt-2 text-2xl font-bold font-mono ${getPriceChangeColor(meta.changePct)}`}>{meta.currentPrice.toFixed(2)}</p>
                <p className={`mt-1 text-sm font-semibold font-mono ${getPriceChangeColor(meta.changePct)}`}>{formatChangePct(meta.changePct)}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <span className="label-uppercase">Key Insights</span>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">{summary.analysisSummary || '暂无分析结论'}</p>
          </div>
        </Card>

        <div className="grid gap-3 md:grid-cols-2">
          <Card variant="bordered" padding="md">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">操作建议</p>
                <p className="mt-1 text-sm font-medium text-foreground">{summary.operationAdvice || '暂无建议'}</p>
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">趋势预测</p>
                <p className="mt-1 text-sm font-medium text-foreground">{summary.trendPrediction || '暂无预测'}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card variant="bordered" padding="lg" className="flex flex-col justify-center">
        <div className="text-center">
          <h3 className="text-sm font-medium text-foreground">市场情绪</h3>
          <div className="mt-4">
            <ScoreGauge score={summary.sentimentScore} size="lg" />
          </div>
        </div>
      </Card>
    </div>
  );
};
