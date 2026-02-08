import { create } from 'zustand';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/toaster';
import { useCategoryStore } from './categoryStore';
import { useSyncStore } from '@/stores/syncStore';

export const useParticipantStore = create((set, get) => ({
	participants: [],
	isLoading: false,
	maxParticipantNameLength: 16,

	// Load participants for a specific project
	loadParticipants: async (projectId) => {
		set({ isLoading: true });
		try {
			const participants = await db.participants
				.where('projectId')
				.equals(projectId)
				.toArray();
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
				throw new Error(`Participant name must be ${get().maxParticipantNameLength} characters or fewer`);
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

			const getRootIdByCategoryName = (categoryName) => {
				const match = categories.find((c) => c.name === categoryName);
				if (!match) return null;
				return useCategoryStore.getState().getRootCategoryId(match.id, categories);
			};

			const rootId = getRootIdByCategoryName(participantData.category);
			if (rootId) {
				const isDuplicate = participants.some((p) => {
					if (p.name !== name) return false;
					const pRootId = getRootIdByCategoryName(p.category);
					return pRootId === rootId;
				});
				if (isDuplicate) {
					throw new Error('Participant name must be unique within its category tree');
				}
			}

			const now = new Date().toISOString();
			const id = uuidv4();
			const newParticipant = {
				id,
				...participantData,
				createdAt: now,
				modifiedAt: now,
			};

			await db.participants.add(newParticipant);
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
				throw new Error(`Participant name must be ${get().maxParticipantNameLength} characters or fewer`);
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

			const getRootIdByCategoryName = (catName) => {
				const match = categories.find((c) => c.name === catName);
				if (!match) return null;
				return useCategoryStore.getState().getRootCategoryId(match.id, categories);
			};

			const rootId = getRootIdByCategoryName(categoryName);
			if (rootId) {
				const isDuplicate = participants.some((p) => {
					if (p.id === participant.id) return false;
					if (p.name !== name) return false;
					const pRootId = getRootIdByCategoryName(p.category);
					return pRootId === rootId;
				});
				if (isDuplicate) {
					throw new Error('Participant name must be unique within its category tree');
				}
			}

			const updatedParticipant = {
				...participant,
				...updates,
				modifiedAt: new Date().toISOString(),
			};

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

	// Import participants from JSON with category creation
	importParticipants: async (projectId, participantsData) => {
		try {
			const now = new Date().toISOString();

			// First, collect all unique category paths from participants
			const categoryPaths = new Set();
			participantsData.forEach((p) => {
				if (p.fullPath) {
					categoryPaths.add(p.fullPath);
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
			categories.forEach((cat) => {
				const fullPath = useCategoryStore.getState().buildCategoryPath(cat.id, categories);
				categoryPathMap.set(fullPath, cat.name);
			});

			// Create participants
			const participantsToImport = participantsData.map((p) => {
				// Find category name from fullPath
				const categoryName = p.fullPath ? categoryPathMap.get(p.fullPath) : p.category;

				return {
					id: uuidv4(),
					name: p.name,
					category: categoryName || 'Unknown',
					projectId,
					createdAt: now,
					modifiedAt: now,
				};
			});

			const existingParticipants = await db.participants
				.where('projectId')
				.equals(projectId)
				.toArray();

			const getRootIdByCategoryName = (catName) => {
				const match = categories.find((c) => c.name === catName);
				if (!match) return null;
				return useCategoryStore.getState().getRootCategoryId(match.id, categories);
			};

			const existingNamesByRoot = new Map();
			existingParticipants.forEach((p) => {
				const rootId = getRootIdByCategoryName(p.category);
				if (!rootId) return;
				if (!existingNamesByRoot.has(rootId)) {
					existingNamesByRoot.set(rootId, new Set());
				}
				existingNamesByRoot.get(rootId).add(p.name);
			});

			participantsToImport.forEach((p) => {
				const name = p.name?.trim() || '';
				if (!name) {
					throw new Error('Participant name is required');
				}
				if (!/^[A-Za-z0-9]+$/.test(name)) {
					throw new Error('Participant name must contain only letters and numbers');
				}
				if (name.length > get().maxParticipantNameLength) {
					throw new Error(`Participant name must be ${get().maxParticipantNameLength} characters or fewer`);
				}
				const rootId = getRootIdByCategoryName(p.category);
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
			const participants = await db.participants
				.where('projectId')
				.equals(projectId)
				.toArray();

			const categories = await db.categories.where('projectId').equals(projectId).toArray();

			// Build category path map
			const categoryPathMap = new Map();
			categories.forEach((cat) => {
				const fullPath = useCategoryStore.getState().buildCategoryPath(cat.id, categories);
				categoryPathMap.set(cat.name, fullPath);
			});

			// Export participants with full category paths
			return participants.map((participant) => ({
				name: participant.name,
				fullPath: categoryPathMap.get(participant.category) || participant.category,
			}));
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
}));
