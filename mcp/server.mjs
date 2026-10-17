// Mountea Dialoguer MCP server (Streamable HTTP, stateless, no dependencies).
// Lets Claude read and edit project data directly. Runs as its own process on its own port so it can live on a
// separate hostname outside Cloudflare Access. It has its own auth: MCP_TOKEN.
//   Authorization: Bearer <MCP_TOKEN>    or    POST /mcp/<MCP_TOKEN>  (for clients that cannot send headers)
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR, ensureDirs } from '../server/storage.mjs';
import { TOOLS, TOOL_MAP } from './tools/index.mjs';
import { validateArgs } from './tools/util.mjs';
import { ToolError } from './lib/store.mjs';
import { EXPORT_DIR } from './tools/export.mjs';

const PORT = Number(process.env.MCP_PORT || 8081);
const HOST = process.env.MCP_HOST || '0.0.0.0';
const TOKEN = process.env.MCP_TOKEN || '';
const MAX_BODY = Number(process.env.MCP_MAX_BODY_MB || 10) * 1024 * 1024;
const RATE_PER_MIN = Number(process.env.MCP_RATE_PER_MIN || 240);
const AUTH_FAIL_PER_MIN = 20;
const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const AUDIT_LOG = path.join(DATA_DIR, 'mcp-audit.log');

if (TOKEN.length < 24) {
	console.error('MCP_TOKEN must be set and at least 24 characters long. Example: openssl rand -hex 24');
	process.exit(1);
}

const digest = (value) => crypto.createHash('sha256').update(value).digest();
const TOKEN_DIGEST = digest(TOKEN);
const tokenMatches = (candidate) => crypto.timingSafeEqual(digest(String(candidate || '')), TOKEN_DIGEST);

const hits = new Map(); // ip -> { count, reset }
function limited(ip, max, bucket) {
	const key = `${bucket}:${ip}`;
	const now = Date.now();
	const entry = hits.get(key);
	if (!entry || entry.reset < now) {
		hits.set(key, { count: 1, reset: now + 60000 });
		return false;
	}
	entry.count += 1;
	return entry.count > max;
}
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of hits) if (entry.reset < now) hits.delete(key);
}, 60000).unref();

const clientIp = (req) => String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

function send(res, status, body, headers = {}) {
	const payload = body === undefined ? '' : JSON.stringify(body);
	res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
	res.end(payload);
}

async function readBody(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		size += chunk.length;
		if (size > MAX_BODY) throw Object.assign(new Error('Payload too large'), { status: 413 });
		chunks.push(chunk);
	}
	return Buffer.concat(chunks).toString('utf8');
}

const redact = (value) => JSON.stringify(value, (key, v) => (typeof v === 'string' && v.length > 200 ? `${v.slice(0, 80)}…(${v.length} chars)` : v));

async function audit(entry) {
	try {
		await fs.appendFile(AUDIT_LOG, `${JSON.stringify(entry)}\n`);
	} catch {
		/* the log is best effort */
	}
}

async function callTool(params, ip, origin) {
	const tool = TOOL_MAP.get(params?.name);
	if (!tool) return { isError: true, content: [{ type: 'text', text: `Unknown tool "${params?.name}"` }] };
	const started = Date.now();
	try {
		const args = validateArgs(tool, params.arguments);
		const result = await tool.handler(args);
		if (result?.downloadPath) {
			result.downloadUrl = `${origin}/export/${encodeURIComponent(TOKEN)}${result.downloadPath.slice('/export'.length)}`;
			delete result.downloadPath;
		}
		await audit({ ts: new Date().toISOString(), ip, tool: tool.name, args: redact(args), ok: true, ms: Date.now() - started });
		return { content: [{ type: 'text', text: JSON.stringify(result ?? { ok: true }, null, 2) }] };
	} catch (error) {
		const expected = error instanceof ToolError;
		if (!expected) console.error('[mcp] tool failed', tool.name, error);
		await audit({ ts: new Date().toISOString(), ip, tool: tool.name, args: redact(params.arguments || {}), ok: false, error: String(error.message).slice(0, 300), ms: Date.now() - started });
		return { isError: true, content: [{ type: 'text', text: expected ? error.message : `Internal error: ${error.message}` }] };
	}
}

