// Mountea Dialoguer MCP server (Streamable HTTP, stateless, no dependencies).
// Lets Claude read and edit project data directly. Runs as its own process on its own port so it can live on a
// separate hostname outside Cloudflare Access. It has its own auth: MCP_TOKEN.
//   Authorization: Bearer <MCP_TOKEN>    or    POST /mcp/<MCP_TOKEN>  (for clients that cannot send headers)
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR, ensureDirs } from '../server/storage.mjs';
import { TOOLS } from './tools/index.mjs';
import { executeCommand, commandError } from './lib/commands.mjs';
import { resolveRestRoute, prepareRestCommand, restResponse } from './rest.mjs';
import { ToolError } from './lib/core.mjs';
import { setBackend } from './lib/backend.mjs';
import { fileBackend } from './lib/store.mjs';
import { createRpcHandler } from './lib/jsonrpc.mjs';
import { EXPORT_DIR } from './tools/export.mjs';

const PORT = Number(process.env.MCP_PORT || 8081);
const HOST = process.env.MCP_HOST || '0.0.0.0';
const TOKEN = process.env.MCP_TOKEN || '';
const MAX_BODY = Number(process.env.MCP_MAX_BODY_MB || 10) * 1024 * 1024;
const RATE_PER_MIN = Number(process.env.MCP_RATE_PER_MIN || 240);
const AUTH_FAIL_PER_MIN = 20;
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

async function executeLoggedCommand(name, args, ip, origin) {
	const started = Date.now();
	try {
		const result = await executeCommand(name, args);
		if (result?.downloadPath) {
			result.downloadUrl = `${origin}/export/${encodeURIComponent(TOKEN)}${result.downloadPath.slice('/export'.length)}`;
			delete result.downloadPath;
		}
		await audit({ ts: new Date().toISOString(), ip, tool: name, args: redact(args), ok: true, ms: Date.now() - started });
		return result;
	} catch (error) {
		await audit({ ts: new Date().toISOString(), ip, tool: name, args: redact(args), ok: false, error: String(error.message).slice(0, 300), ms: Date.now() - started });
		throw error;
	}
}

const rpc = createRpcHandler({ tools: TOOLS, execute: (name, args, { ip, origin }) => executeLoggedCommand(name, args, ip, origin) });

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

	const isRest = url.pathname === '/api/v1' || url.pathname.startsWith('/api/v1/');
	const match = url.pathname.match(/^\/mcp(?:\/([^/]+))?\/?$/);
	if (!match && !isRest) return send(res, 404, { error: 'Not found' });

	const header = String(req.headers.authorization || '');
	const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
	const authorised = tokenMatches(bearer) || (!isRest && match?.[1] !== undefined && tokenMatches(decodeURIComponent(match[1])));
	if (!authorised) {
		if (limited(ip, AUTH_FAIL_PER_MIN, 'authfail')) return send(res, 429, { error: isRest ? { code: 'RATE_LIMIT', message: 'Too many failed attempts' } : 'Too many failed attempts' }, { 'Retry-After': '60' });
		return send(res, 401, { error: isRest ? { code: 'UNAUTHORIZED', message: 'Unauthorized' } : 'Unauthorized' }, { 'WWW-Authenticate': 'Bearer' });
	}
	if (limited(ip, RATE_PER_MIN, 'req')) return send(res, 429, { error: isRest ? { code: 'RATE_LIMIT', message: 'Rate limit' } : 'Rate limit' }, { 'Retry-After': '60' });

	if (isRest) {
		try {
			const route = resolveRestRoute(url.pathname);
			let body = {};
			if (['POST', 'PUT'].includes(req.method)) {
				try { body = JSON.parse(await readBody(req)); }
				catch (error) { throw new ToolError(error.status === 413 ? 'Payload too large' : 'Invalid JSON', { code: error.status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON', status: error.status === 413 ? 413 : 400 }); }
			}
			const command = await prepareRestCommand(route, req.method, body, url.searchParams);
			const result = await executeLoggedCommand(command.name, command.args, ip, origin);
			return send(res, req.method === 'POST' ? 201 : 200, restResponse(route, req.method, result));
		} catch (failure) {
			const error = commandError(failure);
			const expected = error instanceof ToolError;
			if (!expected) console.error('[rest]', error);
			await audit({ ts: new Date().toISOString(), ip, transport: 'rest', method: req.method, path: url.pathname, ok: false, error: expected ? error.message : 'Internal server error' });
			return send(res, expected ? error.status : 500, { error: { code: expected ? error.code : 'INTERNAL_ERROR', message: expected ? error.message : 'Internal server error', ...(expected && error.details !== undefined ? { details: error.details } : {}) } });
		}
	}

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

	const result = await rpc.handlePayload(body, { ip, origin });
	return result ? send(res, 200, result) : send(res, 202);
}

setBackend(fileBackend);
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
	.listen(PORT, HOST, function () { console.log(`Mountea Dialoguer MCP on ${HOST}:${this.address().port}  data=${DATA_DIR}  tools=${TOOLS.length}`); });
