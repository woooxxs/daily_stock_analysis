import type { SystemConfigItem, SystemConfigUpdateItem } from '../../types/systemConfig';

export type QuickAddKind = 'model' | 'extension';

export type QuickProviderId =
  | 'aihubmix'
  | 'openai'
  | 'deepseek'
  | 'anthropic'
  | 'gemini'
  | 'dashscope'
  | 'zhipu'
  | 'moonshot'
  | 'siliconflow'
  | 'openrouter'
  | 'custom'
  | 'minimax';

export type ChannelPreset = {
  label: string;
  baseUrl: string;
  placeholder: string;
  defaultModels: string[];
  defaultIdentifier: string;
  supportsBaseUrl: boolean;
  supportsModels: boolean;
  availableKinds: QuickAddKind[];
};

export type ChannelConfig = {
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string;
  extraHeaders: string;
  enabled: boolean;
};

export type QuickModelDraft = {
  kind: QuickAddKind;
  provider: QuickProviderId;
  identifier: string;
  apiKeys: string;
  baseUrl: string;
  models: string;
  extraHeaders: string;
  setAsPrimary: boolean;
  appendFallback: boolean;
};

export const CHANNEL_PRESETS: Record<QuickProviderId, ChannelPreset> = {
  aihubmix: {
    label: 'AIHubMix',
    baseUrl: 'https://aihubmix.com/v1',
    placeholder: 'gpt-4o-mini,claude-3-5-sonnet,qwen-plus',
    defaultModels: ['gpt-4o-mini', 'claude-3-5-sonnet', 'qwen-plus'],
    defaultIdentifier: 'AIHUBMIX',
    supportsBaseUrl: true,
    supportsModels: true,
    availableKinds: ['model'],
  },
  openai: {
    label: 'OpenAI 兼容',
    baseUrl: 'https://api.openai.com/v1',
    placeholder: 'gpt-4o-mini,gpt-4.1-mini',
    defaultModels: ['gpt-4o-mini'],
    defaultIdentifier: 'OPENAI',
    supportsBaseUrl: true,
    supportsModels: true,
    availableKinds: ['model'],
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    placeholder: 'deepseek-chat,deepseek-reasoner',
    defaultModels: ['deepseek-chat', 'deepseek-reasoner'],
    defaultIdentifier: 'DEEPSEEK',
    supportsBaseUrl: true,
    supportsModels: true,
    availableKinds: ['model'],
  },
  anthropic: {
    label: 'Anthropic',
    baseUrl: '',
    placeholder: 'anthropic/claude-3-5-sonnet-20241022',
    defaultModels: ['anthropic/claude-3-5-sonnet-20241022'],
    defaultIdentifier: 'ANTHROPIC',
    supportsBaseUrl: false,
    supportsModels: true,
    availableKinds: ['model'],
  },
  gemini: {
    label: 'Gemini',
    baseUrl: '',
    placeholder: 'gemini/gemini-2.5-flash',
    defaultModels: ['gemini/gemini-2.5-flash'],
    defaultIdentifier: 'GEMINI',
    supportsBaseUrl: false,
    supportsModels: true,
    availableKinds: ['model'],
  },
  dashscope: {
    label: 'DashScope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    placeholder: 'qwen-plus,qwen-turbo',
    defaultModels: ['qwen-plus', 'qwen-turbo'],
    defaultIdentifier: 'DASHSCOPE',
    supportsBaseUrl: true,
    supportsModels: true,
    availableKinds: ['model'],
  },
  zhipu: {
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    placeholder: 'glm-4-flash,glm-4-plus',
    defaultModels: ['glm-4-flash', 'glm-4-plus'],
    defaultIdentifier: 'ZHIPU',
    supportsBaseUrl: true,
    supportsModels: true,
    availableKinds: ['model'],
  },
  moonshot: {
    label: 'Moonshot',
    baseUrl: 'https://api.moonshot.cn/v1',
    placeholder: 'moonshot-v1-8k,moonshot-v1-32k',
    defaultModels: ['moonshot-v1-8k', 'moonshot-v1-32k'],
    defaultIdentifier: 'MOONSHOT',
    supportsBaseUrl: true,
    supportsModels: true,
    availableKinds: ['model'],
  },
  siliconflow: {
    label: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    placeholder: 'deepseek-ai/DeepSeek-V3,deepseek-ai/DeepSeek-R1',
    defaultModels: ['deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1'],
    defaultIdentifier: 'SILICONFLOW',
    supportsBaseUrl: true,
    supportsModels: true,
    availableKinds: ['model'],
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    placeholder: 'google/gemini-2.0-flash-exp:free,meta-llama/llama-3.1-70b-instruct',
    defaultModels: ['google/gemini-2.0-flash-exp:free', 'meta-llama/llama-3.1-70b-instruct'],
    defaultIdentifier: 'OPENROUTER',
    supportsBaseUrl: true,
    supportsModels: true,
    availableKinds: ['model'],
  },
  custom: {
    label: '自定义',
    baseUrl: '',
    placeholder: 'model-a,model-b',
    defaultModels: [],
    defaultIdentifier: 'CUSTOM',
    supportsBaseUrl: true,
    supportsModels: true,
    availableKinds: ['model'],
  },
  minimax: {
    label: 'MiniMax',
    baseUrl: '',
    placeholder: '',
    defaultModels: [],
    defaultIdentifier: 'MINIMAX',
    supportsBaseUrl: false,
    supportsModels: false,
    availableKinds: ['extension'],
  },
};

