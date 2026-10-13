import { defineConfig } from '@playwright/test';
import config from './playwright.config.js';

export default defineConfig({
  ...config,
  webServer: undefined,
  projects: [{ name: 'local', use: { baseURL: new URL('./index.html', import.meta.url).href } }],
});
