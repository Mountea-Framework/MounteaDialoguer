import { create } from 'zustand';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/toaster';

export const useDecoratorStore = create((set, get) => ({
	decorators: [],
	isLoading: false,

	// Load decorators for a specific project
	loadDecorators: async (projectId) => {
		set({ isLoading: true });
		try {
			const decorators = await db.decorators
				.where('projectId')
				.equals(projectId)
				.toArray();
			set({ decorators, isLoading: false });
		} catch (error) {
			console.error('Failed to load decorators:', error);
			toast({
				variant: 'error',
				title: 'Failed to Load Decorators',
				description: error.message || 'An unexpected error occurred',
			});
			set({ isLoading: false });
		}
	},

	// Create a new decorator
	createDecorator: async (decoratorData) => {
		try {
			const now = new Date().toISOString();
			const id = uuidv4();
			const newDecorator = {
				id,
				...decoratorData,
				createdAt: now,
				modifiedAt: now,
			};

			await db.decorators.add(newDecorator);
			await get().loadDecorators(decoratorData.projectId);
			toast({
				variant: 'success',
				title: 'Decorator Created',
				description: `${decoratorData.name} has been created successfully`,
			});
			return newDecorator;
		} catch (error) {
			console.error('Error creating decorator:', error);
			toast({
				variant: 'error',
				title: 'Failed to Create Decorator',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	// Update a decorator
	updateDecorator: async (id, updates) => {
		try {
			const decorator = await db.decorators.get(id);
			if (!decorator) {
				throw new Error('Decorator not found');
			}

			const updatedDecorator = {
				...decorator,
				...updates,
				modifiedAt: new Date().toISOString(),
			};

			await db.decorators.update(id, updatedDecorator);
			await get().loadDecorators(decorator.projectId);
			toast({
				variant: 'success',
				title: 'Decorator Updated',
				description: 'Decorator has been updated successfully',
			});
			return updatedDecorator;
		} catch (error) {
			console.error('Error updating decorator:', error);
			toast({
				variant: 'error',
				title: 'Failed to Update Decorator',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	// Delete a decorator
	deleteDecorator: async (id) => {
		try {
			const decorator = await db.decorators.get(id);
			if (!decorator) {
				throw new Error('Decorator not found');
			}

			await db.decorators.delete(id);
			await get().loadDecorators(decorator.projectId);
			toast({
				variant: 'success',
				title: 'Decorator Deleted',
				description: 'Decorator has been deleted',
			});
		} catch (error) {
			console.error('Error deleting decorator:', error);
			toast({
				variant: 'error',
				title: 'Failed to Delete Decorator',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	// Import decorators from JSON
	importDecorators: async (projectId, decoratorsData) => {
		try {
			const now = new Date().toISOString();
			const decoratorsToImport = decoratorsData.map((d) => ({
				...d,
				id: uuidv4(),
				projectId,
				createdAt: now,
				modifiedAt: now,
			}));

			await db.decorators.bulkAdd(decoratorsToImport);
			await get().loadDecorators(projectId);
			toast({
				variant: 'success',
				title: 'Decorators Imported',
				description: `${decoratorsToImport.length} decorators have been imported`,
			});
			return decoratorsToImport;
		} catch (error) {
			console.error('Error importing decorators:', error);
			toast({
				variant: 'error',
				title: 'Failed to Import Decorators',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	// Export decorators to JSON
	exportDecorators: async (projectId) => {
		try {
			const decorators = await db.decorators
				.where('projectId')
				.equals(projectId)
				.toArray();

			// Remove projectId and timestamps for clean export
			return decorators.map(({ id, projectId, createdAt, modifiedAt, ...rest }) => rest);
		} catch (error) {
			console.error('Error exporting decorators:', error);
			toast({
				variant: 'error',
				title: 'Failed to Export Decorators',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},
}));
