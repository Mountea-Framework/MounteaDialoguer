// Opt-in local endpoint that lets the Mountea Dialoguer CLI (cli/dialoguer.mjs) drive this desktop app.
// It listens on 127.0.0.1 only, and every request needs the per-start token written to <userData>/automation.json,
// a file only the signed-in OS user can read. MCP JSON-RPC bodies are forwarded to the renderer, which runs the
// shared tool layer against its local database (src/lib/automation). Off unless the user enables "CLI access" or
// the app is started with --headless.
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SETTINGS_FILE = 'automation-settings.json';
const ENDPOINT_FILE = 'automation.json';
const MAX_BODY_BYTES = 64 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 60 * 1000;
const RATE_PER_MIN = 600;
const AUTH_FAIL_PER_MIN = 20;

function writeFileAtomic(file, text) {
	const temporary = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
	fs.writeFileSync(temporary, text, { encoding: 'utf8', mode: 0o600 });
	fs.renameSync(temporary, file);
}

function readAutomationSettings(directory) {
	try {
		const parsed = JSON.parse(fs.readFileSync(path.join(directory, SETTINGS_FILE), 'utf8'));
		return { enabled: parsed?.enabled === true };
	} catch {
		return { enabled: false };
	}
}

function writeAutomationSettings(directory, settings) {
	writeFileAtomic(path.join(directory, SETTINGS_FILE), `${JSON.stringify({ enabled: settings.enabled === true })}\n`);
}

function send(res, status, body, headers = {}) {
	const payload = body === undefined ? '' : JSON.stringify(body);
	res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
	res.end(payload);
}

async function readBody(req, limit) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		size += chunk.length;
		if (size > limit) throw Object.assign(new Error('Payload too large'), { status: 413 });
		chunks.push(chunk);
	}
	return Buffer.concat(chunks).toString('utf8');
}

/**
 * forward(id, message) hands a JSON-RPC payload to the renderer; the renderer answers through receive(id, response).
 * onShutdown() is called for POST /shutdown when canShutdown() allows it; onActivity() on every authorised request.
 */
