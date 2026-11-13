import type { ReactNode } from 'react';

export const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)'];
export const SERIES_OTHER = 'var(--series-other)';

/** Recessive axis styling shared by all charts. */
export const axisProps = {
  tick: { fill: 'rgb(var(--faint))', fontSize: 11 },
  axisLine: false,
  tickLine: false,
} as const;

/** Tooltip content in VYBE style; values use text colors, the swatch carries identity. */
export function ChartTooltip({ active, payload, label, format }: { active?: boolean; payload?: { value: number; name?: string; color?: string; payload?: Record<string, unknown> }[]; label?: ReactNode; format?: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-card">
      {label !== undefined && <div className="mb-1 text-muted">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-fg num">
          {p.color && <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />}
          <span className="font-semibold">{format ? format(p.value) : p.value}</span>
          {p.name && payload.length > 1 && <span className="text-muted">{p.name}</span>}
        </div>
      ))}
    </div>
  );
}
