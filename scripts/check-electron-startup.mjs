import { _electron as electron, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { seedLocalState, createProject, openDialoguesSection, createDialogue } from '../tests/e2e/helpers/appHarness.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { verifyArtifact } from './release-artifact.mjs';
import integrity from '../electron/artifact-integrity.cjs';
import { assertSameProfileDirectory, NATIVE_TEST_VIEWPORT } from './native-test-support.mjs';
const executablePath = process.env.MOUNTEA_PACKAGED_EXECUTABLE;
const evidence = { schemaVersion: 1, status: 'failed', platform: process.platform, architecture: process.arch, packaged: Boolean(executablePath), checks: {}, externalGates: ['production-signing', 'notarization', 'live-providers'] };
const pageErrors = [];

// This checks real Electron and optional installed-package contents; signing is separate.
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mountea-electron-check-'));
const resolved = path.resolve(directory);
if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('mountea-electron-check-')) throw new Error('Refusing unexpected cleanup path');
const bootstrap = path.join(directory, 'bootstrap.cjs');
const main = path.resolve('electron/main.cjs');
await fs.writeFile(bootstrap, `
const { app, BrowserWindow, session } = require('electron');
app.setPath('userData', ${JSON.stringify(path.join(directory, 'user-data'))});
BrowserWindow.prototype.show = function () {};
app.whenReady().then(() => session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true })));
require(${JSON.stringify(main)});
`);
let application;
const launchEnvironment = { ...process.env, MOUNTEA_STARTUP_CHECK: '1', VITE_DEV_SERVER_URL: '', VITE_DIST_CHANNEL: 'desktop', MOUNTEA_DIST_CHANNEL: 'desktop', MOUNTEA_SENTRY_DSN: '', VITE_SENTRY_DSN: '', MOUNTEA_USER_DATA_DIR: path.join(directory, 'user-data') };
delete launchEnvironment.ELECTRON_RUN_AS_NODE;
try {
	if (executablePath) {
		const inventory = await verifyArtifact('dist');
		evidence.release = inventory.release;
		evidence.inventorySha256 = createHash('sha256').update(await fs.readFile('dist/artifact-integrity.json')).digest('hex');
	}
	const launch = async () => {
		const app = await electron.launch({
		...(executablePath ? { executablePath: path.resolve(executablePath) } : {}),
		args: [...(executablePath ? [] : [bootstrap]), `--user-data-dir=${path.join(directory, 'user-data')}`],
		env: launchEnvironment,
		timeout: 30000,
		});
		app.context().on('page', (entry) => entry.on('pageerror', (error) => pageErrors.push(error.message)));
		for (const entry of app.context().pages()) entry.on('pageerror', (error) => pageErrors.push(error.message));
		await app.firstWindow();
		await app.evaluate(({ BrowserWindow }, viewport) => {
			globalThis.nativeValidationFailures = [];
			for (const window of BrowserWindow.getAllWindows()) {
				window.setContentSize(viewport.width, viewport.height);
				window.webContents.on('render-process-gone', (_event, details) => globalThis.nativeValidationFailures.push(`renderer: ${details.reason}`));
				window.webContents.on('did-fail-load', (_event, code) => globalThis.nativeValidationFailures.push(`load: ${code}`));
			}
		}, NATIVE_TEST_VIEWPORT);
		return app;
	};
	application = await launch();
	let page = await application.firstWindow();
	await page.waitForFunction(() => Boolean(window.electronAPI?.isElectron) && document.querySelector('#root')?.textContent.length > 50);
	await page.waitForTimeout(2000);
	const result = await application.evaluate(({ app, BrowserWindow }) => {
		const window = BrowserWindow.getAllWindows()[0];
		return { platform: process.platform, architecture: process.arch, version: app.getVersion(), userData: app.getPath('userData'), visible: window.isVisible(), preferences: window.webContents.getLastWebPreferences(), url: window.webContents.getURL() };
	});
	assert.equal(result.platform, process.env.MOUNTEA_EXPECTED_PLATFORM || process.platform);
	assert.equal(result.architecture, process.env.MOUNTEA_EXPECTED_ARCH || process.arch);
	if (executablePath) assert.equal(result.version, JSON.parse(await fs.readFile('package.json', 'utf8')).version);
	evidence.runtime = { platform: result.platform, architecture: result.architecture, version: result.version };
	await assertSameProfileDirectory(result.userData, path.join(directory, 'user-data'));
	await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(NATIVE_TEST_VIEWPORT.width);
	evidence.viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
	assert.equal(result.visible, false);
	assert.equal(result.preferences.sandbox, true);
	assert.equal(result.preferences.contextIsolation, true);
	assert.equal(result.preferences.nodeIntegration, false);
	assert.equal(new URL(result.url).protocol, 'file:');
	const status = await page.evaluate(() => window.electronAPI.getSteamStatus());
	assert.equal(status.available, false);
	const credentials = await page.evaluate(() => window.electronAPI.credentialStatus());
	assert.equal(typeof credentials.canRemember, 'boolean');
	const capability = await application.evaluate(({ safeStorage }) => ({ encryptionAvailable: safeStorage.isEncryptionAvailable(), backend: typeof safeStorage.getSelectedStorageBackend === 'function' ? safeStorage.getSelectedStorageBackend() : 'os-protected' }));
	assert.equal(credentials.canRemember, capability.encryptionAvailable && (result.platform !== 'linux' || capability.backend !== 'basic_text'));
	evidence.credentials = { canRemember: credentials.canRemember, ...capability };
	const originalUrl = page.url();
	await page.evaluate(() => { location.href = 'file:///untrusted-native-check.html'; });
	await page.waitForTimeout(250);
	assert.equal(page.url(), originalUrl);
	assert.ok(!(await page.locator('body').innerText()).includes('Local storage could not be opened safely'));
	if (executablePath) {
		const expected = integrity.fingerprintDirectory('dist');
		const actual = await application.evaluate(({ app }) => {
			// Playwright evaluates outside the application's CommonJS module scope.
			const path = process.getBuiltinModule('path');
			const load = process.getBuiltinModule('module').createRequire(path.join(app.getAppPath(), 'package.json'));
			return load(path.join(app.getAppPath(), 'electron', 'artifact-integrity.cjs')).fingerprintDirectory(path.join(app.getAppPath(), 'dist'));
		});
		assert.deepEqual(actual, expected, 'Every packaged renderer file must match the validated artifact');
		evidence.checks.packagedRendererIntegrity = 'passed';
	}
	evidence.checks.startup = 'passed';
	await seedLocalState(page);
	await page.reload();
	await createProject(page, 'NativeValidationProject');
	await openDialoguesSection(page);
	await createDialogue(page, 'NativeValidationDialogue');
	await page.locator('[data-tour="node-toolbar"]').getByRole('button', { name: 'Delay', exact: true }).click();
	await expect(page.locator('.react-flow__node-delayNode')).toHaveCount(1);
	await page.keyboard.press(result.platform === 'darwin' ? 'Meta+s' : 'Control+s');
	const dialogueUrl = page.url();
	const dialogueId = new URL(dialogueUrl).hash.split('/').filter(Boolean).at(-1);
	// Read authored records through IndexedDB without exposing a production test bridge.
	const readAuthored = async () => page.evaluate(async (id) => {
		const databases = await indexedDB.databases();
		for (const { name } of databases) {
			const database = await new Promise((resolve, reject) => { const request = indexedDB.open(name); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
			try {
				if (!database.objectStoreNames.contains('projectState')) continue;
				const tables = ['projects', 'dialogues', 'nodes', 'edges', 'localizedStrings', 'projectState', 'projectRevisions'];
				const transaction = database.transaction(tables, 'readonly');
				const entries = await Promise.all(tables.map((table) => new Promise((resolve, reject) => { const request = transaction.objectStore(table).getAll(); request.onsuccess = () => resolve([table, request.result]); request.onerror = () => reject(request.error); })));
				const records = Object.fromEntries(entries);
				if (records.dialogues.some((row) => row.id === id)) return records;
			} finally { database.close(); }
		}
		return null;
	}, dialogueId);
	await expect.poll(async () => (await readAuthored())?.nodes.filter((node) => node.dialogueId === dialogueId && node.type === 'delayNode').length).toBe(1);
	const before = await readAuthored();
	assert.ok(before.projectRevisions.length > 0, 'Authoring must persist revision history');
	assert.deepEqual(await application.evaluate(() => globalThis.nativeValidationFailures), []);
	await application.close();
	application = await launch();
	page = await application.firstWindow();
	await page.waitForFunction(() => Boolean(window.electronAPI?.isElectron) && document.querySelector('#root')?.textContent.length > 50);
	await page.goto(dialogueUrl);
	await expect(page.locator('.react-flow__node-delayNode')).toHaveCount(1);
	assert.deepEqual(await readAuthored(), before, 'Persisted authored records and revisions must survive a full native process restart unchanged');
	evidence.checks.offlineCreateSaveRestart = 'passed';
	evidence.persistence = { authoredRecordsSha256: createHash('sha256').update(JSON.stringify(before)).digest('hex'), dialogueCount: before.dialogues.length, nodeCount: before.nodes.length, revisionCount: before.projectRevisions.length };
	assert.ok(!(await page.locator('body').innerText()).includes('Local storage could not be opened safely'));
	assert.deepEqual(pageErrors, [], 'No uncaught renderer errors');
	assert.deepEqual(await application.evaluate(() => globalThis.nativeValidationFailures), [], 'No native renderer initialization failures');
	evidence.checks.rendererErrors = 'passed';
	evidence.status = 'passed';
	Object.assign(evidence, { sandbox: true, preload: true, unexpectedNavigation: 'denied', hidden: true, disposableUserData: true, providerNetwork: 'blocked' });
} catch (error) {
	evidence.failure = { name: error.name, message: error.message };
	throw error;
} finally {
	try { await application?.close(); }
	finally {
		await fs.rm(resolved, { recursive: true, force: true });
		if (process.env.MOUNTEA_NATIVE_EVIDENCE_PATH) {
			const output = path.resolve(process.env.MOUNTEA_NATIVE_EVIDENCE_PATH);
			await fs.mkdir(path.dirname(output), { recursive: true });
			await fs.writeFile(output, JSON.stringify(evidence, null, 2) + '\n');
		}
		console.log(JSON.stringify(evidence));
	}
}

