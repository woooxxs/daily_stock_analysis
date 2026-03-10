import { useCallback, useMemo, useState } from 'react';
import type React from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import { systemConfigApi } from '../../api/systemConfig';
import type { SystemConfigItem } from '../../types/systemConfig';
import { Button, Collapsible, Input, Select } from '../common';
import {
  CHANNEL_PRESETS,
  channelsToUpdateItems,
  generateDefaultIdentifier,
  mergeFallbackModels,
  normalizeIdentifier,
  parseChannelsFromItems,
  parseModelNames,
  type QuickAddKind,
  type QuickModelDraft,
  type QuickProviderId,
} from './modelConfigShared';

type SmartModelAddDialogProps = {
  items: SystemConfigItem[];
  configVersion: string;
  maskToken: string;
  disabled?: boolean;
  onSaved: () => void;
};

const KIND_OPTIONS = [
  { value: 'model', label: '模型' },
  { value: 'extension', label: '扩展能力' },
] as const;

function buildDraft(
  kind: QuickAddKind,
  provider: QuickProviderId,
  existingNames: string[],
  hasPrimaryModel: boolean,
): QuickModelDraft {
  const preset = CHANNEL_PRESETS[provider];
  return {
    kind,
    provider,
    identifier: kind === 'model' ? generateDefaultIdentifier(provider, existingNames) : preset.defaultIdentifier,
    apiKeys: '',
    baseUrl: preset.baseUrl,
    models: preset.defaultModels.join(','),
    extraHeaders: '',
    setAsPrimary: kind === 'model' ? !hasPrimaryModel : false,
    appendFallback: false,
  };
}

function supportsProviderKind(provider: QuickProviderId, kind: QuickAddKind): boolean {
  return CHANNEL_PRESETS[provider].availableKinds.includes(kind);
}

function getProviderOptions(kind: QuickAddKind) {
  return (Object.entries(CHANNEL_PRESETS) as Array<[QuickProviderId, (typeof CHANNEL_PRESETS)[QuickProviderId]]>)
    .filter(([, preset]) => preset.availableKinds.includes(kind))
    .map(([value, preset]) => ({ value, label: preset.label }));
}

function extractMessages(issues: Array<{ message: string }> | undefined): string {
  return [...new Set((issues || []).map((issue) => issue.message).filter(Boolean))].join('；');
}

