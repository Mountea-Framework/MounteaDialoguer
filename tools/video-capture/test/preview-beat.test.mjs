import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { captureScenario, toolRoot } from '../runner/capture.mjs';

test('preview beat advances the overlay on the fake clock and captures each line', { timeout: 240000 }, async () => {
	const manifest = await captureScenario({
		id: 'prev', fps: 10, size: [960, 540], language: 'en',
		fixture: 'ExampleProject/OnboardingExample.mnteadlgproj',
		beats: [{ id: 'preview', kind: 'preview', theme: 'dark', duration: 3, opaque: true }],
	}, { force: true });
	assert.equal(manifest.beats[0].frames, 30);
	// The real overlay has no typewriter: a row's whole line appears at once and the clock advances rows.
	assert.ok(manifest.beats[0].text[0].length > 0, 'the first NPC line is visible from the first frame');
	assert.ok(new Set(manifest.beats[0].text).size >= 2, 'the fake clock must advance the overlay to a later line');
	const files = await fs.readdir(path.join(toolRoot, 'out/prev/preview'));
	assert.equal(files.length, 30);
});