async function handleMessage(message, ip, origin) {
	const { id, method, params } = message || {};
	const isNotification = id === undefined || id === null;
	const reply = (result) => (isNotification ? null : { jsonrpc: '2.0', id, result });
	const fail = (code, text) => (isNotification ? null : { jsonrpc: '2.0', id, error: { code, message: text } });

	switch (method) {
		case 'initialize': {
			const wanted = params?.protocolVersion;
			return reply({
				protocolVersion: PROTOCOLS.includes(wanted) ? wanted : PROTOCOLS[0],
				capabilities: { tools: { listChanged: false } },
				serverInfo: { name: 'mountea-dialoguer', version: '1.0.0' },
				instructions:
					'Edits Mountea Dialoguer projects. Workflow: list_projects -> get_project -> create participants/categories -> create_dialogue -> set_graph -> validate_dialogue. Projects and dialogues cannot be deleted here. Open browser tabs refresh automatically (or ask the user to reload).',
			});
		}
		case 'ping':
			return reply({});
		case 'tools/list':
			return reply({ tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
		case 'tools/call':
			return reply(await callTool(params, ip, origin));
		default:
			if (typeof method === 'string' && method.startsWith('notifications/')) return null;
			return fail(-32601, `Method not found: ${method}`);
	}
}

async function handle(req, res) {
	const url = new URL(req.url, 'http://localhost');
	const ip = clientIp(req);
	const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
	const origin = `${proto}://${req.headers.host}`;

	if (url.pathname === '/health') return send(res, 200, { ok: true });

	const download = url.pathname.match(/^\/export\/([^/]+)\/([A-Za-z0-9_.-]+\.mnteadlg(?:proj)?)$/);
	if (download && req.method === 'GET') {
		if (!tokenMatches(decodeURIComponent(download[1]))) {
			if (limited(ip, AUTH_FAIL_PER_MIN, 'authfail')) return send(res, 429, { error: 'Too many failed attempts' });
			return send(res, 401, { error: 'Unauthorized' });
		}
		try {
			const file = await fs.readFile(path.join(EXPORT_DIR, download[2]));
			res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${download[2]}"`, 'Cache-Control': 'no-store' });
			return res.end(file);
		} catch {
			return send(res, 404, { error: 'Not found or expired' });
		}
	}

	const match = url.pathname.match(/^\/mcp(?:\/([^/]+))?\/?$/);
	if (!match) return send(res, 404, { error: 'Not found' });

	const header = String(req.headers.authorization || '');
	const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
	const authorised = tokenMatches(bearer) || (match[1] !== undefined && tokenMatches(decodeURIComponent(match[1])));
	if (!authorised) {
		if (limited(ip, AUTH_FAIL_PER_MIN, 'authfail')) return send(res, 429, { error: 'Too many failed attempts' }, { 'Retry-After': '60' });
		return send(res, 401, { error: 'Unauthorized' }, { 'WWW-Authenticate': 'Bearer' });
	}
	if (limited(ip, RATE_PER_MIN, 'req')) return send(res, 429, { error: 'Rate limit' }, { 'Retry-After': '60' });

	if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' }, { Allow: 'POST' });

	let body;
	try {
		body = JSON.parse(await readBody(req));
	} catch (error) {
		if (error.status === 413) {
			req.unpipe?.();
			req.resume();
			return send(res, 413, { error: 'Payload too large' }, { Connection: 'close' });
		}
		return send(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
	}

	if (Array.isArray(body)) {
		const results = (await Promise.all(body.map((m) => handleMessage(m, ip, origin)))).filter(Boolean);
		return results.length ? send(res, 200, results) : send(res, 202);
	}
	const result = await handleMessage(body, ip, origin);
	return result ? send(res, 200, result) : send(res, 202);
}

await ensureDirs();
http
	.createServer(async (req, res) => {
		try {
			await handle(req, res);
		} catch (error) {
			console.error('[mcp]', error);
			if (!res.headersSent) send(res, 500, { error: 'Server error' });
		}
	})
	.listen(PORT, HOST, () => console.log(`Mountea Dialoguer MCP on ${HOST}:${PORT}  data=${DATA_DIR}  tools=${TOOLS.length}`));
