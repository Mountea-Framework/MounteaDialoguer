// Sync auth: one password (scrypt hash in DATA_DIR/sync-auth.json), set on first run with a one-time setup code
// printed to the server log. Sessions are random cookie tokens.
import crypto from 'node:crypto';
import path from 'node:path';
import { promisify } from 'node:util';
import { DATA_DIR, readJson, writeAtomic } from './storage.mjs';

const scrypt = promisify(crypto.scrypt);
const AUTH_FILE = path.join(DATA_DIR, 'sync-auth.json'); // outside DATA_DIR/sync, so the file API can never see it
export const COOKIE_NAME = 'mountea_sync';
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const MAX_FAILURES = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 symbols, no 0/O/1/I
const MIN_PASSWORD = 8;

let credential = null; // { salt: Buffer, hash: Buffer }
let setupCode = null; // memory only, never written to disk
// Sessions live in memory and store only the token hash. A server restart logs everyone out; that is accepted.
const sessions = new Map(); // sha256(token) -> expiresAt
// shortcut: failures are keyed by socket address and never pruned except per address; fine for a home server. Behind a proxy all clients share one address.
const failures = new Map(); // address -> { count, since }

const sha256 = (value) => crypto.createHash('sha256').update(value).digest();
const same = (a, b) => crypto.timingSafeEqual(sha256(a), sha256(b));
const fail = (status, error, code) => ({ status, body: { error, code } });
const ok = (extra) => ({ status: 200, body: { ok: true }, ...extra });

export async function initAuth() {
	const saved = await readJson(AUTH_FILE, null);
	if (saved?.v === 1 && saved.salt && saved.hash) {
		const salt = Buffer.from(saved.salt, 'base64');
		const hash = Buffer.from(saved.hash, 'base64');
		if (salt.length > 0 && hash.length === 64) credential = { salt, hash };
		else console.error('Warning: sync-auth.json is invalid; treating the server as unconfigured. The file was not deleted.');
	}
	if (!credential) {
		const bytes = crypto.randomBytes(8);
		const chars = Array.from(bytes, (byte) => CODE_ALPHABET[byte & 31]).join('');
		setupCode = `${chars.slice(0, 4)}-${chars.slice(4)}`;
	}
}

export const isConfigured = () => credential !== null;
export const announceSetupCode = () => {
	if (setupCode) console.log(`Sync setup code: ${setupCode}. Enter it in the app to set your sync password.`);
};

function limited(address) {
	const entry = failures.get(address);
	if (entry && Date.now() - entry.since > FAILURE_WINDOW_MS) failures.delete(address);
	return (failures.get(address)?.count || 0) >= MAX_FAILURES;
}
function recordFailure(address) {
	const entry = failures.get(address) || { count: 0, since: Date.now() };
	failures.set(address, { ...entry, count: entry.count + 1 });
}
const tooMany = () => fail(429, 'Too many attempts. Try again later.', 'TOO_MANY_ATTEMPTS');

function startSession(address) {
	failures.delete(address);
	const token = crypto.randomBytes(32).toString('base64url');
	sessions.set(sha256(token).toString('hex'), Date.now() + SESSION_SECONDS * 1000);
	return ok({ cookie: `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}` });
}

const hashPassword = (password, salt) => scrypt(password, salt, 64);

export async function setup(address, code, password) {
	if (credential) return fail(409, 'Already configured', 'ALREADY_CONFIGURED');
	if (limited(address)) return tooMany();
	const normalised = (typeof code === 'string' ? code : '').replace(/-/g, '').toUpperCase();
	if (!same(normalised, setupCode.replace('-', ''))) {
		recordFailure(address);
		return fail(400, 'Invalid setup code', 'INVALID_SETUP_CODE');
	}
	if (typeof password !== 'string' || password.length < MIN_PASSWORD) return fail(400, `Password must be at least ${MIN_PASSWORD} characters`, 'WEAK_PASSWORD');
	const salt = crypto.randomBytes(16);
	const hash = await hashPassword(password, salt);
	if (credential) return fail(409, 'Already configured', 'ALREADY_CONFIGURED'); // lost a race while hashing
	const previousCode = setupCode;
	credential = { salt, hash }; // set before the awaited write so a concurrent setup sees 409
	setupCode = null;
	try {
		await writeAtomic(AUTH_FILE, JSON.stringify({ v: 1, salt: salt.toString('base64'), hash: hash.toString('base64') }));
	} catch (error) {
		credential = null;
		setupCode = previousCode;
		throw error;
	}
	return { ...startSession(address), status: 201 };
}

export async function login(address, password) {
	if (!credential) return fail(409, 'Setup required', 'SETUP_REQUIRED');
	if (limited(address)) return tooMany();
	recordFailure(address); // counted before the slow hash so parallel guesses cannot all pass the limit; startSession clears it on success
	const hash = await hashPassword(typeof password === 'string' ? password : '', credential.salt);
	if (!crypto.timingSafeEqual(hash, credential.hash)) {
		return fail(401, 'Invalid password', 'INVALID_PASSWORD');
	}
	return startSession(address);
}

function cookieToken(req) {
	for (const part of String(req.headers.cookie || '').split(';')) {
		const index = part.indexOf('=');
		if (part.slice(0, index).trim() === COOKIE_NAME) return part.slice(index + 1).trim();
	}
	return '';
}

export function isAuthenticated(req) {
	const token = cookieToken(req);
	if (!token) return false;
	const key = sha256(token).toString('hex');
	const expires = sessions.get(key);
	if (!expires) return false;
	if (expires < Date.now()) { sessions.delete(key); return false; }
	return true;
}

export function logout(req) {
	sessions.delete(sha256(cookieToken(req)).toString('hex'));
	return ok({ cookie: `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` });
}
