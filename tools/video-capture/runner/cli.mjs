import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateScenario } from '../shared/scenario.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export function parseArgs(argv) {
	const args = { scenario: null, lang: null, beat: null, force: false, scale: 1, updateGoldens: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--scenario') args.scenario = argv[++i];
		else if (arg === '--lang') args.lang = argv[++i];
		else if (arg === '--beat') args.beat = argv[++i];
		else if (arg === '--scale') args.scale = Number(argv[++i]);
		else if (arg === '--force') args.force = true;
		else if (arg === '--update-goldens') args.updateGoldens = true;
		else throw new Error(`Unknown argument "${arg}"`);
	}
	if (!args.scenario && !args.updateGoldens) throw new Error('Usage: node runner/cli.mjs --scenario <name> [--lang xx] [--beat id] [--scale n] [--force] | --update-goldens');
	return args;
}

export async function loadScenario(name) {
	const mod = await import(pathToFileURL(path.join(here, '..', 'scenarios', `${name}.js`)).href);
	return validateScenario(mod.default);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const args = parseArgs(process.argv.slice(2));
	if (args.updateGoldens) {
		// Rewrites goldens/brag/*.png from a fresh capture instead of comparing against them.
		const { spawnSync } = await import('node:child_process');
		const run = spawnSync(process.execPath, ['--test', path.join(here, '..', 'test', 'goldens.test.mjs')], { stdio: 'inherit', env: { ...process.env, UPDATE_GOLDENS: '1' } });
		process.exit(run.status ?? 1);
	}
	const scenario = await loadScenario(args.scenario);
	const { captureScenario } = await import('./capture.mjs');
	await captureScenario(scenario, args);
}
