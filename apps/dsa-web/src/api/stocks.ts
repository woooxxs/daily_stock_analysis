import apiClient from './index';
import { toCamelCase } from './utils';

export type ExtractFromImageResponse = {
  codes: string[];
  rawText?: string;
};

export type StockQuoteResponse = {
  stockCode: string;
  stockName?: string;
  currentPrice: number;
  change?: number;
  changePercent?: number;
  updateTime?: string;
};

export const stocksApi = {
  async getQuote(stockCode: string): Promise<StockQuoteResponse> {
    try {
      const response = await apiClient.get<Record<string, unknown>>(`/api/v1/stocks/${stockCode}/quote`);
      return toCamelCase<StockQuoteResponse>(response.data);
    } catch (error: unknown) {
      const axiosError =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } })
          : null;
      const message = axiosError?.response?.data?.message;
      throw new Error(message || '获取实时行情失败');
    }
  },

  async extractFromImage(file: File): Promise<ExtractFromImageResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: { [key: string]: string | undefined } = { 'Content-Type': undefined };
    const response = await apiClient.post('/api/v1/stocks/extract-from-image', formData, {
      headers,
      timeout: 60000,
    });

    const data = response.data as { codes?: string[]; raw_text?: string };
    return {
      codes: data.codes ?? [],
      rawText: data.raw_text,
    };
  },
};
