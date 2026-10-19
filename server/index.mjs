// Mountea Dialoguer server: serves the built web app and is the file store for its revision sync.
// No dependencies. Auth is expected to be handled in front (e.g. Cloudflare Access).
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	DATA_DIR,
	FileExistsError,
	createFile,
	deleteFile,
	ensureDirs,
	listFiles,
	readFileText,
	updateFile,
} from './storage.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const DIST_DIR = path.resolve(process.env.DIST_DIR || path.join(__dirname, '..', 'dist'));
const MAX_BODY = Number(process.env.MAX_BODY_MB || 100) * 1024 * 1024;

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.map': 'application/json',
	'.wasm': 'application/wasm',
	'.txt': 'text/plain; charset=utf-8',
};

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

function send(res, status, body, headers = {}) {
	const isObj = body !== null && typeof body === 'object' && !Buffer.isBuffer(body);
	const payload = isObj ? JSON.stringify(body) : body;
	res.writeHead(status, {
		...(isObj ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
		'Cache-Control': 'no-store',
		...headers,
	});
	res.end(payload);
}

// File store behind the web app's sync protocol (src/lib/sync/providers/storageProviders.js).
//   GET    /api/sync/files?prefix=&name=   list files        -> { files: [{ id, name }] }
//   GET    /api/sync/files/:name           file content (text)
//   POST   /api/sync/files  {name, content} create (409 if the file exists)
//   PUT    /api/sync/files/:name {content}  replace
//   DELETE /api/sync/files/:name
async function handleApi(req, res, url) {
	const parts = url.pathname.split('/').filter(Boolean); // ['api','sync','files',':name']
	if (parts[1] === 'health') return send(res, 200, { ok: true });
	if (parts[1] !== 'sync' || parts[2] !== 'files') return send(res, 404, { error: 'Not found' });

	const name = parts[3] ? decodeURIComponent(parts[3]) : '';

	if (!name && req.method === 'GET') {
		return send(res, 200, { files: await listFiles({ prefix: url.searchParams.get('prefix') || '', name: url.searchParams.get('name') || '' }) });
	}

	if (!name && req.method === 'POST') {
		let body;
		try {
			body = JSON.parse(await readBody(req));
		} catch {
			return send(res, 400, { error: 'Invalid JSON' });
		}
		if (typeof body?.name !== 'string' || typeof body?.content !== 'string') return send(res, 400, { error: 'name and content are required' });
		try {
			return send(res, 201, await createFile(body.name, body.content));
		} catch (error) {
			if (error instanceof FileExistsError) return send(res, 409, { error: error.message });
			throw error;
		}
	}

	if (name && req.method === 'GET') {
		const text = await readFileText(name);
		return text === null ? send(res, 404, { error: 'Not found' }) : send(res, 200, text, { 'Content-Type': 'application/json; charset=utf-8' });
	}

	if (name && req.method === 'PUT') {
		let body;
		try {
			body = JSON.parse(await readBody(req));
		} catch {
			return send(res, 400, { error: 'Invalid JSON' });
		}
		if (typeof body?.content !== 'string') return send(res, 400, { error: 'content is required' });
		return send(res, 200, await updateFile(name, body.content));
	}

	if (name && req.method === 'DELETE') {
		await deleteFile(name);
		return send(res, 200, { ok: true });
	}

	return send(res, 405, { error: 'Method not allowed' });
}

async function serveStatic(req, res, url) {
	let rel;
	try { rel = decodeURIComponent(url.pathname); }
	catch { return send(res, 400, 'Invalid path encoding'); }
	if (rel.includes(':') || [...rel].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return send(res, 400, 'Invalid path');
	// Treat both URL and Windows separators consistently on every host.
	rel = rel.replace(/\\/g, '/');
	if (rel.endsWith('/')) rel += 'index.html';
	const contained = (root, candidate) => {
		const relative = path.relative(root, candidate);
		return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`);
	};
	let file = path.resolve(DIST_DIR, `.${rel}`);
	if (!contained(DIST_DIR, file)) return send(res, 403, 'Forbidden');
	const realRoot = await fs.realpath(DIST_DIR).catch(() => null);
	if (!realRoot) return send(res, 404, 'Not built. Run npm run build.');
	// Check the closest existing ancestor too: a missing path through an external
	// symlink must not turn into a successful SPA fallback.
	const safeRealPath = async (candidate) => {
		let cursor = candidate;
		while (contained(DIST_DIR, cursor)) {
			try { return contained(realRoot, await fs.realpath(cursor)); }
			catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) return false; }
			if (cursor === DIST_DIR) break;
			cursor = path.dirname(cursor);
		}
		return false;
	};
	if (!await safeRealPath(file)) return send(res, 403, 'Forbidden');
	let stat = await fs.stat(file).catch(() => null);
	if (!stat || !stat.isFile()) {
		// Single-page app: unknown paths get index.html.
		file = path.join(DIST_DIR, 'index.html');
		if (!await safeRealPath(file)) return send(res, 403, 'Forbidden');
		stat = await fs.stat(file).catch(() => null);
		if (!stat) return send(res, 404, 'Not built. Run npm run build.');
	}
	const ext = path.extname(file).toLowerCase();
	const hashed = /\/assets\//.test(file);
	res.writeHead(200, {
		'Content-Type': MIME[ext] || 'application/octet-stream',
		'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
	});
	res.end(req.method === 'HEAD' ? undefined : await fs.readFile(file));
}

await ensureDirs();

http
	.createServer(async (req, res) => {
		try {
			const url = new URL(req.url, 'http://localhost');
			if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
			if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
			return await serveStatic(req, res, url);
		} catch (error) {
			console.error('[server]', error);
			send(res, error.status || 500, { error: error.message || 'Server error' });
		}
	})
	.listen(PORT, () => {
		console.log(`Mountea Dialoguer on :${PORT}  data=${DATA_DIR}  dist=${DIST_DIR}`);
	});
