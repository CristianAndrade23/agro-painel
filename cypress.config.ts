import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    viewportWidth: 1366,
    viewportHeight: 860,
    // A API mock responde com 250–600 ms de latência simulada.
    defaultCommandTimeout: 6000,
    video: false,
    screenshotOnRunFailure: true,
    retries: { runMode: 1, openMode: 0 },
  },
});
