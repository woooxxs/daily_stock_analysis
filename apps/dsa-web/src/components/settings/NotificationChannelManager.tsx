import { useCallback, useMemo, useState } from 'react';
import type React from 'react';
import {
  BellRing,
  Bot,
  Info,
  Mail,
  MessageCircleMore,
  Plus,
  Power,
  Radio,
  ShieldCheck,
  Trash2,
  Webhook,
} from 'lucide-react';
import type { ConfigValidationIssue, SystemConfigItem } from '../../types/systemConfig';
import { Select } from '../common';
import { SettingsField } from './SettingsField';
import { getFieldTitleZh, getFieldDescriptionZh } from '../../utils/systemConfigI18n';

type NotificationChannelDef = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  keys: string[];
  presenceKeys: string[];
  defaults?: Record<string, string>;
};

type NotificationChannelManagerProps = {
  items: SystemConfigItem[];
  configItems: SystemConfigItem[];
  issueByKey: Record<string, ConfigValidationIssue[]>;
  onChange: (key: string, value: string) => void;
  onToggleEnabled: (key: string, enabled: boolean) => void;
  disabled?: boolean;
};

const CHANNEL_DEFS: NotificationChannelDef[] = [
  {
    id: 'wechat',
    title: '企业微信',
    description: '填写 Webhook 后即可启用。',
    icon: MessageCircleMore,
    keys: ['WECHAT_WEBHOOK_URL'],
    presenceKeys: ['WECHAT_WEBHOOK_URL'],
  },
  {
    id: 'feishu',
    title: '飞书',
    description: '填写 Webhook 后即可启用。',
    icon: MessageCircleMore,
    keys: ['FEISHU_WEBHOOK_URL'],
    presenceKeys: ['FEISHU_WEBHOOK_URL'],
  },
  {
    id: 'telegram',
    title: 'Telegram',
    description: '通常需要 Bot Token 和 Chat ID。',
    icon: Radio,
    keys: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'TELEGRAM_MESSAGE_THREAD_ID'],
    presenceKeys: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
  },
  {
    id: 'email',
    title: '邮件',
    description: '适合发到个人邮箱归档。',
    icon: Mail,
    keys: ['EMAIL_SENDER', 'EMAIL_PASSWORD', 'EMAIL_RECEIVERS'],
    presenceKeys: ['EMAIL_SENDER', 'EMAIL_PASSWORD'],
  },
  {
    id: 'pushplus',
    title: 'PushPlus',
    description: '填写 Token 即可。',
    icon: BellRing,
    keys: ['PUSHPLUS_TOKEN', 'PUSHPLUS_TOPIC'],
    presenceKeys: ['PUSHPLUS_TOKEN'],
  },
  {
    id: 'pushover',
    title: 'Pushover',
    description: '需要 User Key 和 App Token。',
    icon: BellRing,
    keys: ['PUSHOVER_USER_KEY', 'PUSHOVER_API_TOKEN'],
    presenceKeys: ['PUSHOVER_USER_KEY', 'PUSHOVER_API_TOKEN'],
  },
  {
    id: 'webhook',
    title: '自定义 Webhook',
    description: '适用于钉钉、Slack、Bark 等。',
    icon: Webhook,
    keys: ['CUSTOM_WEBHOOK_URLS', 'CUSTOM_WEBHOOK_BEARER_TOKEN', 'WEBHOOK_VERIFY_SSL'],
    presenceKeys: ['CUSTOM_WEBHOOK_URLS'],
    defaults: { WEBHOOK_VERIFY_SSL: 'true' },
  },
  {
    id: 'discord',
    title: 'Discord',
    description: '推荐优先使用 Webhook。',
    icon: Bot,
    keys: ['DISCORD_WEBHOOK_URL', 'DISCORD_BOT_TOKEN', 'DISCORD_MAIN_CHANNEL_ID'],
    presenceKeys: ['DISCORD_WEBHOOK_URL', 'DISCORD_BOT_TOKEN'],
  },
  {
    id: 'serverchan',
    title: 'Server酱 3',
    description: '填写 SendKey 即可。',
    icon: ShieldCheck,
    keys: ['SERVERCHAN3_SENDKEY'],
    presenceKeys: ['SERVERCHAN3_SENDKEY'],
  },
  {
    id: 'dingtalkApp',
    title: '钉钉应用',
    description: '填写 App Key / Secret。',
    icon: ShieldCheck,
    keys: ['DINGTALK_APP_KEY', 'DINGTALK_APP_SECRET', 'DINGTALK_STREAM_ENABLED'],
    presenceKeys: ['DINGTALK_APP_KEY', 'DINGTALK_APP_SECRET'],
    defaults: { DINGTALK_STREAM_ENABLED: 'false' },
  },
];

const CONFIG_ORDER = [
  'REPORT_SUMMARY_ONLY',
  'SINGLE_STOCK_NOTIFY',
  'REPORT_TYPE',
  'REPORT_TEMPLATES_DIR',
  'REPORT_RENDERER_ENABLED',
  'REPORT_INTEGRITY_ENABLED',
  'REPORT_INTEGRITY_RETRY',
  'REPORT_HISTORY_COMPARE_N',
  'MERGE_EMAIL_NOTIFICATION',
];

function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

function buildItemsByKey(items: SystemConfigItem[]): Record<string, SystemConfigItem> {
  return Object.fromEntries(items.map((item) => [item.key, item])) as Record<string, SystemConfigItem>;
}

function isChannelVisible(definition: NotificationChannelDef, itemsByKey: Record<string, SystemConfigItem>): boolean {
  return definition.presenceKeys.some((key) => hasValue(itemsByKey[key]?.value));
}

