import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { createTrustedIpc, isTrustedRendererUrl, validatePayload } = require('../../electron/security.cjs');
const { createCredentialVault } = require('../../electron/credentials.cjs');
const { createSteamFileTransport } = require('../../electron/steam-files.cjs');
const { appendDiagnostic } = require('../../electron/diagnostics.cjs');
const { createOAuthSession } = require('../../electron/oauth-session.cjs');

test('ISS-023 native cancellation rejects late tokens and holds session until cleanup', async () => {
	const session = createOAuthSession();
	let release, capturedSignal;
	const login = session.run(async (signal) => { capturedSignal = signal; return new Promise((resolve) => { release = resolve; }); });
	session.cancel();
	expect(capturedSignal.aborted).toBe(true);
	await expect(session.run(async () => 'overlap')).rejects.toThrow('already in progress');
	release({ accessToken: 'late-token' });
	await expect(login).rejects.toThrow('cancelled');
	expect(await session.run(async () => 'next-login')).toBe('next-login');
});

test('ISS-033 exact renderer origin/entry and main-frame capabilities reject forged IPC', async () => {
	const policy = { distIndexPath: path.resolve('dist/index.html'), devServerUrl: 'http://localhost:5173', isPackaged: false };
	expect(isTrustedRendererUrl('http://localhost:5173/#/projects', policy)).toBe(true);
	for (const url of ['http://localhost:51730/', 'http://127.0.0.1:5173/', 'http://localhost:5173/other.html', 'http://localhost:5173/?untrusted=1', 'javascript:alert(1)', 'file:///C:/other.html']) expect(isTrustedRendererUrl(url, policy)).toBe(false);
	const handlers = new Map(), contents = { mainFrame: { url: 'http://localhost:5173/' } };
	const ipc = createTrustedIpc({ ipcMain: { handle: (key, fn) => handlers.set(key, fn) }, getWindow: () => ({ webContents: contents }), getPolicy: () => policy, getSteamStatus: () => ({ available: true, steamId: '123' }) });
	let calls = 0;
	ipc.handle('credentials:set', () => ++calls);
	const invoke = (event, payload) => handlers.get('credentials:set')(event, payload);
	const goodEvent = { sender: contents, senderFrame: contents.mainFrame }, goodPayload = { profileId: 'steam-123', key: 'googleDrive-account', value: 'secret' };
	expect(invoke(goodEvent, goodPayload)).toBe(1);
	for (const event of [{ ...goodEvent, sender: {} }, { ...goodEvent, senderFrame: { url: contents.mainFrame.url } }]) expect(() => invoke(event, goodPayload)).toThrow('Untrusted');
	expect(() => invoke(goodEvent, { ...goodPayload, profileId: 'local' })).toThrow('profile');
	expect(() => invoke(goodEvent, { ...goodPayload, key: '../file' })).toThrow('capability');
	expect(calls).toBe(1);
	expect(() => validatePayload('steam:set-rich-presence', { entries: { project_id: null, dialogue_id: null } }, { available: true })).not.toThrow();
	expect(() => validatePayload('steam-sync:create-file', { profileId: 'steam-999' }, { available: true, steamId: '123' })).toThrow('mismatched');
	expect(() => validatePayload('auth:start-google-oauth', { clientId: 'test', scopes: ['openid'], clientSecret: 'injected' })).toThrow('argument');
	expect(() => validatePayload('dialog:save-file', { fileBase64: 'YWJj', filters: [{ name: 'bad', extensions: ['../exe'] }] })).toThrow('extension');
});

