import { useCallback, useMemo, useState } from 'react';
import type React from 'react';
import { Database, Info, Plus, Power, Search, Trash2, Wrench } from 'lucide-react';
import type { ConfigValidationIssue, SystemConfigItem } from '../../types/systemConfig';
import { Select } from '../common';
import { SettingsField } from './SettingsField';
import { getFieldTitleZh } from '../../utils/systemConfigI18n';
import { getFieldDescriptionZh } from '../../utils/systemConfigI18n';

type DataSourceDef = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  keys: string[];
  presenceKeys: string[];
  commentManagedKeys: string[];
  defaults?: Record<string, string>;
  alwaysVisible?: boolean;
};

type DataSourceManagerProps = {
  items: SystemConfigItem[];
  priorityItems: SystemConfigItem[];
  configItems: SystemConfigItem[];
  issueByKey: Record<string, ConfigValidationIssue[]>;
  onChange: (key: string, value: string) => void;
  onToggleEnabled: (key: string, enabled: boolean) => void;
  disabled?: boolean;
};

const DATA_SOURCE_DEFS: DataSourceDef[] = [
  {
    id: 'tushare',
    title: 'Tushare',
    description: '填写 Token 后启用。',
    icon: Database,
    keys: ['TUSHARE_TOKEN'],
    presenceKeys: ['TUSHARE_TOKEN'],
    commentManagedKeys: ['TUSHARE_TOKEN'],
  },
  {
    id: 'tavily',
    title: 'Tavily',
    description: '用于新闻搜索。',
    icon: Search,
    keys: ['TAVILY_API_KEYS'],
    presenceKeys: ['TAVILY_API_KEYS'],
    commentManagedKeys: ['TAVILY_API_KEYS'],
  },
  {
    id: 'serpapi',
    title: 'SerpAPI',
    description: '用于搜索新闻与网页。',
    icon: Search,
    keys: ['SERPAPI_API_KEYS'],
    presenceKeys: ['SERPAPI_API_KEYS'],
    commentManagedKeys: ['SERPAPI_API_KEYS'],
  },
  {
    id: 'brave',
    title: 'Brave Search',
    description: '用于搜索新闻与网页。',
    icon: Search,
    keys: ['BRAVE_API_KEYS'],
    presenceKeys: ['BRAVE_API_KEYS'],
    commentManagedKeys: ['BRAVE_API_KEYS'],
  },
  {
    id: 'bocha',
    title: 'Bocha',
    description: '用于搜索新闻与网页。',
    icon: Search,
    keys: ['BOCHA_API_KEYS'],
    presenceKeys: ['BOCHA_API_KEYS'],
    commentManagedKeys: ['BOCHA_API_KEYS'],
  },
  {
    id: 'aksharePatch',
    title: 'AkShare / 东财兼容',
    description: '东财相关接口不稳定时可开启兼容补丁。',
    icon: Wrench,
    keys: ['ENABLE_EASTMONEY_PATCH'],
    presenceKeys: [],
    commentManagedKeys: [],
    alwaysVisible: true,
  },
  {
    id: 'pytdx',
    title: '通达信',
    description: '配置通达信服务器地址与端口。',
    icon: Search,
    keys: ['PYTDX_HOST', 'PYTDX_PORT', 'PYTDX_SERVERS'],
    presenceKeys: ['PYTDX_HOST', 'PYTDX_PORT', 'PYTDX_SERVERS'],
    commentManagedKeys: [],
  },
];

const PRIORITY_ORDER = [
  'TUSHARE_PRIORITY',
  'AKSHARE_PRIORITY',
  'EFINANCE_PRIORITY',
  'PYTDX_PRIORITY',
  'BAOSTOCK_PRIORITY',
  'YFINANCE_PRIORITY',
  'REALTIME_SOURCE_PRIORITY',
];

const CONFIG_ORDER = [
  'ENABLE_REALTIME_TECHNICAL_INDICATORS',
  'ENABLE_REALTIME_QUOTE',
  'ENABLE_CHIP_DISTRIBUTION',
  'MAX_WORKERS',
  'ANALYSIS_DELAY',
  'NEWS_MAX_AGE_DAYS',
  'BIAS_THRESHOLD',
];

function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

function buildItemsByKey(items: SystemConfigItem[]): Record<string, SystemConfigItem> {
  return Object.fromEntries(items.map((item) => [item.key, item])) as Record<string, SystemConfigItem>;
}

function isSourceVisible(definition: DataSourceDef, itemsByKey: Record<string, SystemConfigItem>): boolean {
  if (definition.alwaysVisible) {
    return true;
  }
  return definition.presenceKeys.some((key) => hasValue(itemsByKey[key]?.value));
}

