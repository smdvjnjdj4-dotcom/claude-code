# VYBE — Your Life. Your Universe.

VYBE is a gamified life operating system, built as a mobile-first Progressive Web App. Missions, habits and money tracking all feed one character: you earn XP, level up and grow six attributes (Discipline, Intelligence, Fitness, Finance, Creativity, Social).

- **Stack:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide, Recharts, Zustand, IndexedDB (`idb-keyval`), `vite-plugin-pwa`. Everything is free and open source.
- **Languages:** German (default) and English.
- **Data:** stays on the device in IndexedDB. There is no account, no tracking and no analytics.

---

## 1. Quick start

Requirements: Node.js 18 or newer (tested with Node 22) and npm.

```bash
cd vybe
npm install
npm run dev          # http://localhost:5173  (hot reload)
```

Other commands:

```bash
npm run build        # type-check + production build into dist/ (includes service worker)
npm run preview      # serve the production build on http://localhost:4173
npm test             # unit tests for the XP / streak / achievement engine (Vitest)
npm run typecheck    # TypeScript only
```

On first launch you can go through onboarding, or tap **"Mit Demo-Profil erkunden"** to explore with sample data. The demo is clearly labelled, and you can reset it from the banner or from Settings.

### Optional: live AI for the Companion

The Companion runs in **demo mode** by default. That mode is rule-based, uses your real VYBE data and is labelled as such in the UI. To get real AI replies, run the small proxy included in this repo. It holds the API key on the server, so the key never reaches the browser.

```bash
cd vybe/server
npm install
ANTHROPIC_API_KEY=your-key npm start      # listens on :8787
```

`npm run dev` and `npm run preview` forward `/api/*` to `localhost:8787`. The Companion checks `GET /api/companion` and switches to **Live-KI** once the check succeeds. You can change the endpoint under *Settings → KI-Backend*. It accepts only a relative path or an `https://` URL, and never a key.

- The proxy uses the Anthropic SDK with structured output, so replies always arrive as `{ text, proposals[] }`.
- It also enables server-side refusal fallback (`fallbacks: "default"`). To turn that off, remove those two lines from `server/ai-proxy.mjs`.
- Set the `VYBE_MODEL` variable to change the model.
- The app never applies AI proposals automatically. Each one is a card that you **accept or dismiss**.

---

## 2. Installing the PWA on a smartphone

The app has to be served over HTTPS (or `localhost`) for installation to work. For example, deploy `dist/` to any static host such as Netlify, Vercel, Cloudflare Pages or GitHub Pages.

- **iPhone / iPad (Safari):** open the URL → Share button → **"Zum Home-Bildschirm"** / *Add to Home Screen* → Add.
- **Android (Chrome):** open the URL → ⋮ menu → **"App installieren"** / *Install app* (or accept the install banner).
- **Desktop (Chrome / Edge):** click the install icon in the address bar.

Once installed, VYBE starts full-screen with its own icon and works offline, because the service worker precaches the whole app.

To try it on a phone in your local network, run `npm run build && npx vite preview --host`. Browsers only offer installation over HTTPS, so for a real install use a tunnel (for example `cloudflared`) or a deployment.

---

## 3. Folder structure

