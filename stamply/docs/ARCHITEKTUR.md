# STAMPLY – Architektur

## Überblick

```
Browser (PWA, Service Worker, Web Push)
   │  Server Components (Lesen)  ·  Server Actions (Schreiben)  ·  Route Handlers (Dateien, Push-Abo, Cron, Export)
   ▼
src/app/            UI + dünne Adapter: Session lesen → Domain-Funktion aufrufen → revalidieren
src/domain/         Geschäftslogik, framework-unabhängig, vollständig getestet
src/db/             Drizzle-Schema + Verbindung (PostgreSQL)
src/lib/            Auth, Rechte, Tarife, Rate-Limits, Audit, Speicher, Zeit/Geo
scripts/            Migration, Seed, Worker (Scheduler), VAPID
```

**Grundsatz:** Jede Berechtigungsprüfung passiert in `src/domain`, nicht in der UI. Jede Funktion, die Unternehmensdaten berührt, ruft `requireMember(db, userId, businessId, permission)` auf und filtert zusätzlich jede Abfrage nach `business_id`. Dadurch ist die Mandantentrennung auch dann gewährleistet, wenn eine Seite einen Fehler hat – und sie ist direkt testbar (`tests/integration/tenancy.test.ts`).

## Konten & Rollen

- `users.account_type` = `customer` | `business` – getrennte Kontotypen. Unternehmenskonten können keine Stempel sammeln, Kund:innen kein Dashboard öffnen.
- `business_members(role)` = `owner` | `manager` | `staff`; Rechte-Matrix in `src/lib/permissions.ts`.
- Sessions: zufälliges 256-bit-Token im httpOnly-Cookie, in der DB nur als SHA-256. Passwörter mit scrypt (Node-Bordmittel). Login/Registrierung sind ratenbegrenzt.
- Mehrere Unternehmen pro Konto (Switcher), Einladungen per einmaligem Link (7 Tage, an die E-Mail gebunden).

## Stempelvergabe (Kern)

`awardStamps()` in `src/domain/loyalty.ts` ist der **einzige** Weg, Stempel zu erzeugen:

1. Transaktion + `pg_advisory_xact_lock` je (Programm, Kunde) → keine Race-Conditions.
2. Programm aktiv & im Zeitraum? Filiale teilnehmend? Kunde ist Kundenkonto?
3. Tageslimit in lokaler Zeit (Europe/Berlin).
4. Stempel als Ereignisse speichern (mit Ablaufdatum, Quelle, Beleg-/Code-Referenz; `receipt_id` ist unique).
5. Volle Karte → Belohnung mit Einlösecode, älteste Stempel werden „verbraucht“.

Stempel sind Ereignisse statt eines Zählers → nachvollziehbar, Ablauf pro Stempel möglich, Statistiken exakt.

### Wege zum Stempel

| Weg | Sicherheit |
|---|---|
| **QR-/Kassencode** (empfohlen) | 8 Zeichen aus 31er-Alphabet, 3 Min. gültig, einmalig (atomares `UPDATE … WHERE used_at IS NULL`), in der DB nur als HMAC gespeichert, Einlöseversuche ratenbegrenzt |
| **Kassenbon** | siehe unten – OCR ist nur ein Signal, Unsicheres geht in die manuelle Prüfung |
| **Manuell** | nur Teammitglieder mit `stamps.issue`, auditiert |

### Kassenbon-Prüfung

`src/domain/receipts/`: Bild wird dekodiert und neu kodiert (WebP, Metadaten/GPS entfernt) → exakte Duplikate per SHA-256 → OCR (tesseract.js, lokal) → Extraktion von Datum, Uhrzeit, Summe, Bon-Nr. und Abgleich des Geschäftsnamens (inkl. Aliasse) → **Fingerabdruck** (HMAC aus Datum/Uhrzeit/Betrag/Bon-Nr.) erkennt denselben Papierbeleg auf einem neuen Foto → Risiko-Score.

- Duplikat oder Datum in der Zukunft → automatisch abgelehnt
- Score ≤ 20 und Modus „automatisch“ → bestätigt
- sonst → Prüfwarteschlange des Unternehmens (mit Bild, erkannten Werten, Risikogründen)

Kartennummern, IBANs und Autorisierungscodes werden vor dem Speichern geschwärzt; Bilder werden nach `RECEIPT_IMAGE_RETENTION_DAYS` gelöscht.

## Push & Kampagnen

- **Einwilligung** pro Kunde × Unternehmen (`marketing_consents`, Standard: aus) + unveränderliches Protokoll (`consent_events`) mit Textversion.
- **Zielgruppen** (`audiences.ts`) sind Live-SQL-Abfragen, immer auf ein Unternehmen beschränkt und mit Einwilligung verknüpft – sie aktualisieren sich automatisch.
- **Kampagnentypen:** einmalig (sofort/geplant), wiederkehrend (7/14/30/benutzerdefiniert), ereignisbasiert (nur noch 1 Stempel, Belohnung wartet, neues Programm, Rückgewinnung nach X Tagen, Geburtstag).
- **Dispatcher** (`dispatch.ts`, jede Minute über Worker oder Cron-Endpoint): Ruhezeiten → nichts senden; Tarifrechte zur Laufzeit; monatliches Kontingent; jede Zustellung idempotent über `(campaign, customer, run_key)`.
- **Anti-Spam** (`policy.ts`, rein & getestet): Einwilligung, globale Pause, Ruhezeit, identischer Inhalt max. 1× / 14 Tage, pro Unternehmen min. 48 h Abstand und max. 3 / Woche, plattformweit max. 3 / 24 h. Jede Nicht-Zustellung wird mit Grund protokolliert.
- Zustellung: In-App-Postfach immer, Geräte-Push via Web Push (VAPID), abgelaufene Abos werden automatisch entfernt. Links nur innerhalb von STAMPLY.

## Entdeckung

Haversine-Distanz in SQL zum nächstgelegenen Standort. Ranking nur aus Relevanzsignalen (Entfernung, Interessen, echte Aktivität der letzten 30 Tage). **Der Tarif ist kein Rankingfaktor** (Test: `plan does not influence ranking`). Ohne Standort werden keine Entfernungen angezeigt. Bewertungen werden nicht angezeigt.

## Datenschutz (Privacy by Default)

Standort nur gerundet im Cookie · Geburtstag nur mit Einwilligung · Profilaufrufe als tagesbezogener HMAC · Kundenliste für Unternehmen pseudonymisiert (Vorname + Initial, keine Kontaktdaten) · DSGVO-Export (`/api/me/export`) · Kontolöschung mit Anonymisierung der Stempel-Historie · Audit-Log sicherheitsrelevanter Aktionen · Sicherheits-Header, Datei-Auslieferung mit `nosniff`/Sandbox-CSP, Bon-Bilder nur für Einreicher:in und Prüfer:innen.

## Migration auf Supabase (optional)

STAMPLY nutzt Standard-PostgreSQL. Für Supabase einfach den „Connection string“ als `DATABASE_URL` setzen und `npm run db:migrate` ausführen. Supabase Auth/Storage werden bewusst nicht vorausgesetzt; `src/lib/storage.ts` ist die einzige Stelle, die für S3/Supabase Storage getauscht werden muss.
