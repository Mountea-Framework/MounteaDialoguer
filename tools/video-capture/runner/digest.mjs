import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

async function* walk(dir) {
	for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
		if (entry.name === 'node_modules' || entry.name === 'out') continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(full);
		else yield full;
	}
}

/** Everything that can change what a captured frame looks like: the app source, its toolchain config and the sandbox. */
export const DIGEST_ROOTS = [
	'src', 'tailwind.config.js', 'package-lock.json',
	'tools/video-capture/sandbox', 'tools/video-capture/shared', 'tools/video-capture/runner',
	'tools/video-capture/vite.config.js', 'tools/video-capture/tailwind.config.js', 'tools/video-capture/index.html',
];

/** One digest of every file under DIGEST_ROOTS (sorted, each file read once). */
export async function sourceDigest(repoRoot) {
	const hash = createHash('sha1');
	for (const rel of DIGEST_ROOTS) {
		const abs = path.join(repoRoot, rel);
		const stat = await fs.stat(abs).catch(() => null);
		if (!stat) continue;
		const files = [];
		if (stat.isDirectory()) for await (const file of walk(abs)) files.push(file);
		else files.push(abs);
		files.sort();
		const contents = await Promise.all(files.map((file) => fs.readFile(file)));
		files.forEach((file, i) => { hash.update(path.relative(repoRoot, file)); hash.update(contents[i]); });
	}
	return hash.digest('hex');
}
