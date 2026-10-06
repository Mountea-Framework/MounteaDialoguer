import { getRepositoryContext } from './db';
import { buildProjectSnapshot } from './sync/snapshot';

/** Origin usage includes databases, indexes and caches; it is not project payload size. */
export async function calculateDiskUsage() {
 try { return (await navigator.storage?.estimate?.())?.usage ?? null; }
 catch { return null; }
}

export function serializedPayloadBytes(payload) {
 return new TextEncoder().encode(JSON.stringify(payload)).byteLength;
}

/** Canonical UTF-8 JSON with encoded media, strings and all unused definitions.
 * This is a payload estimate, not ZIP size or allocated IndexedDB disk usage. */
export async function calculateProjectSize(projectId) {
 return serializedPayloadBytes(await buildProjectSnapshot(projectId));
}

export async function calculateDialogueSize(dialogueId) {
 const context = await getRepositoryContext();
 const dialogue = await context.db.dialogues.get(dialogueId);
 if (!dialogue) return 0;
 const snapshot = await buildProjectSnapshot(dialogue.projectId, { context });
 snapshot.dialogues = snapshot.dialogues.filter((row) => row.id === dialogueId);
 for (const table of ['nodes', 'edges']) snapshot[table] = snapshot[table].filter((row) => row.dialogueId === dialogueId);
 snapshot.localizedStrings = snapshot.localizedStrings.filter((row) => !row.dialogueId || row.dialogueId === dialogueId);
 context.assertCurrent();
 return serializedPayloadBytes(snapshot);
}

/**
 * Get storage quota information
 */
export async function getStorageQuota() {
	try {
		if ('storage' in navigator && 'estimate' in navigator.storage) {
			const estimate = await navigator.storage.estimate();
			return {
				usage: estimate.usage || 0,
				quota: estimate.quota || 0,
				percentUsed:
					estimate.quota > 0 ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
			};
		}
		return null;
	} catch (error) {
		console.error('Error getting storage quota:', error);
		return null;
	}
}
