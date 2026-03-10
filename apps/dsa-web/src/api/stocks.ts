import apiClient from './index';
import { toCamelCase } from './utils';

export type ExtractItem = {
  code?: string | null;
  name?: string | null;
  confidence: string;
};

export type ExtractFromImageResponse = {
  codes: string[];
  items?: ExtractItem[];
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

    const data = response.data as { codes?: string[]; items?: ExtractItem[]; raw_text?: string };
    return {
      codes: data.codes ?? [],
      items: data.items,
      rawText: data.raw_text,
    };
  },

  async parseImport(file?: File, text?: string): Promise<ExtractFromImageResponse> {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      const headers: { [key: string]: string | undefined } = { 'Content-Type': undefined };
      const response = await apiClient.post('/api/v1/stocks/parse-import', formData, { headers });
      const data = response.data as { codes?: string[]; items?: ExtractItem[] };
      return { codes: data.codes ?? [], items: data.items };
    }
    if (text) {
      const response = await apiClient.post('/api/v1/stocks/parse-import', { text });
      const data = response.data as { codes?: string[]; items?: ExtractItem[] };
      return { codes: data.codes ?? [], items: data.items };
    }
    throw new Error('请提供文件或粘贴文本');
  },
};
