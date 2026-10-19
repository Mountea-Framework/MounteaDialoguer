import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export async function startAuthoringServer(environment = {}) {
	const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dialoguer-authoring-'));
	const token = 'authoring-tests-0123456789abcdef0123456789';
	const child = spawn(process.execPath, ['--import', './mcp/register.mjs', 'mcp/server.mjs'], { env: { ...process.env, DATA_DIR: dataDir, MCP_HOST: '127.0.0.1', MCP_PORT: '0', MCP_TOKEN: token, MCP_RATE_PER_MIN: '10000', ...environment }, stdio: ['ignore', 'pipe', 'pipe'] });
	const base = await new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('Authoring server startup timed out')), 10000);
		child.once('error', reject);
		child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Authoring server exited: ${code}`)); });
		child.stdout.on('data', (data) => { const match = data.toString().match(/on 127.0.0.1:(\d+)/); if (match) { clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}`); } });
	});
	let sequence = 0;
	const request = async (method, url, body, headers = {}) => {
		const res = await fetch(`${base}${url}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
		return { status: res.status, body: await res.json() };
	};
	const rpc = async (name, args = {}) => {
		const res = await request('POST', '/mcp', { jsonrpc: '2.0', id: ++sequence, method: 'tools/call', params: { name, arguments: args } });
		if (res.body.result.isError) throw new Error(res.body.result.content[0].text);
		return JSON.parse(res.body.result.content[0].text);
	};
	const revisions = async (projectId) => {
		const names = await fs.readdir(path.join(dataDir, 'sync'));
		return (await Promise.all(names.filter((name) => name.startsWith('mountea-revision-v2--') && !name.endsWith('.tmp')).map(async (name) => JSON.parse(await fs.readFile(path.join(dataDir, 'sync', name), 'utf8')).revision))).filter((revision) => revision.projectId === projectId);
	};
	return { base, token, dataDir, request, rpc, revisions,
		head: async (id) => { const all = await revisions(id); const parents = new Set(all.flatMap((r) => r.parentRevisionIds)); return all.find((r) => !parents.has(r.id)); },
		writeRevision: async (revision) => {
			const digest = crypto.createHash('sha256').update(JSON.stringify([revision.projectId, revision.id])).digest('hex');
			await fs.writeFile(path.join(dataDir, 'sync', `mountea-revision-v2--${digest}.json`), JSON.stringify({ schemaVersion: 2, revision }));
		},
		close: async () => { if (child.exitCode === null) { const exited = new Promise((resolve) => child.once('exit', resolve)); child.kill(); await exited; } await fs.rm(dataDir, { recursive: true, force: true }); },
	};
}
