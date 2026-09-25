# SpaceWatch web — notes for AI agents

Web/PWA port of the SpaceWatch Android app. Architecture, caching, notifications, testing, and
deployment: `README.md`. House rules: `CONTRIBUTING.md` (read the design rules before touching
anything visual). This is a port, not a redesign: match the Android app's look and behavior
unless there's a web-specific reason not to.

- Run `npm run check` before calling anything done, and look at the real app in a browser at both
  phone and desktop widths. Green tests alone have missed on-device bugs in this product before.
- Every component in `src/components/` gets its own test file in the same change.
- The brand mark geometry lives in `src/components/BrandMark.tsx` (traced from the Android
  `branding/icon.png`). Reuse it; don't invent a new mark.
- Base path is `/spacewatch-web/`. Never hard-code `/` for app URLs; use relative paths or
  `import.meta.env.BASE_URL`.
- The service worker caches the app shell only, never API data.
- No code comments unless they explain a non-obvious *why*.
- Commits end with a `Co-Authored-By:` trailer for the model that wrote them.
