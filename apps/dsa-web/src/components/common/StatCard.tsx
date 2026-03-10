import type React from 'react';
import { cn } from '../../utils/cn';

type StatCardProps = {
  title: string;
  value: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'primary' | 'success' | 'warning';
  className?: string;
};

const toneClassMap: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  tone = 'default',
  className,
}) => {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-5 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        {icon ? <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', toneClassMap[tone])}>{icon}</div> : null}
      </div>
      {description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p> : null}
    </div>
  );
};
