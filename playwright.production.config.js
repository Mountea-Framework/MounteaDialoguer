import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PRODUCTION_PORT || 4195);
export default defineConfig({
	testDir: './tests/e2e',
	testMatch: ['smoke.spec.js', 'production-artifact.spec.js', 'product-production.spec.js'],
	timeout: 90000,
	workers: 1,
	retries: 0,
	use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
	projects: [{ name: 'production-chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: { command: `node scripts/release-artifact.mjs verify dist --unvalidated && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 30000 },
	outputDir: 'tmp/production-results',
});
