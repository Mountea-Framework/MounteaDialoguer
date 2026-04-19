export function getScopedRowAudioFilePaths(rowFolder) {
	if (!rowFolder || typeof rowFolder.filter !== 'function') return [];
	const files = rowFolder.filter((relativePath, file) => {
		if (!file || file.dir) return false;
		const safeRelativePath = String(relativePath || '').trim();
		return Boolean(safeRelativePath) && !safeRelativePath.includes('/');
	});

	return files
		.map((file) => String(file?.name || ''))
		.filter(Boolean)
		.sort((a, b) => a.localeCompare(b));
}

export function resolveRowAudioImportSelection(rowFolder, rowId) {
	const paths = getScopedRowAudioFilePaths(rowFolder);
	if (paths.length === 0) {
		return {
			selectedPath: '',
			warnings: [{ code: 'missing_row_audio', rowId: String(rowId || '') }],
		};
	}
	if (paths.length > 1) {
		return {
			selectedPath: paths[0],
			warnings: [
				{
					code: 'multiple_row_audio',
					rowId: String(rowId || ''),
					paths,
				},
			],
		};
	}
	return { selectedPath: paths[0], warnings: [] };
}
