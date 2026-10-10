import test from 'node:test';
import assert from 'node:assert/strict';
import { captureScenario } from '../runner/capture.mjs';

const scenario = (id) => ({
	id, fps: 10, size: [640, 360], language: 'en',
	fixture: 'ExampleProject/OnboardingExample.mnteadlgproj',
	beats: [{ id: 'g', kind: 'graph', theme: 'dark', duration: 0.1 }],
});

test('--lang renders with the real locale and records it in the manifest', { timeout: 240000 }, async () => {
	const manifest = await captureScenario(scenario('lang-cs'), { lang: 'cs', force: true });
	assert.equal(manifest.language, 'cs');
});

test('an unsupported language fails before rendering and lists the supported ones', { timeout: 60000 }, async () => {
	await assert.rejects(
		() => captureScenario(scenario('lang-bad'), { lang: 'xx', force: true }),
		/Unsupported language "xx".*en, cs, de, fr, es, pl/
	);
});

test('a key missing from the requested language fails and names the key', { timeout: 240000 }, async () => {
	await assert.rejects(
		() => captureScenario(scenario('lang-missing'), {
			lang: 'cs', force: true,
			onSession: (session) => session.page.evaluate(() => window.__capture.dropKeys('cs', 'editor.nodes.rows')),
		}),
		/Missing translation keys for "cs": .*editor\.nodes\.rows/
	);
});

test('the key check also runs when every beat is served from cache', { timeout: 300000 }, async () => {
	const s = scenario('lang-cached');
	await captureScenario(s, { lang: 'cs', force: true });
	await assert.rejects(
		() => captureScenario(s, {
			lang: 'cs',
			onSession: (session) => session.page.evaluate(() => window.__capture.dropKeys('cs', 'editor.nodes.rows')),
		}),
		/Missing translation keys for "cs": .*editor\.nodes\.rows/
	);
});
