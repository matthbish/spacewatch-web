import { LAUNCH_HISTORY_RETENTION_HOURS } from './config';

const HOUR = 3_600_000;

/**
 * Normalized launch status, decoupled from the API's raw strings so a provider-side schema
 * change is absorbed in one mapping function instead of breaking every consumer.
 */
export type LaunchStatus =
  | 'GO' | 'TBD' | 'TBC' | 'HOLD' | 'IN_FLIGHT' | 'SUCCESS' | 'FAILURE' | 'PARTIAL_FAILURE' | 'UNKNOWN';

const STATUS_BY_ABBREV: Record<string, LaunchStatus> = {
  go: 'GO',
  tbd: 'TBD',
  tbc: 'TBC',
  hold: 'HOLD',
  'in flight': 'IN_FLIGHT',
  success: 'SUCCESS',
  failure: 'FAILURE',
  'partial failure': 'PARTIAL_FAILURE',
};

export function statusFromAbbrev(abbrev: string | null | undefined): LaunchStatus {
  return STATUS_BY_ABBREV[abbrev?.trim().toLowerCase() ?? ''] ?? 'UNKNOWN';
}

export const isFinal = (s: LaunchStatus) => s === 'SUCCESS' || s === 'FAILURE' || s === 'PARTIAL_FAILURE';

/** Fields the API didn't provide are null so the UI can hide them instead of showing "N/A". */
export interface Launch {
  id: string;
  missionName: string;
  status: LaunchStatus;
  /** Epoch millis. */
  net: number;
  netIsPrecise: boolean;
  rocketId: string | null;
  rocketName: string | null;
  providerId: string | null;
  providerName: string | null;
  padName: string | null;
  locationName: string | null;
  countryCode: string | null;
  missionDescription: string | null;
  missionType: string | null;
  webcastUrl: string | null;
}

/**
 * Launches get notification reminders; rockets, providers, sites, and regions are a saved
 * filter into the cached launch list that also auto-applies to launches added later.
 */
export type FavoriteType = 'LAUNCH' | 'ROCKET' | 'PROVIDER' | 'LOCATION' | 'REGION';
export const FAVORITE_TYPES: FavoriteType[] = ['LAUNCH', 'ROCKET', 'PROVIDER', 'LOCATION', 'REGION'];

export interface Favorite {
  type: FavoriteType;
  refId: string;
  displayName: string;
  savedAt: number;
}

export const favoriteKey = (type: FavoriteType, refId: string) => `${type}:${refId}`;

export type DataStatus = 'FRESH' | 'STALE' | 'OFFLINE' | 'REFRESH_FAILED';
export type RefreshFailureReason = 'TIMEOUT' | 'RATE_LIMITED' | 'SERVER_ERROR' | 'MALFORMED_RESPONSE' | 'UNKNOWN';
export type RefreshResult = { kind: 'success' } | { kind: 'offline' } | { kind: 'failed'; reason: RefreshFailureReason };

export function computeDataStatus(online: boolean, isStale: boolean, refreshFailed: boolean): DataStatus {
  if (refreshFailed) return 'REFRESH_FAILED';
  if (!online) return 'OFFLINE';
  if (isStale) return 'STALE';
  return 'FRESH';
}

/** "T− 3d 4h 21m" / "T− 2h 14m" / "T− 38m 12s". Seconds only appear under an hour out. */
export function formatCountdown(remainingMs: number): string {
  // Rounded up, like any countdown: it reads 0s exactly at liftoff, not a second early.
  const total = Math.ceil(Math.max(0, remainingMs) / 1000);
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3_600);
  const m = Math.floor((total % 3_600) / 60);
  const s = total % 60;
  if (d > 0) return `T− ${d}d ${h}h ${m}m`;
  if (h > 0) return `T− ${h}h ${m}m`;
  return `T− ${m}m ${s}s`;
}

export const hasPassed = (launch: Launch, now: number) => isFinal(launch.status) || launch.net <= now;
export const isSoon = (launch: Launch, now: number) => !hasPassed(launch, now) && launch.net - now <= 24 * HOUR;

// Only the countries that actually host orbital launch sites today; an unlisted code still
// works, it just displays as the raw ISO code.
const COUNTRY_NAMES: Record<string, string> = {
  USA: 'United States', RUS: 'Russia', CHN: 'China', KAZ: 'Kazakhstan', FRA: 'France',
  GUF: 'French Guiana', JPN: 'Japan', IND: 'India', NZL: 'New Zealand', IRN: 'Iran',
  PRK: 'North Korea', ISR: 'Israel', BRA: 'Brazil', GBR: 'United Kingdom',
};

/**
 * A launch's broadest favoritable geography: the US state (parsed from "Cape Canaveral, FL, USA")
 * for American sites, otherwise the country. Returns [stable key, display label] or null.
 */
export function deriveRegion(locationName: string | null, countryCode: string | null): [string, string] | null {
  if (!countryCode?.trim()) return null;
  const country = COUNTRY_NAMES[countryCode] ?? countryCode;
  if (countryCode === 'USA' && locationName) {
    const parts = locationName.split(',').map((p) => p.trim()).filter(Boolean);
    const state = parts[parts.length - 2];
    if (state && state.length >= 2 && state.length <= 20 && state !== 'USA') return [`USA:${state}`, `${state}, ${country}`];
  }
  return [countryCode, country];
}

