import { create } from 'zustand';
import { getRepositoryContext } from '@/lib/db';
import { assertCompatibleDefinition, assertUnreferenced, validateDefinition } from '@/lib/domainIntegrity';
import { changeDomainRecords, findDomainRecord, loadDomainRecords } from './domainStoreSupport';

export function createDefinitionStore(table, singular, achievement) {
	const plural = `${singular}s`;
	return create((set) => ({
		[table]: [], isLoading: false,
		[`load${plural}`]: (projectId, context) => loadDomainRecords(set, table, projectId, context),
		[`create${singular}`]: async (data) => {
			const context = await getRepositoryContext(), now = new Date().toISOString();
			const record = { ...data, id: crypto.randomUUID(), createdAt: now, modifiedAt: now };
			validateDefinition(record);
			await changeDomainRecords({ context, projectId: data.projectId, table, set, achievement, message: `${singular} Created`, transform: (snapshot) => { snapshot[table].push(record); } });
			return record;
		},
		[`update${singular}`]: async (id, updates) => {
			const { context, record } = await findDomainRecord(table, id); let next;
			await changeDomainRecords({ context, projectId: record.projectId, table, set, message: `${singular} Updated`, transform: (snapshot) => {
				const previous = snapshot[table].find((entry) => entry.id === id);
				if (!previous) throw new Error('Definition was removed. Reload before editing.');
				next = { ...previous, ...updates, id, projectId: previous.projectId, modifiedAt: new Date().toISOString() };
				assertCompatibleDefinition(snapshot, table, previous, next);
				snapshot[table] = snapshot[table].map((entry) => entry.id === id ? next : entry);
			} });
			return next;
		},
		[`delete${singular}`]: async (id) => {
			const { context, record } = await findDomainRecord(table, id);
			await changeDomainRecords({ context, projectId: record.projectId, table, set, message: `${singular} Deleted`, transform: (snapshot) => {
				assertUnreferenced(snapshot, table, record); snapshot[table] = snapshot[table].filter((entry) => entry.id !== id);
			} });
		},
		[`import${plural}`]: async (projectId, inputs) => {
			const context = await getRepositoryContext(), now = new Date().toISOString();
			const records = inputs.map((input) => ({ ...input, id: crypto.randomUUID(), projectId, createdAt: now, modifiedAt: now }));
			records.forEach(validateDefinition);
			await changeDomainRecords({ context, projectId, table, set, message: `${plural} Imported`, transform: (snapshot) => { snapshot[table].push(...records); } });
			return records;
		},
		[`export${plural}`]: async (projectId) => {
			const context = await getRepositoryContext();
			const records = await context.db[table].where('projectId').equals(projectId).toArray();
			context.assertCurrent();
			return records.map((record) => { const exported = { ...record }; delete exported.projectId; return exported; });
		},
	}));
}
