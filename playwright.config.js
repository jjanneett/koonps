import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const systemChromium = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.ui.test.js',
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:3000', viewport: { width: 960, height: 1000 }, launchOptions: { ...(existsSync(systemChromium) ? { executablePath: systemChromium } : {}), args: ['--no-sandbox'] } },
  projects: [
    { name: 'web' },
    { name: 'offline', use: { baseURL: 'https://personnel.test/index.html' } },
  ],
  webServer: { command: 'npm start', url: 'http://127.0.0.1:3000', reuseExistingServer: !process.env.CI },
});
