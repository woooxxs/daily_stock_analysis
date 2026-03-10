import type React from 'react';
import { cn } from '../../utils/cn';

type AppPageProps = {
  children: React.ReactNode;
  className?: string;
  width?: 'default' | 'wide' | 'full';
};

const widthClassMap: Record<NonNullable<AppPageProps['width']>, string> = {
  default: 'max-w-7xl',
  wide: 'max-w-[1600px]',
  full: 'max-w-none',
};

export const AppPage: React.FC<AppPageProps> = ({ children, className, width = 'default' }) => {
  return (
    <div className={cn('mx-auto w-full px-4 pb-8 pt-4 md:px-6', widthClassMap[width], className)}>
      {children}
    </div>
  );
};
