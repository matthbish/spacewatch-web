import { expect, test } from '@playwright/test';
import { isMobile, mockApi } from './helpers';

test.beforeEach(async ({ page }) => { await mockApi(page); });

for (const route of ['#/', '#/favorites', '#/settings', '#/launch/f9-1', '#/entity/PROVIDER/121/SpaceX']) {
  test(`exactly one Support SpaceWatch link is shown on ${route}`, async ({ page }) => {
    await page.goto(`./${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('support-link').filter({ visible: true })).toHaveCount(1);
  });
}

test('is small and unobtrusive, and leads to the support page without popups', async ({ page }, info) => {
  await page.goto('./');
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
  const link = page.getByTestId('support-link').filter({ visible: true }).first();
  const box = (await link.boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(isMobile(info) ? 40 : 64);

  let popups = 0;
  page.on('popup', () => popups++);
  await link.click();
  await expect(page).toHaveURL(/#\/support$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Support SpaceWatch' })).toBeVisible();
  expect(popups).toBe(0);
  expect(await page.getByRole('dialog').count()).toBe(0);
});

test('the support page does not link to itself on mobile, and marks the rail link current on desktop', async ({ page }, info) => {
  await page.goto('./#/support');
  await expect(page.getByRole('heading', { level: 1, name: 'Support SpaceWatch' })).toBeVisible();
  const visible = page.getByTestId('support-link').filter({ visible: true });
  if (isMobile(info)) {
    await expect(visible).toHaveCount(0);
  } else {
    await expect(visible).toHaveCount(1);
    await expect(visible).toHaveAttribute('aria-current', 'page');
  }
});

test('the support page offers GitHub Sponsors and Ko-fi, each in a new tab', async ({ page }) => {
  await page.goto('./#/support');
  const options = page.getByTestId('support-option');
  await expect(options).toHaveCount(2);
  const github = page.getByRole('link', { name: /Sponsor on GitHub \(opens in a new tab\)/ });
  const kofi = page.getByRole('link', { name: /Tip on Ko-fi \(opens in a new tab\)/ });
  await expect(github).toHaveAttribute('href', 'https://github.com/sponsors/matthbish?frequency=recurring');
  await expect(kofi).toHaveAttribute('href', 'https://ko-fi.com/matthewbishop');
  for (const link of [github, kofi]) {
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  // Equal-weight choices: same size, whichever layout the viewport gets.
  const [a, b] = await Promise.all([github.boundingBox(), kofi.boundingBox()]);
  expect(a!.width).toBeCloseTo(b!.width, 0);
  expect(a!.height).toBeCloseTo(b!.height, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