export function launchMatchesEntity(launch: Launch, type: FavoriteType, refId: string): boolean {
  switch (type) {
    case 'ROCKET': return launch.rocketId === refId;
    case 'PROVIDER': return launch.providerId === refId;
    case 'LOCATION': return launch.locationName === refId;
    case 'REGION': return deriveRegion(launch.locationName, launch.countryCode)?.[0] === refId;
    case 'LAUNCH': return false;
  }
}

/** A launch is tracked (gets reminders) if favorited itself or matched by any entity favorite. */
export function isTracked(launch: Launch, favorites: Favorite[]): boolean {
  return favorites.some((f) => (f.type === 'LAUNCH' ? f.refId === launch.id : launchMatchesEntity(launch, f.type, f.refId)));
}

export const byNet = (a: Launch, b: Launch) => a.net - b.net;

/**
 * The "upcoming" endpoint can still include a launch for a while after it happens; Home is
 * specifically "the next things launching", so those are filtered out here.
 */
export const upcomingOnly = (launches: Launch[], now: number) =>
  launches.filter((l) => !isFinal(l.status) && l.net > now).sort(byNet);

/**
 * Launches from the last [graceMs], most recent first. When nothing falls inside the window, the
 * single most recent past launch is returned instead of nothing.
 */
export function recentlyLaunched(launches: Launch[], now: number, graceMs = 72 * HOUR): Launch[] {
  const past = launches.filter((l) => l.net <= now);
  const within = past.filter((l) => now - l.net <= graceMs).sort((a, b) => b.net - a.net);
  if (within.length) return within;
  const latest = past.reduce<Launch | null>((best, l) => (!best || l.net > best.net ? l : best), null);
  return latest ? [latest] : [];
}

/** Recent launches are woven into one chronological timeline, not appended after upcoming. */
export const timelineLaunches = (upcoming: Launch[], recent: Launch[], showRecent: boolean) =>
  showRecent ? [...recent, ...upcoming].sort(byNet) : upcoming;

/**
 * Upserts a fresh fetch and prunes what it superseded — except recent past launches, which
 * survive (up to the retention window) so they can still show as recently launched.
 */
export function mergeLaunches(cached: Launch[], fetched: Launch[], now: number): Launch[] {
  const keep = new Set(fetched.map((l) => l.id));
  const cutoff = now - LAUNCH_HISTORY_RETENTION_HOURS * HOUR;
  const survivors = cached.filter((l) => !keep.has(l.id) && l.net <= now && l.net >= cutoff);
  return [...fetched, ...survivors].sort(byNet);
}

// ---- API mapping -------------------------------------------------------------------------------

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const idStr = (v: unknown): string | null => (typeof v === 'number' || typeof v === 'string' ? String(v) : null);

/**
 * Maps one raw Launch Library 2 result. Every field is optional so an upstream schema change
 * degrades one field instead of failing the whole response; only a missing id drops the entry.
 */
export function mapLaunchDto(raw: unknown): Launch | null {
  const dto = obj(raw);
  const id = dto && idStr(dto.id);
  if (!dto || !id) return null;
  const mission = obj(dto.mission);
  const config = obj(obj(dto.rocket)?.configuration);
  const provider = obj(dto.launch_service_provider);
  const pad = obj(dto.pad);
  const location = obj(pad?.location);
  const precision = str(obj(dto.net_precision)?.abbrev);
  const parsedNet = Date.parse(str(dto.net) ?? '');
  const videos = Array.isArray(dto.vidURLs) ? dto.vidURLs.map(obj).filter((v): v is Obj => !!v && !!str(v.url)) : [];
  const bestVideo = videos.reduce<Obj | null>(
    (best, v) => (!best || Number(v.priority ?? 0) > Number(best.priority ?? 0) ? v : best),
    null,
  );
  return {
    id,
    missionName: str(mission?.name) ?? str(dto.name) ?? 'Untitled mission',
    status: statusFromAbbrev(str(obj(dto.status)?.abbrev)),
    net: Number.isNaN(parsedNet) ? 0 : parsedNet,
    netIsPrecise: precision ? precision.toLowerCase() === 'accurate' : true,
    // rocket.configuration.id is the reusable rocket type ("Falcon 9 Block 5") shared across
    // launches — that's what "all launches for this rocket" means, not rocket.id (one booster).
    rocketId: idStr(config?.id),
    rocketName: str(config?.full_name) ?? str(config?.name),
    providerId: idStr(provider?.id),
    providerName: str(provider?.name),
    padName: str(pad?.name),
    locationName: str(location?.name),
    countryCode: str(location?.country_code),
    missionDescription: str(mission?.description),
    missionType: str(mission?.type),
    webcastUrl: bestVideo ? str(bestVideo.url) : null,
  };
}

/** Throws on a response that isn't recognizably a launch list at all. */
export function mapLaunchesResponse(body: unknown): Launch[] {
  const results = obj(body)?.results;
  if (!Array.isArray(results)) throw new SyntaxError('Malformed launch response');
  return results.map(mapLaunchDto).filter((l): l is Launch => l !== null);
}

// ---- Date formatting ---------------------------------------------------------------------------

/** "Sep 20, 2026, 2:30 PM" in the user's locale and time zone. */
export const formatLaunchDateTime = (ms: number) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(ms);

/** "Sep 20, 2:30 PM" — the tighter form for cards. */
export const formatLaunchDateTimeCompact = (ms: number) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(ms);

/** "September 14 at 3:42 PM", matching the offline/stale banner copy. */
export const formatLastUpdated = (ms: number) =>
  `${new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(ms)} at ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(ms)}`;
