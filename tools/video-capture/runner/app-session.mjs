import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const toolRoot = path.resolve(here, '..');
const repoRoot = path.resolve(toolRoot, '../..');

/** Fixed "now" for every run, so dates in the app (cards, "Just now") are repeatable. */
export const DEFAULT_START_TIME = '2026-01-15T09:00:00Z';
/** Real-time quiet period (ms) with no DOM mutations before a frame is taken. */
const QUIET_MS = 25;

const fontCss = [400, 600, 700]
	.map((w) => `@font-face { font-family: "Inter"; font-weight: ${w}; src: url("/tools/video-capture/sandbox/fonts/inter-latin-${w}-normal.woff2") format("woff2"); }`)
	.join('\n');

/** localStorage the real app reads on boot; keeps tours, the sync prompt and the OS theme out of the recording. */
export function seededStorage({ theme, language }) {
	return {
		'onboarding-dashboard': 'true',
		'onboarding-dialogue-editor': 'true',
		// Profile-scoped store: the default profile is "local".
		'mountea-dialoguer-sync::local': JSON.stringify({ state: { hideLoginPrompt: true }, version: 0 }),
		'mountea-dialoguer-theme': theme,
		i18nextLng: language,
	};
}

/**
 * Starts the real app (repo Vite config, hash router) in Chromium on a paused fake clock.
 * @param {{ size: [number, number], scale?: number, theme?: 'dark'|'light', language?: string, seed?: number, startTime?: string, port?: number }} options
 */
export async function openAppSession({ size = [1920, 960], scale = 1, theme = 'dark', language = 'en', seed = 1, startTime = DEFAULT_START_TIME, port = 5199 } = {}) {
	const injected = await fs.readFile(path.join(toolRoot, 'sandbox-app', 'inject.js'), 'utf8');
	const config = { seed, storage: seededStorage({ theme, language }), fontCss };
	const server = await createServer({
		configFile: path.join(repoRoot, 'vite.config.js'),
		root: repoRoot,
		logLevel: 'warn',
		server: { port, strictPort: true, host: '127.0.0.1' },
	});
	let browser = null;
	try {
		await server.listen();
		const baseUrl = `http://127.0.0.1:${port}`;
		browser = await chromium.launch();
		const context = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: scale });
		// Hermetic: only the local Vite origin may be reached (Google Fonts, GitHub example download, Sentry).
		await context.route('**/*', (route) => (new URL(route.request().url()).origin === new URL(baseUrl).origin ? route.continue() : route.abort()));
		await context.addInitScript(`window.__APP_CAPTURE__ = ${JSON.stringify(config)};\n${injected}`);
		const page = await context.newPage();
		const errors = [];
		page.on('pageerror', (error) => { errors.push(error); });
		// Leaving the editor with unsaved changes raises a native confirm; accept so a script never hangs.
		page.on('dialog', (dialog) => { dialog.accept().catch(() => {}); });
		await page.clock.install({ time: new Date(startTime) });
		await page.goto(baseUrl);
		await page.clock.pauseAt(new Date(new Date(startTime).getTime() + 60000));
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

function throwIfPageError(session) {
	if (session.errors.length > 0) throw new Error(`Page error: ${session.errors[0].message}`);
}

/**
 * Lets everything that does not depend on the clock finish (IndexedDB, promises, fetch of local modules):
 * waits in real time until the DOM has been quiet for QUIET_MS, then until fonts are loaded.
 */
export async function settle(session, { timeoutMs = 8000 } = {}) {
	const { page } = session;
	const started = Date.now();
	let last = await page.evaluate(() => window.__mutationCount());
	let quietSince = Date.now();
	while (Date.now() - started < timeoutMs) {
		throwIfPageError(session);
		await new Promise((resolve) => setTimeout(resolve, 5));
		const now = await page.evaluate(() => window.__mutationCount());
		if (now !== last) { last = now; quietSince = Date.now(); continue; }
		if (Date.now() - quietSince >= QUIET_MS && await page.evaluate(() => document.fonts.status === 'loaded')) return;
	}
	throw new Error(`App did not settle within ${timeoutMs} ms`);
}

/**
 * Advances the fake clock by `ms` and steps every running animation by the same amount.
 * Animations that appear while the page settles are pinned too (otherwise they would run on the real clock
 * and the frame would differ from run to run), so this repeats until no new animation shows up.
 */
export async function advance(session, ms) {
	const { page } = session;
	await page.clock.runFor(ms);
	let step = ms;
	for (let pass = 0; pass < 6; pass++) {
		await settle(session);
		const fresh = await page.evaluate((delta) => window.__stepAnimations(delta), step);
		step = 0;
		if (fresh === 0) return;
	}
	throw new Error('Animations kept appearing while stepping a frame');
}
