import { test, expect } from '@playwright/test';
import { openModuleHarness } from './helpers/moduleHarness.js';

test.beforeEach(async ({ page }) => { await openModuleHarness(page); });

test('asset identifiers and attachment segments preserve documented fallbacks', async ({ page }) => {
	const actual = await page.evaluate(async () => {
		const { sanitizeUnrealIdentifier: identifier, sanitizeAttachmentIdSegment: segment } = await import('/src/lib/assetNaming.js');
		return [identifier(' Ask for Work '), identifier('český název'), identifier('***'), segment('A/B>C D'), segment('', 'Unknown')];
	});
	expect(actual).toEqual(['Ask_for_Work', 'cesky_nazev', 'Asset', 'A_B_C_D', 'Unknown']);
});

test('ISS-040 audio filenames retain real extensions and preserve an absent extension', async ({ page }) => {
	const actual = await page.evaluate(async () => {
		const { sanitizeAudioFileName } = await import('/src/lib/assetNaming.js');
		return ['Ask for Work.wav', 'Můj zvuk.MP3', '  ???.wav  ', 'name with no ext'].map((name) => sanitizeAudioFileName(name));
	});
	expect(actual).toEqual(['Ask_for_Work.wav', 'Muj_zvuk.mp3', 'Audio.wav', 'name_with_no_ext']);
});

test('participant thumbnail identifiers sanitize category and participant names', async ({ page }) => {
	const actual = await page.evaluate(async () => {
		const { buildParticipantImageId } = await import('/src/lib/participantThumbnails.js');
		return buildParticipantImageId({ participantName: 'Žoldák Hero', categoryPath: 'Main/Characters > Tier 1' });
	});
	expect(actual).toBe('T_Main_Characters_Tier_1_Zoldak_Hero_Thumbnail');
});

test('row audio selection scopes direct files and reports deterministic duplicates or missing data', async ({ page }) => {
	const actual = await page.evaluate(async () => {
		const { getScopedRowAudioFilePaths, resolveRowAudioImportSelection } = await import('/src/lib/dialogueImportAudio.js');
		const { default: JSZip } = await import('/node_modules/.vite/deps/jszip.js');
		const archive = new JSZip();
		for (const path of ['audio/row-a/Line A.mp3', 'audio/row-b/Line B.mp3', 'audio/row-a/nested/skip.mp3', 'stringTable.json']) archive.file(path, 'fixture');
		const multiple = new JSZip();
		multiple.file('audio/row-a/z-last.mp3', 'z');
		multiple.file('audio/row-a/a-first.mp3', 'a');
		return {
			scoped: getScopedRowAudioFilePaths(archive.folder('audio/row-a')),
			multiple: resolveRowAudioImportSelection(multiple.folder('audio/row-a'), 'row-a'),
			missing: resolveRowAudioImportSelection(archive.folder('audio/row-c'), 'row-c'),
		};
	});
	expect(actual.scoped).toEqual(['audio/row-a/Line A.mp3']);
	expect(actual.multiple).toEqual({ selectedPath: 'audio/row-a/a-first.mp3', warnings: [{ code: 'multiple_row_audio', rowId: 'row-a', paths: ['audio/row-a/a-first.mp3', 'audio/row-a/z-last.mp3'] }] });
	expect(actual.missing).toEqual({ selectedPath: '', warnings: [{ code: 'missing_row_audio', rowId: 'row-c' }] });
});
