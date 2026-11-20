import { Gift, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import type { DiscoverRow } from "@/domain/discovery";
import { categoryEmoji, categoryLabel } from "@/domain/businesses";
import { formatDistance } from "@/lib/geo";
import { fileUrl } from "@/lib/storage";
import { cn, gradientFor } from "@/lib/utils";
import { Avatar, Badge, StampDots } from "./ui";

export function Cover({ path, seed, color, emoji, className }: { path: string | null; seed: string; color?: string | null; emoji?: string; className?: string }) {
  const url = fileUrl(path);
  return (
    <div className={cn("relative overflow-hidden", className)} style={url ? undefined : { background: gradientFor(seed, color) }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-6xl opacity-90 drop-shadow-sm" aria-hidden>
          {emoji}
        </span>
      )}
    </div>
  );
}

/** Large card for horizontal rails on the home screen. */
export function BusinessCard({ b, wide }: { b: DiscoverRow; wide?: boolean }) {
  const distance = formatDistance(b.distanceM);
  return (
    <Link
      href={`/b/${b.slug}`}
      className={cn(
        "pressable group block overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-card hover:shadow-pop",
        wide ? "w-[300px] sm:w-[340px]" : "w-[260px] sm:w-[280px]",
      )}
    >
      <div className="relative">
        <Cover path={b.coverPath} seed={b.slug} color={b.color} emoji={categoryEmoji(b.category)} className="h-36" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {b.isNew && <Badge tone="dark"><Sparkles size={12} /> Neu</Badge>}
          {b.isDemo && <Badge tone="dark">Demo</Badge>}
        </div>
        {b.offerTitle && (
          <div className="absolute bottom-3 left-3 right-3">
            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#0b0b10] shadow">
              <Gift size={13} className="shrink-0 text-[#6c47ff]" />
              <span className="truncate">{b.offerNewCustomers ? "Neukunden: " : ""}{b.offerTitle}</span>
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Avatar name={b.name} src={fileUrl(b.logoPath)} size={40} color={b.color} className="ring-2 ring-surface" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[16px] font-semibold leading-tight">{b.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted">
              {categoryLabel(b.category)}
              {distance && (
                <>
                  <span aria-hidden>·</span>
                  <MapPin size={12} /> {distance}
                </>
              )}
              {!distance && b.city && <><span aria-hidden>·</span> {b.city}</>}
            </p>
          </div>
        </div>
        {b.stampsRequired ? (
          <div className="mt-3 rounded-2xl bg-surface-2 px-3 py-2.5">
            <p className="truncate text-[13px] font-medium">
              <span className="text-brand">{b.stampsRequired} Stempel</span> → {b.rewardTitle}
            </p>
            {b.progress !== null && b.progress > 0 && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <StampDots progress={b.progress} required={b.stampsRequired} color={b.color} size="sm" />
                <span className="text-xs font-semibold text-muted">{b.progress}/{b.stampsRequired}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl bg-surface-2 px-3 py-2.5 text-[13px] text-muted">Noch kein Treueprogramm aktiv</p>
        )}
      </div>
    </Link>
  );
}

/** Compact row for lists. */
export function BusinessRow({ b }: { b: DiscoverRow }) {
  const distance = formatDistance(b.distanceM);
  return (
    <Link href={`/b/${b.slug}`} className="pressable flex items-center gap-4 rounded-3xl border border-line bg-surface p-3 shadow-card hover:shadow-pop">
      <Cover path={b.coverPath} seed={b.slug} color={b.color} emoji={categoryEmoji(b.category)} className="h-20 w-20 shrink-0 rounded-2xl [&_span]:text-3xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold">{b.name}</h3>
          {b.isNew && <Badge tone="brand">Neu</Badge>}
          {b.isDemo && <Badge>Demo</Badge>}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">
          {categoryLabel(b.category)}
          {distance ? ` · ${distance}` : b.city ? ` · ${b.city}` : ""}
        </p>
        {b.stampsRequired && (
          <p className="mt-1 truncate text-[13px] font-medium">
            <span className="text-brand">{b.progress ? `${b.progress}/${b.stampsRequired}` : `${b.stampsRequired} Stempel`}</span> → {b.rewardTitle}
          </p>
        )}
      </div>
    </Link>
  );
}
