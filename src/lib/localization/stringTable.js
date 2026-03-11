const DEFAULT_LOCALE = 'en';

export const LOCALIZED_STRING_FIELDS = Object.freeze({
	displayName: 'displayName',
	selectionTitle: 'selectionTitle',
	rowText: 'rowText',
});

const LOCALIZED_STRING_FIELD_VALUES = Object.freeze(
	Object.values(LOCALIZED_STRING_FIELDS)
);

function toStringSafe(value) {
	if (value === null || value === undefined) return '';
	return String(value);
}

export function isValidLocaleTag(value) {
	const raw = String(value || '').trim();
	if (!raw) return false;
	try {
		// Intl.Locale provides strict BCP-47 validation in modern runtimes.
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
		enabled: Boolean(rawConfig?.enabled),
		defaultLocale: rawDefault,
		supportedLocales: supported.length > 0 ? supported : [rawDefault],
	};
}

export function isProjectLocalizationEnabled(project = null) {
	const cfg = normalizeProjectLocalizationConfig(project?.localization || {});
	return Boolean(cfg.enabled);
}

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

	const rowMatch = raw.match(/^dlg\.([^.]+)\.node\.([^.]+)\.row\.([^.]+)\.text$/);
	if (rowMatch) {
		return {
			dialogueId: rowMatch[1],
			nodeId: rowMatch[2],
			rowId: rowMatch[3],
			field: LOCALIZED_STRING_FIELDS.rowText,
		};
	}

	const nodeMatch = raw.match(/^dlg\.([^.]+)\.node\.([^.]+)\.(displayName|selectionTitle)$/);
	if (nodeMatch) {
		return {
			dialogueId: nodeMatch[1],
			nodeId: nodeMatch[2],
			rowId: '',
			field: nodeMatch[3],
		};
	}

	return null;
}

export function normalizeLocalizedStringEntry(rawEntry = {}) {
	const parsed = parseLocalizedStringKey(rawEntry?.key);
	const field = LOCALIZED_STRING_FIELD_VALUES.includes(rawEntry?.field)
		? rawEntry.field
		: parsed?.field || '';
	const dialogueId = String(rawEntry?.dialogueId || parsed?.dialogueId || '').trim();
	const nodeId = String(rawEntry?.nodeId || parsed?.nodeId || '').trim();
	const rowId = String(rawEntry?.rowId || parsed?.rowId || '').trim();
	const key =
		String(rawEntry?.key || '').trim() ||
		buildLocalizedStringKey({ dialogueId, nodeId, rowId, field });
	const values = {};
	const rawValues = rawEntry?.values && typeof rawEntry.values === 'object' ? rawEntry.values : {};

	for (const [locale, value] of Object.entries(rawValues)) {
		const normalizedLocale = normalizeLocaleTag(locale, '');
		if (!normalizedLocale) continue;
		values[normalizedLocale] = toStringSafe(value);
	}

	return {
		projectId: String(rawEntry?.projectId || '').trim(),
		key,
		dialogueId,
		nodeId,
		rowId,
		field,
		values,
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

export function materializeLocalizedNodes({
	nodes = [],
	dialogueId = '',
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

	return (nodes || []).map((node) => {
		const nextData = { ...(node?.data || {}) };
		const nodeId = String(node?.id || '').trim();
		if (!nodeId) return { ...node, data: nextData };

		const displayNameKey = buildLocalizedStringKey({
			dialogueId: safeDialogueId,
			nodeId,
			field: LOCALIZED_STRING_FIELDS.displayName,
		});
		const selectionTitleKey = buildLocalizedStringKey({
			dialogueId: safeDialogueId,
			nodeId,
			field: LOCALIZED_STRING_FIELDS.selectionTitle,
		});

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
			nextData.dialogueRows = nextData.dialogueRows.map((row) => {
				const rowId = String(row?.id || '').trim();
				if (!rowId) return row;
				const rowKey = buildLocalizedStringKey({
					dialogueId: safeDialogueId,
					nodeId,
					rowId,
					field: LOCALIZED_STRING_FIELDS.rowText,
				});
				return {
					...row,
					text: resolveLocalizedValueInternal({
						entry: byKey.get(rowKey),
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
	nodes = [],
	locale = DEFAULT_LOCALE,
	existingEntries = [],
}) {
	const normalizedLocale = normalizeLocaleTag(locale, DEFAULT_LOCALE);
	const existingByKey = new Map(
		(existingEntries || [])
			.map((entry) => normalizeLocalizedStringEntry(entry))
			.filter((entry) => entry.key)
			.map((entry) => [entry.key, entry])
	);
	const now = new Date().toISOString();
	const safeProjectId = String(projectId || '').trim();
	const safeDialogueId = String(dialogueId || '').trim();
	const next = [];

	for (const node of nodes || []) {
		const nodeId = String(node?.id || '').trim();
		if (!nodeId) continue;
		const nodeData = node?.data || {};
		const localizableFields = [];
		if (Object.prototype.hasOwnProperty.call(nodeData, 'displayName')) {
			localizableFields.push({
				field: LOCALIZED_STRING_FIELDS.displayName,
				value: toStringSafe(nodeData.displayName),
			});
		}
		if (Object.prototype.hasOwnProperty.call(nodeData, 'selectionTitle')) {
			localizableFields.push({
				field: LOCALIZED_STRING_FIELDS.selectionTitle,
				value: toStringSafe(nodeData.selectionTitle),
			});
		}

		for (const item of localizableFields) {
			const key = buildLocalizedStringKey({
				dialogueId: safeDialogueId,
				nodeId,
				field: item.field,
			});
			if (!key) continue;
			const existing = existingByKey.get(key);
			next.push({
				projectId: safeProjectId,
				key,
				dialogueId: safeDialogueId,
				nodeId,
				rowId: '',
				field: item.field,
				values: {
					...(existing?.values || {}),
					[normalizedLocale]: item.value,
				},
				createdAt: existing?.createdAt || now,
				modifiedAt: now,
			});
		}

		if (Array.isArray(nodeData.dialogueRows)) {
			for (const row of nodeData.dialogueRows) {
				const rowId = String(row?.id || '').trim();
				if (!rowId) continue;
				const key = buildLocalizedStringKey({
					dialogueId: safeDialogueId,
					nodeId,
					rowId,
					field: LOCALIZED_STRING_FIELDS.rowText,
				});
				if (!key) continue;
				const existing = existingByKey.get(key);
				next.push({
					projectId: safeProjectId,
					key,
					dialogueId: safeDialogueId,
					nodeId,
					rowId,
					field: LOCALIZED_STRING_FIELDS.rowText,
					values: {
						...(existing?.values || {}),
						[normalizedLocale]: toStringSafe(row?.text),
					},
					createdAt: existing?.createdAt || now,
					modifiedAt: now,
				});
			}
		}
	}

	return next;
}

export function remapLocalizedEntriesForImportedDialogue({
	entries = [],
	newProjectId = '',
	newDialogueId = '',
	nodeIdMap = new Map(),
	rowIdMap = new Map(),
}) {
	const now = new Date().toISOString();
	const safeProjectId = String(newProjectId || '').trim();
	const safeDialogueId = String(newDialogueId || '').trim();
	const remapped = [];

	for (const rawEntry of entries || []) {
		const normalized = normalizeLocalizedStringEntry(rawEntry);
		const parsed = parseLocalizedStringKey(normalized.key);
		const source = parsed || normalized;
		const sourceField = source.field;
		if (!LOCALIZED_STRING_FIELD_VALUES.includes(sourceField)) continue;

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