export const LEGACY_PROVIDER_HINTS = [
  { title: 'DeepSeek', keys: ['DEEPSEEK_API_KEY', 'DEEPSEEK_API_KEYS'] },
  { title: 'Gemini', keys: ['GEMINI_API_KEY', 'GEMINI_API_KEYS'] },
  { title: 'OpenAI', keys: ['OPENAI_API_KEY', 'OPENAI_API_KEYS'] },
  { title: 'Anthropic', keys: ['ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEYS'] },
  { title: 'AIHubMix', keys: ['AIHUBMIX_KEY'] },
  { title: 'MiniMax', keys: ['MINIMAX_API_KEYS'] },
] as const;

export function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

export function parseModelNames(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function buildItemsByKey(items: SystemConfigItem[]): Record<string, SystemConfigItem> {
  return Object.fromEntries(items.map((item) => [item.key, item])) as Record<string, SystemConfigItem>;
}

export function resolvePreset(channelName: string): ChannelPreset {
  const normalizedName = channelName.toLowerCase();
  const presetKey = (Object.keys(CHANNEL_PRESETS) as QuickProviderId[]).find((key) => normalizedName.startsWith(key));
  return CHANNEL_PRESETS[presetKey || 'custom'];
}

export function parseChannelsFromItems(items: SystemConfigItem[]): ChannelConfig[] {
  const itemsByKey = buildItemsByKey(items);
  const channelNameSet = new Set<string>();
  const llmChannelsValue = itemsByKey.LLM_CHANNELS?.value || '';

  llmChannelsValue
    .split(',')
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean)
    .forEach((entry) => channelNameSet.add(entry));

  items.forEach((item) => {
    const matched = item.key.match(/^LLM_([A-Z0-9_]+)_(BASE_URL|API_KEY|API_KEYS|MODELS|EXTRA_HEADERS)$/);
    if (matched && hasValue(item.value)) {
      channelNameSet.add(matched[1].toUpperCase());
    }
  });

  return [...channelNameSet]
    .map((name) => {
      const baseUrlItem = itemsByKey[`LLM_${name}_BASE_URL`];
      const apiKeyItem = itemsByKey[`LLM_${name}_API_KEY`];
      const apiKeysItem = itemsByKey[`LLM_${name}_API_KEYS`];
      const modelsItem = itemsByKey[`LLM_${name}_MODELS`];
      const extraHeadersItem = itemsByKey[`LLM_${name}_EXTRA_HEADERS`];
      const hasSavedConfig = [baseUrlItem, apiKeyItem, apiKeysItem, modelsItem, extraHeadersItem].some((item) => hasValue(item?.value));

      if (!hasSavedConfig) {
        return null;
      }

      return {
        name: name.toLowerCase(),
        baseUrl: baseUrlItem?.value || '',
        apiKey: apiKeyItem?.value || apiKeysItem?.value || '',
        models: modelsItem?.value || '',
        extraHeaders: extraHeadersItem?.value || '',
        enabled: [baseUrlItem, apiKeyItem, apiKeysItem, modelsItem, extraHeadersItem].some(
          (item) => hasValue(item?.value) && !item?.isCommented,
        ),
      } satisfies ChannelConfig;
    })
    .filter((channel): channel is ChannelConfig => Boolean(channel))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function channelsToUpdateItems(
  channels: ChannelConfig[],
  previousChannelNames: string[],
  mainModel: string,
  fallbackModels: string,
): SystemConfigUpdateItem[] {
  const updates: SystemConfigUpdateItem[] = [];
  const currentNames = channels.map((channel) => channel.name.toUpperCase());
  const activeNames = channels.filter((channel) => channel.enabled).map((channel) => channel.name);

  updates.push({ key: 'LLM_CHANNELS', value: activeNames.join(','), enabled: activeNames.length > 0 });

  for (const channel of channels) {
    const prefix = `LLM_${channel.name.toUpperCase()}`;
    const isMultiKey = channel.apiKey.includes(',');

    updates.push({ key: `${prefix}_BASE_URL`, value: channel.baseUrl, enabled: channel.enabled });
    updates.push({
      key: `${prefix}_API_KEYS`,
      value: isMultiKey ? channel.apiKey : '',
      enabled: isMultiKey ? channel.enabled : false,
    });
    updates.push({
      key: `${prefix}_API_KEY`,
      value: isMultiKey ? '' : channel.apiKey,
      enabled: isMultiKey ? false : channel.enabled,
    });
    updates.push({ key: `${prefix}_MODELS`, value: channel.models, enabled: channel.enabled });
    updates.push({ key: `${prefix}_EXTRA_HEADERS`, value: channel.extraHeaders, enabled: channel.enabled });
  }

  for (const oldName of previousChannelNames) {
    const upper = oldName.toUpperCase();
    if (!currentNames.includes(upper)) {
      const prefix = `LLM_${upper}`;
      updates.push({ key: `${prefix}_BASE_URL`, value: '', enabled: false });
      updates.push({ key: `${prefix}_API_KEY`, value: '', enabled: false });
      updates.push({ key: `${prefix}_API_KEYS`, value: '', enabled: false });
      updates.push({ key: `${prefix}_MODELS`, value: '', enabled: false });
      updates.push({ key: `${prefix}_EXTRA_HEADERS`, value: '', enabled: false });
    }
  }

  updates.push({ key: 'LITELLM_MODEL', value: mainModel });
  updates.push({ key: 'LITELLM_FALLBACK_MODELS', value: fallbackModels });
  return updates;
}

export function detectLegacyProviders(items: SystemConfigItem[]): string[] {
  const itemsByKey = buildItemsByKey(items);
  return LEGACY_PROVIDER_HINTS
    .filter((provider) => provider.keys.some((key) => hasValue(itemsByKey[key]?.value)))
    .map((provider) => provider.title);
}

export function normalizeIdentifier(rawValue: string): string {
  return rawValue
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function generateDefaultIdentifier(provider: QuickProviderId, existingNames: string[]): string {
  const base = CHANNEL_PRESETS[provider].defaultIdentifier;
  const taken = new Set(existingNames.map((name) => name.toUpperCase()));
  if (!taken.has(base)) {
    return base;
  }

  let suffix = 2;
  while (taken.has(`${base}_${suffix}`)) {
    suffix += 1;
  }
  return `${base}_${suffix}`;
}

export function mergeFallbackModels(currentValue: string, modelToAdd: string): string {
  const allModels = new Set(parseModelNames(currentValue));
  if (modelToAdd.trim()) {
    allModels.add(modelToAdd.trim());
  }
  return [...allModels].join(',');
}
