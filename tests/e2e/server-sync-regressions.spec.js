import { test, expect } from '@playwright/test';
import { openModuleHarness } from './helpers/moduleHarness';

test.beforeEach(async ({ page }) => {
	await openModuleHarness(page);
	await page.route('**/src/lib/runtimeConfig.js*', async (route) => {
		const response = await route.fetch();
		const body = (await response.text()).replace(/function isSelfHostedSync\(\) \{[\s\S]*?\n\}/, 'function isSelfHostedSync() { return true; }');
		await route.fulfill({ response, body });
	});
});

test('self-hosted health failure is retryable and a restored server recovers on online or timer', async ({ page }) => {
	await page.route('**/api/health', (route) => route.fulfill({ status: 503, body: '{}' }));
	await page.clock.install();
	const initial = await page.evaluate(async () => {
		const { useSyncStore, startSyncRetryWorker } = await import('/src/stores/syncStore.js');
		await useSyncStore.getState().loadAccount();
		window.serverStore = useSyncStore;
		window.attempts = 0;
		useSyncStore.setState({ syncAllProjects: async () => { window.attempts += 1; useSyncStore.setState({ status: 'connected', error: null }); } });
		window.stopServerRetry = startSyncRetryWorker();
		return { status: useSyncStore.getState().status, error: useSyncStore.getState().error };
	});
	expect(initial).toEqual({ status: 'error', error: 'syncFailed' });
	await page.evaluate(() => window.dispatchEvent(new Event('online')));
	await expect.poll(() => page.evaluate(() => window.attempts)).toBe(1);
	await page.evaluate(() => window.serverStore.setState({ status: 'error' }));
	await page.clock.runFor(60000);
	await expect.poll(() => page.evaluate(() => window.attempts)).toBe(2);
	await page.evaluate(() => { window.serverStore.setState({ status: 'disconnected', provider: 'googleDrive' }); });
	await page.clock.runFor(30000); await page.evaluate(() => window.dispatchEvent(new Event('online')));
	expect(await page.evaluate(() => window.attempts)).toBe(2);
	await page.evaluate(() => window.stopServerRetry());
});

test('health timeout is bounded and cancelled profile results cannot change state', async ({ page }) => {
	await page.route('**/api/health', () => {});
	await page.clock.install();
	await page.evaluate(async () => {
		const { useSyncStore } = await import('/src/stores/syncStore.js');
		window.serverStore = useSyncStore;
		window.loadingAccount = useSyncStore.getState().loadAccount();
	});
	await page.clock.runFor(5000);
	await expect.poll(() => page.evaluate(() => window.serverStore.getState().status)).toBe('error');
	await page.evaluate(async () => {
		await window.loadingAccount;
		const { getRepositoryContext } = await import('/src/lib/db.js');
		const { setActiveProfileId } = await import('/src/lib/profile/activeProfile.js');
		const context = await getRepositoryContext();
		window.staleResult = window.serverStore.getState().loadAccount({ context }).catch((error) => error.code);
		setActiveProfileId('new-server-profile');
		window.serverStore.setState({ provider: 'googleDrive', status: 'disconnected', error: null });
	});
	expect(await page.evaluate(() => window.staleResult)).toBe('STALE_PROFILE');
	expect(await page.evaluate(() => window.serverStore.getState().status)).toBe('disconnected');
});
