import { useCallback, useMemo, useState } from 'react';
import type React from 'react';
import { AlertCircle, Bot, Plus, Power, Save, SearchCheck, Trash2, X } from 'lucide-react';
import { systemConfigApi } from '../../api/systemConfig';
import type { SystemConfigItem, SystemConfigUpdateItem } from '../../types/systemConfig';
import { Select } from '../common';

type ChannelPreset = {
  label: string;
  baseUrl: string;
  placeholder: string;
  defaultModels: string[];
};

type ChannelConfig = {
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string;
  extraHeaders: string;
  enabled: boolean;
};

type LLMChannelEditorProps = {
  items: SystemConfigItem[];
  configVersion: string;
  maskToken: string;
  onSaved: () => void;
  onChangeVision: (key: string, value: string) => void;
  visionItems: SystemConfigItem[];
  disabled?: boolean;
};

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  text: string;
} | null;

const CHANNEL_PRESETS: Record<string, ChannelPreset> = {
  aihubmix: {
    label: 'AIHubMix',
    baseUrl: 'https://aihubmix.com/v1',
    placeholder: 'gpt-4o-mini,claude-3-5-sonnet,qwen-plus',
    defaultModels: ['gpt-4o-mini', 'claude-3-5-sonnet', 'qwen-plus'],
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    placeholder: 'deepseek-chat,deepseek-reasoner',
    defaultModels: ['deepseek-chat', 'deepseek-reasoner'],
  },
  dashscope: {
    label: 'DashScope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    placeholder: 'qwen-plus,qwen-turbo',
    defaultModels: ['qwen-plus', 'qwen-turbo'],
  },
  zhipu: {
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    placeholder: 'glm-4-flash,glm-4-plus',
    defaultModels: ['glm-4-flash', 'glm-4-plus'],
  },
  moonshot: {
    label: 'Moonshot',
    baseUrl: 'https://api.moonshot.cn/v1',
    placeholder: 'moonshot-v1-8k,moonshot-v1-32k',
    defaultModels: ['moonshot-v1-8k', 'moonshot-v1-32k'],
  },
  siliconflow: {
    label: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    placeholder: 'deepseek-ai/DeepSeek-V3,deepseek-ai/DeepSeek-R1',
    defaultModels: ['deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1'],
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    placeholder: 'google/gemini-2.0-flash-exp:free,meta-llama/llama-3.1-70b-instruct',
    defaultModels: ['google/gemini-2.0-flash-exp:free', 'meta-llama/llama-3.1-70b-instruct'],
  },
  gemini: {
    label: 'Gemini',
    baseUrl: '',
    placeholder: 'gemini/gemini-2.5-flash',
    defaultModels: ['gemini/gemini-2.5-flash'],
  },
  custom: {
    label: '自定义',
    baseUrl: '',
    placeholder: 'model-a,model-b',
    defaultModels: [],
  },
};

const LEGACY_PROVIDER_HINTS = [
  { title: 'DeepSeek', keys: ['DEEPSEEK_API_KEY', 'DEEPSEEK_API_KEYS'] },
  { title: 'Gemini', keys: ['GEMINI_API_KEY', 'GEMINI_API_KEYS'] },
  { title: 'OpenAI', keys: ['OPENAI_API_KEY', 'OPENAI_API_KEYS'] },
  { title: 'Anthropic', keys: ['ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEYS'] },
  { title: 'AIHubMix', keys: ['AIHUBMIX_KEY'] },
];

function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

