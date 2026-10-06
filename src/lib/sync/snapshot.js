import { getRepositoryContext, assertProjectReady } from '@/lib/db';
import { canonicalizeProject, requireValidProject } from '@/lib/persistence/canonicalProject';
import { readProjectState, prepareProjectCommit, commitPreparedProject } from '@/lib/persistence/projectRepository';
import { remapProjectIdentities } from '@/lib/persistence/projectRemap';

export async function buildProjectSnapshot(projectId, { context: suppliedContext, requireReady = false } = {}) {
	const context = suppliedContext || await getRepositoryContext();
	if (requireReady) await assertProjectReady(projectId, context);
	const { snapshot } = await readProjectState(projectId, context);
	const canonical = await canonicalizeProject(snapshot, { allowIncompleteMedia: !requireReady });
	context.assertCurrent();
	return requireReady ? requireValidProject(canonical) : canonical;
}

export async function applyProjectSnapshot(snapshot, options = {}) {
	const context = options.context || await getRepositoryContext();
	const current = await readProjectState(snapshot?.project?.id, context);
	const prepared = await prepareProjectCommit(snapshot, {
		context, expectedSequence: options.expectedSequence ?? current.sequence,
		operation: options.operation || 'update', parentRevisionIds: options.parentRevisionIds,
		revisionId: options.revisionId, enqueue: false, remoteRevision: options.remoteRevision,
	});
	const result = await commitPreparedProject(prepared);
	return result.projectId;
}

export async function applyProjectSnapshotAsNew(snapshot, options = {}) {
	const context = options.context || await getRepositoryContext();
	const { snapshot: clone } = remapProjectIdentities(await canonicalizeProject(snapshot), { projectId: options.projectId });
	if (options.name) clone.project.name = options.name;
	const prepared = await prepareProjectCommit(clone, { context, expectedSequence: 0, operation: 'create' });
	return (await commitPreparedProject(prepared)).projectId;
}
