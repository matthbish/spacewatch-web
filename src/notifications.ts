import { useEffect, useState } from 'preact/hooks';
import { type Favorite, type Launch, isFinal, isTracked, launchMatchesEntity } from './domain';
import { type Settings, type State, getState, subscribe } from './store';

export type NotificationPermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

export const LEADS = [
  { id: 'H24', ms: 24 * 3_600_000, title: 'Launching in 24 hours', setting: 'notify24h' },
  { id: 'H1', ms: 3_600_000, title: 'Launching in 1 hour', setting: 'notify1h' },
] as const;

/**
 * How late a reminder may still fire. Browsers can't wake a closed site on a schedule (the
 * Notification Triggers API never shipped), so reminders only fire while SpaceWatch is open.
 * ponytail: a reminder missed by more than this is skipped rather than sent late with a wrong
 * "24 hours" title; upgrade path is Periodic Background Sync for installed Chromium PWAs.
 */
export const REMINDER_GRACE_MS = 10 * 60_000;
const CHECK_INTERVAL_MS = 30_000;
const SENT_KEY = 'spacewatch.sentReminders';

export function getPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotificationPermissionState;
}

/** iOS/iPadOS only exposes web notifications to sites added to the Home Screen. */
export function needsHomeScreenInstall(): boolean {
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return iOS && getPermission() === 'unsupported';
}

const PERMISSION_EVENT = 'spacewatch:permission';

export async function requestPermission(): Promise<NotificationPermissionState> {
  if (getPermission() !== 'default') return getPermission();
  try {
    await Notification.requestPermission();
  } catch {
    // Older Safari only supports the callback form; the result is read back below either way.
  }
  window.dispatchEvent(new Event(PERMISSION_EVENT));
  return getPermission();
}

/**
 * Called when the user favorites something — the moment reminders become relevant — rather
 * than on page load. Only asks once (browsers remember "denied"), and only if reminders are on.
 */
export function requestPermissionForFavorite() {
  if (getState().settings.notificationsEnabled && getPermission() === 'default') void requestPermission();
}

/** Tracks permission live: covers our own prompt, and the user changing it in site settings. */
export function usePermission(): NotificationPermissionState {
  const [permission, setPermission] = useState(getPermission);
  useEffect(() => {
    const update = () => setPermission(getPermission());
    let status: PermissionStatus | null = null;
    navigator.permissions?.query({ name: 'notifications' as PermissionName })
      .then((s) => { status = s; s.onchange = update; })
      .catch(() => {});
    window.addEventListener(PERMISSION_EVENT, update);
    document.addEventListener('visibilitychange', update);
    return () => {
      if (status) status.onchange = null;
      window.removeEventListener(PERMISSION_EVENT, update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return permission;
}

export async function showNotification(title: string, launch: Launch) {
  if (getPermission() !== 'granted') return;
  const url = `${import.meta.env.BASE_URL}#/launch/${encodeURIComponent(launch.id)}`;
  const options: NotificationOptions = {
    body: [launch.missionName, launch.rocketName].filter(Boolean).join(' · '),
    icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    badge: `${import.meta.env.BASE_URL}icons/favicon-64.png`,
    tag: `${launch.id}:${title}`,
    data: { url },
  };
  // Android Chrome only allows notifications via a service worker registration.
  const registration = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  if (registration) return registration.showNotification(title, options);
  const n = new Notification(title, options);
  n.onclick = () => { window.focus(); location.href = url; };
}

export interface DueReminder { key: string; launch: Launch; title: string }

/** Pure: which reminders should fire right now, given what has already been sent. */
export function dueReminders(
  launches: Launch[], favorites: Favorite[], settings: Settings, now: number, sent: Set<string>,
): DueReminder[] {
  if (!settings.notificationsEnabled) return [];
  return launches
    .filter((l) => !isFinal(l.status) && l.net > now && isTracked(l, favorites))
    .flatMap((launch) => LEADS
      .filter((lead) => settings[lead.setting])
      .map((lead) => ({ lead, dueAt: launch.net - lead.ms }))
      .filter(({ dueAt }) => dueAt <= now && now - dueAt <= REMINDER_GRACE_MS)
      // Keyed by net time too, so a rescheduled launch gets a fresh reminder.
      .map(({ lead }) => ({ key: `${launch.id}:${lead.id}:${launch.net}`, launch, title: lead.title }))
      .filter((r) => !sent.has(r.key)));
}

/** Pure: new launches that match a favorited rocket/provider/site/region. */
export function newLaunchMatches(newLaunches: Launch[], favorites: Favorite[], settings: Settings): Launch[] {
  if (!settings.notificationsEnabled || !settings.notifyNewFavoriteMatches) return [];
  const entities = favorites.filter((f) => f.type !== 'LAUNCH');
  return newLaunches.filter((l) => entities.some((f) => launchMatchesEntity(l, f.type, f.refId)));
}

export function notifyNewLaunches(newLaunches: Launch[]) {
  const { favorites, settings } = getState();
  newLaunchMatches(newLaunches, favorites, settings).forEach((l) => void showNotification('New launch added', l));
}

function readSent(): Map<string, number> {
  try {
    return new Map(Object.entries(JSON.parse(localStorage.getItem(SENT_KEY) ?? '{}') as Record<string, number>));
  } catch {
    return new Map();
  }
}

export function checkReminders(s: State = getState(), now = Date.now()) {
  if (getPermission() !== 'granted') return;
  // Shared through localStorage so two open tabs never both fire the same reminder.
  const sent = readSent();
  const due = dueReminders(s.launches, s.favorites, s.settings, now, new Set(sent.keys()));
  if (!due.length) return;
  due.forEach((r) => sent.set(r.key, now));
  const weekAgo = now - 7 * 86_400_000;
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(Object.fromEntries([...sent].filter(([, t]) => t > weekAgo))));
  } catch {
    // Storage blocked: worst case a reminder could repeat in another tab.
  }
  due.forEach((r) => void showNotification(r.title, r.launch));
}

export function startReminderLoop() {
  checkReminders();
  setInterval(checkReminders, CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => checkReminders());
  subscribe(() => checkReminders());
}
