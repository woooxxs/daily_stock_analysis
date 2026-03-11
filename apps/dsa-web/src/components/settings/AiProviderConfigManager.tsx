import { useCallback, useEffect, useMemo, useState } from 'react';
import type React from 'react';
import {
  Bot,
  BrainCircuit,
  Cable,
  FileJson,
  KeyRound,
  Layers3,
  Orbit,
  Power,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { ConfigValidationIssue, SystemConfigItem } from '../../types/systemConfig';
import { getFieldDescriptionZh, getFieldTitleZh } from '../../utils/systemConfigI18n';
import { CompactConfigField } from './CompactConfigField';
import {
  AI_BRAND_DEFINITIONS,
  buildItemsByKey,
  collectVisibleAiBrandIds,
  getBrandState,
  getChannelKeys,
  hasValue,
  upsertChannelIdentifier,
  type AiBrandDefinition,
  type AiBrandId,
  type AiBrandSection,
} from './modelConfigShared';

type AiProviderConfigManagerProps = {
  items: SystemConfigItem[];
  issueByKey: Record<string, ConfigValidationIssue[]>;
  onChange: (key: string, value: string) => void;
  onToggleEnabled: (key: string, enabled: boolean) => void;
  manualVisibleBrandIds: AiBrandId[];
  onSetManualVisible: (brandId: AiBrandId, visible: boolean) => void;
  disabled?: boolean;
};

const BRAND_ICONS: Record<AiBrandId, React.ComponentType<{ className?: string; size?: number }>> = {
  aihubmix: Layers3,
  deepseek: Bot,
  gemini: Sparkles,
  anthropic: BrainCircuit,
  openai_compatible: Cable,
  openai: Orbit,
  qwen: Cable,
  glm: BrainCircuit,
  moonshot: Sparkles,
  minimax: KeyRound,
  litellm_yaml: FileJson,
};

const STATUS_META = {
  enabled: {
    label: '已启用',
    badgeClassName: 'bg-success/10 text-success',
  },
  preserved: {
    label: '已保留',
    badgeClassName: 'bg-primary/10 text-primary',
  },
  disabled: {
    label: '已停用',
    badgeClassName: 'bg-muted text-muted-foreground',
  },
} as const;

function getSectionKeyText(definition: AiBrandDefinition, section: AiBrandSection): string {
  const hasChannelKeys = section.keys.some((key) => key.startsWith('LLM_'));
  const hasNonChannelKeys = section.keys.some((key) => !key.startsWith('LLM_'));
  if (hasChannelKeys && !hasNonChannelKeys && definition.channelIdentifier) {
    return `LLM_CHANNELS + ${section.keys.join(' / ')}`;
  }
  return section.keys.join(' / ');
}

function getFieldOverrides(item: SystemConfigItem): { title?: string; description?: string } {
  if (item.key.endsWith('_BASE_URL')) {
    return {
      title: 'Base URL',
      description: '渠道模式下的接口地址。',
    };
  }
  if (item.key.endsWith('_API_KEY')) {
    return {
      title: 'API Key',
      description: '当前品牌使用的单个 API Key。',
    };
  }
  if (item.key.endsWith('_API_KEYS')) {
    return {
      title: 'API Keys',
      description: '多个 Key 用逗号分隔；适合限流或轮询场景。',
    };
  }
  if (item.key.endsWith('_MODELS')) {
    return {
      title: '模型列表',
      description: '多个模型用逗号分隔，供主模型、备选模型和视觉模型选择。',
    };
  }
  if (item.key === 'LITELLM_CONFIG') {
    return {
      title: 'LiteLLM YAML',
      description: 'LiteLLM YAML 配置文件路径。',
    };
  }
  return {
    title: getFieldTitleZh(item.key, item.key),
    description: getFieldDescriptionZh(item.key),
  };
}

export const AiProviderConfigManager: React.FC<AiProviderConfigManagerProps> = ({
  items,
  issueByKey,
  onChange,
  onToggleEnabled,
  manualVisibleBrandIds,
  onSetManualVisible,
  disabled = false,
}) => {
  const itemsByKey = useMemo(() => buildItemsByKey(items), [items]);
  const [manualEnabledByBrand, setManualEnabledByBrand] = useState<Partial<Record<AiBrandId, boolean>>>({});

  useEffect(() => {
    setManualEnabledByBrand((previous) => {
      const next = { ...previous };
      manualVisibleBrandIds.forEach((brandId) => {
        if (next[brandId] === undefined) {
          next[brandId] = true;
        }
      });
      Object.keys(next).forEach((brandId) => {
        if (!manualVisibleBrandIds.includes(brandId as AiBrandId)) {
          delete next[brandId as AiBrandId];
        }
      });
      return next;
    });
  }, [manualVisibleBrandIds]);

  const visibleBrandIds = useMemo(
    () => collectVisibleAiBrandIds(items, manualVisibleBrandIds),
    [items, manualVisibleBrandIds],
  );

  const visibleDefinitions = useMemo(
    () => AI_BRAND_DEFINITIONS.filter((definition) => visibleBrandIds.includes(definition.id)),
    [visibleBrandIds],
  );

  const syncChannelList = useCallback(
    (definition: AiBrandDefinition, enabled: boolean) => {
      if (!definition.channelIdentifier) {
        return;
      }
      const nextChannelValue = upsertChannelIdentifier(
        itemsByKey.LLM_CHANNELS?.value || '',
        definition.channelIdentifier,
        enabled,
      );
      onChange('LLM_CHANNELS', nextChannelValue);
      onToggleEnabled('LLM_CHANNELS', hasValue(nextChannelValue));
    },
    [itemsByKey, onChange, onToggleEnabled],
  );

  const handleFieldChange = useCallback(
    (definition: AiBrandDefinition, item: SystemConfigItem, value: string) => {
      onChange(item.key, value);
      onToggleEnabled(item.key, true);

      if (!definition.channelIdentifier || !item.key.startsWith('LLM_')) {
        return;
      }

      const channelKeys = getChannelKeys(definition);
      const hasAnyChannelValue = channelKeys.some((key) => key === item.key ? hasValue(value) : hasValue(itemsByKey[key]?.value));
      syncChannelList(definition, hasAnyChannelValue);
    },
    [itemsByKey, onChange, onToggleEnabled, syncChannelList],
  );

  const toggleBrand = useCallback(
    (definition: AiBrandDefinition) => {
      const state = getBrandState(definition, itemsByKey, manualVisibleBrandIds, manualEnabledByBrand);
      const shouldEnable = state.status !== 'enabled';

      if (!state.hasSavedValue) {
        setManualEnabledByBrand((previous) => ({ ...previous, [definition.id]: shouldEnable }));
      }

      definition.sections.forEach((section) => {
        section.keys.forEach((key) => onToggleEnabled(key, shouldEnable));
      });

      if (definition.channelIdentifier) {
        const channelKeys = getChannelKeys(definition);
        const hasChannelValue = channelKeys.some((key) => hasValue(itemsByKey[key]?.value));
        syncChannelList(definition, shouldEnable && hasChannelValue);
      }
    },
    [itemsByKey, manualEnabledByBrand, manualVisibleBrandIds, onToggleEnabled, syncChannelList],
  );

  const deleteBrand = useCallback(
    (definition: AiBrandDefinition) => {
      definition.sections.forEach((section) => {
        section.keys.forEach((key) => {
          onChange(key, '');
          onToggleEnabled(key, false);
        });
      });

      if (definition.channelIdentifier) {
        syncChannelList(definition, false);
      }

      setManualEnabledByBrand((previous) => {
        const next = { ...previous };
        delete next[definition.id];
        return next;
      });
      onSetManualVisible(definition.id, false);
    },
    [onChange, onSetManualVisible, onToggleEnabled, syncChannelList],
  );

  if (!visibleDefinitions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-background/50 px-4 py-8 text-center text-sm text-muted-foreground">
        还没有已配置的模型品牌，先从右上角“添加模型”开始。
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5">
      {visibleDefinitions.map((definition) => {
        const Icon = BRAND_ICONS[definition.id];
        const state = getBrandState(definition, itemsByKey, manualVisibleBrandIds, manualEnabledByBrand);
        const statusMeta = STATUS_META[state.status];

        return (
          <section key={definition.id} className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon size={18} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{definition.title}</h4>
                    <span className={['rounded-full px-2 py-0.5 text-[11px] font-semibold', statusMeta.badgeClassName].join(' ')}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{definition.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleBrand(definition)}
                  disabled={disabled}
                  className="btn-secondary shrink-0 whitespace-nowrap"
                >
                  <Power className="h-4 w-4" />
                  {state.status === 'enabled' ? '停用' : '开启'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteBrand(definition)}
                  disabled={disabled}
                  className="btn-secondary shrink-0 whitespace-nowrap text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </button>
              </div>
            </div>

            <div className={['mt-4 space-y-4', state.status === 'enabled' ? '' : 'opacity-60'].join(' ')}>
              {definition.sections.map((section) => {
                const sectionItems = section.keys.map((key) => itemsByKey[key]).filter((item): item is SystemConfigItem => Boolean(item));
                if (!sectionItems.length) {
                  return null;
                }

                return (
                  <div key={section.id} className="space-y-3 rounded-2xl border border-border bg-background/50 p-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{section.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{getSectionKeyText(definition, section)}</p>
                    </div>

                    <div className="space-y-2">
                      {sectionItems.map((item) => {
                        const overrides = getFieldOverrides(item);
                        return (
                          <CompactConfigField
                            key={item.key}
                            item={item}
                            value={item.value}
                            disabled={disabled || state.status !== 'enabled'}
                            onChange={(_, value) => handleFieldChange(definition, item, value)}
                            issues={issueByKey[item.key] || []}
                            titleOverride={overrides.title}
                            descriptionOverride={overrides.description}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
