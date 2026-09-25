import { expect, test } from '@playwright/test';
import { HOUR, mockApi, seedStorage } from './helpers';

// Launches as the app itself stores them, for seeding a cache.
function cachedLaunch(id: string, netOffsetMs: number) {
  return {
    id, missionName: `Mission ${id}`, status: 'GO', net: Date.now() + netOffsetMs, netIsPrecise: true,
    rocketId: '164', rocketName: 'Falcon 9 Block 5', providerId: '121', providerName: 'SpaceX', padName: 'Pad',
    locationName: 'Cape Canaveral SFS, FL, USA', countryCode: 'USA', missionDescription: null, missionType: null, webcastUrl: null,
  };
}

test('fresh cache is served without a network request', async ({ page }) => {
  const calls = await mockApi(page);
  await seedStorage(page, { 'spacewatch.launches': [cachedLaunch('a', 10 * HOUR)], 'spacewatch.lastRefresh': Date.now() - HOUR });
  await page.goto('./');
  await expect(page.getByText('Mission a')).toBeVisible();
  await expect(page.getByTestId('data-status-banner')).toHaveCount(0);
  expect(calls).toHaveLength(0);
});

test('offline with a cache: shows it, clearly labelled with its age', async ({ page, context }) => {
  await mockApi(page);
  await seedStorage(page, { 'spacewatch.launches': [cachedLaunch('a', 10 * HOUR)], 'spacewatch.lastRefresh': Date.now() - HOUR });
  await page.goto('./');
  await expect(page.getByText('Mission a')).toBeVisible();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Refresh launch data' }).click();
  const banner = page.getByTestId('data-status-banner');
  await expect(banner).toHaveAttribute('data-status', 'OFFLINE');
  await expect(banner).toContainText("You're offline. Showing launches from");
  await expect(page.getByText('Mission a')).toBeVisible();

  await context.setOffline(false);
  // Reconnecting clears the offline state on its own, no manual refresh needed.
  await expect(banner).toHaveCount(0);
});

test('stale cache that fails to refresh keeps the data and says so', async ({ page }) => {
  await mockApi(page, { status: 503 });
  await seedStorage(page, { 'spacewatch.launches': [cachedLaunch('a', 10 * HOUR)], 'spacewatch.lastRefresh': Date.now() - 30 * HOUR });
  await page.goto('./');
  await expect(page.getByTestId('data-status-banner')).toHaveAttribute('data-status', 'REFRESH_FAILED');
  await expect(page.getByTestId('data-status-banner')).toContainText('Refresh failed. Showing the last saved launch data');
  await expect(page.getByText('Mission a')).toBeVisible();
});

test('rate limiting is a refresh failure, never an empty list', async ({ page }) => {
  await mockApi(page, { status: 429 });
  await seedStorage(page, { 'spacewatch.launches': [cachedLaunch('a', 10 * HOUR)], 'spacewatch.lastRefresh': Date.now() - HOUR });
  await page.goto('./#/settings');
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByText('Refresh failed — showing previously saved data')).toBeVisible();
  await page.goto('./');
  await expect(page.getByText('Mission a')).toBeVisible();
});

test('no cache and no data: a clear error with a working retry', async ({ page }) => {
  let fail = true;
  await page.route('https://ll.thespacedevs.com/**', (route) => (fail
    ? route.fulfill({ status: 500, body: '' })
    : route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: [] }) })));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: "Couldn't load launches" })).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('heading', { name: 'No upcoming launches' })).toBeVisible();
});

test('malformed API data is handled as a failure', async ({ page }) => {
  await mockApi(page, { body: { unexpected: 'shape' } });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: "Couldn't load launches" })).toBeVisible();
});
