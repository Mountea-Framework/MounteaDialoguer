import { create } from 'zustand';
import { getRepositoryContext, readProjectRecords, assertProjectReady } from '@/lib/db';
import { trackFirstParticipantCreated } from '@/lib/achievements/achievementTracker';
import { blobToStoredParticipantThumbnail, buildParticipantImageId, resolveParticipantThumbnailDataUrl, storedParticipantThumbnailToBlob } from '@/lib/participantThumbnails';
import { assertUnreferenced, buildCategoryPath, normalizeParticipant, prepareCategoryImport, resolveReference } from '@/lib/domainIntegrity';
import { changeDomainRecords, findDomainRecord, loadDomainRecords } from './domainStoreSupport';

function normalizeThumbnail(thumbnail) {
 if (!thumbnail) return null;
 const base64 = resolveParticipantThumbnailDataUrl(thumbnail);
 if (!base64 || !base64.startsWith('data:image/png;base64,')) throw new Error('Invalid PNG participant thumbnail payload');
 const sizeBytes = atob(base64.split(',')[1]).length;
 if (sizeBytes > 1024 * 1024) throw new Error('Participant thumbnail must be 1 MB or smaller');
 return { ...thumbnail, base64, mimeType: 'image/png', sizeBytes, updatedAt: thumbnail.updatedAt || new Date().toISOString() };
}
function thumbnailFor(map, id) { return map instanceof Map ? map.get(id) : map?.[id]; }
function participantManifest(participants, categories) {
 return participants.map((participant) => {
  const category = resolveReference(categories, participant.categoryId, participant.category, 'Category');
  const fullPath = buildCategoryPath(category.id, categories);
  return { ...participant, categoryId: category.id, fullPath, participantImage: participant.thumbnail ? `${buildParticipantImageId({ participantName: participant.name, categoryPath: fullPath })}_${participant.id}` : null };
 });
}
export const useParticipantStore = create((set, get) => ({
 participants: [], isLoading: false, maxParticipantNameLength: 16,
 loadParticipants: (projectId, context) => loadDomainRecords(set, 'participants', projectId, context),
 createParticipant: async (data) => {
  const context = await getRepositoryContext(), now = new Date().toISOString(); let participant;
  await changeDomainRecords({ context, projectId: data.projectId, set, table: 'participants', message: 'Participant Created', achievement: trackFirstParticipantCreated, transform: (snapshot) => {
   participant = normalizeParticipant({ ...data, id: crypto.randomUUID(), thumbnail: normalizeThumbnail(data.thumbnail), createdAt: now, modifiedAt: now }, snapshot);
   snapshot.participants.push(participant);
  } });
  return participant;
 },
 updateParticipant: async (id, updates) => {
  const { context, record } = await findDomainRecord('participants', id); let participant;
  await changeDomainRecords({ context, projectId: record.projectId, set, table: 'participants', message: 'Participant Updated', transform: (snapshot) => {
   const current = snapshot.participants.find((entry) => entry.id === id);
   if (!current) throw new Error('Participant was removed. Reload before editing.');
   const next = { ...current, ...updates, id, projectId: current.projectId, modifiedAt: new Date().toISOString() };
   if (updates.category !== undefined && updates.categoryId === undefined && updates.category !== current.category) delete next.categoryId;
   next.thumbnail = normalizeThumbnail(next.thumbnail);
   participant = normalizeParticipant(next, snapshot, id);
   snapshot.participants = snapshot.participants.map((entry) => entry.id === id ? participant : entry);
  } });
  return participant;
 },
 deleteParticipant: async (id) => {
  const { context, record } = await findDomainRecord('participants', id);
  await changeDomainRecords({ context, projectId: record.projectId, set, table: 'participants', message: 'Participant Deleted', transform: (snapshot) => {
   assertUnreferenced(snapshot, 'participants', record); snapshot.participants = snapshot.participants.filter((entry) => entry.id !== id);
  } });
 },
 importParticipants: async (projectId, inputs, options = {}) => {
  const context = options.context || await getRepositoryContext(); let participants;
  await changeDomainRecords({ context, projectId, set, table: 'participants', message: 'Participants Imported', transform: (snapshot) => {
   const paths = inputs.filter((input) => input.fullPath).map((input) => ({ fullPath: input.fullPath }));
   snapshot.categories = prepareCategoryImport(projectId, snapshot.categories, paths).categories;
   const byPath = new Map(snapshot.categories.map((category) => [buildCategoryPath(category.id, snapshot.categories), category.id]));
   participants = [];
   for (const input of inputs) {
    const now = new Date().toISOString();
    const categoryId = input.fullPath ? byPath.get(input.fullPath) : input.categoryId;
    const thumbnail = normalizeThumbnail(thumbnailFor(options.thumbnailById, input.participantImage) || input.thumbnail);
    const participant = normalizeParticipant({ ...input, id: crypto.randomUUID(), projectId, categoryId, thumbnail, createdAt: input.createdAt || now, modifiedAt: now }, snapshot);
    snapshot.participants.push(participant); participants.push(participant);
   }
  } });
  return participants;
 },
 importParticipantsFromFile: async (projectId, file) => {
  const context = await getRepositoryContext();
  if (!file) throw new Error('Missing import file');
  if (file.size > 25 * 1024 * 1024) throw new Error('Participant import exceeds 25 MiB');
  const isZip = /\.(zip|mnteapart)$/i.test(file.name || '');
  if (!isZip) {
   const text = await file.text(); context.assertCurrent();
   if (new TextEncoder().encode(text).length > 5 * 1024 * 1024) throw new Error('Participant JSON exceeds 5 MiB');
   const parsed = JSON.parse(text);
   return get().importParticipants(projectId, Array.isArray(parsed) ? parsed : [parsed], { context });
  }
  const { readBoundedArchive } = await import('@/lib/persistence/projectArchive');
  const entries = await readBoundedArchive(file); context.assertCurrent();
  const jsonBytes = entries.get('participants.json');
  if (!jsonBytes) throw new Error('Missing participants.json');
  const parsed = JSON.parse(new TextDecoder().decode(jsonBytes)), inputs = Array.isArray(parsed) ? parsed : [parsed], thumbnailById = new Map();
  for (const input of inputs) {
   if (!input.participantImage) continue;
   const bytes = entries.get(`Thumbnails/${input.participantImage}.png`) || entries.get(`thumbnails/${input.participantImage}.png`);
   if (!bytes) continue;
   if (bytes.length > 1024 * 1024) throw new Error('Participant thumbnail exceeds 1 MiB');
   thumbnailById.set(input.participantImage, await blobToStoredParticipantThumbnail(new Blob([bytes], {type:'image/png'}))); context.assertCurrent();
  }
  return get().importParticipants(projectId, inputs, { context, thumbnailById });
 },
 exportParticipants: async (projectId) => {
  const context = await getRepositoryContext();
  await assertProjectReady(projectId, context);
  const records = await readProjectRecords(projectId, context);
  return participantManifest(records.participants, records.categories);
 },
 exportParticipantsArchive: async (projectId) => {
  const context = await getRepositoryContext();
  await assertProjectReady(projectId, context);
  const records = await readProjectRecords(projectId, context);
  const manifest = participantManifest(records.participants, records.categories);
  const { default: JSZip } = await import('jszip'); context.assertCurrent();
  const zip = new JSZip(); zip.file('participants.json', JSON.stringify(manifest, null, 2));
  for (const participant of manifest) {
   if (!participant.participantImage) continue;
   const blob = storedParticipantThumbnailToBlob(participant.thumbnail);
   if (blob) zip.file(`Thumbnails/${participant.participantImage}.png`, blob);
  }
  const blob = await zip.generateAsync({ type: 'blob' }); context.assertCurrent();
  const { readBoundedArchive } = await import('@/lib/persistence/projectArchive');
  await readBoundedArchive(blob); context.assertCurrent();
  return { blob, defaultFileName: `participants-${new Date().toISOString().split('T')[0]}.zip` };
 },
}));
