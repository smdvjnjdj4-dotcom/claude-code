import { ExternalLink } from "lucide-react";
import { eq } from "drizzle-orm";
import { saveLocationAction, updateProfileAction, uploadImageAction } from "@/app/actions/business";
import { Cover } from "@/components/business-card";
import { ActionForm, Field } from "@/components/forms";
import { LocationFields } from "@/components/location-fields";
import { GalleryRemove, LocationDelete, PublishToggle } from "@/components/profile-controls";
import { Avatar, ButtonLink, Card, CardBody, CardHeader, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { getDb } from "@/db";
import { businessImages } from "@/db/schema";
import { CATEGORIES, categoryEmoji, listLocations } from "@/domain/businesses";
import { requireBusiness } from "@/lib/auth/session";
import { entitlements } from "@/lib/plans";
import { fileUrl } from "@/lib/storage";

export const metadata = { title: "Mein Unternehmen" };

export default async function BusinessProfilePage() {
  const ctx = await requireBusiness("business.edit");
  const b = ctx.business;
  const db = getDb();
  const [locations, images] = await Promise.all([listLocations(db, b.id), db.select().from(businessImages).where(eq(businessImages.businessId, b.id)).orderBy(businessImages.sort)]);
  const maxLoc = entitlements(b.plan).maxLocations;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mein Unternehmen"
        description="So sehen dich Kund:innen auf STAMPLY."
        action={b.published ? <ButtonLink href={`/b/${b.slug}`} variant="outline" target="_blank"><ExternalLink size={16} /> Profil ansehen</ButtonLink> : undefined}
      />

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold">{b.published ? "Dein Profil ist öffentlich sichtbar" : "Dein Profil ist noch nicht sichtbar"}</p>
            <p className="text-sm text-muted">{b.published ? "Kund:innen finden dich in Suche, Karte und Empfehlungen." : "Veröffentliche dein Profil, sobald Standort und Treueprogramm bereit sind."}</p>
          </div>
          <PublishToggle published={b.published} />
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <div className="relative">
          <Cover path={b.coverPath} seed={b.slug} emoji={categoryEmoji(b.category)} className="h-44" />
          <div className="absolute -bottom-8 left-6"><Avatar name={b.name} src={fileUrl(b.logoPath)} size={80} className="ring-4 ring-surface" /></div>
        </div>
        <CardBody className="grid gap-4 pt-12 sm:grid-cols-2">
          {(["logo", "cover"] as const).map((kind) => (
            <ActionForm key={kind} action={uploadImageAction} submitLabel={kind === "logo" ? "Logo hochladen" : "Titelbild hochladen"} submitVariant="outline">
              <input type="hidden" name="kind" value={kind} />
              <Field label={kind === "logo" ? "Logo" : "Titelbild"} name="file" hint={kind === "logo" ? "Quadratisch, mind. 256 × 256 px" : "Querformat, z. B. 1600 × 900 px"}>
                <Input type="file" name="file" accept="image/*" required className="h-auto py-2.5" />
              </Field>
            </ActionForm>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Profil & Kontakt" />
        <CardBody>
          <ActionForm action={updateProfileAction} submitLabel="Speichern">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" name="name"><Input id="name" name="name" defaultValue={b.name} required /></Field>
              <Field label="Kategorie" name="category">
                <Select id="category" name="category" defaultValue={b.category}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}</Select>
              </Field>
            </div>
            <Field label="Beschreibung" name="description" hint="Was macht dich besonders? 2–4 Sätze reichen."><Textarea id="description" name="description" defaultValue={b.description} rows={4} maxLength={1200} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Telefon" name="phone"><Input id="phone" name="phone" type="tel" defaultValue={b.phone ?? ""} /></Field>
              <Field label="E-Mail" name="email"><Input id="email" name="email" type="email" defaultValue={b.email ?? ""} /></Field>
              <Field label="Website" name="website"><Input id="website" name="website" type="url" placeholder="https://" defaultValue={b.website ?? ""} /></Field>
              <Field label="Instagram" name="instagram"><Input id="instagram" name="instagram" placeholder="@deincafe" defaultValue={b.instagram ?? ""} /></Field>
            </div>
          </ActionForm>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Standorte & Öffnungszeiten" description={`${locations.length} von ${maxLoc} Standort${maxLoc > 1 ? "en" : ""} in deinem Tarif`} />
        <CardBody className="space-y-8">
          {locations.map((l) => (
            <div key={l.id} className="rounded-3xl border border-line p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold">{l.name}{l.isPrimary && <span className="ml-2 text-xs font-normal text-muted">Hauptstandort</span>}</p>
                {!l.isPrimary && <LocationDelete id={l.id} />}
              </div>
              <ActionForm action={saveLocationAction} submitLabel="Standort speichern" submitVariant="outline">
                <input type="hidden" name="locationId" value={l.id} />
                <LocationFields withName initial={{ ...l }} />
              </ActionForm>
            </div>
          ))}
          {locations.length < maxLoc ? (
            <details className="rounded-3xl border border-dashed border-line p-4 sm:p-5">
              <summary className="cursor-pointer font-semibold text-brand">+ Weiteren Standort hinzufügen</summary>
              <div className="mt-4">
                <ActionForm action={saveLocationAction} submitLabel="Standort anlegen">
                  <LocationFields withName initial={{ name: "" }} />
                </ActionForm>
              </div>
            </details>
          ) : (
            <p className="text-sm text-muted">Mehrere Standorte sind im Premium-Tarif verfügbar.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Bilder" description="Zeige dein Geschäft, deine Produkte, dein Team. Max. 12 Bilder." />
        <CardBody>
          {images.length > 0 && (
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((img) => (
                <div key={img.id} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fileUrl(img.path)!} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" />
                  <GalleryRemove id={img.id} />
                </div>
              ))}
            </div>
          )}
          <ActionForm action={uploadImageAction} submitLabel="Bild hinzufügen" submitVariant="outline" resetOnSuccess>
            <input type="hidden" name="kind" value="gallery" />
            <Input type="file" name="file" accept="image/*" required className="h-auto py-2.5" aria-label="Bild" />
          </ActionForm>
          <p className="mt-2 text-xs text-muted">Bilder werden automatisch verkleinert, in WebP umgewandelt und Metadaten (z. B. GPS) entfernt.</p>
        </CardBody>
      </Card>
    </div>
  );
}
