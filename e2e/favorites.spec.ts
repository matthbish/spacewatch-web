import { expect, test } from '@playwright/test';
import { mockApi, navLink, stubNotifications } from './helpers';

test.beforeEach(async ({ page }) => {
  await stubNotifications(page, 'granted');
  await mockApi(page);
});

const storedFavorites = (page: import('@playwright/test').Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('spacewatch.favorites') ?? '[]') as { type: string; refId: string }[]);

test('favoriting a launch shows it in Favorites and survives a reload', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Favorite Starlink Group 10-1' }).click();
  await expect(page.getByRole('button', { name: 'Unfavorite Starlink Group 10-1' })).toHaveAttribute('aria-pressed', 'true');
  expect(await storedFavorites(page)).toEqual([expect.objectContaining({ type: 'LAUNCH', refId: 'f9-1' })]);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Unfavorite Starlink Group 10-1' })).toBeVisible();

  await navLink(page, 'Favorites').click();
  const section = page.getByRole('region', { name: 'Launches' });
  await expect(section.getByTestId('launch-card')).toHaveCount(1);
  await expect(section.getByText('Starlink Group 10-1')).toBeVisible();
});

test('removing a favorite from Favorites empties it, persistently', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Favorite StriX Launch 13' }).click();
  await navLink(page, 'Favorites').click();
  await page.getByRole('button', { name: 'Unfavorite StriX Launch 13' }).click();
  await expect(page.getByRole('heading', { name: 'No favorites yet' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'No favorites yet' })).toBeVisible();
  expect(await storedFavorites(page)).toEqual([]);
});

test('favoriting from the detail page confirms with a toast', async ({ page }) => {
  await page.goto('./#/launch/electron-1');
  await page.getByRole('button', { name: 'Favorite StriX Launch 13' }).click();
  await expect(page.getByRole('status').getByText('Added to favorites')).toBeVisible();
  await page.getByRole('button', { name: 'Unfavorite StriX Launch 13' }).click();
  await expect(page.getByRole('status').getByText('Removed from favorites')).toBeVisible();
});

test('a favorited rocket is a live filter listed under Rockets', async ({ page }) => {
  await page.goto('./#/launch/f9-1');
  await page.getByRole('link', { name: 'Falcon 9 Block 5' }).click();
  await page.getByRole('button', { name: 'Favorite Falcon 9 Block 5' }).click();

  await page.goto('./#/favorites');
  const rockets = page.getByRole('region', { name: 'Rockets' });
  await expect(rockets.getByTestId('entity-row')).toHaveCount(1);
  await rockets.getByRole('link', { name: 'Falcon 9 Block 5' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Falcon 9 Block 5');
  await expect(page.getByTestId('launch-card')).toHaveCount(2);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Unfavorite Falcon 9 Block 5' })).toBeVisible();
});

test('every entity type can be favorited and removed from Favorites', async ({ page }) => {
  await page.goto('./#/launch/f9-1');
  for (const name of ['SpaceX', 'Pad 1, Cape Canaveral SFS, FL, USA', 'FL, United States']) {
    await page.getByRole('link', { name, exact: true }).click();
    await page.getByRole('button', { name: /^Favorite / }).first().click();
    await page.goBack();
  }
  await page.goto('./#/favorites');
  await expect(page.getByRole('region', { name: 'Providers' }).getByTestId('entity-row')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Launch sites' }).getByTestId('entity-row')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'States & countries' }).getByTestId('entity-row')).toHaveCount(1);

  await page.getByRole('button', { name: 'Unfavorite SpaceX' }).click();
  await expect(page.getByRole('region', { name: 'Providers' })).toHaveCount(0);
  expect((await storedFavorites(page)).map((f) => f.type).sort()).toEqual(['LOCATION', 'REGION']);
});

test('favorites stay in sync across open tabs', async ({ page, context }) => {
  await page.goto('./');
  const other = await context.newPage();
  await mockApi(other);
  await other.goto('./#/favorites');
  await expect(other.getByRole('heading', { name: 'No favorites yet' })).toBeVisible();

  await page.getByRole('button', { name: 'Favorite StriX Launch 13' }).click();
  await expect(other.getByText('StriX Launch 13')).toBeVisible();
});
