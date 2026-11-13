import { addDays, startOfWeek, todayKey } from '@/lib/date';
import { formatDate } from '@/lib/format';
import type { Lang } from '@/domain/types';
import { cn } from '@/lib/cn';

/**
 * GitHub-style calendar heatmap. `values` maps day -> intensity (0..1).
 * Cells within `editableDays` of today are buttons (retroactive logging).
 */
export function Heatmap({ values, weeks = 12, color, lang, onToggle, editableDays = 0 }: { values: Record<string, number>; weeks?: number; color: string; lang: Lang; onToggle?: (day: string) => void; editableDays?: number }) {
  const today = todayKey();
  const start = addDays(startOfWeek(today), -(weeks - 1) * 7);
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const minEditable = addDays(today, -editableDays);
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[5px]" role="grid">
        {cols.map((days, i) => (
          <div key={i} className="flex flex-col gap-[5px]" role="row">
            {days.map((d) => {
              const v = values[d] ?? 0;
              const future = d > today;
              const editable = !!onToggle && !future && d >= minEditable;
              const style = { background: v > 0 ? `rgb(${color} / ${0.25 + v * 0.75})` : 'rgb(var(--line) / 0.07)' };
              const label = `${formatDate(d, lang, { weekday: 'short', day: 'numeric', month: 'short' })}${v > 0 ? ' ✓' : ''}`;
              return editable ? (
                <button key={d} role="gridcell" aria-label={label} aria-pressed={v > 0} title={label} onClick={() => onToggle!(d)}
                  className={cn('h-[15px] w-[15px] rounded-[4px] transition hover:ring-2 hover:ring-accent/50', d === today && 'ring-1 ring-fg/40')} style={style} />
              ) : (
                <span key={d} role="gridcell" aria-label={label} title={label} className={cn('h-[15px] w-[15px] rounded-[4px]', future && 'opacity-30')} style={style} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
