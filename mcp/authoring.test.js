import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { startAuthoringServer } from './testHarness';

let server;
beforeAll(async () => { server = await startAuthoringServer(); });
afterAll(async () => { await server?.close(); });

for (const transport of ['REST', 'MCP']) describe(`${transport} shared CRUD`, () => {
	let projectId, dialogueId, categoryId, participantId, nodeId, otherId;
	const run = async (method, url, name, args) => {
		if (transport === 'MCP') return server.rpc(name, args);
		const res = await server.request(method, url, ['POST', 'PUT'].includes(method) ? args : undefined);
		expect(res.status, JSON.stringify(res.body)).toBe(method === 'POST' ? 201 : 200);
		return method === 'GET' ? res.body.item || res.body.items : method === 'DELETE' ? res.body : res.body.result;
	};
	const url = () => `/api/v1/projects/${projectId}`;
	it('creates, reads and updates a project', async () => {
		({ projectId } = await run('POST', '/api/v1/projects', 'create_project', { name: `Author${transport}` }));
		await run('PUT', url(), 'update_project', { projectId, description: 'updated' });
		const project = await run('GET', url(), 'get_project', { projectId }); expect(project.project.description).toBe('updated');
	});
	it('creates and updates categories and participants', async () => {
		({ categoryId } = await run('POST', `${url()}/categories`, 'create_category', { projectId, name: 'Folk' }));
		await run('PUT', `${url()}/categories/${categoryId}`, 'update_category', { projectId, category: categoryId, name: 'People' });
		({ participantId } = await run('POST', `${url()}/participants`, 'create_participant', { projectId, name: 'Bob', category: categoryId }));
		await run('PUT', `${url()}/participants/${participantId}`, 'update_participant', { projectId, participant: participantId, name: 'Alice' });
		if (transport === 'REST') {
			expect((await run('GET', `${url()}/categories/${categoryId}`)).name).toBe('People');
			expect((await run('GET', `${url()}/participants/${participantId}`)).name).toBe('Alice');
		}
	});
	it('authors dialogues, nodes, timing and connections', async () => {
		({ dialogueId } = await run('POST', `${url()}/dialogues`, 'create_dialogue', { projectId, name: 'Scene' }));
		await run('PUT', `${url()}/dialogues/${dialogueId}`, 'update_dialogue', { projectId, dialogueId, description: 'dialogue updated' });
		const graph = `${url()}/dialogues/${dialogueId}`;
		({ nodeId } = await run('POST', `${graph}/nodes`, 'add_node', { projectId, dialogueId, type: 'leadNode', participant: 'Alice', rows: ['Hi'] }));
		({ nodeId: otherId } = await run('POST', `${graph}/nodes`, 'add_node', { projectId, dialogueId, type: 'completeNode', participant: 'Alice' }));
		await run('PUT', `${graph}/nodes/${nodeId}`, 'update_node', { projectId, dialogueId, nodeId, rows: [{ text: 'Updated', executionBehaviour: 'awaitInput', durationMode: 'override', durationOverride: 2 }] });
		await run('POST', `${graph}/connections`, 'connect_nodes', { projectId, dialogueId, source: nodeId, target: otherId });
		await run('PUT', `${graph}/connections/${nodeId}/${otherId}`, 'update_edge', { projectId, dialogueId, source: nodeId, target: otherId, conditions: { mode: 'any', rules: [] } });
		const result = await run('GET', graph, 'get_dialogue', { projectId, dialogueId });
		expect(result.nodes.find((n) => n.id === nodeId).rows[0]).toMatchObject({ executionBehaviour: 'awaitInput', durationMode: 'override', durationOverride: 2 });
		if (transport === 'REST') {
			expect((await run('GET', `${graph}/nodes/${nodeId}`)).id).toBe(nodeId);
			expect((await run('GET', `${graph}/connections/${nodeId}/${otherId}`)).source).toBe(nodeId);
		}
	});
	for (const kind of ['decorator', 'condition']) it(`guards used ${kind} schemas and supports compatible changes`, async () => {
		const collection = `${kind}s`, field = `${kind}Id`;
		const created = await run('POST', `${url()}/${collection}`, `create_${kind}`, { projectId, name: 'State', properties: [{ name: 'count', type: 'number', defaultValue: 0 }] });
		const id = created[field];
		if (kind === 'decorator') await server.rpc('update_node', { projectId, dialogueId, nodeId, decorators: [{ name: 'State', values: { count: 5 } }] });
		else await server.rpc('update_edge', { projectId, dialogueId, source: nodeId, target: otherId, conditions: { rules: [{ name: 'State', values: { count: 5 } }] } });
		for (const properties of [[], [{ name: 'count', type: 'boolean' }], [{ name: 'renamed', type: 'number' }]]) {
			const before = await server.revisions(projectId);
			const args = { projectId, [kind]: id, name: 'BadRename', properties };
			if (transport === 'REST') {
				const res = await server.request('PUT', `${url()}/${collection}/${id}`, args);
				expect(res.status).toBe(409); expect(res.body.error.code).toBe('DEFINITION_REFERENCED'); expect(res.body.error.details.length).toBeGreaterThan(0);
			} else await expect(server.rpc(`update_${kind}`, args)).rejects.toThrow(/reference/);
			expect(await server.revisions(projectId)).toEqual(before);
		}
		await run('PUT', `${url()}/${collection}/${id}`, `update_${kind}`, { projectId, [kind]: id, name: 'Renamed', properties: [{ name: 'count', type: 'number', defaultValue: 1 }, { name: 'flag', type: 'boolean' }] });
		await expect(server.rpc(`delete_${kind}`, { projectId, [kind]: id, force: true })).rejects.toThrow(/reference/);
		if (kind === 'decorator') await server.rpc('update_node', { projectId, dialogueId, nodeId, decorators: [] });
		else await server.rpc('update_edge', { projectId, dialogueId, source: nodeId, target: otherId, conditions: { rules: [] } });
		await run('PUT', `${url()}/${collection}/${id}`, `update_${kind}`, { projectId, [kind]: id, properties: [{ name: 'count', type: 'boolean' }] });
		await run('DELETE', `${url()}/${collection}/${id}`, `delete_${kind}`, { projectId, [kind]: id });
	});
	it('rejects referenced entity deletions and protects Start and return targets', async () => {
		await expect(server.rpc('delete_participant', { projectId, participant: participantId, force: true })).rejects.toThrow(/reference/);
		await expect(server.rpc('delete_category', { projectId, category: categoryId })).rejects.toThrow(/reference/);
		await expect(server.rpc('delete_node', { projectId, dialogueId, nodeId: '00000000-0000-0000-0000-000000000001' })).rejects.toThrow(/Start/);
		const ret = await server.rpc('add_node', { projectId, dialogueId, type: 'returnNode', targetNode: nodeId });
		await expect(server.rpc('delete_node', { projectId, dialogueId, nodeId })).rejects.toThrow(/return targets/i);
		await server.rpc('delete_node', { projectId, dialogueId, nodeId: ret.nodeId });
		const child = await server.rpc('create_dialogue', { projectId, name: 'Child' });
		const opener = await server.rpc('add_node', { projectId, dialogueId, type: 'openChildGraphNode', targetDialogue: child.dialogueId });
		const before = await server.revisions(projectId);
		if (transport === 'REST') expect((await server.request('DELETE', `${url()}/dialogues/${child.dialogueId}`)).status).toBe(409);
		else await expect(server.rpc('delete_dialogue', { projectId, dialogueId: child.dialogueId })).rejects.toThrow(/reference/);
		expect(await server.revisions(projectId)).toEqual(before);
		await server.rpc('delete_node', { projectId, dialogueId, nodeId: opener.nodeId });
		await run('DELETE', `${url()}/dialogues/${child.dialogueId}`, 'delete_dialogue', { projectId, dialogueId: child.dialogueId });
	});
	it('deletes resources without removing historical revisions', async () => {
		const graph = `${url()}/dialogues/${dialogueId}`;
		await run('DELETE', `${graph}/connections/${nodeId}/${otherId}`, 'delete_edge', { projectId, dialogueId, source: nodeId, target: otherId });
		await run('DELETE', `${graph}/nodes/${otherId}`, 'delete_node', { projectId, dialogueId, nodeId: otherId });
		await run('DELETE', graph, 'delete_dialogue', { projectId, dialogueId });
		const head = await server.head(projectId);
		expect(head.snapshot.nodes).toEqual([]); expect(head.snapshot.localizedStrings).toEqual([]); expect(head.snapshot.participants).toHaveLength(1);
		await run('DELETE', `${url()}/participants/${participantId}`, 'delete_participant', { projectId, participant: participantId });
		await run('DELETE', `${url()}/categories/${categoryId}`, 'delete_category', { projectId, category: categoryId });
		const before = await server.head(projectId), revisions = await server.revisions(projectId);
		await run('DELETE', url(), 'delete_project', { projectId });
		const deleted = await server.head(projectId);
		expect(deleted.operation).toBe('delete'); expect(deleted.snapshot).toEqual(before.snapshot); expect(deleted.parentRevisionIds).toEqual([before.id]);
		expect(await server.revisions(projectId)).toHaveLength(revisions.length + 1);
		expect((await server.request('GET', url())).status).toBe(404);
		expect((await server.rpc('list_projects')).projects.some((p) => p.id === projectId)).toBe(false);
	});
});

