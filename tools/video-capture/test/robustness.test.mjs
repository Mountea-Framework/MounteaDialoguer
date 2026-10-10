import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { captureScenario, toolRoot } from '../runner/capture.mjs';

const FIXTURE = 'ExampleProject/OnboardingExample.mnteadlgproj';
const scenario = (id, extra = {}) => ({
	id, fps: 10, size: [640, 360], language: 'en', fixture: FIXTURE,
	beats: [
		{ id: 'g1', kind: 'graph', theme: 'dark', duration: 0.2 },
		{ id: 'g2', kind: 'graph', theme: 'light', duration: 0.2 },
	],
	...extra,
});
const outDir = (id) => path.join(toolRoot, 'out', id);
const exists = (p) => fs.stat(p).then(() => true, () => false);
const finalFrames = async (id) => Promise.all(['g1', 'g2'].map((b) => fs.readFile(path.join(outDir(id), b, 'frame-0002.png'))));
const dropRows = (session) => session.page.evaluate(() => window.__capture.dropKeys('cs', 'editor.nodes.rows'));

test('a failed run never poisons the cache: the next run re-renders the beats it replaced', { timeout: 400000 }, async () => {
	const s = scenario('robust-cache');
	await fs.rm(outDir(s.id), { recursive: true, force: true });
	await captureScenario(s, { lang: 'en', force: true });
	const first = await finalFrames(s.id);
	// Renders every beat in cs and fails on the missing key; with the hash marker + per-beat check nothing may land in out/.
	await assert.rejects(() => captureScenario(s, { lang: 'cs', force: true, onSession: dropRows }), /Missing translation keys for "cs"/);
	const afterFailure = await finalFrames(s.id);
	assert.deepEqual(afterFailure, first, 'the failing run must not replace the cached frames');
	const manifest = await captureScenario(s, { lang: 'en' });
	assert.equal(manifest.language, 'en');
	assert.deepEqual(await finalFrames(s.id), first);
	// A beat directory whose marker does not match the manifest hash is re-rendered, not trusted.
	await fs.writeFile(path.join(outDir(s.id), 'g2', '.hash'), 'stale');
	await fs.writeFile(path.join(outDir(s.id), 'g2', 'frame-0002.png'), 'garbage');
	await captureScenario(s, { lang: 'en' });
	assert.deepEqual(await finalFrames(s.id), first);
});

test('a corrupt fixture fails with a parse error and leaves no beat directories', { timeout: 120000 }, async () => {
	const scratch = path.join(toolRoot, 'out', '.scratch');
	await fs.mkdir(scratch, { recursive: true });
	const bad = path.join(scratch, 'corrupt.mnteadlgproj');
	const original = await fs.readFile(path.resolve(toolRoot, '../..', FIXTURE));
	await fs.writeFile(bad, original.subarray(0, Math.floor(original.length / 3)));
	const s = scenario('robust-corrupt', { fixture: bad });
	await fs.rm(outDir(s.id), { recursive: true, force: true });
	await assert.rejects(() => captureScenario(s, { force: true }), /could not be parsed/);
	const left = (await fs.readdir(outDir(s.id))).filter((n) => n !== 'manifest.json');
	assert.deepEqual(left, []);
});

test('identical consecutive frames while nodes move fail as a stuck frame and leave nothing behind', { timeout: 120000 }, async () => {
	const s = scenario('robust-stuck', { beats: [{ id: 'mv', kind: 'graph', theme: 'dark', move: { node: 'Sell Apples', to: [1500, 700] }, duration: 0.5 }] });
	await fs.rm(outDir(s.id), { recursive: true, force: true });
	await assert.rejects(() => captureScenario(s, {
		force: true,
		// Test seam: onSession receives the live session, so the screenshot can be stubbed to return the same bytes every time
		// (what a renderer that stopped repainting would produce).
		onSession: (session) => { session.page.screenshot = async () => Buffer.from('same-frame'); },
	}), /stuck frame/);
	assert.deepEqual(await fs.readdir(outDir(s.id)), []);
});
