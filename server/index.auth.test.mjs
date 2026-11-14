import { localTestFetch } from '../scripts/test-http.mjs';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

let root, base, child, setupCode, cookie;
const PASSWORD = 'correct horse';
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const post = (url, body, headers = JSON_HEADERS) => localTestFetch(base, base + url, { method: 'POST', headers, body: JSON.stringify(body) });
const sync = (headers = {}) => localTestFetch(base, `${base}/api/sync/files`, { headers });
const status = async () => (await localTestFetch(base, `${base}/api/auth/status`, { headers: cookie ? { Cookie: cookie } : {} })).json();

beforeAll(async () => {
	root = await fs.mkdtemp(path.join(os.tmpdir(), 'dialoguer-auth-'));
	const env = { ...process.env, PORT: '0', DATA_DIR: path.join(root, 'data'), DIST_DIR: root };
	child = spawn(process.execPath, ['server/index.mjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
	base = await new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('startup timed out')), 10000);
		let output = '';
		child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`server exited: ${code}`)); });
		child.stdout.on('data', (data) => {
			output += data.toString();
			const port = output.match(/on :(\d+)/), code = output.match(/Sync setup code: ([A-Z0-9]{4}-[A-Z0-9]{4})\./);
			if (port && code) { clearTimeout(timer); setupCode = code[1]; resolve(`http://127.0.0.1:${port[1]}`); }
		});
	});
});
afterAll(async () => {
	if (child && child.exitCode === null) { const exited = new Promise((resolve) => child.once('exit', resolve)); child.kill(); await exited; }
	if (root) await fs.rm(root, { recursive: true, force: true });
});

// Tests run in order: they walk one server through first-run setup, login, logout and lockout.
describe('sync password auth', () => {
	it('reports unconfigured before setup and requires setup for sync', async () => {
		expect(await status()).toEqual({ configured: false, authenticated: false });
		const res = await sync(); expect(res.status).toBe(401); expect((await res.json()).code).toBe('SETUP_REQUIRED');
		const login = await post('/api/auth/login', { password: PASSWORD }); expect(login.status).toBe(409); expect((await login.json()).code).toBe('SETUP_REQUIRED');
	});
	it('rejects a wrong setup code', async () => {
		const res = await post('/api/auth/setup', { code: 'AAAA-AAAA', password: PASSWORD });
		expect(res.status).toBe(400); expect(await res.json()).toMatchObject({ code: 'INVALID_SETUP_CODE' });
	});
	it('rejects a weak password', async () => {
		const res = await post('/api/auth/setup', { code: setupCode, password: 'short' });
		expect(res.status).toBe(400); expect((await res.json()).code).toBe('WEAK_PASSWORD');
	});
	it('sets the password with the right code (any case, no dash) and issues a cookie', async () => {
		const res = await post('/api/auth/setup', { code: setupCode.replace('-', '').toLowerCase(), password: PASSWORD });
		expect(res.status).toBe(201); expect(await res.json()).toEqual({ ok: true });
		const header = res.headers.get('set-cookie');
		expect(header).toMatch(/^mountea_sync=[A-Za-z0-9_-]{43};/);
		for (const part of ['HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=2592000']) expect(header).toContain(part);
		expect(header).not.toContain('Secure');
		cookie = header.split(';')[0];
		expect(await status()).toEqual({ configured: true, authenticated: true });
		expect(await fs.readFile(path.join(root, 'data', 'sync-auth.json'), 'utf8')).not.toContain(PASSWORD);
	});
	it('refuses a second setup', async () => {
		const res = await post('/api/auth/setup', { code: setupCode, password: 'another password' });
		expect(res.status).toBe(409); expect((await res.json()).code).toBe('ALREADY_CONFIGURED');
	});
	it('guards sync with the cookie', async () => {
		const res = await sync(); expect(res.status).toBe(401); expect(await res.json()).toEqual({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
		expect((await sync({ Cookie: 'mountea_sync=forged' })).status).toBe(401);
		expect((await sync({ Cookie: cookie })).status).toBe(200);
	});
	it('keeps the auth file out of the file API', async () => {
		const create = await localTestFetch(base, `${base}/api/sync/files`, { method: 'POST', headers: { ...JSON_HEADERS, Cookie: cookie }, body: JSON.stringify({ name: 'mountea-a.json', content: '{}' }) });
		expect(create.status).toBe(201);
		const listed = await (await sync({ Cookie: cookie })).json();
		expect(listed.files.map((file) => file.name)).toEqual(['mountea-a.json']);
		expect((await localTestFetch(base, `${base}/api/sync/files/sync-auth.json`, { headers: { Cookie: cookie } })).status).toBe(404);
	});
	it('keeps /api/health open', async () => expect((await localTestFetch(base, `${base}/api/health`)).status).toBe(200));
	it('rejects mutating requests without a JSON content type', async () => {
		const res = await post('/api/auth/login', { password: PASSWORD }, { 'Content-Type': 'text/plain' });
		expect(res.status).toBe(415); expect((await res.json()).code).toBe('UNSUPPORTED_MEDIA_TYPE');
	});
	it('logs in with the right password and rejects a wrong one', async () => {
		const bad = await post('/api/auth/login', { password: 'nope nope nope' }); expect(bad.status).toBe(401); expect((await bad.json()).code).toBe('INVALID_PASSWORD');
		const good = await post('/api/auth/login', { password: PASSWORD }); expect(good.status).toBe(200); expect(await good.json()).toEqual({ ok: true });
		cookie = good.headers.get('set-cookie').split(';')[0];
		expect((await sync({ Cookie: cookie })).status).toBe(200);
	});
	it('logout clears the cookie and ends the session', async () => {
		const res = await localTestFetch(base, `${base}/api/auth/logout`, { method: 'POST', headers: { ...JSON_HEADERS, Cookie: cookie } });
		expect(res.status).toBe(200); expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
		expect((await sync({ Cookie: cookie })).status).toBe(401);
	});
	it('rate limits after five failed attempts', async () => {
		// parallel guesses must be counted before the slow hash, so only the first five get through
		const results = await Promise.all(Array.from({ length: 6 }, () => post('/api/auth/login', { password: 'wrong wrong' })));
		const codes = results.map((res) => res.status).sort();
		expect(codes).toEqual([401, 401, 401, 401, 401, 429]);
		expect((await post('/api/auth/login', { password: PASSWORD })).status).toBe(429);
	});
});
