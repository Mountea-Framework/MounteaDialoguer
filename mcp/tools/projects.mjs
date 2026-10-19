import { createProjectFile, listAllProjects, loadSnapshot, mutateProject, nowIso, ToolError, uuid } from '../lib/store.mjs';
import { cleanName } from '../lib/rules.mjs';
import { projectLocales, saveGraph, startNode, getDialogue, loadGraph, validateGraph, START_NODE_ID } from '../lib/graph.mjs';
import { allocateDialogueLocalizationSlug, isValidLocaleTag, normalizeLocaleTag, normalizeProjectLocalizationConfig } from '../../src/lib/localization/stringTable.js';
import { defineTool, str, arr, PROJECT, DIALOGUE } from './util.mjs';
import { assertUnreferenced } from '../../src/lib/domainIntegrity.js';

const summarizeNode = (node) => {
	const d = node.data || {};
	const out = { id: node.id, type: node.type, position: node.position && { x: Math.round(node.position.x), y: Math.round(node.position.y) } };
	if (d.displayName !== undefined) out.displayName = d.displayName;
	if (d.selectionTitle) out.selectionTitle = d.selectionTitle;
	if (d.participant) out.participant = d.participant;
	if (Array.isArray(d.dialogueRows) && d.dialogueRows.length) {
		out.rows = d.dialogueRows.map((r) => ({ id: r.id, text: r.text, duration: r.duration, hasAudio: Boolean(r.audioFile), executionBehaviour: r.executionBehaviour || 'automatic', durationMode: r.durationMode || 'duration', ...(r.durationOverride !== undefined ? { durationOverride: r.durationOverride } : {}) }));
	}
	if (d.decorators?.length) out.decorators = d.decorators.map((x) => ({ name: x.name, values: x.values }));
	if (d.targetNode) out.targetNode = d.targetNode;
	if (d.targetDialogue) out.targetDialogue = d.targetDialogue;
	if (d.duration !== undefined && node.type === 'delayNode') out.duration = d.duration;
	return out;
};
export const summarizeEdge = (edge) => ({
	source: edge.source,
	target: edge.target,
	conditions: (edge.data?.conditions?.rules || []).length
		? { mode: edge.data.conditions.mode, rules: edge.data.conditions.rules.map((r) => ({ name: r.name, values: r.values, negate: r.negate })) }
		: undefined,
});

function categoryTree(categories) {
	const build = (parentId) =>
		categories
			.filter((c) => (c.parentCategoryId || null) === parentId)
			.map((c) => ({ name: c.name, id: c.id, children: build(c.id) }));
	return build(null);
}

