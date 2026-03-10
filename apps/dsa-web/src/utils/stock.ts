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

const BULLISH_TOKENS = ['强烈看多', '强势多头', '多头排列', '弱势多头', '看多', '看涨', '多头', '上涨', '上行', '上攻', '反弹', '走强', '偏强', '短期向好', 'bullish', 'buy'];
const BEARISH_TOKENS = ['强烈看空', '强势空头', '空头排列', '弱势空头', '看空', '看跌', '空头', '下跌', '下行', '下探', '回调', '走弱', '偏空', '偏弱', '短期走弱', 'bearish', 'sell'];
const NEUTRAL_TOKENS = ['震荡整理', '震荡', '中性', '观望', '盘整', '横盘', '整理', 'wait', 'neutral'];

const TREND_DISPLAY_MAP: Array<{ label: string; category: TrendCategory; tokens: string[] }> = [
  { label: '强烈看多', category: 'bullish', tokens: ['强烈看多'] },
  { label: '强势多头', category: 'bullish', tokens: ['强势多头'] },
  { label: '多头排列 📈', category: 'bullish', tokens: ['多头排列'] },
  { label: '弱势多头', category: 'bullish', tokens: ['弱势多头'] },
  { label: '看多', category: 'bullish', tokens: ['看多', '看涨'] },
  { label: '上涨', category: 'bullish', tokens: ['上涨', '上行', '上攻', '反弹', '走强', '短期向好'] },
  { label: '强烈看空', category: 'bearish', tokens: ['强烈看空'] },
  { label: '强势空头', category: 'bearish', tokens: ['强势空头'] },
  { label: '空头排列 📉', category: 'bearish', tokens: ['空头排列'] },
  { label: '弱势空头', category: 'bearish', tokens: ['弱势空头'] },
  { label: '看空', category: 'bearish', tokens: ['看空', '看跌'] },
  { label: '下行', category: 'bearish', tokens: ['下行', '下跌', '下探', '走弱', '短期走弱'] },
  { label: '震荡整理 ↔️', category: 'neutral', tokens: ['震荡整理'] },
  { label: '震荡', category: 'neutral', tokens: ['震荡'] },
  { label: '中性', category: 'neutral', tokens: ['中性'] },
  { label: '观望', category: 'neutral', tokens: ['观望'] },
  { label: '盘整', category: 'neutral', tokens: ['盘整', '横盘', '整理'] },
];

function stripTrendDecorators(value: string): string {
  let normalizedValue = value
    .replaceAll('```json', '')
    .replaceAll('```', '')
    .replaceAll('**', '')
    .replaceAll('__', '')
    .replaceAll('📈', '')
    .replaceAll('📉', '')
    .replaceAll('↔️', '')
    .trim();

  normalizedValue = normalizedValue.replace(/^[\s\-*#>·•:：=【】()（）]+/u, '').trim();

  let previousValue = '';
  while (previousValue !== normalizedValue) {
    previousValue = normalizedValue;
    normalizedValue = normalizedValue
      .replace(/^(趋势预测|趋势|预测|方向|trend_prediction|trend)\s*[:：=·•\-*\s]*/iu, '')
      .trim();
  }

  return normalizedValue;
}

export function sanitizeTrendPrediction(value?: string | null): string {
  if (!value) {
    return '';
  }

  const cleanedValue = stripTrendDecorators(value);
  if (!cleanedValue) {
    return '';
  }

  const matchedDisplay = TREND_DISPLAY_MAP.find((item) => item.tokens.some((token) => cleanedValue.toLowerCase().includes(token.toLowerCase())));
  return matchedDisplay?.label || cleanedValue;
}

export function normalizeTrendCategory(value?: string | null): TrendCategory {
  if (!value) {
    return 'unknown';
  }

  const normalizedValue = stripTrendDecorators(value).toLowerCase();
  if (!normalizedValue) {
    return 'unknown';
  }

  if (BULLISH_TOKENS.some((token) => normalizedValue.includes(token.toLowerCase()))) {
    return 'bullish';
  }

  if (BEARISH_TOKENS.some((token) => normalizedValue.includes(token.toLowerCase()))) {
    return 'bearish';
  }

  if (NEUTRAL_TOKENS.some((token) => normalizedValue.includes(token.toLowerCase()))) {
    return 'neutral';
  }

  return 'unknown';
}

export function resolveStockSubtitle(stockCode: string, stockName?: string | null): string {
  const displayName = resolveDisplayStockName(stockCode, stockName);
  return displayName === stockCode ? stockCode : `${displayName} · ${stockCode}`;
}
