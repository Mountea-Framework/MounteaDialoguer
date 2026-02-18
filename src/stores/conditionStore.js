import { create } from 'zustand';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/toaster';
import { useSyncStore } from '@/stores/syncStore';

export const useConditionStore = create((set, get) => ({
	conditions: [],
	isLoading: false,

	loadConditions: async (projectId) => {
		set({ isLoading: true });
		try {
			const conditions = await db.conditions.where('projectId').equals(projectId).toArray();
			set({ conditions, isLoading: false });
		} catch (error) {
			console.error('Failed to load conditions:', error);
			toast({
				variant: 'error',
				title: 'Failed to Load Conditions',
				description: error.message || 'An unexpected error occurred',
			});
			set({ isLoading: false });
		}
	},

	createCondition: async (conditionData) => {
		try {
			const now = new Date().toISOString();
			const id = uuidv4();
			const newCondition = {
				id,
				...conditionData,
				createdAt: now,
				modifiedAt: now,
			};

			await db.conditions.add(newCondition);
			await get().loadConditions(conditionData.projectId);
			useSyncStore.getState().schedulePush(conditionData.projectId);
			toast({
				variant: 'success',
				title: 'Condition Created',
				description: `${conditionData.name} has been created successfully`,
			});
			return newCondition;
		} catch (error) {
			console.error('Error creating condition:', error);
			toast({
				variant: 'error',
				title: 'Failed to Create Condition',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	updateCondition: async (id, updates) => {
		try {
			const condition = await db.conditions.get(id);
			if (!condition) {
				throw new Error('Condition not found');
			}

			const updatedCondition = {
				...condition,
				...updates,
				modifiedAt: new Date().toISOString(),
			};

			await db.conditions.update(id, updatedCondition);
			await get().loadConditions(condition.projectId);
			useSyncStore.getState().schedulePush(condition.projectId);
			toast({
				variant: 'success',
				title: 'Condition Updated',
				description: 'Condition has been updated successfully',
			});
			return updatedCondition;
		} catch (error) {
			console.error('Error updating condition:', error);
			toast({
				variant: 'error',
				title: 'Failed to Update Condition',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	deleteCondition: async (id) => {
		try {
			const condition = await db.conditions.get(id);
			if (!condition) {
				throw new Error('Condition not found');
			}

			await db.conditions.delete(id);
			await get().loadConditions(condition.projectId);
			useSyncStore.getState().schedulePush(condition.projectId);
			toast({
				variant: 'success',
				title: 'Condition Deleted',
				description: 'Condition has been deleted',
			});
		} catch (error) {
			console.error('Error deleting condition:', error);
			toast({
				variant: 'error',
				title: 'Failed to Delete Condition',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	importConditions: async (projectId, conditionsData) => {
		try {
			const now = new Date().toISOString();
			const conditionsToImport = conditionsData.map((condition) => ({
				...condition,
				id: uuidv4(),
				projectId,
				createdAt: now,
				modifiedAt: now,
			}));

			await db.conditions.bulkAdd(conditionsToImport);
			await get().loadConditions(projectId);
			useSyncStore.getState().schedulePush(projectId);
			toast({
				variant: 'success',
				title: 'Conditions Imported',
				description: `${conditionsToImport.length} conditions have been imported`,
			});
			return conditionsToImport;
		} catch (error) {
			console.error('Error importing conditions:', error);
			toast({
				variant: 'error',
				title: 'Failed to Import Conditions',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	exportConditions: async (projectId) => {
		try {
			const conditions = await db.conditions.where('projectId').equals(projectId).toArray();
			return conditions.map((condition) => {
				const exported = { ...condition };
				delete exported.id;
				delete exported.projectId;
				delete exported.createdAt;
				delete exported.modifiedAt;
				return exported;
			});
		} catch (error) {
			console.error('Error exporting conditions:', error);
			toast({
				variant: 'error',
				title: 'Failed to Export Conditions',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},
}));
