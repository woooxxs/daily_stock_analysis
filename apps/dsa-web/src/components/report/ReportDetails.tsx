import type React from 'react';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ReportDetails as ReportDetailsType } from '../../types/analysis';
import { Card } from '../common';
import { cn } from '../../utils/cn';

interface ReportDetailsProps {
  details?: ReportDetailsType;
  recordId?: number;
}

export const ReportDetails: React.FC<ReportDetailsProps> = ({ details, recordId }) => {
  const [showRaw, setShowRaw] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!details?.rawResult && !details?.contextSnapshot && !recordId) {
    return null;
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const renderJson = (data: unknown) => {
    const jsonStr = JSON.stringify(data, null, 2);
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-background">
        <button
          type="button"
          onClick={() => void copyToClipboard(jsonStr)}
          className="absolute right-3 top-3 rounded-lg border border-border bg-card px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <pre className="custom-scrollbar max-h-80 overflow-x-auto overflow-y-auto p-4 pr-16 text-left text-xs text-foreground">{jsonStr}</pre>
      </div>
    );
  };

  return (
    <Card variant="bordered" padding="lg" className="text-left">
      <div className="mb-4 flex items-baseline gap-2">
        <span className="label-uppercase">Transparency</span>
        <h3 className="text-base font-semibold text-foreground">数据追溯</h3>
      </div>

      {recordId ? (
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-4 text-xs text-muted-foreground">
          <span>Record ID:</span>
          <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-primary">{recordId}</code>
        </div>
      ) : null}

      <div className="space-y-3">
        {details?.rawResult ? (
          <div>
            <button
              type="button"
              onClick={() => setShowRaw(!showRaw)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/40"
            >
              <span>原始分析结果</span>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showRaw && 'rotate-180')} />
            </button>
            {showRaw ? <div className="mt-2">{renderJson(details.rawResult)}</div> : null}
          </div>
        ) : null}

        {details?.contextSnapshot ? (
          <div>
            <button
              type="button"
              onClick={() => setShowSnapshot(!showSnapshot)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/40"
            >
              <span>分析快照</span>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showSnapshot && 'rotate-180')} />
            </button>
            {showSnapshot ? <div className="mt-2">{renderJson(details.contextSnapshot)}</div> : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
};
