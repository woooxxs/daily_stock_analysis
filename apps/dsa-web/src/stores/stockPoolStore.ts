import { create } from 'zustand';
import { stocksApi, type StockQuoteResponse } from '../api/stocks';
import { systemConfigApi, SystemConfigConflictError } from '../api/systemConfig';
import { validateStockCode } from '../utils/validation';

export type StockPoolQuote = StockQuoteResponse & {
  error?: string;
};

export type SaveResult = {
  success: boolean;
  error?: string;
};

type StockPoolStore = {
  codes: string[];
  quotesByCode: Record<string, StockPoolQuote>;
  configVersion: string;
  maskToken: string;
  isLoading: boolean;
  isSaving: boolean;
  isRefreshingQuotes: boolean;
  error: string | null;
  hasLoaded: boolean;
  ensureLoaded: () => Promise<void>;
  load: (force?: boolean) => Promise<void>;
  refreshQuotes: (targetCodes?: string[]) => Promise<void>;
  persistCodes: (nextCodes: string[]) => Promise<SaveResult>;
  addStock: (code: string) => Promise<SaveResult>;
  removeStock: (code: string) => Promise<SaveResult>;
};

let loadPromise: Promise<void> | null = null;
let refreshPromise: Promise<void> | null = null;
let refreshPromiseKey = '';

function normalizeCodes(rawCodes: string[]): string[] {
  const uniqueCodes = new Set<string>();

  rawCodes.forEach((code) => {
    const normalized = code.trim().toUpperCase();
    if (normalized) {
      uniqueCodes.add(normalized);
    }
  });

  return [...uniqueCodes];
}

function parseStockList(value: string): string[] {
  return normalizeCodes(value.split(','));
}

async function fetchQuotes(nextCodes: string[]): Promise<Record<string, StockPoolQuote>> {
  const results = await Promise.allSettled(nextCodes.map((code) => stocksApi.getQuote(code)));
  const nextQuotes: Record<string, StockPoolQuote> = {};

  results.forEach((result, index) => {
    const code = nextCodes[index];
    if (result.status === 'fulfilled') {
      nextQuotes[code] = result.value;
      return;
    }

    nextQuotes[code] = {
      stockCode: code,
      currentPrice: 0,
      error: result.reason instanceof Error ? result.reason.message : 'Quote unavailable',
    };
  });

  return nextQuotes;
}

export const useStockPoolStore = create<StockPoolStore>((set, get) => ({
  codes: [],
  quotesByCode: {},
  configVersion: '',
  maskToken: '******',
  isLoading: false,
  isSaving: false,
  isRefreshingQuotes: false,
  error: null,
  hasLoaded: false,

  ensureLoaded: async () => {
    if (get().hasLoaded) {
      return;
    }

    await get().load(false);
  },

  load: async (force = true) => {
    if (!force && get().hasLoaded) {
      return;
    }

    if (loadPromise) {
      return loadPromise;
    }

    set({ isLoading: true, error: null });

    loadPromise = (async () => {
      try {
        const config = await systemConfigApi.getConfig(true);
        const stockListValue = config.items.find((item) => item.key === 'STOCK_LIST')?.value ?? '';
        const nextCodes = parseStockList(stockListValue);

        set({
          codes: nextCodes,
          configVersion: config.configVersion,
          maskToken: config.maskToken || '******',
          hasLoaded: true,
        });

        await get().refreshQuotes(nextCodes);
      } catch (loadError) {
        set({ error: loadError instanceof Error ? loadError.message : '加载自选股失败' });
      } finally {
        set({ isLoading: false });
        loadPromise = null;
      }
    })();

    return loadPromise;
  },

  refreshQuotes: async (targetCodes) => {
    const nextCodes = normalizeCodes(targetCodes ?? get().codes);

    if (nextCodes.length === 0) {
      set({ quotesByCode: {}, isRefreshingQuotes: false });
      return;
    }

    const nextKey = nextCodes.join(',');
    if (refreshPromise && refreshPromiseKey === nextKey) {
      return refreshPromise;
    }

    set({ isRefreshingQuotes: true });
    refreshPromiseKey = nextKey;
    refreshPromise = (async () => {
      try {
        const nextQuotes = await fetchQuotes(nextCodes);
        set({ quotesByCode: nextQuotes });
      } finally {
        set({ isRefreshingQuotes: false });
        refreshPromise = null;
        refreshPromiseKey = '';
      }
    })();

    return refreshPromise;
  },

  persistCodes: async (nextCodes) => {
    const normalizedCodes = normalizeCodes(nextCodes);
    const { configVersion, maskToken, load } = get();

    set({ isSaving: true, error: null });

    try {
      await systemConfigApi.update({
        configVersion,
        maskToken,
        reloadNow: true,
        items: [
          {
            key: 'STOCK_LIST',
            value: normalizedCodes.join(','),
          },
        ],
      });

      await load(true);
      return { success: true };
    } catch (saveError) {
      if (saveError instanceof SystemConfigConflictError) {
        await load(true);
        return { success: false, error: '配置已更新，请重新尝试一次' };
      }

      const message = saveError instanceof Error ? saveError.message : '保存自选股失败';
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ isSaving: false });
    }
  },

  addStock: async (code) => {
    const validation = validateStockCode(code);
    if (!validation.valid || !validation.normalized) {
      return { success: false, error: validation.message || '无效的股票代码' };
    }

    const codes = get().codes;
    if (codes.includes(validation.normalized)) {
      return { success: false, error: '该股票已在自选列表中' };
    }

    return get().persistCodes([...codes, validation.normalized]);
  },

  removeStock: async (code) => {
    const codes = get().codes;
    return get().persistCodes(codes.filter((item) => item !== code.toUpperCase()));
  },
}));
