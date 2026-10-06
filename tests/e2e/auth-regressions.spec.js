import { test, expect } from '@playwright/test';
import { openModuleHarness } from './helpers/moduleHarness.js';

test('ISS-025/033 a delayed Drive token refresh cannot cross profiles or start a cloud request', async ({ page }) => {
	await page.evaluate(async () => {
		const { upsertSyncAccount } = await import('/src/lib/sync/syncStorage.js');
		await upsertSyncAccount('googleDrive', { accessToken: 'expired', refreshToken: 'old-refresh', expiresAt: 1 });
		window.driveRequests = 0;
		window.fetch = (url, options) => {
			if (String(url).includes('/token')) { window.refreshSignal = options.signal; return new Promise(resolve => { window.finishRefresh = () => resolve(new Response(JSON.stringify({ access_token: 'refreshed-old', expires_in: 3600 }))); }); }
			window.driveRequests++; return Promise.resolve(new Response(JSON.stringify({ files: [] })));
		};
		const { listAppDataFiles } = await import('/src/lib/sync/googleDriveClient.js');
		window.driveResult = listAppDataFiles().then(() => 'accepted', error => error.code || error.name);
	});
	await expect.poll(() => page.evaluate(() => typeof window.finishRefresh)).toBe('function');
	const result = await page.evaluate(async () => {
		const { setActiveProfileId } = await import('/src/lib/profile/activeProfile.js');
		setActiveProfileId('drive-next-profile'); window.finishRefresh();
		const outcome = await window.driveResult;
		const { getSyncAccount } = await import('/src/lib/sync/syncStorage.js');
		return { outcome, requests: window.driveRequests, account: await getSyncAccount('googleDrive'), aborted: window.refreshSignal?.aborted };
	});
	expect(result).toEqual({ outcome: 'STALE_PROFILE', requests: 0, account: null, aborted: true });
});

test('ISS-032 browser credentials stay in memory and successful reauthentication removes legacy active-generation plaintext', async ({ page }) => {
	await openModuleHarness(page);
	const result = await page.evaluate(async () => {
		const { getRepositoryContext } = await import('/src/lib/db.js');
		const { getSyncAccount, upsertSyncAccount } = await import('/src/lib/sync/syncStorage.js');
		const context = await getRepositoryContext();
		await context.db.syncAccounts.put({ provider: 'googleDrive', accessToken: 'legacy-token' });
		const before = await getSyncAccount('googleDrive');
		await upsertSyncAccount('googleDrive', { accessToken: 'new-token', refreshToken: 'refresh-token' });
		const after = await getSyncAccount('googleDrive');
		const { useSyncStore } = await import('/src/stores/syncStore.js');
		useSyncStore.getState().setProviderPassphrase('googleDrive', 'private-passphrase');
		useSyncStore.getState().setProviderRememberPassphrase('googleDrive', true);
		return { before, after, rows: await context.db.syncAccounts.toArray(), stored: Object.values(localStorage).join(' ') };
	});
	expect(result.before).toBeNull();
	expect(result.after.accessToken).toBe('new-token');
	expect(result.rows).toEqual([]);
	for (const secret of ['new-token', 'refresh-token', 'private-passphrase']) expect(result.stored).not.toContain(secret);
});

test('ISS-025/032 delayed old-profile secure account response cannot hydrate the active store', async ({ page }) => {
	await openModuleHarness(page);
	await page.evaluate(async () => {
		window.electronAPI = { isElectron: true, credentialStatus: async () => ({ canRemember: true }), getCredential: ({ key }) => key.endsWith('passphrase') ? Promise.resolve(null) : new Promise((resolve) => { window.releaseAccount = resolve; }) };
		const { useSyncStore } = await import('/src/stores/syncStore.js');
		window.loadAccountResult = useSyncStore.getState().loadAccount().then(() => 'accepted', (error) => error.code);
	});
	await expect.poll(() => page.evaluate(() => typeof window.releaseAccount)).toBe('function');
	const result = await page.evaluate(async () => {
		const { setActiveProfileId } = await import('/src/lib/profile/activeProfile.js');
		setActiveProfileId('different-profile');
		window.releaseAccount(JSON.stringify({ provider: 'googleDrive', accessToken: 'old-profile-token', email: 'wrong-profile' }));
		const code = await window.loadAccountResult;
		const { useSyncStore } = await import('/src/stores/syncStore.js');
		return { code, label: useSyncStore.getState().getProviderInput('googleDrive').accountLabel };
	});
	expect(result.code).toBe('STALE_PROFILE'); expect(result.label).not.toBe('wrong-profile');
});