function parseModelNames(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolvePreset(channelName: string): ChannelPreset {
  const presetKey = Object.keys(CHANNEL_PRESETS).find((key) => channelName.toLowerCase().startsWith(key));
  return CHANNEL_PRESETS[presetKey || 'custom'];
}

function buildItemsByKey(items: SystemConfigItem[]): Record<string, SystemConfigItem> {
  return Object.fromEntries(items.map((item) => [item.key, item])) as Record<string, SystemConfigItem>;
}

function parseChannelsFromItems(items: SystemConfigItem[]): ChannelConfig[] {
  const itemsByKey = buildItemsByKey(items);
  const channelNameSet = new Set<string>();
  const llmChannelsValue = itemsByKey.LLM_CHANNELS?.value || '';

  llmChannelsValue
    .split(',')
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean)
    .forEach((entry) => channelNameSet.add(entry));

  items.forEach((item) => {
    const matched = item.key.match(/^LLM_([A-Z0-9]+)_(BASE_URL|API_KEY|API_KEYS|MODELS|EXTRA_HEADERS)$/);
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

function detectLegacyProviders(items: SystemConfigItem[]): string[] {
  const itemsByKey = buildItemsByKey(items);
  return LEGACY_PROVIDER_HINTS.filter((provider) => provider.keys.some((key) => hasValue(itemsByKey[key]?.value))).map((provider) => provider.title);
}

function channelsToUpdateItems(
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

export const LLMChannelEditor: React.FC<LLMChannelEditorProps> = ({
  items,
  configVersion,
  maskToken,
  onSaved,
  onChangeVision,
  visionItems,
  disabled = false,
}) => {
  const initialChannels = useMemo(() => parseChannelsFromItems(items), [items]);
  const initialNames = useMemo(() => initialChannels.map((channel) => channel.name), [initialChannels]);
  const initialMainModel = useMemo(() => items.find((item) => item.key === 'LITELLM_MODEL')?.value || '', [items]);
  const initialFallbackModels = useMemo(
    () => items.find((item) => item.key === 'LITELLM_FALLBACK_MODELS')?.value || '',
    [items],
  );
  const legacyProviders = useMemo(() => detectLegacyProviders(items), [items]);

  const [channels, setChannels] = useState<ChannelConfig[]>(initialChannels);
  const [mainModel, setMainModel] = useState(initialMainModel);
  const [fallbackModels, setFallbackModels] = useState(initialFallbackModels);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showVisionPanel, setShowVisionPanel] = useState(false);
  const [newChannelType, setNewChannelType] = useState('deepseek');
  const [newChannelName, setNewChannelName] = useState('deepseek');
  const [newChannelBaseUrl, setNewChannelBaseUrl] = useState(CHANNEL_PRESETS.deepseek.baseUrl);
  const [newChannelApiKey, setNewChannelApiKey] = useState('');
  const [newChannelModels, setNewChannelModels] = useState(CHANNEL_PRESETS.deepseek.defaultModels.join(','));

  const allAvailableModels = useMemo(() => {
    const models = new Set<string>();
    channels.forEach((channel) => {
      parseModelNames(channel.models).forEach((model) => models.add(model));
    });
    if (mainModel) {
      models.add(mainModel);
    }
    parseModelNames(fallbackModels).forEach((model) => models.add(model));
    return [...models];
  }, [channels, fallbackModels, mainModel]);

  const visionModelItem = useMemo(() => visionItems.find((item) => item.key === 'VISION_MODEL'), [visionItems]);
  const visionProviderItem = useMemo(() => visionItems.find((item) => item.key === 'VISION_PROVIDER_PRIORITY'), [visionItems]);
  const openAIVisionItem = useMemo(() => visionItems.find((item) => item.key === 'OPENAI_VISION_MODEL'), [visionItems]);

  const hasChanges = useMemo(() => {
    if (mainModel !== initialMainModel || fallbackModels !== initialFallbackModels || channels.length !== initialChannels.length) {
      return true;
    }

    return channels.some((channel, index) => {
      const initial = initialChannels[index];
      return !initial || JSON.stringify(channel) !== JSON.stringify(initial);
    });
  }, [channels, fallbackModels, initialChannels, initialFallbackModels, initialMainModel, mainModel]);

  const resetAddModal = useCallback((presetKey: string) => {
    const preset = CHANNEL_PRESETS[presetKey];
    setNewChannelType(presetKey);
    setNewChannelName(presetKey === 'custom' ? '' : presetKey);
    setNewChannelBaseUrl(preset.baseUrl);
    setNewChannelApiKey('');
    setNewChannelModels(preset.defaultModels.join(','));
  }, []);

  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    setFeedback(null);
    try {
      const payloadItems = channelsToUpdateItems(channels, initialNames, mainModel, fallbackModels);
      const result = await systemConfigApi.validate({ items: payloadItems });
      if (result.valid) {
        setFeedback({ type: 'success', text: '模型配置校验通过。' });
        return;
      }

      const messages = [...new Set((result.issues || []).map((issue) => issue.message))];
      setFeedback({ type: 'error', text: messages.join('；') || '模型配置校验未通过。' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '模型配置校验失败。';
      setFeedback({ type: 'error', text: message });
    } finally {
      setIsValidating(false);
    }
  }, [channels, fallbackModels, initialNames, mainModel]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const payloadItems = channelsToUpdateItems(channels, initialNames, mainModel, fallbackModels);
      const result = await systemConfigApi.validate({ items: payloadItems });
      if (!result.valid) {
        const messages = [...new Set((result.issues || []).map((issue) => issue.message))];
        setFeedback({ type: 'error', text: messages.join('；') || '模型配置校验未通过。' });
        return;
      }

      await systemConfigApi.update({
        configVersion,
        maskToken,
        reloadNow: true,
        items: payloadItems,
      });
      setFeedback({ type: 'success', text: '模型配置已保存。' });
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存模型配置失败。';
      setFeedback({ type: 'error', text: message });
    } finally {
      setIsSaving(false);
    }
  }, [channels, configVersion, fallbackModels, initialNames, mainModel, maskToken, onSaved]);

  const saveNewChannel = useCallback(() => {
    const normalizedName = newChannelName.trim().toLowerCase();
    if (!normalizedName) {
      setFeedback({ type: 'error', text: '请输入模型名称。' });
      return;
    }
    if (channels.some((channel) => channel.name === normalizedName)) {
      setFeedback({ type: 'error', text: '该模型渠道已存在。' });
      return;
    }

    setChannels((previous) => [
      ...previous,
      {
        name: normalizedName,
        baseUrl: newChannelBaseUrl.trim(),
        apiKey: newChannelApiKey.trim(),
        models: newChannelModels.trim(),
        extraHeaders: '',
        enabled: true,
      },
    ]);
    setIsAddModalOpen(false);
    setFeedback(null);
  }, [channels, newChannelApiKey, newChannelBaseUrl, newChannelModels, newChannelName]);

  return (
    <div className="space-y-4 p-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">AI 模型</h3>
          <p className="mt-1 text-sm text-muted-foreground">按渠道管理模型；停用时保留原值。</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setShowVisionPanel(true)}
            disabled={disabled || isSaving}
            className="btn-secondary shrink-0 whitespace-nowrap"
          >
            视觉模型设置
          </button>
          <button
            type="button"
            onClick={() => {
              resetAddModal('deepseek');
              setIsAddModalOpen(true);
            }}
            disabled={disabled || isSaving}
            className="btn-primary shrink-0 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            添加模型
          </button>
        </div>
      </div>

      {legacyProviders.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-300">
          检测到兼容配置：{legacyProviders.join('、')}。当前页面会识别，但不会自动迁移。
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-foreground">主模型</label>
          <Select
            value={mainModel}
            onChange={setMainModel}
            options={[
              { value: '', label: '请选择主模型' },
              ...allAvailableModels.map((model) => ({ value: model, label: model })),
            ]}
            disabled={disabled || isSaving}
            className="w-full"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-foreground">备选模型</label>
          <input
            type="text"
            className="input-terminal w-full"
            value={fallbackModels}
            onChange={(event) => setFallbackModels(event.target.value)}
            placeholder="多个模型用逗号分隔"
            disabled={disabled || isSaving}
          />
        </div>
      </div>

      {channels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background/50 px-4 py-8 text-center text-sm text-muted-foreground">
          {legacyProviders.length > 0 ? '已检测到旧版模型配置。' : '还没有配置任何模型。'}
        </div>
      ) : (
        <div className="space-y-4">
          {channels.map((channel, index) => {
            const preset = resolvePreset(channel.name);
            const modelTags = parseModelNames(channel.models);
            return (
              <section key={channel.name} className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className={[
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                      channel.enabled ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground',
                    ].join(' ')}>
                      <Bot size={18} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground">{preset.label}</h4>
                        <span
                          className={[
                            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            channel.enabled ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
                          ].join(' ')}
                        >
                          {channel.enabled ? '已启用' : '已停用'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">渠道名：{channel.name}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: !item.enabled } : item));
                      }}
                      disabled={disabled || isSaving}
                      className="btn-secondary shrink-0 whitespace-nowrap"
                    >
                      <Power className="h-4 w-4" />
                      {channel.enabled ? '停用' : '启用'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannels((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                      disabled={disabled || isSaving}
                      className="btn-secondary shrink-0 whitespace-nowrap text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                </div>

                <div className={['mt-4 grid gap-3 lg:grid-cols-2', channel.enabled ? '' : 'opacity-60'].join(' ')}>
                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-medium text-foreground">Base URL</label>
                    <input
                      type="text"
                      className="input-terminal w-full"
                      value={channel.baseUrl}
                      onChange={(event) => {
                        const value = event.target.value;
                        setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, baseUrl: value } : item));
                      }}
                      placeholder="https://api.example.com/v1"
                      disabled={disabled || isSaving}
                    />
                  </div>
                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-medium text-foreground">API Key</label>
                    <input
                      type="password"
                      className="input-terminal w-full"
                      value={channel.apiKey}
                      onChange={(event) => {
                        const value = event.target.value;
                        setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, apiKey: value } : item));
                      }}
                      placeholder="sk-..."
                      disabled={disabled || isSaving}
                    />
                  </div>
                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-medium text-foreground">模型列表</label>
                    <input
                      type="text"
                      className="input-terminal w-full"
                      value={channel.models}
                      onChange={(event) => {
                        const value = event.target.value;
                        setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, models: value } : item));
                      }}
                      placeholder={preset.placeholder}
                      disabled={disabled || isSaving}
                    />
                  </div>
                </div>

                {modelTags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {modelTags.map((model) => (
                      <span key={model} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                        {model}
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {feedback ? (
        <div
          className={[
            'rounded-2xl border px-4 py-3 text-sm',
            feedback.type === 'success'
              ? 'border-success/20 bg-success/10 text-success'
              : feedback.type === 'error'
                ? 'border-destructive/20 bg-destructive/10 text-destructive'
                : 'border-primary/20 bg-primary/10 text-primary',
          ].join(' ')}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{feedback.text}</span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">保存</p>
          <p className="mt-1 text-sm text-muted-foreground">先检测，再保存。</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleValidate()}
            disabled={disabled || isSaving || isValidating}
            className="btn-secondary shrink-0 whitespace-nowrap"
          >
            <SearchCheck className="h-4 w-4" />
            {isValidating ? '检测中...' : '检测模型'}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={disabled || isSaving || !hasChanges}
            className="btn-primary shrink-0 whitespace-nowrap"
          >
            <Save className="h-4 w-4" />
            {isSaving ? '保存中...' : '保存模型配置'}
          </button>
        </div>
      </div>

      {isAddModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">添加模型</h3>
                <p className="mt-2 text-sm text-muted-foreground">先选供应商，再补充最少配置。</p>
              </div>
              <button
                type="button"
                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="关闭弹窗"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">供应商</label>
                <Select
                  value={newChannelType}
                  onChange={(value) => resetAddModal(value)}
                  options={Object.entries(CHANNEL_PRESETS).map(([key, preset]) => ({ value: key, label: preset.label }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">渠道名</label>
                <input
                  type="text"
                  className="input-terminal w-full"
                  value={newChannelName}
                  onChange={(event) => setNewChannelName(event.target.value)}
                  placeholder="例如：deepseek"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Base URL</label>
                <input
                  type="text"
                  className="input-terminal w-full"
                  value={newChannelBaseUrl}
                  onChange={(event) => setNewChannelBaseUrl(event.target.value)}
                  placeholder="https://api.example.com/v1"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">API Key</label>
                <input
                  type="password"
                  className="input-terminal w-full"
                  value={newChannelApiKey}
                  onChange={(event) => setNewChannelApiKey(event.target.value)}
                  placeholder="sk-..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">模型列表</label>
                <input
                  type="text"
                  className="input-terminal w-full"
                  value={newChannelModels}
                  onChange={(event) => setNewChannelModels(event.target.value)}
                  placeholder={CHANNEL_PRESETS[newChannelType]?.placeholder || 'model-a,model-b'}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                取消
              </button>
              <button type="button" className="btn-primary" onClick={saveNewChannel}>
                确认添加
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showVisionPanel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowVisionPanel(false)}>
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">视觉模型</h3>
              </div>
              <button type="button" className="btn-secondary !h-9 !px-3" onClick={() => setShowVisionPanel(false)}>
                关闭
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="grid gap-2 rounded-2xl border border-border bg-background/60 px-4 py-3 md:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <p className="text-sm font-semibold text-foreground">视觉模型</p>
                  <p className="mt-1 text-xs text-muted-foreground">VISION_MODEL</p>
                </div>
                <div>
                  <Select
                    value={visionModelItem?.value ?? ''}
                    onChange={(value) => onChangeVision('VISION_MODEL', value)}
                    options={[{ value: '', label: '自动选择' }, ...allAvailableModels.map((model) => ({ value: model, label: model }))]}
                    disabled={disabled || isSaving}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid gap-2 rounded-2xl border border-border bg-background/60 px-4 py-3 md:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <p className="text-sm font-semibold text-foreground">供应商优先级</p>
                  <p className="mt-1 text-xs text-muted-foreground">VISION_PROVIDER_PRIORITY</p>
                </div>
                <div>
                  <input
                    type="text"
                    className="input-terminal w-full"
                    value={visionProviderItem?.value ?? ''}
                    onChange={(event) => onChangeVision('VISION_PROVIDER_PRIORITY', event.target.value)}
                    disabled={disabled || isSaving}
                    placeholder="gemini,anthropic,openai"
                  />
                </div>
              </div>

              <div className="grid gap-2 rounded-2xl border border-border bg-background/60 px-4 py-3 md:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <p className="text-sm font-semibold text-foreground">兼容项</p>
                  <p className="mt-1 text-xs text-muted-foreground">OPENAI_VISION_MODEL</p>
                </div>
                <div>
                  <input
                    type="text"
                    className="input-terminal w-full"
                    value={openAIVisionItem?.value ?? ''}
                    onChange={(event) => onChangeVision('OPENAI_VISION_MODEL', event.target.value)}
                    disabled={disabled || isSaving}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
