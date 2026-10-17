import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const CANDIDATES = ['', '.js', '.jsx', '.json', '/index.js'];

function resolveFile(base) {
	for (const suffix of CANDIDATES) {
		const file = base + suffix;
		if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
	}
	return null;
}

export async function resolve(specifier, context, next) {
	let file = null;
	if (specifier.startsWith('@/')) {
		file = resolveFile(path.join(SRC, specifier.slice(2)));
	} else if ((specifier.startsWith('./') || specifier.startsWith('../')) && !path.extname(specifier) && context.parentURL?.startsWith('file:')) {
		file = resolveFile(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier));
	}
	if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
	return next(specifier, context);
}

export async function load(url, context, next) {
	if (url.startsWith('file:') && url.endsWith('.json')) {
		const source = fs.readFileSync(fileURLToPath(url), 'utf8');
		return { format: 'module', source: `export default ${source};`, shortCircuit: true };
	}
	return next(url, context);
}
