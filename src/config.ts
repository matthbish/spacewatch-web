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

export const API_URL = 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=30&mode=detailed';

/**
 * Where "Support SpaceWatch" points. Any provider works (Ko-fi, GitHub Sponsors, Stripe payment
 * link, PayPal.me …) — it's just a URL. Leave empty to show the in-app "coming soon" page instead.
 */
export const SUPPORT_URL = '';

export const REPO_URL = 'https://github.com/matthbish/spacewatch-web';

export const APP_VERSION: string = __APP_VERSION__;
