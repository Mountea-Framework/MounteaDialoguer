import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { createTrustedIpc, isTrustedRendererUrl, validatePayload } = require('../../electron/security.cjs');
const { createCredentialVault } = require('../../electron/credentials.cjs');
const { createSteamFileTransport } = require('../../electron/steam-files.cjs');
const { appendDiagnostic } = require('../../electron/diagnostics.cjs');
const { createOAuthSession } = require('../../electron/oauth-session.cjs');
const { createAutomationHost, readAutomationSettings, writeAutomationSettings } = require('../../electron/automation.cjs');
const { defaultUserDataDir, fallbackUserDataDirs, userDataCandidates } = require('../../electron/userDataPaths.cjs');

// Raw HTTP so tests can send the Host and Origin headers a browser or a rebinding attack would.
function rawRequest(port, { method = 'GET', pathname = '/', headers = {}, body } = {}) {
	return new Promise((resolve, reject) => {
		const request = http.request({ host: '127.0.0.1', port, method, path: pathname, headers: { Host: `127.0.0.1:${port}`, ...headers } }, (response) => {
			const chunks = [];
			response.on('data', (chunk) => chunks.push(chunk));
			response.on('end', () => resolve({ status: response.statusCode, text: Buffer.concat(chunks).toString('utf8') }));
		});
		request.on('error', reject);
		if (body !== undefined) request.write(body);
		request.end();
	});
}

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

