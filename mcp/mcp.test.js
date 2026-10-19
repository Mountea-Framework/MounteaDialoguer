import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';

const TOKEN = 'test-token-0123456789abcdef0123456789';
let proc;
let base;
let dataDir;
let rpcId = 1;

// Every change is an immutable revision file; the head is the revision nobody names as parent.
function revisionsOf(projectId) {
	const dir = path.join(dataDir, 'sync');
	return fs.readdirSync(dir).map((name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')).revision).filter((revision) => revision.projectId === projectId);
}
function headOf(projectId) {
	const all = revisionsOf(projectId);
	const parents = new Set(all.flatMap((revision) => revision.parentRevisionIds));
	const heads = all.filter((revision) => !parents.has(revision.id));
	expect(heads).toHaveLength(1);
	return heads[0];
}

async function rpc(method, params, { auth = true, url = '/mcp' } = {}) {
	const res = await fetch(`${base}${url}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${TOKEN}` } : {}) },
		body: JSON.stringify({ jsonrpc: '2.0', id: rpcId++, method, params }),
	});
	return { status: res.status, body: res.status === 200 ? await res.json() : null };
}

async function tool(name, args = {}) {
	const { body } = await rpc('tools/call', { name, arguments: args });
	const text = body.result.content[0].text;
	if (body.result.isError) return { error: text };
	return JSON.parse(text);
}