```
vybe/
├── index.html                 # app shell, fonts, meta for iOS
├── vite.config.ts             # PWA manifest + service worker, /api proxy, aliases
├── tailwind.config.js         # design tokens exposed as Tailwind colors
├── public/                    # icon.svg + generated PNG icons
├── server/ai-proxy.mjs        # optional backend for live AI (keeps the API key server-side)
└── src/
    ├── domain/                # pure business logic — no React
    │   ├── types.ts           # all data models
    │   ├── progression.ts     # XP rules, level curve, soft cap, streaks & freezes
    │   ├── engine.ts          # actions: complete mission, log habit, add transaction…
    │   ├── achievements.ts    # 19 achievements with rarity and progress functions
    │   ├── habits.ts          # habit streaks, weekly targets, completion rate
    │   ├── content.ts         # starter missions/habits, categories, defaults
    │   ├── demo.ts            # deterministic demo profile
    │   └── engine.test.ts     # unit tests
    ├── store/                 # Zustand store persisted to IndexedDB, selectors, import/export
    ├── ai/                    # Companion provider layer: demo provider, HTTP provider, context builder
    ├── social/backend.ts      # SocialBackend interface + local implementation (ready for a realtime backend)
    ├── lib/                   # i18n (DE/EN), router, dates, formatting, storage, motion, share
    ├── components/
    │   ├── ui/                # Button, Card, Sheet, ProgressRing, AnimatedNumber, Skeleton, Avatar, …
    │   └── layout/            # navigation, page transitions, overlays (XP, level-up, achievement reveal)
    └── features/              # one folder per screen
        ├── onboarding/  home/  missions/  habits/  money/
        ├── character/  achievements/  companion/  social/  stats/  settings/
```

UI and business logic are separate. Screens call store actions. The store calls the pure functions in `domain/engine.ts` and then persists the result. You can test every rule without a browser.

---

## 4. Gamification rules

| Action | XP | Attribute XP |
|---|---|---|
| Mission — Easy / Normal / Challenging / Hard / Epic | 20 / 30 / 40 / 60 / 100 | same as XP, in the mission's attribute |
| Habit logged (per day) | 15 | habit's attribute |
| Money tracked (first entry of the day) | 5 | Finance |
| Deposit to a savings goal (once per day) | 20 | Finance |
| Achievement unlocked (one-time) | Common 10 · Rare 25 · Epic 50 · Legendary 100 | — |

- **XP to the next level:** `100 + 60·(L−1) + 5·(L−1)²`. That gives 100, 165, 240, 325, … XP per level.
- **No duplicate rewards:** each reward has an idempotency key such as `mission:<id>:<date>`, `habit:<id>:<date>` or `ach:<id>`. Completing something twice gives XP once. Undoing removes exactly that entry. Deleting a mission keeps the XP you already earned.
- **Daily soft cap:** after 400 XP in one day, further rewards are halved. Rest is part of the game.
- **Fair streaks:** a day counts as active if you earned any XP that day. Today never breaks your streak. Every 7-day streak earns a **freeze** (you can hold at most 2), and a freeze automatically covers one missed day.
- **Unlocks:** attribute ranks have their own curve. **Auras** (accent themes) unlock at levels 1, 3, 5, 8 and 12, and level titles go from *Funke* to *Legende*.

---

## 5. Working features

