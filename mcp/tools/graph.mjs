import { assertGraphNodesRemovable } from '../../src/lib/domainIntegrity.js';
import { loadSnapshot, mutateProject } from '../lib/backend.mjs';
import { ToolError, uuid } from '../lib/core.mjs';
import {
	CREATABLE_TYPES,
	NODE_DEFS,
	START_NODE_ID,
	assertEdgeAllowed,
	autoLayout,
	buildDecoratorInstances,
	defaultNode,
	getDialogue,
	loadGraph,
	makeEdge,
	projectLocales,
	saveGraph,
	validateGraph,
} from '../lib/graph.mjs';
import { filterLocalizedEntriesByDialogue, normalizeLocaleTag } from '../../src/lib/localization/stringTable.js';
import {
	DEFAULT_ROW_DURATION_MODE,
	DEFAULT_ROW_EXECUTION_BEHAVIOUR,
	ROW_DURATION_MODES,
	ROW_EXECUTION_BEHAVIOURS,
	isValidRowTiming,
} from '../../src/lib/rowTiming.js';
import { defineTool, str, bool, num, arr, obj, omit, PROJECT, DIALOGUE } from './util.mjs';

const ROW = {
	oneOf: [
		{ type: 'string' },
		{
			type: 'object',
			properties: {
				id: { type: 'string' },
				text: { type: 'string' },
				duration: { type: 'number', description: 'Seconds shown (default 3)' },
				executionBehaviour: { type: 'string', enum: ROW_EXECUTION_BEHAVIOURS, description: 'automatic (default) | awaitInput (click to continue) | stopping' },
				durationMode: { type: 'string', enum: ROW_DURATION_MODES, description: 'duration (default) | override | add | calculate' },
				durationOverride: { type: 'number', description: 'Seconds, used by durationMode override/add' },
			},
			required: ['text'],
		},
	],
};
const ROWS = { type: 'array', description: 'Dialogue rows (spoken lines): strings or {text, duration}. Replaces existing rows.', items: ROW };
const DECORATORS = arr('Decorator instances: names of defined decorators or {name, values}. Replaces existing.', { oneOf: [{ type: 'string' }, { type: 'object', properties: { name: { type: 'string' }, values: { type: 'object' } }, required: ['name'] }] });
const CONDITIONS = obj('Edge conditions: {mode:"all"|"any", rules:[names of defined conditions or {name, values, negate}]}');
const POSITION = obj('Canvas position {x, y}', { x: { type: 'number' }, y: { type: 'number' } });

const NODE_FIELDS = {
	displayName: str('Internal node name (max 64 chars). Exported as the display-name string; for player nodes the exporter swaps in selectionTitle.'),
	selectionTitle: str('Player nodes: the clickable option label shown to the player'),
	participant: str('Speaker: name of an existing participant (required for npc, player, complete)'),
	rows: ROWS,
	decorators: DECORATORS,
	targetNode: str('Return node: id of the node to return to'),
	targetDialogue: str('Open-child-graph node: dialogue id or name to open'),
	duration: num('Delay node: seconds (0.1-30)'),
	position: POSITION,
};

function normalizeRows(rows) {
	return rows.map((row) => {
		const r = typeof row === 'string' ? { text: row } : row;
		if (typeof r?.text !== 'string') throw new ToolError('Each row needs a "text" string');
		const out = { id: r.id || uuid(), text: r.text, duration: typeof r.duration === 'number' ? r.duration : 3.0, audioFile: null };
		// Optional timing (same fields and defaults as the editor); defaults are not stored.
		for (const [key, defaultValue] of [['executionBehaviour', DEFAULT_ROW_EXECUTION_BEHAVIOUR], ['durationMode', DEFAULT_ROW_DURATION_MODE], ['durationOverride', undefined]]) {
			if (r[key] !== undefined && r[key] !== defaultValue) out[key] = r[key];
		}
		if (!isValidRowTiming(out)) {
			throw new ToolError(`Invalid row timing. executionBehaviour: ${ROW_EXECUTION_BEHAVIOURS.join(' | ')}; durationMode: ${ROW_DURATION_MODES.join(' | ')}; durationOverride: seconds >= 0`);
		}
		return out;
	});
}

function resolveParticipant(s, name) {
	const hit = s.participants.find((p) => p.name.toLowerCase() === String(name).toLowerCase());
	if (!hit) throw new ToolError(`Participant "${name}" does not exist. Existing: ${s.participants.map((p) => p.name).join(', ') || '(none)'}. Use create_participant first.`);
	return hit;
}

