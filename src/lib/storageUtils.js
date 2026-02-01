import { db } from './db';

/**
 * Calculate the estimated size of IndexedDB storage
 * Uses StorageManager API when available
 */
export async function calculateDiskUsage() {
	try {
		// Try using StorageManager API if available
		if ('storage' in navigator && 'estimate' in navigator.storage) {
			const estimate = await navigator.storage.estimate();
			return estimate.usage || 0;
		}

		// Fallback: Estimate based on data size
		return await estimateDataSize();
	} catch (error) {
		console.error('Error calculating disk usage:', error);
		return 0;
	}
}

/**
 * Estimate data size by counting records and approximating
 */
async function estimateDataSize() {
	try {
		const [
			projectCount,
			dialogueCount,
			nodeCount,
			edgeCount,
			participantCount,
			categoryCount,
			decoratorCount,
		] = await Promise.all([
			db.projects.count(),
			db.dialogues.count(),
			db.nodes.count(),
			db.edges.count(),
			db.participants.count(),
			db.categories.count(),
			db.decorators.count(),
		]);

		// Rough estimates (in bytes):
		// Project: ~500 bytes
		// Dialogue: ~300 bytes
		// Node: ~200 bytes
		// Edge: ~100 bytes
		// Participant/Category/Decorator: ~150 bytes each

		const estimatedSize =
			projectCount * 500 +
			dialogueCount * 300 +
			nodeCount * 200 +
			edgeCount * 100 +
			(participantCount + categoryCount + decoratorCount) * 150;

		return estimatedSize;
	} catch (error) {
		console.error('Error estimating data size:', error);
		return 0;
	}
}

/**
 * Calculate size of a specific project including all related data
 */
export async function calculateProjectSize(projectId) {
	try {
		// Get all dialogues for this project
		const dialogues = await db.dialogues.where('projectId').equals(projectId).toArray();
		const dialogueIds = dialogues.map((d) => d.id);

		// Count nodes and edges for these dialogues
		let nodeCount = 0;
		let edgeCount = 0;

		for (const dialogueId of dialogueIds) {
			const nodes = await db.nodes.where('dialogueId').equals(dialogueId).count();
			const edges = await db.edges.where('dialogueId').equals(dialogueId).count();
			nodeCount += nodes;
			edgeCount += edges;
		}

		// Count project-specific data
		const participantCount = await db.participants
			.where('projectId')
			.equals(projectId)
			.count();
		const categoryCount = await db.categories.where('projectId').equals(projectId).count();
		const decoratorCount = await db.decorators.where('projectId').equals(projectId).count();

		// Calculate estimated size
		const estimatedSize =
			500 + // Project itself
			dialogues.length * 300 +
			nodeCount * 200 +
			edgeCount * 100 +
			(participantCount + categoryCount + decoratorCount) * 150;

		return estimatedSize;
	} catch (error) {
		console.error('Error calculating project size:', error);
		return 0;
	}
}

/**
 * Calculate size of a specific dialogue including nodes and edges
 */
export async function calculateDialogueSize(dialogueId) {
	try {
		const nodeCount = await db.nodes.where('dialogueId').equals(dialogueId).count();
		const edgeCount = await db.edges.where('dialogueId').equals(dialogueId).count();

		// Dialogue + nodes + edges
		const estimatedSize = 300 + nodeCount * 200 + edgeCount * 100;

		return estimatedSize;
	} catch (error) {
		console.error('Error calculating dialogue size:', error);
		return 0;
	}
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
