export class DomainIntegrityError extends Error {
	constructor(code, message, references = []) { super(message); this.name = 'DomainIntegrityError'; this.code = code; this.references = references; }
}
const fail = (code, message, references) => { throw new DomainIntegrityError(code, message, references); };

export function categoryAncestors(categoryId, categories) {
	const byId = new Map(categories.map((record) => [record.id, record]));
	const chain = [], visited = new Set();
	let id = categoryId;
	while (id) {
		if (visited.has(id)) fail('CATEGORY_CYCLE', 'Category hierarchy contains a cycle.');
		visited.add(id);
		const record = byId.get(id);
		if (!record) fail('CATEGORY_PARENT_MISSING', 'Category parent must belong to this project.');
		chain.push(record); id = record.parentCategoryId;
	}
	return chain;
}
export function buildCategoryPath(id, categories) { return categoryAncestors(id, categories).reverse().map((record) => record.name).join('.'); }
export function getRootCategoryId(id, categories) { return categoryAncestors(id, categories).at(-1)?.id || null; }
export function validateEntityName(name, kind) {
	const value = String(name || '').trim();
	if (!/^[A-Za-z0-9]{1,16}$/.test(value)) fail('INVALID_NAME', `${kind} name must contain 1–16 letters or numbers.`);
	return value;
}
export function validateCategoryTree(categories, projectId) {
	const names = new Set(), roots = new Set();
	for (const category of categories) {
		if (category.projectId !== projectId) fail('FOREIGN_OWNER', 'Category must belong to this project.');
		validateEntityName(category.name, 'Category');
		const ancestors = categoryAncestors(category.id, categories);
		if (ancestors.length > 5) fail('CATEGORY_DEPTH', 'Category depth cannot exceed 5 levels.');
		const root = ancestors.at(-1);
		const identity = `${root.id}:${category.name}`;
		if (names.has(identity)) fail('DUPLICATE_CATEGORY_NAME', 'Category name must be unique within its tree.');
		names.add(identity);
		if (!category.parentCategoryId) {
			if (roots.has(category.name)) fail('DUPLICATE_CATEGORY_NAME', 'Root category names must be unique.');
			roots.add(category.name);
		}
	}
}
export function prepareCategoryImport(projectId, existing, inputs, createId = () => crypto.randomUUID()) {
	const categories = existing.map((record) => ({ ...record })), created = [];
	validateCategoryTree(categories, projectId);
	const byPath = new Map(categories.map((record) => [buildCategoryPath(record.id, categories), record.id]));
	for (const input of inputs) {
		const parts = String(input.fullPath || input.name || '').split('.');
		let path = '', parentCategoryId = null;
		for (const part of parts) {
			const name = validateEntityName(part, 'Category');
			path = path ? `${path}.${name}` : name;
			if (byPath.has(path)) { parentCategoryId = byPath.get(path); continue; }
			const now = new Date().toISOString();
			const record = { id: createId(), projectId, name, parentCategoryId, createdAt: now, modifiedAt: now };
			categories.push(record); created.push(record); byPath.set(path, record.id); parentCategoryId = record.id;
		}
	}
	validateCategoryTree(categories, projectId);
	return { categories, created };
}
export function resolveReference(records, id, legacyName, kind, { optional = false } = {}) {
	if (id) {
		const record = records.find((candidate) => candidate.id === id);
		if (!record) fail('REFERENCE_MISSING', `${kind} ${id} does not belong to this project.`);
		return record;
	}
	if (!legacyName && optional) return null;
	const matches = records.filter((candidate) => candidate.name === legacyName);
	if (matches.length !== 1) fail(matches.length ? 'AMBIGUOUS_REFERENCE' : 'REFERENCE_MISSING', `Choose a ${kind.toLowerCase()} by identity; the legacy name "${legacyName || ''}" is ${matches.length ? 'ambiguous' : 'missing'}.`);
	return matches[0];
}
export function normalizeParticipant(record, snapshot, excludeId) {
	const name = validateEntityName(record.name, 'Participant');
	const category = resolveReference(snapshot.categories, record.categoryId, record.category, 'Category');
	const root = getRootCategoryId(category.id, snapshot.categories);
	for (const existing of snapshot.participants) {
		if (existing.id === excludeId || existing.name !== name) continue;
		const existingCategory = resolveReference(snapshot.categories, existing.categoryId, existing.category, 'Category');
		if (getRootCategoryId(existingCategory.id, snapshot.categories) === root) fail('DUPLICATE_PARTICIPANT_NAME', 'Participant name must be unique within its category tree.');
	}
	return { ...record, name, categoryId: category.id, category: category.name };
}
export function validateDefinition(definition) {
	if (!String(definition.name || '').trim()) fail('INVALID_DEFINITION', 'Definition name is required.');
	if (!Array.isArray(definition.properties || [])) fail('INVALID_DEFINITION', 'Definition properties must be an array.');
	const seen = new Set();
	for (const property of definition.properties || []) {
		const name = String(property.name || '').trim();
		if (!name || name !== property.name || seen.has(name) || ['__proto__', 'constructor', 'prototype'].includes(name)) fail('INVALID_PROPERTY_NAME', 'Property names must be nonempty, unique, and safe object keys.');
		seen.add(name);
		if (!['string', 'number', 'boolean'].includes(property.type)) fail('INVALID_PROPERTY_TYPE', `Unsupported property type: ${property.type}`);
		if (property.defaultValue !== undefined && property.defaultValue !== null && (typeof property.defaultValue !== property.type || (property.type === 'number' && !Number.isFinite(property.defaultValue)))) fail('INVALID_PROPERTY_DEFAULT', `Default for ${name} must have type ${property.type}.`);
	}
}
export function findEntityReferences(snapshot, kind, record) {
	const refs = [];
	const add = (table, item, path) => refs.push({ table, id: item.id, dialogueId: item.dialogueId, path });
	if (kind === 'categories') {
		for (const child of snapshot.categories) if (child.parentCategoryId === record.id) add('categories', child, 'parentCategoryId');
		for (const participant of snapshot.participants) if (participant.categoryId === record.id || (!participant.categoryId && participant.category === record.name)) add('participants', participant, 'categoryId');
	}
	for (const node of snapshot.nodes) {
		if (kind === 'participants') {
			if (node.data?.participantId === record.id || (!node.data?.participantId && node.data?.participant === record.name)) add('nodes', node, 'data.participantId');
			for (const row of node.data?.dialogueRows || []) if (row.participantId === record.id || (!row.participantId && row.participant === record.name)) add('nodes', node, `data.dialogueRows.${row.id}.participantId`);
		}
		if (kind === 'decorators') for (const instance of node.data?.decorators || []) if (instance.id === record.id || (!instance.id && instance.name === record.name)) add('nodes', node, 'data.decorators');
		if (kind === 'dialogues' && node.data?.targetDialogue === record.id && node.dialogueId !== record.id) add('nodes', node, 'data.targetDialogue');
		if (kind === 'nodes' && node.dialogueId === record.dialogueId && node.data?.targetNode === record.id && node.id !== record.id) add('nodes', node, 'data.targetNode');
	}
	if (kind === 'conditions') for (const edge of snapshot.edges) for (const rule of edge.data?.conditions?.rules || []) if (rule.id === record.id || (!rule.id && rule.name === record.name)) add('edges', edge, 'data.conditions.rules');
	return refs;
}
export function assertUnreferenced(snapshot, kind, record) {
	const references = findEntityReferences(snapshot, kind, record);
	if (references.length) fail('RECORD_REFERENCED', `Remove or reassign ${references.length} reference(s) before deleting ${record.name || record.id}. ${references.map((ref) => `${ref.table}/${ref.id}: ${ref.path}`).join('; ')}`, references);
}
export function assertCompatibleDefinition(snapshot, kind, previous, next) {
	validateDefinition(next);
	const references = findEntityReferences(snapshot, kind, previous);
	if (!references.length) return;
	const changed = (previous.properties || []).some((property) => !next.properties?.some((candidate) => candidate.name === property.name && candidate.type === property.type));
	if (changed) fail('DEFINITION_REFERENCED', `Remove or reassign ${references.length} reference(s) before removing, renaming or changing property types. ${references.map((ref) => `${ref.table}/${ref.id}`).join(', ')}`, references);
}
export function projectIdentityLabels(snapshot, { strict = true } = {}) {
	const resolve = (...args) => { try { return resolveReference(...args); } catch (error) { if (strict) throw error; return null; } };
	for (const participant of snapshot.participants) {
		const category = resolve(snapshot.categories, participant.categoryId, participant.category, 'Category');
		if (category) { participant.categoryId = category.id; participant.category = category.name; }
	}
	for (const node of snapshot.nodes) {
		for (const data of [node.data, ...(node.data?.dialogueRows || [])].filter(Boolean)) {
			const participant = resolve(snapshot.participants, data.participantId, data.participant, 'Participant', { optional: true });
			if (participant) { data.participantId = participant.id; data.participant = participant.name; }
		}
		for (const instance of node.data?.decorators || []) {
			const definition = resolve(snapshot.decorators, instance.id, instance.name, 'Decorator');
			if (definition) { instance.id = definition.id; instance.name = definition.name; }
		}
	}
	for (const edge of snapshot.edges) for (const rule of edge.data?.conditions?.rules || []) {
		const definition = resolve(snapshot.conditions, rule.id, rule.name, 'Condition');
		if (definition) { rule.id = definition.id; rule.name = definition.name; }
	}
	return snapshot;
}

export function assertGraphNodesRemovable(nodes, removedIds) {
	const references = nodes.filter((node) => !removedIds.has(node.id) && removedIds.has(node.data?.targetNode)).map((node) => ({ table: 'nodes', id: node.id, path: 'data.targetNode' }));
	if (references.length) fail('RECORD_REFERENCED', `Reassign return targets before deleting: ${references.map((ref) => ref.id).join(', ')}`, references);
}
