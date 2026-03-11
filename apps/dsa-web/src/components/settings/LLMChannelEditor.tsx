import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { Check, ChevronDown, Settings2, Sparkles } from 'lucide-react';
import type { SystemConfigItem } from '../../types/systemConfig';
import { cn } from '../../utils/cn';
import { Button, Select } from '../common';
import { CompactConfigField } from './CompactConfigField';
import { buildItemsByKey, collectKnownModels, parseModelNames } from './modelConfigShared';

type LLMChannelEditorProps = {
  items: SystemConfigItem[];
  onChangeField: (key: string, value: string) => void;
  disabled?: boolean;
};

type SelectOption = {
  value: string;
  label: string;
};

type MultiSelectDropdownProps = {
  options: SelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
};

const PROVIDER_PRIORITY_PLACEHOLDER = 'gemini,anthropic,openai';

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  values,
  onChange,
  placeholder = '请选择',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const selectedSet = useMemo(() => new Set(values), [values]);
  const filteredOptions = !normalizedQuery
    ? options
    : options.filter((option) => option.label.toLowerCase().includes(normalizedQuery) || option.value.toLowerCase().includes(normalizedQuery));

  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const dropdownWidth = rect.width;
    const left = Math.min(rect.left, Math.max(8, viewportWidth - dropdownWidth - 8));

    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left: Math.max(8, left),
      width: dropdownWidth,
      zIndex: 90,
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateDropdownPosition();

    const handleReposition = () => updateDropdownPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updateDropdownPosition]);

  const toggleValue = useCallback((nextValue: string) => {
    const nextValues = selectedSet.has(nextValue)
      ? values.filter((value) => value !== nextValue)
      : [...values, nextValue];
    onChange(nextValues);
  }, [onChange, selectedSet, values]);

  const triggerLabel = useMemo(() => {
    if (!values.length) {
      return placeholder;
    }

    const selectedLabels = options
      .filter((option) => selectedSet.has(option.value))
      .map((option) => option.label);
    if (selectedLabels.length <= 2) {
      return selectedLabels.join('，');
    }
    return `已选择 ${selectedLabels.length} 个模型`;
  }, [options, placeholder, selectedSet, values.length]);

  const dropdown = isOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
        >
          <div className="border-b border-border p-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder="搜索模型"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
              autoFocus
            />
          </div>
          <ul className="max-h-64 overflow-auto py-1 text-base sm:text-sm" role="listbox" tabIndex={-1} aria-multiselectable="true">
            {filteredOptions.length === 0 ? (
              <li className="relative cursor-default select-none py-2 pl-3 pr-9 text-muted-foreground italic">无匹配模型</li>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedSet.has(option.value);
                return (
                  <li
                    key={option.value}
                    className="relative cursor-default select-none py-2.5 pl-10 pr-4 text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleValue(option.value)}
                  >
                    <span className={cn('block truncate', isSelected ? 'font-semibold' : 'font-normal')}>{option.label}</span>
                    {isSelected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="flex flex-col" ref={containerRef}>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          className={cn(
            'relative w-full rounded-xl border border-input bg-background py-2.5 pl-3 pr-10 text-left text-foreground shadow-sm transition-all',
            'focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 sm:text-sm sm:leading-6',
            disabled ? 'cursor-not-allowed bg-muted opacity-50' : 'cursor-pointer',
          )}
          onClick={() => {
            if (!disabled) {
              setSearchQuery('');
              setIsOpen((previous) => !previous);
            }
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          disabled={disabled}
        >
          <span className={cn('block truncate', !values.length && 'text-muted-foreground')}>{triggerLabel}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </span>
        </button>
      </div>
      {dropdown}
    </div>
  );
};

function renderTopFieldCard(title: string, keyName: string, control: React.ReactNode, description?: string) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{keyName}</p>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {control}
    </div>
  );
}

export const LLMChannelEditor: React.FC<LLMChannelEditorProps> = ({
  items,
  onChangeField,
  disabled = false,
}) => {
  const itemsByKey = useMemo(() => buildItemsByKey(items), [items]);
  const availableModels = useMemo(() => collectKnownModels(items), [items]);
  const [showVisionCompatDialog, setShowVisionCompatDialog] = useState(false);

  const mainModelItem = itemsByKey.LITELLM_MODEL;
  const fallbackModelsItem = itemsByKey.LITELLM_FALLBACK_MODELS;
  const visionModelItem = itemsByKey.VISION_MODEL;
  const visionPriorityItem = itemsByKey.VISION_PROVIDER_PRIORITY;
  const openAIVisionItem = itemsByKey.OPENAI_VISION_MODEL;

  const modelOptions = useMemo<SelectOption[]>(() => [
    { value: '', label: '不指定' },
    ...availableModels.map((model) => ({ value: model, label: model })),
  ], [availableModels]);

  const fallbackValues = useMemo(() => parseModelNames(fallbackModelsItem?.value || ''), [fallbackModelsItem?.value]);

  return (
    <div className="space-y-4 p-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">主模型 / 备选模型 / 视觉模型</h3>
          <p className="mt-1 text-sm text-muted-foreground">主模型改为单选下拉，备选模型改为多选下拉；视觉兼容项收进独立按钮里。</p>
        </div>
        {availableModels.length ? (
          <div className="max-w-xl">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              已识别模型
            </p>
            <div className="flex flex-wrap gap-2">
              {availableModels.map((model) => (
                <span key={model} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                  {model}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {mainModelItem ? renderTopFieldCard(
          '主模型',
          'LITELLM_MODEL',
          <Select
            value={mainModelItem.value}
            onChange={(value) => onChangeField('LITELLM_MODEL', value)}
            options={modelOptions}
            disabled={disabled}
            searchable
            className="w-full"
          />,
          '从当前已识别模型中选择唯一主模型。',
        ) : null}

        {fallbackModelsItem ? renderTopFieldCard(
          '备选模型',
          'LITELLM_FALLBACK_MODELS',
          <MultiSelectDropdown
            options={availableModels.map((model) => ({ value: model, label: model }))}
            values={fallbackValues}
            onChange={(values) => onChangeField('LITELLM_FALLBACK_MODELS', values.join(','))}
            placeholder="未选择备选模型"
            disabled={disabled}
          />,
          '可同时选择多个备选模型，保存时会写回逗号分隔值。',
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {visionModelItem ? renderTopFieldCard(
          '视觉模型',
          'VISION_MODEL',
          <Select
            value={visionModelItem.value}
            onChange={(value) => onChangeField('VISION_MODEL', value)}
            options={modelOptions}
            disabled={disabled}
            searchable
            className="w-full"
          />,
          '图片识别专用模型，可与主模型分开配置。',
        ) : null}

        <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">视觉提供商优先级</p>
            <p className="mt-1 text-xs text-muted-foreground">VISION_PROVIDER_PRIORITY</p>
            <p className="mt-2 text-sm text-muted-foreground">按供应商顺序填写回退链路，兼容视觉模型通过按钮单独配置。</p>
          </div>
          <input
            type="text"
            className="input-terminal w-full"
            value={visionPriorityItem?.value || ''}
            onChange={(event) => onChangeField('VISION_PROVIDER_PRIORITY', event.target.value)}
            placeholder={PROVIDER_PRIORITY_PLACEHOLDER}
            disabled={disabled || !visionPriorityItem}
          />
          {openAIVisionItem ? (
            <Button type="button" variant="secondary" onClick={() => setShowVisionCompatDialog(true)} disabled={disabled}>
              <Settings2 className="h-4 w-4" />
              兼容视觉模型
            </Button>
          ) : null}
        </div>
      </div>

      {showVisionCompatDialog && openAIVisionItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowVisionCompatDialog(false)}>
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">视觉兼容配置</h3>
                <p className="mt-2 text-sm text-muted-foreground">这里单独维护 `OPENAI_VISION_MODEL`，避免和主视觉配置混在一起。</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setShowVisionCompatDialog(false)}>
                关闭
              </Button>
            </div>

            <div className="mt-5 space-y-2">
              <CompactConfigField
                item={openAIVisionItem}
                value={openAIVisionItem.value}
                disabled={disabled}
                onChange={onChangeField}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
