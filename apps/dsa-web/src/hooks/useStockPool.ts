import { useEffect, useMemo } from 'react';
import { type SaveResult, useStockPoolStore, type StockPoolQuote } from '../stores/stockPoolStore';

export type { StockPoolQuote, SaveResult };

export function useStockPool() {
  const ensureLoaded = useStockPoolStore((state) => state.ensureLoaded);
  const codes = useStockPoolStore((state) => state.codes);
  const quotesByCode = useStockPoolStore((state) => state.quotesByCode);
  const isLoading = useStockPoolStore((state) => state.isLoading);
  const isSaving = useStockPoolStore((state) => state.isSaving);
  const isRefreshingQuotes = useStockPoolStore((state) => state.isRefreshingQuotes);
  const error = useStockPoolStore((state) => state.error);
  const load = useStockPoolStore((state) => state.load);
  const refreshQuotes = useStockPoolStore((state) => state.refreshQuotes);
  const addStock = useStockPoolStore((state) => state.addStock);
  const removeStock = useStockPoolStore((state) => state.removeStock);
  const persistCodes = useStockPoolStore((state) => state.persistCodes);

  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  const items = useMemo(
    () =>
      codes.map((code) => ({
        code,
        quote: quotesByCode[code],
      })),
    [codes, quotesByCode],
  );

  return {
    codes,
    items,
    quotesByCode,
    isLoading,
    isSaving,
    isRefreshingQuotes,
    error,
    load,
    refreshQuotes,
    addStock,
    removeStock,
    persistCodes,
  };
}
