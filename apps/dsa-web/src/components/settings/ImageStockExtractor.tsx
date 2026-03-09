import type React from 'react';
import { useCallback, useState } from 'react';
import { stocksApi } from '../../api/stocks';
import { systemConfigApi, SystemConfigConflictError } from '../../api/systemConfig';

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface ImageStockExtractorProps {
  stockListValue: string;
  configVersion: string;
  maskToken: string;
  onMerged: () => void;
  disabled?: boolean;
  embedded?: boolean;
}

export const ImageStockExtractor: React.FC<ImageStockExtractorProps> = ({
  stockListValue,
  configVersion,
  maskToken,
  onMerged,
  disabled,
  embedded = false,
}) => {
  const [codes, setCodes] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const parseCurrentList = useCallback(() => {
    return stockListValue
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
  }, [stockListValue]);

  const handleFile = useCallback(
    async (file: File) => {
      const ext = `.${file.name.split('.').pop() ?? ''}`.toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        setError('仅支持 JPG、PNG、WebP、GIF 格式');
        return;
      }
      if (file.size > MAX_SIZE) {
        setError('图片不超过 5MB');
        return;
      }

      setError(null);
      setIsExtracting(true);
      try {
        const res = await stocksApi.extractFromImage(file);
        setCodes(res.codes ?? []);
      } catch (e) {
        const err = e && typeof e === 'object' ? e as { code?: string; response?: { data?: { message?: string }; status?: number } } : null;
        const resp = err?.response ?? null;
        const msg = resp?.data?.message ?? null;
        let fallback = '识别失败，请重试';
        if (resp?.status === 429) fallback = '请求过于频繁，请稍后再试';
        else if (err?.code === 'ECONNABORTED') fallback = '请求超时，请检查网络后重试';
        setError(msg || fallback);
        setCodes([]);
      } finally {
        setIsExtracting(false);
      }
    },
    [],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) void handleFile(f);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) void handleFile(f);
      e.target.value = '';
    },
    [handleFile],
  );

  const removeCode = useCallback((code: string) => {
    setCodes((prev) => prev.filter((c) => c !== code));
  }, []);

  const mergeToWatchlist = useCallback(async () => {
    if (codes.length === 0) return;
    if (!configVersion) {
      setError('请先加载配置后再合并');
      return;
    }
    const current = parseCurrentList();
    const merged = [...new Set([...current, ...codes])];
    const value = merged.join(',');

    setIsMerging(true);
    setError(null);
    try {
      await systemConfigApi.update({
        configVersion,
        maskToken,
        reloadNow: true,
        items: [{ key: 'STOCK_LIST', value }],
      });
      setCodes([]);
      onMerged();
    } catch (e) {
      if (e instanceof SystemConfigConflictError) {
        onMerged();
        setError('配置已更新，请再次点击「合并到自选股」');
      } else {
        setError(e instanceof Error ? e.message : '合并保存失败');
      }
    } finally {
      setIsMerging(false);
    }
  }, [codes, configVersion, maskToken, onMerged, parseCurrentList]);

  const content = (
    <>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`mb-3 flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/50'
        } ${disabled || isExtracting ? 'cursor-not-allowed opacity-60' : ''}`}
        onClick={() => !disabled && !isExtracting && document.getElementById('img-upload')?.click()}
      >
        <input
          id="img-upload"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif"
          className="hidden"
          onChange={onFileInput}
          disabled={disabled || isExtracting}
        />
        {isExtracting ? (
          <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
            <span className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></span>
            识别中...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            {embedded ? (
              <p className="text-sm font-medium text-foreground">点击或拖拽上传图片</p>
            ) : (
              <div>
                <p className="text-sm font-medium text-foreground">点击或拖拽上传图片</p>
                <p className="mt-1 text-xs text-muted-foreground">支持 JPG、PNG、WebP、GIF，单张不超过 5MB</p>
              </div>
            )}
          </div>
        )}
      </div>

      {error ? (
        <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      {codes.length > 0 ? (
        <div className="space-y-3">
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
            ⚠️ 建议人工逐条核对后再合并，识别结果可能有误
          </p>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">识别结果（可删除不需要的项）：</p>
            <div className="flex flex-wrap gap-2">
              {codes.map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/30"
                >
                  {code}
                  <button
                    type="button"
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    onClick={() => removeCode(code)}
                    disabled={disabled}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="btn-primary mt-2"
            onClick={() => void mergeToWatchlist()}
            disabled={disabled || isMerging}
          >
            {isMerging ? '保存中...' : '合并到自选股'}
          </button>
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 transition-colors hover:bg-card/60">
      <p className="mb-2 text-sm font-bold text-foreground">从图片添加</p>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        上传自选股截图，自动识别股票代码。需配置 Gemini、Anthropic 或 OpenAI API Key 方可使用。建议人工核对后再合并。
      </p>
      {content}
    </div>
  );
};
