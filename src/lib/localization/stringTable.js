const DEFAULT_LOCALE = 'en';

export const LOCALIZED_STRING_FIELDS = Object.freeze({
	displayName: 'displayName',
	selectionTitle: 'selectionTitle',
	rowText: 'rowText',
});

const LOCALIZED_STRING_FIELD_VALUES = Object.freeze(
	Object.values(LOCALIZED_STRING_FIELDS)
);

const FIELD_TO_KEY_SUFFIX = Object.freeze({
	[LOCALIZED_STRING_FIELDS.displayName]: 'display_name',
	[LOCALIZED_STRING_FIELDS.selectionTitle]: 'selection_title',
	[LOCALIZED_STRING_FIELDS.rowText]: 'text',
});

const KEY_SUFFIX_TO_FIELD = Object.freeze(
	Object.fromEntries(Object.entries(FIELD_TO_KEY_SUFFIX).map(([field, suffix]) => [suffix, field]))
);

const READABLE_KEY_REGEX =
	/^dlg\.([a-z0-9_]+)\.n_([a-z0-9_]+)(?:\.r_([a-z0-9_]+))?\.(display_name|selection_title|text)$/;
const LEGACY_ROW_KEY_REGEX = /^dlg\.([^.]+)\.node\.([^.]+)\.row\.([^.]+)\.text$/;
const LEGACY_NODE_KEY_REGEX = /^dlg\.([^.]+)\.node\.([^.]+)\.(displayName|selectionTitle)$/;

function toStringSafe(value) {
	if (value === null || value === undefined) return '';
	return String(value);
}

function shortHash(value, length = 4) {
	const source = String(value || '');
	let hash = 0;
	for (let idx = 0; idx < source.length; idx += 1) {
		hash = (hash * 31 + source.charCodeAt(idx)) >>> 0;
	}
	return hash.toString(16).padStart(8, '0').slice(0, Math.max(2, length));
}

export function slugifyForKeySegment(value, fallback = 'item') {
	const source = toStringSafe(value)
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
	const sanitized = source
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.replace(/_+/g, '_');
	if (sanitized) return sanitized;
	const fallbackSanitized = toStringSafe(fallback)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
	return fallbackSanitized || 'item';
}

export function isValidLocaleTag(value) {
	const raw = String(value || '').trim();
	if (!raw) return false;
	try {
		const locale = new Intl.Locale(raw);
		return Boolean(locale?.toString());
	} catch (error) {
		return false;
	}
}

export function normalizeLocaleTag(value, fallback = '') {
	const raw = String(value || '').trim();
	if (!raw) return fallback;
	try {
		return new Intl.Locale(raw).toString();
	} catch (error) {
		return fallback;
	}
}

export function normalizeProjectLocalizationConfig(rawConfig = {}) {
	const rawDefault = normalizeLocaleTag(rawConfig?.defaultLocale, DEFAULT_LOCALE);
	const rawSupported = Array.isArray(rawConfig?.supportedLocales)
		? rawConfig.supportedLocales
		: [];
	const supported = [];
	const seen = new Set();

	for (const locale of rawSupported) {
		const normalized = normalizeLocaleTag(locale, '');
		if (!normalized || seen.has(normalized)) continue;
		seen.add(normalized);
		supported.push(normalized);
	}

	if (!seen.has(rawDefault)) {
		supported.unshift(rawDefault);
	}

	return {
		enabled: true,
		defaultLocale: rawDefault,
		supportedLocales: supported.length > 0 ? supported : [rawDefault],
	};
}

export function isProjectLocalizationEnabled() {
	return true;
}

export function ensureDialogueLocalizationSlug(dialogue = null) {
	const existing = slugifyForKeySegment(dialogue?.localizationSlug || '', '');
	if (existing) return existing;
	return slugifyForKeySegment(dialogue?.name || dialogue?.id || 'dialogue', 'dialogue');
}