export const projectTools = [
	defineTool('delete_project', 'Delete a project by appending a deletion revision. All historical revisions and the last snapshot are retained.', { projectId: PROJECT }, ['projectId'], ({ projectId }) =>
		mutateProject(projectId, () => ({ deleted: true, id: projectId }), { operation: 'delete' })),
	defineTool('delete_dialogue', 'Delete a dialogue and its graph. References from other dialogues must be reassigned first. History is retained.', { projectId: PROJECT, dialogueId: DIALOGUE }, ['projectId', 'dialogueId'], ({ projectId, dialogueId }) =>
		mutateProject(projectId, (snapshot) => {
			const dialogue = getDialogue(snapshot, dialogueId);
			assertUnreferenced(snapshot, 'dialogues', dialogue);
			snapshot.dialogues = snapshot.dialogues.filter((record) => record.id !== dialogueId);
			for (const table of ['nodes', 'edges', 'localizedStrings']) snapshot[table] = snapshot[table].filter((record) => record.dialogueId !== dialogueId);
			return { deleted: true, id: dialogueId };
		})),
	defineTool('list_projects', 'List all projects (id, name, last modified).', {}, [], async () => ({
		projects: await listAllProjects(),
	})),

	defineTool('get_project', 'Overview of one project: settings, locales, dialogues, participants, category tree, decorator and condition definitions.', { projectId: PROJECT }, ['projectId'], async ({ projectId }) => {
		const s = await loadSnapshot(projectId);
		const locales = projectLocales(s);
		return {
			project: { id: s.project.id, name: s.project.name, description: s.project.description, version: s.project.version, modifiedAt: s.project.modifiedAt, ...locales },
			dialogues: s.dialogues.map((d) => ({ id: d.id, name: d.name, nodeCount: s.nodes.filter((n) => n.dialogueId === d.id).length })),
			participants: s.participants.map((p) => ({ id: p.id, name: p.name, category: p.category, hasThumbnail: Boolean(p.thumbnail) })),
			categories: categoryTree(s.categories),
			decorators: s.decorators.map((d) => ({ id: d.id, name: d.name, properties: d.properties })),
			conditions: s.conditions.map((c) => ({ id: c.id, name: c.name, properties: c.properties })),
		};
	}),

	defineTool(
		'create_project',
		'Create a project. The name is converted to PascalCase (spaces removed; letters and numbers only).',
		{ name: str('Project name'), description: str('Description'), defaultLocale: str('Default locale tag, e.g. "en" (default "en")'), supportedLocales: arr('Locale tags, must include the default', { type: 'string' }) },
		['name'],
		async ({ name, description, defaultLocale, supportedLocales }) => {
			const now = nowIso();
			const localization = normalizeProjectLocalizationConfig({ defaultLocale: defaultLocale || 'en', supportedLocales: supportedLocales || [defaultLocale || 'en'] });
			if (defaultLocale && !isValidLocaleTag(defaultLocale)) throw new ToolError(`Invalid locale tag "${defaultLocale}"`);
			const project = {
				id: uuid(),
				name: cleanName(name, 'Project'),
				description: description || '',
				version: '1.0.0',
				localization,
				isExample: false,
				createdAt: now,
				modifiedAt: now,
			};
			await createProjectFile({ version: 2, project, dialogues: [], participants: [], categories: [], decorators: [], conditions: [], localizedStrings: [], nodes: [], edges: [] });
			return { projectId: project.id, name: project.name, ...localization };
		}
	),

	defineTool(
		'update_project',
		'Change project name, description, version or locales. Adding locales is safe. Changing the default locale copies the old default text into the new default where it is missing. Removing a locale deletes its translations.',
		{ projectId: PROJECT, name: str('New name'), description: str('Description'), version: str('Version string'), defaultLocale: str('New default locale (must be supported)'), addLocales: arr('Locale tags to add', { type: 'string' }), removeLocales: arr('Locale tags to remove (not the default)', { type: 'string' }) },
		['projectId'],
		(args) =>
			mutateProject(args.projectId, (s) => {
				const p = s.project;
				if (args.name !== undefined) p.name = cleanName(args.name, 'Project');
				if (args.description !== undefined) p.description = args.description;
				if (args.version !== undefined) p.version = args.version;
				const current = projectLocales(s);
				let supported = [...current.supportedLocales];
				let def = current.defaultLocale;
				for (const tag of args.addLocales || []) {
					if (!isValidLocaleTag(tag)) throw new ToolError(`Invalid locale tag "${tag}"`);
					const n = normalizeLocaleTag(tag, '');
					if (!supported.includes(n)) supported.push(n);
				}
				if (args.defaultLocale) {
					if (!isValidLocaleTag(args.defaultLocale)) throw new ToolError(`Invalid locale tag "${args.defaultLocale}"`);
					def = normalizeLocaleTag(args.defaultLocale, def);
					if (!supported.includes(def)) supported.push(def);
				}
				for (const tag of args.removeLocales || []) {
					const n = normalizeLocaleTag(tag, '');
					if (n === def) throw new ToolError('Cannot remove the default locale');
					supported = supported.filter((l) => l !== n);
					for (const entry of s.localizedStrings) if (entry.values) delete entry.values[n];
				}
				if (def !== current.defaultLocale) {
					for (const entry of s.localizedStrings) {
						entry.values = entry.values || {};
						if (entry.values[def] === undefined || entry.values[def] === '') entry.values[def] = entry.values[current.defaultLocale] ?? '';
					}
				}
				p.localization = normalizeProjectLocalizationConfig({ defaultLocale: def, supportedLocales: supported });
				return { name: p.name, ...projectLocales(s) };
			})
	),

	defineTool('list_dialogues', 'List the dialogues of a project.', { projectId: PROJECT }, ['projectId'], async ({ projectId }) => {
		const s = await loadSnapshot(projectId);
		return {
			dialogues: s.dialogues.map((d) => ({ id: d.id, name: d.name, description: d.description, nodeCount: s.nodes.filter((n) => n.dialogueId === d.id).length, modifiedAt: d.modifiedAt })),
		};
	}),

	defineTool(
		'create_dialogue',
		'Create a dialogue (with its Start node). Name becomes PascalCase and must be unique in the project.',
		{ projectId: PROJECT, name: str('Dialogue name'), description: str('Description') },
		['projectId', 'name'],
		({ projectId, name, description }) =>
			mutateProject(projectId, (s) => {
				const clean = cleanName(name, 'Dialogue');
				if (s.dialogues.some((d) => d.name.toLowerCase() === clean.toLowerCase())) throw new ToolError(`A dialogue named "${clean}" already exists`);
				const now = nowIso();
				const dialogue = { id: uuid(), projectId, name: clean, description: description || '', localizationVersion: 2, createdAt: now, modifiedAt: now, viewport: { x: 540, y: 253, zoom: 1 } };
				dialogue.localizationSlug = allocateDialogueLocalizationSlug(dialogue, s.dialogues);
				s.dialogues.push(dialogue);
				saveGraph(s, dialogue.id, [startNode()], []);
				return { dialogueId: dialogue.id, name: clean, startNodeId: START_NODE_ID };
			})
	),

	defineTool(
		'update_dialogue',
		'Rename a dialogue or change its description. Localization keys stay stable on rename.',
		{ projectId: PROJECT, dialogueId: DIALOGUE, name: str('New name'), description: str('Description') },
		['projectId', 'dialogueId'],
		({ projectId, dialogueId, name, description }) =>
			mutateProject(projectId, (s) => {
				const d = getDialogue(s, dialogueId);
				if (name !== undefined) {
					const clean = cleanName(name, 'Dialogue');
					if (s.dialogues.some((x) => x.id !== d.id && x.name.toLowerCase() === clean.toLowerCase())) throw new ToolError(`A dialogue named "${clean}" already exists`);
					d.name = clean;
				}
				if (description !== undefined) d.description = description;
				d.modifiedAt = nowIso();
				return { name: d.name, description: d.description };
			})
	),

	defineTool(
		'get_dialogue',
		'Read a dialogue graph: nodes (text for the given locale) and edges. Use node ids from here in other tools.',
		{ projectId: PROJECT, dialogueId: DIALOGUE, locale: str('Locale tag; default is the project default (falls back to it for untranslated text)') },
		['projectId', 'dialogueId'],
		async ({ projectId, dialogueId, locale }) => {
			const s = await loadSnapshot(projectId);
			const g = loadGraph(s, dialogueId, locale);
			return { dialogue: { id: g.dialogue.id, name: g.dialogue.name, description: g.dialogue.description }, locale: locale || projectLocales(s).defaultLocale, nodes: g.nodes.map(summarizeNode), edges: g.edges.map(summarizeEdge) };
		}
	),

	defineTool('validate_dialogue', 'Check a dialogue: required fields, missing participants, bad targets, unreachable nodes, option labels. Does not change anything.', { projectId: PROJECT, dialogueId: DIALOGUE }, ['projectId', 'dialogueId'], async ({ projectId, dialogueId }) => validateGraph(await loadSnapshot(projectId), dialogueId)),
];
