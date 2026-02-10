import { create } from 'zustand';

/**
 * Command Palette Store
 * Controls global command palette and allows contextual actions.
 */
export const useCommandPaletteStore = create((set) => ({
	open: false,
	actions: null,
	placeholder: null,

	openWithActions: ({ actions, placeholder } = {}) =>
		set({
			open: true,
			actions: actions || null,
			placeholder: placeholder || null,
		}),

	setOpen: (open) =>
		set((state) =>
			open
				? { ...state, open: true }
				: { open: false, actions: null, placeholder: null }
		),
}));
