# Stand der Phasen

| Phase | Status |
|---|---|
| 1 Projektstruktur, Designsystem, Datenbank | ✅ fertig |
| 2 Registrierung, Login, Rollen | ✅ fertig (ohne E-Mail-Verifizierung / Passwort-Reset – braucht E-Mail-Dienst) |
| 3 Kunden-App, Startseite, Entdeckung | ✅ fertig (Liste, Karte, Filter, Sortierung, Empfehlungen) |
| 4 Dashboard & Programm-Editor | ✅ fertig |
| 5 Kassenbon, Prüfung, sichere Stempelvergabe | ✅ fertig (OCR, Risiko-Score, Prüf-Queue, QR-Codes) |
| 6 Push & automatisierte Kampagnen | ✅ fertig (Builder, Trigger, Anti-Spam, Protokoll) |
| 7 Belohnungen, Einlösung, Statistiken | ✅ fertig |
| 8 Sicherheit, Optimierung, Deployment | 🟡 teilweise: Tests, Rate-Limits, Header, Audit vorhanden; offen: CSP für Seiten, E2E-Tests in CI, Deployment-Konfiguration, Monitoring |

## Nächste sinnvolle Schritte

1. E-Mail-Dienst wählen → Passwort vergessen, E-Mail-Bestätigung, Einladungen per Mail.
2. Hosting entscheiden (VPS vs. Vercel + Supabase) → Deployment + Cron einrichten.
3. Kartenanbieter mit Free-Tier statt OSM-Tiles für Produktion.
4. Zahlungsanbieter (Stripe) für Tarife – erst nach deiner Freigabe.
5. Rechtstexte prüfen lassen, Impressum ergänzen.
6. Bewertungen (eigenes, verifiziertes System nur für echte Besuche) – Produktentscheidung.
7. Cashback-Modul.
8. Native Wrapper (Capacitor) für App-Store-Präsenz und zuverlässigeren iOS-Push.
