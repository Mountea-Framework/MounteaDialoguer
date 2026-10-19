// Dialogue graph load/save/validate. Mirrors saveDialogueGraph / loadDialogueGraph in the app, but on a snapshot object.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
	DEFAULT_LOCALE,
	allocateDialogueLocalizationSlug,
	ensureDialogueLocalizationSlug,
	filterLocalizedEntriesByDialogue,
	materializeLocalizedNodes,
	normalizeLocaleTag,
	normalizeProjectLocalizationConfig,
	prepareLocalizedNodesAndEntries,
	validateLocalizedEntriesForDialogue,
} from '../../src/lib/localization/stringTable.js';
import { createConditionInstance, getConditionDefaultValues } from '../../src/config/edgeConditions.js';
import { ToolError, uuid } from './store.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const NODE_DEFS = JSON.parse(fs.readFileSync(path.join(here, '../../src/config/dialogueNodes.json'), 'utf8'));
export const START_NODE_ID = '00000000-0000-0000-0000-000000000001';
export const CREATABLE_TYPES = Object.values(NODE_DEFS).filter((d) => d.creatable).map((d) => d.type);

export function projectLocales(snapshot) {
	const loc = normalizeProjectLocalizationConfig(snapshot.project?.localization || {});
	return { defaultLocale: loc.defaultLocale || DEFAULT_LOCALE, supportedLocales: loc.supportedLocales };
}

export function getDialogue(snapshot, dialogueId) {
	const dialogue = snapshot.dialogues.find((d) => d.id === dialogueId);
	if (!dialogue) {
		throw new ToolError(`Dialogue "${dialogueId}" not found in this project. Use list_dialogues.`);
	}
	return dialogue;
}

export function defaultNode(type) {
	const def = NODE_DEFS[type];
	if (!def) throw new ToolError(`Unknown node type "${type}". Types: ${Object.keys(NODE_DEFS).join(', ')}`);
	return JSON.parse(JSON.stringify(def.defaultData || {}));
}

export function startNode() {
	return {
		id: START_NODE_ID,
		type: 'startNode',
		position: { x: 0, y: 0 },
		deletable: false,
		data: defaultNode('startNode'),
	};
}

const normalizeRow = (row = {}) => ({
	...row,
	id: row.id || uuid(),
	text: row.text ?? '',
	duration: typeof row.duration === 'number' ? row.duration : 3.0,
	audioFile: row.audioFile || null,
});

/** Nodes and edges of a dialogue in "editor shape" (text materialised for `locale`). */
export function loadGraph(snapshot, dialogueId, locale) {
	const dialogue = getDialogue(snapshot, dialogueId);
	const { defaultLocale } = projectLocales(snapshot);
	const entries = filterLocalizedEntriesByDialogue(snapshot.localizedStrings, dialogueId);
	const stored = snapshot.nodes.filter((n) => n.dialogueId === dialogueId);
	const base = stored.some((n) => n.id === START_NODE_ID) ? stored : [{ ...startNode(), dialogueId }, ...stored];
	const nodes = materializeLocalizedNodes({
		nodes: base,
		dialogueId,
		dialogueSlug: ensureDialogueLocalizationSlug(dialogue),
		locale: normalizeLocaleTag(locale, defaultLocale),
		defaultLocale,
		stringEntries: entries,
	}).map((node) => ({
		...node,
		data: {
			...node.data,
			dialogueRows: Array.isArray(node.data?.dialogueRows) ? node.data.dialogueRows.map(normalizeRow) : node.data?.dialogueRows,
		},
	}));
	const edges = snapshot.edges.filter((e) => e.dialogueId === dialogueId).map((e) => ({ ...e }));
	return { dialogue, nodes, edges };
}

function stripLocalizedText(data = {}) {
	const next = { ...data };
	if (next.displayNameKey) delete next.displayName;
	if (next.selectionTitleKey) delete next.selectionTitle;
	if (Array.isArray(next.dialogueRows)) {
		next.dialogueRows = next.dialogueRows.map((row) => {
			const r = { ...row };
			if (r.textKey) delete r.text;
			return r;
		});
	}
	return next;
}

