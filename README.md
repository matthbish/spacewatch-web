# SpaceWatch

A quiet, local-first tracker for upcoming rocket launches — live countdowns, favorites, and
launch reminders. Runs in any modern browser and installs as an app (PWA) on phones and desktops.

**Live:** https://matthbish.github.io/spacewatch-web/

## Features

- **Launches** — upcoming launches in chronological order with a live countdown (`T− 3d 4h 21m`,
  seconds under an hour out), quiet status label, and a thin-border "launching within 24 hours"
  treatment. A history toggle weaves the last 72 hours of launches into the timeline.
- **Launch details** — rocket, provider, launch site, region, date/time, mission description,
  and a mission/webcast link when one is reachable. Missing fields are hidden, not shown as "N/A".
- **Favorites** — launches, rockets, providers, launch sites, and states/countries. An entity
  favorite is a live filter: it matches launches added later, not just today's.
- **Reminders** — 24 h and 1 h before favorited launches, plus "new launch added" for favorited
  rockets/providers/sites/regions, via Web Notifications. Permission is only requested when you
  first favorite something (or tap *Allow notifications* in Settings).
- **Settings** — theme (System / Light / Dark), notification toggles, manual refresh, about,
  privacy, and data-source attribution.
- **Offline** — installable PWA; the app shell works offline and cached launch data stays
  available, always labelled as offline/stale rather than passed off as current.

## How reminders work in the browser

Browsers can't wake a closed website on a schedule, so reminders fire while SpaceWatch is open in
a tab or running as an installed app (the app checks every 30 s and when you return to it). A
reminder missed by more than 10 minutes is skipped rather than sent late with a misleading title.
On iPhone/iPad, notifications only work after *Add to Home Screen* (iOS 16.4+). The Settings screen
explains whichever of these applies, and handles unsupported, blocked, and undecided permission
states.

## Architecture

Vite + TypeScript + [Preact](https://preactjs.com) (one 4 KB runtime dependency). No backend, no
accounts, no analytics.

```
src/
  config.ts          CACHE_TTL_HOURS, API URL, SUPPORT_OPTIONS — the knobs
  domain.ts          Launch/Favorite types, status mapping, countdown, regions, API mapping (pure)
  store.ts           App state, localStorage persistence, cross-tab sync, cache/refresh rules
  notifications.ts   Permission handling, reminder scheduling, new-launch alerts
  router.ts          Hash routes (#/launch/<id>, #/entity/<type>/<id>/<label>, …)
  app.tsx            Shell: bottom bar (mobile) / side rail (desktop), theme, focus, scroll
  components/        Reusable UI (LaunchCard, CountdownText, StatusLabel, …), each with a test
  screens/           Home, Detail, Favorites, EntityLaunches, Settings, Support
  sw-template.js     Service worker (app-shell cache only); the build injects the file list
  styles.css         Design tokens and all styling
```

**Storage.** Everything lives in `localStorage` under `spacewatch.*` keys: launches, last-refresh
time, favorites, settings, and sent-reminder records. Each slice is its own key so a corrupt cache
can't take favorites with it. IndexedDB would be overkill for ~30 launches.

**Routing.** Hash-based, so deep links and reloads work on GitHub Pages under any base path
without a `404.html` redirect hack.

**Data.** [The Space Devs — Launch Library 2](https://thespacedevs.com/llapi), called directly from
the browser (it sends `Access-Control-Allow-Origin: *`). Free, no key, rate-limited — hence the
caching below.

## Caching

- `CACHE_TTL_HOURS` in [`src/config.ts`](src/config.ts) (default `24`) is the single TTL knob.
- Within the TTL, cached data is used with no request. Past it (or when a launch has lifted off
  without a final status yet), the app refreshes when online.
- The cache is replaced only on success. Timeouts, rate limits (429), server errors, and
  malformed responses keep the old data and show a "Refresh failed" banner.
- Offline or stale data is always labelled, with the last successful update time.
- The service worker never caches API responses — only the app shell — so staleness is always
  decided by the app.

## Support SpaceWatch

A small "Support SpaceWatch" link appears on every page (page footer on mobile, side rail on
desktop) and opens the in-app Support page, which offers two ways to chip in, each opening in a
new tab: [GitHub Sponsors](https://github.com/sponsors/matthbish) and
[Ko-fi](https://ko-fi.com/matthewbishop). The options live in one list, `SUPPORT_OPTIONS` in
[`src/config.ts`](src/config.ts). Add, remove, or reorder entries there (Stripe payment links,
PayPal.me, and so on work the same way). No payment code lives in this repo.

## Development

Requires Node 24+.

```bash
npm ci
npm run dev        # http://localhost:5173/spacewatch-web/
```

## Testing

```bash
npm run lint       # ESLint (typescript-eslint)
npm test           # Vitest unit + component tests (jsdom)
npm run e2e        # Playwright against the production build, mobile + desktop Chromium
npm run check      # all of the above plus the build — what CI runs
```

- Unit tests cover countdown math, status mapping, API mapping (missing/malformed fields),
  sorting/filtering, cache merge/retention, refresh rules and every failure mode, favorites
  persistence, reminder scheduling, and routing.
- **Every component in `src/components/` has its own test file.** Add one in the same change as
  the component.
- Playwright covers startup, navigation and deep links, mobile and desktop layouts, favorites
  (creation, removal, persistence, cross-tab sync), theme switching and persistence, every
  notification permission state, reminder delivery, offline/stale/failure states, the service
  worker and manifest, the support link, and base-path correctness. The launch API is always
  mocked; tests never hit the real service.

First run: `npx playwright install chromium`.

## Build and deploy

```bash
npm run build      # → dist/, for the /spacewatch-web/ base path
npm run preview    # serve dist/ at http://localhost:4173/spacewatch-web/
```

The base path defaults to `/spacewatch-web/`; override with `BASE_PATH=/other/ npm run build`
(for a fork under a different repo name, also update the URLs in `index.html` and
`src/config.ts`).

Deployment is automatic: every push to `master` runs [CI](.github/workflows/ci.yml) (lint → unit
tests → build → Playwright) and, only if all pass, deploys `dist/` to GitHub Pages. Pull requests
run the same checks without deploying. `dist/` is never committed.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Anyone can fork and open a pull request; `master` is
protected and only the maintainer merges.

## Privacy

SpaceWatch stores everything on your device, in your browser. It collects no personal
information, has no analytics or tracking, and needs no account. The only network requests are
for public launch-schedule data.

## License

[MIT](LICENSE). Launch data © The Space Devs, used under their terms. Icons: Material Icons
(Apache 2.0).
