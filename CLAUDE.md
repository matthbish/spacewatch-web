# SpaceWatch — notes for AI agents

Architecture, caching, notifications, testing, and deployment: `README.md`. House rules:
`CONTRIBUTING.md` (read the design rules before touching anything visual).

- Run `npm run check` before calling anything done, and look at the real app in a browser at both
  phone and desktop widths. Green tests alone miss layout bugs.
- Every component in `src/components/` gets its own test file in the same change.
- The brand mark geometry lives in `src/components/BrandMark.tsx` (the PNG icons in `public/icons/`
  are renders of the same mark). Reuse it; don't invent a new mark.
- Base path is `/spacewatch-web/`. Never hard-code `/` for app URLs; use relative paths or
  `import.meta.env.BASE_URL`.
- The service worker caches the app shell only, never API data.
- No code comments unless they explain a non-obvious *why*.
- Commits end with a `Co-Authored-By:` trailer for the model that wrote them.