function resolveDialogueRef(s, ref) {
	const hit = s.dialogues.find((d) => d.id === ref || d.name.toLowerCase() === String(ref).toLowerCase());
	if (!hit) throw new ToolError(`Dialogue "${ref}" not found. Existing: ${s.dialogues.map((d) => d.name).join(', ')}`);
	return hit.id;
}

/** Applies tool arguments onto a node (editor shape). `resolveNode` maps target references (aliases) to node ids. */
function applyFields(s, node, a, resolveNode = (x) => x) {
	const d = node.data;
	if (a.displayName !== undefined) {
		if (a.displayName.length > 64) throw new ToolError('displayName must be 64 characters or fewer');
		d.displayName = a.displayName;
	}
	if (a.selectionTitle !== undefined) d.selectionTitle = a.selectionTitle;
	if (a.participant !== undefined) {
		if (a.participant === '') {
			d.participant = '';
			delete d.participantId;
		} else {
			const speaker = resolveParticipant(s, a.participant);
			d.participant = speaker.name;
			d.participantId = speaker.id;
		}
	}
	if (a.rows !== undefined) d.dialogueRows = normalizeRows(a.rows);
	if (a.decorators !== undefined) d.decorators = buildDecoratorInstances(s, a.decorators);
	if (a.targetNode !== undefined) {
		if (node.type !== 'returnNode') throw new ToolError('targetNode only applies to return nodes');
		d.targetNode = a.targetNode ? resolveNode(a.targetNode) : '';
	}
	if (a.targetDialogue !== undefined) {
		if (node.type !== 'openChildGraphNode') throw new ToolError('targetDialogue only applies to openChildGraph nodes');
		d.targetDialogue = a.targetDialogue ? resolveDialogueRef(s, a.targetDialogue) : '';
	}
	if (a.duration !== undefined) {
		if (node.type !== 'delayNode') throw new ToolError('duration only applies to delay nodes');
		if (a.duration < 0.1 || a.duration > 30) throw new ToolError('duration must be between 0.1 and 30 seconds');
		d.duration = a.duration;
	}
	if (a.position) node.position = { x: Number(a.position.x) || 0, y: Number(a.position.y) || 0 };
	if (d.label !== undefined && a.displayName !== undefined && node.type !== 'startNode') d.label = a.displayName;
}

function makeNode(s, type, a, resolveNode) {
	if (!CREATABLE_TYPES.includes(type)) throw new ToolError(`Cannot create node type "${type}". Types: ${CREATABLE_TYPES.join(', ')}`);
	const node = { id: uuid(), type, position: { x: 0, y: 0 }, data: defaultNode(type) };
	applyFields(s, node, a, resolveNode);
	return node;
}

function nextPosition(nodes, edges, parentId) {
	const parent = nodes.find((n) => n.id === parentId);
	if (parent) {
		const siblings = edges.filter((e) => e.source === parentId).length;
		return { x: parent.position.x + siblings * 320, y: parent.position.y + 180 };
	}
	const maxY = Math.max(0, ...nodes.map((n) => n.position?.y ?? 0));
	return { x: 0, y: maxY + 180 };
}

function requiredWarnings(node) {
	const out = [];
	for (const section of NODE_DEFS[node.type]?.sections || []) {
		for (const f of section.fields || []) {
			if (f.required && !String(node.data[f.id] ?? '').trim()) out.push(`required field "${f.id}" is empty`);
		}
	}
	if (node.type === 'answerNode' && !String(node.data.selectionTitle || '').trim()) out.push('player node without selectionTitle (the option label)');
	return out;
}

const argsOf = (args) => omit(args, ['projectId', 'dialogueId']);