it('enforces REST authentication, schemas, route identities, ownership and conflict errors', async () => {
	expect((await server.request('GET', '/api/v1/projects', undefined, { Authorization: '' })).status).toBe(401);
	expect((await server.request('POST', '/api/v1/projects', { name: 42 })).status).toBe(400);
	expect((await server.request('POST', '/api/v1/projects', { name: 'Bad', extra: true })).status).toBe(400);
	const { projectId } = await server.rpc('create_project', { name: 'Conflicts' });
	const { projectId: foreign } = await server.rpc('create_project', { name: 'Foreign' });
	expect((await server.request('PUT', `/api/v1/projects/${projectId}`, { projectId: foreign })).status).toBe(400);
	const { dialogueId } = await server.rpc('create_dialogue', { projectId: foreign, name: 'Elsewhere' });
	expect((await server.request('DELETE', `/api/v1/projects/${projectId}/dialogues/${dialogueId}`)).status).toBe(404);
	expect((await server.request('GET', '/api/v1/projects/missing')).status).toBe(404);
	for (const family of ['__proto__', 'constructor']) expect((await server.request('GET', `/api/v1/projects/${projectId}/${family}`)).status).toBe(404);
	const malformed = await fetch(`${server.base}/api/v1/projects`, { method: 'POST', headers: { Authorization: `Bearer ${server.token}`, 'Content-Type': 'application/json' }, body: '{' });
	expect(malformed.status).toBe(400);
	const head = await server.head(projectId);
	await server.writeRevision({ ...head, id: randomUUID(), operation: 'update', parentRevisionIds: [] });
	const res = await server.request('PUT', `/api/v1/projects/${projectId}`, { description: 'rejected' });
	expect(res.status).toBe(409); expect(res.body.error.code).toBe('DIVERGENT_HEADS');
	await expect(server.rpc('delete_project', { projectId })).rejects.toThrow(/divergent/);
	await server.writeRevision({ ...head, id: randomUUID(), operation: 'delete', parentRevisionIds: [head.id] });
	expect((await server.rpc('list_projects')).projects.find((project) => project.id === projectId).conflict).toMatch(/divergent/);
});

it('enforces REST body and rate limits and keeps serving afterwards', async () => {
	const limited = await startAuthoringServer({ MCP_MAX_BODY_MB: '0.02', MCP_RATE_PER_MIN: '3' });
	try {
		const large = await limited.request('POST', '/api/v1/projects', { name: 'x'.repeat(50000) });
		expect(large.status).toBe(413); expect(large.body.error.code).toBe('PAYLOAD_TOO_LARGE');
		expect((await limited.request('GET', '/api/v1/projects')).status).toBe(200);
		expect((await limited.request('GET', '/api/v1/projects')).status).toBe(200);
		const rate = await limited.request('GET', '/api/v1/projects');
		expect(rate.status).toBe(429); expect(rate.body.error.code).toBe('RATE_LIMIT');
	} finally { await limited.close(); }
});
