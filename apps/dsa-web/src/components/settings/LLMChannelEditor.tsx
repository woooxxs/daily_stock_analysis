import { useCallback, useMemo, useState } from 'react';
import type React from 'react';
import { AlertCircle, Bot, Power, Save, SearchCheck } from 'lucide-react';
import { systemConfigApi } from '../../api/systemConfig';
import type { SystemConfigItem } from '../../types/systemConfig';
import { Button, Select } from '../common';
import {
  channelsToUpdateItems,
  detectLegacyProviders,
  parseChannelsFromItems,
  parseModelNames,
  resolvePreset,
} from './modelConfigShared';

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

  const [channels, setChannels] = useState(initialChannels);
  const [mainModel, setMainModel] = useState(initialMainModel);
  const [fallbackModels, setFallbackModels] = useState(initialFallbackModels);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [showVisionPanel, setShowVisionPanel] = useState(false);

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

  return (
    <div className="space-y-4 p-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">模型渠道</h3>
          <p className="mt-1 text-sm text-muted-foreground">这里用于手动维护已配置的模型渠道；新增入口已收口到上方快速配置。</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowVisionPanel(true)}
            disabled={disabled || isSaving}
          >
            视觉模型设置
          </Button>
        </div>
      </div>

      {legacyProviders.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-300">
          检测到旧版直配键：{legacyProviders.join('、')}。它们会继续生效，也可在下方折叠区手工维护。
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
          {legacyProviders.length > 0 ? '已检测到旧版模型配置，但尚未建立新的模型渠道。' : '还没有配置任何模型渠道。'}
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
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: !item.enabled } : item));
                      }}
                      disabled={disabled || isSaving}
                    >
                      <Power className="h-4 w-4" />
                      {channel.enabled ? '停用' : '启用'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setChannels((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                      disabled={disabled || isSaving}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      删除
                    </Button>
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
                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-medium text-foreground">额外请求头（可选）</label>
                    <textarea
                      className="min-h-[96px] w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
                      value={channel.extraHeaders}
                      onChange={(event) => {
                        const value = event.target.value;
                        setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, extraHeaders: value } : item));
                      }}
                      placeholder='例如：{"HTTP-Referer":"https://example.com"}'
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
          <p className="text-sm font-semibold text-foreground">手动保存渠道</p>
          <p className="mt-1 text-sm text-muted-foreground">适合调整现有渠道、主模型、备选模型与视觉模型。</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleValidate()}
            disabled={disabled || isSaving || isValidating}
          >
            <SearchCheck className="h-4 w-4" />
            {isValidating ? '检测中...' : '检测模型'}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={disabled || isSaving || !hasChanges}
            isLoading={isSaving}
          >
            <Save className="h-4 w-4" />
            保存模型配置
          </Button>
        </div>
      </div>

      {showVisionPanel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowVisionPanel(false)}>
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">视觉模型</h3>
              </div>
              <Button type="button" variant="secondary" onClick={() => setShowVisionPanel(false)}>
                关闭
              </Button>
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
