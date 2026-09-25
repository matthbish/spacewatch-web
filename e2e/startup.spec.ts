import { expect, test } from '@playwright/test';
import { mockApi, stubNotifications } from './helpers';

test('opens straight onto upcoming launches, soonest first', async ({ page }) => {
  await mockApi(page);
  await page.goto('./');
  await expect(page).toHaveTitle('SpaceWatch — upcoming rocket launches');
  await expect(page.getByRole('heading', { level: 1, name: 'SpaceWatch' })).toBeVisible();

  const cards = page.getByTestId('launch-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0).getByRole('heading')).toHaveText('Electron');
  await expect(cards.nth(1).getByRole('heading')).toHaveText('Falcon 9 Block 5');
  await expect(cards.nth(0)).toHaveClass(/is-soon/);
  await expect(cards.nth(1)).not.toHaveClass(/is-soon/);
  await expect(cards.nth(0).getByTestId('countdown')).toHaveText(/^T− [45]h \d+m$/);
  await expect(page.getByTestId('last-updated')).toHaveText(/^Last updated \w+ \d+ at \d+:\d\d [AP]M$/);
});

test('shows skeleton placeholders while the first load is in flight', async ({ page }) => {
  await mockApi(page, { delayMs: 1_500 });
  await page.goto('./');
  await expect(page.getByTestId('skeleton-item').first()).toBeVisible();
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
  await expect(page.getByTestId('skeleton-item')).toHaveCount(0);
});

test('does not ask for notification permission on page load', async ({ page }) => {
  await stubNotifications(page, 'default');
  await mockApi(page);
  await page.goto('./');
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __permissionRequests: number }).__permissionRequests)).toBe(0);
});

test('loads every asset from under the GitHub Pages base path with no errors', async ({ page }) => {
  const failures: string[] = [];
  const errors: string[] = [];
  page.on('response', (r) => { if (r.status() >= 400) failures.push(r.url()); });
  page.on('pageerror', (e) => errors.push(e.message));
  const requested: string[] = [];
  page.on('request', (r) => { if (r.url().startsWith('http://localhost')) requested.push(new URL(r.url()).pathname); });

  await mockApi(page);
  await page.goto('./');
  await expect(page.getByTestId('launch-card').first()).toBeVisible();

  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
  expect(requested.length).toBeGreaterThan(2);
  for (const path of requested) expect(path.startsWith('/spacewatch-web/')).toBe(true);
});

test('has SEO and social metadata', async ({ page }) => {
  await mockApi(page);
  await page.goto('./');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /rocket launches/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og-image\.png$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://matthbish.github.io/spacewatch-web/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
