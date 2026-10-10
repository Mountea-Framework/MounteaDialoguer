import test from 'node:test';
import assert from 'node:assert/strict';
import { beatHash, buildManifest, MANIFEST_VERSION } from '../shared/manifest.js';

const scenario = () => ({
	id: 's', fps: 30, size: [1920, 1080], language: 'en', fixture: 'f',
	beats: [
		{ id: 'a', kind: 'graph', theme: 'dark', duration: 1 },
		{ id: 'b', kind: 'graph', theme: 'dark', duration: 1, move: { node: 'x', to: [1, 2] } },
	],
});

test('beatHash is stable and changes with the beat, earlier beats, source digest and language', () => {
	const s = scenario();
	const base = beatHash(s, 1, 'src1');
	assert.equal(beatHash(s, 1, 'src1'), base);
	assert.notEqual(beatHash(s, 1, 'src2'), base);
	const moved = scenario(); moved.beats[1].move.to = [9, 9];
	assert.notEqual(beatHash(moved, 1, 'src1'), base);
	const earlier = scenario(); earlier.beats[0].duration = 2;
	assert.notEqual(beatHash(earlier, 1, 'src1'), base, 'positions carry over, so earlier beats matter');
	const cs = scenario(); cs.language = 'cs';
	assert.notEqual(beatHash(cs, 1, 'src1'), base);
});

test('buildManifest lists beats in order with start frames', () => {
	const s = scenario();
	const manifest = buildManifest(s, [
		{ id: 'a', kind: 'graph', theme: 'dark', frames: 30, hash: 'h1', dir: 'a', pattern: 'a/frame-%04d.png' },
		{ id: 'b', kind: 'graph', theme: 'dark', frames: 24, hash: 'h2', dir: 'b', pattern: 'b/frame-%04d.png' },
	], { scale: 1 });
	assert.equal(manifest.version, MANIFEST_VERSION);
	assert.deepEqual(manifest.beats.map((b) => [b.id, b.startFrame, b.frames, b.duration]), [['a', 0, 30, 1], ['b', 30, 24, 0.8]]);
	assert.equal(manifest.totalFrames, 54);
	assert.deepEqual(manifest.size, [1920, 1080]);
});