/** Replaces the dialogue's nodes, edges and localized strings. Writes text into `locale` (default locale unless told otherwise). */
export function saveGraph(snapshot, dialogueId, nodes, edges, locale) {
	const dialogue = getDialogue(snapshot, dialogueId);
	const { defaultLocale } = projectLocales(snapshot);
	const activeLocale = normalizeLocaleTag(locale, defaultLocale);
	const slug = allocateDialogueLocalizationSlug(dialogue, snapshot.dialogues);
	dialogue.localizationSlug = slug;
	const existing = filterLocalizedEntriesByDialogue(snapshot.localizedStrings, dialogueId);

	const prepared = prepareLocalizedNodesAndEntries({
		projectId: snapshot.project.id,
		dialogueId,
		dialogueSlug: slug,
		nodes: nodes.map((n) => ({
			...n,
			data: { ...n.data, dialogueRows: Array.isArray(n.data?.dialogueRows) ? n.data.dialogueRows.map(normalizeRow) : n.data?.dialogueRows },
		})),
		locale: activeLocale,
		existingEntries: existing,
	});
	if (prepared.diagnostics.some((d) => d.type === 'duplicate_key')) {
		throw new ToolError('Localization key collision: two nodes or rows produce the same key. Give them different display names.');
	}
	const validation = validateLocalizedEntriesForDialogue({
		nodes: prepared.nodes,
		entries: prepared.entries,
		defaultLocale,
		projectId: snapshot.project.id,
		dialogueId,
		dialogueSlug: slug,
		projectEntries: snapshot.localizedStrings,
	});
	if (!validation.valid) {
		const first = validation.errors.slice(0, 3).map((e) => `${e.type}${e.key ? ` (${e.key})` : ''}`).join(', ');
		throw new ToolError(`Localization validation failed: ${first}`);
	}

	snapshot.localizedStrings = snapshot.localizedStrings.filter((e) => e.dialogueId !== dialogueId).concat(prepared.entries);
	snapshot.nodes = snapshot.nodes
		.filter((n) => n.dialogueId !== dialogueId)
		.concat(prepared.nodes.map((n) => ({ ...n, dialogueId, data: stripLocalizedText(n.data) })));
	snapshot.edges = snapshot.edges.filter((e) => e.dialogueId !== dialogueId).concat(edges.map((e) => ({ ...e, dialogueId })));
	dialogue.localizationVersion = 2;
	dialogue.modifiedAt = new Date().toISOString();
}

// ---------- decorators / conditions ----------

export function buildDecoratorInstances(snapshot, list = []) {
	return list.map((item) => {
		const name = typeof item === 'string' ? item : item?.name;
		const def = snapshot.decorators.find((d) => d.name.toLowerCase() === String(name || '').toLowerCase());
		if (!def) {
			throw new ToolError(`Decorator "${name}" is not defined. Defined: ${snapshot.decorators.map((d) => d.name).join(', ') || '(none)'}. Use create_decorator first.`);
		}
		const values = { ...getConditionDefaultValues(def), ...(item?.values || {}) };
		for (const key of Object.keys(values)) {
			if (!(def.properties || []).some((p) => p.name === key)) throw new ToolError(`Decorator "${def.name}" has no property "${key}"`);
		}
		return { id: def.id, name: def.name, values };
	});
}

export function buildConditionInstances(snapshot, list = []) {
	return list.map((item) => {
		const name = typeof item === 'string' ? item : item?.name;
		const def = snapshot.conditions.find((c) => c.name.toLowerCase() === String(name || '').toLowerCase());
		if (!def) {
			throw new ToolError(`Condition "${name}" is not defined. Defined: ${snapshot.conditions.map((c) => c.name).join(', ') || '(none)'}. Use create_condition first.`);
		}
		const instance = createConditionInstance(def);
		instance.values = { ...instance.values, ...(item?.values || {}) };
		instance.negate = Boolean(item?.negate);
		for (const key of Object.keys(instance.values)) {
			if (!(def.properties || []).some((p) => p.name === key)) throw new ToolError(`Condition "${def.name}" has no property "${key}"`);
		}
		return instance;
	});
}

export function makeEdge(source, target, snapshot, conditions) {
	return {
		id: `${source}-${target}`,
		source,
		target,
		type: 'conditionEdge',
		markerEnd: { type: 'arrowclosed' },
		data: {
			conditions: {
				mode: conditions?.mode === 'any' ? 'any' : 'all',
				rules: buildConditionInstances(snapshot, conditions?.rules || []),
			},
		},
	};
}

// ---------- structural rules ----------

/** Hard rules the editor enforces while connecting. Throws ToolError. */
export function assertEdgeAllowed(nodes, edges, source, target) {
	const from = nodes.find((n) => n.id === source);
	const to = nodes.find((n) => n.id === target);
	if (!from) throw new ToolError(`Source node "${source}" does not exist`);
	if (!to) throw new ToolError(`Target node "${target}" does not exist`);
	if (target === START_NODE_ID) throw new ToolError('Nothing can connect to the Start node');
	if (source === target) throw new ToolError('A node cannot connect to itself');
	if (NODE_DEFS[from.type]?.canHaveOutputs === false) {
		throw new ToolError(`${NODE_DEFS[from.type].label} nodes (${from.type}) cannot have outgoing connections`);
	}
	if (edges.some((e) => e.source === source && e.target === target)) throw new ToolError('These nodes are already connected');
	if (source === START_NODE_ID && edges.some((e) => e.source === START_NODE_ID)) {
		throw new ToolError('The Start node can only have one outgoing connection');
	}
}

