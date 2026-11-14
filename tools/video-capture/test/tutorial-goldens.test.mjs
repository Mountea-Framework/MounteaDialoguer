import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { captureScenario, toolRoot } from '../runner/capture.mjs';
import { diffRatio } from './helpers/diff.mjs';
import ch1 from '../scenarios/tutorials/ch1.js';

const goldens = path.join(toolRoot, 'goldens/tutorials');
/** Steps of chapter 1 whose last frame is compared with a golden: the dashboard, the open dialog, the new project page. */
const CHECKED = ['dashboard', 'name', 'tour-dialogues'];

test('the first steps of chapter 1 match their golden frames (the real app still looks like the video)', { timeout: 600000 }, async () => {
	const last = ch1.beats[0].steps.findIndex((s) => s.id === CHECKED.at(-1));
	const scenario = { ...ch1, id: 'tutorial-golden', beats: [{ ...ch1.beats[0], steps: ch1.beats[0].steps.slice(0, last + 1), tail: 0.5 }] };
	const manifest = await captureScenario(scenario, { force: true });
	const { cues, frames } = manifest.beats[0];
	await fs.mkdir(goldens, { recursive: true });
	for (const id of CHECKED) {
		const cue = cues.find((c) => c.id === id);
		const frame = Math.min(frames, Math.max(1, Math.round(cue.end * scenario.fps)));
		const actual = await fs.readFile(path.join(toolRoot, 'out/tutorial-golden/main', `frame-${String(frame).padStart(4, '0')}.png`));
		const goldenFile = path.join(goldens, `ch1-${id}.png`);
		if (process.env.UPDATE_GOLDENS === '1') { await fs.writeFile(goldenFile, actual); continue; }
		const expected = await fs.readFile(goldenFile).catch(() => { throw new Error(`Missing golden ${goldenFile}. Run with UPDATE_GOLDENS=1.`); });
		const ratio = await diffRatio(actual, expected);
		assert.ok(ratio <= 0.005, `Step "${id}" differs from its golden by ${(ratio * 100).toFixed(2)}% of pixels. If the UI change is intended, re-record the chapters and rerun with UPDATE_GOLDENS=1.`);
	}
});
