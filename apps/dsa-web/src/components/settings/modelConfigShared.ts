import type { SystemConfigFieldSchema, SystemConfigItem } from '../../types/systemConfig';

export type AiBrandId =
  | 'aihubmix'
  | 'deepseek'
  | 'gemini'
  | 'anthropic'
  | 'openai'
  | 'openai_compatible'
  | 'qwen'
  | 'glm'
  | 'moonshot'
  | 'minimax'
  | 'litellm_yaml';

export type AiBrandSectionMode = 'single' | 'compatible' | 'channel' | 'yaml';

export type AiBrandSection = {
  id: string;
  title: string;
  mode: AiBrandSectionMode;
  keys: string[];
};

export type AiBrandDefinition = {
  id: AiBrandId;
  title: string;
  description: string;
  sections: AiBrandSection[];
  channelIdentifier?: string;
};

export type AiBrandStatus = 'enabled' | 'disabled' | 'preserved';

export type AiBrandState = {
  hasSavedValue: boolean;
  hasEnabledValue: boolean;
  status: AiBrandStatus;
  hasChannelValue: boolean;
};

export const AI_TOP_KEYS = ['LITELLM_MODEL', 'LITELLM_FALLBACK_MODELS', 'VISION_MODEL', 'VISION_PROVIDER_PRIORITY', 'OPENAI_VISION_MODEL'] as const;

export const OPENAI_COMPATIBLE_KEYS = ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_TEMPERATURE'] as const;

