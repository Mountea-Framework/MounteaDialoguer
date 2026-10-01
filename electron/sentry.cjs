let Sentry = null;
try {
	Sentry = require('@sentry/electron/main');
} catch (error) {
	// Keep app startup resilient if runtime packaging omits Sentry.
	console.warn('[sentry] @sentry/electron/main unavailable, continuing without Sentry.', error);
}

let sentryInitialized = false;
const { app } = require('electron');
const { readFileSync } = require('node:fs');
const path = require('node:path');

function resolveRelease() {
	try {
		const manifest = JSON.parse(readFileSync(path.join(app.getAppPath(), 'dist', 'release.json'), 'utf8'));
		if (typeof manifest.release === 'string' && manifest.release.trim()) return manifest.release;
	} catch { /* Development may launch before a renderer build. */ }
	return `mountea-dialoguer@${app.getVersion()}+local.unbuilt`;
}

function toNumberOrFallback(value, fallback) {
	if (value == null || String(value).trim() === '') return fallback;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : fallback;
}

function resolveMainProcessDsn() {
	return (
		String(process.env.MOUNTEA_SENTRY_DSN || '').trim() ||
		String(process.env.VITE_SENTRY_DSN || '').trim()
	);
}

function initMainProcessSentry() {
	if (sentryInitialized) return true;
	if (!Sentry) return false;
	const dsn = resolveMainProcessDsn();
	if (!dsn) return false;
	if (!app.isPackaged && process.env.MOUNTEA_SENTRY_ENABLE_IN_DEV !== '1') return false;

	Sentry.init({
		dsn,
		environment: String(process.env.NODE_ENV || 'production'),
		tracesSampleRate: toNumberOrFallback(
			process.env.MOUNTEA_SENTRY_TRACES_SAMPLE_RATE ||
				process.env.VITE_SENTRY_TRACES_SAMPLE_RATE,
			0.1
		),
		release: resolveRelease(),
	});

	sentryInitialized = true;
	return true;
}

function captureMainProcessException(error, context = {}) {
	if (!sentryInitialized || !Sentry) return;
	const normalizedError =
		error instanceof Error ? error : new Error(String(error || 'unknown main-process error'));

	Sentry.withScope((scope) => {
		scope.setTag('runtime', 'electron-main');
		const safeContext = context && typeof context === 'object' ? context : {};
		for (const [key, value] of Object.entries(safeContext)) {
			scope.setExtra(key, value);
		}
		Sentry.captureException(normalizedError);
	});
}

module.exports = {
	initMainProcessSentry,
	captureMainProcessException,
	isMainProcessSentryEnabled: () => sentryInitialized,
};
