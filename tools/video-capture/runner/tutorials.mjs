// Records, builds and renders the tutorial chapters in order.
//   node runner/tutorials.mjs [--only ch3] [--lang xx] [--update-fixtures] [--render]
// --update-fixtures  save each chapter's end state as the next chapter's start fixture (needs the whole chain).
// --render           build compose/index.html and render renders/<chapter>[-<lang>].mp4 with HyperFrames.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadScenario } from './cli.mjs';
import { captureScenario, repoRoot, toolRoot } from './capture.mjs';
import { buildProject } from '../compose/build.mjs';

export const CHAPTERS = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6'];
export const HYPERFRAMES = 'hyperframes@0.8.145';

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
		const render = spawnSync('npx', ['--yes', HYPERFRAMES, 'render', path.join(toolRoot, 'compose'), '--video-frame-format', 'png', '-o', output], { stdio: 'inherit', shell: process.platform === 'win32' });
		if (render.status !== 0) throw new Error(`HyperFrames render failed for ${chapter}`);
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	run().catch((error) => { console.error(error.message); process.exit(1); });
}
