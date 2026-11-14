import { create } from 'zustand';

const KEEP = 50;

/**
 * Changes committed outside the UI's own stores (the desktop CLI endpoint, src/lib/automation). Screens that show
 * project data reload when `version` moves; `changes` keeps the latest entries so a screen can tell whether its own
 * project or dialogue was touched since the version it last handled.
 */
export const useExternalChangeStore = create((set) => ({
	version: 0,
	changes: [],
	notify: (projectId, dialogueIds = []) => set((state) => {
		const version = state.version + 1;
		return { version, changes: [...state.changes, { version, projectId, dialogueIds }].slice(-KEEP) };
	}),
}));

/** Changes newer than `sinceVersion`, optionally limited to one project. */
export function externalChangesSince(sinceVersion, projectId) {
	return useExternalChangeStore.getState().changes.filter((change) => change.version > sinceVersion && (!projectId || change.projectId === projectId));
}
