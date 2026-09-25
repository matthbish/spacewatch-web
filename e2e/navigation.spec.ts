import { expect, test } from '@playwright/test';
import { isMobile, mockApi, navLink } from './helpers';

test.beforeEach(async ({ page }) => { await mockApi(page); });

test('moves between the top-level sections', async ({ page }) => {
  await page.goto('./');
  await navLink(page, 'Favorites').click();
  await expect(page).toHaveURL(/#\/favorites$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible();
  await expect(navLink(page, 'Favorites')).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveTitle('Favorites · SpaceWatch');

  await navLink(page, 'Settings').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();

  await navLink(page, 'Launches').click();
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
});

test('opens a launch, then Back returns to the list', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('launch-card').nth(1).getByRole('link').click();
  await expect(page).toHaveURL(/#\/launch\/f9-1$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Starlink Group 10-1');
  await expect(page.getByText('Starlink Group 10-1 mission description.')).toBeVisible();
  await expect(page.getByTestId('countdown')).toHaveText(/^T− 1d \d+h \d+m$/);

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/spacewatch-web\/(#\/)?$/);
  await expect(page.getByTestId('launch-card')).toHaveCount(3);
});

test('deep links survive a reload', async ({ page }) => {
  await page.goto('./#/launch/electron-1');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('StriX Launch 13');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('StriX Launch 13');

  // Opened directly, there is no in-app history: Back goes home instead of leaving the site.
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test('rocket, provider, site, and region links open their own launch lists', async ({ page }) => {
  await page.goto('./#/launch/f9-1');
  await page.getByRole('link', { name: 'SpaceX' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('SpaceX');
  // Provider pages include every cached launch, past ones too.
  await expect(page.getByTestId('launch-card')).toHaveCount(3);

  await page.goBack();
  await page.getByRole('link', { name: 'FL, United States' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('FL, United States');
  await expect(page.getByTestId('launch-card')).toHaveCount(2);

  await page.goBack();
  await page.getByRole('link', { name: 'Falcon 9 Block 5' }).click();
  await expect(page).toHaveURL(/#\/entity\/ROCKET\/164\//);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Falcon 9 Block 5');
});

test('browser back and forward work across routes', async ({ page }) => {
  await page.goto('./');
  await navLink(page, 'Settings').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
});

test('unknown routes and missing launches get a friendly page', async ({ page }) => {
  await page.goto('./#/nowhere');
  await expect(page.getByRole('heading', { name: 'Nothing here' })).toBeVisible();
  await page.goto('./#/launch/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Launch not found' }).first()).toBeVisible();
  await page.getByRole('link', { name: 'See upcoming launches' }).click();
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
});

test('recent launches toggle weaves the just-flown launch into the timeline', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('launch-card')).toHaveCount(3);
  const toggle = page.getByRole('button', { name: 'Show launches from the past 72 hours' });
  await toggle.click();
  const cards = page.getByTestId('launch-card');
  await expect(cards).toHaveCount(4);
  await expect(cards.first()).toHaveClass(/is-past/);
  await expect(cards.first().getByTestId('countdown')).toHaveText('Launched');
  await page.getByRole('button', { name: 'Hide recent launches' }).click();
  await expect(cards).toHaveCount(3);
});

test('is fully usable from the keyboard', async ({ page }, info) => {
  test.skip(isMobile(info), 'keyboard flow is a desktop concern');
  await page.goto('./');
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
  // Tab until the first launch card's link has focus, then open it with Enter.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const href = await page.evaluate(() => document.activeElement?.getAttribute('href'));
    if (href === '#/launch/electron-1') break;
  }
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/launch\/electron-1$/);
  // Focus moves to the new page heading for screen-reader users.
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});

test('the refresh button shows it is working and ignores taps until done', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
  let calls = 0;
  await page.unroute('https://ll.thespacedevs.com/**');
  await page.route('https://ll.thespacedevs.com/**', async (route) => {
    calls++;
    await new Promise((r) => setTimeout(r, 600));
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: [] }) });
  });

  const button = page.getByRole('button', { name: 'Refresh launch data' });
  await button.click();
  const busy = page.getByRole('button', { name: 'Refreshing launch data' });
  await expect(busy).toBeDisabled();
  await expect(busy).toHaveAttribute('aria-busy', 'true');
  await expect(busy).toHaveClass(/is-spinning/);
  for (let i = 0; i < 5; i++) await busy.click({ force: true });

  await expect(page.getByRole('status').getByText('Launch data updated')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh launch data' })).toBeEnabled();
  expect(calls).toBe(1);
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`refreshing is visible without relying on the spinner (reduced motion: ${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('./');
    await expect(page.getByTestId('launch-card').first()).toBeVisible();
    await page.unroute('https://ll.thespacedevs.com/**');
    await page.route('https://ll.thespacedevs.com/**', async (route) => {
      await new Promise((r) => setTimeout(r, 1_200));
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: [] }) });
    });
    await page.getByRole('button', { name: 'Refresh launch data' }).click();
    const bar = page.getByRole('progressbar', { name: 'Refreshing launch data' });
    await expect(bar).toBeVisible();
    await expect(page.getByTestId('last-updated')).toHaveText('Refreshing launch data…');
    // The progress segment is actually painted (not animated off-screen) in both modes.
    const painted = await bar.evaluate((el) => {
      const seg = getComputedStyle(el, '::before');
      return parseFloat(seg.width) > 0 && seg.opacity !== '0';
    });
    expect(painted).toBe(true);
    await expect(bar).toHaveCount(0);
    await expect(page.getByTestId('last-updated')).toHaveText(/^Last updated /);
  });
}

test.describe('launch photo', () => {
  test('shows a muted photo with its credit at the top of the detail page', async ({ page }) => {
    const png = await (await page.request.get('./icons/icon-512.png')).body();
    await page.route('https://images.example/**', (route) => route.fulfill({ contentType: 'image/png', body: png }));
    await page.goto('./#/launch/f9-1');
    const photo = page.getByTestId('launch-image');
    await expect(photo).toHaveClass(/is-loaded/);
    await expect(photo.getByRole('img')).toHaveAttribute('alt', 'Falcon 9 Block 5 — Starlink Group 10-1');
    await expect(photo.getByText('Image: Test Agency')).toBeVisible();
    // Sits above the countdown, never in place of it.
    const [img, countdown] = await Promise.all([photo.boundingBox(), page.getByTestId('countdown').boundingBox()]);
    expect(img!.y + img!.height).toBeLessThanOrEqual(countdown!.y + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('a broken photo quietly disappears', async ({ page }) => {
    await page.route('https://images.example/**', (route) => route.fulfill({ status: 404, body: '' }));
    await page.goto('./#/launch/f9-1');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Starlink Group 10-1');
    await expect(page.getByTestId('launch-image')).toHaveCount(0);
    await expect(page.getByTestId('countdown')).toBeVisible();
  });

  test('launch lists stay text-only', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('launch-card').first()).toBeVisible();
    await expect(page.getByTestId('launch-card').locator('img')).toHaveCount(0);
  });
});
