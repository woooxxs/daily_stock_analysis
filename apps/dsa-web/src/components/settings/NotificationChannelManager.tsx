import { useCallback, useMemo, useState } from 'react';
import type React from 'react';
import {
  BellRing,
  Bot,
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
  issueByKey: Record<string, ConfigValidationIssue[]>;
  onChange: (key: string, value: string) => void;
  onToggleEnabled: (key: string, enabled: boolean) => void;
  disabled?: boolean;
  headerActions?: React.ReactNode;
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
  issueByKey,
  onChange,
  onToggleEnabled,
  disabled = false,
  headerActions,
}) => {
  const itemsByKey = useMemo(() => buildItemsByKey(items), [items]);
  const configuredIds = useMemo(
    () => CHANNEL_DEFS.filter((definition) => isChannelVisible(definition, itemsByKey)).map((definition) => definition.id),
    [itemsByKey],
  );

  const [manualVisibleIds, setManualVisibleIds] = useState<string[]>([]);
  const [backupValues, setBackupValues] = useState<Record<string, Record<string, string>>>({});
  const [selectedAddId, setSelectedAddId] = useState<string>(CHANNEL_DEFS[0]?.id ?? 'wechat');

  const visibleIds = useMemo(() => Array.from(new Set([...configuredIds, ...manualVisibleIds])), [configuredIds, manualVisibleIds]);

  const visibleDefs = useMemo(
    () => CHANNEL_DEFS.filter((definition) => visibleIds.includes(definition.id)),
    [visibleIds],
  );

  const hiddenDefs = useMemo(
    () => CHANNEL_DEFS.filter((definition) => !visibleIds.includes(definition.id)),
    [visibleIds],
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">通知渠道</h3>
          <p className="mt-1 text-sm text-muted-foreground">按需添加通知方式并填写凭证。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {headerActions}
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

                <div className={['mt-5 border-t border-border/80', isEnabled ? '' : 'pointer-events-none opacity-60'].join(' ')}>
                  <div className="divide-y divide-border/80">
                    {channelItems.map((item) => (
                      <SettingsField
                        key={item.key}
                        item={item}
                        value={item.value}
                        disabled={disabled || !isEnabled}
                        onChange={onChange}
                        issues={issueByKey[item.key] || []}
                        variant="embedded"
                      />
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
