import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { buildProfileScopedKey } from '@/lib/profile/activeProfile';

const NOOP_PROFILE_STORAGE = Object.freeze({
	getItem: () => null,
	setItem: () => {},
	removeItem: () => {},
});

const profileScopedUiStorage = createJSONStorage(() => {
	if (typeof window === 'undefined' || !window.localStorage) {
		return NOOP_PROFILE_STORAGE;
	}

	return {
		getItem: (name) => {
			const key = buildProfileScopedKey(name);
			return window.localStorage.getItem(key);
		},
		setItem: (name, value) => {
			const key = buildProfileScopedKey(name);
			window.localStorage.setItem(key, value);
		},
		removeItem: (name) => {
			const key = buildProfileScopedKey(name);
			window.localStorage.removeItem(key);
		},
	};
});

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
			contentLocaleByProject: {},

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
			setProjectContentLocale: (projectId, locale) =>
				set((state) => ({
					contentLocaleByProject: {
						...state.contentLocaleByProject,
						[String(projectId || '')]: String(locale || ''),
					},
				})),
			clearProjectContentLocale: (projectId) =>
				set((state) => {
					const next = { ...state.contentLocaleByProject };
					delete next[String(projectId || '')];
					return { contentLocaleByProject: next };
				}),
		}),
		{
			name: 'mountea-dialoguer-ui',
			storage: profileScopedUiStorage,
		}
	)
);
