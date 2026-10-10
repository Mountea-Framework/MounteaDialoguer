import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

async function* walk(dir) {
	for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(full);
		else yield full;
	}
}

/** One digest of every file that can change what a captured frame looks like. */
export async function sourceDigest(repoRoot) {
	const roots = [
		'src/components/dialogue', 'src/components/ui', 'src/lib/graphLayout.js', 'src/lib/dialoguePreviewEngine.js',
		'src/index.css', 'src/i18n', 'tailwind.config.js', 'tools/video-capture/sandbox', 'tools/video-capture/shared',
	];
	const hash = createHash('sha1');
	for (const rel of roots) {
		const abs = path.join(repoRoot, rel);
		const stat = await fs.stat(abs).catch(() => null);
		if (!stat) continue;
		const files = stat.isDirectory() ? [] : [abs];
		if (stat.isDirectory()) for await (const file of walk(abs)) files.push(file);
		files.sort();
		for (const file of files) { hash.update(path.relative(repoRoot, file)); hash.update(await fs.readFile(file)); }
	}
	return hash.digest('hex');
}
