import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// Runs against the production build, served under the same /spacewatch-web/ base path GitHub
// Pages uses, so base-path bugs fail here rather than after deploy.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/spacewatch-web/`,
    locale: 'en-US',
    timezoneId: 'UTC',
    // Tests mock the launch API with page.route; a service worker would sit in front of that.
    // The PWA spec opts back in explicitly.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    // CI builds in its own step (so a build failure is reported as such); locally, build first.
    command: `${process.env.CI ? '' : 'npm run build && '}npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/spacewatch-web/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
