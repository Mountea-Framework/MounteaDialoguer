export function parseSampleRate(value, fallback = 0.1) {
	if (value == null || String(value).trim() === '') return fallback;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : fallback;
}

export function rendererReportingEnabled(env) {
	return Boolean(String(env.VITE_SENTRY_DSN || '').trim()) && (!env.DEV || String(env.VITE_SENTRY_ENABLE_IN_DEV || '') === '1');
}
