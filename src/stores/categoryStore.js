import { create } from 'zustand';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/toaster';
import { useSyncStore } from '@/stores/syncStore';

export const useCategoryStore = create((set, get) => ({
	categories: [],
	isLoading: false,
	maxCategoryDepth: 5,
	maxCategoryNameLength: 16,

	isCategoryNameValid: (name) => {
		if (!name) return false;
		if (!/^[A-Za-z0-9]+$/.test(name)) return false;
		if (name.length > get().maxCategoryNameLength) return false;
		return true;
	},

	getRootCategoryId: (categoryId, categoriesList) => {
		let currentId = categoryId;
		const visited = new Set();
		while (currentId) {
			if (visited.has(currentId)) return null;
			visited.add(currentId);
			const current = categoriesList.find((c) => c.id === currentId);
			if (!current) return null;
			if (!current.parentCategoryId) return current.id;
			currentId = current.parentCategoryId;
		}
		return null;
	},

	isNameUniqueInTree: (name, rootId, categoriesList, excludeId = null) => {
		if (!rootId) return true;
		const stack = [rootId];
		const visited = new Set();

		while (stack.length > 0) {
			const currentId = stack.pop();
			if (!currentId || visited.has(currentId)) continue;
			visited.add(currentId);
			const current = categoriesList.find((c) => c.id === currentId);
			if (!current) continue;
			if (current.id !== excludeId && current.name === name) {
				return false;
			}
			categoriesList
				.filter((c) => c.parentCategoryId === current.id)
				.forEach((child) => stack.push(child.id));
		}

		return true;
	},

	getCategoryDepth: (categoryId, categoriesList) => {
		let depth = 0;
		let currentId = categoryId;
		const visited = new Set();

		while (currentId) {
			if (visited.has(currentId)) {
				return Number.POSITIVE_INFINITY;
			}
			visited.add(currentId);
			const current = categoriesList.find((c) => c.id === currentId);
			if (!current) break;
			depth += 1;
			currentId = current.parentCategoryId || null;
		}

		return depth;
	},

	getMaxSubtreeDepth: (categoryId, categoriesList) => {
		const childrenByParent = new Map();
		categoriesList.forEach((category) => {
			const parentId = category.parentCategoryId || null;
			if (!childrenByParent.has(parentId)) {
				childrenByParent.set(parentId, []);
			}
			childrenByParent.get(parentId).push(category.id);
		});

		const visited = new Set();

		const dfs = (nodeId) => {
			if (visited.has(nodeId)) return 0;
			visited.add(nodeId);
			const children = childrenByParent.get(nodeId) || [];
			if (children.length === 0) return 1;
			let maxChildDepth = 0;
			children.forEach((childId) => {
				maxChildDepth = Math.max(maxChildDepth, dfs(childId));
			});
			return 1 + maxChildDepth;
		};

		return dfs(categoryId);
	},

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
			const name = categoryData.name?.trim() || '';
			if (!name) {
				throw new Error('Category name is required');
			}
			if (!/^[A-Za-z0-9]+$/.test(name)) {
				throw new Error('Category name must contain only letters and numbers');
			}
			if (name.length > get().maxCategoryNameLength) {
				throw new Error(`Category name must be ${get().maxCategoryNameLength} characters or fewer`);
			}

			const categories = await db.categories
				.where('projectId')
				.equals(categoryData.projectId)
				.toArray();
			const maxDepth = get().maxCategoryDepth;
			if (categoryData.parentCategoryId) {
				const parentDepth = get().getCategoryDepth(categoryData.parentCategoryId, categories);
				if (!Number.isFinite(parentDepth) || parentDepth + 1 > maxDepth) {
					throw new Error(`Category depth cannot exceed ${maxDepth} levels.`);
				}
			}
			const parentRootId = categoryData.parentCategoryId
				? get().getRootCategoryId(categoryData.parentCategoryId, categories)
				: null;
			const rootId = parentRootId || null;
			const isUnique = rootId
				? get().isNameUniqueInTree(categoryData.name, rootId, categories)
				: !categories.some(
					(cat) => !cat.parentCategoryId && cat.name === categoryData.name
				);
			if (!isUnique) {
				throw new Error('Category name must be unique within its tree.');
			}

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

			const name = (updates.name ?? category.name)?.trim() || '';
			if (!name) {
				throw new Error('Category name is required');
			}
			if (!/^[A-Za-z0-9]+$/.test(name)) {
				throw new Error('Category name must contain only letters and numbers');
			}
			if (name.length > get().maxCategoryNameLength) {
				throw new Error(`Category name must be ${get().maxCategoryNameLength} characters or fewer`);
			}

			const categories = await db.categories
				.where('projectId')
				.equals(category.projectId)
				.toArray();
			const maxDepth = get().maxCategoryDepth;
			const newParentId =
				updates.parentCategoryId === undefined ? category.parentCategoryId : updates.parentCategoryId;
			const newName = updates.name === undefined ? category.name : updates.name;

			const parentDepth = newParentId
				? get().getCategoryDepth(newParentId, categories)
				: 0;
			const subtreeDepth = get().getMaxSubtreeDepth(category.id, categories);
			const totalDepth = parentDepth + subtreeDepth;

			if (!Number.isFinite(parentDepth) || totalDepth > maxDepth) {
				throw new Error(`Category depth cannot exceed ${maxDepth} levels.`);
			}
			const parentRootId = newParentId
				? get().getRootCategoryId(newParentId, categories)
				: null;
			const rootId = parentRootId || category.id;
			const isUnique = get().isNameUniqueInTree(newName, rootId, categories, category.id);
			if (!isUnique) {
				throw new Error('Category name must be unique within its tree.');
			}
			if (!newParentId) {
				const existingRoot = categories.find(
					(cat) => cat.id !== category.id && !cat.parentCategoryId && cat.name === newName
				);
				if (existingRoot) {
					throw new Error('Category name must be unique within its tree.');
				}
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
			const maxDepth = get().maxCategoryDepth;
			const rootNameSets = new Map();
			const getRootNameSet = (rootName) => {
				if (!rootNameSets.has(rootName)) {
					rootNameSets.set(rootName, new Set());
				}
				return rootNameSets.get(rootName);
			};

			const existingRoots = existingCategories.filter((cat) => !cat.parentCategoryId);
			existingRoots.forEach((root) => {
				const rootSet = getRootNameSet(root.name);
				rootSet.add(root.name);
				existingCategories.forEach((cat) => {
					if (get().getRootCategoryId(cat.id, existingCategories) === root.id) {
						rootSet.add(cat.name);
					}
				});
			});

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
				if (pathParts.length > maxDepth) {
					throw new Error(`Category depth cannot exceed ${maxDepth} levels.`);
				}
				const rootName = pathParts[0];
				const rootSet = getRootNameSet(rootName);
				for (let i = 0; i < pathParts.length; i++) {
					const name = pathParts[i];
					if (!/^[A-Za-z0-9]+$/.test(name)) {
						throw new Error('Category name must contain only letters and numbers');
					}
					if (name.length > get().maxCategoryNameLength) {
						throw new Error(`Category name must be ${get().maxCategoryNameLength} characters or fewer`);
					}
					if (rootSet.has(name) && !(i === 0 && name === rootName)) {
						throw new Error('Category name must be unique within its tree.');
					}
					rootSet.add(name);
				}
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
