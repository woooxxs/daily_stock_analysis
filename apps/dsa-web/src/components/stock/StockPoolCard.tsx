import type React from 'react';
import { ArrowLeftRight, Bot, Clock3, Eye, Minus, PlayCircle, TrendingDown, TrendingUp, Trash2 } from 'lucide-react';
import { getSentimentColor } from '../../types/analysis';
import { formatDateTime } from '../../utils/format';
import { cn } from '../../utils/cn';
import { normalizeTrendCategory, sanitizeTrendPrediction } from '../../utils/stock';
import { Badge, Button } from '../common';

function getTrendIcon(value?: string): React.ReactNode {
  const category = normalizeTrendCategory(value);
  const normalizedValue = value || '';

  if (normalizedValue.includes('震荡')) {
    return <ArrowLeftRight className="h-3.5 w-3.5" />;
  }

  if (category === 'bearish') {
    return <TrendingDown className="h-3.5 w-3.5" />;
  }

  if (category === 'neutral' || category === 'unknown') {
    return <ArrowLeftRight className="h-3.5 w-3.5" />;
  }

  return <TrendingUp className="h-3.5 w-3.5" />;
}

function getTrendBadgeClass(value?: string): string {
  const category = normalizeTrendCategory(value);
  const normalizedValue = value || '';

  if (normalizedValue.includes('强烈看多') || normalizedValue.includes('强势多头')) {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300';
  }

  if (normalizedValue.includes('看多') || normalizedValue.includes('多头') || normalizedValue.includes('上涨') || normalizedValue.includes('反弹')) {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300';
  }

  if (normalizedValue.includes('震荡') || normalizedValue.includes('中性') || normalizedValue.includes('观望') || normalizedValue.includes('盘整')) {
    return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300';
  }

  if (normalizedValue.includes('强烈看空') || normalizedValue.includes('强势空头')) {
    return 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200';
  }

  if (normalizedValue.includes('看空') || normalizedValue.includes('空头') || normalizedValue.includes('下行') || normalizedValue.includes('下跌')) {
    return 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200';
  }

  if (category === 'bearish') {
    return 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200';
  }

  if (category === 'neutral') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300';
  }

  if (category === 'bullish') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300';
  }

  return 'border-border bg-background text-muted-foreground';
}

function getCompactBadgeClass(className?: string): string {
  return cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', className);
}

function getAdviceBadgeClass(value?: string): string {
  if (!value) return 'border-border bg-background text-muted-foreground';

  if (value.includes('强烈买入') || value.includes('重仓') || value.includes('大胆介入')) {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300';
  }

  if (value.includes('卖出') || value.includes('减仓') || value.includes('止损') || value.includes('离场') || value.includes('回避')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300';
  }

  if (value.includes('观望') || value.includes('持有') || value.includes('等待') || value.includes('中性')) {
    return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300';
  }

  if (value.includes('买入') || value.includes('加仓') || value.includes('低吸') || value.includes('介入')) {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300';
  }

  return 'border-primary/20 bg-primary/10 text-primary';
}

type StockPoolCardProps = {
  code: string;
  stockName?: string;
  currentPrice?: number;
  changePercent?: number;
  latestAnalysisTime?: string;
  sentimentScore?: number;
  trendPrediction?: string;
  operationAdvice?: string;
  quoteError?: string;
  statusLabel?: string;
  statusTone?: 'waiting' | 'watch' | 'active' | 'default';
  onAnalyze: (code: string) => void;
  onViewReport: (code: string) => void;
  onAsk: (code: string) => void;
  onRemove: (code: string) => void;
};

const statusStyles: Record<NonNullable<StockPoolCardProps['statusTone']>, string> = {
  waiting: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
  watch: 'border-primary/20 bg-primary/10 text-primary',
  active: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300',
  default: 'border-border bg-background text-muted-foreground',
};

const StockPoolCard: React.FC<StockPoolCardProps> = ({
  code,
  stockName,
  currentPrice,
  changePercent,
  latestAnalysisTime,
  sentimentScore,
  trendPrediction,
  operationAdvice,
  quoteError,
  statusLabel = '等待分析',
  statusTone = 'default',
  onAnalyze,
  onViewReport,
  onAsk,
  onRemove,
}) => {
  const hasPositiveMove = (changePercent ?? 0) > 0;
  const hasNegativeMove = (changePercent ?? 0) < 0;
  const sentimentColor = sentimentScore == null ? undefined : getSentimentColor(sentimentScore);
  const trendText = sanitizeTrendPrediction(trendPrediction);
  const showStatusBadge = statusLabel && (!operationAdvice || statusLabel !== operationAdvice);
  const priceToneClass = hasPositiveMove ? 'text-red-500' : hasNegativeMove ? 'text-emerald-500' : 'text-foreground';
  const changeBadgeClass = hasPositiveMove
    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
    : hasNegativeMove
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
      : 'border-border bg-background text-muted-foreground';

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="max-w-[180px] truncate text-base font-semibold text-foreground sm:max-w-[200px]">{stockName || code}</h3>
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium font-mono text-muted-foreground">
                {code}
              </span>
              {showStatusBadge ? (
                <span className={['rounded-full border px-2.5 py-1 text-[11px] font-semibold', statusStyles[statusTone]].join(' ')}>
                  {statusLabel}
                </span>
              ) : null}
            </div>
            {sentimentScore != null ? (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted" title={`情绪评分: ${sentimentScore}`}>
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.min(Math.max(sentimentScore, 0), 100)}%`,
                      backgroundColor: sentimentColor,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold" style={{ color: sentimentColor }}>
                  情绪 {sentimentScore}
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">暂无情绪评分，建议先执行一次分析。</p>
            )}
          </div>

          <div className="text-right">
            <div className={`text-xl font-bold font-mono leading-tight ${priceToneClass} sm:text-2xl`}>
              {currentPrice != null ? currentPrice.toFixed(2) : '--'}
            </div>
            {changePercent != null ? (
              <div className="mt-1.5 flex justify-end">
                <span className={['inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold font-mono', changeBadgeClass].join(' ')}>
                  {hasPositiveMove ? '+' : ''}
                  {changePercent.toFixed(2)}%
                </span>
              </div>
            ) : (
              <div className="mt-1 text-xs text-muted-foreground">暂无实时涨跌</div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {trendText ? (
              <span className={getCompactBadgeClass(getTrendBadgeClass(trendText))}>
                {getTrendIcon(trendText)}
                趋势 · {trendText}
              </span>
            ) : (
              <Badge variant="default">
                <Minus className="h-3.5 w-3.5" />
                等待分析
              </Badge>
            )}
            {operationAdvice ? (
              <span className={getCompactBadgeClass(getAdviceBadgeClass(operationAdvice))}>
                建议 · {operationAdvice}
              </span>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock3 size={12} />
            <span>{latestAnalysisTime ? formatDateTime(latestAnalysisTime) : '暂无历史'}</span>
          </div>
        </div>

        {quoteError ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            {quoteError}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button type="button" size="sm" onClick={() => onAnalyze(code)}>
            <PlayCircle size={14} />
            分析
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => onViewReport(code)}>
            <Eye size={14} />
            详情
          </Button>
          <button
            type="button"
            onClick={() => onAsk(code)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-primary transition-colors hover:bg-primary/5"
            title="AI 追问"
          >
            <Bot size={16} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(code)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="移除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
};

export default StockPoolCard;