export const graphTools = [
	defineTool(
		'add_node',
		`Add a node to a dialogue. Types: ${CREATABLE_TYPES.join(', ')} (leadNode = NPC line, answerNode = player option, returnNode = jump back, openChildGraphNode, completeNode = end, delayNode). Optionally connect it from an existing node.`,
		{ projectId: PROJECT, dialogueId: DIALOGUE, type: str('Node type', { enum: CREATABLE_TYPES }), connectFrom: str('Node id (or "start") to connect this node from'), conditions: CONDITIONS, ...NODE_FIELDS },
		['projectId', 'dialogueId', 'type'],
		(args) =>
			mutateProject(args.projectId, (s) => {
				const { nodes, edges } = loadGraph(s, args.dialogueId);
				const node = makeNode(s, args.type, argsOf(args));
				const from = args.connectFrom === 'start' ? START_NODE_ID : args.connectFrom;
				if (!args.position) node.position = nextPosition(nodes, edges, from);
				nodes.push(node);
				if (from) {
					assertEdgeAllowed(nodes, edges, from, node.id);
					edges.push(makeEdge(from, node.id, s, args.conditions));
				}
				saveGraph(s, args.dialogueId, nodes, edges);
				return { nodeId: node.id, warnings: requiredWarnings(node) };
			})
	),

	defineTool(
		'update_node',
		'Change a node. Only the given fields change. rows replaces all rows. Pass an empty string to clear participant/selectionTitle/targets.',
		{ projectId: PROJECT, dialogueId: DIALOGUE, nodeId: str('Node id'), ...NODE_FIELDS },
		['projectId', 'dialogueId', 'nodeId'],
		(args) =>
			mutateProject(args.projectId, (s) => {
				const { nodes, edges } = loadGraph(s, args.dialogueId);
				const node = nodes.find((n) => n.id === args.nodeId);
				if (!node) throw new ToolError(`Node "${args.nodeId}" not found`, { code: 'NOT_FOUND', status: 404 });
				const fields = omit(args, ['projectId', 'dialogueId', 'nodeId']);
				if (node.type === 'startNode' && Object.keys(fields).some((k) => !['displayName', 'position'].includes(k))) {
					throw new ToolError('The Start node only supports displayName and position');
				}
				applyFields(s, node, fields, (id) => {
					if (!nodes.some((n) => n.id === id)) throw new ToolError(`Target node "${id}" not found`);
					return id;
				});
				saveGraph(s, args.dialogueId, nodes, edges);
				return { nodeId: node.id, warnings: requiredWarnings(node) };
			})
	),

	defineTool(
		'delete_node',
		'Delete a node and its connections. cascade=true also deletes everything reachable below it. The Start node cannot be deleted.',
		{ projectId: PROJECT, dialogueId: DIALOGUE, nodeId: str('Node id'), cascade: bool('Also delete all descendants') },
		['projectId', 'dialogueId', 'nodeId'],
		(args) =>
			mutateProject(args.projectId, (s) => {
				if (args.nodeId === START_NODE_ID) throw new ToolError('The Start node cannot be deleted');
				const g = loadGraph(s, args.dialogueId);
				if (!g.nodes.some((n) => n.id === args.nodeId)) throw new ToolError(`Node "${args.nodeId}" not found`, { code: 'NOT_FOUND', status: 404 });
				const doomed = new Set([args.nodeId]);
				if (args.cascade) {
					const queue = [args.nodeId];
					while (queue.length) {
						const id = queue.shift();
						for (const e of g.edges.filter((x) => x.source === id)) {
							if (e.target !== START_NODE_ID && !doomed.has(e.target)) {
								doomed.add(e.target);
								queue.push(e.target);
							}
						}
					}
				}
				const nodes = g.nodes.filter((n) => !doomed.has(n.id));
				assertGraphNodesRemovable(g.nodes, doomed);
				const edges = g.edges.filter((e) => !doomed.has(e.source) && !doomed.has(e.target));
				saveGraph(s, args.dialogueId, nodes, edges);
				return { deleted: [...doomed] };
			})
	),

	defineTool(
		'connect_nodes',
		'Connect two nodes. The Start node has exactly one output; return/openChildGraph/complete nodes have none.',
		{ projectId: PROJECT, dialogueId: DIALOGUE, source: str('Source node id (or "start")'), target: str('Target node id'), conditions: CONDITIONS },
		['projectId', 'dialogueId', 'source', 'target'],
		(args) =>
			mutateProject(args.projectId, (s) => {
				const { nodes, edges } = loadGraph(s, args.dialogueId);
				const source = args.source === 'start' ? START_NODE_ID : args.source;
				assertEdgeAllowed(nodes, edges, source, args.target);
				edges.push(makeEdge(source, args.target, s, args.conditions));
				saveGraph(s, args.dialogueId, nodes, edges);
				return { connected: `${source} -> ${args.target}` };
			})
	),

	defineTool(
		'update_edge',
		'Replace the conditions of a connection (pass empty rules to clear).',
		{ projectId: PROJECT, dialogueId: DIALOGUE, source: str('Source node id (or "start")'), target: str('Target node id'), conditions: CONDITIONS },
		['projectId', 'dialogueId', 'source', 'target', 'conditions'],
		(args) =>
			mutateProject(args.projectId, (s) => {
				const { nodes, edges } = loadGraph(s, args.dialogueId);
				const source = args.source === 'start' ? START_NODE_ID : args.source;
				const edge = edges.find((e) => e.source === source && e.target === args.target);
				if (!edge) throw new ToolError('No such connection', { code: 'NOT_FOUND', status: 404 });
				edge.data = makeEdge(source, args.target, s, args.conditions).data;
				saveGraph(s, args.dialogueId, nodes, edges);
				return { updated: `${source} -> ${args.target}`, rules: edge.data.conditions.rules.length };
			})
	),

	defineTool(
		'delete_edge',
		'Remove a connection between two nodes.',
		{ projectId: PROJECT, dialogueId: DIALOGUE, source: str('Source node id (or "start")'), target: str('Target node id') },
		['projectId', 'dialogueId', 'source', 'target'],
		(args) =>
			mutateProject(args.projectId, (s) => {
				const { nodes, edges } = loadGraph(s, args.dialogueId);
				const source = args.source === 'start' ? START_NODE_ID : args.source;
				const next = edges.filter((e) => !(e.source === source && e.target === args.target));
				if (next.length === edges.length) throw new ToolError('No such connection', { code: 'NOT_FOUND', status: 404 });
				saveGraph(s, args.dialogueId, nodes, next);
				return { removed: `${source} -> ${args.target}` };
			})
	),

	defineTool(
		'set_graph',
		'Build many nodes and connections in one call. Give each node a short "ref" alias and use refs (or "start", or existing node ids) in edges and targetNode. mode "replace" first removes every node except Start; "merge" adds to the existing graph. Returns the ref -> id map. Nodes are laid out automatically unless they have a position.',
		{
			projectId: PROJECT,
			dialogueId: DIALOGUE,
			mode: str('replace or merge (default merge)', { enum: ['replace', 'merge'] }),
			nodes: arr('Nodes to create', { type: 'object', properties: { ref: { type: 'string' }, type: { type: 'string', enum: CREATABLE_TYPES }, ...NODE_FIELDS }, required: ['ref', 'type'] }),
			edges: arr('Connections', { type: 'object', properties: { source: { type: 'string' }, target: { type: 'string' }, conditions: CONDITIONS }, required: ['source', 'target'] }),
			layout: bool('Auto layout new nodes without a position (default true)'),
		},
		['projectId', 'dialogueId'],
		(args) =>
			mutateProject(args.projectId, (s) => {
				const g = loadGraph(s, args.dialogueId);
				const replace = args.mode === 'replace';
				let nodes = replace ? g.nodes.filter((n) => n.id === START_NODE_ID) : g.nodes;
				let edges = replace ? [] : g.edges;
				const refs = new Map([['start', START_NODE_ID]]);
				const fresh = [];
				for (const spec of args.nodes || []) {
					if (!spec.ref || refs.has(spec.ref)) throw new ToolError(`Duplicate or missing node ref "${spec.ref}"`);
					const node = { id: uuid(), type: spec.type, position: { x: 0, y: 0 }, data: defaultNode(spec.type) };
					refs.set(spec.ref, node.id);
					fresh.push({ node, spec });
				}
				const resolve = (r) => {
					if (refs.has(r)) return refs.get(r);
					if (nodes.some((n) => n.id === r)) return r;
					throw new ToolError(`Unknown node reference "${r}"`);
				};
				for (const { node, spec } of fresh) {
					if (!CREATABLE_TYPES.includes(spec.type)) throw new ToolError(`Cannot create node type "${spec.type}"`);
					applyFields(s, node, omit(spec, ['ref', 'type']), resolve);
				}
				const base = nodes.length;
				nodes = nodes.concat(fresh.map((f) => f.node));
				for (const e of args.edges || []) {
					const source = resolve(e.source);
					const target = resolve(e.target);
					assertEdgeAllowed(nodes, edges, source, target);
					edges = edges.concat(makeEdge(source, target, s, e.conditions));
				}
				if (args.layout !== false) {
					const needs = fresh.filter((f) => !f.spec.position).map((f) => f.node);
					if (needs.length) {
						if (replace || base <= 1) autoLayout(nodes, edges);
						else {
							const sub = new Set(needs.map((n) => n.id));
							const existingMaxY = Math.max(0, ...nodes.filter((n) => !sub.has(n.id)).map((n) => n.position?.y ?? 0));
							const subNodes = [{ id: START_NODE_ID, position: { x: 0, y: 0 } }, ...needs];
							autoLayout(subNodes, edges.filter((e) => sub.has(e.target) || sub.has(e.source)).map((e) => ({ ...e, source: sub.has(e.source) ? e.source : START_NODE_ID })));
							for (const n of needs) n.position = { x: n.position.x, y: n.position.y + existingMaxY };
						}
					}
				}
				saveGraph(s, args.dialogueId, nodes, edges);
				const report = validateGraph(s, args.dialogueId);
				return { refs: Object.fromEntries([...refs].filter(([k]) => k !== 'start')), nodeCount: nodes.length, edgeCount: edges.length, errors: report.errors, warnings: report.warnings };
			})
	),

	defineTool(
		'clear_dialogue',
		'Remove all content of a dialogue (every node except Start, and all connections) but keep the dialogue itself. Backups are kept server-side.',
		{ projectId: PROJECT, dialogueId: DIALOGUE },
		['projectId', 'dialogueId'],
		({ projectId, dialogueId }) =>
			mutateProject(projectId, (s) => {
				const { nodes, edges } = loadGraph(s, dialogueId);
				saveGraph(s, dialogueId, nodes.filter((n) => n.id === START_NODE_ID), []);
				return { removedNodes: nodes.length - 1, removedEdges: edges.length };
			})
	),

	defineTool('auto_layout', 'Rearrange all nodes of a dialogue in a tidy layered layout.', { projectId: PROJECT, dialogueId: DIALOGUE }, ['projectId', 'dialogueId'], ({ projectId, dialogueId }) =>
		mutateProject(projectId, (s) => {
			const { nodes, edges } = loadGraph(s, dialogueId);
			autoLayout(nodes, edges);
			saveGraph(s, dialogueId, nodes, edges);
			return { nodeCount: nodes.length };
		})
	),

	defineTool(
		'set_text',
		'Set translated text (a non-default locale, or any locale) for nodes. Each item: nodeId, field (displayName | selectionTitle | rowText), rowIndex (for rowText, 0-based), text. The locale must be supported by the project (add it with update_project addLocales).',
		{ projectId: PROJECT, dialogueId: DIALOGUE, locale: str('Locale tag, e.g. "de"'), items: arr('Texts to set', { type: 'object', properties: { nodeId: { type: 'string' }, field: { type: 'string', enum: ['displayName', 'selectionTitle', 'rowText'] }, rowIndex: { type: 'number' }, text: { type: 'string' } }, required: ['nodeId', 'field', 'text'] }) },
		['projectId', 'dialogueId', 'locale', 'items'],
		(args) =>
			mutateProject(args.projectId, (s) => {
				getDialogue(s, args.dialogueId);
				const locale = normalizeLocaleTag(args.locale, '');
				const { supportedLocales } = projectLocales(s);
				if (!locale || !supportedLocales.includes(locale)) throw new ToolError(`Locale "${args.locale}" is not enabled. Enabled: ${supportedLocales.join(', ')}. Add it with update_project addLocales.`);
				let count = 0;
				for (const item of args.items) {
					const node = s.nodes.find((n) => n.dialogueId === args.dialogueId && n.id === item.nodeId);
					if (!node) throw new ToolError(`Node "${item.nodeId}" not found`);
					const key =
						item.field === 'displayName'
							? node.data?.displayNameKey
							: item.field === 'selectionTitle'
								? node.data?.selectionTitleKey
								: node.data?.dialogueRows?.[item.rowIndex ?? 0]?.textKey;
					const entry = key && s.localizedStrings.find((e) => e.key === key && e.dialogueId === args.dialogueId);
					if (!entry) throw new ToolError(`Node ${item.nodeId} has no ${item.field}${item.field === 'rowText' ? ` row ${item.rowIndex ?? 0}` : ''} to translate`);
					entry.values = { ...(entry.values || {}), [locale]: item.text };
					entry.modifiedAt = new Date().toISOString();
					count += 1;
				}
				getDialogue(s, args.dialogueId).modifiedAt = new Date().toISOString();
				return { updated: count, locale };
			})
	),

	defineTool(
		'list_missing_translations',
		'List texts that have no value in the given locale.',
		{ projectId: PROJECT, dialogueId: str('Limit to one dialogue (optional)'), locale: str('Locale tag') },
		['projectId', 'locale'],
		async (args) => {
			const s = await loadSnapshot(args.projectId);
			const locale = normalizeLocaleTag(args.locale, '');
			const entries = args.dialogueId ? filterLocalizedEntriesByDialogue(s.localizedStrings, args.dialogueId) : s.localizedStrings;
			const base = projectLocales(s).defaultLocale;
			const missing = entries
				.filter((e) => (e.values?.[base] ?? '') !== '' && !(e.values?.[locale] ?? ''))
				.map((e) => ({ dialogueId: e.dialogueId, nodeId: e.nodeId, field: e.field, rowId: e.rowId || undefined, source: e.values[base] }));
			return { locale, count: missing.length, missing: missing.slice(0, 200) };
		}
	),
];
