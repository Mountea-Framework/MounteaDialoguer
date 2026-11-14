// The core tools and the JSON-RPC handler must run without the hosted file store, because the desktop app runs
// them in its renderer against IndexedDB. This drives them through an in-memory backend and checks that nothing
// they import needs Node.
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { describe, it, expect, beforeAll } from 'vitest';
import { CORE_TOOLS } from './tools/core.mjs';
import { TOOLS } from './tools/index.mjs';
import { setBackend } from './lib/backend.mjs';
import { createCommandExecutor } from './lib/dispatch.mjs';
import { createRpcHandler } from './lib/jsonrpc.mjs';
import { ToolError, nowIso } from './lib/core.mjs';
import { canonicalizeProject } from '../src/lib/persistence/canonicalProject.js';

const ROOT = path.resolve(import.meta.dirname, '..');
// 1x1 transparent PNG
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function memoryBackend() {
	const projects = new Map();
	const commit = async (snapshot) => {
		const canonical = await canonicalizeProject(snapshot);
		projects.set(canonical.project.id, canonical);
	};
	const backend = {
		projects,
		async listAllProjects() {
			return [...projects.values()].map(({ project }) => ({ id: project.id, name: project.name, modifiedAt: project.modifiedAt })).sort((a, b) => a.name.localeCompare(b.name));
		},
		async loadSnapshot(projectId) {
			const snapshot = projects.get(projectId);
			if (!snapshot) throw new ToolError(`Project "${projectId}" not found. Use list_projects.`, { code: 'NOT_FOUND', status: 404 });
			return structuredClone(snapshot);
		},
		async mutateProject(projectId, fn, { operation = 'update' } = {}) {
			const snapshot = await backend.loadSnapshot(projectId);
			const result = await fn(snapshot);
			if (operation === 'delete') projects.delete(projectId);
			else {
				snapshot.project.modifiedAt = nowIso();
				await commit(snapshot);
			}
			return result;
		},
		async createProject(snapshot) { await commit(snapshot); },
	};
	return backend;
}

describe('core tools on a non-file backend', () => {
	const backend = memoryBackend();
	const execute = createCommandExecutor(new Map(CORE_TOOLS.map((tool) => [tool.name, tool])));
	const rpc = createRpcHandler({ tools: CORE_TOOLS, execute: (name, args) => execute(name, args) });
	let rpcId = 1;
	const tool = async (name, args = {}) => {
		const response = await rpc.handleMessage({ jsonrpc: '2.0', id: rpcId++, method: 'tools/call', params: { name, arguments: args } });
		const text = response.result.content[0].text;
		return response.result.isError ? { error: text } : JSON.parse(text);
	};

	beforeAll(() => setBackend(backend));

	it('lists every hosted tool except the file-based exports', async () => {
		const response = await rpc.handleMessage({ jsonrpc: '2.0', id: 0, method: 'tools/list' });
		const names = response.result.tools.map((entry) => entry.name);
		expect(names).toEqual(TOOLS.map((entry) => entry.name).filter((name) => !name.startsWith('export_')));
		expect(await rpc.handlePayload([{ jsonrpc: '2.0', method: 'notifications/initialized' }])).toBeNull();
	});

	it('authors a dialogue end to end', async () => {
		const { projectId } = await tool('create_project', { name: 'portable test', defaultLocale: 'en' });
		expect((await tool('list_projects')).projects.map((entry) => entry.name)).toEqual(['PortableTest']);
		await tool('create_category', { projectId, name: 'Characters' });
		expect((await tool('create_participant', { projectId, name: 'Old Bob', category: 'Characters' })).name).toBe('OldBob');
		const thumbnail = await tool('set_participant_thumbnail', { projectId, participant: 'OldBob', pngBase64: PNG });
		expect(thumbnail.thumbnail).toMatchObject({ width: 1, height: 1 });
		expect((await tool('set_participant_thumbnail', { projectId, participant: 'OldBob', pngBase64: 'bm90IGEgcG5n' })).error).toMatch(/PNG/);

		const { dialogueId } = await tool('create_dialogue', { projectId, name: 'Greeting' });
		const graph = await tool('set_graph', {
			projectId, dialogueId, mode: 'replace',
			nodes: [
				{ ref: 'hello', type: 'leadNode', displayName: 'Hello', participant: 'OldBob', rows: ['Well met.'] },
				{ ref: 'end', type: 'completeNode', displayName: 'End', participant: 'OldBob' },
			],
			edges: [{ source: 'start', target: 'hello' }, { source: 'hello', target: 'end' }],
		});
		expect(graph.errors).toEqual([]);
		const read = await tool('get_dialogue', { projectId, dialogueId });
		expect(read.nodes.find((node) => node.displayName === 'Hello').rows[0].text).toBe('Well met.');
		expect((await tool('validate_dialogue', { projectId, dialogueId })).errors).toEqual([]);
		expect(backend.projects.get(projectId).localizedStrings.some((entry) => entry.values.en === 'Well met.')).toBe(true);

		expect((await tool('delete_project', { projectId })).deleted).toBe(true);
		expect((await tool('get_project', { projectId })).error).toMatch(/not found/);
	});
});

describe('portable import graph', () => {
	const ENTRY_POINTS = ['mcp/tools/core.mjs', 'mcp/lib/jsonrpc.mjs', 'mcp/lib/dispatch.mjs', 'mcp/lib/backend.mjs', 'mcp/lib/core.mjs'];
	const IMPORT = /(?:^|[\s;])(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|(?:^|[\s;])import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
	const builtins = new Set(builtinModules);

	function resolveLocal(specifier, from) {
		const base = specifier.startsWith('@/') ? path.join(ROOT, 'src', specifier.slice(2)) : path.resolve(path.dirname(from), specifier);
		for (const suffix of ['', '.js', '.jsx', '.mjs', '.json', '/index.js']) {
			const file = base + suffix;
			if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
		}
		throw new Error(`Cannot resolve ${specifier} from ${from}`);
	}

	it('reaches no Node builtins, hosted storage or Node globals', () => {
		const seen = new Set();
		const problems = [];
		const stack = ENTRY_POINTS.map((file) => path.join(ROOT, file));
		while (stack.length) {
			const file = stack.pop();
			if (seen.has(file)) continue;
			seen.add(file);
			const relative = path.relative(ROOT, file).replaceAll('\\', '/');
			if (relative.startsWith('server/') || relative === 'mcp/lib/store.mjs' || relative.startsWith('mcp/tools/export')) problems.push(`${relative} is hosted-only`);
			if (file.endsWith('.json')) continue;
			const source = fs.readFileSync(file, 'utf8');
			if (/\bBuffer\.|\bprocess\.env\b/.test(source.replace(/\/\/.*$/gm, ''))) problems.push(`${relative} uses a Node global`);
			for (const match of source.matchAll(IMPORT)) {
				const specifier = match[1] || match[2] || match[3];
				if (specifier.startsWith('node:') || builtins.has(specifier)) problems.push(`${relative} imports ${specifier}`);
				else if (specifier.startsWith('.') || specifier.startsWith('@/')) stack.push(resolveLocal(specifier, file));
			}
		}
		expect(problems).toEqual([]);
		expect(seen.size).toBeGreaterThan(10);
	});
});