export function ensureNodeLocalizationToken(node = null) {
	const existing = slugifyForKeySegment(node?.data?.localizationNodeToken || '', '');
	if (existing) return existing;
	const base = slugifyForKeySegment(
		node?.data?.displayName || node?.data?.label || node?.type || 'node',
		'node'
	).slice(0, 24);
	return `${base}_${shortHash(node?.id || base)}`;
}

export function ensureRowLocalizationToken(row = null) {
	const existing = slugifyForKeySegment(row?.localizationRowToken || '', '');
	if (existing) return existing;
	const base = slugifyForKeySegment(row?.text || row?.id || 'line', 'line').slice(0, 24);
	return `${base}_${shortHash(row?.id || base)}`;
}

export function buildReadableLocalizedStringKey({
	dialogueSlug = '',
	nodeToken = '',
	rowToken = '',
	field = '',
}) {
	const safeDialogueSlug = slugifyForKeySegment(dialogueSlug, '');
	const safeNodeToken = slugifyForKeySegment(nodeToken, '');
	const safeRowToken = slugifyForKeySegment(rowToken, '');
	const safeField = String(field || '').trim();
	const suffix = FIELD_TO_KEY_SUFFIX[safeField];

	if (!safeDialogueSlug || !safeNodeToken || !suffix) return '';

	if (safeField === LOCALIZED_STRING_FIELDS.rowText) {
		if (!safeRowToken) return '';
		return `dlg.${safeDialogueSlug}.n_${safeNodeToken}.r_${safeRowToken}.text`;
	}

	return `dlg.${safeDialogueSlug}.n_${safeNodeToken}.${suffix}`;
}

// Legacy key format support for backward compatibility.
export function buildLocalizedStringKey({
	dialogueId = '',
	nodeId = '',
	rowId = '',
	field = '',
}) {
	const safeDialogueId = String(dialogueId || '').trim();
	const safeNodeId = String(nodeId || '').trim();
	const safeRowId = String(rowId || '').trim();
	const safeField = String(field || '').trim();

	if (!safeDialogueId || !safeNodeId || !safeField) return '';

	if (safeField === LOCALIZED_STRING_FIELDS.rowText) {
		if (!safeRowId) return '';
		return `dlg.${safeDialogueId}.node.${safeNodeId}.row.${safeRowId}.text`;
	}

	if (
		safeField === LOCALIZED_STRING_FIELDS.displayName ||
		safeField === LOCALIZED_STRING_FIELDS.selectionTitle
	) {
		return `dlg.${safeDialogueId}.node.${safeNodeId}.${safeField}`;
	}

	return '';
}

export function parseLocalizedStringKey(key) {
	const raw = String(key || '').trim();
	if (!raw) return null;

	const readableMatch = raw.match(READABLE_KEY_REGEX);
	if (readableMatch) {
		const keyField = readableMatch[4];
		return {
			keyType: 'readable',
			dialogueSlug: readableMatch[1],
			nodeToken: readableMatch[2],
			rowToken: readableMatch[3] || '',
			field: KEY_SUFFIX_TO_FIELD[keyField] || '',
		};
	}

	const rowMatch = raw.match(LEGACY_ROW_KEY_REGEX);
	if (rowMatch) {
		return {
			keyType: 'legacy',
			dialogueId: rowMatch[1],
			nodeId: rowMatch[2],
			rowId: rowMatch[3],
			field: LOCALIZED_STRING_FIELDS.rowText,
		};
	}

	const nodeMatch = raw.match(LEGACY_NODE_KEY_REGEX);
	if (nodeMatch) {
		return {
			keyType: 'legacy',
			dialogueId: nodeMatch[1],
			nodeId: nodeMatch[2],
			rowId: '',
			field: nodeMatch[3],
		};
	}

	return null;
}

function normalizeLocalizedValues(rawValues = {}) {
	const values = {};
	const source = rawValues && typeof rawValues === 'object' ? rawValues : {};
	for (const [locale, value] of Object.entries(source)) {
		const normalizedLocale = normalizeLocaleTag(locale, '');
		if (!normalizedLocale) continue;
		values[normalizedLocale] = toStringSafe(value);
	}
	return values;
}