beforeAll(async () => {
	dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-'));
	const port = 18000 + Math.floor(Math.random() * 1000);
	base = `http://127.0.0.1:${port}`;
	proc = spawn('node', ['--import', './mcp/register.mjs', 'mcp/server.mjs'], { env: { ...process.env, MCP_TOKEN: TOKEN, MCP_PORT: String(port), MCP_HOST: '127.0.0.1', DATA_DIR: dataDir }, stdio: 'pipe' });
	for (let i = 0; i < 50; i += 1) {
		try {
			if ((await fetch(`${base}/health`)).ok) return;
		} catch {
			/* not up yet */
		}
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error('MCP server did not start');
});

afterAll(() => {
	proc?.kill();
	fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('auth and protocol', () => {
	it('rejects missing or wrong tokens', async () => {
		expect((await rpc('tools/list', {}, { auth: false })).status).toBe(401);
		expect((await rpc('tools/list', {}, { auth: false, url: '/mcp/wrong' })).status).toBe(401);
	});
	it('accepts the bearer header and the token in the path', async () => {
		expect((await rpc('tools/list', {})).status).toBe(200);
		expect((await rpc('tools/list', {}, { auth: false, url: `/mcp/${TOKEN}` })).status).toBe(200);
	});
	it('initializes and answers notifications with 202', async () => {
		const { body } = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
		expect(body.result.serverInfo.name).toBe('mountea-dialoguer');
		const res = await fetch(`${base}/mcp`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
		expect(res.status).toBe(202);
	});
	it('answers an oversized body with 413 and keeps serving', async () => {
		const res = await fetch(`${base}/mcp`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: { pad: 'x'.repeat(11 * 1024 * 1024) } }) });
		expect(res.status).toBe(413);
		expect((await rpc('ping', {})).status).toBe(200);
	});
	it('has no tool that deletes projects or dialogues', async () => {
		const { body } = await rpc('tools/list', {});
		const names = body.result.tools.map((t) => t.name);
		expect(names.length).toBeGreaterThan(30);
		expect(names.filter((n) => /delete_(project|dialogue)|remove_(project|dialogue)/.test(n))).toEqual([]);
	});
});

describe('authoring a dialogue', () => {
	let projectId;
	let dialogueId;

	it('creates project, categories and participants with the UI rules', async () => {
		const project = await tool('create_project', { name: 'my test project', defaultLocale: 'en' });
		projectId = project.projectId;
		expect(project.name).toBe('MyTestProject');

		expect((await tool('create_category', { projectId, name: 'Characters' })).name).toBe('Characters');
		expect((await tool('create_category', { projectId, name: 'Townsfolk', parent: 'Characters' })).parent).toBe('Characters');
		expect((await tool('create_category', { projectId, name: 'ThisNameIsWayTooLongForACategory' })).error).toMatch(/16/);
		expect((await tool('create_category', { projectId, name: 'Townsfolk', parent: 'Characters' })).error).toMatch(/unique/);

		expect((await tool('create_participant', { projectId, name: 'Old Bob', category: 'Townsfolk' })).name).toBe('OldBob');
		expect((await tool('create_participant', { projectId, name: 'OldBob', category: 'Characters' })).error).toMatch(/unique/);
		expect((await tool('create_participant', { projectId, name: 'X', category: 'Nope' })).error).toMatch(/not found/);
	});

	it('enforces category depth', async () => {
		let parent = 'Characters';
		for (const name of ['L2', 'L3', 'L4']) {
			await tool('create_category', { projectId, name, parent });
			parent = name;
		}
		// Characters > Townsfolk is level 2; Characters > L2 > L3 > L4 is level 4, one more is 5, six is too deep.
		expect((await tool('create_category', { projectId, name: 'L5', parent })).error).toBeUndefined();
		expect((await tool('create_category', { projectId, name: 'L6', parent: 'L5' })).error).toMatch(/depth/);
	});

	it('creates a dialogue and builds a graph in one call', async () => {
		const dlg = await tool('create_dialogue', { projectId, name: 'Greeting' });
		dialogueId = dlg.dialogueId;
		expect((await tool('create_dialogue', { projectId, name: 'greeting' })).error).toMatch(/already exists/);

		const graph = await tool('set_graph', {
			projectId,
			dialogueId,
			mode: 'replace',
			nodes: [
				{ ref: 'hello', type: 'leadNode', displayName: 'Hello', participant: 'OldBob', rows: ['Well met, traveller.', { text: 'What brings you here?', duration: 4 }] },
				{ ref: 'asky', type: 'answerNode', displayName: 'AskCurse', selectionTitle: 'Ask about the curse', participant: 'OldBob', rows: ['Tell me about the curse.'] },
				{ ref: 'bye', type: 'answerNode', displayName: 'Leave', selectionTitle: 'Say goodbye', participant: 'OldBob', rows: ['I must go.'] },
				{ ref: 'curse', type: 'leadNode', displayName: 'CurseInfo', participant: 'OldBob', rows: ['The curse began long ago.'] },
				{ ref: 'back', type: 'returnNode', displayName: 'Back', targetNode: 'hello' },
				{ ref: 'end', type: 'completeNode', displayName: 'End', participant: 'OldBob' },
			],
			edges: [
				{ source: 'start', target: 'hello' },
				{ source: 'hello', target: 'asky' },
				{ source: 'hello', target: 'bye' },
				{ source: 'asky', target: 'curse' },
				{ source: 'curse', target: 'back' },
				{ source: 'bye', target: 'end' },
			],
		});
		expect(graph.error).toBeUndefined();
		expect(graph.nodeCount).toBe(7);
		expect(graph.errors).toEqual([]);
	});

	it('reads the graph back with text and structure', async () => {
		const g = await tool('get_dialogue', { projectId, dialogueId });
		const hello = g.nodes.find((n) => n.displayName === 'Hello');
		expect(hello.rows.map((r) => r.text)).toEqual(['Well met, traveller.', 'What brings you here?']);
		expect(hello.rows[1].duration).toBe(4);
		expect(g.nodes.find((n) => n.displayName === 'AskCurse').selectionTitle).toBe('Ask about the curse');
		expect(g.edges).toHaveLength(6);
		const back = g.nodes.find((n) => n.type === 'returnNode');
		expect(back.targetNode).toBe(hello.id);
	});

	it('stores text as localized strings, not inline', async () => {
		const head = headOf(projectId).snapshot;
		const stored = head.nodes.find((n) => n.data.displayNameKey && n.type === 'leadNode');
		expect(stored.data.displayName).toBeUndefined();
		expect(head.localizedStrings.some((e) => e.values.en === 'Well met, traveller.')).toBe(true);
		expect(head.nodes.some((n) => n.id === '00000000-0000-0000-0000-000000000001')).toBe(true);
		// Identities, not just names: the app resolves speakers and categories by id.
		const bob = head.participants.find((p) => p.name === 'OldBob');
		expect(bob.categoryId).toBe(head.categories.find((c) => c.name === 'Townsfolk').id);
		expect(head.nodes.find((n) => n.data.participant === 'OldBob').data.participantId).toBe(bob.id);
	});

	it('rejects invalid structure', async () => {
		const g = await tool('get_dialogue', { projectId, dialogueId });
		const end = g.nodes.find((n) => n.type === 'completeNode').id;
		const hello = g.nodes.find((n) => n.displayName === 'Hello').id;
		expect((await tool('connect_nodes', { projectId, dialogueId, source: end, target: hello })).error).toMatch(/cannot have outgoing/);
		expect((await tool('connect_nodes', { projectId, dialogueId, source: 'start', target: hello })).error).toMatch(/already connected|only have one/);
		expect((await tool('delete_node', { projectId, dialogueId, nodeId: '00000000-0000-0000-0000-000000000001' })).error).toMatch(/Start/);
		expect((await tool('add_node', { projectId, dialogueId, type: 'leadNode', participant: 'Ghost' })).error).toMatch(/does not exist/);
	});

	it('translates text and reports missing translations', async () => {
		expect((await tool('set_text', { projectId, dialogueId, locale: 'de', items: [] })).error).toMatch(/not enabled/);
		await tool('update_project', { projectId, addLocales: ['de'] });
		const missing = await tool('list_missing_translations', { projectId, locale: 'de' });
		expect(missing.count).toBeGreaterThan(5);
		const g = await tool('get_dialogue', { projectId, dialogueId });
		const hello = g.nodes.find((n) => n.displayName === 'Hello');
		await tool('set_text', { projectId, dialogueId, locale: 'de', items: [{ nodeId: hello.id, field: 'rowText', rowIndex: 0, text: 'Sei gegrüßt, Reisender.' }] });
		const de = await tool('get_dialogue', { projectId, dialogueId, locale: 'de' });
		expect(de.nodes.find((n) => n.id === hello.id).rows[0].text).toBe('Sei gegrüßt, Reisender.');
		expect((await tool('list_missing_translations', { projectId, locale: 'de' })).count).toBe(missing.count - 1);
		// The default locale is untouched.
		const en = await tool('get_dialogue', { projectId, dialogueId });
		expect(en.nodes.find((n) => n.id === hello.id).rows[0].text).toBe('Well met, traveller.');
	});

	it('keeps node data across later edits and renames participants everywhere', async () => {
		await tool('update_participant', { projectId, participant: 'OldBob', name: 'Bob' });
		const g = await tool('get_dialogue', { projectId, dialogueId });
		expect(g.nodes.filter((n) => n.participant === 'Bob').length).toBe(5);
		const hello = g.nodes.find((n) => n.displayName === 'Hello');
		expect(hello.rows).toHaveLength(2);
		expect((await tool('delete_participant', { projectId, participant: 'Bob' })).error).toMatch(/reference/);
	});

	it('supports decorators and conditions', async () => {
		await tool('create_decorator', { projectId, name: 'Mood', properties: [{ name: 'level', type: 'int', defaultValue: 1 }] });
		await tool('create_condition', { projectId, name: 'HasKey', properties: [{ name: 'item', type: 'string', defaultValue: 'Key' }] });
		const g = await tool('get_dialogue', { projectId, dialogueId });
		const hello = g.nodes.find((n) => n.displayName === 'Hello').id;
		const curse = g.nodes.find((n) => n.displayName === 'CurseInfo').id;
		expect((await tool('update_node', { projectId, dialogueId, nodeId: hello, decorators: [{ name: 'Mood', values: { level: 3 } }] })).error).toBeUndefined();
		expect((await tool('update_node', { projectId, dialogueId, nodeId: hello, decorators: ['Nope'] })).error).toMatch(/not defined/);
		const asky = g.nodes.find((n) => n.displayName === 'AskCurse').id;
		expect((await tool('update_edge', { projectId, dialogueId, source: asky, target: curse, conditions: { mode: 'all', rules: [{ name: 'HasKey', values: { item: 'Gold' } }] } })).rules).toBe(1);
		expect((await tool('delete_decorator', { projectId, decorator: 'Mood' })).error).toMatch(/reference/);
	});

	it('cascade-deletes a branch and cleans return targets', async () => {
		const g = await tool('get_dialogue', { projectId, dialogueId });
		const asky = g.nodes.find((n) => n.displayName === 'AskCurse').id;
		const res = await tool('delete_node', { projectId, dialogueId, nodeId: asky, cascade: true });
		expect(res.deleted).toHaveLength(3); // answer, curse info, return
		const after = await tool('get_dialogue', { projectId, dialogueId });
		expect(after.nodes.some((n) => n.type === 'returnNode')).toBe(false);
	});

	it('clears the content of a dialogue but keeps the dialogue', async () => {
		const copy = await tool('create_dialogue', { projectId, name: 'ToClear' });
		await tool('add_node', { projectId, dialogueId: copy.dialogueId, type: 'completeNode', displayName: 'End', participant: 'Bob', connectFrom: 'start' });
		const res = await tool('clear_dialogue', { projectId, dialogueId: copy.dialogueId });
		expect(res).toEqual({ removedNodes: 1, removedEdges: 1 });
		const g = await tool('get_dialogue', { projectId, dialogueId: copy.dialogueId });
		expect(g.nodes.map((n) => n.type)).toEqual(['startNode']);
		expect((await tool('list_dialogues', { projectId })).dialogues.some((d) => d.id === copy.dialogueId)).toBe(true);
	});

	it('validates a dialogue', async () => {
		const report = await tool('validate_dialogue', { projectId, dialogueId });
		expect(report.valid).toBe(true);
	});

	it('exports a dialogue as a v3 archive like the Export button', async () => {
		const res = await tool('export_dialogue', { projectId, dialogueId, inline: true });
		const zip = await JSZip.loadAsync(Buffer.from(res.base64, 'base64'));
		const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
		expect(manifest.format).toBe('mountea.archive.v3');
		expect(manifest.kind).toBe('dialogue');
		expect(manifest.dialogueId).toBe(dialogueId);
		const tables = new Set(manifest.records.map((r) => r.table));
		for (const table of ['dialogues', 'participants', 'categories', 'nodes', 'edges', 'localizedStrings']) expect(tables.has(table)).toBe(true);
		const strings = [];
		for (const record of manifest.records.filter((r) => r.table === 'localizedStrings')) strings.push(JSON.parse(await zip.file(record.path).async('string')));
		const values = (field) => strings.filter((e) => e.field === field).map((e) => e.values.en);
		// Display name and selection title stay separate entries (the plugin reads selectionTitleKey).
		expect(values('selectionTitle')).toContain('Say goodbye');
		expect(values('displayName')).toContain('Leave');
		expect(values('displayName')).not.toContain('Say goodbye');

		const project = await tool('export_project', { projectId, inline: true });
		const projectZip = await JSZip.loadAsync(Buffer.from(project.base64, 'base64'));
		expect(JSON.parse(await projectZip.file('manifest.json').async('string')).kind).toBe('project');

		const link = await tool('export_dialogue', { projectId, dialogueId });
		expect(link.downloadUrl).toContain(`/export/${TOKEN}/`);
		const download = await fetch(link.downloadUrl.replace(/^https?:\/\/[^/]+/, base));
		expect(download.status).toBe(200);
		expect(Buffer.from(await download.arrayBuffer()).subarray(0, 2).toString()).toBe('PK');
		expect((await fetch(`${base}/export/wrong/${link.fileName}`)).status).toBe(401);
	});

	it('supports row timing and rejects invalid values', async () => {
		const g = await tool('get_dialogue', { projectId, dialogueId });
		const hello = g.nodes.find((n) => n.displayName === 'Hello');
		const ok = await tool('update_node', { projectId, dialogueId, nodeId: hello.id, rows: [{ text: 'Click to continue', executionBehaviour: 'awaitInput', durationMode: 'override', durationOverride: 2.5 }, 'plain'] });
		expect(ok.error).toBeUndefined();
		const row = headOf(projectId).snapshot.nodes.find((n) => n.id === hello.id).data.dialogueRows[0];
		expect(row).toMatchObject({ executionBehaviour: 'awaitInput', durationMode: 'override', durationOverride: 2.5 });
		const plain = headOf(projectId).snapshot.nodes.find((n) => n.id === hello.id).data.dialogueRows[1];
		expect(plain.executionBehaviour).toBeUndefined(); // defaults are not stored
		expect((await tool('update_node', { projectId, dialogueId, nodeId: hello.id, rows: [{ text: 'x', durationMode: 'sideways' }] })).error).toMatch(/row timing|rows/i);
		expect((await tool('update_node', { projectId, dialogueId, nodeId: hello.id, rows: [{ text: 'x', durationOverride: -1 }] })).error).toMatch(/row timing|rows/i);
		// Put the original lines back for the tests that follow.
		await tool('update_node', { projectId, dialogueId, nodeId: hello.id, rows: ['Well met, traveller.', { text: 'What brings you here?', duration: 4 }] });
	});

	it('keeps every change as an immutable revision with a linear history', async () => {
		const all = revisionsOf(projectId);
		expect(all.length).toBeGreaterThan(10);
		const byId = new Map(all.map((r) => [r.id, r]));
		let cursor = headOf(projectId);
		let steps = 1;
		while (cursor.parentRevisionIds.length) {
			expect(cursor.parentRevisionIds).toHaveLength(1);
			cursor = byId.get(cursor.parentRevisionIds[0]);
			expect(cursor).toBeTruthy();
			steps += 1;
		}
		expect(steps).toBe(all.length);
		expect(cursor.operation).toBe('create');
	});
});
