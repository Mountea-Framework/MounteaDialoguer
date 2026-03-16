import { create } from 'zustand';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/toaster';
import { useCategoryStore } from './categoryStore';
import { useSyncStore } from '@/stores/syncStore';
import { trackFirstParticipantCreated } from '@/lib/achievements/achievementTracker';
import {
	blobToStoredParticipantThumbnail,
	buildParticipantImageId,
	resolveParticipantThumbnailDataUrl,
	storedParticipantThumbnailToBlob,
} from '@/lib/participantThumbnails';
import { PARTICIPANT_THUMBNAIL_MAX_BYTES } from '@/lib/sync/core/constants';
import { buildProjectSnapshot } from '@/lib/sync/snapshot';
import { assertEstimatedSyncPayloadWithinBudget } from '@/lib/sync/payloadBudget';

function getRootIdByCategoryName(categoryName, categories = []) {
	const match = categories.find((category) => category.name === categoryName);
	if (!match) return null;
	return useCategoryStore.getState().getRootCategoryId(match.id, categories);
}

function getImportedThumbnailById(thumbnailById, participantImageId) {
	if (!participantImageId || !thumbnailById) return null;
	if (thumbnailById instanceof Map) {
		return thumbnailById.get(participantImageId) || null;
	}
	if (typeof thumbnailById === 'object') {
		return thumbnailById[participantImageId] || null;
	}
	return null;
}

function normalizeStoredThumbnail(thumbnail) {
	if (!thumbnail || typeof thumbnail !== 'object') return null;
	const base64 = resolveParticipantThumbnailDataUrl(thumbnail);
	if (!base64) {
		throw new Error('Invalid participant thumbnail payload');
	}

	const reportedSize = Number(thumbnail.sizeBytes || 0);
	const estimatedSize = Math.max(0, Math.floor((base64.length * 3) / 4));
	const sizeBytes = reportedSize > 0 ? reportedSize : estimatedSize;
	if (sizeBytes > PARTICIPANT_THUMBNAIL_MAX_BYTES) {
		throw new Error('Participant thumbnail must be 1 MB or smaller');
	}

	return {
		base64,
		mimeType: 'image/png',
		sizeBytes,
		width: Number(thumbnail.width || 0),
		height: Number(thumbnail.height || 0),
		updatedAt: String(thumbnail.updatedAt || new Date().toISOString()),
	};
}

async function assertParticipantMutationSyncBudget(projectId, nextParticipants) {
	const snapshot = await buildProjectSnapshot(projectId);
	snapshot.participants = nextParticipants;
	assertEstimatedSyncPayloadWithinBudget(snapshot, 'Project sync payload');
}