export function normalizeLocalizedStringEntry(rawEntry = {}) {
	const parsed = parseLocalizedStringKey(rawEntry?.key);
	const field = LOCALIZED_STRING_FIELD_VALUES.includes(rawEntry?.field)
		? rawEntry.field
		: parsed?.field || '';
	const dialogueId = String(rawEntry?.dialogueId || parsed?.dialogueId || '').trim();
	const nodeId = String(rawEntry?.nodeId || parsed?.nodeId || '').trim();
	const rowId = String(rawEntry?.rowId || parsed?.rowId || '').trim();
	const dialogueSlug = slugifyForKeySegment(
		rawEntry?.dialogueSlug || parsed?.dialogueSlug || '',
		''
	);
	const nodeToken = slugifyForKeySegment(rawEntry?.nodeToken || parsed?.nodeToken || '', '');
	const rowToken = slugifyForKeySegment(rawEntry?.rowToken || parsed?.rowToken || '', '');

	const explicitKey = String(rawEntry?.key || '').trim();
	let key = explicitKey;
	if (!key) {
		if (dialogueSlug && nodeToken) {
			key = buildReadableLocalizedStringKey({
				dialogueSlug,
				nodeToken,
				rowToken,
				field,
			});
		}
		if (!key) {
			key = buildLocalizedStringKey({ dialogueId, nodeId, rowId, field });
		}
	}

	return {
		projectId: String(rawEntry?.projectId || '').trim(),
		key,
		keyType: parsed?.keyType || (key.match(READABLE_KEY_REGEX) ? 'readable' : ''),
		dialogueId,
		nodeId,
		rowId,
		dialogueSlug,
		nodeToken,
		rowToken,
		field,
		values: normalizeLocalizedValues(rawEntry?.values),
		createdAt: rawEntry?.createdAt || '',
		modifiedAt: rawEntry?.modifiedAt || '',
	};
}

function resolveLocalizedValueInternal({
	entry = null,
	locale = '',
	defaultLocale = DEFAULT_LOCALE,
	legacyValue = '',
}) {
	const normalizedLocale = normalizeLocaleTag(locale, '');
	const normalizedDefault = normalizeLocaleTag(defaultLocale, DEFAULT_LOCALE);
	const values = entry?.values && typeof entry.values === 'object' ? entry.values : {};

	if (normalizedLocale && Object.prototype.hasOwnProperty.call(values, normalizedLocale)) {
		return toStringSafe(values[normalizedLocale]);
	}
	if (normalizedDefault && Object.prototype.hasOwnProperty.call(values, normalizedDefault)) {
		return toStringSafe(values[normalizedDefault]);
	}
	return toStringSafe(legacyValue);
}

function buildLegacyOrReadableKey({
	dialogueId = '',
	dialogueSlug = '',
	nodeId = '',
	nodeToken = '',
	rowId = '',
	rowToken = '',
	field = '',
}) {
	if (dialogueSlug && nodeToken) {
		const readable = buildReadableLocalizedStringKey({
			dialogueSlug,
			nodeToken,
			rowToken,
			field,
		});
		if (readable) return readable;
	}
	return buildLocalizedStringKey({ dialogueId, nodeId, rowId, field });
}

