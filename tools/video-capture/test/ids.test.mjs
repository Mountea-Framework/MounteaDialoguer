import test from 'node:test';
import assert from 'node:assert/strict';
import { validateScenario } from '../shared/scenario.js';

const base = () => ({ id: 'ok-1', fps: 10, size: [64, 36], fixture: 'x', beats: [{ id: 'a_b', kind: 'graph', duration: 1 }] });

test('scenario and beat ids must be safe directory names', () => {
	assert.doesNotThrow(() => validateScenario(base()));
	for (const bad of ['..', '../x', 'a/b', '.hidden', 'a b', '', 'x"y']) {
		assert.throws(() => validateScenario({ ...base(), id: bad }), /id/, `scenario id ${JSON.stringify(bad)}`);
		assert.throws(() => validateScenario({ ...base(), beats: [{ id: bad, kind: 'graph', duration: 1 }] }), /id/, `beat id ${JSON.stringify(bad)}`);
	}
});
