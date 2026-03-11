import { useMemo } from 'react';
import type React from 'react';
import { Sparkles } from 'lucide-react';
import type { SystemConfigItem } from '../../types/systemConfig';
import { CompactConfigField } from './CompactConfigField';
import { AI_TOP_KEYS, buildItemsByKey, collectKnownModels } from './modelConfigShared';

type LLMChannelEditorProps = {
  items: SystemConfigItem[];
  onChangeField: (key: string, value: string) => void;
  disabled?: boolean;
};

const TOP_FIELD_ORDER = [...AI_TOP_KEYS];

export const LLMChannelEditor: React.FC<LLMChannelEditorProps> = ({
  items,
  onChangeField,
  disabled = false,
}) => {
  const itemsByKey = useMemo(() => buildItemsByKey(items), [items]);
  const topItems = useMemo(
    () => TOP_FIELD_ORDER.map((key) => itemsByKey[key]).filter((item): item is SystemConfigItem => Boolean(item)),
    [itemsByKey],
  );
  const availableModels = useMemo(() => collectKnownModels(items), [items]);

  return (
    <div className="space-y-4 p-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">主模型 / 备选模型 / 视觉模型</h3>
          <p className="mt-1 text-sm text-muted-foreground">这里只保留模型路由与视觉模型的核心设置，不再混排其他兼容键。</p>
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

      <div className="space-y-2">
        {topItems.map((item) => (
          <CompactConfigField
            key={item.key}
            item={item}
            value={item.value}
            disabled={disabled}
            onChange={onChangeField}
          />
        ))}
      </div>
    </div>
  );
};