export function prepareLocalizedNodesAndEntries({
	projectId = '',
	dialogueId = '',
	dialogueSlug = '',
	nodes = [],
	locale = DEFAULT_LOCALE,
	existingEntries = [],
}) {
	const normalizedLocale = normalizeLocaleTag(locale, DEFAULT_LOCALE);
	const safeProjectId = String(projectId || '').trim();
	const safeDialogueId = String(dialogueId || '').trim();
	const safeDialogueSlug = slugifyForKeySegment(dialogueSlug || '', '');
	const now = new Date().toISOString();
	const diagnostics = [];

	const existingByKey = new Map(
		(existingEntries || [])
			.map((entry) => normalizeLocalizedStringEntry(entry))
			.filter((entry) => entry.key)
			.map((entry) => [entry.key, entry])
	);

	const entriesByKey = new Map();
	const seenKeys = new Set();
	const nodesForPersistence = [];

	for (const rawNode of nodes || []) {
		const node = { ...rawNode };
		const nodeId = String(node?.id || '').trim();
		const nodeData = { ...(node?.data || {}) };
		if (!nodeId) {
			nodesForPersistence.push({ ...node, data: nodeData });
			continue;
		}

		const nodeToken = ensureNodeLocalizationToken({ ...node, data: nodeData });
		nodeData.localizationNodeToken = nodeToken;

		const upsertFieldEntry = ({
			field,
			keyField,
			valueField,
			rowId = '',
			rowToken = '',
		}) => {
			const keyFromNode = String(nodeData[keyField] || '').trim();
			const key =
				keyFromNode ||
				buildLegacyOrReadableKey({
					dialogueId: safeDialogueId,
					dialogueSlug: safeDialogueSlug,
					nodeId,
					nodeToken,
					rowId,
					rowToken,
					field,
				});

			if (!key) {
				diagnostics.push({ type: 'missing_key', field, nodeId, rowId });
				return;
			}

			nodeData[keyField] = key;
			if (Object.prototype.hasOwnProperty.call(nodeData, valueField)) {
				delete nodeData[valueField];
			}

			if (seenKeys.has(key)) {
				diagnostics.push({ type: 'duplicate_key', key, field, nodeId, rowId });
			}
			seenKeys.add(key);

			const existing = entriesByKey.get(key) || existingByKey.get(key) || null;
			const values = { ...(existing?.values || {}) };
			const hasRawValue = Object.prototype.hasOwnProperty.call(rawNode?.data || {}, valueField);
			if (hasRawValue) {
				values[normalizedLocale] = toStringSafe(rawNode?.data?.[valueField]);
			}

			entriesByKey.set(key, {
				projectId: safeProjectId,
				key,
				dialogueId: safeDialogueId,
				nodeId,
				rowId,
				dialogueSlug: safeDialogueSlug,
				nodeToken,
				rowToken,
				field,
				values,
				createdAt: existing?.createdAt || now,
				modifiedAt: now,
			});
		};

		if (
			Object.prototype.hasOwnProperty.call(rawNode?.data || {}, 'displayName') ||
			Object.prototype.hasOwnProperty.call(nodeData, 'displayNameKey')
		) {
			upsertFieldEntry({
				field: LOCALIZED_STRING_FIELDS.displayName,
				keyField: 'displayNameKey',
				valueField: 'displayName',
			});
		}

		if (
			Object.prototype.hasOwnProperty.call(rawNode?.data || {}, 'selectionTitle') ||
			Object.prototype.hasOwnProperty.call(nodeData, 'selectionTitleKey')
		) {
			upsertFieldEntry({
				field: LOCALIZED_STRING_FIELDS.selectionTitle,
				keyField: 'selectionTitleKey',
				valueField: 'selectionTitle',
			});
		}

		if (Array.isArray(nodeData.dialogueRows)) {
			nodeData.dialogueRows = nodeData.dialogueRows.map((rawRow, rowIndex) => {
				const row = { ...(rawRow || {}) };
				const rowId = String(row?.id || '').trim();
				const rowToken = ensureRowLocalizationToken(rawRow);
				row.localizationRowToken = rowToken;

				const rowTextKey =
					String(row.textKey || '').trim() ||
					buildLegacyOrReadableKey({
						dialogueId: safeDialogueId,
						dialogueSlug: safeDialogueSlug,
						nodeId,
						nodeToken,
						rowId,
						rowToken,
						field: LOCALIZED_STRING_FIELDS.rowText,
					});

				if (!rowTextKey) {
					diagnostics.push({ type: 'missing_key', field: LOCALIZED_STRING_FIELDS.rowText, nodeId, rowId });
					return row;
				}

				row.textKey = rowTextKey;
				if (Object.prototype.hasOwnProperty.call(row, 'text')) {
					delete row.text;
				}

				if (seenKeys.has(rowTextKey)) {
					diagnostics.push({
						type: 'duplicate_key',
						key: rowTextKey,
						field: LOCALIZED_STRING_FIELDS.rowText,
						nodeId,
						rowId,
						rowIndex,
					});
				}
				seenKeys.add(rowTextKey);

				const existing = entriesByKey.get(rowTextKey) || existingByKey.get(rowTextKey) || null;
				const values = { ...(existing?.values || {}) };
				const rawSourceRow = Array.isArray(rawNode?.data?.dialogueRows)
					? rawNode.data.dialogueRows[rowIndex]
					: null;
				if (rawSourceRow && Object.prototype.hasOwnProperty.call(rawSourceRow, 'text')) {
					values[normalizedLocale] = toStringSafe(rawSourceRow.text);
				}

				entriesByKey.set(rowTextKey, {
					projectId: safeProjectId,
					key: rowTextKey,
					dialogueId: safeDialogueId,
					nodeId,
					rowId,
					dialogueSlug: safeDialogueSlug,
					nodeToken,
					rowToken,
					field: LOCALIZED_STRING_FIELDS.rowText,
					values,
					createdAt: existing?.createdAt || now,
					modifiedAt: now,
				});

				return row;
			});
		}

		nodesForPersistence.push({ ...node, data: nodeData });
	}

	return {
		nodes: nodesForPersistence,
		entries: Array.from(entriesByKey.values()),
		diagnostics,
	};
}

