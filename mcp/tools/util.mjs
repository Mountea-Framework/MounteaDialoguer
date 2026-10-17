import { ToolError } from '../lib/store.mjs';

/** Tool definition helper: schema is a JSON Schema "properties" map; `required` lists mandatory keys. */
export function defineTool(name, description, properties, required, handler) {
	return {
		name,
		description,
		inputSchema: { type: 'object', properties, required, additionalProperties: false },
		handler,
	};
}

export const str = (description, extra = {}) => ({ type: 'string', description, ...extra });
export const bool = (description) => ({ type: 'boolean', description });
export const num = (description) => ({ type: 'number', description });
export const arr = (description, items = {}) => ({ type: 'array', description, items });
export const obj = (description, properties = {}) => ({ type: 'object', description, properties });

export const PROJECT = str('Project id (see list_projects)');
export const DIALOGUE = str('Dialogue id (see list_dialogues)');

/** Minimal JSON Schema check: required keys, unknown keys, primitive types, enums. */
export function validateArgs(tool, args) {
	const schema = tool.inputSchema;
	const input = args && typeof args === 'object' && !Array.isArray(args) ? args : {};
	for (const key of schema.required || []) {
		if (input[key] === undefined || input[key] === null || input[key] === '') throw new ToolError(`Missing required argument "${key}"`);
	}
	for (const [key, value] of Object.entries(input)) {
		const prop = schema.properties[key];
		if (!prop) throw new ToolError(`Unknown argument "${key}". Allowed: ${Object.keys(schema.properties).join(', ')}`);
		if (value === null || value === undefined) continue;
		const type = Array.isArray(value) ? 'array' : typeof value;
		const expected = prop.type;
		if (expected && expected !== type && !(expected === 'number' && type === 'number')) {
			throw new ToolError(`Argument "${key}" must be ${expected}, got ${type}`);
		}
		if (prop.enum && !prop.enum.includes(value)) throw new ToolError(`Argument "${key}" must be one of: ${prop.enum.join(', ')}`);
	}
	return input;
}

export function pick(object, keys) {
	const out = {};
	for (const key of keys) if (object[key] !== undefined) out[key] = object[key];
	return out;
}

export function omit(object, keys) {
	const out = { ...object };
	for (const key of keys) delete out[key];
	return out;
}
