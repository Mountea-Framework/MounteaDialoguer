import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { captureScenario, toolRoot } from '../runner/capture.mjs';

const scenario = (id, steps) => ({
	id, fps: 10, size: [1280, 720], language: 'en', theme: 'dark', seed: 7,
	start: { route: '/' },
	beats: [{ id: 'main', kind: 'app', tail: 0.3, steps }],
});
const newProject = { id: 'new', do: 'click', target: { role: 'button', nameKey: 'projects.createNew' }, caption: 'Hello', zoom: { level: 1.5, hold: 0.2 } };
const steps = () => [{ id: 'look', do: 'hold', seconds: 0.5 }, newProject, { id: 'after', do: 'hold', seconds: 0.5 }];

const hashDir = async (dir) => {
	const hash = crypto.createHash('sha1');
	for (const name of (await fs.readdir(dir)).filter((n) => n.endsWith('.png')).sort()) hash.update(await fs.readFile(path.join(dir, name)));
	return hash.digest('hex');
};

test('an app beat captured twice yields byte-identical frames and identical cues', { timeout: 300000 }, async () => {
	const a = await captureScenario(scenario('app-det-a', steps()), { force: true });
	const b = await captureScenario(scenario('app-det-b', steps()), { force: true });
	assert.equal(await hashDir(path.join(toolRoot, 'out/app-det-a/main')), await hashDir(path.join(toolRoot, 'out/app-det-b/main')));
	assert.deepEqual(a.beats[0].cues, b.beats[0].cues);
	assert.equal(a.beats[0].kind, 'app');
});

test('cues carry timing, the target rectangle, the caption and the zoom of each step', { timeout: 300000 }, async () => {
	const manifest = await captureScenario(scenario('app-cues', steps()), { force: true });
	const [look, click, after] = manifest.beats[0].cues;
	assert.equal(look.kind, 'hold');
	assert.equal(look.start, 0);
	assert.ok(click.start >= look.end, 'steps run one after another');
	assert.ok(click.at >= click.start && click.at <= click.end, 'the click lands inside its step');
	assert.ok(click.rect.width > 0 && click.rect.height > 0);
	assert.equal(click.caption, 'Hello');
	assert.equal(click.zoom.level, 1.5);
	assert.ok(after.start >= click.end);
	assert.equal(manifest.beats[0].frames, Math.round(manifest.beats[0].duration * 10));
});

test('a target that never appears fails naming it and leaves a screenshot, not a partial beat', { timeout: 300000 }, async () => {
	const s = scenario('app-missing', [{ id: 'ghost', do: 'click', target: { role: 'button', name: 'No such button' } }]);
	await fs.rm(path.join(toolRoot, 'out/app-missing'), { recursive: true, force: true });
	await assert.rejects(() => captureScenario(s, { force: true }), /target not visible after 5 s: \{"role":"button","name":"No such button"\}/);
	const entries = await fs.readdir(path.join(toolRoot, 'out/app-missing'));
	assert.ok(entries.includes('failure-main.png'));
	assert.ok(!entries.includes('main'));
});

test('a translation key that does not exist fails by name', { timeout: 300000 }, async () => {
	const s = scenario('app-badkey', [{ id: 'bad', do: 'click', target: { role: 'button', nameKey: 'projects.doesNotExist' } }]);
	await assert.rejects(() => captureScenario(s, { force: true }), /Unknown translation key "projects.doesNotExist"/);
});
