import type { VybeData } from '@/domain/types';
import { emptyData } from '@/domain/content';

export const EXPORT_FORMAT = 'vybe-export';

export function exportJson(data: VybeData): string {
  return JSON.stringify({ format: EXPORT_FORMAT, exportedAt: new Date().toISOString(), data }, null, 2);
}

const isArr = (v: unknown) => Array.isArray(v);

/** Validates an export file. Unknown/missing fields fall back to defaults; structural errors are rejected. */
export function validateImport(json: string): { ok: true; data: VybeData } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'invalid_json' };
  }
  const obj = parsed as { format?: string; data?: Partial<VybeData> };
  if (!obj || obj.format !== EXPORT_FORMAT || typeof obj.data !== 'object' || !obj.data) return { ok: false, error: 'invalid_format' };
  const d = obj.data;
  for (const k of ['missions', 'habits', 'transactions', 'ledger'] as const) {
    if (d[k] !== undefined && !isArr(d[k])) return { ok: false, error: 'invalid_format' };
  }
  const base = emptyData(d.settings?.lang ?? 'de');
  return {
    ok: true,
    data: { ...base, ...d, version: 1, settings: { ...base.settings, ...(d.settings ?? {}) } } as VybeData,
  };
}
