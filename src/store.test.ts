import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS, MANUAL_REFRESH_MIN_MS, TTL_MS, getState, isCacheStale, isFavorite, refresh, refreshNow,
  reloadFromStorage, setFavorite, setNewLaunchHandler, setState, updateSettings,
} from './store';
import { HOUR, launch, launchDto } from './test-fixtures';

function setOnline(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
}

function mockFetch(impl: () => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}

const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

beforeEach(() => {
  localStorage.clear();
  reloadFromStorage();
  setState({ refreshing: false, manualRefreshing: false, lastResult: null, online: true, toast: null }, false);
  setNewLaunchHandler(() => {});
  setOnline(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('persistence', () => {
  it('persists favorites across a reload', () => {
    setFavorite('ROCKET', '164', 'Falcon 9', true);
    reloadFromStorage();
    expect(isFavorite(getState(), 'ROCKET', '164')).toBe(true);
    setFavorite('ROCKET', '164', 'Falcon 9', false);
    reloadFromStorage();
    expect(getState().favorites).toEqual([]);
  });

  it('does not duplicate a favorite toggled on twice', () => {
    setFavorite('LAUNCH', 'l1', 'x', true);
    setFavorite('LAUNCH', 'l1', 'x', true);
    expect(getState().favorites).toHaveLength(1);
  });

  it('merges saved settings over defaults so new settings get sane values', () => {
    localStorage.setItem('spacewatch.settings', JSON.stringify({ theme: 'DARK' }));
    reloadFromStorage();
    expect(getState().settings).toEqual({ ...DEFAULT_SETTINGS, theme: 'DARK' });
    updateSettings({ notify1h: false });
    reloadFromStorage();
    expect(getState().settings.notify1h).toBe(false);
  });

  it('treats a cache saved before launch photos as due for a refresh, but still shows it', () => {
    const old: Record<string, unknown> = { ...launch() };
    delete old.imageUrl;
    localStorage.setItem('spacewatch.launches', JSON.stringify([old]));
    localStorage.setItem('spacewatch.lastRefresh', JSON.stringify(Date.now()));
    reloadFromStorage();
    expect(getState().launches).toHaveLength(1);
    expect(getState().lastRefresh).toBeNull();
  });

  it('survives corrupted storage without losing the other slices', () => {
    localStorage.setItem('spacewatch.launches', '{not json');
    localStorage.setItem('spacewatch.favorites', JSON.stringify([{ type: 'LAUNCH', refId: 'a', displayName: 'A', savedAt: 1 }]));
    reloadFromStorage();
    expect(getState().launches).toEqual([]);
    expect(getState().favorites).toHaveLength(1);
  });
});

describe('refresh', () => {
  it('fetches when there is no cache yet, and stores the result + timestamp', async () => {
    const fetch = mockFetch(() => ok({ results: [launchDto()] }));
    expect(await refresh()).toEqual({ kind: 'success' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getState().launches.map((l) => l.id)).toEqual(['l1']);
    expect(getState().lastRefresh).not.toBeNull();
    reloadFromStorage();
    expect(getState().launches).toHaveLength(1);
  });

  it('serves a fresh cache without a network request', async () => {
    setState({ launches: [launch()], lastRefresh: Date.now() - HOUR });
    const fetch = mockFetch(() => ok({ results: [] }));
    expect(await refresh()).toEqual({ kind: 'success' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refetches once the cache is older than the TTL, or when forced', async () => {
    const fetch = mockFetch(() => ok({ results: [launchDto()] }));
    setState({ launches: [launch()], lastRefresh: Date.now() - TTL_MS - 1 });
    await refresh();
    setState({ lastRefresh: Date.now() });
    await refresh(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('refetches within the TTL when a launch has lifted off without a final status', async () => {
    setState({ launches: [launch({ net: Date.now() - HOUR, status: 'GO' })], lastRefresh: Date.now() - HOUR });
    const fetch = mockFetch(() => ok({ results: [] }));
    await refresh();
    expect(fetch).toHaveBeenCalled();
  });

  it('reports offline without touching the network or the cache', async () => {
    setOnline(false);
    setState({ launches: [launch()], lastRefresh: 1 });
    const fetch = mockFetch(() => ok({ results: [] }));
    expect(await refresh(true)).toEqual({ kind: 'offline' });
    expect(fetch).not.toHaveBeenCalled();
    expect(getState().launches).toHaveLength(1);
  });

  it.each([
    ['rate limiting', () => Promise.resolve(new Response('', { status: 429 })), 'RATE_LIMITED'],
    ['a server error', () => Promise.resolve(new Response('', { status: 503 })), 'SERVER_ERROR'],
    ['a malformed body', () => Promise.resolve(new Response('<html>', { status: 200 })), 'MALFORMED_RESPONSE'],
    ['a schema change', () => ok({ launches: [] }), 'MALFORMED_RESPONSE'],
    ['a timeout', () => Promise.reject(new DOMException('timed out', 'TimeoutError')), 'TIMEOUT'],
    ['a network error', () => Promise.reject(new TypeError('Failed to fetch')), 'UNKNOWN'],
  ])('keeps the cache and reports failure on %s', async (_, impl, reason) => {
    const cached = [launch()];
    setState({ launches: cached, lastRefresh: 123 });
    mockFetch(impl as () => Promise<Response>);
    expect(await refresh(true)).toEqual({ kind: 'failed', reason });
    expect(getState().launches).toEqual(cached);
    expect(getState().lastRefresh).toBe(123);
    expect(getState().refreshing).toBe(false);
  });

  it('coalesces concurrent refreshes into one request', async () => {
    const fetch = mockFetch(() => ok({ results: [] }));
    await Promise.all([refresh(true), refresh(true), refresh(true)]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reports genuinely new launches, but not on the very first fetch', async () => {
    const handler = vi.fn();
    setNewLaunchHandler(handler);
    mockFetch(() => ok({ results: [launchDto()] }));
    await refresh(true);
    expect(handler).not.toHaveBeenCalled();
    mockFetch(() => ok({ results: [launchDto(), launchDto({ id: 'l2' })] }));
    await refresh(true);
    expect(handler).toHaveBeenCalledWith([expect.objectContaining({ id: 'l2' })]);
  });
});

describe('isCacheStale', () => {
  it('is stale only past the TTL, and never before a first fetch', () => {
    const now = Date.now();
    expect(isCacheStale({ ...getState(), lastRefresh: null }, now)).toBe(false);
    expect(isCacheStale({ ...getState(), lastRefresh: now - TTL_MS + 1000 }, now)).toBe(false);
    expect(isCacheStale({ ...getState(), lastRefresh: now - TTL_MS - 1000 }, now)).toBe(true);
  });
});

describe('refreshNow (refresh buttons)', () => {
  it('ignores repeat taps, stays busy long enough to see, then reports the result', async () => {
    const fetch = mockFetch(() => ok({ results: [launchDto()] }));
    const started = Date.now();
    const first = refreshNow();
    expect(getState().manualRefreshing).toBe(true);
    await Promise.all([refreshNow(), refreshNow(), first]);
    expect(Date.now() - started).toBeGreaterThanOrEqual(MANUAL_REFRESH_MIN_MS - 20);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getState().manualRefreshing).toBe(false);
    expect(getState().toast?.text).toBe('Launch data updated');
  });

  it('tells the user when it could not refresh', async () => {
    setOnline(false);
    await refreshNow();
    expect(getState().toast?.text).toBe("You're offline — showing previously saved data");
    setOnline(true);
    mockFetch(() => Promise.resolve(new Response('', { status: 500 })));
    await refreshNow();
    expect(getState().toast?.text).toBe('Refresh failed — showing previously saved data');
  });
});