export const SmartModelAddDialog: React.FC<SmartModelAddDialogProps> = ({
  items,
  configVersion,
  maskToken,
  disabled = false,
  onSaved,
}) => {
  const initialChannels = useMemo(() => parseChannelsFromItems(items), [items]);
  const existingNames = useMemo(() => initialChannels.map((channel) => channel.name.toUpperCase()), [initialChannels]);
  const initialMainModel = useMemo(() => items.find((item) => item.key === 'LITELLM_MODEL')?.value || '', [items]);
  const initialFallbackModels = useMemo(() => items.find((item) => item.key === 'LITELLM_FALLBACK_MODELS')?.value || '', [items]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuickModelDraft>(() => buildDraft('model', 'deepseek', existingNames, Boolean(initialMainModel)));

  const openDialog = useCallback(() => {
    setDraft(buildDraft('model', 'deepseek', existingNames, Boolean(initialMainModel)));
    setFeedback(null);
    setIsOpen(true);
  }, [existingNames, initialMainModel]);

  const closeDialog = useCallback(() => {
    if (isSaving) {
      return;
    }
    setIsOpen(false);
    setFeedback(null);
  }, [isSaving]);

  const providerPreset = CHANNEL_PRESETS[draft.provider];
  const providerOptions = useMemo(() => getProviderOptions(draft.kind), [draft.kind]);
  const normalizedIdentifier = normalizeIdentifier(draft.identifier);
  const duplicateIdentifier = draft.kind === 'model' && existingNames.includes(normalizedIdentifier);
  const modelNames = parseModelNames(draft.models);
  const primaryCandidate = modelNames[0] || '';
  const baseUrlRequired = draft.kind === 'model' && providerPreset.supportsBaseUrl;
  const modelListRequired = draft.kind === 'model' && providerPreset.supportsModels;

  const updateDraft = useCallback(<K extends keyof QuickModelDraft>(key: K, value: QuickModelDraft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }, []);

  const handleKindChange = useCallback((value: string) => {
    const nextKind = value as QuickAddKind;
    const nextProvider = supportsProviderKind(draft.provider, nextKind) ? draft.provider : getProviderOptions(nextKind)[0].value as QuickProviderId;
    setDraft(buildDraft(nextKind, nextProvider, existingNames, Boolean(initialMainModel)));
    setFeedback(null);
  }, [draft.provider, existingNames, initialMainModel]);

  const handleProviderChange = useCallback((value: string) => {
    const nextProvider = value as QuickProviderId;
    setDraft(buildDraft(draft.kind, nextProvider, existingNames, Boolean(initialMainModel)));
    setFeedback(null);
  }, [draft.kind, existingNames, initialMainModel]);

  const validateDraft = useCallback(() => {
    if (!draft.apiKeys.trim()) {
      return '请输入 API Key / API Keys。';
    }

    if (draft.kind === 'extension') {
      return null;
    }

    if (!normalizedIdentifier) {
      return '请输入标识名。';
    }
    if (!/^[A-Z0-9_]+$/.test(normalizedIdentifier)) {
      return '标识名仅允许大写字母、数字和下划线。';
    }
    if (duplicateIdentifier) {
      return '该标识名已存在，请更换后再试。';
    }
    if (baseUrlRequired && !draft.baseUrl.trim()) {
      return '当前提供商必须填写 Base URL。';
    }
    if (modelListRequired && modelNames.length === 0) {
      return '请至少填写一个模型。';
    }
    if ((draft.setAsPrimary || draft.appendFallback) && !primaryCandidate) {
      return '需要先填写模型列表，才能设置主模型或备选模型。';
    }

    return null;
  }, [baseUrlRequired, draft.apiKeys, draft.appendFallback, draft.baseUrl, draft.kind, draft.setAsPrimary, duplicateIdentifier, modelListRequired, modelNames.length, normalizedIdentifier, primaryCandidate]);

  const handleSave = useCallback(async () => {
    const validationMessage = validateDraft();
    if (validationMessage) {
      setFeedback(validationMessage);
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      let payloadItems;
      if (draft.kind === 'extension') {
        payloadItems = [{ key: 'MINIMAX_API_KEYS', value: draft.apiKeys.trim(), enabled: true }];
      } else {
        const nextChannels = [
          ...initialChannels,
          {
            name: normalizedIdentifier.toLowerCase(),
            baseUrl: draft.baseUrl.trim(),
            apiKey: draft.apiKeys.trim(),
            models: draft.models.trim(),
            extraHeaders: draft.extraHeaders.trim(),
            enabled: true,
          },
        ];
        const nextMainModel = draft.setAsPrimary ? primaryCandidate : initialMainModel;
        const nextFallbackModels = draft.appendFallback
          ? mergeFallbackModels(initialFallbackModels, primaryCandidate)
          : initialFallbackModels;
        payloadItems = channelsToUpdateItems(nextChannels, initialChannels.map((channel) => channel.name), nextMainModel, nextFallbackModels);
      }

      const validateResult = await systemConfigApi.validate({ items: payloadItems });
      if (!validateResult.valid) {
        setFeedback(extractMessages(validateResult.issues) || '配置校验未通过。');
        return;
      }

      await systemConfigApi.update({
        configVersion,
        maskToken,
        reloadNow: true,
        items: payloadItems,
      });

      setIsOpen(false);
      setFeedback(null);
      onSaved();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '保存模型配置失败。');
    } finally {
      setIsSaving(false);
    }
  }, [configVersion, draft.apiKeys, draft.appendFallback, draft.baseUrl, draft.extraHeaders, draft.kind, draft.models, draft.setAsPrimary, initialChannels, initialFallbackModels, initialMainModel, maskToken, normalizedIdentifier, onSaved, primaryCandidate, validateDraft]);

  return (
    <>
      <Button type="button" onClick={openDialog} disabled={disabled}>
        <Plus className="h-4 w-4" />
        添加模型
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm" onClick={closeDialog}>
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Quick Setup</p>
                <h3 className="mt-2 text-xl font-semibold text-foreground">添加模型</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">单入口快速配置模型渠道或 MiniMax 扩展能力。保存时主写 `LLM_CHANNELS` / `LLM_&lt;NAME&gt;_*`，不会自动同步旧版兼容 key。</p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={closeDialog}
                aria-label="关闭弹窗"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Select
                label="配置类型"
                value={draft.kind}
                onChange={handleKindChange}
                options={KIND_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                className="w-full"
              />
              <Select
                label="提供商"
                value={draft.provider}
                onChange={handleProviderChange}
                options={providerOptions}
                className="w-full"
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {draft.kind === 'model' ? (
                <Input
                  label="标识名"
                  value={draft.identifier}
                  onChange={(event) => updateDraft('identifier', event.target.value)}
                  placeholder={providerPreset.defaultIdentifier}
                  hint="仅允许大写字母、数字和下划线；保存时会转换成 LLM_&lt;NAME&gt;_*。"
                  error={duplicateIdentifier ? '该标识名已存在。' : undefined}
                />
              ) : (
                <div className="rounded-2xl border border-border bg-background/60 px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">扩展能力</p>
                  <p className="mt-2 text-sm text-muted-foreground">当前仅支持 MiniMax。它会写入 `MINIMAX_API_KEYS`，不会创建模型渠道。</p>
                </div>
              )}

              <Input
                label="API Key / API Keys"
                type="password"
                value={draft.apiKeys}
                onChange={(event) => updateDraft('apiKeys', event.target.value)}
                placeholder="多个 Key 用逗号分隔"
                hint="支持单 Key 或多 Key；多 Key 会按逗号分隔保存。"
              />
            </div>

            {baseUrlRequired ? (
              <div className="mt-4">
                <Input
                  label="Base URL"
                  value={draft.baseUrl}
                  onChange={(event) => updateDraft('baseUrl', event.target.value)}
                  placeholder={providerPreset.baseUrl || 'https://api.example.com/v1'}
                  hint="OpenAI 兼容类提供商通常需要填写 Base URL。"
                />
              </div>
            ) : null}

            {modelListRequired ? (
              <div className="mt-4">
                <Input
                  label="模型列表"
                  value={draft.models}
                  onChange={(event) => updateDraft('models', event.target.value)}
                  placeholder={providerPreset.placeholder || 'model-a,model-b'}
                  hint="多个模型用逗号分隔；第一个模型会用于“设为主模型 / 追加到备选模型”。"
                />
              </div>
            ) : null}

            {draft.kind === 'model' ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-input bg-background px-4 py-3 shadow-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary/20"
                      checked={draft.setAsPrimary}
                      onChange={(event) => updateDraft('setAsPrimary', event.target.checked)}
                    />
                    <span className="text-sm text-foreground">设为主模型</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-input bg-background px-4 py-3 shadow-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary/20"
                      checked={draft.appendFallback}
                      onChange={(event) => updateDraft('appendFallback', event.target.checked)}
                    />
                    <span className="text-sm text-foreground">追加到备选模型</span>
                  </label>
                </div>

                <Collapsible title="高级参数" icon={<Sparkles className="h-4 w-4" />}>
                  <div className="space-y-4 pt-2">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-foreground">额外请求头（可选）</span>
                      <textarea
                        className="min-h-[112px] w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
                        value={draft.extraHeaders}
                        onChange={(event) => updateDraft('extraHeaders', event.target.value)}
                        placeholder='例如：{"HTTP-Referer":"https://example.com"}'
                      />
                    </label>
                    <p className="text-xs leading-6 text-muted-foreground">这里用于传递 <code>LLM_&lt;NAME&gt;_EXTRA_HEADERS</code>。不需要时可以留空。</p>
                  </div>
                </Collapsible>
              </div>
            ) : null}

            {feedback ? (
              <div className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {feedback}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={closeDialog} disabled={isSaving}>
                取消
              </Button>
              <Button type="button" onClick={() => void handleSave()} isLoading={isSaving}>
                保存并应用
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
