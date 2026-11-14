import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it, expect, vi } from 'vitest';
import { syncRequestUrl } from '../src/lib/sync/providers/syncRequestUrl.js';
import { localTestFetch } from '../scripts/test-http.mjs';

describe('sync API URL boundary', () => {
	it.each(['/', '/dialoguer/', './'])('supports deployment base %s', (base) => {
		const url = syncRequestUrl(base, 'https://app.example/dialoguer/', 'sync', '/files?name=a%2Fb');
		expect(url.origin).toBe('https://app.example');
		expect(url.pathname).toBe(base === '/' ? '/api/sync/files' : '/dialoguer/api/sync/files');
	});
	it.each(['/filesExtra', '/files/..', '/files/%2e%2e', '/files/a#fragment', '//evil.example', '/files/../auth'])('rejects route %s', (route) => {
		expect(() => syncRequestUrl('/', 'https://app.example/', 'sync', route)).toThrow('Invalid sync path');
	});
	it.each(['https://evil.example/', '//evil.example/', 'https://user:pass@app.example/'])('rejects base %s', (base) => {
		expect(() => syncRequestUrl(base, 'https://app.example/', 'sync', '/files')).toThrow();
	});
	it('accepts encoded file names and only known auth routes', () => {
		expect(syncRequestUrl('/', 'https://app.example/', 'sync', '/files/a%2Fb').pathname).toBe('/api/sync/files/a%2Fb');
		expect(syncRequestUrl('/', 'https://app.example/', 'auth', '/login').pathname).toBe('/api/auth/login');
		expect(() => syncRequestUrl('/', 'https://app.example/', 'auth', '/unknown')).toThrow();
	});
});

it('restricts test requests and forces redirect rejection', async () => {
	const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true });
	try {
		expect(() => localTestFetch('http://127.0.0.1:1234', 'https://evil.example/')).toThrow();
		await localTestFetch('http://127.0.0.1:1234', '/files', { redirect: 'follow' });
		expect(fetch).toHaveBeenCalledWith(new URL('http://127.0.0.1:1234/files'), { redirect: 'error' });
	} finally { fetch.mockRestore(); }
});


it.each(['https://user:secret@example.com/mcp', 'http://example.com/mcp', 'file:///tmp/mcp'])('CLI rejects unsafe endpoint %s before connecting', (url) => {
	const result = spawnSync(process.execPath, ['cli/dialoguer.mjs', 'tools', '--url', url, '--token', 'test'], { encoding: 'utf8', timeout: 10000 });
	expect(result.status).toBe(2);
	expect(result.stderr).toMatch(/must not contain credentials|must use https/);
});


it('CLI refuses a redirect rather than forwarding an authenticated request', async () => {
	let followed = false;
	const server = createServer((req, res) => {
		if (req.url === '/mcp') { res.writeHead(307, { Location: '/redirected' }); res.end(); }
		else { followed = true; res.end('{}'); }
	});
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	try {
		await expect(promisify(execFile)(process.execPath, ['cli/dialoguer.mjs', 'tools', '--url', `http://127.0.0.1:${server.address().port}/mcp`, '--token', 'test'], { timeout: 10000 })).rejects.toMatchObject({ code: 3 });
		expect(followed).toBe(false);
	} finally { await new Promise((resolve) => server.close(resolve)); }
});

it.each([0, -1, 65536, '1234', '1234@evil.example'])('ignores invalid discovered port %s', async (port) => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dialoguer-port-test-'));
	try {
		await fs.writeFile(path.join(directory, 'automation.json'), JSON.stringify({ port, token: 'test', pid: process.pid }));
		const { stdout } = await promisify(execFile)(process.execPath, ['cli/dialoguer.mjs', 'status', '--json', '--user-data-dir', directory], { timeout: 10000 });
		expect(JSON.parse(stdout).running).toBe(false);
	} finally { await fs.rm(directory, { recursive: true, force: true }); }
});
