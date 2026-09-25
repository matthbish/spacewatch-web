import { useEffect, useState } from 'preact/hooks';
import { API_URL, CACHE_TTL_HOURS } from './config';
import {
  type Favorite, type FavoriteType, type Launch, type RefreshResult,
  favoriteKey, isFinal, mapLaunchesResponse, mergeLaunches,
} from './domain';

export type ThemeMode = 'SYSTEM' | 'LIGHT' | 'DARK';

export interface Settings {
  theme: ThemeMode;
  notificationsEnabled: boolean;
  notify24h: boolean;
  notify1h: boolean;
  /** Notify when a new launch appears for a favorited rocket/provider/site/region. */
  notifyNewFavoriteMatches: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'SYSTEM',
  notificationsEnabled: true,
  notify24h: true,
  notify1h: true,
  notifyNewFavoriteMatches: true,
};

export interface State {
  launches: Launch[];
  lastRefresh: number | null;
  favorites: Favorite[];
  settings: Settings;
  online: boolean;
  refreshing: boolean;
  /** A user-requested refresh (button) is in progress, including its minimum feedback time. */
  manualRefreshing: boolean;
  lastResult: RefreshResult | null;
  toast: { id: number; text: string } | null;
}

// Persisted slices, each under its own key so a corrupt launch cache can never take favorites
// or settings down with it.
const PERSISTED = {
  launches: 'spacewatch.launches',
  lastRefresh: 'spacewatch.lastRefresh',
  favorites: 'spacewatch.favorites',
  settings: 'spacewatch.settings',
} as const;
type PersistedKey = keyof typeof PERSISTED;

