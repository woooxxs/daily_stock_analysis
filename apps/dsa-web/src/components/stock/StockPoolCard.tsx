import type React from 'react';
import { Bot, Clock3, Eye, Minus, PlayCircle, TrendingDown, TrendingUp, Trash2 } from 'lucide-react';
import { getSentimentColor } from '../../types/analysis';
import { formatDateTime } from '../../utils/format';
import { Badge, Button } from '../common';

function getTrendIcon(value?: string): React.ReactNode {
  if (!value) {
    return <Minus className="h-3.5 w-3.5" />;
  }

  if (value.includes('强烈看空') || value.includes('看空') || value.includes('空头')) {
    return <TrendingDown className="h-3.5 w-3.5" />;
  }

  if (value.includes('震荡') || value.includes('中性') || value.includes('观望')) {
    return <Minus className="h-3.5 w-3.5" />;
  }

  if (value.includes('强烈看多') || value.includes('看多') || value.includes('多头')) {
    return <TrendingUp className="h-3.5 w-3.5" />;
  }

  return <TrendingUp className="h-3.5 w-3.5" />;
}

function getTrendBadgeClass(value?: string): string {
  if (!value) return 'border-border bg-background text-muted-foreground';

  if (value.includes('强烈看空') || value.includes('看空') || value.includes('空头')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300';
  }

  if (value.includes('震荡') || value.includes('中性') || value.includes('观望')) {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300';
  }

  if (value.includes('强烈看多') || value.includes('看多') || value.includes('多头')) {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300';
  }

  return 'border-primary/20 bg-primary/10 text-primary';
}

function getAdviceBadgeClass(value?: string): string {
  if (!value) return 'border-border bg-background text-muted-foreground';

  if (value.includes('卖出') || value.includes('减仓') || value.includes('止损') || value.includes('离场') || value.includes('回避')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300';
  }

  if (value.includes('观望') || value.includes('持有') || value.includes('等待') || value.includes('中性')) {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300';
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
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
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
  const priceToneClass = hasPositiveMove ? 'text-red-500' : hasNegativeMove ? 'text-emerald-500' : 'text-foreground';
  const changeBadgeClass = hasPositiveMove
    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
    : hasNegativeMove
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
      : 'border-border bg-background text-muted-foreground';

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-foreground">{stockName || code}</h3>
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium font-mono text-muted-foreground">
                {code}
              </span>
              <span className={['rounded-full border px-2.5 py-1 text-[11px] font-semibold', statusStyles[statusTone]].join(' ')}>
                {statusLabel}
              </span>
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
            <div className={`text-2xl font-bold font-mono leading-tight ${priceToneClass}`}>
              {currentPrice != null ? currentPrice.toFixed(2) : '--'}
            </div>
            {changePercent != null ? (
              <div className="mt-2 flex justify-end">
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

        <div className="flex flex-wrap items-center gap-2">
          {trendPrediction ? (
            <Badge variant="default" className={getTrendBadgeClass(trendPrediction)}>
              {getTrendIcon(trendPrediction)}
              趋势 · {trendPrediction}
            </Badge>
          ) : (
            <Badge variant="default">
              <Minus className="h-3.5 w-3.5" />
              等待分析
            </Badge>
          )}
          {operationAdvice ? (
            <Badge variant="default" className={getAdviceBadgeClass(operationAdvice)}>
              建议 · {operationAdvice}
            </Badge>
          ) : null}
        </div>

        {quoteError ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            {quoteError}
          </p>
        ) : null}

        <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 size={12} />
            <span>{latestAnalysisTime ? formatDateTime(latestAnalysisTime) : '暂无历史记录'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
      </div>
    </article>
  );
};

export default StockPoolCard;
