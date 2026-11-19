import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests run against a live stack: the API with demo data
 * (`uv run python -m ion_pulse.seeds`) and this app's dev server.
 * By default they use the system Edge/Chrome, so no browser download is needed.
 * Override with E2E_BROWSER_CHANNEL=chrome|msedge, or set it empty to use Playwright's own browser.
 */
const channel = process.env.E2E_BROWSER_CHANNEL ?? 'msedge'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    ...(channel ? { channel } : {}),
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'app',
      testIgnore: /.*\.setup\.ts/,
      use: { storageState: 'e2e/.auth/admin.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
