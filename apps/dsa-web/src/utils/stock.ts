export const COMMON_STOCK_NAME_MAP: Record<string, string> = {
  AAPL: '苹果',
  TSLA: '特斯拉',
  MSFT: '微软',
  GOOGL: '谷歌A',
  GOOG: '谷歌C',
  AMZN: '亚马逊',
  NVDA: '英伟达',
  META: 'Meta',
  AMD: 'AMD',
  INTC: '英特尔',
  BABA: '阿里巴巴',
  PDD: '拼多多',
  JD: '京东',
  BIDU: '百度',
  NIO: '蔚来',
  XPEV: '小鹏汽车',
  LI: '理想汽车',
  COIN: 'Coinbase',
  MSTR: 'MicroStrategy',
  VOO: '标普500ETF',
  SPY: '标普500ETF',
  QQQ: '纳斯达克100ETF',
  DIA: '道琼斯工业平均ETF',
  '00700': '腾讯控股',
  '03690': '美团',
  '01810': '小米集团',
  '09988': '阿里巴巴',
  '09618': '京东集团',
};

const PLACEHOLDER_NAMES = new Set(['N/A', 'NA', 'NONE', 'NULL', '--', '-', 'UNKNOWN', 'TICKER']);

export function isMeaningfulStockName(name?: string | null, stockCode?: string): boolean {
  if (!name) {
    return false;
  }

  const normalizedName = name.trim();
  if (!normalizedName) {
    return false;
  }

  if (normalizedName.startsWith('股票')) {
    return false;
  }

  const normalizedCode = (stockCode || '').trim().toUpperCase();
  if (normalizedCode && normalizedName.toUpperCase() === normalizedCode) {
    return false;
  }

  return !PLACEHOLDER_NAMES.has(normalizedName.toUpperCase());
}

export function resolveDisplayStockName(stockCode: string, ...candidates: Array<string | null | undefined>): string {
  const normalizedCode = stockCode.trim().toUpperCase();
  const name = candidates.find((candidate) => isMeaningfulStockName(candidate, normalizedCode));

  if (name) {
    return name.trim();
  }

  return COMMON_STOCK_NAME_MAP[normalizedCode] || normalizedCode;
}

export type TrendCategory = 'bullish' | 'bearish' | 'neutral' | 'unknown';

const BULLISH_TOKENS = ['强烈看多', '强势多头', '弱势多头', '看多', '多头', '上涨', '反弹', '走强', '偏强'];
const BEARISH_TOKENS = ['强烈看空', '强势空头', '弱势空头', '看空', '空头', '下跌', '回调', '走弱', '偏弱'];
const NEUTRAL_TOKENS = ['震荡整理', '震荡', '中性', '观望', '盘整', '横盘', '整理'];

export function normalizeTrendCategory(value?: string | null): TrendCategory {
  if (!value) {
    return 'unknown';
  }

  const normalizedValue = value.replaceAll('📈', '').replaceAll('📉', '').replaceAll('↔️', '').trim();

  if (BULLISH_TOKENS.some((token) => normalizedValue.includes(token))) {
    return 'bullish';
  }

  if (BEARISH_TOKENS.some((token) => normalizedValue.includes(token))) {
    return 'bearish';
  }

  if (NEUTRAL_TOKENS.some((token) => normalizedValue.includes(token))) {
    return 'neutral';
  }

  return 'unknown';
}

export function resolveStockSubtitle(stockCode: string, stockName?: string | null): string {
  const displayName = resolveDisplayStockName(stockCode, stockName);
  return displayName === stockCode ? stockCode : `${displayName} · ${stockCode}`;
}
