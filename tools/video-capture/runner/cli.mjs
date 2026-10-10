import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateScenario } from '../shared/scenario.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export function parseArgs(argv) {
	const args = { scenario: null, lang: null, beat: null, force: false, scale: 1 };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--scenario') args.scenario = argv[++i];
		else if (arg === '--lang') args.lang = argv[++i];
		else if (arg === '--beat') args.beat = argv[++i];
		else if (arg === '--scale') args.scale = Number(argv[++i]);
		else if (arg === '--force') args.force = true;
		else throw new Error(`Unknown argument "${arg}"`);
	}
	if (!args.scenario) throw new Error('Usage: node runner/cli.mjs --scenario <name> [--lang xx] [--beat id] [--scale n] [--force]');
	return args;
}

export async function loadScenario(name) {
	const mod = await import(pathToFileURL(path.join(here, '..', 'scenarios', `${name}.js`)).href);
	return validateScenario(mod.default);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const args = parseArgs(process.argv.slice(2));
	const scenario = await loadScenario(args.scenario);
	const { captureScenario } = await import('./capture.mjs');
	await captureScenario(scenario, args);
}
