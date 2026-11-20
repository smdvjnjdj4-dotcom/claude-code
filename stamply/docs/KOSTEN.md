# Betriebskosten – was ist kostenlos, was kann später kosten?

Aktuell nutzt STAMPLY **ausschließlich kostenlose bzw. Open-Source-Komponenten**. Es ist kein kostenpflichtiger Dienst aktiviert.

| Bereich | Heute | Wann entstehen Kosten? | Optionen |
|---|---|---|---|
| Hosting App | lokal / eigener Server | Bei Deployment | Vercel Hobby (nicht-kommerziell!) / Pro ~20 $/Monat; Hetzner-VPS ab ~5 €/Monat (Worker läuft dort mit) |
| Datenbank | lokales PostgreSQL | Bei gehosteter DB | Supabase Free (500 MB, pausiert bei Inaktivität), Neon Free; danach ~25 $/Monat |
| Bild-Speicher | lokales Dateisystem | Bei mehreren Servern / Serverless | Supabase Storage / S3 / Cloudflare R2 (R2: 10 GB frei) |
| OCR | tesseract.js im Server | Nur CPU-Last; bei vielen Bons mehr Server-Leistung | Alternativ Cloud-OCR (Google Vision ~1,50 $/1000) – nur mit deiner Zustimmung |
| Web Push | VAPID, direkt an Browser-Push-Dienste | **Kostenlos** | – |
| Karten | OpenStreetMap-Tiles + Nominatim | Bei echtem Traffic verletzt das die OSM-Nutzungsrichtlinie | MapTiler/Stadia Free-Tier, danach nutzungsabhängig; oder eigener Tile-Server |
| Scheduler | `npm run worker` | Bei Serverless-Hosting | Vercel Cron, GitHub Actions oder cron-job.org (kostenlos) → `POST /api/cron/dispatch` |
| E-Mail (Passwort-Reset, Bestätigung) | **nicht implementiert** | Sobald gewünscht | Resend / Brevo Free-Tier (~3000/Monat), danach ~20 $/Monat |
| Zahlungen | **Testmodus, keine Zahlungen** | Beim Livegang | Stripe: ~1,5 % + 0,25 € pro Zahlung (EU-Karten), SEPA günstiger |
| Domain/SSL | – | Beim Livegang | Domain ~10 €/Jahr, SSL kostenlos (Let's Encrypt) |

**Empfehlung für einen günstigen Start:** ein kleiner VPS (App + Worker + PostgreSQL) für ~5–10 €/Monat, Karten über einen Free-Tier-Anbieter, E-Mail über einen Free-Tier-Dienst.
