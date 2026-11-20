# STAMPLY – Discover Local. Earn Rewards.

Lokale Discovery- und Loyalty-Plattform: Kund:innen entdecken Geschäfte in ihrer Nähe, sammeln digitale Stempel und lösen Belohnungen ein. Unternehmen steuern Treueprogramme, Bon-Prüfung und Push-Kampagnen in einem eigenen Dashboard.

**Stack:** Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL + Drizzle ORM · Web Push (VAPID) · tesseract.js (Open-Source-OCR) · Leaflet + OpenStreetMap · Vitest

Weiterführend: [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) · [docs/KOSTEN.md](docs/KOSTEN.md) · [docs/ROADMAP.md](docs/ROADMAP.md)

---

## Lokal starten (ca. 10 Minuten)

### 1. Voraussetzungen

- **Node.js 20.9+** (empfohlen 22) – `node -v`
- **PostgreSQL 14+** – lokal installiert, per Docker oder eine kostenlose Supabase-Datenbank

PostgreSQL per Docker (einfachster Weg):

```bash
docker run -d --name stamply-db -p 5432:5432 \
  -e POSTGRES_USER=stamply -e POSTGRES_PASSWORD=stamply -e POSTGRES_DB=stamply postgres:16
docker exec stamply-db psql -U stamply -c "create database stamply_test"
```

### 2. Installieren & konfigurieren

```bash
cd stamply
npm install
cp .env.example .env
```

In `.env` mindestens setzen:

```bash
APP_SECRET=$(openssl rand -hex 32)   # Wert einfügen, nicht den Befehl
CRON_SECRET=$(openssl rand -hex 16)
```

Optional Web-Push aktivieren: `npm run vapid` ausführen und die drei ausgegebenen Zeilen in `.env` übernehmen.

### 3. Datenbank anlegen + Demo-Daten

```bash
npm run db:migrate
npm run db:seed        # fiktive, als „Demo“ gekennzeichnete Geschäfte in Berlin/Hamburg
```

### 4. Starten

```bash
npm run dev            # App auf http://localhost:3000
npm run worker         # zweites Terminal: Push-Kampagnen, Bon-Wiederholungen, Löschfristen (jede Minute)
```

### Demo-Zugänge (nach `db:seed`)

| Rolle | E-Mail | Passwort |
|---|---|---|
| Kund:in | `kunde@stamply.test` | `stamply-demo-1` |
| Inhaberin „Café Bohne“ (Premium, Testmodus) | `cafe@stamply.test` | `stamply-demo-1` |
| Mitarbeiter „Café Bohne“ | `team@stamply.test` | `stamply-demo-1` |
| Inhaber weiterer Demo-Geschäfte | `inhaber@stamply.test` | `stamply-demo-1` |

**Ausprobieren:** Als Café-Inhaberin unter *Kasse* einen Code erzeugen → in einem anderen Browser (privates Fenster) als Kundin `/collect?code=…` öffnen oder den QR-Code scannen → Stempel erscheint sofort; ein zweiter Versuch wird abgelehnt.

---

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` / `build` / `start` | Entwicklung / Produktions-Build / Produktionsserver |
| `npm run worker` | Scheduler (Kampagnen, OCR-Wiederholung, Aufbewahrungsfristen) |
| `npm test` | Unit- und Integrationstests (nutzt `TEST_DATABASE_URL`, wird geleert!) |
| `npm run typecheck` | TypeScript-Prüfung |
| `npm run db:generate` | Neue Migration aus `src/db/schema.ts` erzeugen |
| `npm run db:migrate` | Migrationen anwenden |
| `npm run db:seed` / `db:reset` | Demo-Daten / Datenbank komplett neu aufsetzen (nur Entwicklung) |
| `npm run vapid` | VAPID-Schlüssel für Web Push erzeugen |

## Umgebungsvariablen

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `DATABASE_URL` | ja | PostgreSQL-Verbindung (lokal oder Supabase „Connection string“) |
| `TEST_DATABASE_URL` | für Tests | Eigene Test-Datenbank – wird bei jedem Testlauf geleert |
| `APP_URL` | ja | Öffentliche URL (für QR-Codes und Einladungslinks) |
| `APP_SECRET` | ja | ≥ 32 Zeichen, für HMAC von Codes/Fingerabdrücken. In Produktion Pflicht. |
| `CRON_SECRET` | wenn Cron-Endpoint genutzt | Bearer-Token für `POST /api/cron/dispatch` |
| `STORAGE_DIR` | nein | Ablage für Bilder (Standard `./storage`) |
| `RECEIPT_IMAGE_RETENTION_DAYS` | nein | Löschfrist für Bon-Fotos nach Entscheidung (Standard 30) |
| `OCR_PROVIDER` | nein | `tesseract` (Standard) oder `none` (alles in manuelle Prüfung) |
| `OCR_LANG_PATH` | nein | Lokaler Ordner mit `deu/eng.traineddata`; sonst einmaliger CDN-Download |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | für Geräte-Push | Ohne sie landen Nachrichten nur im In-App-Postfach |
| `APP_TIMEZONE`, `QUIET_HOURS_START`, `QUIET_HOURS_END` | nein | Ruhezeiten für Marketing (Standard 21–9 Uhr, Europe/Berlin) |
| `BILLING_MODE` | nein | Nur `test` ist implementiert – keine echten Zahlungen |

## Tests

```bash
npm test
```

51 Tests (Unit + Integration gegen echtes PostgreSQL) decken u. a. ab: einmalige Stempelcodes inkl. paralleler Doppel-Einlösung, Tageslimits, Ablauf von Stempeln/Belohnungen, Belohnungs-Einlösung (auch parallel), Bon-Duplikate (Bild + Fingerabdruck), Schwärzung von Zahlungsdaten, **Mandantentrennung** (Unternehmen B kann nichts von A lesen/ändern/einlösen), Rollenrechte, Einwilligungs-Pflicht für Push, Frequenzlimits, Ruhezeiten, Trigger-Idempotenz, Tarif-Berechtigungen, DSGVO-Export und Kontolöschung.

## Was bewusst (noch) nicht drin ist

- **Echte Zahlungen**: Tarife laufen im klar gekennzeichneten Testmodus. Für den Livebetrieb muss ein Zahlungsanbieter (z. B. Stripe) mit deiner Zustimmung angebunden werden.
- **E-Mail-Versand** (Passwort vergessen, E-Mail-Bestätigung): braucht einen E-Mail-Dienst – siehe docs/KOSTEN.md.
- **Bewertungen**: werden nicht angezeigt, solange es keine zulässige Quelle gibt.
- **Cashback**: als separates Modul vorgesehen.
- Rechtstexte unter `/legal/*` sind **Vorlagen** und müssen vor dem Livegang juristisch geprüft werden.