// ---------- validation report (does not block saving, like the editor) ----------

export function validateGraph(snapshot, dialogueId) {
	const { nodes, edges } = loadGraph(snapshot, dialogueId);
	const errors = [];
	const warnings = [];
	const ids = new Set(nodes.map((n) => n.id));
	const participantNames = new Set(snapshot.participants.map((p) => p.name));

	if (!ids.has(START_NODE_ID)) errors.push('Start node is missing');
	for (const node of nodes) {
		const def = NODE_DEFS[node.type];
		if (!def) {
			errors.push(`${node.id}: unknown node type ${node.type}`);
			continue;
		}
		for (const section of def.sections || []) {
			for (const field of section.fields || []) {
				if (!field.required) continue;
				const value = node.data?.[field.id];
				if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
					errors.push(`${node.id} (${def.label} "${node.data?.displayName || ''}"): required field "${field.id}" is empty`);
				}
			}
		}
		if (node.data?.participant && !participantNames.has(node.data.participant)) {
			warnings.push(`${node.id}: participant "${node.data.participant}" does not exist in this project`);
		}
		if (node.type === 'returnNode' && node.data?.targetNode && !ids.has(node.data.targetNode)) {
			errors.push(`${node.id}: return target "${node.data.targetNode}" does not exist`);
		}
		if (node.type === 'openChildGraphNode' && node.data?.targetDialogue && !snapshot.dialogues.some((d) => d.id === node.data.targetDialogue)) {
			errors.push(`${node.id}: child dialogue "${node.data.targetDialogue}" does not exist`);
		}
		if (node.type === 'answerNode' && !String(node.data?.selectionTitle || '').trim()) {
			warnings.push(`${node.id}: player node has no selectionTitle (the clickable option label)`);
		}
		for (const dec of node.data?.decorators || []) {
			if (!snapshot.decorators.some((d) => d.id === dec.id)) warnings.push(`${node.id}: decorator "${dec.name}" is no longer defined`);
		}
	}
	for (const edge of edges) {
		if (!ids.has(edge.source) || !ids.has(edge.target)) errors.push(`edge ${edge.id}: endpoint missing`);
	}
	const startOut = edges.filter((e) => e.source === START_NODE_ID).length;
	if (startOut === 0) warnings.push('Start node has no outgoing connection');
	const seen = new Set([START_NODE_ID]);
	const queue = [START_NODE_ID];
	while (queue.length) {
		const id = queue.shift();
		for (const e of edges.filter((x) => x.source === id)) {
			if (!seen.has(e.target)) {
				seen.add(e.target);
				queue.push(e.target);
			}
		}
		const node = nodes.find((n) => n.id === id);
		if (node?.type === 'returnNode' && node.data?.targetNode && !seen.has(node.data.targetNode)) {
			seen.add(node.data.targetNode);
			queue.push(node.data.targetNode);
		}
	}
	for (const node of nodes) if (!seen.has(node.id)) warnings.push(`${node.id} ("${node.data?.displayName || node.type}") is not reachable from Start`);
	return { valid: errors.length === 0, errors, warnings, nodeCount: nodes.length, edgeCount: edges.length };
}

// ---------- layout (simple layered layout, left to right is not used by the editor: top to bottom) ----------

export function autoLayout(nodes, edges, { xGap = 320, yGap = 180 } = {}) {
	const children = new Map();
	for (const e of edges) {
		if (!children.has(e.source)) children.set(e.source, []);
		children.get(e.source).push(e.target);
	}
	const level = new Map([[START_NODE_ID, 0]]);
	const queue = [START_NODE_ID];
	while (queue.length) {
		const id = queue.shift();
		for (const t of children.get(id) || []) {
			if (!level.has(t)) {
				level.set(t, level.get(id) + 1);
				queue.push(t);
			}
		}
	}
	let maxLevel = Math.max(0, ...level.values());
	for (const n of nodes) if (!level.has(n.id)) level.set(n.id, ++maxLevel);
	const rows = new Map();
	for (const n of nodes) {
		const l = level.get(n.id);
		if (!rows.has(l)) rows.set(l, []);
		rows.get(l).push(n);
	}
	for (const [l, list] of rows) {
		list.forEach((n, i) => {
			n.position = { x: (i - (list.length - 1) / 2) * xGap, y: l * yGap };
		});
	}
}
