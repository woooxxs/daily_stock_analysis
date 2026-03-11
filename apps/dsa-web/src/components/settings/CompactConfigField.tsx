import { useState } from 'react';
import type React from 'react';
import { Info } from 'lucide-react';
import { EyeToggleIcon, Select } from '../common';
import type { ConfigValidationIssue, SystemConfigItem } from '../../types/systemConfig';
import { getFieldDescriptionZh, getFieldTitleZh } from '../../utils/systemConfigI18n';

function isMultiValueField(item: SystemConfigItem): boolean {
  const validation = (item.schema?.validation ?? {}) as Record<string, unknown>;
  return Boolean(validation.multiValue ?? validation.multi_value);
}

function parseMultiValues(value: string): string[] {
  if (!value) {
    return [''];
  }

  const values = value.split(',').map((entry) => entry.trim());
  return values.length ? values : [''];
}

function serializeMultiValues(values: string[]): string {
  return values.map((entry) => entry.trim()).join(',');
}

type CompactConfigFieldProps = {
  item: SystemConfigItem;
  value: string;
  disabled?: boolean;
  onChange: (key: string, value: string) => void;
  issues?: ConfigValidationIssue[];
  titleOverride?: string;
  descriptionOverride?: string;
  variant?: 'card' | 'embedded';
  showKey?: boolean;
};

export const CompactConfigField: React.FC<CompactConfigFieldProps> = ({
  item,
  value,
  disabled = false,
  onChange,
  issues = [],
  titleOverride,
  descriptionOverride,
  variant = 'card',
  showKey = true,
}) => {
  const shouldShowKey = showKey;
  const schema = item.schema;
  const label = titleOverride || getFieldTitleZh(item.key, item.key);
  const helpText = descriptionOverride ?? getFieldDescriptionZh(item.key);
  const controlType = schema?.uiControl ?? 'text';
  const inputType = schema?.dataType === 'integer' || schema?.dataType === 'number' ? 'number' : 'text';
  const isSensitive = Boolean(schema?.isSensitive);
  const isMultiValue = isMultiValueField(item);
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const [isPasswordEditable, setIsPasswordEditable] = useState(false);

  const commonClass = 'input-terminal w-full';

  const renderControl = () => {
    if (controlType === 'switch') {
      const checked = value.trim().toLowerCase() === 'true';
      return (
        <div className="flex justify-end">
          <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-input bg-background px-3 py-2 shadow-sm">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={checked}
              disabled={disabled || !schema?.isEditable}
              onChange={(event) => onChange(item.key, event.target.checked ? 'true' : 'false')}
            />
            <div className="relative h-6 w-11 rounded-full bg-input transition-all after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-disabled:opacity-50" />
            <span className="text-sm text-muted-foreground">{checked ? '已启用' : '未启用'}</span>
          </label>
        </div>
      );
    }

    if (controlType === 'select' && schema?.options?.length) {
      return (
        <Select
          value={value}
          onChange={(nextValue) => onChange(item.key, nextValue)}
          options={schema.options.map((option) => ({ value: option, label: option }))}
          disabled={disabled || !schema.isEditable}
          className="w-full"
        />
      );
    }

    if (controlType === 'textarea') {
      return (
        <textarea
          className={`${commonClass} min-h-[112px] resize-y`}
          value={value}
          disabled={disabled || !schema?.isEditable}
          onChange={(event) => onChange(item.key, event.target.value)}
        />
      );
    }

    if (controlType === 'password') {
      if (isMultiValue) {
        const values = parseMultiValues(value);
        return (
          <div className="space-y-3">
            {values.map((entry, index) => (
              <div key={`${item.key}-${index}`} className="flex items-center gap-2">
                <input
                  type={isSecretVisible ? 'text' : 'password'}
                  readOnly={!isPasswordEditable}
                  onFocus={() => setIsPasswordEditable(true)}
                  className={`${commonClass} flex-1 font-mono`}
                  value={entry}
                  disabled={disabled || !schema?.isEditable}
                  onChange={(event) => {
                    const nextValues = [...values];
                    nextValues[index] = event.target.value;
                    onChange(item.key, serializeMultiValues(nextValues));
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary !p-2.5 shrink-0"
                  disabled={disabled || !schema?.isEditable}
                  onClick={() => setIsSecretVisible((previous) => !previous)}
                  title={isSecretVisible ? '隐藏' : '显示'}
                  aria-label={isSecretVisible ? '隐藏密码' : '显示密码'}
                >
                  <EyeToggleIcon visible={isSecretVisible} />
                </button>
                <button
                  type="button"
                  className="btn-secondary !px-3 !py-2.5 text-xs shrink-0"
                  disabled={disabled || !schema?.isEditable || values.length <= 1}
                  onClick={() => {
                    const nextValues = values.filter((_, rowIndex) => rowIndex !== index);
                    onChange(item.key, serializeMultiValues(nextValues.length ? nextValues : ['']));
                  }}
                >
                  删除
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary !px-3 !py-2.5 text-xs"
              disabled={disabled || !schema?.isEditable}
              onClick={() => onChange(item.key, serializeMultiValues([...values, '']))}
            >
              添加 Key
            </button>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-2">
          <input
            type={isSecretVisible ? 'text' : 'password'}
            readOnly={!isPasswordEditable}
            onFocus={() => setIsPasswordEditable(true)}
            className={`${commonClass} flex-1 font-mono`}
            value={value}
            disabled={disabled || !schema?.isEditable}
            onChange={(event) => onChange(item.key, event.target.value)}
          />
          <button
            type="button"
            className="btn-secondary !p-2.5 shrink-0"
            disabled={disabled || !schema?.isEditable}
            onClick={() => setIsSecretVisible((previous) => !previous)}
            title={isSecretVisible ? '隐藏' : '显示'}
            aria-label={isSecretVisible ? '隐藏密码' : '显示密码'}
          >
            <EyeToggleIcon visible={isSecretVisible} />
          </button>
        </div>
      );
    }

    return (
      <input
        type={controlType === 'time' ? 'time' : inputType}
        className={commonClass}
        value={value}
        disabled={disabled || !schema?.isEditable}
        onChange={(event) => onChange(item.key, event.target.value)}
      />
    );
  };

  const containerClassName = variant === 'embedded'
    ? 'grid gap-4 px-1 py-5 md:grid-cols-[220px_minmax(0,1fr)] md:gap-6'
    : 'grid gap-2 rounded-2xl border border-border bg-background/60 px-4 py-3 md:grid-cols-[220px_minmax(0,1fr)]';

  return (
    <div className={containerClassName}>
      <div className="flex items-start gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          {shouldShowKey ? <p className="mt-1 text-xs text-muted-foreground">{item.key}</p> : null}
          {variant !== 'embedded' && helpText ? (
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{helpText}</p>
          ) : null}
        </div>
        {helpText ? (
          <span className="group relative mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground">
            <Info size={12} />
            <span className="pointer-events-none absolute left-1/2 top-6 z-20 w-64 -translate-x-1/2 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
              {helpText}
            </span>
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        {renderControl()}
        {isSensitive ? (
          <p className="text-xs text-muted-foreground">敏感字段默认保持遮罩，聚焦后即可开始编辑。</p>
        ) : null}
        {issues.length ? <p className="text-xs text-destructive">{issues[0]?.message}</p> : null}
      </div>
    </div>
  );
};
