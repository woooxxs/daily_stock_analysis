import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  title,
  children,
  defaultOpen = false,
  icon,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent/60"
      >
        <div className="flex items-center gap-3">
          {icon ? <span className="text-primary">{icon}</span> : null}
          <span className="font-medium text-foreground">{title}</span>
        </div>
        <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform duration-300', isOpen && 'rotate-180')} />
      </button>

      <div className={cn('overflow-hidden transition-all duration-300 ease-in-out', isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0')}>
        <div className="border-t border-border px-4 pb-4 pt-2">{children}</div>
      </div>
    </div>
  );
};