function read<T>(key: string, valid: (v: unknown) => boolean, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    return valid(value) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadPersisted(): Pick<State, PersistedKey> {
  const settings = read<Partial<Settings>>(PERSISTED.settings, (v) => !!v && typeof v === 'object', {});
  return {
    launches: read(PERSISTED.launches, Array.isArray, []),
    lastRefresh: read(PERSISTED.lastRefresh, (v) => typeof v === 'number', null),
    favorites: read(PERSISTED.favorites, Array.isArray, []),
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };
}

let state: State = {
  ...loadPersisted(),
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  refreshing: false,
  manualRefreshing: false,
  lastResult: null,
  toast: null,
};
const listeners = new Set<() => void>();

export const getState = () => state;

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setState(patch: Partial<State>, persist = true) {
  state = { ...state, ...patch };
  if (persist) {
    for (const key of Object.keys(patch) as (keyof State)[]) {
      if (key in PERSISTED) {
        try {
          localStorage.setItem(PERSISTED[key as PersistedKey], JSON.stringify(state[key]));
        } catch {
          // Storage full or blocked (private mode): the app keeps working for this session.
        }
      }
    }
  }
  listeners.forEach((l) => l());
}

/** Re-reads persisted state, e.g. after another tab changed it. Also used to reset tests. */
export function reloadFromStorage() {
  setState(loadPersisted(), false);
}

export function useStore<T>(selector: (s: State) => T): T {
  const [value, setValue] = useState(() => selector(state));
  useEffect(() => {
    const update = () => setValue(() => selector(state));
    update();
    return subscribe(update);
  }, []);
  return value;
}

// ---- Favorites -----------------------------------------------------------------------------------

export const isFavorite = (s: State, type: FavoriteType, refId: string) =>
  s.favorites.some((f) => favoriteKey(f.type, f.refId) === favoriteKey(type, refId));

export function setFavorite(type: FavoriteType, refId: string, displayName: string, favorite: boolean) {
  const others = state.favorites.filter((f) => favoriteKey(f.type, f.refId) !== favoriteKey(type, refId));
  setState({ favorites: favorite ? [...others, { type, refId, displayName, savedAt: Date.now() }] : others });
}

export function updateSettings(patch: Partial<Settings>) {
  setState({ settings: { ...state.settings, ...patch } });
}

let toastId = 0;
export function showToast(text: string) {
  setState({ toast: { id: ++toastId, text } }, false);
}

// ---- Refresh -------------------------------------------------------------------------------------

export const TTL_MS = CACHE_TTL_HOURS * 3_600_000;
const FETCH_TIMEOUT_MS = 15_000;

export const isCacheStale = (s: State, now: number) => s.lastRefresh !== null && now - s.lastRefresh > TTL_MS;

type NewLaunchHandler = (newLaunches: Launch[]) => void;
let onNewLaunches: NewLaunchHandler = () => {};
export const setNewLaunchHandler = (handler: NewLaunchHandler) => { onNewLaunches = handler; };

let inFlight: Promise<RefreshResult> | null = null;

/**
 * Fetches fresh data when forced, or when the cache is past the TTL (or holds a launch that has
 * already lifted off without a final status yet). The cache is only ever replaced on success —
 * a failed refresh keeps the old data and reports why.
 */
export function refresh(force = false): Promise<RefreshResult> {
  inFlight ??= doRefresh(force).finally(() => { inFlight = null; });
  return inFlight;
}

async function doRefresh(force: boolean): Promise<RefreshResult> {
  const now = Date.now();
  const hasUnresolvedPastLaunch = state.launches.some((l) => l.net <= now && !isFinal(l.status));
  const needed = force || state.lastRefresh === null || hasUnresolvedPastLaunch || now - state.lastRefresh > TTL_MS;
  if (!needed) return finish({ kind: 'success' });
  if (!navigator.onLine) return finish({ kind: 'offline' });

  setState({ refreshing: true }, false);
  try {
    const response = await fetch(API_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (response.status === 429) return finish({ kind: 'failed', reason: 'RATE_LIMITED' });
    if (!response.ok) return finish({ kind: 'failed', reason: 'SERVER_ERROR' });
    const fetched = mapLaunchesResponse(await response.json());
    const refreshedAt = Date.now();
    const previousIds = new Set(state.launches.map((l) => l.id));
    const hadCache = previousIds.size > 0;
    setState({ launches: mergeLaunches(state.launches, fetched, refreshedAt), lastRefresh: refreshedAt });
    // On a first-ever fetch everything is "new"; that's not news worth a notification.
    if (hadCache) onNewLaunches(fetched.filter((l) => !previousIds.has(l.id)));
    return finish({ kind: 'success' });
  } catch (e) {
    const name = (e as Error)?.name;
    if (name === 'TimeoutError' || name === 'AbortError') return finish({ kind: 'failed', reason: 'TIMEOUT' });
    if (e instanceof SyntaxError) return finish({ kind: 'failed', reason: 'MALFORMED_RESPONSE' });
    if (!navigator.onLine) return finish({ kind: 'offline' });
    return finish({ kind: 'failed', reason: 'UNKNOWN' });
  }
}

export const MANUAL_REFRESH_MIN_MS = 800;

/**
 * The refresh buttons' action. A fetch often finishes in well under a second, which made the
 * spinner invisible and let every tap fire another request; this holds the busy state for at
 * least [MANUAL_REFRESH_MIN_MS], ignores taps meanwhile, then says how it went.
 */
export async function refreshNow(): Promise<void> {
  if (state.manualRefreshing) return;
  setState({ manualRefreshing: true }, false);
  const [result] = await Promise.all([refresh(true), new Promise((r) => setTimeout(r, MANUAL_REFRESH_MIN_MS))]);
  setState({ manualRefreshing: false }, false);
  showToast(
    result.kind === 'success' ? 'Launch data updated'
      : result.kind === 'offline' ? "You're offline — showing previously saved data"
        : 'Refresh failed — showing previously saved data',
  );
}

function finish(result: RefreshResult): RefreshResult {
  setState({ refreshing: false, lastResult: result, online: navigator.onLine }, false);
  return result;
}

/** Wires browser events that keep state honest: connectivity and other tabs' writes. */
export function startStoreListeners() {
  window.addEventListener('online', () => {
    setState({ online: true }, false);
    void refresh();
  });
  window.addEventListener('offline', () => setState({ online: false }, false));
  window.addEventListener('storage', (e) => {
    if (e.key === null || Object.values(PERSISTED).includes(e.key as never)) reloadFromStorage();
  });
}

/** Current time, re-read every [intervalMs] so time-based filtering (upcoming vs past) stays true. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
