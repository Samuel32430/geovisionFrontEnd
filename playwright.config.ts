import { defineConfig, devices } from '@playwright/test';

const localURL = 'http://127.0.0.1:14200';
const externalURL = process.env['E2E_BASE_URL'];

export default defineConfig({
  testDir: './e2e',
  forbidOnly: Boolean(process.env['CI']),
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } }],
  use: {
    baseURL: externalURL ?? localURL,
  },
  webServer: externalURL
    ? undefined
    : {
        command:
          'npm start -- --host 127.0.0.1 --port 14200 --configuration production --proxy-config proxy.lan.json',
        url: localURL,
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
