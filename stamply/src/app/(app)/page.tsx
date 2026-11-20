import { Bell, Gift, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { setLocationAction } from "@/app/actions/customer";
import { BusinessCard } from "@/components/business-card";
import { LocationPicker } from "@/components/client";
import { Avatar, ButtonLink, Card, EmptyState, SectionHeader, StampDots } from "@/components/ui";
import { getDb } from "@/db";
import { CATEGORIES } from "@/domain/businesses";
import { myCards, myRewards, unreadCount } from "@/domain/customers";
import { discover, type DiscoverRow } from "@/domain/discovery";
import { getCurrentUser } from "@/lib/auth/session";
import { getSavedLocation } from "@/lib/location";
import { fileUrl } from "@/lib/storage";

export default async function HomePage() {
  const db = getDb();
  const [user, loc] = await Promise.all([getCurrentUser(), getSavedLocation()]);
  const base = { lat: loc?.lat, lng: loc?.lng, customerId: user?.id };

  const [forYou, nearby, popular, fresh, withOffers, cards, rewards, unread] = await Promise.all([
    discover(db, { ...base, sort: "relevance", interests: user?.interests, limit: 10 }),
    loc ? discover(db, { ...base, sort: "distance", radiusKm: 25, limit: 10 }) : Promise.resolve([] as DiscoverRow[]),
    discover(db, { ...base, sort: "popular", limit: 10 }),
    discover(db, { ...base, sort: "new", onlyNew: true, limit: 10 }),
    discover(db, { ...base, sort: loc ? "distance" : "relevance", limit: 40 }).then((r) => r.filter((b) => b.offerTitle).slice(0, 10)),
    user ? myCards(db, user.id) : Promise.resolve([]),
    user ? myRewards(db, user.id) : Promise.resolve([]),
    user ? unreadCount(db, user.id) : Promise.resolve(0),
  ]);
  const openRewards = rewards.filter((r) => r.reward.status === "available");
  const activeCards = cards.filter((c) => c.progress > 0).slice(0, 6);
  const firstName = user?.name.split(" ")[0];

  return (
    <div className="space-y-9">
      {/* Header */}
      <section className="animate-fade-up">
        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/profile" aria-label="Profil"><Avatar name={user.name} src={fileUrl(user.avatarPath)} size={44} /></Link>
          ) : (
            <Avatar name="S" size={44} color="#6c47ff" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted">{firstName ? `Hallo ${firstName} 👋` : "Willkommen bei STAMPLY"}</p>
            <LocationPicker label={loc?.label ?? null} saveAction={setLocationAction} />
          </div>
          <Link href={user ? "/notifications" : "/login?next=/notifications"} className="relative flex h-11 w-11 items-center justify-center rounded-full bg-surface shadow-card" aria-label="Benachrichtigungen">
            <Bell size={20} />
            {unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-surface bg-danger" />}
          </Link>
        </div>

        <h1 className="mt-6 text-[30px] font-bold leading-[1.1] tracking-tight sm:text-[40px]">
          Discover local.
          <br />
          <span className="bg-gradient-to-r from-[#8b6dff] to-[#5532f0] bg-clip-text text-transparent">Earn rewards.</span>
        </h1>

        <form action="/explore" className="relative mt-5">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            name="q"
            placeholder="Cafés, Barber, Nagelstudios …"
            className="h-14 w-full rounded-full border border-line bg-surface pl-12 pr-28 text-[15px] shadow-card placeholder:text-muted focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
          />
          <button className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-full bg-fg px-5 text-sm font-semibold text-bg">Suchen</button>
        </form>

        <div className="scroll-rail mt-4" role="list" aria-label="Kategorien">
          {CATEGORIES.map((c) => (
            <Link key={c.id} href={`/explore?category=${c.id}`} role="listitem" className="pressable flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium shadow-card hover:border-brand/40">
              <span aria-hidden>{c.emoji}</span> {c.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Guest hero */}
      {!user && (
        <Card className="overflow-hidden border-0 bg-[radial-gradient(120%_120%_at_100%_0%,#8b6dff_0%,#5532f0_55%,#22137a_100%)] p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="max-w-lg">
              <p className="text-sm font-semibold text-white/70">So funktioniert&apos;s</p>
              <h2 className="mt-1 text-2xl font-bold">Kaufen. Stempeln. Belohnt werden.</h2>
              <p className="mt-2 text-white/80">Fotografiere deinen Kassenbon oder scanne den Code an der Kasse – nach ein paar Besuchen wartet deine Belohnung.</p>
            </div>
            <ButtonLink href="/register" variant="secondary" className="bg-white text-[#0b0b10]">Kostenlos starten</ButtonLink>
          </div>
        </Card>
      )}

      {/* Open rewards */}
      {openRewards.length > 0 && (
        <section>
          <SectionHeader title="Deine Belohnungen" href="/rewards" />
          <div className="scroll-rail">
            {openRewards.map(({ reward, businessName }) => (
              <Link key={reward.id} href={`/rewards/${reward.id}`} className="pressable w-[260px] rounded-[1.75rem] bg-gradient-to-br from-[#8b6dff] to-[#5532f0] p-5 text-white shadow-pop">
                <Gift size={22} />
                <p className="mt-6 text-lg font-bold leading-tight">{reward.title}</p>
                <p className="mt-1 text-sm text-white/75">{businessName}</p>
                <p className="mt-4 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">Jetzt einlösen →</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Stamp cards in progress */}
      {activeCards.length > 0 && (
        <section>
          <SectionHeader title="Deine Stempelkarten" href="/cards" />
          <div className="scroll-rail">
            {activeCards.map((c) => (
              <Link key={c.programId} href={`/b/${c.slug}`} className="pressable w-[280px] rounded-[1.75rem] border border-line bg-surface p-5 shadow-card">
                <div className="flex items-center gap-3">
                  <Avatar name={c.businessName} src={fileUrl(c.logoPath)} size={36} color={c.color} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.businessName}</p>
                    <p className="truncate text-xs text-muted">{c.programName}</p>
                  </div>
                </div>
                <div className="mt-4"><StampDots progress={c.progress} required={c.stampsRequired} color={c.color} size="sm" /></div>
                <p className="mt-3 text-sm">
                  <span className="font-semibold">{c.stampsRequired - c.progress === 1 ? "Nur noch 1 Stempel!" : `Noch ${c.stampsRequired - c.progress} Stempel`}</span>
                  <span className="text-muted"> → {c.rewardTitle}</span>
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Rail title={user?.interests.length ? "Für dich empfohlen" : "Empfehlungen"} rows={forYou} href="/explore" wide />
      {loc ? (
        <Rail title="In deiner Nähe" rows={nearby} href="/explore?sort=distance" empty="Im Umkreis von 25 km gibt es noch keine Geschäfte auf STAMPLY." />
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold">Was ist in deiner Nähe?</p>
            <p className="text-sm text-muted">Wähle oben deinen Standort, um Entfernungen und Geschäfte in der Nähe zu sehen.</p>
          </div>
          <LocationPicker label={null} saveAction={setLocationAction} />
        </Card>
      )}
      <Rail title="Aktionen & Angebote" rows={withOffers} href="/explore?filter=rewards" />
      <Rail title="Beliebt" rows={popular} href="/explore?sort=popular" />
      <Rail title={<span className="inline-flex items-center gap-2">Neu auf STAMPLY <Sparkles size={18} className="text-brand" /></span>} rows={fresh} href="/explore?sort=new" />

      {forYou.length === 0 && (
        <EmptyState
          icon="🏪"
          title="Noch keine Geschäfte in deiner Gegend"
          description="STAMPLY wächst gerade. Kennst du ein Geschäft, das mitmachen sollte? Erzähl ihm von uns!"
          action={<ButtonLink href="/register/business" variant="outline">Für Unternehmen</ButtonLink>}
        />
      )}

      <p className="pb-4 text-center text-xs text-muted">
        Reihenfolge nach Entfernung, deinen Interessen und echter Aktivität – Platzierungen sind nicht käuflich.
      </p>
    </div>
  );
}

function Rail({ title, rows, href, wide, empty }: { title: React.ReactNode; rows: DiscoverRow[]; href?: string; wide?: boolean; empty?: string }) {
  if (!rows.length && !empty) return null;
  return (
    <section>
      <SectionHeader title={title} href={rows.length ? href : undefined} />
      {rows.length ? (
        <div className="scroll-rail">
          {rows.map((b) => (
            <BusinessCard key={b.id} b={b} wide={wide} />
          ))}
        </div>
      ) : (
        <p className="rounded-3xl bg-surface-2 px-5 py-4 text-sm text-muted">{empty}</p>
      )}
    </section>
  );
}
