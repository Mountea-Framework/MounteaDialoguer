const Sentry = require('@sentry/electron/main');

let sentryInitialized = false;

function toNumberOrFallback(value, fallback) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveMainProcessDsn() {
	return (
		String(process.env.MOUNTEA_SENTRY_DSN || '').trim() ||
		String(process.env.VITE_SENTRY_DSN || '').trim()
	);
}

function initMainProcessSentry() {
	if (sentryInitialized) return true;
	const dsn = resolveMainProcessDsn();
	if (!dsn) return false;

	Sentry.init({
		dsn,
		environment: String(process.env.NODE_ENV || 'production'),
		tracesSampleRate: toNumberOrFallback(
			process.env.MOUNTEA_SENTRY_TRACES_SAMPLE_RATE ||
				process.env.VITE_SENTRY_TRACES_SAMPLE_RATE,
			0.1
		),
		release: String(process.env.npm_package_version || ''),
	});

	sentryInitialized = true;
	return true;
}

function captureMainProcessException(error, context = {}) {
	if (!sentryInitialized) return;
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