test('ISS-032 desktop migration writes OS vault before deleting legacy account record', async ({ page }) => {
	await openModuleHarness(page);
	const result = await page.evaluate(async () => {
		const vault = new Map(); let rejectWrite = true;
		window.electronAPI = { isElectron: true, credentialStatus: async () => ({ canRemember: true }), getCredential: async ({ key }) => vault.get(key) || null, setCredential: async ({ key, value }) => { if (rejectWrite) throw new Error('vault locked'); vault.set(key, value); } };
		const { getRepositoryContext } = await import('/src/lib/db.js');
		const { getSyncAccount } = await import('/src/lib/sync/syncStorage.js');
		const context = await getRepositoryContext();
		await context.db.syncAccounts.put({ provider: 'googleDrive', accessToken: 'legacy-token' });
		let failure;
		try { await getSyncAccount('googleDrive'); } catch (error) { failure = error.message; }
		const preserved = await context.db.syncAccounts.get('googleDrive');
		rejectWrite = false;
		const account = await getSyncAccount('googleDrive');
		return { failure, preserved, account, remaining: await context.db.syncAccounts.count(), secure: vault.has('googleDrive-account') };
	});
	expect(result.failure).toBe('vault locked'); expect(result.preserved.accessToken).toBe('legacy-token');
	expect(result.account.accessToken).toBe('legacy-token'); expect(result.remaining).toBe(0); expect(result.secure).toBe(true);
});

test.beforeEach(async ({ page }) => {
	await openModuleHarness(page);
	await page.evaluate(() => localStorage.setItem('mountea-google-client-id', 'test-client'));
});

test('ISS-023 blocked popup rejects and removes temporary authentication state', async ({ page }) => {
	const result = await page.evaluate(async () => {
		window.open = () => null;
		const { startGoogleDriveAuth } = await import('/src/lib/sync/googleDriveAuth.js');
		let message;
		try { await startGoogleDriveAuth(); } catch (error) { message = error.message; }
		return { message, state: sessionStorage.getItem('mountea-dialoguer-auth-state') };
	});
	expect(result).toEqual({ message: 'Popup blocked', state: null });
});

for (const scenario of ['timeout', 'close', 'abort', 'success']) {
	test(`ISS-023 ${scenario} settles popup authentication and cleans listeners/timers`, async ({ page }) => {
		await page.clock.install();
		await page.evaluate(async () => {
			const originalOpen = window.open.bind(window);
			window.open = (url) => {
				window.authState = new URL(url).searchParams.get('state');
				window.authPopup = originalOpen('/__module_harness__#oauth-test', 'oauth-test');
				return window.authPopup;
			};
			window.authListeners = 0;
			const originalAdd = window.addEventListener.bind(window), originalRemove = window.removeEventListener.bind(window);
			window.addEventListener = (type, ...args) => { if (type === 'message') window.authListeners++; return originalAdd(type, ...args); };
			window.removeEventListener = (type, ...args) => { if (type === 'message') window.authListeners--; return originalRemove(type, ...args); };
			window.authController = new AbortController();
			const { startGoogleDriveAuth } = await import('/src/lib/sync/googleDriveAuth.js');
			window.authPromise = startGoogleDriveAuth({ signal: window.authController.signal }).then((result) => { window.authOutcome = result; }, (error) => { window.authOutcome = { error: error.message, name: error.name }; });
		});
		if (scenario === 'timeout') await page.clock.runFor(60001);
		if (scenario === 'close') { await page.evaluate(() => window.authPopup.close()); await page.clock.runFor(300); }
		if (scenario === 'abort') await page.evaluate(() => window.authController.abort());
		if (scenario === 'success') {
			await page.evaluate(() => window.dispatchEvent(new MessageEvent('message', { origin: location.origin, source: window, data: { type: 'GOOGLE_OAUTH_RESULT', state: window.authState, accessToken: 'spoofed' } })));
			expect(await page.evaluate(() => window.authOutcome)).toBeUndefined();
			await page.evaluate(() => window.dispatchEvent(new MessageEvent('message', { origin: location.origin, source: window.authPopup, data: { type: 'GOOGLE_OAUTH_RESULT', state: window.authState, accessToken: 'accepted', expiresIn: 3600 } })));
		}
		const result = await page.evaluate(async () => {
			await window.authPromise;
			return { outcome: window.authOutcome, state: sessionStorage.getItem('mountea-dialoguer-auth-state'), listeners: window.authListeners, closed: window.authPopup.closed };
		});
		expect(result.state).toBeNull();
		expect(result.listeners).toBe(0);
		expect(result.closed).toBe(true);
		if (scenario === 'success') expect(result.outcome.accessToken).toBe('accepted');
		else expect(result.outcome.error).toBeTruthy();
	});
}

test('ISS-033 encryption validates version and parameters before accepting plaintext', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { encryptPayload, decryptPayload } = await import('/src/lib/sync/crypto.js');
		const encrypted = await encryptPayload('test-password', { text: 'Ahoj', count: 3 });
		const failures = [];
		for (const payload of [{ ...encrypted, version: 2 }, { ...encrypted, iv: 'YQ' }, { ...encrypted, salt: '?' }, { ...encrypted, ciphertext: 'YQ' }]) {
			try { await decryptPayload('test-password', payload); failures.push(false); } catch { failures.push(true); }
		}
		return { plain: await decryptPayload('test-password', encrypted), failures };
	});
	expect(result).toEqual({ plain: { text: 'Ahoj', count: 3 }, failures: [true, true, true, true] });
});
