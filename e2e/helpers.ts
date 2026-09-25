import type { Page, TestInfo } from '@playwright/test';

export const HOUR = 3_600_000;
export const API = 'https://ll.thespacedevs.com/**';

interface DtoOptions {
  id: string;
  mission: string;
  rocketId: number;
  rocket: string;
  providerId: number;
  provider: string;
  location: string;
  country: string;
  netOffsetMs: number;
  status?: string;
  description?: string;
  image?: string | null;
}

export function dto(o: DtoOptions, now = Date.now()) {
  return {
    id: o.id,
    name: `${o.rocket} | ${o.mission}`,
    status: { abbrev: o.status ?? 'Go' },
    net: new Date(now + o.netOffsetMs).toISOString(),
    rocket: { configuration: { id: o.rocketId, name: o.rocket, full_name: o.rocket } },
    launch_service_provider: { id: o.providerId, name: o.provider },
    pad: { name: 'Pad 1', location: { name: o.location, country: { alpha_3_code: o.country } } },
    image: o.image === null ? null : { image_url: o.image ?? `https://images.example/${o.id}.jpg`, credit: 'Test Agency', license: { name: 'Unknown' } },
    mission: { name: o.mission, description: o.description ?? `${o.mission} mission description.`, type: 'Test' },
  };
}

/** A small, realistic schedule relative to now: one launching soon, a few later, one just flown. */
export function schedule(now = Date.now()) {
  return [
    dto({ id: 'electron-1', mission: 'StriX Launch 13', rocketId: 26, rocket: 'Electron', providerId: 147, provider: 'Rocket Lab', location: 'Rocket Lab Launch Complex 1, Mahia Peninsula, New Zealand', country: 'NZL', netOffsetMs: 5 * HOUR }, now),
    dto({ id: 'f9-1', mission: 'Starlink Group 10-1', rocketId: 164, rocket: 'Falcon 9 Block 5', providerId: 121, provider: 'SpaceX', location: 'Cape Canaveral SFS, FL, USA', country: 'USA', netOffsetMs: 30 * HOUR }, now),
    dto({ id: 'starship-1', mission: 'Starship Flight 14', rocketId: 999, rocket: 'Starship V3', providerId: 121, provider: 'SpaceX', location: 'SpaceX Starbase, TX, USA', country: 'USA', netOffsetMs: 72 * HOUR, status: 'TBC' }, now),
    dto({ id: 'f9-past', mission: 'Crew-13', rocketId: 164, rocket: 'Falcon 9 Block 5', providerId: 121, provider: 'SpaceX', location: 'Cape Canaveral SFS, FL, USA', country: 'USA', netOffsetMs: -5 * HOUR, status: 'Success' }, now),
  ];
}

export async function mockApi(page: Page, opts: { status?: number; body?: unknown; delayMs?: number } = {}) {
  const calls: string[] = [];
  await page.route(API, async (route) => {
    calls.push(route.request().url());
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
    await route.fulfill({
      status: opts.status ?? 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(opts.body ?? { count: 4, results: schedule() }),
    });
  });
  return calls;
}

/**
 * Pre-populates localStorage before the app boots — once per test, so a reload inside the test
 * sees whatever the app itself persisted, not the seed again.
 */
export async function seedStorage(page: Page, entries: Record<string, unknown>) {
  await page.addInitScript((data) => {
    if (sessionStorage.getItem('__seeded')) return;
    for (const [k, v] of Object.entries(data)) localStorage.setItem(k, JSON.stringify(v));
    sessionStorage.setItem('__seeded', '1');
  }, entries);
}

/**
 * Replaces the Notification API with a recorder so permission flows and delivered notifications
 * are deterministic. `permission: 'unsupported'` removes the API entirely.
 */
export async function stubNotifications(page: Page, permission: NotificationPermission | 'unsupported', grantOnRequest = true) {
  await page.addInitScript(({ permission, grantOnRequest }) => {
    const w = window as unknown as Record<string, unknown>;
    w.__notifications = [];
    w.__permissionRequests = 0;
    if (permission === 'unsupported') {
      delete w.Notification;
      return;
    }
    class FakeNotification {
      static permission = permission;
      static async requestPermission() {
        (w.__permissionRequests as number)++;
        FakeNotification.permission = grantOnRequest ? 'granted' : 'denied';
        return FakeNotification.permission;
      }
      constructor(title: string, options: NotificationOptions) {
        (w.__notifications as unknown[]).push({ title, body: options?.body, data: options?.data });
      }
    }
    w.Notification = FakeNotification;
    if ('ServiceWorkerRegistration' in window) {
      ServiceWorkerRegistration.prototype.showNotification = async function (title: string, options?: NotificationOptions) {
        (w.__notifications as unknown[]).push({ title, body: options?.body, data: options?.data });
      };
    }
  }, { permission, grantOnRequest });
}

export const isMobile = (info: TestInfo) => info.project.name === 'mobile';

/** The primary navigation link — bottom bar on mobile, side rail on desktop. */
export const navLink = (page: Page, name: string) => page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name, exact: true });
