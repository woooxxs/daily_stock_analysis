import type React from 'react';
import { getSentimentLabel } from '../../types/analysis';
import { cn } from '../../utils/cn';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { wrapper: 'h-24 w-24', ring: 'h-24 w-24', text: 'text-xl', label: 'text-xs' },
  md: { wrapper: 'h-32 w-32', ring: 'h-32 w-32', text: 'text-3xl', label: 'text-sm' },
  lg: { wrapper: 'h-40 w-40', ring: 'h-40 w-40', text: 'text-4xl', label: 'text-sm' },
};

const getColor = (score: number): string => {
  if (score <= 20) return '#ef4444';
  if (score <= 40) return '#f97316';
  if (score <= 60) return '#eab308';
  if (score <= 80) return '#22c55e';
  return '#10b981';
};

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, size = 'md', showLabel = true, className = '' }) => {
  const label = getSentimentLabel(score);
  const color = getColor(score);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (Math.min(Math.max(score, 0), 100) / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {showLabel ? <span className="label-uppercase mb-3">市场情绪</span> : null}
      <div className={cn('relative', sizeConfig[size].wrapper)}>
        <svg viewBox="0 0 120 120" className={cn(sizeConfig[size].ring, '-rotate-90')}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-semibold tracking-tight text-foreground', sizeConfig[size].text)}>{score}</span>
          <span className={cn('mt-1 text-muted-foreground', sizeConfig[size].label)}>{label}</span>
        </div>
      </div>
    </div>
  );
};
