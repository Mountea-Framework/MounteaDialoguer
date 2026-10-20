import { loadSnapshot, mutateProject } from '../lib/backend.mjs';
import { nowIso, ToolError, uuid } from '../lib/core.mjs';
import { cleanName } from '../lib/rules.mjs';
import { normalizePropertyDefault, normalizePropertyType, assertCompatibleDefinition, assertUnreferenced } from '../../src/lib/domainIntegrity.js';
import { defineTool, str, bool, arr, PROJECT } from './util.mjs';

// The Unreal importer only supports string, number and boolean. int/float/bool are accepted as aliases.
const PROPERTY_TYPES = ['string', 'number', 'boolean', 'int', 'float', 'bool'];
const PROPERTIES = arr('Properties: [{name, type: string|number|boolean, defaultValue}]', {
	type: 'object',
	properties: { name: { type: 'string' }, type: { type: 'string', enum: PROPERTY_TYPES }, defaultValue: {} },
	required: ['name', 'type'],
});

function cleanProperties(list = []) {
	const seen = new Set();
	return list.map((p) => {
		const name = String(p.name || '').trim();
		if (!name) throw new ToolError('Every property needs a name');
		if (seen.has(name.toLowerCase())) throw new ToolError(`Duplicate property "${name}"`);
		seen.add(name.toLowerCase());
		if (!PROPERTY_TYPES.includes(p.type)) throw new ToolError(`Property "${name}": type must be one of ${PROPERTY_TYPES.join(', ')}`);
		const type = normalizePropertyType(p.type);
		const defaultValue = normalizePropertyDefault(type, p.defaultValue === undefined ? (type === 'string' ? '' : type === 'number' ? 0 : false) : p.defaultValue);
		if (typeof defaultValue !== type) throw new ToolError(`Property "${name}": default must be a ${type}`);
		return { name, type, defaultValue };
	});
}

/** Decorators and conditions are the same kind of definition; they differ in where their instances live. */
function makeDefTools({ kind, plural, collection, usage, rename }) {
	const Cap = kind[0].toUpperCase() + kind.slice(1);
	const find = (s, ref) => {
		const hit = s[collection].find((d) => d.id === ref || d.name.toLowerCase() === String(ref).toLowerCase());
		if (!hit) throw new ToolError(`${Cap} "${ref}" not found. Existing: ${s[collection].map((d) => d.name).join(', ') || '(none)'}`, { code: 'NOT_FOUND', status: 404 });
		return hit;
	};
	return [
		defineTool(`list_${plural}`, `List ${kind} definitions with their properties.`, { projectId: PROJECT }, ['projectId'], async ({ projectId }) => {
			const s = await loadSnapshot(projectId);
			return { [plural]: s[collection].map((d) => ({ id: d.id, name: d.name, type: d.type, properties: d.properties, usedBy: usage(s, d) })) };
		}),
		defineTool(
			`create_${kind}`,
			`Create a ${kind} definition. Name: PascalCase, letters/numbers/_/-. Properties have a type (string, number or boolean) and a default.`,
			{ projectId: PROJECT, name: str(`${Cap} name`), type: str('Optional free-text type/category'), properties: PROPERTIES },
			['projectId', 'name'],
			(args) =>
				mutateProject(args.projectId, (s) => {
					const name = cleanName(args.name, Cap);
					if (s[collection].some((d) => d.name.toLowerCase() === name.toLowerCase())) throw new ToolError(`A ${kind} named "${name}" already exists`);
					const now = nowIso();
					const def = { id: uuid(), projectId: args.projectId, name, type: args.type || '', properties: cleanProperties(args.properties), createdAt: now, modifiedAt: now };
					s[collection].push(def);
					return { [`${kind}Id`]: def.id, name };
				})
		),
		defineTool(
			`update_${kind}`,
			`Change a ${kind} definition (rename, type, properties). A rename updates existing instances; changed properties do not migrate existing values.`,
			{ projectId: PROJECT, [kind]: str(`${Cap} name or id`), name: str('New name'), type: str('Type'), properties: PROPERTIES },
			['projectId', kind],
			(args) =>
				mutateProject(args.projectId, (s) => {
					const previous = find(s, args[kind]);
					const def = structuredClone(previous);
					if (args.name !== undefined) {
						const name = cleanName(args.name, Cap);
						if (s[collection].some((d) => d.id !== def.id && d.name.toLowerCase() === name.toLowerCase())) throw new ToolError(`A ${kind} named "${name}" already exists`);
						def.name = name;
					}
					if (args.type !== undefined) def.type = args.type;
					if (args.properties !== undefined) def.properties = cleanProperties(args.properties);
					assertCompatibleDefinition(s, collection, previous, def);
					if (def.name !== previous.name) rename(s, previous, def.name);
					def.modifiedAt = nowIso();
					s[collection] = s[collection].map((record) => record.id === def.id ? def : record);
					return { name: def.name, properties: def.properties };
				})
		),
		defineTool(
			`delete_${kind}`,
			`Delete a ${kind} definition. References must be removed or reassigned first; force does not bypass this safeguard.`,
			{ projectId: PROJECT, [kind]: str(`${Cap} name or id`), force: bool('Compatibility argument; referenced records cannot be deleted') },
			['projectId', kind],
			(args) =>
				mutateProject(args.projectId, (s) => {
					const def = find(s, args[kind]);
					const used = usage(s, def);
					assertUnreferenced(s, collection, def);
					s[collection] = s[collection].filter((d) => d.id !== def.id);
					return { deleted: def.name, stillReferenced: used };
				})
		),
	];
}

export const defTools = [
	...makeDefTools({
		kind: 'decorator',
		plural: 'decorators',
		collection: 'decorators',
		usage: (s, def) => s.nodes.reduce((n, node) => n + (node.data?.decorators || []).filter((i) => i.id === def.id).length, 0),
		rename: (s, def, name) => {
			for (const node of s.nodes) for (const i of node.data?.decorators || []) if (i.id === def.id) i.name = name;
		},
	}),
	...makeDefTools({
		kind: 'condition',
		plural: 'conditions',
		collection: 'conditions',
		usage: (s, def) => s.edges.reduce((n, edge) => n + (edge.data?.conditions?.rules || []).filter((r) => r.id === def.id).length, 0),
		rename: (s, def, name) => {
			for (const edge of s.edges) for (const r of edge.data?.conditions?.rules || []) if (r.id === def.id) r.name = name;
		},
	}),
];
