import type { ChatSessionItem } from '../api/agent';

export type SessionStockMap = Record<string, string>;

export const STORAGE_KEY_SESSION = 'dsa_chat_session_id';
export const STORAGE_KEY_SESSION_STOCK_MAP = 'dsa_chat_session_stock_map';
export const DEFAULT_STOCK_CODE = '__DEFAULT__';
export const DEFAULT_STOCK_LABEL = '默认分组';
export const DEFAULT_STOCK_DESCRIPTION = '未匹配到股票代码的对话';

export function isDefaultStockCode(value?: string | null): boolean {
  return value === DEFAULT_STOCK_CODE;
}

export function readSessionStockMap(): SessionStockMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION_STOCK_MAP);
    return raw ? (JSON.parse(raw) as SessionStockMap) : {};
  } catch {
    return {};
  }
}

export function persistSessionStockMap(map: SessionStockMap) {
  localStorage.setItem(STORAGE_KEY_SESSION_STOCK_MAP, JSON.stringify(map));
}

export function normalizeStockCode(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.trim().toUpperCase() || null;
}

export function inferStockCodeFromText(text: string, knownCodes: string[]): string | null {
  const normalizedText = text.toUpperCase();

  for (const code of knownCodes) {
    if (normalizedText.includes(code.toUpperCase())) {
      return code.toUpperCase();
    }
  }

  const aShareMatch = normalizedText.match(/\b\d{6}\b/);
  if (aShareMatch) {
    return aShareMatch[0];
  }

  const hkMatch = normalizedText.match(/\bHK0?\d{4,5}\b/);
  if (hkMatch) {
    return hkMatch[0];
  }

  const usMatch = normalizedText.match(/\b[A-Z]{2,5}\b/);
  if (usMatch) {
    return usMatch[0];
  }

  return null;
}

export function resolveSessionStockCodeValue(
  session: Pick<ChatSessionItem, 'session_id' | 'title'>,
  sessionStockMap: SessionStockMap,
  knownCodes: string[],
): string {
  const mapped = sessionStockMap[session.session_id];
  if (mapped) {
    return mapped;
  }

  return inferStockCodeFromText(session.title, knownCodes) || DEFAULT_STOCK_CODE;
}