export const AI_BRAND_DEFINITIONS: AiBrandDefinition[] = [
  {
    id: 'aihubmix',
    title: 'AIHubMix',
    description: '一个聚合 Key 接多个兼容模型。',
    channelIdentifier: 'AIHUBMIX',
    sections: [
      { id: 'single', title: '聚合 Key', mode: 'single', keys: ['AIHUBMIX_KEY'] },
      {
        id: 'channel',
        title: '渠道路径',
        mode: 'channel',
        keys: ['LLM_AIHUBMIX_BASE_URL', 'LLM_AIHUBMIX_API_KEY', 'LLM_AIHUBMIX_MODELS'],
      },
    ],
  },
  {
    id: 'deepseek',
    title: 'DeepSeek',
    description: 'DeepSeek 官方直连与 LiteLLM 渠道配置。',
    channelIdentifier: 'DEEPSEEK',
    sections: [
      { id: 'official', title: '官方直连', mode: 'single', keys: ['DEEPSEEK_API_KEY'] },
      {
        id: 'channel',
        title: '渠道路径',
        mode: 'channel',
        keys: ['LLM_DEEPSEEK_BASE_URL', 'LLM_DEEPSEEK_API_KEY', 'LLM_DEEPSEEK_MODELS'],
      },
    ],
  },
  {
    id: 'gemini',
    title: 'Gemini',
    description: '官方 Gemini Key 与 LiteLLM 渠道放在同一个入口。',
    channelIdentifier: 'GEMINI',
    sections: [
      { id: 'official', title: '官方路径', mode: 'single', keys: ['GEMINI_API_KEY', 'GEMINI_API_KEYS', 'GEMINI_TEMPERATURE'] },
      { id: 'channel', title: '渠道路径', mode: 'channel', keys: ['LLM_GEMINI_API_KEYS', 'LLM_GEMINI_MODELS'] },
    ],
  },
  {
    id: 'anthropic',
    title: 'Claude / Anthropic',
    description: 'Claude 官方 Key 与 LiteLLM 渠道统一放在这里。',
    channelIdentifier: 'ANTHROPIC',
    sections: [
      { id: 'official', title: '官方路径', mode: 'single', keys: ['ANTHROPIC_API_KEY', 'ANTHROPIC_TEMPERATURE'] },
      {
        id: 'channel',
        title: '渠道路径',
        mode: 'channel',
        keys: ['LLM_ANTHROPIC_BASE_URL', 'LLM_ANTHROPIC_API_KEY', 'LLM_ANTHROPIC_MODELS'],
      },
    ],
  },
  {
    id: 'openai_compatible',
    title: 'OpenAI 兼容',
    description: '统一承接 OPENAI_* 这组全局兼容配置。',
    sections: [{ id: 'compatible', title: '兼容路径', mode: 'compatible', keys: ['OPENAI_API_KEY', 'OPENAI_API_KEYS', 'OPENAI_BASE_URL', 'OPENAI_MODEL', 'OPENAI_TEMPERATURE'] }],
  },
  {
    id: 'openai',
    title: 'OpenAI',
    description: 'OpenAI 的 LiteLLM 渠道配置。',
    channelIdentifier: 'OPENAI',
    sections: [
      {
        id: 'channel',
        title: '渠道路径',
        mode: 'channel',
        keys: ['LLM_OPENAI_BASE_URL', 'LLM_OPENAI_API_KEY', 'LLM_OPENAI_MODELS'],
      },
    ],
  },
  {
    id: 'qwen',
    title: 'Qwen / 通义千问',
    description: '通义千问的 LiteLLM 渠道配置。',
    channelIdentifier: 'QWEN',
    sections: [
      {
        id: 'channel',
        title: '渠道路径',
        mode: 'channel',
        keys: ['LLM_QWEN_BASE_URL', 'LLM_QWEN_API_KEY', 'LLM_QWEN_MODELS'],
      },
    ],
  },
  {
    id: 'glm',
    title: 'GLM / 智谱',
    description: '智谱 GLM 的 LiteLLM 渠道配置。',
    channelIdentifier: 'GLM',
    sections: [
      {
        id: 'channel',
        title: '渠道路径',
        mode: 'channel',
        keys: ['LLM_GLM_BASE_URL', 'LLM_GLM_API_KEY', 'LLM_GLM_MODELS'],
      },
    ],
  },
  {
    id: 'moonshot',
    title: 'Moonshot',
    description: 'Moonshot / Kimi 的 LiteLLM 渠道配置。',
    channelIdentifier: 'MOONSHOT',
    sections: [
      {
        id: 'channel',
        title: '渠道路径',
        mode: 'channel',
        keys: ['LLM_MOONSHOT_BASE_URL', 'LLM_MOONSHOT_API_KEY', 'LLM_MOONSHOT_MODELS'],
      },
    ],
  },
  {
    id: 'minimax',
    title: 'MiniMax',
    description: 'AI 扩展能力 Key，不参与主模型路由。',
    sections: [{ id: 'extension', title: '扩展能力', mode: 'single', keys: ['MINIMAX_API_KEYS'] }],
  },
  {
    id: 'litellm_yaml',
    title: 'LiteLLM YAML',
    description: '直接指向 LiteLLM 的 YAML 配置文件。',
    sections: [{ id: 'yaml', title: 'YAML 路径', mode: 'yaml', keys: ['LITELLM_CONFIG'] }],
  },
];

export const AI_BRAND_IDS = AI_BRAND_DEFINITIONS.map((definition) => definition.id);

export function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

