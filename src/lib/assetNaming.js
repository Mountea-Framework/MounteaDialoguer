function toAscii(value) {
	return String(value || '')
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '');
}

export function sanitizeUnrealIdentifier(value, fallback = 'Asset') {
	const normalized = toAscii(value)
		.trim()
		.replace(/[^A-Za-z0-9]+/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');
	return normalized || String(fallback || 'Asset');
}

export function sanitizeAudioFileName(fileName, fallbackBase = 'Audio') {
	const raw = String(fileName || '').trim();
	if (!raw) return `${sanitizeUnrealIdentifier(fallbackBase, 'Audio')}.wav`;

	const lastDot = raw.lastIndexOf('.');
	const hasExt = lastDot > 0 && lastDot < raw.length - 1;
	const base = hasExt ? raw.slice(0, lastDot) : raw;
	const extRaw = hasExt ? raw.slice(lastDot + 1) : '';

	const safeBase = sanitizeUnrealIdentifier(base, fallbackBase);
	const safeExt = sanitizeUnrealIdentifier(extRaw, '').toLowerCase();
	return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

export function sanitizeAttachmentIdSegment(value, fallback = 'Unknown') {
	return sanitizeUnrealIdentifier(value, fallback);
}
