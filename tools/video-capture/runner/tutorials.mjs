// Records, builds and renders the tutorial chapters in order.
//   node runner/tutorials.mjs [--only ch3] [--lang xx] [--update-fixtures] [--render]
// --update-fixtures  save each chapter's end state as the next chapter's start fixture (needs the whole chain).
// --render           build compose/index.html and render renders/<chapter>[-<lang>].mp4 with HyperFrames.
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { loadScenario } from './cli.mjs';
import { captureScenario, repoRoot, toolRoot } from './capture.mjs';
import { buildProject } from '../compose/build.mjs';

export const CHAPTERS = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6'];
export const HYPERFRAMES = 'hyperframes@0.8.145';

// Run npm's JavaScript entry point directly so paths are never interpreted by a shell.
export function renderTutorial(output, { spawn = spawnSync, npmCli = resolveNpmCli() } = {}) {
	const result = spawn(process.execPath, [npmCli, 'exec', '--yes', `--package=${HYPERFRAMES}`, '--', 'hyperframes', 'render', path.join(toolRoot, 'compose'), '--video-frame-format', 'png', '-o', output], { stdio: 'inherit', shell: false });
	if (result.error) throw new Error(`Cannot launch HyperFrames: ${result.error.message}`, { cause: result.error });
	if (result.status !== 0) throw new Error(`HyperFrames render failed (${result.signal || result.status})`);
}

function resolveNpmCli() {
	const require = createRequire(import.meta.url);
	const candidates = [
		process.env.npm_execpath,
		path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
		path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
	];
	try { candidates.push(require.resolve('npm/bin/npm-cli.js')); } catch { /* npm can be installed alongside Node */ }
	const cli = candidates.find((candidate) => candidate && path.basename(candidate) === 'npm-cli.js' && existsSync(candidate));
	if (!cli) throw new Error('Cannot locate npm-cli.js; run tutorials through npm or install npm alongside Node');
	return cli;
}

export function parseTutorialArgs(argv) {
	const args = { only: null, lang: null, updateFixtures: false, render: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--only') args.only = argv[++i];
		else if (arg === '--lang') args.lang = argv[++i];
		else if (arg === '--update-fixtures') args.updateFixtures = true;
		else if (arg === '--render') args.render = true;
		else throw new Error(`Unknown argument "${arg}"`);
	}
	if (args.only && !CHAPTERS.includes(args.only)) throw new Error(`Unknown chapter "${args.only}". Chapters: ${CHAPTERS.join(', ')}`);
	if (args.lang && !/^[a-z]{2}(-[A-Z]{2})?$/.test(args.lang)) throw new Error(`Invalid --lang "${args.lang}"`);
	if (args.updateFixtures && args.only) throw new Error('--update-fixtures needs the whole chain; drop --only');
	return args;
}

/** The fixture a chapter starts from, as the previous chapter must write it (null for the first chapter). */
export async function fixtureFor(chapter) {
	const scenario = await loadScenario(`tutorials/${chapter}`);
	return scenario.start?.fixture ? path.resolve(repoRoot, scenario.start.fixture) : null;
}

async function run() {
	const args = parseTutorialArgs(process.argv.slice(2));
	const chapters = args.only ? [args.only] : CHAPTERS;
	for (const chapter of chapters) {
		const scenario = await loadScenario(`tutorials/${chapter}`);
		const next = CHAPTERS[CHAPTERS.indexOf(chapter) + 1];
		const saveState = args.updateFixtures && next ? await fixtureFor(next) : null;
		console.log(`\n== ${chapter}: capturing${saveState ? ` (writes ${path.relative(repoRoot, saveState)})` : ''}`);
		await captureScenario(scenario, { lang: args.lang, saveState });
		if (!args.render) continue;
		console.log(`== ${chapter}: building`);
		buildProject({ scenario: chapter });
		const output = path.join(toolRoot, 'renders', `${chapter}${args.lang ? `-${args.lang}` : ''}.mp4`);
		await fs.mkdir(path.dirname(output), { recursive: true });
		console.log(`== ${chapter}: rendering ${path.relative(toolRoot, output)}`);
		renderTutorial(output);
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	run().catch((error) => { console.error(error.message); process.exit(1); });
}
