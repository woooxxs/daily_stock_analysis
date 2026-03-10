import type React from 'react';
import { cn } from '../../utils/cn';

type ToolbarProps = {
  children: React.ReactNode;
  className?: string;
};

export const Toolbar: React.FC<ToolbarProps> = ({ children, className }) => {
  return <div className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between', className)}>{children}</div>;
};
