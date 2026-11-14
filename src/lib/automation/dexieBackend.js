// Project backend for the shared MCP tools (mcp/lib/backend.mjs) on top of the desktop app's local database.
// Every write goes through the same repository path as an edit in the UI: a validated draft revision whose parent is
// the current local head, queued in the sync outbox so Google Drive / Steam sync upload it like any other edit.
import { getRepositoryContext } from '@/lib/db';
import { canonicalizeProject } from '@/lib/persistence/canonicalProject';
import { commitPreparedProject, mutateProject as mutateRepositoryProject, prepareProjectCommit } from '@/lib/persistence/projectRepository';
import { buildProjectSnapshot } from '@/lib/sync/snapshot';
import { useSyncStore } from '@/stores/syncStore';
import { ToolError, nowIso } from '../../../mcp/lib/core.mjs';

const CONFLICT_NOTE = 'divergent edits; resolve in the app';

/** Repository and profile failures become tool errors; anything else propagates unchanged. */
export function toToolError(error) {
	if (error instanceof ToolError) return error;
	switch (error?.code) {
		case 'PROJECT_NOT_FOUND':
			return new ToolError('Project not found. Use list_projects.', { code: 'NOT_FOUND', status: 404 });
		case 'STALE_PROJECT':
			return new ToolError('The project keeps changing underneath this request; try again.', { code: 'STALE_PROJECT', status: 409 });
		case 'STALE_PROFILE':
			return new ToolError('The app switched profiles while this request ran; try again.', { code: 'STALE_PROFILE', status: 409 });
		case 'PROJECT_REPAIR_REQUIRED':
			return new ToolError(error.message, { code: error.code, status: 409 });
		case 'INVALID_PROJECT_DATA': {
			const first = error.diagnostics?.[0];
			return new ToolError(`Invalid project data: ${error.message}${first ? ` (${first.path || first.code})` : ''}`);
		}
		case 'PROJECT_EXISTS':
		case 'FOREIGN_OWNERSHIP':
		case 'REVISION_ID_COLLISION':
			return new ToolError(error.message, { code: error.code, status: 409 });
		default:
			return error?.name === 'ProjectDataError' ? new ToolError(error.message, { code: error.code }) : error;
	}
}

function dialogueFingerprints(snapshot) {
	const rows = new Map();
	const add = (id, row) => { if (id) rows.set(id, [...(rows.get(id) || []), row]); };
	for (const dialogue of snapshot?.dialogues || []) add(dialogue.id, dialogue);
	for (const table of ['nodes', 'edges', 'localizedStrings']) for (const row of snapshot?.[table] || []) add(row.dialogueId, row);
	return new Map([...rows].map(([id, list]) => [id, JSON.stringify(list)]));
}

/** Dialogues whose rows differ between two snapshots (may over-report, never under-reports). */
export function changedDialogueIds(before, after) {
	const previous = dialogueFingerprints(before), next = dialogueFingerprints(after);
	return [...new Set([...previous.keys(), ...next.keys()])].filter((id) => previous.get(id) !== next.get(id));
}

async function requireProject(context, projectId) {
	const project = await context.db.projects.get(projectId);
	context.assertCurrent();
	if (!project) throw new ToolError(`Project "${projectId}" not found. Use list_projects.`, { code: 'NOT_FOUND', status: 404 });
	return project;
}

/** onWrite(projectId, dialogueIds) runs after every committed change with the dialogues it touched. */
export function createDexieBackend({ onWrite = () => {} } = {}) {
	const committed = (projectId, dialogueIds) => {
		useSyncStore.getState().schedulePush(projectId);
		onWrite(projectId, dialogueIds);
	};

	return {
		async listAllProjects() {
			try {
				const context = await getRepositoryContext();
				const [projects, conflicts] = await Promise.all([
					context.db.projects.toArray(),
					context.db.syncConflicts.where('status').equals('unresolved').toArray(),
				]);
				context.assertCurrent();
				const conflicted = new Set(conflicts.map((conflict) => conflict.projectId));
				return projects
					.map((project) => ({ id: project.id, name: project.name, modifiedAt: project.modifiedAt, ...(conflicted.has(project.id) ? { conflict: CONFLICT_NOTE } : {}) }))
					.sort((a, b) => a.name.localeCompare(b.name));
			} catch (error) { throw toToolError(error); }
		},

		async loadSnapshot(projectId) {
			try {
				const context = await getRepositoryContext();
				await requireProject(context, projectId);
				return await buildProjectSnapshot(projectId, { context });
			} catch (error) { throw toToolError(error); }
		},

		async mutateProject(projectId, fn, { operation = 'update' } = {}) {
			if (!['update', 'delete'].includes(operation)) throw new ToolError('Unsupported mutation operation');
			for (let attempt = 0; ; attempt += 1) {
				try {
					const context = await getRepositoryContext();
					await requireProject(context, projectId);
					let result, dialogueIds = [];
					if (operation === 'delete') {
						// Deletion keeps the previous snapshot in history, so the tool only produces its result.
						const before = await buildProjectSnapshot(projectId, { context });
						result = await fn(structuredClone(before));
						await mutateRepositoryProject(projectId, { context, operation: 'delete' });
						committed(projectId, before.dialogues.map((dialogue) => dialogue.id));
						return result;
					}
					await mutateRepositoryProject(projectId, {
						context,
						transform: async (raw) => {
							const snapshot = await canonicalizeProject(raw, { allowIncompleteMedia: true });
							const before = structuredClone(snapshot);
							result = await fn(snapshot);
							snapshot.project.modifiedAt = nowIso();
							dialogueIds = changedDialogueIds(before, snapshot);
							return snapshot;
						},
					});
					committed(projectId, dialogueIds);
					return result;
				} catch (error) {
					if (error?.code === 'STALE_PROJECT' && attempt < 1) continue;
					throw toToolError(error);
				}
			}
		},

		async createProject(snapshot) {
			try {
				const context = await getRepositoryContext();
				const prepared = await prepareProjectCommit(snapshot, { context, expectedSequence: 0, operation: 'create', validation: 'draft' });
				const outcome = await commitPreparedProject(prepared);
				committed(outcome.projectId, outcome.snapshot.dialogues.map((dialogue) => dialogue.id));
			} catch (error) { throw toToolError(error); }
		},
	};
}
