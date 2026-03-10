import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Bot, FileText, X } from 'lucide-react';
import { resolveDisplayStockName } from '../../utils/stock';
import { StockAskPanel } from './StockAskPanel';
import { StockHistoryPanel } from './StockHistoryPanel';

export type StockDetailTab = 'history' | 'ask';

type StockDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  stockCode: string;
  stockName?: string;
  currentPrice?: number;
  changePercent?: number;
  recordId?: number;
  defaultTab?: StockDetailTab;
};

export const StockDetailModal: React.FC<StockDetailModalProps> = ({
  isOpen,
  onClose,
  stockCode,
  stockName,
  currentPrice,
  changePercent,
  recordId,
  defaultTab = 'history',
}) => {
  const [activeTab, setActiveTab] = useState<StockDetailTab>(defaultTab);
  const normalizedCode = stockCode.toUpperCase();
  const displayName = useMemo(() => resolveDisplayStockName(normalizedCode, stockName), [normalizedCode, stockName]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const hasPositiveMove = (changePercent ?? 0) > 0;
  const hasNegativeMove = (changePercent ?? 0) < 0;
  const changeClass = hasPositiveMove ? 'text-red-500' : hasNegativeMove ? 'text-emerald-500' : 'text-muted-foreground';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/25 px-4 py-6 backdrop-blur-sm dark:bg-slate-950/45" onClick={onClose}>
      <div
        className="flex h-[88vh] w-[96vw] max-h-[960px] max-w-7xl flex-col overflow-hidden rounded-[32px] border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-5 py-4 md:px-6">
          <div className="custom-scrollbar flex items-center gap-3 overflow-x-auto whitespace-nowrap">
            <h2 className="shrink-0 text-lg font-semibold text-foreground md:text-xl">{displayName}</h2>
            <span className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs font-mono text-muted-foreground">
              {normalizedCode}
            </span>
            <span className={`shrink-0 text-sm font-semibold font-mono md:text-base ${changeClass}`}>
              {currentPrice != null ? currentPrice.toFixed(2) : '--'}
            </span>
            {changePercent != null ? (
              <span className={`shrink-0 text-sm font-semibold font-mono ${changeClass}`}>
                {hasPositiveMove ? '+' : ''}
                {changePercent.toFixed(2)}%
              </span>
            ) : null}

            <div className="ml-auto flex items-center gap-2 pl-2">
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={[
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  activeTab === 'history' ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                ].join(' ')}
              >
                <FileText className="h-4 w-4" />
                历史记录
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ask')}
                className={[
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  activeTab === 'ask' ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                ].join(' ')}
              >
                <Bot className="h-4 w-4" />
                问股
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="关闭弹窗"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden p-5 md:p-6">
          {activeTab === 'history' ? (
            <StockHistoryPanel key={`history-${normalizedCode}`} stockCode={normalizedCode} fallbackName={displayName} listClassName="h-full" />
          ) : (
            <StockAskPanel key={`ask-${normalizedCode}-${recordId || 'none'}`} stockCode={normalizedCode} stockName={displayName} recordId={recordId} />
          )}
        </div>
      </div>
    </div>
  );
};
