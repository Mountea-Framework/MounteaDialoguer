/* eslint-env jest */
import {
	getScopedRowAudioFilePaths,
	resolveRowAudioImportSelection,
} from './dialogueImportAudio';

function createMockRowFolder(allEntries, rowId) {
	const prefix = `audio/${rowId}/`;
	return {
		filter: (predicate) =>
			allEntries
				.filter((entry) => String(entry.name || '').startsWith(prefix))
				.filter((entry) =>
					predicate(entry.name.slice(prefix.length), {
						name: entry.name,
						dir: Boolean(entry.dir),
					})
				)
				.map((entry) => ({ name: entry.name, dir: Boolean(entry.dir) })),
	};
}

describe('dialogueImportAudio', () => {
	test('selects only files directly under the requested row folder', () => {
		const rowFolder = createMockRowFolder([
			{ name: 'audio/row-a/Line A.mp3', dir: false },
			{ name: 'audio/row-b/Line B.mp3', dir: false },
			{ name: 'audio/row-a/nested/skip.mp3', dir: false },
			{ name: 'stringTable.json', dir: false },
		], 'row-a');

		expect(getScopedRowAudioFilePaths(rowFolder)).toEqual([
			'audio/row-a/Line A.mp3',
		]);
	});

	test('returns deterministic first file and warning when multiple files exist', () => {
		const rowFolder = createMockRowFolder([
			{ name: 'audio/row-a/z-last.mp3', dir: false },
			{ name: 'audio/row-a/a-first.mp3', dir: false },
		], 'row-a');

		expect(resolveRowAudioImportSelection(rowFolder, 'row-a')).toEqual({
			selectedPath: 'audio/row-a/a-first.mp3',
			warnings: [
				{
					code: 'multiple_row_audio',
					rowId: 'row-a',
					paths: ['audio/row-a/a-first.mp3', 'audio/row-a/z-last.mp3'],
				},
			],
		});
	});

	test('returns missing warning when row folder has no direct audio file', () => {
		const rowFolder = createMockRowFolder([{ name: 'audio/row-b/Other.mp3', dir: false }], 'row-a');

		expect(resolveRowAudioImportSelection(rowFolder, 'row-a')).toEqual({
			selectedPath: '',
			warnings: [{ code: 'missing_row_audio', rowId: 'row-a' }],
		});
	});
});
