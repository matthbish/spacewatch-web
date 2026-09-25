import { expect, test } from '@playwright/test';
import { isMobile, mockApi } from './helpers';

test.beforeEach(async ({ page }) => { await mockApi(page); });

const noHorizontalScroll = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test('mobile: bottom navigation, single column, nothing overflows', async ({ page }, info) => {
  test.skip(!isMobile(info), 'mobile layout');
  await page.goto('./');
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Primary' });
  const box = (await nav.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.y + box.height).toBeCloseTo(viewport.height, 0);
  expect(box.width).toBeCloseTo(viewport.width, 0);

  const [a, b] = await Promise.all([0, 1].map((i) => page.getByTestId('launch-card').nth(i).boundingBox()));
  expect(a!.x).toBeCloseTo(b!.x, 0);
  expect(await noHorizontalScroll(page)).toBe(true);

  // Touch targets are at least 44px.
  const fav = (await page.getByRole('button', { name: /^Favorite / }).first().boundingBox())!;
  expect(fav.width).toBeGreaterThanOrEqual(44);
  expect(fav.height).toBeGreaterThanOrEqual(44);
});

test('mobile: detail pages drop the bottom bar for a focused view', async ({ page }, info) => {
  test.skip(!isMobile(info), 'mobile layout');
  await page.goto('./#/launch/f9-1');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden();
  expect(await noHorizontalScroll(page)).toBe(true);
});

test('desktop: side rail with brand mark, two-column grid, rail on every page', async ({ page }, info) => {
  test.skip(isMobile(info), 'desktop layout');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./');
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Primary' });
  const box = (await nav.boundingBox())!;
  expect(box.x).toBe(0);
  expect(box.height).toBeCloseTo(800, 0);
  await expect(nav.getByRole('img', { name: 'SpaceWatch' })).toBeVisible();

  const [a, b] = await Promise.all([0, 1].map((i) => page.getByTestId('launch-card').nth(i).boundingBox()));
  expect(a!.y).toBeCloseTo(b!.y, 0);
  expect(b!.x).toBeGreaterThan(a!.x + a!.width);

  await page.goto('./#/launch/f9-1');
  await expect(nav).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);
});
