import { expect, test } from '@playwright/test';
import { isMobile, mockApi, seedStorage } from './helpers';

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

test('favorite rows never grow wider than launch cards, however long the name', async ({ page }) => {
  const long = 'Rocket Lab Launch Complex 1, Mahia Peninsula, New Zealand, with an extra-long site name that cannot fit';
  await seedStorage(page, {
    'spacewatch.favorites': [
      { type: 'LAUNCH', refId: 'f9-1', displayName: 'Starlink Group 10-1', savedAt: 1 },
      { type: 'LOCATION', refId: long, displayName: long, savedAt: 2 },
      { type: 'PROVIDER', refId: '121', displayName: 'SpaceX', savedAt: 3 },
    ],
  });
  await page.goto('./#/favorites');
  const card = (await page.getByTestId('launch-card').first().boundingBox())!;
  const rows = page.getByTestId('entity-row');
  await expect(rows).toHaveCount(2);
  const [site, provider] = await Promise.all([0, 1].map((i) => rows.nth(i).boundingBox()));
  expect(site!.width).toBeLessThanOrEqual(card.width + 0.5);
  expect(site!.width).toBeCloseTo(provider!.width, 0);
  expect(await noHorizontalScroll(page)).toBe(true);
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

test('desktop: rail layout is identical on every page — mark centered, Support pinned to the bottom', async ({ page }, info) => {
  test.skip(isMobile(info), 'desktop layout');
  await page.setViewportSize({ width: 1280, height: 800 });
  const positions: string[] = [];
  for (const route of ['#/', '#/favorites', '#/settings', '#/support', '#/launch/f9-1']) {
    await page.goto(`./${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Primary' });
    const rail = (await nav.boundingBox())!;
    const mark = (await nav.getByRole('img', { name: 'SpaceWatch' }).boundingBox())!;
    const support = (await nav.getByTestId('support-link').boundingBox())!;
    const railCenter = rail.x + rail.width / 2;
    expect(Math.abs(mark.x + mark.width / 2 - railCenter), `mark centered on ${route}`).toBeLessThanOrEqual(1);
    expect(Math.abs(support.x + support.width / 2 - railCenter), `support centered on ${route}`).toBeLessThanOrEqual(1);
    expect(rail.y + rail.height - (support.y + support.height), `support at bottom on ${route}`).toBeLessThanOrEqual(24);
    positions.push(`${Math.round(mark.x)},${Math.round(mark.y)},${Math.round(support.y)}`);
  }
  expect(new Set(positions).size).toBe(1);
});

test('desktop: the rail Install and Support pills are the same size', async ({ page }, info) => {
  test.skip(isMobile(info), 'desktop layout');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./');
  const nav = page.getByRole('navigation', { name: 'Primary' });
  const [install, support] = await Promise.all([
    nav.getByTestId('install-link').boundingBox(),
    nav.getByTestId('support-link').boundingBox(),
  ]);
  expect(install!.width).toBeCloseTo(support!.width, 0);
  expect(install!.height).toBeCloseTo(support!.height, 0);
  expect(install!.x).toBeCloseTo(support!.x, 0);
});