function isChannelEnabled(definition: NotificationChannelDef, itemsByKey: Record<string, SystemConfigItem>): boolean {
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

export const NotificationChannelManager: React.FC<NotificationChannelManagerProps> = ({
  items,
  configItems,
  issueByKey,
  onChange,
  onToggleEnabled,
  disabled = false,
}) => {
  const allItems = useMemo(() => [...items, ...configItems], [items, configItems]);
  const itemsByKey = useMemo(() => buildItemsByKey(allItems), [allItems]);
  const configuredIds = useMemo(
    () => CHANNEL_DEFS.filter((definition) => isChannelVisible(definition, itemsByKey)).map((definition) => definition.id),
    [itemsByKey],
  );

  const [manualVisibleIds, setManualVisibleIds] = useState<string[]>([]);
  const [backupValues, setBackupValues] = useState<Record<string, Record<string, string>>>({});
  const [selectedAddId, setSelectedAddId] = useState<string>(CHANNEL_DEFS[0]?.id ?? 'wechat');
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  const visibleIds = useMemo(() => Array.from(new Set([...configuredIds, ...manualVisibleIds])), [configuredIds, manualVisibleIds]);

  const visibleDefs = useMemo(
    () => CHANNEL_DEFS.filter((definition) => visibleIds.includes(definition.id)),
    [visibleIds],
  );

  const hiddenDefs = useMemo(
    () => CHANNEL_DEFS.filter((definition) => !visibleIds.includes(definition.id)),
    [visibleIds],
  );

  const configFields = useMemo(
    () => CONFIG_ORDER.map((key) => itemsByKey[key]).filter((item): item is SystemConfigItem => Boolean(item)),
    [itemsByKey],
  );

  const addChannel = useCallback(() => {
    if (!selectedAddId || visibleIds.includes(selectedAddId)) {
      return;
    }

    const definition = CHANNEL_DEFS.find((item) => item.id === selectedAddId);
    if (!definition) {
      return;
    }

    setManualVisibleIds((previous) => [...previous, selectedAddId]);
    definition.keys.forEach((key) => onToggleEnabled(key, true));
    Object.entries(definition.defaults || {}).forEach(([key, value]) => {
      if (!hasValue(itemsByKey[key]?.value)) {
        onChange(key, value);
      }
    });
  }, [itemsByKey, onChange, onToggleEnabled, selectedAddId, visibleIds]);

  const toggleChannel = useCallback(
    (definition: NotificationChannelDef) => {
      const isEnabled = isChannelEnabled(definition, itemsByKey);

      if (isEnabled) {
        const snapshot = Object.fromEntries(definition.keys.map((key) => [key, itemsByKey[key]?.value ?? '']));
        setBackupValues((previous) => ({ ...previous, [definition.id]: snapshot }));
        definition.keys.forEach((key) => onToggleEnabled(key, false));
        return;
      }

      const snapshot = backupValues[definition.id] || definition.defaults || {};
      definition.keys.forEach((key) => {
        if (!hasValue(itemsByKey[key]?.value) && snapshot[key] !== undefined) {
          onChange(key, snapshot[key]);
        }
        onToggleEnabled(key, true);
      });
    },
    [backupValues, itemsByKey, onChange, onToggleEnabled],
  );

  const removeChannel = useCallback(
    (definition: NotificationChannelDef) => {
      definition.keys.forEach((key) => {
        onChange(key, '');
        onToggleEnabled(key, false);
      });
      setManualVisibleIds((previous) => previous.filter((id) => id !== definition.id));
      setBackupValues((previous) => {
        const next = { ...previous };
        delete next[definition.id];
        return next;
      });
    },
    [onChange, onToggleEnabled],
  );

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">通知渠道</h3>
          <p className="mt-1 text-sm text-muted-foreground">添加后填写参数；停用时保留原值。</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setShowConfigPanel(true)}
            disabled={disabled}
            className="btn-secondary shrink-0 whitespace-nowrap"
          >
            通知配置
          </button>
          <Select
            value={selectedAddId}
            onChange={setSelectedAddId}
            options={hiddenDefs.map((definition) => ({ value: definition.id, label: definition.title }))}
            className="min-w-[220px]"
            disabled={disabled || hiddenDefs.length === 0}
            placeholder={hiddenDefs.length === 0 ? '没有可添加渠道' : '选择通知方式'}
          />
          <button
            type="button"
            onClick={addChannel}
            disabled={disabled || hiddenDefs.length === 0}
            className="btn-primary shrink-0 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            添加配置
          </button>
        </div>
      </div>

      {visibleDefs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background/50 px-4 py-8 text-center text-sm text-muted-foreground">
          还没有添加通知渠道。
        </div>
      ) : (
        <div className="space-y-4">
          {visibleDefs.map((definition) => {
            const Icon = definition.icon;
            const channelItems = findItemsByKeys(itemsByKey, definition.keys);
            const isEnabled = isChannelEnabled(definition, itemsByKey);

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
                    <button
                      type="button"
                      onClick={() => toggleChannel(definition)}
                      disabled={disabled}
                      className="btn-secondary shrink-0 whitespace-nowrap"
                    >
                      <Power className="h-4 w-4" />
                      {isEnabled ? '停用' : '启用'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeChannel(definition)}
                      disabled={disabled}
                      className="btn-secondary shrink-0 whitespace-nowrap text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                </div>

                <div className={['mt-4 space-y-3', isEnabled ? '' : 'pointer-events-none opacity-60'].join(' ')}>
                  {channelItems.map((item) => (
                    <SettingsField
                      key={item.key}
                      item={item}
                      value={item.value}
                      disabled={disabled || !isEnabled}
                      onChange={onChange}
                      issues={issueByKey[item.key] || []}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

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
                <h3 className="text-lg font-semibold text-foreground">通知配置</h3>
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
                  暂无通知配置项。
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
