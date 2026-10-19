import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

let root, base, child, storage;
beforeAll(async () => {
	root = await fs.mkdtemp(path.join(os.tmpdir(), 'dialoguer-http-'));
	const dist = path.join(root, 'dist');
	await fs.mkdir(dist); await fs.mkdir(path.join(root, 'outside'));
	await fs.writeFile(path.join(dist, 'index.html'), 'APP');
	await fs.writeFile(path.join(dist, 'asset.js'), 'ASSET');
	await fs.writeFile(path.join(root, 'dist-secret.txt'), 'SECRET');
	await fs.writeFile(path.join(root, 'outside', 'secret.txt'), 'SECRET');
	process.env.DATA_DIR = path.join(root, 'data');
	storage = await import('./storage.mjs');
	await storage.ensureDirs();
	child = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, PORT: '0', DIST_DIR: dist }, stdio: ['ignore', 'pipe', 'pipe'] });
	base = await new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('HTTP server startup timed out')), 10000);
		child.once('error', reject);
		child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`HTTP server exited: ${code}`)); });
		child.stdout.on('data', (data) => { const match = data.toString().match(/on :(\d+)/); if (match) { clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}`); } });
	});
});
afterAll(async () => {
	if (child && child.exitCode === null) { const exited = new Promise((resolve) => child.once('exit', resolve)); child.kill(); await exited; }
	if (root) await fs.rm(root, { recursive: true, force: true });
});

describe('static root boundary', () => {
	it.each(['/..%2Fdist-secret.txt', '/..%5Cdist-secret.txt', '/%2e%2e%2Foutside/secret.txt'])('rejects encoded traversal %s', async (url) => {
		const res = await fetch(base + url); expect(res.status).toBe(403); expect(await res.text()).not.toContain('SECRET');
	});
	it.each(['/%zz', '/%00', '/C%3A/secret'])('rejects invalid path %s', async (url) => expect((await fetch(base + url)).status).toBe(400));
	it('serves assets, HEAD and SPA routes', async () => {
		expect(await (await fetch(`${base}/asset.js`)).text()).toBe('ASSET');
		expect(await (await fetch(`${base}/projects/example`)).text()).toBe('APP');
		const head = await fetch(`${base}/asset.js`, { method: 'HEAD' }); expect(head.status).toBe(200); expect(await head.text()).toBe('');
	});
	it('rejects external symlinks including missing paths through them and fallback', async (context) => {
		try { await fs.symlink(path.join(root, 'outside'), path.join(root, 'dist', 'link'), 'junction'); }
		catch (error) { context.skip(`Symlinks unavailable: ${error.message}`); return; }
		for (const suffix of ['secret.txt', 'missing']) expect((await fetch(`${base}/link/${suffix}`)).status).toBe(403);
		await fs.unlink(path.join(root, 'dist', 'index.html'));
		await fs.symlink(path.join(root, 'outside', 'secret.txt'), path.join(root, 'dist', 'index.html')).catch(async () => {
			// A file symlink may need extra Windows privileges; the directory case above is still exercised.
			await fs.writeFile(path.join(root, 'dist', 'index.html'), 'APP');
		});
		if ((await fs.lstat(path.join(root, 'dist', 'index.html'))).isSymbolicLink()) expect((await fetch(`${base}/fallback`)).status).toBe(403);
	});
});

describe('file mutation contract', () => {
	const json = (method, value) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
	it.each(['mountea-revision-v2--test.json', 'mountea-deletion-v2--test.json'])('preserves immutable bytes for %s', async (name) => {
		expect((await fetch(`${base}/api/sync/files`, json('POST', { name, content: 'original' }))).status).toBe(201);
		expect((await fetch(`${base}/api/sync/files`, json('POST', { name, content: 'duplicate' }))).status).toBe(409);
		for (const method of ['PUT', 'DELETE']) {
			const res = await fetch(`${base}/api/sync/files/${name}`, method === 'PUT' ? json(method, { content: 'replacement' }) : { method });
			expect(res.status).toBe(409); expect((await res.json()).code).toBe('IMMUTABLE_FILE');
		}
		await expect(storage.updateFile(name, 'replacement')).rejects.toMatchObject({ code: 'IMMUTABLE_FILE' });
		await expect(storage.deleteFile(name)).rejects.toMatchObject({ code: 'IMMUTABLE_FILE' });
		expect(await storage.readFileText(name)).toBe('original');
	});
	it('retains mutable file PUT and DELETE', async () => {
		const name = 'mountea-settings.json';
		expect((await fetch(`${base}/api/sync/files`, json('POST', { name, content: 'one' }))).status).toBe(201);
		expect((await fetch(`${base}/api/sync/files/${name}`, json('PUT', { content: 'two' }))).status).toBe(200);
		expect(await storage.readFileText(name)).toBe('two');
		expect((await fetch(`${base}/api/sync/files/${name}`, { method: 'DELETE' })).status).toBe(200);
		expect(await storage.readFileText(name)).toBeNull();
	});
	it('publishes one winner under concurrent creates without temporary collisions', async () => {
		const results = await Promise.allSettled(Array.from({ length: 30 }, (_, index) => storage.createFile('mountea-revision-v2--race.json', String(index))));
		const winners = results.flatMap((result, index) => result.status === 'fulfilled' ? [index] : []);
		expect(winners).toHaveLength(1);
		expect(await storage.readFileText('mountea-revision-v2--race.json')).toBe(String(winners[0]));
		expect(results.filter((result) => result.status === 'rejected').every((result) => result.reason.status === 409)).toBe(true);
		expect((await fs.readdir(storage.SYNC_DIR)).some((name) => name.endsWith('.tmp'))).toBe(false);
	});
});
