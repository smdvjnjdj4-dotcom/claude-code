import { Clock, AtSign, Globe, Mail, MapPin, Phone, Stamp } from "lucide-react";
import { notFound } from "next/navigation";
import { Cover } from "@/components/business-card";
import { LazyMap } from "@/components/map-lazy";
import { ConsentToggle, RelationButtons } from "@/components/relation-buttons";
import { Avatar, Badge, ButtonLink, Card, CardBody, CardHeader, StampDots } from "@/components/ui";
import { getDb } from "@/db";
import { categoryEmoji, categoryLabel } from "@/domain/businesses";
import { consentText } from "@/domain/consent";
import { getBusinessPublic, recordProfileView } from "@/domain/discovery";
import { describeReward } from "@/domain/programs";
import { clientKey, getCurrentUser } from "@/lib/auth/session";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { DAYS, formatHours, openNow } from "@/lib/hours";
import { getSavedLocation } from "@/lib/location";
import { fileUrl } from "@/lib/storage";
import { formatDate, formatEuro } from "@/lib/time";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getBusinessPublic(getDb(), slug);
  return { title: data?.business.name ?? "Unternehmen", description: data?.business.description.slice(0, 160) };
}

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const [user, loc] = await Promise.all([getCurrentUser(), getSavedLocation()]);
  const data = await getBusinessPublic(db, slug, user?.id);
  if (!data) notFound();
  const { business: b, locations, programs, images, offers, relation } = data;
  await recordProfileView(db, b.id, user?.id ?? (await clientKey())).catch(() => {});

  const primary = locations[0];
  const dist = loc && primary?.lat != null && primary.lng != null ? formatDistance(distanceMeters(loc, { lat: primary.lat, lng: primary.lng })) : null;
  const open = openNow(primary?.openingHours);
  const path = `/b/${b.slug}`;
  const color = programs[0]?.color ?? null;

  return (
    <div className="-mx-4 -mt-4 md:mx-0 md:mt-0">
      <div className="relative">
        <Cover path={b.coverPath} seed={b.slug} color={color} emoji={categoryEmoji(b.category)} className="h-56 md:h-72 md:rounded-[2rem] [&_span]:text-7xl" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent md:rounded-b-[2rem]" />
      </div>

      <div className="relative px-4 md:px-0">
        <div className="-mt-12 flex items-end gap-4">
          <Avatar name={b.name} src={fileUrl(b.logoPath)} size={92} color={color} className="ring-4 ring-bg shadow-card" />
          <div className="mb-1 ml-auto"><RelationButtons businessId={b.id} favorite={relation.favorite} following={relation.following} loggedIn={!!user} path={path} /></div>
        </div>

        <div className="mt-4 animate-fade-up">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] font-bold tracking-tight">{b.name}</h1>
            {b.isDemo && <Badge>Demo-Unternehmen</Badge>}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-muted">
            <span>{categoryLabel(b.category)}</span>
            {primary?.city && <><span aria-hidden>·</span><span className="inline-flex items-center gap-1"><MapPin size={14} />{primary.city}</span></>}
            {dist && <><span aria-hidden>·</span><span>{dist}</span></>}
            {open !== null && <><span aria-hidden>·</span><Badge tone={open ? "success" : "neutral"}>{open ? "Jetzt geöffnet" : "Geschlossen"}</Badge></>}
          </p>
          {b.description && <p className="mt-4 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed">{b.description}</p>}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Offers */}
            {offers.length > 0 && (
              <section className="space-y-3">
                {offers.map((o) => (
                  <div key={o.id} className="rounded-3xl bg-gradient-to-br from-[#8b6dff] to-[#5532f0] p-5 text-white shadow-pop">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/75">
                      {o.newCustomersOnly ? "Neukunden-Aktion" : "Aktion"}
                      {o.endsAt && <span className="normal-case tracking-normal">· bis {formatDate(o.endsAt)}</span>}
                    </div>
                    <p className="mt-1 text-lg font-bold">{o.title}</p>
                    {o.description && <p className="mt-1 text-sm text-white/80">{o.description}</p>}
                    {o.newCustomersOnly && !relation.isNewCustomer && <p className="mt-2 text-xs text-white/70">Gilt nur für deinen ersten Besuch.</p>}
                  </div>
                ))}
              </section>
            )}

            {/* Programs */}
            {programs.length === 0 ? (
              <Card className="p-6 text-sm text-muted">Dieses Geschäft hat gerade kein aktives Treueprogramm.</Card>
            ) : (
              programs.map((p) => {
                const progress = relation.progress[p.id] ?? 0;
                return (
                  <Card key={p.id} className="overflow-hidden">
                    <div className="h-2" style={{ background: p.color }} />
                    <CardBody>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-muted">{p.name}</p>
                          <p className="mt-1 text-xl font-bold">{describeReward(p)}</p>
                          <p className="mt-1 text-sm text-muted">nach {p.stampsRequired} Stempeln{p.minPurchaseCents > 0 ? ` · ab ${formatEuro(p.minPurchaseCents)} Einkauf` : ""}</p>
                        </div>
                        {user && <Badge tone="brand">{progress}/{p.stampsRequired}</Badge>}
                      </div>
                      <div className="mt-5"><StampDots progress={progress} required={p.stampsRequired} color={p.color} /></div>
                      {p.description && <p className="mt-4 text-sm text-muted">{p.description}</p>}
                      <ButtonLink href={user ? `/b/${b.slug}/collect?program=${p.id}` : `/login?next=${encodeURIComponent(`/b/${b.slug}/collect?program=${p.id}`)}`} className="mt-5 w-full sm:w-auto" size="lg">
                        <Stamp size={18} /> Stempel sammeln
                      </ButtonLink>
                      <details className="mt-4 text-sm text-muted">
                        <summary className="cursor-pointer font-medium text-fg">Bedingungen</summary>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          <li>Max. {p.maxStampsPerDay} Stempel pro Tag</li>
                          {p.stampValidityDays && <li>Stempel sind {p.stampValidityDays} Tage gültig</li>}
                          {p.rewardValidityDays && <li>Belohnung ist {p.rewardValidityDays} Tage einlösbar</li>}
                          {p.eligibleItems && <li>Gilt für: {p.eligibleItems}</li>}
                          {p.endsAt && <li>Programm läuft bis {formatDate(p.endsAt)}</li>}
                          {p.redemptionTerms && <li>{p.redemptionTerms}</li>}
                        </ul>
                      </details>
                    </CardBody>
                  </Card>
                );
              })
            )}

            {images.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold">Eindrücke</h2>
                <div className="scroll-rail">
                  {images.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={img.id} src={fileUrl(img.path)!} alt="" loading="lazy" className="h-48 w-72 rounded-3xl object-cover" />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            {user?.accountType !== "business" && (
              <ConsentToggle businessId={b.id} businessName={b.name} granted={relation.consent} loggedIn={!!user} path={path} consentText={consentText(b.name)} />
            )}
            <Card>
              <CardHeader title="Info & Kontakt" />
              <CardBody className="space-y-3 text-[15px]">
                {locations.map((l) => (
                  <div key={l.id} className="flex gap-3">
                    <MapPin size={18} className="mt-0.5 shrink-0 text-muted" />
                    <div>
                      {locations.length > 1 && <p className="font-medium">{l.name}</p>}
                      <p>{l.street}</p>
                      <p className="text-muted">{l.postalCode} {l.city}</p>
                    </div>
                  </div>
                ))}
                {b.phone && <a href={`tel:${b.phone}`} className="flex items-center gap-3 hover:text-brand"><Phone size={18} className="text-muted" /> {b.phone}</a>}
                {b.email && <a href={`mailto:${b.email}`} className="flex items-center gap-3 hover:text-brand"><Mail size={18} className="text-muted" /> {b.email}</a>}
                {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-3 hover:text-brand"><Globe size={18} className="text-muted" /> Website</a>}
                {b.instagram && <a href={`https://instagram.com/${b.instagram}`} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-3 hover:text-brand"><AtSign size={18} className="text-muted" /> @{b.instagram}</a>}
              </CardBody>
            </Card>
            {primary?.openingHours && (
              <Card>
                <CardHeader title={<span className="inline-flex items-center gap-2"><Clock size={17} /> Öffnungszeiten</span>} />
                <CardBody>
                  <dl className="space-y-1.5 text-sm">
                    {DAYS.map(([k, label]) => (
                      <div key={k} className="flex justify-between gap-4">
                        <dt className="text-muted">{label}</dt>
                        <dd className="font-medium tabular-nums">{formatHours(primary.openingHours?.[k])}</dd>
                      </div>
                    ))}
                  </dl>
                </CardBody>
              </Card>
            )}
            {locations.some((l) => l.lat != null) && (
              <div className="h-56 overflow-hidden rounded-3xl border border-line shadow-card">
                <LazyMap
                  className="h-full w-full"
                  zoom={15}
                  points={locations.filter((l) => l.lat != null).map((l) => ({ id: l.id, lat: l.lat!, lng: l.lng!, title: b.name, subtitle: `${l.street}, ${l.city}`, emoji: categoryEmoji(b.category) }))}
                  center={null}
                />
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