function isSourceEnabled(definition: DataSourceDef, itemsByKey: Record<string, SystemConfigItem>): boolean {
  if (definition.commentManagedKeys.length === 0) {
    return definition.keys.some((key) => (itemsByKey[key]?.value || '').trim().toLowerCase() === 'true');
  }

  return definition.presenceKeys.some((key) => {
    const item = itemsByKey[key];
    if (!item || item.isCommented) {
      return false;
    }
    return hasValue(item.value) || !item.linePresent;
  });
}

function findItemsByKeys(itemsByKey: Record<string, SystemConfigItem>, keys: string[]): SystemConfigItem[] {
  return keys.map((key) => itemsByKey[key]).filter((item): item is SystemConfigItem => Boolean(item));
}

export const DataSourceManager: React.FC<DataSourceManagerProps> = ({
  items,
  priorityItems,
  configItems,
  issueByKey,
  onChange,
  onToggleEnabled,
  disabled = false,
}) => {
  const allItems = useMemo(() => [...items, ...priorityItems, ...configItems], [items, priorityItems, configItems]);
  const itemsByKey = useMemo(() => buildItemsByKey(allItems), [allItems]);
  const configuredIds = useMemo(
    () => DATA_SOURCE_DEFS.filter((definition) => isSourceVisible(definition, itemsByKey)).map((definition) => definition.id),
    [itemsByKey],
  );

  const [manualVisibleIds, setManualVisibleIds] = useState<string[]>([]);
  const [backupValues, setBackupValues] = useState<Record<string, Record<string, string>>>({});
  const [selectedAddId, setSelectedAddId] = useState<string>('tushare');
  const [showPriorityPanel, setShowPriorityPanel] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  const visibleIds = useMemo(() => Array.from(new Set([...configuredIds, ...manualVisibleIds])), [configuredIds, manualVisibleIds]);

  const visibleDefs = useMemo(
    () => DATA_SOURCE_DEFS.filter((definition) => visibleIds.includes(definition.id)),
    [visibleIds],
  );

  const hiddenDefs = useMemo(
    () => DATA_SOURCE_DEFS.filter((definition) => !definition.alwaysVisible && !visibleIds.includes(definition.id)),
    [visibleIds],
  );

  const priorityFields = useMemo(
    () => PRIORITY_ORDER.map((key) => itemsByKey[key]).filter((item): item is SystemConfigItem => Boolean(item)),
    [itemsByKey],
  );

  const configFields = useMemo(
    () => CONFIG_ORDER.map((key) => itemsByKey[key]).filter((item): item is SystemConfigItem => Boolean(item)),
    [itemsByKey],
  );

  const renderPriorityField = (item: SystemConfigItem) => {
    const schema = item.schema;
    const inputType = schema?.uiControl === 'number' || schema?.dataType === 'integer' || schema?.dataType === 'number'
      ? 'number'
      : 'text';
    const label = getFieldTitleZh(item.key, item.key);
    const issues = issueByKey[item.key] || [];

    return (
      <div key={item.key} className="grid gap-2 rounded-2xl border border-border bg-background/60 px-4 py-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.key}</p>
        </div>
        <div className="space-y-2">
          <input
            type={inputType}
            className="input-terminal w-full"
            value={item.value}
            disabled={disabled || !schema?.isEditable}
            onChange={(event) => onChange(item.key, event.target.value)}
          />
          {issues.length ? (
            <p className="text-xs text-destructive">{issues[0]?.message}</p>
          ) : null}
        </div>
      </div>
    );
  };

  const renderCompactField = (item: SystemConfigItem) => {
    const schema = item.schema;
    const label = getFieldTitleZh(item.key, item.key);
    const helpText = getFieldDescriptionZh(item.key);
    const issues = issueByKey[item.key] || [];
    const controlType = schema?.uiControl ?? 'text';

    return (
      <div key={item.key} className="grid gap-2 rounded-2xl border border-border bg-background/60 px-4 py-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex items-start gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.key}</p>
          </div>
          {helpText ? (
            <span className="relative mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground group">
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
          {issues.length ? (
            <p className="text-xs text-destructive">{issues[0]?.message}</p>
          ) : null}
        </div>
      </div>
    );
  };

  const addSource = useCallback(() => {
    if (!selectedAddId || visibleIds.includes(selectedAddId)) {
      return;
    }

    const definition = DATA_SOURCE_DEFS.find((item) => item.id === selectedAddId);
    if (!definition) {
      return;
    }

    setManualVisibleIds((previous) => [...previous, selectedAddId]);
    definition.commentManagedKeys.forEach((key) => onToggleEnabled(key, true));
    Object.entries(definition.defaults || {}).forEach(([key, value]) => {
      if (!hasValue(itemsByKey[key]?.value)) {
        onChange(key, value);
      }
    });
  }, [itemsByKey, onChange, onToggleEnabled, selectedAddId, visibleIds]);

  const toggleSource = useCallback(
    (definition: DataSourceDef) => {
      if (definition.commentManagedKeys.length === 0) {
        return;
      }

      const isEnabled = isSourceEnabled(definition, itemsByKey);
      if (isEnabled) {
        const snapshot = Object.fromEntries(definition.keys.map((key) => [key, itemsByKey[key]?.value ?? '']));
        setBackupValues((previous) => ({ ...previous, [definition.id]: snapshot }));
        definition.commentManagedKeys.forEach((key) => onToggleEnabled(key, false));
        return;
      }

      const snapshot = backupValues[definition.id] || definition.defaults || {};
      definition.commentManagedKeys.forEach((key) => {
        if (!hasValue(itemsByKey[key]?.value) && snapshot[key] !== undefined) {
          onChange(key, snapshot[key]);
        }
        onToggleEnabled(key, true);
      });
    },
    [backupValues, itemsByKey, onChange, onToggleEnabled],
  );

  const removeSource = useCallback(
    (definition: DataSourceDef) => {
      definition.keys.forEach((key) => {
        onChange(key, '');
        if (definition.commentManagedKeys.includes(key)) {
          onToggleEnabled(key, false);
        }
      });
      setManualVisibleIds((previous) => previous.filter((id) => id !== definition.id));
    },
    [onChange, onToggleEnabled],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">数据源</h3>
          <p className="mt-1 text-sm text-muted-foreground">添加后填写凭证；注释代表停用。</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setShowConfigPanel(true)}
            className="btn-secondary shrink-0 whitespace-nowrap"
            disabled={disabled}
          >
            数据源配置
          </button>
          <button
            type="button"
            onClick={() => setShowPriorityPanel(true)}
            className="btn-secondary shrink-0 whitespace-nowrap"
            disabled={disabled}
          >
            数据源顺序设置
          </button>
          <Select
            value={selectedAddId}
            onChange={setSelectedAddId}
            options={hiddenDefs.map((definition) => ({ value: definition.id, label: definition.title }))}
            className="min-w-[220px]"
            disabled={disabled || hiddenDefs.length === 0}
            placeholder={hiddenDefs.length === 0 ? '没有可添加数据源' : '选择数据源'}
          />
          <button
            type="button"
            onClick={addSource}
            disabled={disabled || hiddenDefs.length === 0}
            className="btn-primary shrink-0 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            添加数据源
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {visibleDefs.map((definition) => {
          const Icon = definition.icon;
          const sourceItems = findItemsByKeys(itemsByKey, definition.keys);
          const isEnabled = isSourceEnabled(definition, itemsByKey);
          const canToggle = definition.commentManagedKeys.length > 0;
          const canRemove = !definition.alwaysVisible;

          return (
            <section key={definition.id} className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className={[
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                    isEnabled ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground',
                  ].join(' ')}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{definition.title}</h4>
                      <span
                        className={[
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          isEnabled ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
                        ].join(' ')}
                      >
                        {isEnabled ? '已启用' : '已停用'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{definition.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canToggle ? (
                    <button
                      type="button"
                      onClick={() => toggleSource(definition)}
                      disabled={disabled}
                      className="btn-secondary shrink-0 whitespace-nowrap"
                    >
                      <Power className="h-4 w-4" />
                      {isEnabled ? '停用' : '启用'}
                    </button>
                  ) : null}
                  {canRemove ? (
                    <button
                      type="button"
                      onClick={() => removeSource(definition)}
                      disabled={disabled}
                      className="btn-secondary shrink-0 whitespace-nowrap text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  ) : null}
                </div>
              </div>

              <div className={['mt-4 space-y-3', canToggle && !isEnabled ? 'pointer-events-none opacity-60' : ''].join(' ')}>
                {sourceItems.map((item) => (
                  <SettingsField
                    key={item.key}
                    item={item}
                    value={item.value}
                    disabled={disabled || (canToggle && !isEnabled)}
                    onChange={onChange}
                    issues={issueByKey[item.key] || []}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {showPriorityPanel ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowPriorityPanel(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-border bg-card p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">数据源优先级</h3>
                <p className="mt-2 text-sm text-muted-foreground">数字越小优先级越高；实时数据源用逗号分隔。</p>
              </div>
              <button
                type="button"
                className="btn-secondary !h-9 !px-3"
                onClick={() => setShowPriorityPanel(false)}
              >
                关闭
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {priorityFields.length ? (
                priorityFields.map((item) => renderPriorityField(item))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background/50 px-4 py-6 text-center text-sm text-muted-foreground">
                  暂无优先级配置项。
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showConfigPanel ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowConfigPanel(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-border bg-card p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">数据源配置</h3>
              </div>
              <button
                type="button"
                className="btn-secondary !h-9 !px-3"
                onClick={() => setShowConfigPanel(false)}
              >
                关闭
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {configFields.length ? (
                configFields.map((item) => renderCompactField(item))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background/50 px-4 py-6 text-center text-sm text-muted-foreground">
                  暂无数据源配置项。
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
