import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateScenario } from '../shared/scenario.js';
import { collectKeys, lookupKey } from '../shared/steps.js';
import appLanguages from '../../../electron/shared/app-languages.json' with { type: 'json' };

const here = path.dirname(fileURLToPath(import.meta.url));
const toolRoot = path.resolve(here, '..');
const repoRoot = path.resolve(toolRoot, '../..');
const chapterDir = path.join(toolRoot, 'scenarios', 'tutorials');
/**
 * Strings the app has not translated yet. Chapters that need them still render, but only in English;
 * the list must shrink as the app gets translated (a stale entry fails the test below).
 */
const UNTRANSLATED = new Set(['conditions.title', 'editor.preview.start']);

const chapters = [];
for (const file of (await fs.readdir(chapterDir)).filter((f) => /^ch\d+\.js$/.test(f)).sort()) {
	chapters.push((await import(pathToFileURL(path.join(chapterDir, file)).href)).default);
}
const locale = async (code) => JSON.parse(await fs.readFile(path.join(repoRoot, 'src', 'i18n', 'locales', `${code}.json`), 'utf8'));

test('there are six tutorial chapters and each is a valid scenario', () => {
	assert.deepEqual(chapters.map((c) => c.id), ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6']);
	for (const chapter of chapters) validateScenario(chapter);
});

test('every chapter after the first starts from a committed fixture', async () => {
	for (const chapter of chapters.slice(1)) {
		const fixture = chapter.start?.fixture;
		assert.ok(fixture, `${chapter.id} needs start.fixture`);
		await fs.access(path.join(repoRoot, fixture)).catch(() => assert.fail(`${chapter.id}: missing fixture ${fixture}; run the previous chapter with --save-state`));
	}
});

test('every translation key a chapter uses exists in English', async () => {
	const en = await locale('en');
	for (const chapter of chapters) {
		for (const key of collectKeys(chapter.beats.flatMap((b) => b.steps))) {
			assert.doesNotThrow(() => lookupKey(en, key), `${chapter.id} uses unknown key ${key}`);
		}
	}
});

test('chapters have every key in every app language, apart from the known untranslated strings', async () => {
	for (const { code } of appLanguages.filter((l) => l.code !== 'en')) {
		const bundle = await locale(code);
		for (const chapter of chapters) {
			for (const key of collectKeys(chapter.beats.flatMap((b) => b.steps))) {
				if (UNTRANSLATED.has(key)) continue;
				assert.doesNotThrow(() => lookupKey(bundle, key), `${chapter.id} (${code}) lacks key ${key}`);
			}
		}
	}
});

test('the known untranslated strings are still untranslated (remove them from the list once fixed)', async () => {
	for (const { code } of appLanguages.filter((l) => l.code !== 'en')) {
		const bundle = await locale(code);
		for (const key of UNTRANSLATED) assert.throws(() => lookupKey(bundle, key), /Unknown translation key/, `${key} is now translated in ${code}; drop it from UNTRANSLATED`);
	}
});

test('every caption is short enough to read at a glance', () => {
	for (const chapter of chapters) {
		for (const step of chapter.beats.flatMap((b) => b.steps)) {
			if (step.caption) assert.ok(step.caption.split(/\s+/).length <= 8, `${chapter.id}/${step.id}: caption "${step.caption}" has more than 8 words`);
		}
	}
});

test('the tutorials runner parses its flags and rejects nonsense', async () => {
	const { parseTutorialArgs, CHAPTERS, fixtureFor } = await import('../runner/tutorials.mjs');
	assert.deepEqual(parseTutorialArgs(['--only', 'ch3', '--lang', 'de', '--render']), { only: 'ch3', lang: 'de', updateFixtures: false, render: true });
	assert.throws(() => parseTutorialArgs(['--only', 'ch9']), /Unknown chapter "ch9"/);
	assert.throws(() => parseTutorialArgs(['--update-fixtures', '--only', 'ch2']), /needs the whole chain/);
	assert.throws(() => parseTutorialArgs(['--bogus']), /Unknown argument/);
	assert.equal(await fixtureFor('ch1'), null);
	for (const chapter of CHAPTERS.slice(1)) assert.match(await fixtureFor(chapter), new RegExp(`${chapter}-start\.mnteadlgproj$`), 'chapter N reads fixtures/chN-start');
});

test('chapters are paced for a voice-over: slowed down, with time to read or speak every caption', () => {
	for (const chapter of chapters) {
		assert.ok(chapter.pace >= 1.4, `${chapter.id}: pace should be at least 1.4`);
		assert.ok(chapter.captionDwell >= 3, `${chapter.id}: captionDwell should be at least 3 seconds`);
	}
});
