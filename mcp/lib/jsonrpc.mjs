// MCP JSON-RPC message handling, independent of the transport. The hosted server (mcp/server.mjs) feeds it HTTP
// bodies; the desktop app feeds it messages forwarded from its local endpoint (src/lib/automation).
import { ToolError } from './core.mjs';

export const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
export const INSTRUCTIONS =
	'Edits Mountea Dialoguer projects. Workflow: list_projects -> get_project -> create participants/categories -> create_dialogue -> set_graph -> validate_dialogue. Project and dialogue deletion retain revision history. Referenced records require reassignment before deletion. Open browser tabs refresh automatically (or ask the user to reload).';

/**
 * `execute(name, args, context)` runs one tool; `context` is whatever the transport passes along (the hosted server
 * uses it for audit and download links). Returns `handleMessage(message, context)` and `handlePayload(body, context)`;
 * both resolve to `null` when nothing should be sent back (notifications).
 */
export function createRpcHandler({ tools, execute, instructions = INSTRUCTIONS, onUnexpectedError = (name, error) => console.error('[mcp] tool failed', name, error) }) {
	async function callTool(params, context) {
		try {
			const result = await execute(params?.name, params?.arguments || {}, context);
			return { content: [{ type: 'text', text: JSON.stringify(result ?? { ok: true }, null, 2) }] };
		} catch (error) {
			if (!(error instanceof ToolError)) onUnexpectedError(params?.name, error);
			return { isError: true, content: [{ type: 'text', text: error instanceof ToolError ? error.message : 'Internal server error' }] };
		}
	}

	async function handleMessage(message, context) {
		const { id, method, params } = message || {};
		const isNotification = id === undefined || id === null;
		const reply = (result) => (isNotification ? null : { jsonrpc: '2.0', id, result });
		const fail = (code, text) => (isNotification ? null : { jsonrpc: '2.0', id, error: { code, message: text } });

		switch (method) {
			case 'initialize': {
				const wanted = params?.protocolVersion;
				return reply({
					protocolVersion: PROTOCOLS.includes(wanted) ? wanted : PROTOCOLS[0],
					capabilities: { tools: { listChanged: false } },
					serverInfo: { name: 'mountea-dialoguer', version: '1.0.0' },
					instructions,
				});
			}
			case 'ping':
				return reply({});
			case 'tools/list':
				return reply({ tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
			case 'tools/call':
				return reply(await callTool(params, context));
			default:
				if (typeof method === 'string' && method.startsWith('notifications/')) return null;
				return fail(-32601, `Method not found: ${method}`);
		}
	}

	async function handlePayload(body, context) {
		if (Array.isArray(body)) {
			const results = (await Promise.all(body.map((message) => handleMessage(message, context)))).filter(Boolean);
			return results.length ? results : null;
		}
		return handleMessage(body, context);
	}

	return { handleMessage, handlePayload };
}
