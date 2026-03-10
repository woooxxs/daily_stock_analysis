import React from 'react';
import type { AnalysisResult, AnalysisReport } from '../../types/analysis';
import { ReportOverview } from './ReportOverview';
import { ReportStrategy } from './ReportStrategy';
import { ReportNews } from './ReportNews';
import { ReportDetails } from './ReportDetails';

interface ReportSummaryProps {
  data: AnalysisResult | AnalysisReport;
  isHistory?: boolean;
}

export const ReportSummary: React.FC<ReportSummaryProps> = ({ data, isHistory = false }) => {
  const report: AnalysisReport = 'report' in data ? data.report : data;
  const recordId = report.meta.id;
  const { meta, summary, strategy, details } = report;
  const modelUsed = (meta.modelUsed || '').trim();
  const shouldShowModel = Boolean(
    modelUsed && !['unknown', 'error', 'none', 'null', 'n/a'].includes(modelUsed.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <ReportOverview meta={meta} summary={summary} isHistory={isHistory} />
      <ReportStrategy strategy={strategy} />
      <ReportNews recordId={recordId} />
      <ReportDetails details={details} recordId={recordId} />

      {/* 分析模型标记（Issue #528）— 报告末尾 */}
      {shouldShowModel && (
        <p className="text-xs text-gray-500 mt-3">
          分析模型: {modelUsed}
        </p>
      )}
    </div>
  );
};
