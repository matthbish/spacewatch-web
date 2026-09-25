import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { isMobile, mockApi } from './helpers';

const footerInstall = (page: Page) => page.locator('.page-footer').getByTestId('install-link');
const railInstall = (page: Page) => page.getByRole('navigation', { name: 'Primary' }).getByTestId('install-link');
const visibleInstall = (page: Page, info: TestInfo) => (isMobile(info) ? footerInstall(page) : railInstall(page));

/** Keeps any real beforeinstallprompt away from the app so these tests are deterministic. */
async function noNativePrompt(page: Page) {
  await page.addInitScript(() => {
    window.addEventListener('beforeinstallprompt', (e) => e.stopImmediatePropagation(), true);
  });
}

/** Pretends to be running as an installed app. */
async function runInstalled(page: Page) {
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (q: string) => (q.includes('display-mode: standalone')
      ? { ...real(q), matches: true, media: q, addEventListener() {}, removeEventListener() {} } as MediaQueryList
      : real(q));
  });
}

test.beforeEach(async ({ page }) => { await mockApi(page); });

test('suggests installing quietly on every page, except where the Settings section already is', async ({ page }, info) => {
  await noNativePrompt(page);
  for (const route of ['#/', '#/favorites', '#/launch/f9-1', '#/support']) {
    await page.goto(`./${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(visibleInstall(page, info)).toBeVisible();
  }
  await page.goto('./#/settings');
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await expect(footerInstall(page)).toHaveCount(0);
});

test('without a native prompt, it leads to the install steps in Settings', async ({ page }, info) => {
  await noNativePrompt(page);
  await page.goto('./');
  await visibleInstall(page, info).click();
  await expect(page).toHaveURL(/#\/settings\/install$/);
  const heading = page.getByRole('heading', { name: 'Install app' });
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
  await expect(page.getByTestId('install-steps')).toBeVisible();
});

test('with a native prompt (Chrome, Edge, Samsung Internet), one tap opens it', async ({ page }, info) => {
  await page.goto('./');
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
  await page.evaluate(() => {
    const w = window as unknown as { __prompted: number };
    w.__prompted = 0;
    const e = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => { w.__prompted++; },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    window.dispatchEvent(e);
  });
  await visibleInstall(page, info).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __prompted: number }).__prompted)).toBe(1);
  // Accepted: the suggestion goes away, and the page never navigated.
  await expect(page.getByTestId('install-link')).toHaveCount(0);
  await expect(page).not.toHaveURL(/settings/);
});

test('Settings offers the native install button when the browser supports it', async ({ page }) => {
  await page.goto('./#/settings/install');
  await expect(page.getByRole('heading', { name: 'Install app' })).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    }));
  });
  await expect(page.getByRole('button', { name: 'Install SpaceWatch' })).toBeVisible();
  await expect(page.getByTestId('install-steps')).toHaveCount(0);
});

test('once installed, the suggestion is gone everywhere and Settings says so', async ({ page }) => {
  await runInstalled(page);
  await page.goto('./');
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
  await expect(page.getByTestId('install-link')).toHaveCount(0);
  await page.goto('./#/settings');
  await expect(page.getByTestId('install-status')).toHaveText('SpaceWatch is installed on this device.');
  await expect(page.getByRole('switch', { name: 'Suggest installing' })).toHaveCount(0);
});

test('the suggestion can be switched off in Settings, persistently', async ({ page }) => {
  await noNativePrompt(page);
  await page.goto('./#/settings/install');
  await page.getByRole('switch', { name: 'Suggest installing' }).uncheck();
  await page.goto('./');
  await page.reload();
  await expect(page.getByTestId('launch-card').first()).toBeVisible();
  await expect(page.getByTestId('install-link')).toHaveCount(0);
  // The steps stay available in Settings.
  await page.goto('./#/settings/install');
  await expect(page.getByTestId('install-steps')).toBeVisible();
});

test.describe('Firefox on Android', () => {
  test.use({ userAgent: 'Mozilla/5.0 (Android 15; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0' });
  test('gets its own menu steps', async ({ page }) => {
    await noNativePrompt(page);
    await page.goto('./#/settings/install');
    await expect(page.getByTestId('install-steps')).toContainText('Add app to Home screen');
  });
});
