/** Minimal accessible bar chart (server-rendered SVG, no chart library needed). */
export function BarChart({ data, label }: { data: { day: string; stamps: number; redeemed: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.stamps));
  const total = data.reduce((s, d) => s + d.stamps, 0);
  return (
    <figure>
      <div className="flex h-44 items-end gap-[3px]" role="img" aria-label={`${label}: insgesamt ${total} Stempel in ${data.length} Tagen`}>
        {data.map((d) => {
          const h = (d.stamps / max) * 100;
          return (
            <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
              <div
                className="w-full rounded-t-md bg-brand/85 transition group-hover:bg-brand"
                style={{ height: `${Math.max(d.stamps ? 4 : 1.5, h)}%`, opacity: d.stamps ? 1 : 0.25 }}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-fg px-2 py-1 text-[11px] font-medium text-bg group-hover:block">
                {new Date(d.day).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}: {d.stamps} Stempel · {d.redeemed} eingelöst
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-2 flex justify-between text-xs text-muted">
        <span>{data[0] && new Date(data[0].day).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}</span>
        <span>Heute</span>
      </figcaption>
    </figure>
  );
}
