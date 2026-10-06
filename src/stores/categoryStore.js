import { create } from 'zustand';
import { getRepositoryContext } from '@/lib/db';
import { trackFirstCategoryCreated } from '@/lib/achievements/achievementTracker';
import { assertUnreferenced, buildCategoryPath, categoryAncestors, getRootCategoryId, prepareCategoryImport, validateCategoryTree, validateEntityName } from '@/lib/domainIntegrity';
import { changeDomainRecords, findDomainRecord, loadDomainRecords } from './domainStoreSupport';

export const useCategoryStore = create((set) => ({
 categories: [], isLoading: false, maxCategoryDepth: 5, maxCategoryNameLength: 16,
 isCategoryNameValid: (name) => /^[A-Za-z0-9]{1,16}$/.test(name || ''),
 getRootCategoryId, buildCategoryPath,
 getCategoryDepth: (id, records) => categoryAncestors(id, records).length,
 getMaxSubtreeDepth: (id, records) => Math.max(1, ...records.map((record) => { const chain = categoryAncestors(record.id, records); const index = chain.findIndex((parent) => parent.id === id); return index < 0 ? 0 : index + 1; })),
 isNameUniqueInTree: (name, rootId, records, excludeId = null) => !records.some((record) => record.id !== excludeId && record.name === name && getRootCategoryId(record.id, records) === rootId),
 loadCategories: (projectId, context) => loadDomainRecords(set, 'categories', projectId, context),
 createCategory: async (data) => {
  const context = await getRepositoryContext(), id = crypto.randomUUID(), now = new Date().toISOString();
  const category = { ...data, id, name: validateEntityName(data.name, 'Category'), createdAt: now, modifiedAt: now };
  await changeDomainRecords({ context, projectId: data.projectId, set, table: 'categories', message: 'Category Created', achievement: trackFirstCategoryCreated, transform: (snapshot) => {
   snapshot.categories.push(category); validateCategoryTree(snapshot.categories, data.projectId);
  } });
  return category;
 },
 updateCategory: async (id, updates) => {
  const { context, record } = await findDomainRecord('categories', id);
  let category;
  await changeDomainRecords({ context, projectId: record.projectId, set, table: 'categories', message: 'Category Updated', transform: (snapshot) => {
   const current = snapshot.categories.find((entry) => entry.id === id);
   if (!current) throw new Error('Category was removed. Reload before editing.');
   category = { ...current, ...updates, id, projectId: current.projectId, name: validateEntityName(updates.name ?? current.name, 'Category'), modifiedAt: new Date().toISOString() };
   snapshot.categories = snapshot.categories.map((entry) => entry.id === id ? category : entry);
   validateCategoryTree(snapshot.categories, record.projectId);
  } });
  return category;
 },
 deleteCategory: async (id) => {
  const { context, record } = await findDomainRecord('categories', id);
  await changeDomainRecords({ context, projectId: record.projectId, set, table: 'categories', message: 'Category Deleted', transform: (snapshot) => {
   assertUnreferenced(snapshot, 'categories', record); snapshot.categories = snapshot.categories.filter((entry) => entry.id !== id);
  } });
 },
 importCategories: async (projectId, inputs) => {
  const context = await getRepositoryContext(); let created;
  await changeDomainRecords({ context, projectId, set, table: 'categories', message: 'Categories Imported', transform: (snapshot) => {
   const prepared = prepareCategoryImport(projectId, snapshot.categories, inputs); snapshot.categories = prepared.categories; created = prepared.created;
  } });
  return created;
 },
 exportCategories: async (projectId) => {
  const context = await getRepositoryContext();
  const categories = await context.db.categories.where('projectId').equals(projectId).toArray();
  context.assertCurrent(); validateCategoryTree(categories, projectId);
  return categories.map((category) => ({ id: category.id, name: category.name, fullPath: buildCategoryPath(category.id, categories) }));
 },
}));