export function materializeLocalizedNodes({
	nodes = [],
	dialogueId = '',
	dialogueSlug = '',
	locale = '',
	defaultLocale = DEFAULT_LOCALE,
	stringEntries = [],
}) {
	const byKey = new Map(
		(stringEntries || [])
			.map((entry) => normalizeLocalizedStringEntry(entry))
			.filter((entry) => entry.key)
			.map((entry) => [entry.key, entry])
	);

	const safeDialogueId = String(dialogueId || '').trim();
	const safeDialogueSlug = slugifyForKeySegment(dialogueSlug || '', '');

	return (nodes || []).map((rawNode) => {
		const node = { ...rawNode };
		const nextData = { ...(node?.data || {}) };
		const nodeId = String(node?.id || '').trim();
		if (!nodeId) return { ...node, data: nextData };

		const nodeToken = ensureNodeLocalizationToken({ ...node, data: nextData });
		nextData.localizationNodeToken = nodeToken;

		const displayNameKey =
			String(nextData.displayNameKey || '').trim() ||
			buildLegacyOrReadableKey({
				dialogueId: safeDialogueId,
				dialogueSlug: safeDialogueSlug,
				nodeId,
				nodeToken,
				field: LOCALIZED_STRING_FIELDS.displayName,
			});
		const selectionTitleKey =
			String(nextData.selectionTitleKey || '').trim() ||
			buildLegacyOrReadableKey({
				dialogueId: safeDialogueId,
				dialogueSlug: safeDialogueSlug,
				nodeId,
				nodeToken,
				field: LOCALIZED_STRING_FIELDS.selectionTitle,
			});
		nextData.displayNameKey = displayNameKey;
		nextData.selectionTitleKey = selectionTitleKey;

		nextData.displayName = resolveLocalizedValueInternal({
			entry: byKey.get(displayNameKey),
			locale,
			defaultLocale,
			legacyValue: nextData.displayName,
		});
		nextData.selectionTitle = resolveLocalizedValueInternal({
			entry: byKey.get(selectionTitleKey),
			locale,
			defaultLocale,
			legacyValue: nextData.selectionTitle,
		});

		if (Array.isArray(nextData.dialogueRows)) {
			nextData.dialogueRows = nextData.dialogueRows.map((rawRow) => {
				const row = { ...(rawRow || {}) };
				const rowId = String(row?.id || '').trim();
				const rowToken = ensureRowLocalizationToken(row);
				const rowTextKey =
					String(row.textKey || '').trim() ||
					buildLegacyOrReadableKey({
						dialogueId: safeDialogueId,
						dialogueSlug: safeDialogueSlug,
						nodeId,
						nodeToken,
						rowId,
						rowToken,
						field: LOCALIZED_STRING_FIELDS.rowText,
					});
				return {
					...row,
					localizationRowToken: rowToken,
					textKey: rowTextKey,
					text: resolveLocalizedValueInternal({
						entry: byKey.get(rowTextKey),
						locale,
						defaultLocale,
						legacyValue: row?.text,
					}),
				};
			});
		}

		return { ...node, data: nextData };
	});
}

