import { List, Map as MapIcon, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { setLocationAction } from "@/app/actions/customer";
import { BusinessRow } from "@/components/business-card";
import { LocationPicker } from "@/components/client";
import { LazyMap } from "@/components/map-lazy";
import { EmptyState, PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { CATEGORIES, categoryEmoji, categoryLabel } from "@/domain/businesses";
import { discover, type DiscoverSort } from "@/domain/discovery";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDistance } from "@/lib/geo";
import { getSavedLocation } from "@/lib/location";
import { cn } from "@/lib/utils";

export const metadata = { title: "Entdecken" };

type SP = { q?: string; category?: string; sort?: string; radius?: string; view?: string; filter?: string };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [user, loc] = await Promise.all([getCurrentUser(), getSavedLocation()]);
  const sort = (["relevance", "distance", "popular", "new"].includes(sp.sort ?? "") ? sp.sort : "relevance") as DiscoverSort;
  const radius = sp.radius ? Number(sp.radius) : null;
  const view = sp.view === "map" ? "map" : "list";
  const category = CATEGORIES.some((c) => c.id === sp.category) ? sp.category! : null;

  const rows = await discover(getDb(), {
    lat: loc?.lat,
    lng: loc?.lng,
    q: sp.q,
    category,
    sort,
    radiusKm: loc && radius ? radius : null,
    customerId: user?.id,
    interests: user?.interests,
    onlyWithRewards: sp.filter === "rewards",
    onlyNew: sp.filter === "new",
    onlyFavorites: sp.filter === "favorites",
    limit: 60,
  });

  const href = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/explore?${p.toString()}`;
  };
  const chip = (active: boolean) =>
    cn("whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition", active ? "border-transparent bg-fg text-bg" : "border-line bg-surface hover:bg-surface-2");

  const points = rows
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({
      id: r.id,
      lat: r.lat!,
      lng: r.lng!,
      title: r.name,
      subtitle: [categoryLabel(r.category), formatDistance(r.distanceM)].filter(Boolean).join(" · "),
      href: `/b/${r.slug}`,
      emoji: categoryEmoji(r.category),
    }));

  return (
    <div>
      <PageHeader title="Entdecken" description="Lokale Geschäfte mit Treueprogramm – in deiner Nähe." action={<LocationPicker label={loc?.label ?? null} saveAction={setLocationAction} />} />

      <form action="/explore" className="relative">
        {category && <input type="hidden" name="category" value={category} />}
        {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
        {sp.view && <input type="hidden" name="view" value={sp.view} />}
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={sp.q} placeholder="Name, Stadt oder Straße" className="h-13 w-full rounded-full border border-line bg-surface pl-12 pr-4 text-[15px] shadow-card focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15" />
      </form>

      <div className="scroll-rail mt-4">
        <Link href={href({ category: undefined })} className={chip(!category)}>Alle</Link>
        {CATEGORIES.map((c) => (
          <Link key={c.id} href={href({ category: c.id })} className={chip(category === c.id)}>
            {c.emoji} {c.label}
          </Link>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SlidersHorizontal size={16} className="text-muted" />
        {(
          [
            ["relevance", "Relevanz"],
            ["distance", "Entfernung"],
            ["popular", "Beliebt"],
            ["new", "Neu"],
          ] as const
        ).map(([id, label]) => (
          <Link key={id} href={href({ sort: id })} className={chip(sort === id)} aria-disabled={id === "distance" && !loc}>
            {label}
          </Link>
        ))}
        <span className="mx-1 h-5 w-px bg-line" />
        <Link href={href({ filter: sp.filter === "rewards" ? undefined : "rewards" })} className={chip(sp.filter === "rewards")}>🎁 Mit Belohnung</Link>
        {user && <Link href={href({ filter: sp.filter === "favorites" ? undefined : "favorites" })} className={chip(sp.filter === "favorites")}>♥ Favoriten</Link>}
        {loc &&
          [1, 3, 10].map((km) => (
            <Link key={km} href={href({ radius: radius === km ? undefined : String(km) })} className={chip(radius === km)}>
              ≤ {km} km
            </Link>
          ))}
        <div className="ml-auto inline-flex rounded-full bg-surface-2 p-1">
          <Link href={href({ view: undefined })} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium", view === "list" ? "bg-surface shadow-card" : "text-muted")}>
            <List size={16} /> Liste
          </Link>
          <Link href={href({ view: "map" })} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium", view === "map" ? "bg-surface shadow-card" : "text-muted")}>
            <MapIcon size={16} /> Karte
          </Link>
        </div>
      </div>

      {!loc && (
        <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">
          Ohne Standort zeigen wir keine Entfernungen an. Wähle oben deinen Standort für Entfernung, Umkreis und „In der Nähe“.
        </p>
      )}

      <p className="mt-5 text-sm text-muted">{rows.length} {rows.length === 1 ? "Ergebnis" : "Ergebnisse"}</p>

      {rows.length === 0 ? (
        <div className="mt-3">
          <EmptyState icon="🔎" title="Keine Treffer" description="Versuche es mit einer anderen Kategorie, einem größeren Umkreis oder einem anderen Suchbegriff." />
        </div>
      ) : view === "map" ? (
        <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="h-[60vh] overflow-hidden rounded-3xl border border-line shadow-card lg:h-[70vh]">
            <LazyMap points={points} center={loc} className="h-full w-full" />
          </div>
          <div className="space-y-3 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1">
            {rows.map((b) => <BusinessRow key={b.id} b={b} />)}
          </div>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((b) => <BusinessRow key={b.id} b={b} />)}
        </div>
      )}
    </div>
  );
}
