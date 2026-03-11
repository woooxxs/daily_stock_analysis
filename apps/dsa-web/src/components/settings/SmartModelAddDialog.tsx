import { useMemo, useState } from 'react';
import type React from 'react';
import { Plus, X } from 'lucide-react';
import type { SystemConfigItem } from '../../types/systemConfig';
import { Button, Select } from '../common';
import { AI_BRAND_DEFINITIONS, collectVisibleAiBrandIds, type AiBrandId } from './modelConfigShared';

type SmartModelAddDialogProps = {
  items: SystemConfigItem[];
  configVersion: string;
  maskToken: string;
  disabled?: boolean;
  onSaved: () => void;
  onAddBrand: (brandId: AiBrandId) => void;
  availableBrandIds?: AiBrandId[];
};

export const SmartModelAddDialog: React.FC<SmartModelAddDialogProps> = ({
  items,
  disabled = false,
  onSaved,
  onAddBrand,
  availableBrandIds,
}) => {
  const configuredBrandIds = useMemo(() => collectVisibleAiBrandIds(items), [items]);
  const options = useMemo(() => {
    const ids = availableBrandIds
      ?? AI_BRAND_DEFINITIONS.filter((definition) => !configuredBrandIds.includes(definition.id)).map((definition) => definition.id);
    return AI_BRAND_DEFINITIONS
      .filter((definition) => ids.includes(definition.id))
      .map((definition) => ({ value: definition.id, label: definition.title }));
  }, [availableBrandIds, configuredBrandIds]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<AiBrandId>(options[0]?.value as AiBrandId || 'deepseek');

  const openDialog = () => {
    if (!options.length) {
      return;
    }
    setSelectedBrandId(options[0].value as AiBrandId);
    setIsOpen(true);
  };

  const closeDialog = () => setIsOpen(false);

  const handleConfirm = () => {
    if (!selectedBrandId) {
      return;
    }
    onAddBrand(selectedBrandId);
    onSaved();
    setIsOpen(false);
  };

  return (
    <>
      <Button type="button" onClick={openDialog} disabled={disabled || options.length === 0}>
        <Plus className="h-4 w-4" />
        添加模型
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={closeDialog}>
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">添加模型</h3>
                <p className="mt-2 text-sm text-muted-foreground">先选品牌，再在下面的品牌卡片里填写对应的真实配置路径。</p>
              </div>
              <button type="button" className="btn-secondary !p-2.5" onClick={closeDialog}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">模型品牌</label>
                <Select
                  value={selectedBrandId}
                  onChange={(value) => setSelectedBrandId(value as AiBrandId)}
                  options={options}
                  disabled={disabled || options.length === 0}
                  className="w-full"
                />
              </div>

              {selectedBrandId ? (
                <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                  {AI_BRAND_DEFINITIONS.find((definition) => definition.id === selectedBrandId)?.description}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={closeDialog}>
                取消
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={disabled || !selectedBrandId}>
                插入品牌条目
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
