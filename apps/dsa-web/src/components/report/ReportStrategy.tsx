import type React from 'react';
import type { ReportStrategy as ReportStrategyType } from '../../types/analysis';
import { Card } from '../common';

interface ReportStrategyProps {
  strategy?: ReportStrategyType;
}

interface StrategyItemProps {
  label: string;
  value?: string;
  colorClass: string;
}

const StrategyItem: React.FC<StrategyItemProps> = ({ label, value, colorClass }) => (
  <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
    <span className="text-xs text-muted-foreground">{label}</span>
    <div className={`mt-2 text-lg font-semibold font-mono ${value ? colorClass : 'text-muted-foreground'}`}>{value || '—'}</div>
  </div>
);

export const ReportStrategy: React.FC<ReportStrategyProps> = ({ strategy }) => {
  if (!strategy) {
    return null;
  }

  const strategyItems = [
    { label: '理想买入', value: strategy.idealBuy, colorClass: 'text-emerald-500' },
    { label: '二次买入', value: strategy.secondaryBuy, colorClass: 'text-primary' },
    { label: '止损价位', value: strategy.stopLoss, colorClass: 'text-red-500' },
    { label: '止盈目标', value: strategy.takeProfit, colorClass: 'text-amber-500' },
  ];

  return (
    <Card variant="bordered" padding="lg">
      <div className="mb-4 flex items-baseline gap-2">
        <span className="label-uppercase">Strategy Points</span>
        <h3 className="text-base font-semibold text-foreground">狙击点位</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {strategyItems.map((item) => (
          <StrategyItem key={item.label} {...item} />
        ))}
      </div>
    </Card>
  );
};