export function parseModelNames(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parseCommaValues(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function buildItemsByKey(items: SystemConfigItem[]): Record<string, SystemConfigItem> {
  return Object.fromEntries(items.map((item) => [item.key, item])) as Record<string, SystemConfigItem>;
}

function buildVirtualSchema(key: string): SystemConfigFieldSchema {
  const isApiKey = key.endsWith('_API_KEY') || key.endsWith('_API_KEYS') || key === 'AIHUBMIX_KEY' || key === 'MINIMAX_API_KEYS';
  const isModels = key.endsWith('_MODELS');
  const isBaseUrl = key.endsWith('_BASE_URL');

  return {
    key,
    title: key,
    description: '',
    category: 'ai_model',
    dataType: 'string',
    uiControl: isApiKey ? 'password' : isBaseUrl || isModels ? 'text' : 'text',
    isSensitive: isApiKey,
    isRequired: false,
    isEditable: true,
    defaultValue: '',
    options: [],
    validation: isApiKey && key.endsWith('_API_KEYS') || isModels ? { multiValue: true } : {},
    displayOrder: 9000,
  };
}

export function mergeAiItemsWithVirtualEntries(
  items: SystemConfigItem[],
  draftValues: Record<string, string>,
  draftEnabled: Record<string, boolean>,
): SystemConfigItem[] {
  const knownKeys = new Set(items.map((item) => item.key));
  const nextItems = [...items];

  AI_BRAND_DEFINITIONS.flatMap((definition) => definition.sections).forEach((section) => {
    section.keys.forEach((key) => {
      if (knownKeys.has(key)) {
        return;
      }

      nextItems.push({
        key,
        value: draftValues[key] ?? '',
        rawValueExists: false,
        linePresent: false,
        isCommented: !(draftEnabled[key] ?? false),
        isMasked: false,
        schema: buildVirtualSchema(key),
      });
      knownKeys.add(key);
    });
  });

  return nextItems;
}

export function getAiBrandDefinition(brandId: AiBrandId): AiBrandDefinition {
  const definition = AI_BRAND_DEFINITIONS.find((entry) => entry.id === brandId);
  if (!definition) {
    throw new Error(`Unknown AI brand: ${brandId}`);
  }
  return definition;
}

function itemHasSavedValue(item: SystemConfigItem | undefined): boolean {
  return hasValue(item?.value);
}

function itemHasEnabledValue(item: SystemConfigItem | undefined): boolean {
  return Boolean(item && hasValue(item.value) && !item.isCommented);
}

export function getChannelKeys(definition: AiBrandDefinition): string[] {
  return definition.sections.filter((section) => section.mode === 'channel').flatMap((section) => section.keys);
}

export function getBrandState(
  definition: AiBrandDefinition,
  itemsByKey: Record<string, SystemConfigItem>,
  manualVisibleBrandIds: AiBrandId[] = [],
  manualEnabledByBrand: Partial<Record<AiBrandId, boolean>> = {},
): AiBrandState {
  const keys = definition.sections.flatMap((section) => section.keys);
  const hasSavedValue = keys.some((key) => itemHasSavedValue(itemsByKey[key]));
  const hasEnabledValue = keys.some((key) => itemHasEnabledValue(itemsByKey[key]));
  const channelKeys = getChannelKeys(definition);
  const hasChannelValue = channelKeys.some((key) => itemHasSavedValue(itemsByKey[key]));
  const isManualVisible = manualVisibleBrandIds.includes(definition.id);
  const manualEnabled = manualEnabledByBrand[definition.id] ?? true;

  let status: AiBrandStatus = 'disabled';
  if (hasEnabledValue || (isManualVisible && !hasSavedValue && manualEnabled)) {
    status = 'enabled';
  } else if (hasSavedValue) {
    status = 'preserved';
  }

  return {
    hasSavedValue,
    hasEnabledValue,
    status,
    hasChannelValue,
  };
}

export function collectVisibleAiBrandIds(items: SystemConfigItem[], manualVisibleBrandIds: AiBrandId[] = []): AiBrandId[] {
  const itemsByKey = buildItemsByKey(items);

  return AI_BRAND_DEFINITIONS
    .filter((definition) => {
      if (manualVisibleBrandIds.includes(definition.id)) {
        return true;
      }
      const state = getBrandState(definition, itemsByKey);
      return state.hasSavedValue;
    })
    .map((definition) => definition.id);
}

export function collectKnownModels(items: SystemConfigItem[]): string[] {
  const itemsByKey = buildItemsByKey(items);
  const models = new Set<string>();

  parseModelNames(itemsByKey.LITELLM_MODEL?.value || '').forEach((model) => models.add(model));
  parseModelNames(itemsByKey.LITELLM_FALLBACK_MODELS?.value || '').forEach((model) => models.add(model));

  items.forEach((item) => {
    if (item.key.endsWith('_MODELS') || item.key === 'VISION_MODEL' || item.key === 'OPENAI_VISION_MODEL' || item.key === 'OPENAI_MODEL') {
      parseModelNames(item.value).forEach((model) => models.add(model));
    }
  });

  return [...models].sort((left, right) => left.localeCompare(right));
}

export function upsertChannelIdentifier(currentValue: string, identifier: string, enabled: boolean): string {
  const target = identifier.toUpperCase();
  const entries = parseCommaValues(currentValue).filter((entry) => entry.toUpperCase() !== target);
  if (enabled) {
    entries.push(target);
  }
  return entries.join(',');
}
