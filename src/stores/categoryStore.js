import { create } from 'zustand';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/toaster';
import { useSyncStore } from '@/stores/syncStore';

export const useCategoryStore = create((set, get) => ({
	categories: [],
	isLoading: false,

	// Load categories for a specific project
	loadCategories: async (projectId) => {
		set({ isLoading: true });
		try {
			const categories = await db.categories
				.where('projectId')
				.equals(projectId)
				.toArray();
			set({ categories, isLoading: false });
		} catch (error) {
			console.error('Failed to load categories:', error);
			toast({
				variant: 'error',
				title: 'Failed to Load Categories',
				description: error.message || 'An unexpected error occurred',
			});
			set({ isLoading: false });
		}
	},

	// Create a new category
	createCategory: async (categoryData) => {
		try {
			const now = new Date().toISOString();
			const id = uuidv4();
			const newCategory = {
				id,
				...categoryData,
				createdAt: now,
				modifiedAt: now,
			};

			await db.categories.add(newCategory);
			await get().loadCategories(categoryData.projectId);
			useSyncStore.getState().schedulePush(categoryData.projectId);
			toast({
				variant: 'success',
				title: 'Category Created',
				description: `${categoryData.name} has been created successfully`,
			});
			return newCategory;
		} catch (error) {
			console.error('Error creating category:', error);
			toast({
				variant: 'error',
				title: 'Failed to Create Category',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	// Update a category
	updateCategory: async (id, updates) => {
		try {
			const category = await db.categories.get(id);
			if (!category) {
				throw new Error('Category not found');
			}

			const updatedCategory = {
				...category,
				...updates,
				modifiedAt: new Date().toISOString(),
			};

			await db.categories.update(id, updatedCategory);
			await get().loadCategories(category.projectId);
			useSyncStore.getState().schedulePush(category.projectId);
			toast({
				variant: 'success',
				title: 'Category Updated',
				description: 'Category has been updated successfully',
			});
			return updatedCategory;
		} catch (error) {
			console.error('Error updating category:', error);
			toast({
				variant: 'error',
				title: 'Failed to Update Category',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	// Delete a category
	deleteCategory: async (id) => {
		try {
			const category = await db.categories.get(id);
			if (!category) {
				throw new Error('Category not found');
			}

			await db.categories.delete(id);
			await get().loadCategories(category.projectId);
			useSyncStore.getState().schedulePush(category.projectId);
			toast({
				variant: 'success',
				title: 'Category Deleted',
				description: 'Category has been deleted',
			});
		} catch (error) {
			console.error('Error deleting category:', error);
			toast({
				variant: 'error',
				title: 'Failed to Delete Category',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	// Import categories from JSON with full paths
	importCategories: async (projectId, categoriesData) => {
		try {
			const now = new Date().toISOString();
			const existingCategories = await db.categories
				.where('projectId')
				.equals(projectId)
				.toArray();

			// Map to track created categories by full path
			const categoryMap = new Map();

			// Add existing categories to map
			existingCategories.forEach((cat) => {
				const fullPath = get().buildCategoryPath(cat.id, existingCategories);
				categoryMap.set(fullPath, cat.id);
			});

			const createdCategories = [];

			// Process each category from import
			for (const catData of categoriesData) {
				const fullPath = catData.fullPath || catData.name;

				// Skip if already exists
				if (categoryMap.has(fullPath)) {
					continue;
				}

				// Split path and create hierarchy
				const pathParts = fullPath.split('.');
				let currentPath = '';
				let parentId = null;

				for (let i = 0; i < pathParts.length; i++) {
					const part = pathParts[i];
					currentPath = currentPath ? `${currentPath}.${part}` : part;

					// Check if this path segment already exists
					if (categoryMap.has(currentPath)) {
						parentId = categoryMap.get(currentPath);
						continue;
					}

					// Create new category
					const newCategory = {
						id: uuidv4(),
						name: part,
						parentCategoryId: parentId,
						projectId,
						createdAt: now,
						modifiedAt: now,
					};

					await db.categories.add(newCategory);
					categoryMap.set(currentPath, newCategory.id);
					createdCategories.push(newCategory);
					parentId = newCategory.id;
				}
			}

			await get().loadCategories(projectId);
			useSyncStore.getState().schedulePush(projectId);
			toast({
				variant: 'success',
				title: 'Categories Imported',
				description: `${createdCategories.length} categories have been imported`,
			});
			return createdCategories;
		} catch (error) {
			console.error('Error importing categories:', error);
			toast({
				variant: 'error',
				title: 'Failed to Import Categories',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	// Build full path for a category
	buildCategoryPath: (categoryId, categoriesList) => {
		const path = [];
		let current = categoriesList.find((c) => c.id === categoryId);
		while (current) {
			path.unshift(current.name);
			current = categoriesList.find((c) => c.id === current.parentCategoryId);
		}
		return path.join('.');
	},

	// Export categories to JSON with full paths
	exportCategories: async (projectId) => {
		try {
			const categories = await db.categories
				.where('projectId')
				.equals(projectId)
				.toArray();

			// Build full paths for each category
			return categories.map((category) => ({
				name: category.name,
				fullPath: get().buildCategoryPath(category.id, categories),
			}));
		} catch (error) {
			console.error('Error exporting categories:', error);
			toast({
				variant: 'error',
				title: 'Failed to Export Categories',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},
}));
