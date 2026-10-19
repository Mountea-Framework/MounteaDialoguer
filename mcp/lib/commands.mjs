import { TOOL_MAP } from '../tools/index.mjs';
import { validateArgs } from '../tools/util.mjs';
import { ToolError } from './store.mjs';
import { DomainIntegrityError } from '../../src/lib/domainIntegrity.js';

export function commandError(error) {
	if (error instanceof ToolError) return error;
	if (error instanceof DomainIntegrityError) return new ToolError(error.message, {
		code: error.code, status: ['RECORD_REFERENCED', 'DEFINITION_REFERENCED'].includes(error.code) ? 409 : 400, details: error.references,
	});
	return error;
}

/** Transport-independent validation and dispatch. No writes occur outside the tool handlers. */
export async function executeCommand(name, args = {}) {
	const tool = TOOL_MAP.get(name);
	if (!tool) throw new ToolError(`Unknown command "${name}"`, { code: 'NOT_FOUND', status: 404 });
	try { return await tool.handler(validateArgs(tool, args)); }
	catch (error) { throw commandError(error); }
}