export const useParticipantStore = create((set, get) => ({
	participants: [],
	isLoading: false,
	maxParticipantNameLength: 16,

	// Load participants for a specific project
	loadParticipants: async (projectId) => {
		set({ isLoading: true });
		try {
			const participants = await db.participants.where('projectId').equals(projectId).toArray();
			set({ participants, isLoading: false });
		} catch (error) {
			console.error('Failed to load participants:', error);
			toast({
				variant: 'error',
				title: 'Failed to Load Participants',
				description: error.message || 'An unexpected error occurred',
			});
			set({ isLoading: false });
		}
	},

	// Create a new participant
	createParticipant: async (participantData) => {
		try {
			const name = participantData.name?.trim() || '';
			if (!name) {
				throw new Error('Participant name is required');
			}
			if (!/^[A-Za-z0-9]+$/.test(name)) {
				throw new Error('Participant name must contain only letters and numbers');
			}
			if (name.length > get().maxParticipantNameLength) {
				throw new Error(
					`Participant name must be ${get().maxParticipantNameLength} characters or fewer`
				);
			}
			if (!participantData.category) {
				throw new Error('Participant category is required');
			}

			const categories = await db.categories
				.where('projectId')
				.equals(participantData.projectId)
				.toArray();
			const participants = await db.participants
				.where('projectId')
				.equals(participantData.projectId)
				.toArray();

			const rootId = getRootIdByCategoryName(participantData.category, categories);
			if (rootId) {
				const isDuplicate = participants.some((participant) => {
					if (participant.name !== name) return false;
					const participantRootId = getRootIdByCategoryName(participant.category, categories);
					return participantRootId === rootId;
				});
				if (isDuplicate) {
					throw new Error('Participant name must be unique within its category tree');
				}
			}

			const now = new Date().toISOString();
			const id = uuidv4();
			const thumbnail = normalizeStoredThumbnail(participantData.thumbnail || null);
			const newParticipant = {
				id,
				...participantData,
				name,
				thumbnail,
				createdAt: now,
				modifiedAt: now,
			};

			await assertParticipantMutationSyncBudget(participantData.projectId, [
				...participants,
				newParticipant,
			]);

			await db.participants.add(newParticipant);
			try {
				await trackFirstParticipantCreated(participantData.projectId);
			} catch (error) {
				console.warn('[achievements] Failed to track first participant:', error);
			}
			await get().loadParticipants(participantData.projectId);
			useSyncStore.getState().schedulePush(participantData.projectId);
			toast({
				variant: 'success',
				title: 'Participant Created',
				description: `${participantData.name} has been created successfully`,
			});
			return newParticipant;
		} catch (error) {
			console.error('Error creating participant:', error);
			toast({
				variant: 'error',
				title: 'Failed to Create Participant',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	// Update a participant
	updateParticipant: async (id, updates) => {
		try {
			const participant = await db.participants.get(id);
			if (!participant) {
				throw new Error('Participant not found');
			}

			const name = (updates.name ?? participant.name)?.trim() || '';
			if (!name) {
				throw new Error('Participant name is required');
			}
			if (!/^[A-Za-z0-9]+$/.test(name)) {
				throw new Error('Participant name must contain only letters and numbers');
			}
			if (name.length > get().maxParticipantNameLength) {
				throw new Error(
					`Participant name must be ${get().maxParticipantNameLength} characters or fewer`
				);
			}
			const categoryName = updates.category ?? participant.category;
			if (!categoryName) {
				throw new Error('Participant category is required');
			}

			const categories = await db.categories
				.where('projectId')
				.equals(participant.projectId)
				.toArray();
			const participants = await db.participants
				.where('projectId')
				.equals(participant.projectId)
				.toArray();

			const rootId = getRootIdByCategoryName(categoryName, categories);
			if (rootId) {
				const isDuplicate = participants.some((entry) => {
					if (entry.id === participant.id) return false;
					if (entry.name !== name) return false;
					const participantRootId = getRootIdByCategoryName(entry.category, categories);
					return participantRootId === rootId;
				});
				if (isDuplicate) {
					throw new Error('Participant name must be unique within its category tree');
				}
			}

			const updatedParticipant = {
				...participant,
				...updates,
				name,
				category: categoryName,
				thumbnail: normalizeStoredThumbnail(
					Object.prototype.hasOwnProperty.call(updates, 'thumbnail')
						? updates.thumbnail
						: participant.thumbnail
				),
				modifiedAt: new Date().toISOString(),
			};

			const projectedParticipants = participants.map((entry) =>
				entry.id === participant.id ? updatedParticipant : entry
			);
			await assertParticipantMutationSyncBudget(participant.projectId, projectedParticipants);

			await db.participants.update(id, updatedParticipant);
			await get().loadParticipants(participant.projectId);
			useSyncStore.getState().schedulePush(participant.projectId);
			toast({
				variant: 'success',
				title: 'Participant Updated',
				description: 'Participant has been updated successfully',
			});
			return updatedParticipant;
		} catch (error) {
			console.error('Error updating participant:', error);
			toast({
				variant: 'error',
				title: 'Failed to Update Participant',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	// Delete a participant
	deleteParticipant: async (id) => {
		try {
			const participant = await db.participants.get(id);
			if (!participant) {
				throw new Error('Participant not found');
			}

			await db.participants.delete(id);
			await get().loadParticipants(participant.projectId);
			useSyncStore.getState().schedulePush(participant.projectId);
			toast({
				variant: 'success',
				title: 'Participant Deleted',
				description: 'Participant has been deleted',
			});
		} catch (error) {
			console.error('Error deleting participant:', error);
			toast({
				variant: 'error',
				title: 'Failed to Delete Participant',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	importParticipantsFromFile: async (projectId, file) => {
		if (!file) {
			throw new Error('Missing import file');
		}

		const lowerName = String(file.name || '').toLowerCase();
		const isZip = lowerName.endsWith('.zip') || lowerName.endsWith('.mnteapart');
		if (!isZip) {
			const text = await file.text();
			const parsed = JSON.parse(text);
			const participantsData = Array.isArray(parsed) ? parsed : [parsed];
			return await get().importParticipants(projectId, participantsData);
		}

		const JSZip = (await import('jszip')).default;
		const zip = await JSZip.loadAsync(file);
		const participantsJson = await zip.file('participants.json')?.async('text');
		if (!participantsJson) {
			throw new Error('Invalid participants archive: missing participants.json');
		}
		const parsedParticipants = JSON.parse(participantsJson);
		const participantsData = Array.isArray(parsedParticipants)
			? parsedParticipants
			: [parsedParticipants];

		const thumbnailById = new Map();
		for (const participant of participantsData) {
			const participantImageId = String(participant?.participantImage || '').trim();
			if (!participantImageId) continue;
			const entry =
				zip.file(`Thumbnails/${participantImageId}.png`) ||
				zip.file(`thumbnails/${participantImageId}.png`);
			if (!entry) continue;
			const blob = await entry.async('blob');
			const thumbnail = await blobToStoredParticipantThumbnail(blob);
			thumbnailById.set(participantImageId, thumbnail);
		}

		return await get().importParticipants(projectId, participantsData, {
			thumbnailById,
		});
	},

	// Import participants from JSON with category creation
	importParticipants: async (projectId, participantsData, options = {}) => {
		try {
			const now = new Date().toISOString();

			// First, collect all unique category paths from participants
			const categoryPaths = new Set();
			participantsData.forEach((participant) => {
				if (participant.fullPath) {
					categoryPaths.add(participant.fullPath);
				}
			});

			// Import categories if needed
			if (categoryPaths.size > 0) {
				const categoriesData = Array.from(categoryPaths).map((fullPath) => ({
					name: fullPath.split('.').pop(),
					fullPath,
				}));
				await useCategoryStore.getState().importCategories(projectId, categoriesData);
			}

			// Load categories to get their IDs
			const categories = await db.categories.where('projectId').equals(projectId).toArray();

			// Build category path map
			const categoryPathMap = new Map();
			categories.forEach((category) => {
				const fullPath = useCategoryStore.getState().buildCategoryPath(category.id, categories);
				categoryPathMap.set(fullPath, category.name);
			});

			const existingParticipants = await db.participants
				.where('projectId')
				.equals(projectId)
				.toArray();

			const getCategoryNameForImport = (participantData) => {
				const fullPath = String(participantData?.fullPath || '').trim();
				if (fullPath) {
					return (
						categoryPathMap.get(fullPath) ||
						fullPath.split('.').pop() ||
						participantData.category ||
						'Unknown'
					);
				}
				return participantData.category || 'Unknown';
			};

			// Create participants
			const participantsToImport = participantsData.map((participantData) => {
				const participantImageId = String(participantData?.participantImage || '').trim();
				const importedThumbnail = participantImageId
					? getImportedThumbnailById(options.thumbnailById, participantImageId)
					: null;

				return {
					id: uuidv4(),
					name: participantData.name,
					category: getCategoryNameForImport(participantData),
					thumbnail: normalizeStoredThumbnail(importedThumbnail),
					projectId,
					createdAt: now,
					modifiedAt: now,
				};
			});

			const existingNamesByRoot = new Map();
			existingParticipants.forEach((participant) => {
				const rootId = getRootIdByCategoryName(participant.category, categories);
				if (!rootId) return;
				if (!existingNamesByRoot.has(rootId)) {
					existingNamesByRoot.set(rootId, new Set());
				}
				existingNamesByRoot.get(rootId).add(participant.name);
			});

			participantsToImport.forEach((participant) => {
				const name = participant.name?.trim() || '';
				if (!name) {
					throw new Error('Participant name is required');
				}
				if (!/^[A-Za-z0-9]+$/.test(name)) {
					throw new Error('Participant name must contain only letters and numbers');
				}
				if (name.length > get().maxParticipantNameLength) {
					throw new Error(
						`Participant name must be ${get().maxParticipantNameLength} characters or fewer`
					);
				}
				const rootId = getRootIdByCategoryName(participant.category, categories);
				if (rootId) {
					if (!existingNamesByRoot.has(rootId)) {
						existingNamesByRoot.set(rootId, new Set());
					}
					const rootSet = existingNamesByRoot.get(rootId);
					if (rootSet.has(name)) {
						throw new Error('Participant name must be unique within its category tree');
					}
					rootSet.add(name);
				}
			});

			await assertParticipantMutationSyncBudget(projectId, [
				...existingParticipants,
				...participantsToImport,
			]);

			await db.participants.bulkAdd(participantsToImport);
			await get().loadParticipants(projectId);
			useSyncStore.getState().schedulePush(projectId);
			toast({
				variant: 'success',
				title: 'Participants Imported',
				description: `${participantsToImport.length} participants have been imported`,
			});
			return participantsToImport;
		} catch (error) {
			console.error('Error importing participants:', error);
			toast({
				variant: 'error',
				title: 'Failed to Import Participants',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	// Export participants to JSON with category full paths
	exportParticipants: async (projectId) => {
		try {
			const participants = await db.participants.where('projectId').equals(projectId).toArray();
			const categories = await db.categories.where('projectId').equals(projectId).toArray();

			// Build category path map
			const categoryPathMap = new Map();
			categories.forEach((category) => {
				const fullPath = useCategoryStore.getState().buildCategoryPath(category.id, categories);
				categoryPathMap.set(category.name, fullPath);
			});

			// Export participants with full category paths and image IDs
			return participants.map((participant) => {
				const fullPath = categoryPathMap.get(participant.category) || participant.category;
				const hasThumbnail = Boolean(resolveParticipantThumbnailDataUrl(participant.thumbnail));
				return {
					name: participant.name,
					fullPath,
					participantImage: hasThumbnail
						? buildParticipantImageId({
							participantName: participant.name,
							categoryPath: fullPath,
						})
						: null,
				};
			});
		} catch (error) {
			console.error('Error exporting participants:', error);
			toast({
				variant: 'error',
				title: 'Failed to Export Participants',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	exportParticipantsArchive: async (projectId) => {
		try {
			const JSZip = (await import('jszip')).default;
			const participantsManifest = await get().exportParticipants(projectId);
			const participants = await db.participants.where('projectId').equals(projectId).toArray();

			const zip = new JSZip();
			zip.file('participants.json', JSON.stringify(participantsManifest, null, 2));
			const thumbnailsFolder = zip.folder('Thumbnails');
			const manifestByName = new Map(participantsManifest.map((entry) => [entry.name, entry]));

			for (const participant of participants) {
				const manifest = manifestByName.get(participant.name);
				const participantImage = String(manifest?.participantImage || '').trim();
				if (!participantImage) continue;
				const blob = storedParticipantThumbnailToBlob(participant.thumbnail);
				if (!blob) continue;
				thumbnailsFolder.file(`${participantImage}.png`, blob);
			}

			const blob = await zip.generateAsync({ type: 'blob' });
			return {
				blob,
				defaultFileName: `participants-${new Date().toISOString().split('T')[0]}.zip`,
			};
		} catch (error) {
			console.error('Error exporting participants archive:', error);
			toast({
				variant: 'error',
				title: 'Failed to Export Participants',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},
}));