test('ISS-032 secure vault serializes atomic replacements and never falls back to plaintext', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mountea-vault-'));
	try {
		const safeStorage = { isEncryptionAvailable: () => true, encryptString: (value) => Buffer.from(value.split('').reverse().join('')), decryptString: (value) => value.toString().split('').reverse().join('') };
		const vault = createCredentialVault({ directory, safeStorage, platform: 'win32' });
		await Promise.all([vault.set('local', 'one', 'top-secret-token'), vault.set('local', 'two', 'passphrase')]);
		await vault.set('local', 'one', 'replacement-token');
		expect(await vault.get('local', 'one')).toBe('replacement-token');
		expect(await vault.get('local', 'two')).toBe('passphrase');
		const raw = await fs.readFile(path.join(directory, 'credentials.v1.json'), 'utf8');
		expect(raw).not.toContain('replacement-token'); expect(raw).not.toContain('passphrase');
		expect(await fs.readdir(directory)).toEqual(['credentials.v1.json']);
		const insecure = createCredentialVault({ directory, safeStorage: { ...safeStorage, getSelectedStorageBackend: () => 'basic_text' }, platform: 'linux' });
		expect(insecure.status()).toEqual({ canRemember: false });
		await expect(insecure.set('local', 'one', 'unsafe')).rejects.toThrow('unavailable');
		expect(await insecure.get('local', 'one')).toBeNull();
		await vault.remove('local', 'one'); expect(await vault.get('local', 'one')).toBeNull();
	} finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('ISS-022 Steam revisions survive failed upload, retries, two clients and read-only listing', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mountea-cloud-'));
	try {
		const files = new Map(); let writes = 0, fail = true;
		const cloud = { status: () => ({ available: true, enabledForApp: true, enabledForAccount: true }), list: () => [...files.keys()], read: (name) => files.get(name), write: (name, content) => { writes++; if (fail) return false; files.set(name, content); return true; } };
		const a = createSteamFileTransport({ cloud, directory: path.join(directory, 'a') });
		const b = createSteamFileTransport({ cloud, directory: path.join(directory, 'b') });
		const payload = { profileId: 'steam-123', name: 'mountea-v2-revision-a', content: '{"edit":"a"}' };
		await expect(a.create(payload)).rejects.toThrow('remains pending');
		const cacheFolder = path.join(directory, 'a', 'steam-123', 'v2');
		const pendingFile = (await fs.readdir(cacheFolder))[0];
		expect(JSON.parse(await fs.readFile(path.join(cacheFolder, pendingFile), 'utf8')).uploadState).toBe('pending');
		expect(await a.list({ profileId: 'steam-123', namePrefix: 'mountea-v2' })).toEqual([]);
		fail = false;
		const [first, second] = await Promise.all([a.create(payload), b.create({ ...payload, name: 'mountea-v2-revision-b', content: '{"edit":"b"}' })]);
		expect(first.uploadState).toBe('verified'); expect(first.id).not.toBe(second.id);
		const beforeRetry = writes;
		expect((await a.create(payload)).id).toBe(first.id); expect(writes).toBe(beforeRetry);
		expect((await a.list({ profileId: 'steam-123' })).length).toBe(2); expect(writes).toBe(beforeRetry);
		expect(await b.download({ profileId: 'steam-123', fileId: first.id })).toBe(payload.content);
		await expect(a.remove({ profileId: 'steam-123', fileId: first.id })).rejects.toThrow('history');
		expect(files.size).toBe(2);
	} finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('ISS-041 diagnostics rotate at five MiB, keep three archives, redact arbitrary provider prose', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mountea-log-'));
	try {
		const file = path.join(directory, 'diagnostics.log');
		for (let index = 0; index < 5; index++) { await fs.writeFile(file, Buffer.alloc(5 * 1024 * 1024, 32)); appendDiagnostic(file, 'UPLOAD_FAILED', { error: 'Bearer secret-token user authored title', password: 'passphrase', nested: { message: 'another secret' }, attempts: 3 }); }
		expect((await fs.readdir(directory)).sort()).toEqual(['diagnostics.log', 'diagnostics.log.1', 'diagnostics.log.2', 'diagnostics.log.3']);
		const raw = await fs.readFile(file, 'utf8');
		expect(raw).not.toContain('secret'); expect(raw).not.toContain('passphrase'); expect(raw).toContain('"attempts":3');
	} finally { await fs.rm(directory, { recursive: true, force: true }); }
});
