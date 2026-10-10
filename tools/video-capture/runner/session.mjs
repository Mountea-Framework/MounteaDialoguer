import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const pageErrors = new WeakMap();

function throwIfPageError(page) {
	const errors = pageErrors.get(page);
	if (errors && errors.length > 0) throw new Error(`Page error: ${errors[0].message}`);
}

export async function openSession({ size = [1920, 1080], scale = 1, port = 5199 } = {}) {
	const server = await createServer({ configFile: path.join(root, 'vite.config.js'), server: { port, strictPort: true, host: '127.0.0.1' } });
	let browser = null;
	try {
		await server.listen();
		const baseUrl = `http://127.0.0.1:${port}`;
		browser = await chromium.launch();
		const context = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: scale });
		// Hermetic: only the local Vite origin may be reached (fonts.googleapis.com etc. are blocked).
		await context.route('**/*', (route) => (new URL(route.request().url()).origin === new URL(baseUrl).origin ?route.continue() : route.abort()));
		const page = await context.newPage();
		await page.clock.install({ time: 0 });
		const errors = [];
		pageErrors.set(page, errors);
		page.on('pageerror', (error) => { errors.push(error); });
		await page.goto(baseUrl);
		await page.waitForFunction(() => window.__captureReady === true);
		// page.clock.install leaves time running; pause so timers only advance via runFor/fastForward.
		await page.clock.pauseAt(60000);
		throwIfPageError(page);
		const openBrowser = browser;
		return {
			page, baseUrl, errors,
			async close() {
				try { await openBrowser.close(); } finally { await server.close(); }
			},
		};
	} catch (error) {
		try { if (browser) await browser.close(); } finally { await server.close(); }
		throw error;
	}
}

export async function idle(page, { timeoutMs = 5000 } = {}) {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		throwIfPageError(page);
		if (await page.evaluate(() => window.__capture.isIdle())) return;
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	throw new Error(`Sandbox did not become idle within ${timeoutMs} ms`);
}
