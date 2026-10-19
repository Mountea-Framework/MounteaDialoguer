// Project IO for the MCP server. Projects live as immutable revisions in the same file store the web app syncs with
// (DATA_DIR/sync/mountea-revision-v2--*.json, see src/lib/sync/core/revisionProtocol.js). The MCP reads a project's
// head revision, changes a copy, validates it with the web app's own canonical-project code and writes a new
// revision whose parent is the head it read. The browser picks it up on its next sync like any other writer.
import crypto from 'node:crypto';
import { FileExistsError, createFile, listFiles, readFileText } from '../../server/storage.mjs';
import { canonicalizeProject, hashProject, validateCanonicalProject } from '../../src/lib/persistence/canonicalProject.js';

export class ToolError extends Error {}

export const uuid = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

const REVISION_PREFIX = 'mountea-revision-v2--';
const DEVICE_ID = 'mcp-server';
const metaByFile = new Map(); // revision files are immutable, so their metadata is cached for the process lifetime
const locks = new Map(); // projectId -> promise chain (serialises writers inside this process)

export function revisionFileName(projectId, revisionId) {
	const digest = crypto.createHash('sha256').update(JSON.stringify([projectId, revisionId])).digest('hex');
	return `${REVISION_PREFIX}${digest}.json`;
}

async function refreshIndex() {
	const files = await listFiles({ prefix: REVISION_PREFIX });
	for (const { name } of files) {
		if (metaByFile.has(name)) continue;
		const text = await readFileText(name);
		if (text === null) continue;
		try {
			const revision = JSON.parse(text)?.revision;
			if (!revision?.id || !revision.projectId || !Array.isArray(revision.parentRevisionIds)) throw new Error('malformed revision');
			metaByFile.set(name, {
				file: name,
				id: revision.id,
				projectId: revision.projectId,
				parents: revision.parentRevisionIds,
				operation: revision.operation,
				createdAt: revision.createdAt,
				projectName: revision.snapshot?.project?.name || '',
				modifiedAt: revision.snapshot?.project?.modifiedAt || revision.createdAt,
			});
		} catch (error) {
			// Encrypted or foreign files are not ours to read; remember them so they are not parsed again.
			metaByFile.set(name, null);
			console.warn(`[mcp] skipping ${name}: ${error.message}`);
		}
	}
	const byProject = new Map();
	for (const meta of metaByFile.values()) {
		if (!meta) continue;
		if (!byProject.has(meta.projectId)) byProject.set(meta.projectId, []);
		byProject.get(meta.projectId).push(meta);
	}
	return byProject;
}

function headsOf(revisions) {
	const parentIds = new Set(revisions.flatMap((meta) => meta.parents));
	return revisions.filter((meta) => !parentIds.has(meta.id));
}

export async function listAllProjects() {
	const projects = [];
	for (const revisions of (await refreshIndex()).values()) {
		const heads = headsOf(revisions);
		const live = heads.filter((meta) => meta.operation !== 'delete');
		if (live.length === 0) continue;
		const newest = live.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b));
		projects.push({
			id: newest.projectId,
			name: newest.projectName,
			modifiedAt: newest.modifiedAt,
			...(live.length > 1 ? { conflict: 'divergent edits; resolve in the app' } : {}),
		});
	}
	return projects.sort((a, b) => a.name.localeCompare(b.name));
}

async function currentHead(projectId) {
	const revisions = (await refreshIndex()).get(projectId);
	if (!revisions) throw new ToolError(`Project "${projectId}" not found. Use list_projects.`);
	const heads = headsOf(revisions);
	if (heads.length > 1) {
		throw new ToolError('This project has divergent edits (an unresolved sync conflict). Resolve the conflict in the app first.');
	}
	if (heads[0].operation === 'delete') throw new ToolError(`Project "${projectId}" was deleted.`);
	return heads[0];
}

export async function loadSnapshot(projectId) {
	const head = await currentHead(projectId);
	const revision = JSON.parse(await readFileText(head.file)).revision;
	return revision.snapshot;
}

const DRAFT_TOLERATED = new Set(['INVALID_START', 'UNRESOLVED_PARTICIPANT', 'UNRESOLVED_CATEGORY']);

async function buildRevision(snapshot, { parents, operation, previous }) {
	let canonical;
	try {
		canonical = await canonicalizeProject(snapshot);
	} catch (error) {
		throw new ToolError(`Invalid project data: ${error.message}`);
	}
	// Same rule as the app's draft commits: problems that already existed do not block, new ones do.
	const known = new Set((previous ? validateCanonicalProject(previous, { localization: false }) : []).map((item) => `${item.code}:${item.path}`));
	const errors = validateCanonicalProject(canonical, { localization: false }).filter((item) => !DRAFT_TOLERATED.has(item.code) && !known.has(`${item.code}:${item.path}`));
	if (errors.length) throw new ToolError(`Invalid project data: ${errors[0].message} (${errors[0].path || errors[0].code})`);
	return {
		id: uuid(),
		projectId: canonical.project.id,
		parentRevisionIds: parents,
		deviceId: DEVICE_ID,
		payloadHash: await hashProject(canonical),
		operation,
		snapshot: canonical,
		createdAt: nowIso(),
	};
}

async function writeRevision(revision) {
	const name = revisionFileName(revision.projectId, revision.id);
	try {
		await createFile(name, JSON.stringify({ schemaVersion: 2, revision }));
	} catch (error) {
		if (error instanceof FileExistsError) throw new ToolError('Revision identity collision, please retry.');
		throw error;
	}
	metaByFile.delete(name); // let the next index refresh read it back
}

/**
 * Read-modify-write one project. `fn(snapshot)` mutates a copy of the head snapshot and returns the tool result.
 * If another writer added a revision in between, the operation is re-run on the new head (up to 3 times).
 */
export async function mutateProject(projectId, fn) {
	const previous = locks.get(projectId) || Promise.resolve();
	const run = previous.catch(() => {}).then(async () => {
		for (let attempt = 0; attempt < 3; attempt += 1) {
			const head = await currentHead(projectId);
			const before = JSON.parse(await readFileText(head.file)).revision.snapshot;
			const snapshot = structuredClone(before);
			const result = await fn(snapshot);
			snapshot.project.modifiedAt = nowIso();
			const revision = await buildRevision(snapshot, { parents: [head.id], operation: 'update', previous: before });
			const stillHead = headsOf((await refreshIndex()).get(projectId) || []);
			if (stillHead.length !== 1 || stillHead[0].id !== head.id) continue;
			await writeRevision(revision);
			return result;
		}
		throw new ToolError('The project keeps changing underneath this request; try again.');
	});
	locks.set(projectId, run);
	return run;
}

/** Creates a brand new project (first revision, no parents). */
export async function createProjectFile(snapshot) {
	await writeRevision(await buildRevision(snapshot, { parents: [], operation: 'create', previous: null }));
}
