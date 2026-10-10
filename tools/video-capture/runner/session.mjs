import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

export async function openSession({ size = [1920, 1080], scale = 1, port = 5199 } = {}) {
	const server = await createServer({ configFile: path.join(root, 'vite.config.js'), server: { port, strictPort: true, host: '127.0.0.1' } });
	await server.listen();
	const baseUrl = `http://127.0.0.1:${port}`;
	const browser = await chromium.launch();
	const context = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: scale });
	// Hermetic: only the local Vite origin may be reached (fonts.googleapis.com etc. are blocked).
	await context.route('**/*', (route) => (route.request().url().startsWith(baseUrl) ? route.continue() : route.abort()));
	const page = await context.newPage();
	await page.clock.install({ time: 0 });
	page.on('pageerror', (error) => { throw error; });
	await page.goto(baseUrl);
	await page.waitForFunction(() => window.__captureReady === true);
	// page.clock.install leaves time running; pause so timers only advance via runFor/fastForward.
	await page.clock.pauseAt(60000);
	return {
		page, baseUrl,
		async close() { await browser.close(); await server.close(); },
	};
}

export async function idle(page, { timeoutMs = 5000 } = {}) {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		if (await page.evaluate(() => window.__capture.isIdle())) return;
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	throw new Error(`Sandbox did not become idle within ${timeoutMs} ms`);
}
