const fs = require('node:fs');

function sanitizeDiagnostics(value, depth = 0) {
	if (depth > 4) return '[depth limit]';
	if (Array.isArray(value)) return value.slice(0, 25).map((entry) => sanitizeDiagnostics(entry, depth + 1));
	if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0, 40).map(([key, entry]) => [key, /token|secret|passphrase|password|authorization|content|snapshot|email|name|title|description|text|url|path/i.test(key) ? '[redacted]' : sanitizeDiagnostics(entry, depth + 1)]));
	// Provider errors are arbitrary prose and may echo credentials or authored
	// content. Retain only numbers/booleans and the separately validated event ID.
	return typeof value === 'string' ? '[redacted]' : value;
}
function appendDiagnostic(file, event, details) {
	const line = `${new Date().toISOString()} ${String(event).replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 80)} ${JSON.stringify(sanitizeDiagnostics(details))}\n`;
	if (fs.existsSync(file) && fs.statSync(file).size + Buffer.byteLength(line) > 5 * 1024 * 1024) {
		fs.rmSync(`${file}.3`, { force: true });
		for (let index = 2; index >= 1; index--) if (fs.existsSync(`${file}.${index}`)) fs.renameSync(`${file}.${index}`, `${file}.${index + 1}`);
		fs.renameSync(file, `${file}.1`);
	}
	fs.appendFileSync(file, line, { encoding: 'utf8', mode: 0o600 });
}
module.exports = { sanitizeDiagnostics, appendDiagnostic };
