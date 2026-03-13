import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PLAYWRIGHT_PORT || 4173);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 90 * 1000,
	expect: {
		timeout: 10 * 1000,
	},
	fullyParallel: false,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI
		? [['line'], ['html', { open: 'never', outputFolder: 'tmp/playwright-report' }]]
		: [['list']],
	use: {
		baseURL: BASE_URL,
		trace: 'on-first-retry',
		video: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	webServer: {
		command: `npm run dev -- --host 127.0.0.1 --port ${PORT} --strictPort`,
		url: BASE_URL,
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	outputDir: 'tmp/playwright-results',
});
