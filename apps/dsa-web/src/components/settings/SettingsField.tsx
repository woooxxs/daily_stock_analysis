import { useState } from 'react';
import type React from 'react';
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

interface SettingsFieldProps {
  item: SystemConfigItem;
  value: string;
  disabled?: boolean;
  managedHint?: string;
  onChange: (key: string, value: string) => void;
  issues?: ConfigValidationIssue[];
}

function renderFieldControl(
  item: SystemConfigItem,
  value: string,
  disabled: boolean,
  onChange: (nextValue: string) => void,
  isSecretVisible: boolean,
  onToggleSecretVisible: () => void,
  isPasswordEditable: boolean,
  onPasswordFocus: () => void,
) {
  const schema = item.schema;
  const commonClass = 'input-terminal w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const controlType = schema?.uiControl ?? 'text';
  const isMultiValue = isMultiValueField(item);

  if (controlType === 'textarea') {
    return (
      <textarea
        className={`${commonClass} min-h-[112px] resize-y`}
        value={value}
        disabled={disabled || !schema?.isEditable}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (controlType === 'select' && schema?.options?.length) {
    return (
      <Select
        value={value}
        onChange={onChange}
        options={schema.options.map((option) => ({ value: option, label: option }))}
        disabled={disabled || !schema.isEditable}
        placeholder="请选择"
        className="w-full"
      />
    );
  }

  if (controlType === 'switch') {
    const checked = value.trim().toLowerCase() === 'true';
    return (
      <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-input bg-background px-4 py-3 shadow-sm">
        <div className="relative inline-flex items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            disabled={disabled || !schema?.isEditable}
            onChange={(event) => onChange(event.target.checked ? 'true' : 'false')}
          />
          <div className="h-6 w-11 rounded-full bg-input transition-all after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-disabled:opacity-50 peer-focus:ring-4 peer-focus:ring-primary/10" />
        </div>
        <span className={`text-sm font-medium ${checked ? 'text-primary' : 'text-muted-foreground'}`}>
          {checked ? '已启用' : '未启用'}
        </span>
      </label>
    );
  }

  if (controlType === 'password') {
    if (isMultiValue) {
      const values = parseMultiValues(value);

      return (
        <div className="space-y-3">
          {values.map((entry, index) => (
            <div className="flex items-center gap-2" key={`${item.key}-${index}`}>
              <input
                type={isSecretVisible ? 'text' : 'password'}
                readOnly={!isPasswordEditable}
                onFocus={onPasswordFocus}
                className={`${commonClass} flex-1 font-mono`}
                value={entry}
                disabled={disabled || !schema?.isEditable}
                onChange={(event) => {
                  const nextValues = [...values];
                  nextValues[index] = event.target.value;
                  onChange(serializeMultiValues(nextValues));
                }}
              />
              <button
                type="button"
                className="btn-secondary !p-2.5 shrink-0"
                disabled={disabled || !schema?.isEditable}
                onClick={onToggleSecretVisible}
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
                  onChange(serializeMultiValues(nextValues.length ? nextValues : ['']));
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
            onClick={() => onChange(serializeMultiValues([...values, '']))}
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
          onFocus={onPasswordFocus}
          className={`${commonClass} flex-1 font-mono`}
          value={value}
          disabled={disabled || !schema?.isEditable}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="btn-secondary !p-2.5 shrink-0"
          disabled={disabled || !schema?.isEditable}
          onClick={onToggleSecretVisible}
          title={isSecretVisible ? '隐藏' : '显示'}
          aria-label={isSecretVisible ? '隐藏密码' : '显示密码'}
        >
          <EyeToggleIcon visible={isSecretVisible} />
        </button>
      </div>
    );
  }

  const inputType = controlType === 'number' ? 'number' : controlType === 'time' ? 'time' : 'text';

  return (
    <input
      type={inputType}
      className={commonClass}
      value={value}
      disabled={disabled || !schema?.isEditable}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export const SettingsField: React.FC<SettingsFieldProps> = ({
  item,
  value,
  disabled = false,
  managedHint,
  onChange,
  issues = [],
}) => {
  const schema = item.schema;
  const title = getFieldTitleZh(item.key, item.key);
  const description = getFieldDescriptionZh(item.key);
  const hasError = issues.some((issue) => issue.severity === 'error');
  const hasWarning = issues.some((issue) => issue.severity === 'warning');
  const isManagedExternally = Boolean(managedHint);
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const [isPasswordEditable, setIsPasswordEditable] = useState(false);

  return (
    <div
      className={[
        'rounded-[24px] border p-4 shadow-sm transition-all md:p-5',
        hasError
          ? 'border-destructive/30 bg-destructive/[0.04]'
          : hasWarning
            ? 'border-warning/30 bg-warning/[0.04]'
            : 'border-border bg-background/70 hover:border-primary/20 hover:bg-background/90',
      ].join(' ')}
    >
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,260px)_1fr] lg:gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {schema?.isRequired ? (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                必填
              </span>
            ) : null}
            {schema?.isSensitive ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                敏感字段
              </span>
            ) : null}
            {hasError ? (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                错误
              </span>
            ) : null}
            {!hasError && hasWarning ? (
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                提示
              </span>
            ) : null}
          </div>

          {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}

          <div className="flex flex-wrap gap-2 text-[11px] font-medium text-muted-foreground">
            <span className="rounded-full border border-border bg-card px-2.5 py-1">{schema?.uiControl ?? 'text'}</span>
            <span className="rounded-full border border-border bg-card px-2.5 py-1">{schema?.dataType ?? 'string'}</span>
            {isManagedExternally ? (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-primary">工作台管理</span>
            ) : schema?.isEditable ? (
              <span className="rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-success">可编辑</span>
            ) : (
              <span className="rounded-full border border-border bg-card px-2.5 py-1">只读</span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {renderFieldControl(
            item,
            value,
            disabled || isManagedExternally,
            (val) => onChange(item.key, val),
            isSecretVisible,
            () => setIsSecretVisible(!isSecretVisible),
            isPasswordEditable,
            () => setIsPasswordEditable(true),
          )}

          {managedHint ? <p className="text-xs leading-6 text-primary">{managedHint}</p> : null}

          {schema?.isSensitive ? (
            <p className="text-xs leading-6 text-muted-foreground">
              敏感字段默认保持遮罩，聚焦后即可开始编辑；保存前请再次确认内容无误。
            </p>
          ) : null}

          {issues.length ? (
            <div className="space-y-2">
              {issues.map((issue, index) => (
                <div
                  key={index}
                  className={[
                    'rounded-2xl border px-3 py-2 text-xs leading-6',
                    issue.severity === 'error'
                      ? 'border-destructive/20 bg-destructive/10 text-destructive'
                      : 'border-warning/20 bg-warning/10 text-warning',
                  ].join(' ')}
                >
                  {issue.message}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
