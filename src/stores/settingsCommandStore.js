import { create } from 'zustand';

/**
 * Settings Command Store
 * Controls the shortcuts command dialog triggered from settings buttons.
 */
export const useSettingsCommandStore = create((set) => ({
	open: false,
	context: null,
	onOpenSettings: null,
	mode: 'list',

	openWithContext: ({ context, onOpenSettings, mode } = {}) =>
		set({
			open: true,
			context: context || null,
			onOpenSettings: onOpenSettings || null,
			mode: mode || 'list',
		}),

	setMode: (mode) => set({ mode }),

	setOpen: (open) =>
		set((state) =>
			open
				? { ...state, open: true }
				: { open: false, context: null, onOpenSettings: null, mode: 'list' }
		),

	close: () => set({ open: false, context: null, onOpenSettings: null, mode: 'list' }),
}));
