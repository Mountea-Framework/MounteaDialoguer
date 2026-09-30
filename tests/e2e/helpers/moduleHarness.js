import { randomUUID } from 'node:crypto';

/** Load real Vite application modules without mounting startup or contacting services.
 * Playwright supplies a fresh browser context per test. Pages in the same context
 * intentionally share localStorage; use separate contexts for independent clients.
 */
export async function openModuleHarness(page, { profileId = `regression-${randomUUID()}` } = {}) {
	let harnessOrigin;
	await page.route('**/*', async (route) => {
		const url = new URL(route.request().url());
		if (!harnessOrigin && url.pathname === '/__module_harness__' && ['127.0.0.1', 'localhost'].includes(url.hostname)) harnessOrigin = url.origin;
		if (url.origin !== harnessOrigin) {
			return route.abort('blockedbyclient');
		}
		if (url.pathname === '/__module_harness__') {
			return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>' });
		}
		return route.continue();
	});
	await page.addInitScript((id) => {
		localStorage.setItem('mountea-active-profile-id', id);
		localStorage.setItem('onboarding-dashboard', 'true');
		localStorage.setItem('onboarding-dialogue-editor', 'true');
	}, profileId);
	await page.goto('/__module_harness__');
	await page.evaluate(async () => {
		const { default: refresh } = await import('/@react-refresh');
		refresh.injectIntoGlobalHook(window);
		window.$RefreshReg$ = () => {};
		window.$RefreshSig$ = () => (type) => type;
		window.__vite_plugin_react_preamble_installed__ = true;
	});
	return { profileId };
}
