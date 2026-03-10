import type React from 'react';
import { cn } from '../../utils/cn';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  icon,
  actions,
  className = '',
}) => {
  return (
    <section className={cn('rounded-2xl border border-border bg-card px-5 py-4 shadow-sm md:px-6 md:py-5', className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-2.5">
          {eyebrow ? (
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {icon ? <span className="text-primary">{icon}</span> : null}
              <span>{eyebrow}</span>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
            {description ? <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
        </div>

        {actions ? <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">{actions}</div> : null}
      </div>
    </section>
  );
};