function createAutomationHost({ directory, version = '', forward, canShutdown = () => false, onShutdown = () => {}, onActivity = () => {}, port = 0, timeoutMs = REQUEST_TIMEOUT_MS, maxBodyBytes = MAX_BODY_BYTES, getMode = () => 'windowed' }) {
	const endpointFile = path.join(directory, ENDPOINT_FILE);
	const pending = new Map();
	const hits = new Map();
	let server = null;
	let token = '';
	let tokenDigest = null;
	let boundPort = 0;
	let ready = false;

	const digest = (value) => crypto.createHash('sha256').update(String(value || '')).digest();
	const tokenMatches = (candidate) => Boolean(tokenDigest) && crypto.timingSafeEqual(digest(candidate), tokenDigest);
	const limited = (bucket, max) => {
		const now = Date.now();
		const entry = hits.get(bucket);
		if (!entry || entry.reset < now) { hits.set(bucket, { count: 1, reset: now + 60000 }); return false; }
		entry.count += 1;
		return entry.count > max;
	};

	function dispatch(message) {
		const id = crypto.randomUUID();
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => { pending.delete(id); reject(Object.assign(new Error('The app did not answer in time'), { status: 504 })); }, timeoutMs);
			pending.set(id, { resolve, reject, timer });
			try { forward(id, message); }
			catch (error) { clearTimeout(timer); pending.delete(id); reject(Object.assign(error, { status: 503 })); }
		});
	}

	async function handle(req, res) {
		// Browsers always send Origin on cross-site POSTs, and a rebound DNS name would not match the Host check.
		const host = String(req.headers.host || '').toLowerCase();
		if (host !== `127.0.0.1:${boundPort}` && host !== `localhost:${boundPort}`) return send(res, 403, { error: 'Forbidden host' });
		if (req.headers.origin !== undefined) return send(res, 403, { error: 'Browser requests are not accepted' });
		const url = new URL(req.url, `http://${host}`);
		if (url.pathname === '/health' && req.method === 'GET') return send(res, 200, { ok: true, ready });

		const header = String(req.headers.authorization || '');
		const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
		if (!tokenMatches(bearer)) {
			if (limited('authfail', AUTH_FAIL_PER_MIN)) return send(res, 429, { error: 'Too many failed attempts' }, { 'Retry-After': '60' });
			return send(res, 401, { error: 'Unauthorized' }, { 'WWW-Authenticate': 'Bearer' });
		}
		if (limited('req', RATE_PER_MIN)) return send(res, 429, { error: 'Rate limit' }, { 'Retry-After': '60' });
		onActivity();

		if (url.pathname === '/shutdown') {
			if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' }, { Allow: 'POST' });
			if (!canShutdown()) return send(res, 409, { error: 'The app window is open; close it from the app instead' });
			send(res, 200, { ok: true });
			setImmediate(onShutdown);
			return undefined;
		}
		if (url.pathname !== '/mcp') return send(res, 404, { error: 'Not found' });
		if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' }, { Allow: 'POST' });
		if (!ready) return send(res, 503, { error: 'starting' }, { 'Retry-After': '1' });

		let body;
		try {
			body = JSON.parse(await readBody(req, maxBodyBytes));
		} catch (error) {
			if (error.status === 413) {
				req.unpipe?.();
				req.resume();
				return send(res, 413, { error: 'Payload too large' }, { Connection: 'close' });
			}
			return send(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
		}
		try {
			const response = await dispatch(body);
			return response ? send(res, 200, response) : send(res, 202);
		} catch (error) {
			return send(res, error.status || 500, { error: error.status ? error.message : 'Server error' });
		}
	}

	function writeEndpoint() {
		writeFileAtomic(endpointFile, `${JSON.stringify({ port: boundPort, token, pid: process.pid, version, mode: getMode(), startedAt: new Date().toISOString() }, null, 2)}\n`);
	}

	function start() {
		if (server) return Promise.resolve(status());
		token = crypto.randomBytes(32).toString('base64url');
		tokenDigest = digest(token);
		const candidate = http.createServer((req, res) => {
			handle(req, res).catch(() => { if (!res.headersSent) send(res, 500, { error: 'Server error' }); });
		});
		server = candidate;
		return new Promise((resolve, reject) => {
			candidate.once('error', (error) => { server = null; token = ''; tokenDigest = null; reject(error); });
			candidate.listen(port, '127.0.0.1', () => {
				boundPort = candidate.address().port;
				try { writeEndpoint(); }
				catch (error) { candidate.close(); server = null; reject(error); return; }
				resolve(status());
			});
		});
	}

	function stop() {
		if (server) { server.close(); server.closeAllConnections?.(); }
		server = null;
		token = '';
		tokenDigest = null;
		boundPort = 0;
		for (const [id, entry] of pending) { clearTimeout(entry.timer); entry.reject(Object.assign(new Error('The app is shutting down'), { status: 503 })); pending.delete(id); }
		try {
			// Only remove the file this process wrote; another instance may own a newer one.
			const current = JSON.parse(fs.readFileSync(endpointFile, 'utf8'));
			if (current?.pid === process.pid) fs.unlinkSync(endpointFile);
		} catch {
			/* already gone */
		}
	}

	function receive(id, response) {
		const entry = pending.get(id);
		if (!entry) return false;
		clearTimeout(entry.timer);
		pending.delete(id);
		entry.resolve(response ?? null);
		return true;
	}

	function setReady(value) { ready = Boolean(value); }
	function refreshEndpoint() { if (server && boundPort) writeEndpoint(); }
	function status() { return { running: Boolean(server), port: boundPort || null, ready }; }

	return { start, stop, receive, setReady, refreshEndpoint, status };
}

module.exports = { createAutomationHost, readAutomationSettings, writeAutomationSettings, ENDPOINT_FILE, SETTINGS_FILE };
