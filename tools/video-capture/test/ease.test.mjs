import test from 'node:test';
import assert from 'node:assert/strict';
import { ease, EASES, clamp01 } from '../shared/ease.js';

test('every ease maps 0 to 0 and 1 to 1', () => {
	for (const name of EASES) {
		assert.equal(ease(name, 0), 0, name);
		assert.ok(Math.abs(ease(name, 1) - 1) < 1e-12, name);
	}
});

test('inOut eases are symmetric at 0.5 and monotonic', () => {
	for (const name of ['power2.inOut', 'power3.inOut', 'sine.inOut']) {
		assert.ok(Math.abs(ease(name, 0.5) - 0.5) < 1e-12, name);
		let prev = -1;
		for (let i = 0; i <= 20; i++) {
			const v = ease(name, i / 20);
			assert.ok(v >= prev, `${name} not monotonic at ${i}`);
			prev = v;
		}
	}
});

test('input is clamped and unknown eases throw with the known list', () => {
	assert.equal(ease('linear', -3), 0);
	assert.equal(ease('linear', 9), 1);
	assert.equal(clamp01(2), 1);
	assert.throws(() => ease('bounce.out', 0.5), /Unknown ease "bounce.out"/);
});