export function buildLocalizedEntriesFromNodes({
	projectId = '',
	dialogueId = '',
	dialogueSlug = '',
	nodes = [],
	locale = DEFAULT_LOCALE,
	existingEntries = [],
}) {
	return prepareLocalizedNodesAndEntries({
		projectId,
		dialogueId,
		dialogueSlug,
		nodes,
		locale,
		existingEntries,
	}).entries;
}

export function validateLocalizedEntriesForDialogue({
	nodes = [],
	entries = [],
	defaultLocale = DEFAULT_LOCALE,
}) {
	const errors = [];
	const byKey = new Map(
		(entries || [])
			.map((entry) => normalizeLocalizedStringEntry(entry))
			.filter((entry) => entry.key)
			.map((entry) => [entry.key, entry])
	);
	const requiredKeys = [];
	const seen = new Set();

	for (const node of nodes || []) {
		const nodeData = node?.data || {};
		if (nodeData.displayNameKey) requiredKeys.push(nodeData.displayNameKey);
		if (nodeData.selectionTitleKey) requiredKeys.push(nodeData.selectionTitleKey);
		if (Array.isArray(nodeData.dialogueRows)) {
			for (const row of nodeData.dialogueRows) {
				if (row?.textKey) requiredKeys.push(row.textKey);
			}
		}
	}

	for (const key of requiredKeys) {
		if (!key) {
			errors.push({ type: 'missing_key_ref' });
			continue;
		}
		if (!(READABLE_KEY_REGEX.test(key) || LEGACY_ROW_KEY_REGEX.test(key) || LEGACY_NODE_KEY_REGEX.test(key))) {
			errors.push({ type: 'invalid_key_format', key });
		}
		if (seen.has(key)) {
			errors.push({ type: 'duplicate_key_ref', key });
		}
		seen.add(key);

		const entry = byKey.get(key);
		if (!entry) {
			errors.push({ type: 'missing_entry', key });
			continue;
		}
		const normalizedDefault = normalizeLocaleTag(defaultLocale, DEFAULT_LOCALE);
		if (!Object.prototype.hasOwnProperty.call(entry.values || {}, normalizedDefault)) {
			errors.push({ type: 'missing_default_locale_value', key, locale: normalizedDefault });
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

export function buildStringTableV2Payload({
	dialogueId = '',
	defaultLocale = DEFAULT_LOCALE,
	locales = [],
	entries = [],
}) {
	const normalizedDefault = normalizeLocaleTag(defaultLocale, DEFAULT_LOCALE);
	const localeSet = new Set([normalizedDefault]);
	for (const locale of locales || []) {
		const normalized = normalizeLocaleTag(locale, '');
		if (normalized) localeSet.add(normalized);
	}

	const entryMap = {};
	for (const rawEntry of entries || []) {
		const entry = normalizeLocalizedStringEntry(rawEntry);
		if (!entry.key) continue;
		entryMap[entry.key] = { ...(entry.values || {}) };
		for (const locale of Object.keys(entryMap[entry.key])) {
			const normalized = normalizeLocaleTag(locale, '');
			if (normalized) localeSet.add(normalized);
		}
	}

	return {
		version: 2,
		format: 'stringTable.v2',
		dialogueId,
		defaultLocale: normalizedDefault,
		locales: Array.from(localeSet),
		entries: entryMap,
	};
}

export function parseImportedStringTableData(rawTable = null) {
	if (!rawTable) return [];
	if (Array.isArray(rawTable)) return rawTable;
	if (Array.isArray(rawTable?.entries)) return rawTable.entries;

	const rawEntries =
		rawTable?.entries && typeof rawTable.entries === 'object' ? rawTable.entries : null;
	if (!rawEntries) return [];

	const dialogueId = String(rawTable?.dialogueId || '').trim();
	const result = [];
	for (const [key, values] of Object.entries(rawEntries)) {
		result.push({
			key,
			dialogueId,
			values: values && typeof values === 'object' ? values : {},
		});
	}
	return result;
}

export function remapLocalizedEntriesForImportedDialogue({
	entries = [],
	newProjectId = '',
	newDialogueId = '',
	newDialogueSlug = '',
	nodeIdMap = new Map(),
	rowIdMap = new Map(),
}) {
	const now = new Date().toISOString();
	const safeProjectId = String(newProjectId || '').trim();
	const safeDialogueId = String(newDialogueId || '').trim();
	const safeDialogueSlug = slugifyForKeySegment(newDialogueSlug || '', '');
	const remapped = [];

	for (const rawEntry of entries || []) {
		const normalized = normalizeLocalizedStringEntry(rawEntry);
		const parsed = parseLocalizedStringKey(normalized.key);
		const source = parsed || normalized;
		const sourceField = source.field;
		if (!LOCALIZED_STRING_FIELD_VALUES.includes(sourceField)) continue;

		if (source?.keyType === 'readable' || parsed?.keyType === 'readable') {
			const dialogueSlug =
				normalized.dialogueSlug || source.dialogueSlug || safeDialogueSlug || 'dialogue';
			const nodeToken = normalized.nodeToken || source.nodeToken || '';
			const rowToken =
				sourceField === LOCALIZED_STRING_FIELDS.rowText
					? normalized.rowToken || source.rowToken || ''
					: '';
			remapped.push({
				projectId: safeProjectId,
				key: normalized.key,
				dialogueId: safeDialogueId,
				nodeId: String(normalized.nodeId || '').trim(),
				rowId: String(normalized.rowId || '').trim(),
				dialogueSlug,
				nodeToken,
				rowToken,
				field: sourceField,
				values: { ...(normalized.values || {}) },
				createdAt: now,
				modifiedAt: now,
			});
			continue;
		}

		const oldNodeId = String(source.nodeId || '').trim();
		const newNodeId = nodeIdMap.get(oldNodeId) || oldNodeId;
		if (!newNodeId) continue;

		let newRowId = '';
		if (sourceField === LOCALIZED_STRING_FIELDS.rowText) {
			const oldRowId = String(source.rowId || '').trim();
			const composite = `${oldNodeId}:${oldRowId}`;
			newRowId = rowIdMap.get(composite) || oldRowId;
			if (!newRowId) continue;
		}

		const key = buildLocalizedStringKey({
			dialogueId: safeDialogueId,
			nodeId: newNodeId,
			rowId: newRowId,
			field: sourceField,
		});
		if (!key) continue;

		remapped.push({
			projectId: safeProjectId,
			key,
			dialogueId: safeDialogueId,
			nodeId: newNodeId,
			rowId: newRowId,
			dialogueSlug: safeDialogueSlug,
			field: sourceField,
			values: { ...(normalized.values || {}) },
			createdAt: now,
			modifiedAt: now,
		});
	}

	return remapped;
}

export function filterLocalizedEntriesByDialogue(entries = [], dialogueId = '') {
	const safeDialogueId = String(dialogueId || '').trim();
	if (!safeDialogueId) return [];
	return (entries || []).filter(
		(entry) => String(entry?.dialogueId || '').trim() === safeDialogueId
	);
}

export { DEFAULT_LOCALE };
