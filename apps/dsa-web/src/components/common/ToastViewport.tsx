import type React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ToastMessage = {
  id: number;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
};

type ToastViewportProps = {
  items: ToastMessage[];
  onDismiss?: (id: number) => void;
};

const toneStyles: Record<ToastMessage['type'], string> = {
  success: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10',
  error: 'border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10',
  info: 'border-primary/20 bg-primary/5',
};

const toneIcons: Record<ToastMessage['type'], React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export const ToastViewport: React.FC<ToastViewportProps> = ({ items, onDismiss }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[70] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-3 md:right-6 md:top-24">
      {items.map((item) => {
        const Icon = toneIcons[item.type];

        return (
          <div
            key={item.id}
            className={cn('pointer-events-auto animate-slide-in-right rounded-2xl border px-4 py-3 shadow-xl backdrop-blur', toneStyles[item.type])}
            role="status"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-background/80 p-1.5 shadow-sm">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                {item.title ? <p className="text-sm font-semibold text-foreground">{item.title}</p> : null}
                <p className="text-sm leading-6 text-foreground/90">{item.message}</p>
              </div>
              {onDismiss ? (
                <button
                  type="button"
                  onClick={() => onDismiss(item.id)}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
                  aria-label="关闭通知"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};
