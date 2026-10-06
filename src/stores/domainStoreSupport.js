import { errorToast } from '@/lib/errorPresentation';
import { getRepositoryContext } from '@/lib/db';
import { mutateProject } from '@/lib/persistence/projectRepository';
import { toast } from '@/components/ui/toaster';
import { useSyncStore } from '@/stores/syncStore';
import { projectIdentityLabels } from '@/lib/domainIntegrity';

export async function loadDomainRecords(set, table, projectId, suppliedContext) {
	const context = suppliedContext || await getRepositoryContext();
	context.assertCurrent(); set({ isLoading: true });
	try {
		const records = await context.db[table].where('projectId').equals(projectId).toArray();
		context.assertCurrent(); set({ [table]: records, isLoading: false });
		return records;
	} catch (error) {
		if (!context.signal.aborted) set({ isLoading: false });
		throw error;
	}
}
export async function changeDomainRecords({ context, projectId, transform, set, table, message, achievement }) {
	try {
		const result = await mutateProject(projectId, { context, transform: (snapshot) => {
			projectIdentityLabels(snapshot, { strict: false });
			transform(snapshot);
			projectIdentityLabels(snapshot, { strict: false });
			return snapshot;
		} });
		context.assertCurrent(); set({ [table]: result.snapshot[table], isLoading: false });
		useSyncStore.getState().schedulePush(projectId);
		if (message) toast({ variant: 'success', title: message });
		if (achievement) await achievement(projectId).catch((error) => console.warn('[achievements]', error));
		context.assertCurrent(); return result.snapshot;
	} catch (error) {
		if (!context.signal.aborted) toast(errorToast(error, 'update'));
		throw error;
	}
}
export async function findDomainRecord(table, id) {
	const context = await getRepositoryContext();
	const record = await context.db[table].get(id);
	context.assertCurrent();
	if (!record) throw new Error(`${table} record not found: ${id}`);
	return { context, record };
}
