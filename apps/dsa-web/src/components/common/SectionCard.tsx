import type React from 'react';
import { cn } from '../../utils/cn';

type SectionCardProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export const SectionCard: React.FC<SectionCardProps> = ({
  children,
  title,
  description,
  eyebrow,
  actions,
  className,
  contentClassName,
}) => {
  return (
    <section className={cn('overflow-hidden rounded-2xl border border-border bg-card shadow-sm', className)}>
      {title || description || eyebrow || actions ? (
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p> : null}
            {title ? <h2 className="mt-1 text-base font-semibold text-foreground sm:text-lg">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn('px-5 py-4', contentClassName)}>{children}</div>
    </section>
  );
};
