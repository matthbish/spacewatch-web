# Contributing to SpaceWatch

Thanks for helping. Anyone can fork the repo and open a pull request; the maintainer reviews and
merges. `master` is protected: changes land only through pull requests that pass CI.

## Workflow

1. Fork the repository and create a branch from `master`.
2. `npm ci`, then `npx playwright install chromium` (first time only).
3. Make your change. Run `npm run check` (lint, unit tests, build, Playwright) before pushing.
4. Open a pull request against `master` describing *what* changed and *why*. Include before/after
   screenshots for anything visual, on both a phone-width and a desktop-width viewport.
5. CI must be green. The maintainer may ask for changes before merging.

## House rules

SpaceWatch is quiet, dark, calm, and empty — like looking at a clear night sky, not a dashboard.

- **Low-saturation color only.** Emphasis (a launch within 24 h, a status) is a thin border or a
  muted label, never a loud saturated fill. Use the tokens in `src/styles.css`; don't add hues.
- **Card hierarchy is Rocket > Provider > Mission.** Status stays quiet, next to the countdown.
- **Minimal by default.** Before adding UI, ask whether it needs to exist at all.
- **Big visual changes get discussed first.** Open an issue with 2–4 options before changing the
  icon, theme, or a screen's layout. Small tweaks (spacing, copy) can go straight to a PR.
- **Every component in `src/components/` has its own test.** Add it in the same PR.
- **Minimal dependencies.** Don't add a library for something a few lines of platform code does.
  New runtime dependencies need a strong reason.
- **Favorites are live subscriptions.** A favorited rocket/provider/site/region applies to launches
  added later, not just current ones.
- **Global settings over per-item settings**, unless an item truly needs its own override.
- **Comments explain *why*, not *what*.** A constraint, a workaround, a rejected alternative.
- **Keep the app local-first.** No accounts, backend, analytics, or tracking.
- **Never present stale data as current.** Any change to caching must keep the offline/stale
  labelling honest.

## Reporting bugs

Open an issue with the browser and OS, steps to reproduce, and what you expected. For layout
bugs, include the viewport width and a screenshot.

## Security

Please don't open public issues for security problems. Use GitHub's *Report a vulnerability*
(Security tab) to reach the maintainer privately.

## License

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
