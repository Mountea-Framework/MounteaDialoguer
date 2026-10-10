import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { captureScenario, toolRoot } from '../runner/capture.mjs';

const START = '00000000-0000-0000-0000-000000000001';
const scenario = (id, fixture = 'ExampleProject/OnboardingExample.mnteadlgproj') => ({
	id, fps: 10, size: [640, 360], language: 'en', fixture,
	beats: [{ id: 'move', kind: 'graph', theme: 'dark', duration: 0.5, ease: 'power3.inOut', move: { node: START, to: [200, 120] }, track: [START] }],
});

const hashDir = async (dir) => {
	const hash = crypto.createHash('sha1');
	for (const name of (await fs.readdir(dir)).sort()) hash.update(await fs.readFile(path.join(dir, name)));
	return hash.digest('hex');
};

test('capturing the same beat twice yields byte-identical frames', { timeout: 240000 }, async () => {
	const a = await captureScenario(scenario('det-a'), { force: true });
	const b = await captureScenario(scenario('det-b'), { force: true });
	assert.equal(a.beats[0].frames, 5);
	assert.equal(await hashDir(path.join(toolRoot, 'out/det-a/move')), await hashDir(path.join(toolRoot, 'out/det-b/move')));
	assert.equal(a.beats[0].tracks[START].length, 5);
});

test('a missing fixture fails with its path and leaves no partial beat directory', { timeout: 120000 }, async () => {
	await assert.rejects(() => captureScenario(scenario('det-missing', 'ExampleProject/does-not-exist.mnteadlgproj'), { force: true }), /Cannot read fixture "ExampleProject\/does-not-exist\.mnteadlgproj"/);
	const entries = await fs.readdir(path.join(toolRoot, 'out/det-missing')).catch(() => []);
	assert.deepEqual(entries.filter((name) => !name.endsWith('.json')), []);
});

test('an unknown node reference names the available labels', { timeout: 120000 }, async () => {
	const s = scenario('det-bad-node');
	s.beats[0].move.node = 'Nonexistent Node';
	await assert.rejects(() => captureScenario(s, { force: true }), /No node "Nonexistent Node".*Labels:/s);
});