- **Onboarding:** 5 animated steps (name, goals, life areas, daily time, motivation) with a progress bar, validation and a DE/EN switch. It creates **personalised starter missions** (scaled to your daily time) and starter habits. You can skip it with the demo profile.
- **Command Center:** greeting, animated level ring and avatar, total XP and XP to the next level, streak, freezes, daily progress ring, quick actions, today's missions and habits (with particle bursts on completion), and a weekly XP chart.
- **Missions:** create, edit and delete missions. Each has an attribute, a difficulty, a once/daily schedule and optional multi-step targets. You can filter (open / done / all), undo a completion, and see one-off missions carry over until they are done. The XP rules are explained in the app.
- **Habits:** create, edit and delete habits with an icon, colour, attribute, weekly target (1–7×) and reminder time. You get a 7-day check-in strip with retroactive logging, a 16-week overview heatmap, and a per-habit view with heatmap, 8-week chart, streak, best streak, 30-day rate and milestones (7/21/30/66/100).
- **Money Hub:** manual income and expense entries in EUR or another currency, categories, month navigation, balance, a spending-distribution donut (colour-blind-safe palette with legend and percentages), monthly budgets with progress and over-budget warnings, savings goals (deposit and withdraw), monthly insights, and a source badge on every transaction (Manual / Demo; *Connected* is reserved for a future bank sync).
- **Character:** animated radar chart of all six attributes, rank cards with progress and explanations, level titles, and unlockable auras that re-tint the whole app.
- **Achievements:** 19 badges across 4 rarities, filters, progress bars, a detail sheet, an unlock reveal with particles, and sharing through the Web Share API or the clipboard.
- **Statistics:** total XP, best streak, active days, completed missions, a 14-day XP chart, XP per attribute, and the full XP history.
- **Companion:** chat UI with suggestion chips, a typing indicator and mission proposals that you **must confirm**. Demo mode covers four intents (plan my day, break down a goal, weekly reflection, focus tips) using your real data. Live mode goes through your own proxy.
- **Social:** challenges you can join or leave, with your *real* progress computed from your XP history, a comparison leaderboard and your own challenges. You can also keep local friends and private groups, and share your progress.
- **Settings:** profile, daily time, theme (dark / light / system), aura, language (DE/EN), reduced motion, larger text, high contrast, notifications (habit reminders and a daily-plan reminder), privacy (hide amounts), base currency, AI endpoint test, JSON export and import (validated), demo reload, and delete-all (you must type a confirmation word).
- **App-wide:**
  - Persistence in IndexedDB, with in-memory fallback
  - Skeleton loading while the app hydrates and while screens lazy-load
  - Page transitions and an ambient animated background
  - Reduced-motion support (system setting or manual)
  - Focus-trapped, Esc-closable dialogs and a skip link
  - An error boundary on each screen
  - Toasts confirming every action
  - Offline-capable PWA with install icons

## 6. Demo-only or incomplete (honest list)

- **Companion without a backend** is rule-based (demo mode). It is labelled on screen and on every reply. Live AI needs `server/ai-proxy.mjs` and your own API key. I tested the proxy's routing and validation locally, but **not against the real API**, because no key was available in this environment.
- **Social is local-only.** Demo challenge participants (Mira, Jonas, …) are simulated and tagged **Demo**. Friends and groups are stored only on this device, with no sync and no invitations. Online multiplayer is *not* implemented. The `SocialBackend` interface is in place for it.
- **Reminders** fire only while VYBE is open (foreground or background tab). Real push notifications to a closed app need a push server, which is not implemented.
- **There is no bank sync.** All money data is manual. Amounts in other currencies are stored and shown but **not converted**: they are left out of the base-currency balance, and the app says so.
- **There is no cloud backup or multi-device sync.** Use JSON export and import to move data between devices.
- Light mode is supported, but it was designed second. Dark mode is the primary design.
- What I tested: the 19 unit tests (`npm test`), type-check, production build, and a scripted Playwright run in Chromium (onboarding with validation, completing a mission, the achievement reveal, persistence across reload, every route at phone and desktop width with no horizontal overflow, adding an expense, Companion demo replies and accepting a proposal, light mode and English). I did **not** test real iOS or Android devices or Safari.

## 7. Recommended next steps

1. **Sync and accounts:** add a backend (for example Supabase, or Postgres plus a small API) implementing `SocialBackend` with realtime subscriptions, plus encrypted cloud backup.
2. **Push notifications:** Web Push with VAPID keys and a scheduler, so reminders work when the app is closed.
3. **Native packaging:** wrap the PWA with **Capacitor** for the App Store and Play Store. The hash router and IndexedDB already work inside Capacitor. Add native local notifications and haptics.
4. **Bank connections (opt-in):** use a PSD2 aggregator, and mark the data `source: 'connected'` (already in the data model). Add currency conversion with dated FX rates.
5. **Companion:** stream replies, add tool use to create and reschedule missions after confirmation, and offer a weekly review ritual.
6. **More depth:** recurring weekdays for missions, sub-tasks, seasonal challenges, more achievements, avatar cosmetics, and end-to-end tests in CI.
