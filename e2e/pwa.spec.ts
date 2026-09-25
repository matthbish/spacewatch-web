import { expect, test } from '@playwright/test';
import { mockApi } from './helpers';

test.use({ serviceWorkers: 'allow' });

test('ships a valid manifest with reachable icons', async ({ page, request }) => {
  await mockApi(page);
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifestUrl = new URL(href!, page.url()).href;
  const manifest = await (await request.get(manifestUrl)).json();
  expect(manifest).toMatchObject({ name: 'SpaceWatch', display: 'standalone', start_url: './', scope: './' });
  expect(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) {
    const res = await request.get(new URL(icon.src, manifestUrl).href);
    expect(res.ok(), icon.src).toBe(true);
  }
  expect((await request.get(new URL('icons/apple-touch-icon.png', page.url()).href)).ok()).toBe(true);
});

test('registers a service worker scoped to the base path, and the shell loads offline', async ({ page, context }) => {
  await mockApi(page);
  await page.goto('./');
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(scope).pathname).toBe('/spacewatch-web/');

  await context.setOffline(true);
  await page.reload();
  // App shell comes from the SW cache; launch data comes from the app's own local cache and is
  // labelled as offline rather than passed off as current.
  await expect(page.getByRole('heading', { level: 1, name: 'SpaceWatch' })).toBeVisible();
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
  await page.getByRole('button', { name: 'Refresh launch data' }).click();
  await expect(page.getByTestId('data-status-banner')).toHaveAttribute('data-status', 'OFFLINE');
  await context.setOffline(false);
});

test('never caches launch API responses in the service worker', async ({ page }) => {
  await mockApi(page);
  await page.goto('./');
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
  const cachedUrls = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const key of await caches.keys()) {
      for (const req of await (await caches.open(key)).keys()) urls.push(req.url);
    }
    return urls;
  });
  expect(cachedUrls.length).toBeGreaterThan(0);
  expect(cachedUrls.filter((u) => u.includes('thespacedevs'))).toEqual([]);
});