test('CLI-001 automation endpoint is opt-in, loopback-only, token-guarded and forwards to the renderer', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mountea-automation-'));
	let host;
	try {
		expect(readAutomationSettings(directory)).toEqual({ enabled: false });
		writeAutomationSettings(directory, { enabled: true });
		expect(readAutomationSettings(directory)).toEqual({ enabled: true });

		const forwarded = [];
		let shutdowns = 0, headless = true;
		host = createAutomationHost({
			directory, version: '9.9.9', timeoutMs: 300, maxBodyBytes: 1024,
			forward: (id, message) => {
				forwarded.push(message);
				if (message.method === 'ping') setImmediate(() => host.receive(id, { jsonrpc: '2.0', id: message.id, result: {} }));
				if (message.method === 'notifications/initialized') setImmediate(() => host.receive(id, null));
			},
			canShutdown: () => headless, onShutdown: () => { shutdowns += 1; }, getMode: () => 'headless',
		});
		const { port } = await host.start();
		const endpoint = JSON.parse(await fs.readFile(path.join(directory, 'automation.json'), 'utf8'));
		expect(endpoint).toMatchObject({ port, pid: process.pid, version: '9.9.9', mode: 'headless' });
		expect(endpoint.token.length).toBeGreaterThanOrEqual(40);
		const auth = { Authorization: `Bearer ${endpoint.token}`, 'Content-Type': 'application/json' };
		const ping = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' });

		expect((await rawRequest(port, { pathname: '/health' })).text).toBe('{"ok":true,"ready":false}');
		expect((await rawRequest(port, { method: 'POST', pathname: '/mcp', headers: auth, body: ping })).status).toBe(503);
		host.setReady(true);
		expect((await rawRequest(port, { method: 'POST', pathname: '/mcp', body: ping })).status).toBe(401);
		expect((await rawRequest(port, { method: 'POST', pathname: '/mcp', headers: { ...auth, Authorization: 'Bearer wrong' }, body: ping })).status).toBe(401);
		expect((await rawRequest(port, { method: 'POST', pathname: '/mcp', headers: { ...auth, Host: `evil.example:${port}` }, body: ping })).status).toBe(403);
		expect((await rawRequest(port, { method: 'POST', pathname: '/mcp', headers: { ...auth, Origin: 'https://evil.example' }, body: ping })).status).toBe(403);
		expect((await rawRequest(port, { method: 'POST', pathname: '/mcp', headers: auth, body: 'x'.repeat(2048) })).status).toBe(413);
		expect((await rawRequest(port, { method: 'POST', pathname: '/mcp', headers: auth, body: '{not json' })).status).toBe(400);

		const answered = await rawRequest(port, { method: 'POST', pathname: '/mcp', headers: auth, body: ping });
		expect(answered).toEqual({ status: 200, text: '{"jsonrpc":"2.0","id":1,"result":{}}' });
		expect((await rawRequest(port, { method: 'POST', pathname: '/mcp', headers: auth, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) })).status).toBe(202);
		expect((await rawRequest(port, { method: 'POST', pathname: '/mcp', headers: auth, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) })).status).toBe(504);
		expect(forwarded.map((message) => message.method)).toEqual(['ping', 'notifications/initialized', 'tools/list']);

		headless = false;
		expect((await rawRequest(port, { method: 'POST', pathname: '/shutdown', headers: auth })).status).toBe(409);
		headless = true;
		expect((await rawRequest(port, { method: 'POST', pathname: '/shutdown', headers: auth })).status).toBe(200);
		await new Promise((resolve) => setImmediate(resolve));
		expect(shutdowns).toBe(1);

		host.stop();
		await expect(fs.access(path.join(directory, 'automation.json'))).rejects.toThrow();
		await expect(rawRequest(port, { pathname: '/health' })).rejects.toThrow();
	} finally {
		host?.stop();
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test('CLI-002 automation IPC accepts only well-formed payloads; CLI finds the app profile like the app does', async () => {
	expect(() => validatePayload('automation:get-status', undefined)).not.toThrow();
	expect(() => validatePayload('automation:get-status', {})).toThrow('Unexpected');
	expect(() => validatePayload('automation:set-enabled', { enabled: true })).not.toThrow();
	expect(() => validatePayload('automation:set-enabled', { enabled: 'yes' })).toThrow('setting');
	expect(() => validatePayload('automation:set-enabled', { enabled: true, port: 1 })).toThrow('setting');
	expect(() => validatePayload('automation:ready', {})).not.toThrow();
	expect(() => validatePayload('automation:ready', { extra: 1 })).toThrow('argument');
	expect(() => validatePayload('automation:response', { id: 'abc-123', response: null })).not.toThrow();
	expect(() => validatePayload('automation:response', { id: 'abc-123', response: [{ jsonrpc: '2.0', id: 1, result: {} }] })).not.toThrow();
	expect(() => validatePayload('automation:response', { id: '../x', response: null })).toThrow('response');
	expect(() => validatePayload('automation:response', { id: 'abc', response: 'text' })).toThrow('response');
	expect(() => validatePayload('automation:response', { id: 'abc', response: {}, extra: true })).toThrow('response');
	expect(() => validatePayload('automation:request', {})).toThrow('Unknown');

	const env = { APPDATA: 'C:\\Users\\u\\AppData\\Roaming', LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local', MOUNTEA_USER_DATA_DIR: 'D:\\profile' };
	expect(defaultUserDataDir({ platform: 'win32', env, homedir: 'C:\\Users\\u' })).toBe(path.join(env.APPDATA, 'Mountea Dialoguer'));
	expect(defaultUserDataDir({ platform: 'darwin', env: {}, homedir: '/Users/u' })).toBe(path.join('/Users/u', 'Library', 'Application Support', 'Mountea Dialoguer'));
	expect(defaultUserDataDir({ platform: 'linux', env: {}, homedir: '/home/u' })).toBe(path.join('/home/u', '.config', 'Mountea Dialoguer'));
	expect(fallbackUserDataDirs({ env, tempPath: 'C:\\Temp' })).toEqual(['D:\\profile', path.join(env.LOCALAPPDATA, 'Mountea Dialoguer'), path.join(env.LOCALAPPDATA, 'Mountea Dialoguer', 'user-data'), path.join('C:\\Temp', 'Mountea Dialoguer', 'user-data')]);
	expect(userDataCandidates({ explicit: 'E:\\mine', platform: 'win32', env, homedir: 'C:\\Users\\u', tempPath: 'C:\\Temp' })[0]).toBe('E:\\mine');
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
