import { expect, test, type Page } from '@playwright/test';
import { HOUR, dto, mockApi, schedule, seedStorage, stubNotifications } from './helpers';

const notifications = (page: Page) =>
  page.evaluate(() => (window as unknown as { __notifications: { title: string; body: string; data: { url: string } }[] }).__notifications);
const permissionRequests = (page: Page) =>
  page.evaluate(() => (window as unknown as { __permissionRequests: number }).__permissionRequests);

test('asks for permission when the user first favorites something, not before', async ({ page }) => {
  await stubNotifications(page, 'default');
  await mockApi(page);
  await page.goto('./');
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
  expect(await permissionRequests(page)).toBe(0);

  await page.getByRole('button', { name: 'Favorite StriX Launch 13' }).click();
  await expect.poll(() => permissionRequests(page)).toBe(1);

  // Already decided: favoriting again never re-prompts.
  await page.getByRole('button', { name: 'Favorite Starlink Group 10-1' }).click();
  await page.waitForTimeout(200);
  expect(await permissionRequests(page)).toBe(1);
});

test('does not ask on favorite when reminders are switched off', async ({ page }) => {
  await stubNotifications(page, 'default');
  await seedStorage(page, { 'spacewatch.settings': { notificationsEnabled: false } });
  await mockApi(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Favorite StriX Launch 13' }).click();
  await page.waitForTimeout(200);
  expect(await permissionRequests(page)).toBe(0);
});

test('settings offer an Allow button while permission is undecided', async ({ page }) => {
  await stubNotifications(page, 'default');
  await mockApi(page);
  await page.goto('./#/settings');
  const notice = page.getByTestId('permission-notice');
  await expect(notice).toHaveAttribute('data-permission', 'default');
  await notice.getByRole('button', { name: 'Allow notifications' }).click();
  await expect(notice).toHaveCount(0);
});

test('explains how to recover when permission is blocked', async ({ page }) => {
  await stubNotifications(page, 'denied');
  await mockApi(page);
  await page.goto('./#/settings');
  await expect(page.getByTestId('permission-notice')).toHaveAttribute('data-permission', 'denied');
  await expect(page.getByTestId('permission-notice')).toContainText("browser's site settings");
});

test('degrades gracefully in browsers without notifications', async ({ page }) => {
  await stubNotifications(page, 'unsupported');
  await mockApi(page);
  await page.goto('./');
  // Favoriting still works; nothing throws.
  await page.getByRole('button', { name: 'Favorite StriX Launch 13' }).click();
  await expect(page.getByRole('button', { name: 'Unfavorite StriX Launch 13' })).toBeVisible();
  await page.goto('./#/settings');
  await expect(page.getByTestId('permission-notice')).toHaveAttribute('data-permission', 'unsupported');
});

test('lead-time toggles persist and hide with the master switch; limits are explained', async ({ page }) => {
  await stubNotifications(page, 'granted');
  await mockApi(page);
  await page.goto('./#/settings');
  await expect(page.getByTestId('notification-limitation')).toContainText("while it's open in a tab or running as an installed app");

  await page.getByRole('switch', { name: 'Notify 24 hours before' }).uncheck();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Notify 24 hours before' })).not.toBeChecked();
  await expect(page.getByRole('switch', { name: 'Notify 1 hour before' })).toBeChecked();

  await page.getByRole('switch', { name: 'Launch notifications' }).uncheck();
  await expect(page.getByRole('switch', { name: 'Notify 1 hour before' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Launch notifications' })).not.toBeChecked();
});

test('delivers a due 1-hour reminder for a favorited launch, once, linking to it', async ({ page }) => {
  await stubNotifications(page, 'granted');
  const now = Date.now();
  await mockApi(page, {
    body: { results: [dto({ id: 'soon', mission: 'Imminent', rocketId: 1, rocket: 'Vega C', providerId: 2, provider: 'Arianespace', location: 'Kourou, French Guiana', country: 'GUF', netOffsetMs: HOUR - 30_000 }, now)] },
  });
  await seedStorage(page, { 'spacewatch.favorites': [{ type: 'LAUNCH', refId: 'soon', displayName: 'Imminent', savedAt: now }] });
  await page.goto('./');
  await expect.poll(() => notifications(page)).toHaveLength(1);
  const [n] = await notifications(page);
  expect(n.title).toBe('Launching in 1 hour');
  expect(n.body).toContain('Imminent');
  expect(n.data.url).toBe('/spacewatch-web/#/launch/soon');

  await page.reload();
  await page.waitForTimeout(500);
  expect(await notifications(page)).toHaveLength(0); // fresh page, and the sent record prevents a repeat
});

test('entity favorites auto-apply to launches added later', async ({ page }) => {
  await stubNotifications(page, 'granted');
  const now = Date.now();
  const initial = schedule(now);
  const added = dto({ id: 'f9-new', mission: 'Brand New', rocketId: 164, rocket: 'Falcon 9 Block 5', providerId: 121, provider: 'SpaceX', location: 'Vandenberg SFB, CA, USA', country: 'USA', netOffsetMs: 100 * HOUR }, now);
  let body: unknown = { results: initial };
  await page.route('https://ll.thespacedevs.com/**', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) }));
  await seedStorage(page, { 'spacewatch.favorites': [{ type: 'ROCKET', refId: '164', displayName: 'Falcon 9 Block 5', savedAt: now }] });

  await page.goto('./');
  await expect(page.getByTestId('launch-card')).toHaveCount(3);
  expect(await notifications(page)).toHaveLength(0);

  body = { results: [...initial, added] };
  await page.getByRole('button', { name: 'Refresh launch data' }).click();
  await expect(page.getByTestId('launch-card')).toHaveCount(4);
  await expect.poll(() => notifications(page)).toEqual([expect.objectContaining({ title: 'New launch added', body: expect.stringContaining('Brand New') })]);

  await page.goto('./#/entity/ROCKET/164/Falcon%209%20Block%205');
  await expect(page.getByText('Brand New')).toBeVisible();
});
