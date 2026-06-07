import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: process.env.QIWI_BASE_URL || 'https://edge.qiwi.com',
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },
});
