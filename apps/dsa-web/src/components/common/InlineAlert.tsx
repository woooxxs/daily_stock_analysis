import type React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

type InlineAlertProps = {
  title?: string;
  message: React.ReactNode;
  tone?: 'success' | 'error' | 'info' | 'warning';
  action?: React.ReactNode;
  className?: string;
};

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
};

const toneMap = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
  error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300',
  info: 'border-primary/20 bg-primary/5 text-primary',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
};

export const InlineAlert: React.FC<InlineAlertProps> = ({ title, message, tone = 'info', action, className }) => {
  const Icon = iconMap[tone];

  return (
    <div className={cn('rounded-2xl border px-4 py-3', toneMap[tone], className)}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          {title ? <p className="text-sm font-semibold">{title}</p> : null}
          <div className="text-sm leading-6">{message}</div>
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>
    </div>
  );
};
