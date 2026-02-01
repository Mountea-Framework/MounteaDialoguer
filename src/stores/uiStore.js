import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * UI Store
 * Manages UI state like sidebar visibility, view modes, etc.
 */
export const useUIStore = create(
	persist(
		(set) => ({
			sidebarOpen: true,
			viewMode: 'grid',
			sortBy: 'modifiedAt',
			sortOrder: 'desc',

			/**
			 * Toggle sidebar visibility
			 */
			toggleSidebar: () =>
				set((state) => ({ sidebarOpen: !state.sidebarOpen })),

			/**
			 * Set sidebar state
			 */
			setSidebarOpen: (open) => set({ sidebarOpen: open }),

			/**
			 * Set view mode (grid or list)
			 */
			setViewMode: (mode) => set({ viewMode: mode }),

			/**
			 * Set sort preferences
			 */
			setSortBy: (sortBy) => set({ sortBy }),
			setSortOrder: (sortOrder) => set({ sortOrder }),
		}),
		{
			name: 'mountea-dialoguer-ui',
		}
	)
);
