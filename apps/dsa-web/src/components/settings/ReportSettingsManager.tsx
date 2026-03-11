import { useMemo, useState } from 'react';
import type React from 'react';
import {
  FileText,
  History,
  Info,
  LayoutTemplate,
  Send,
  ShieldCheck,
} from 'lucide-react';
import type { ConfigValidationIssue, SystemConfigItem } from '../../types/systemConfig';
import { Button, Select } from '../common';
import { getFieldDescriptionZh, getFieldTitleZh } from '../../utils/systemConfigI18n';

type ReportSettingsManagerProps = {
  items: SystemConfigItem[];
  issueByKey: Record<string, ConfigValidationIssue[]>;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
};

type ReportSummaryGroup = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  keys: string[];
};

const REPORT_GROUPS: ReportSummaryGroup[] = [
  {
    id: 'format',
    title: '输出形式',
    description: '决定推送的是完整报告还是摘要版本。',
    icon: FileText,
    keys: ['REPORT_TYPE', 'REPORT_SUMMARY_ONLY'],
  },
  {
    id: 'delivery',
    title: '推送节奏',
    description: '控制单股推送时机和邮件合并策略。',
    icon: Send,
    keys: ['SINGLE_STOCK_NOTIFY', 'MERGE_EMAIL_NOTIFICATION'],
  },
  {
    id: 'renderer',
    title: '模板渲染',
    description: '控制 Jinja2 报告模板目录和渲染开关。',
    icon: LayoutTemplate,
    keys: ['REPORT_TEMPLATES_DIR', 'REPORT_RENDERER_ENABLED'],
  },
  {
    id: 'integrity',
    title: '完整性校验',
    description: '缺字段时是否重试或自动补齐占位。',
    icon: ShieldCheck,
    keys: ['REPORT_INTEGRITY_ENABLED', 'REPORT_INTEGRITY_RETRY'],
  },
  {
    id: 'history',
    title: '历史对比',
    description: '控制是否附带最近几次分析信号对比。',
    icon: History,
    keys: ['REPORT_HISTORY_COMPARE_N'],
  },
];

function buildItemsByKey(items: SystemConfigItem[]): Record<string, SystemConfigItem> {
  return Object.fromEntries(items.map((item) => [item.key, item])) as Record<string, SystemConfigItem>;
}

function formatBoolean(value: string): string {
  return value.trim().toLowerCase() === 'true' ? '已启用' : '未启用';
}

function summarizeValue(item: SystemConfigItem): string {
  switch (item.key) {
    case 'REPORT_TYPE':
      return item.value || 'simple';
    case 'REPORT_SUMMARY_ONLY':
    case 'SINGLE_STOCK_NOTIFY':
    case 'REPORT_RENDERER_ENABLED':
    case 'REPORT_INTEGRITY_ENABLED':
    case 'MERGE_EMAIL_NOTIFICATION':
      return formatBoolean(item.value || 'false');
    case 'REPORT_TEMPLATES_DIR':
      return item.value || 'templates';
    case 'REPORT_INTEGRITY_RETRY':
      return item.value || '1';
    case 'REPORT_HISTORY_COMPARE_N':
      return item.value === '0' || !item.value ? '已关闭' : `最近 ${item.value} 次`;
    default:
      return item.value || '未设置';
  }
}

function renderCompactField(
  item: SystemConfigItem,
  issues: ConfigValidationIssue[],
  disabled: boolean,
  onChange: (key: string, value: string) => void,
) {
  const schema = item.schema;
  const label = getFieldTitleZh(item.key, item.key);
  const helpText = getFieldDescriptionZh(item.key);
  const controlType = schema?.uiControl ?? 'text';

  return (
    <div key={item.key} className="grid gap-2 rounded-2xl border border-border bg-background/60 px-4 py-3 md:grid-cols-[220px_minmax(0,1fr)]">
      <div className="flex items-start gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.key}</p>
        </div>
        {helpText ? (
          <span className="group relative mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground">
            <Info size={12} />
            <span className="pointer-events-none absolute left-1/2 top-6 z-20 w-64 -translate-x-1/2 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
              {helpText}
            </span>
          </span>
        ) : null}
      </div>
      <div className="space-y-2">
        {controlType === 'switch' ? (
          <div className="flex justify-end">
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-input bg-background px-3 py-2 shadow-sm">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={item.value.trim().toLowerCase() === 'true'}
                disabled={disabled || !schema?.isEditable}
                onChange={(event) => onChange(item.key, event.target.checked ? 'true' : 'false')}
              />
              <div className="h-6 w-11 rounded-full bg-input transition-all after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-disabled:opacity-50" />
              <span className="text-sm text-muted-foreground">{item.value.trim().toLowerCase() === 'true' ? '已启用' : '未启用'}</span>
            </label>
          </div>
        ) : controlType === 'select' && schema?.options?.length ? (
          <Select
            value={item.value}
            onChange={(value) => onChange(item.key, value)}
            options={schema.options.map((option) => ({ value: option, label: option }))}
            disabled={disabled || !schema.isEditable}
            className="w-full"
          />
        ) : (
          <input
            type={schema?.dataType === 'integer' || schema?.dataType === 'number' ? 'number' : 'text'}
            className="input-terminal w-full"
            value={item.value}
            disabled={disabled || !schema?.isEditable}
            onChange={(event) => onChange(item.key, event.target.value)}
          />
        )}
        {issues.length ? <p className="text-xs text-destructive">{issues[0]?.message}</p> : null}
      </div>
    </div>
  );
}

export const ReportSettingsManager: React.FC<ReportSettingsManagerProps> = ({
  items,
  issueByKey,
  onChange,
  disabled = false,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const itemsByKey = useMemo(() => buildItemsByKey(items), [items]);

  return (
    <div className="space-y-4 p-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">报告设置</h3>
          <p className="mt-1 text-sm text-muted-foreground">这里展示的是缩略信息；详细配置收进按钮里，避免和通知渠道凭证混在一起。</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(true)} disabled={disabled}>
          报告设置
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {REPORT_GROUPS.map((group) => {
          const Icon = group.icon;
          const groupItems = group.keys.map((key) => itemsByKey[key]).filter((item): item is SystemConfigItem => Boolean(item));

          return (
            <section key={group.id} className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {groupItems.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{getFieldTitleZh(item.key, item.key)}</span>
                    <span className="max-w-[60%] truncate text-right font-medium text-foreground">{summarizeValue(item)}</span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setIsDialogOpen(false)}>
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">报告设置</h3>
                <p className="mt-2 text-sm text-muted-foreground">模仿数据源配置面板，展示缩略字段和悬浮说明，方便按需深入配置。</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>
                关闭
              </Button>
            </div>

            <div className="mt-5 space-y-2">
              {items.length ? (
                items.map((item) => renderCompactField(item, issueByKey[item.key] || [], disabled, onChange))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background/50 px-4 py-6 text-center text-sm text-muted-foreground">
                  暂无报告配置项。
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
