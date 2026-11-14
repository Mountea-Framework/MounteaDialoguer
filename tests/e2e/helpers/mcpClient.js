// Tiny MCP client for e2e tests. Needs MCP_URL (e.g. http://127.0.0.1:8089) and MCP_TOKEN in the environment.
export const mcpEnabled = Boolean(process.env.MCP_URL && process.env.MCP_TOKEN);

let id = 1;
export async function mcpTool(name, args = {}) {
	const res = await fetch(`${process.env.MCP_URL}/mcp`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MCP_TOKEN}` },
		body: JSON.stringify({ jsonrpc: '2.0', id: id++, method: 'tools/call', params: { name, arguments: args } }),
	});
	const body = await res.json();
	const text = body.result.content[0].text;
	if (body.result.isError) throw new Error(`${name}: ${text}`);
	return JSON.parse(text);
}

/** Builds a small project: one NPC greeting, two player options, a return node and a complete node. */
export async function buildSampleProject(suffix) {
	const { projectId } = await mcpTool('create_project', { name: `McpProject${suffix}` });
	await mcpTool('create_category', { projectId, name: 'Folk' });
	await mcpTool('create_participant', { projectId, name: 'Bob', category: 'Folk' });
	const { dialogueId } = await mcpTool('create_dialogue', { projectId, name: 'Greeting' });
	await mcpTool('set_graph', {
		projectId,
		dialogueId,
		mode: 'replace',
		nodes: [
			{ ref: 'hello', type: 'leadNode', displayName: 'Hello', participant: 'Bob', rows: [{ text: 'Well met, traveller.', duration: 8 }] },
			{ ref: 'asky', type: 'answerNode', displayName: 'AskCurse', selectionTitle: 'Ask about the curse', participant: 'Bob', rows: ['Tell me about the curse.'] },
			{ ref: 'bye', type: 'answerNode', displayName: 'Leave', selectionTitle: 'Say goodbye', participant: 'Bob', rows: ['I must go.'] },
			{ ref: 'end', type: 'completeNode', displayName: 'End', participant: 'Bob' },
		],
		edges: [
			{ source: 'start', target: 'hello' },
			{ source: 'hello', target: 'asky' },
			{ source: 'hello', target: 'bye' },
			{ source: 'bye', target: 'end' },
		],
	});
	return { projectId, dialogueId, name: `McpProject${suffix}` };
}
