/**
 * Single source of truth for how long cached launch data is considered fresh.
 * Change this one value to adjust API usage; nothing else hard-codes a TTL.
 */
export const CACHE_TTL_HOURS = 24;

/**
 * How long a launch stays cached after it drops out of the API's "upcoming" response, so
 * recently-launched entries survive for the "recent launches" toggle. Comfortably wider than
 * that feature's own 72h grace period so an infrequent refresh cadence doesn't race it away.
 */
export const LAUNCH_HISTORY_RETENTION_HOURS = 24 * 7;

export const API_URL = 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=30&mode=detailed';

/**
 * The Support page's donation options, in display order. Provider-agnostic: each is just a label,
 * a one-line hint to help people pick, and a URL (Stripe payment links, PayPal.me … work too).
 */
export const SUPPORT_OPTIONS: { label: string; hint: string; url: string }[] = [
  { label: 'Sponsor on GitHub', hint: 'Monthly or one-time, with a GitHub account', url: 'https://github.com/sponsors/matthbish?frequency=recurring' },
  { label: 'Tip on Ko-fi', hint: 'One-time or monthly, by card or PayPal — no account needed', url: 'https://ko-fi.com/matthewbishop' },
];

export const REPO_URL = 'https://github.com/matthbish/spacewatch-web';

export const APP_VERSION: string = __APP_VERSION__;
