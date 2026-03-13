import * as Sentry from '@sentry/react';

let sentryInitialized = false;

function parseSampleRate(value, fallback = 0.1) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

export function initRendererSentry() {
	if (sentryInitialized) return false;

	const dsn = String(import.meta.env.VITE_SENTRY_DSN || '').trim();
	if (!dsn) return false;

	Sentry.init({
		dsn,
		environment: String(import.meta.env.MODE || 'production'),
		tracesSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.1),
		enabled:
			import.meta.env.DEV
				? String(import.meta.env.VITE_SENTRY_ENABLE_IN_DEV || '') === '1'
				: true,
	});

	sentryInitialized = true;
	return true;
}

export function isRendererSentryEnabled() {
	return sentryInitialized;
}
