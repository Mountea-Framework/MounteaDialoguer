import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { captureScenario, toolRoot } from '../runner/capture.mjs';

test('preview beat types the NPC line on the fake clock, then shows answers', { timeout: 240000 }, async () => {
	const manifest = await captureScenario({
		id: 'prev', fps: 10, size: [960, 540], language: 'en',
		fixture: 'ExampleProject/OnboardingExample.mnteadlgproj',
		beats: [{ id: 'preview', kind: 'preview', theme: 'dark', duration: 3, opaque: true }],
	}, { force: true });
	assert.equal(manifest.beats[0].frames, 30);
	// The real overlay has no typewriter: a row's whole line appears at once and the clock advances rows.
	assert.ok(manifest.beats[0].text[0].length > 0, 'the first NPC line is visible from the first frame');
	assert.ok(new Set(manifest.beats[0].text).size >= 2, 'the fake clock must advance the overlay to a later line');
	const lengths = manifest.beats[0].text.map((s) => s.length);
	assert.ok(lengths[lengths.length - 1] > 0, 'some dialogue text must be visible by the end');
	assert.ok(lengths.every((n, i) => i === 0 || n >= lengths[i - 1] || n === 0), 'text only grows within a line');
	const files = await fs.readdir(path.join(toolRoot, 'out/prev/preview'));
	assert.equal(files.length, 30);
});
