import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Favorite } from './domain';
import {
  REMINDER_GRACE_MS, checkReminders, dueReminders, getPermission, newLaunchMatches, requestPermission,
  requestPermissionForFavorite,
} from './notifications';
import { DEFAULT_SETTINGS, getState, reloadFromStorage, setState, updateSettings } from './store';
import { HOUR, launch } from './test-fixtures';

const fav = (type: Favorite['type'], refId: string): Favorite => ({ type, refId, displayName: refId, savedAt: 0 });

class FakeNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn(async () => { FakeNotification.permission = 'granted'; return 'granted' as const; });
  static instances: { title: string; options?: NotificationOptions }[] = [];
  onclick: (() => void) | null = null;
  constructor(title: string, options?: NotificationOptions) { FakeNotification.instances.push({ title, options }); }
}

beforeEach(() => {
  localStorage.clear();
  reloadFromStorage();
  FakeNotification.permission = 'default';
  FakeNotification.instances = [];
  FakeNotification.requestPermission.mockClear();
  vi.stubGlobal('Notification', FakeNotification);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('dueReminders', () => {
  const now = Date.now();
  const l = launch({ net: now + 24 * HOUR });

  it('fires the 24h reminder at its due time for a favorited launch', () => {
    const due = dueReminders([l], [fav('LAUNCH', 'l1')], DEFAULT_SETTINGS, now, new Set());
    expect(due.map((d) => d.title)).toEqual(['Launching in 24 hours']);
  });

  it('fires for launches matched through an entity favorite', () => {
    expect(dueReminders([l], [fav('PROVIDER', '121')], DEFAULT_SETTINGS, now, new Set())).toHaveLength(1);
  });

  it('respects each lead-time toggle and the master switch', () => {
    const favs = [fav('LAUNCH', 'l1')];
    expect(dueReminders([l], favs, { ...DEFAULT_SETTINGS, notify24h: false }, now, new Set())).toEqual([]);
    expect(dueReminders([l], favs, { ...DEFAULT_SETTINGS, notificationsEnabled: false }, now, new Set())).toEqual([]);
    const soon = launch({ net: now + HOUR });
    expect(dueReminders([soon], favs, DEFAULT_SETTINGS, now, new Set()).map((d) => d.title)).toEqual(['Launching in 1 hour']);
    expect(dueReminders([soon], favs, { ...DEFAULT_SETTINGS, notify1h: false }, now, new Set())).toEqual([]);
  });

  it('skips untracked, final, not-yet-due, too-late, and already-sent reminders', () => {
    const favs = [fav('LAUNCH', 'l1')];
    expect(dueReminders([l], [], DEFAULT_SETTINGS, now, new Set())).toEqual([]);
    expect(dueReminders([launch({ net: now + 24 * HOUR, status: 'SUCCESS' })], favs, DEFAULT_SETTINGS, now, new Set())).toEqual([]);
    expect(dueReminders([launch({ net: now + 30 * HOUR })], favs, DEFAULT_SETTINGS, now, new Set())).toEqual([]);
    expect(dueReminders([launch({ net: now + 24 * HOUR - REMINDER_GRACE_MS - 1000 })], favs, DEFAULT_SETTINGS, now, new Set())).toEqual([]);
    const [first] = dueReminders([l], favs, DEFAULT_SETTINGS, now, new Set());
    expect(dueReminders([l], favs, DEFAULT_SETTINGS, now, new Set([first.key]))).toEqual([]);
  });

  it('gives a rescheduled launch a fresh reminder', () => {
    const favs = [fav('LAUNCH', 'l1')];
    const [first] = dueReminders([l], favs, DEFAULT_SETTINGS, now, new Set());
    const moved = launch({ net: l.net - 60_000 });
    expect(dueReminders([moved], favs, DEFAULT_SETTINGS, now, new Set([first.key]))).toHaveLength(1);
  });
});

describe('newLaunchMatches', () => {
  const l = launch();
  it('matches new launches to entity favorites only', () => {
    expect(newLaunchMatches([l], [fav('ROCKET', '164')], DEFAULT_SETTINGS)).toEqual([l]);
    expect(newLaunchMatches([l], [fav('LAUNCH', 'l1')], DEFAULT_SETTINGS)).toEqual([]);
  });
  it('respects the new-launch setting and the master switch', () => {
    expect(newLaunchMatches([l], [fav('ROCKET', '164')], { ...DEFAULT_SETTINGS, notifyNewFavoriteMatches: false })).toEqual([]);
    expect(newLaunchMatches([l], [fav('ROCKET', '164')], { ...DEFAULT_SETTINGS, notificationsEnabled: false })).toEqual([]);
  });
});

describe('permission', () => {
  it('reports unsupported browsers', () => {
    vi.unstubAllGlobals();
    // jsdom has no Notification API, which is exactly the unsupported-browser case.
    expect(getPermission()).toBe('unsupported');
  });

  it('asks on favorite only when reminders are on and the user has not decided yet', async () => {
    updateSettings({ notificationsEnabled: false });
    requestPermissionForFavorite();
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled();
    updateSettings({ notificationsEnabled: true });
    FakeNotification.permission = 'denied';
    requestPermissionForFavorite();
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled();
    FakeNotification.permission = 'default';
    requestPermissionForFavorite();
    expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('returns the resulting permission after a request', async () => {
    expect(await requestPermission()).toBe('granted');
  });
});

describe('checkReminders', () => {
  it('shows a due reminder once, even across repeated checks', async () => {
    FakeNotification.permission = 'granted';
    const now = Date.now();
    setState({ launches: [launch({ net: now + HOUR })], favorites: [fav('LAUNCH', 'l1')] });
    checkReminders(getState(), now);
    checkReminders(getState(), now + 30_000);
    await vi.waitFor(() => expect(FakeNotification.instances).toHaveLength(1));
    expect(FakeNotification.instances[0].title).toBe('Launching in 1 hour');
    expect(FakeNotification.instances[0].options?.data).toEqual({ url: expect.stringContaining('#/launch/l1') });
  });

  it('does nothing without permission', async () => {
    FakeNotification.permission = 'denied';
    const now = Date.now();
    setState({ launches: [launch({ net: now + HOUR })], favorites: [fav('LAUNCH', 'l1')] });
    checkReminders(getState(), now);
    await new Promise((r) => setTimeout(r, 10));
    expect(FakeNotification.instances).toHaveLength(0);
  });
});
