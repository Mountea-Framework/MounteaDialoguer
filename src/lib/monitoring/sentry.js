import * as Sentry from '@sentry/react';
import { parseSampleRate, rendererReportingEnabled } from './config';

let sentryInitialized = false;
let reportingEnabled = false;

export function initRendererSentry() {
	if (sentryInitialized) return false;

	const dsn = String(import.meta.env.VITE_SENTRY_DSN || '').trim();
	if (!dsn) return false;
	reportingEnabled = rendererReportingEnabled(import.meta.env);

	Sentry.init({
		dsn,
		environment: String(import.meta.env.MODE || 'production'),
		tracesSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.1),
		enabled: reportingEnabled,
		// Injected from the same identity written to dist/release.json.
		// eslint-disable-next-line no-undef
		release: __APP_RELEASE__,
	});

	sentryInitialized = true;
	return true;
}

export function isRendererSentryEnabled() {
	return sentryInitialized && reportingEnabled;
}
