import { loadSnapshot } from './lib/backend.mjs';
import { ToolError } from './lib/core.mjs';

const families = { dialogues: 'dialogue', participants: 'participant', categories: 'category', decorators: 'decorator', conditions: 'condition' };
const missing = () => new ToolError('Resource not found', { code: 'NOT_FOUND', status: 404 });

export function resolveRestRoute(pathname) {
	let parts;
	try { parts = pathname.replace(/\/$/, '').split('/').slice(3).map(decodeURIComponent); }
	catch { throw new ToolError('Invalid path encoding'); }
	if (parts.some((part) => !part || (/[/\\]/.test(part) || [...part].some((character) => character.charCodeAt(0) < 32)))) throw new ToolError('Invalid resource path');
	if (parts[0] !== 'projects') throw missing();
	if (parts.length <= 2) return { family: 'projects', kind: 'project', projectId: parts[1], id: parts[1], collection: parts.length === 1 };
	const [ , projectId, family, id ] = parts;
	if (parts.length <= 4 && Object.hasOwn(families, family)) return { family, kind: families[family], projectId, id, collection: parts.length === 3 };
	if (family === 'dialogues' && parts[4] === 'nodes' && [5, 6].includes(parts.length)) return { family: 'nodes', kind: 'node', projectId, dialogueId: id, id: parts[5], collection: parts.length === 5 };
	if (family === 'dialogues' && parts[4] === 'connections' && [5, 7].includes(parts.length)) return { family: 'connections', kind: 'edge', projectId, dialogueId: id, source: parts[5], target: parts[6], id: parts[5] && `${parts[5]}-${parts[6]}`, collection: parts.length === 5 };
	throw missing();
}

/** Returns a command before execution so auditing is identical for REST and MCP. */
export async function prepareRestCommand(route, method, body = {}, searchParams = new URLSearchParams()) {
	const { family, kind, projectId, dialogueId, id, collection } = route;
	if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method) || (collection ? ['PUT', 'DELETE'].includes(method) : method === 'POST')) {
		throw new ToolError('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
	}
	if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ToolError('Request body must be an object');
	const scope = { ...(projectId ? { projectId } : {}), ...(dialogueId ? { dialogueId } : {}) };
	const args = { ...body };
	const bind = (key, value) => {
		if (args[key] !== undefined && args[key] !== value) throw new ToolError(`Conflicting route identity "${key}"`);
		args[key] = value;
	};
	for (const [key, value] of Object.entries(scope)) bind(key, value);
	if (!collection) {
		for (const key of ['id', `${kind}Id`]) {
			if (args[key] !== undefined && args[key] !== id) throw new ToolError(`Conflicting route identity "${key}"`);
			if (!Object.hasOwn(scope, key)) delete args[key];
		}
	}
	// REST identity paths never fall back to names accepted by the MCP tools.
	if (projectId && family !== 'projects') {
		const snapshot = await loadSnapshot(projectId);
		if (dialogueId && !snapshot.dialogues.some((record) => record.id === dialogueId)) throw missing();
		if (!collection && Object.hasOwn(families, family) && !snapshot[family].some((record) => record.id === id)) throw missing();
		if (!collection && family === 'nodes' && !snapshot.nodes.some((record) => record.dialogueId === dialogueId && record.id === id)) throw missing();
		if (!collection && family === 'connections' && !snapshot.edges.some((edge) => edge.dialogueId === dialogueId && edge.source === route.source && edge.target === route.target)) throw missing();
	}
	if (method === 'GET') {
		if (family === 'projects') return { name: collection ? 'list_projects' : 'get_project', args: scope };
		if (family === 'dialogues') return { name: collection ? 'list_dialogues' : 'get_dialogue', args: { projectId, ...(!collection ? { dialogueId: id, ...(searchParams.has('locale') ? { locale: searchParams.get('locale') } : {}) } : {}) } };
		if (['nodes', 'connections'].includes(family)) return { name: 'get_dialogue', args: { ...scope, ...(searchParams.has('locale') ? { locale: searchParams.get('locale') } : {}) } };
		return { name: `list_${family}`, args: scope };
	}
	if (!collection) {
		if (family === 'dialogues') bind('dialogueId', id);
		else if (family === 'nodes') bind('nodeId', id);
		else if (family === 'connections') { bind('source', route.source); bind('target', route.target); }
		else if (family !== 'projects') bind(kind, id);
	}
	const verb = method === 'POST' ? (family === 'nodes' ? 'add' : family === 'connections' ? 'connect' : 'create') : method === 'PUT' ? 'update' : 'delete';
	return { name: family === 'connections' && method === 'POST' ? 'connect_nodes' : `${verb}_${kind}`, args };
}

export function restResponse(route, method, result) {
	if (method === 'DELETE') return { deleted: true, id: route.id };
	if (method !== 'GET') return { result };
	let items;
	if (route.family === 'projects') return route.collection ? { items: result.projects } : { item: result };
	if (route.family === 'dialogues') return route.collection ? { items: result.dialogues } : { item: result };
	if (route.family === 'nodes') items = result.nodes;
	else if (route.family === 'connections') items = result.edges;
	else {
		items = result[route.family];
		if (route.family === 'categories') {
			const flatten = (rows, parentCategoryId = null) => rows.flatMap(({ children, ...record }) => [{ ...record, parentCategoryId }, ...flatten(children || [], record.id)]);
			items = flatten(items);
		}
	}
	if (route.collection) return { items };
	const item = items.find((record) => route.family === 'connections' ? record.source === route.source && record.target === route.target : record.id === route.id);
	if (!item) throw missing();
	return { item };
}
