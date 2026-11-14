import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { diffRatio } from './helpers/diff.mjs';
import { captureScenario, toolRoot } from '../runner/capture.mjs';
import brag from '../scenarios/brag.js';

const goldens = path.join(toolRoot, 'goldens/brag');

test('brag beats match their golden frames', { timeout: 600000 }, async () => {
	const manifest = await captureScenario({ ...brag, id: 'brag-golden' }, { force: true });
	await fs.mkdir(goldens, { recursive: true });
	for (const beat of manifest.beats) {
		const file = beat.kind === 'stills'
			? path.join(toolRoot, 'out/brag-golden', beat.stills.light)
			: path.join(toolRoot, 'out/brag-golden', beat.dir, `frame-${String(Math.ceil(beat.frames / 2)).padStart(4, '0')}.png`);
		const actual = await fs.readFile(file);
		const goldenFile = path.join(goldens, `${beat.id}.png`);
		if (process.env.UPDATE_GOLDENS === '1') { await fs.writeFile(goldenFile, actual); continue; }
		const expected = await fs.readFile(goldenFile).catch(() => { throw new Error(`Missing golden ${goldenFile}. Run with UPDATE_GOLDENS=1.`); });
		const ratio = await diffRatio(actual, expected);
		assert.ok(ratio <= 0.005, `Beat "${beat.id}" differs from its golden by ${(ratio * 100).toFixed(2)}% of pixels. If the UI change is intended, rerun with UPDATE_GOLDENS=1.`);
	}
});
