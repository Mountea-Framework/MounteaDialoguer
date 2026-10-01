import i18n from '@/i18n';

const groups = {
	STALE_PROFILE: 'stale', STALE_PROJECT: 'stale', PROJECT_EXISTS: 'exists', PROJECT_NOT_FOUND: 'missing',
	RECORD_REFERENCED: 'referenced', DEFINITION_REFERENCED: 'referenced',
	CATEGORY_CYCLE: 'categoryCycle', CATEGORY_DEPTH: 'categoryDepth', CATEGORY_PARENT_MISSING: 'reference',
	REFERENCE_MISSING: 'reference', AMBIGUOUS_REFERENCE: 'reference', FOREIGN_OWNER: 'reference', FOREIGN_OWNERSHIP: 'reference',
	INVALID_NAME: 'name', DUPLICATE_CATEGORY_NAME: 'duplicateName', DUPLICATE_PARTICIPANT_NAME: 'duplicateName',
	INVALID_DEFINITION: 'definition', INVALID_PROPERTY_NAME: 'definition', INVALID_PROPERTY_TYPE: 'definition', INVALID_PROPERTY_DEFAULT: 'definition', INCOMPATIBLE_SCHEMA: 'definition',
	LEGACY_REFERENCE_REPAIR_REQUIRED: 'repair', PROJECT_REPAIR_REQUIRED: 'repair', LOCALIZATION_REPAIR_REQUIRED: 'repair', INVALID_PROJECT_DATA: 'repair',
	MISSING_MEDIA: 'media', INVALID_MEDIA: 'media', MEDIA_SIZE_MISMATCH: 'media',
	missing_reference: 'reference', ambiguous_reference: 'reference', duplicate_identity: 'duplicateIdentity', missing_project: 'missing', missing_dialogue: 'missing',
};

/** Translate presentation, retaining structured record identities and paths as evidence. */
export function describeError(error, t = i18n.t.bind(i18n)) {
	const code = String(error?.code || '');
	const group = groups[code] || (/^ARCHIVE_.*_LIMIT$/.test(code) ? 'archiveLimit' : /^INVALID_ARCHIVE/.test(code) || code === 'UNSAFE_ARCHIVE_PATH' ? 'archiveCorrupt' : /^UNSUPPORTED_ARCHIVE/.test(code) ? 'archiveUnsupported' : error?.name === 'QuotaExceededError' ? 'quota' : 'unexpected');
	const description = t(`errors.details.${group}`);
	const evidence = [...(error?.references || []), ...(error?.diagnostics || []), error || {}]
		.map(record => ['code', 'table', 'id', 'projectId', 'dialogueId', 'nodeId', 'rowId', 'key', 'path'].map(key => record?.[key]).filter(value => typeof value === 'string' && value).join(' · '))
		.filter(Boolean);
	return evidence.length ? `${description} ${[...new Set(evidence)].join('; ')}` : description;
}

export function errorToast(error, action = 'update') {
	return { variant: 'error', title: i18n.t(`errors.actions.${action}`), description: describeError(error) };
}
