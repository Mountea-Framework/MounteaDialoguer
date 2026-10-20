// Naming and tree rules, ported from the stores/dialogs so the MCP enforces what the UI enforces.
import { NAME_PATTERN, toPascalName } from '../../src/helpers/nameHelpers.js';
import { ToolError } from './core.mjs';

export const MAX_NAME_LENGTH = 16; // participants and categories
export const MAX_CATEGORY_DEPTH = 5;

/** Same as the dialogs: spaces are joined into PascalCase, then the name must match the pattern. */
export function cleanName(raw, label, { maxLength = 0 } = {}) {
	const name = toPascalName(String(raw ?? ''));
	if (!name) throw new ToolError(`${label} name is required`);
	if (!NAME_PATTERN.test(name)) throw new ToolError(`${label} name may only contain letters and numbers`);
	if (maxLength && name.length > maxLength) throw new ToolError(`${label} name must be ${maxLength} characters or fewer ("${name}")`);
	return name;
}

export function findByName(list, name, label) {
	const wanted = String(name ?? '').trim().toLowerCase();
	const hit = list.find((item) => item.name.toLowerCase() === wanted);
	if (!hit) throw new ToolError(`${label} "${name}" not found. Existing: ${list.map((i) => i.name).join(', ') || '(none)'}`);
	return hit;
}

export function rootCategoryId(categoryId, categories) {
	let currentId = categoryId;
	const seen = new Set();
	while (currentId) {
		if (seen.has(currentId)) return null;
		seen.add(currentId);
		const current = categories.find((c) => c.id === currentId);
		if (!current) return null;
		if (!current.parentCategoryId) return current.id;
		currentId = current.parentCategoryId;
	}
	return null;
}

export function categoryDepth(categoryId, categories) {
	let depth = 0;
	let currentId = categoryId;
	const seen = new Set();
	while (currentId) {
		if (seen.has(currentId)) return Infinity;
		seen.add(currentId);
		const current = categories.find((c) => c.id === currentId);
		if (!current) break;
		depth += 1;
		currentId = current.parentCategoryId || null;
	}
	return depth;
}

export function subtreeDepth(categoryId, categories) {
	const seen = new Set();
	const dfs = (id) => {
		if (seen.has(id)) return 0;
		seen.add(id);
		const children = categories.filter((c) => c.parentCategoryId === id);
		return 1 + children.reduce((max, child) => Math.max(max, dfs(child.id)), 0);
	};
	return dfs(categoryId);
}

export function treeIds(rootId, categories) {
	const ids = new Set();
	const stack = [rootId];
	while (stack.length) {
		const id = stack.pop();
		if (!id || ids.has(id)) continue;
		ids.add(id);
		categories.filter((c) => c.parentCategoryId === id).forEach((c) => stack.push(c.id));
	}
	return ids;
}

export function descendantIds(categoryId, categories) {
	const ids = treeIds(categoryId, categories);
	ids.delete(categoryId);
	return ids;
}

/** Throws if `name` already exists in the tree that contains (or will contain) the category. */
export function assertUniqueCategoryName(name, parentCategoryId, categories, excludeId = null) {
	const rootId = parentCategoryId ? rootCategoryId(parentCategoryId, categories) : null;
	const clash = rootId
		? [...treeIds(rootId, categories)].some((id) => id !== excludeId && categories.find((c) => c.id === id)?.name === name)
		: categories.some((c) => !c.parentCategoryId && c.id !== excludeId && c.name === name);
	if (clash) throw new ToolError(`Category name "${name}" must be unique within its tree`);
}

export function assertCategoryPlacement(categoryId, parentCategoryId, categories) {
	if (!parentCategoryId) return;
	if (!categories.some((c) => c.id === parentCategoryId)) throw new ToolError(`Parent category "${parentCategoryId}" not found`);
	if (categoryId && (parentCategoryId === categoryId || descendantIds(categoryId, categories).has(parentCategoryId))) {
		throw new ToolError('A category cannot be moved below itself');
	}
	const parentDepth = categoryDepth(parentCategoryId, categories);
	const own = categoryId ? subtreeDepth(categoryId, categories) : 1;
	if (!Number.isFinite(parentDepth) || parentDepth + own > MAX_CATEGORY_DEPTH) {
		throw new ToolError(`Category depth cannot exceed ${MAX_CATEGORY_DEPTH} levels`);
	}
}

const categoryOfParticipant = (participant, categories) =>
	categories.find((c) => c.id === participant.categoryId) || categories.find((c) => c.name === participant.category);

/** Participant names are unique within a category tree (the tree of the participant's category). */
export function assertUniqueParticipant(name, categoryName, participants, categories, excludeId = null) {
	const category = categories.find((c) => c.name === categoryName);
	const rootId = category ? rootCategoryId(category.id, categories) : null;
	if (!rootId) return;
	const clash = participants.some((p) => {
		if (p.id === excludeId || p.name !== name) return false;
		const other = categoryOfParticipant(p, categories);
		return other && rootCategoryId(other.id, categories) === rootId;
	});
	if (clash) throw new ToolError(`Participant name "${name}" must be unique within its category tree`);
}
