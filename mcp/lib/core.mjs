// Storage-independent primitives shared by the hosted MCP server and the desktop app's local endpoint.
// No imports: this module must load in Node and in the browser bundle alike.

export class ToolError extends Error {
	constructor(message, { code = 'INVALID_ARGUMENT', status = 400, details } = {}) {
		super(message); this.name = 'ToolError'; this.code = code; this.status = status;
		if (details !== undefined) this.details = details;
	}
}

export const uuid = () => globalThis.crypto.randomUUID();
export const nowIso = () => new Date().toISOString();
