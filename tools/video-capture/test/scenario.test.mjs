import test from 'node:test';
import assert from 'node:assert/strict';
import { validateScenario, frameCount } from '../shared/scenario.js';

const base = () => ({
	id: 's', fps: 30, size: [1920, 1080], fixture: 'ExampleProject/x.mnteadlgproj',
	beats: [
		{ id: 'g1', kind: 'graph', theme: 'dark', duration: 1 },
		{ id: 'st', kind: 'stills', of: 'g1', from: 'dark', to: 'light' },
	],
});

test('a valid scenario passes through unchanged', () => {
	const s = base();
	assert.equal(validateScenario(s), s);
});

test('frameCount rounds and never returns less than 1', () => {
	assert.equal(frameCount({ duration: 1 }, 30), 30);
	assert.equal(frameCount({ duration: 0.8 }, 30), 24);
	assert.equal(frameCount({ duration: 0.01 }, 30), 1);
	assert.equal(frameCount({ duration: 1.016 }, 30), 30);
});

test('every problem is reported, naming the beat', () => {
	const s = base();
	s.fps = 0;
	s.beats[0].duration = 0;
	s.beats[0].ease = 'wobble';
	s.beats[1].of = 'missing';
	s.beats.push({ id: 'g1', kind: 'nope', duration: 1 });
	assert.throws(() => validateScenario(s), (error) => {
		for (const needle of ['fps', 'beats[0] (g1): duration', 'unknown ease "wobble"', '"of" must name an earlier graph beat', 'duplicate id', 'kind must be one of']) {
			assert.ok(error.message.includes(needle), `missing: ${needle}\n${error.message}`);
		}
		return true;
	});
});

test('negative duration and empty beats are rejected', () => {
	const s = base();
	s.beats = [];
	assert.throws(() => validateScenario(s), /non-empty array/);
	const t = base();
	t.beats[0].duration = -1;
	assert.throws(() => validateScenario(t), /duration must be > 0/);
});
