import { validateArgs } from '../tools/util.mjs';
import { ToolError } from './core.mjs';
import { DomainIntegrityError } from '../../src/lib/domainIntegrity.js';

export function commandError(error) {
	if (error instanceof ToolError) return error;
	if (error instanceof DomainIntegrityError) return new ToolError(error.message, {
		code: error.code, status: ['RECORD_REFERENCED', 'DEFINITION_REFERENCED'].includes(error.code) ? 409 : 400, details: error.references,
	});
	return error;
}

/** Transport-independent validation and dispatch over a tool map. No writes occur outside the tool handlers. */
export function createCommandExecutor(toolMap) {
	return async function executeCommand(name, args = {}) {
		const tool = toolMap.get(name);
		if (!tool) throw new ToolError(`Unknown command "${name}"`, { code: 'NOT_FOUND', status: 404 });
		try { return await tool.handler(validateArgs(tool, args)); }
		catch (error) { throw commandError(error); }
	};
}
