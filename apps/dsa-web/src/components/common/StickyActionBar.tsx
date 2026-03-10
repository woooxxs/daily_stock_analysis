import type React from 'react';
import { cn } from '../../utils/cn';

type StickyActionBarProps = {
  children: React.ReactNode;
  className?: string;
};

export const StickyActionBar: React.FC<StickyActionBarProps> = ({ children, className }) => {
  return (
    <div className={cn('sticky bottom-4 z-20 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur md:p-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">{children}</div>
    </div>
  );
};
