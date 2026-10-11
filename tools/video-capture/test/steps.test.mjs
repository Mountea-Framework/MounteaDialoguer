import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSteps, typeSchedule, moveFrames, moveSeconds, holdFrames, lookupKey, matcherText, targetText, collectKeys } from '../shared/steps.js';
import { validateScenario } from '../shared/scenario.js';

const app = (steps) => ({ id: 'a', fps: 30, size: [1920, 960], beats: [{ id: 'main', kind: 'app', steps }] });

test('a valid step list passes', () => {
	const steps = [
		{ do: 'hold', seconds: 1 },
		{ do: 'click', target: { role: 'button', nameKey: 'common.create' }, caption: 'Go' },
		{ do: 'type', target: { labelKey: 'projects.projectName' }, text: 'x', cps: 10 },
		{ do: 'press', keys: 'Control+S', hint: 'Ctrl+S' },
		{ do: 'drag', from: { handle: { node: 'Start', type: 'source' } }, to: { node: 'Welcome' } },
		{ do: 'select', target: { label: 'Participant' }, option: 'Innkeeper' },
	];
	assert.deepEqual(validateSteps(steps), []);
	assert.equal(validateScenario(app(steps)).id, 'a');
});

test('every problem is reported with the step index', () => {
	const problems = validateSteps([
		{ do: 'dance' },
		{ do: 'click', target: { role: 'button', css: 'a' } },
		{ do: 'hold', seconds: 0 },
		{ id: 'dup', do: 'hold', seconds: 1 },
		{ id: 'dup', do: 'hold', seconds: 1 },
		{ do: 'type', text: '' },
		{ do: 'select', target: { label: 'x' } },
		{ do: 'click', target: { role: 'button', bogus: 1 }, zoom: { level: 1 } },
	]);
	const all = problems.join('\n');
	for (const needle of ['steps[0]: do must be one of', 'exactly one of', 'hold needs seconds', 'duplicate id', 'type needs text', 'select needs option', 'unknown target key "bogus"', 'zoom needs']) {
		assert.ok(all.includes(needle), `missing: ${needle}\n${all}`);
	}
});

test('an app scenario needs exactly one beat and needs no fixture', () => {
	assert.throws(() => validateScenario({ ...app([{ do: 'hold', seconds: 1 }]), beats: [{ id: 'a', kind: 'app', steps: [{ do: 'hold', seconds: 1 }] }, { id: 'b', kind: 'app', steps: [{ do: 'hold', seconds: 1 }] }] }), /exactly one beat/);
	assert.throws(() => validateScenario({ id: 'g', fps: 30, size: [1, 1], beats: [{ id: 'x', kind: 'graph', duration: 1 }] }), /fixture is required/);
});

test('typeSchedule emits every character, at the requested rate', () => {
	const schedule = typeSchedule('Hello world', 15, 30);
	assert.equal(schedule.join(''), 'Hello world');
	assert.equal(schedule.length, 22, '11 chars at 15 cps and 30 fps take 22 frames');
	assert.ok(schedule.every((chunk) => chunk.length <= 1));
	assert.deepEqual(typeSchedule('ab', 100, 30), ['ab'], 'faster than one char per frame batches characters');
});

test('cursor travel time grows with distance and is clamped', () => {
	assert.equal(moveSeconds(0), 0.3);
	assert.ok(moveSeconds(900) > moveSeconds(100));
	assert.equal(moveSeconds(100000), 1.1);
	assert.equal(moveFrames(0, 30), 9);
	assert.equal(moveFrames(900, 30, 2), Math.round((0.78 / 2) * 30));
	assert.equal(holdFrames(0.001, 30), 1);
});

test('translation keys resolve, interpolations are cut, unknown keys fail loudly', () => {
	const bundle = { projects: { projectName: 'Project Name', count: 'Items {{count}}' } };
	assert.equal(lookupKey(bundle, 'projects.projectName'), 'Project Name');
	assert.throws(() => lookupKey(bundle, 'projects.missing'), /Unknown translation key "projects.missing"/);
	assert.equal(matcherText('Items {{count}}'), 'Items');
	assert.equal(targetText({ labelKey: 'projects.projectName' }, bundle), 'Project Name');
	assert.equal(targetText({ name: 'Literal' }, bundle), 'Literal');
	assert.equal(targetText({ css: 'a' }, bundle), '');
});

test('collectKeys lists every i18n key a script uses, once, including nested targets', () => {
	const keys = collectKeys([
		{ do: 'click', target: { role: 'button', nameKey: 'a.b', within: { role: 'dialog', nameKey: 'a.c' } } },
		{ do: 'click', target: { role: 'button', nameKey: 'a.b' } },
		{ do: 'select', target: { labelKey: 'a.d' }, optionKey: 'a.e' },
	]);
	assert.deepEqual(keys.sort(), ['a.b', 'a.c', 'a.d', 'a.e']);
});
