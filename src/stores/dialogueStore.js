import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { toast } from '@/components/ui/toaster';
import { useSyncStore } from '@/stores/syncStore';
import {
	DEFAULT_LOCALE,
	buildStringTableV2Payload,
	ensureDialogueLocalizationSlug,
	filterLocalizedEntriesByDialogue,
	materializeLocalizedNodes,
	normalizeLocaleTag,
	normalizeProjectLocalizationConfig,
	parseImportedStringTableData,
	prepareLocalizedNodesAndEntries,
	remapLocalizedEntriesForImportedDialogue,
	validateLocalizedEntriesForDialogue,
} from '@/lib/localization/stringTable';

const normalizeDialogueRow = (row = {}) => ({
	...row,
	id: row.id || uuidv4(),
	text: row.text || '',
	duration: typeof row.duration === 'number' ? row.duration : 3.0,
	audioFile: row.audioFile || null,
});

const normalizeDialogueRows = (rows = []) => rows.map((row) => normalizeDialogueRow(row));

function stripLocalizedTextFromNodeData(nodeData = {}) {
	const nextData = { ...(nodeData || {}) };
	if (nextData.displayNameKey) {
		delete nextData.displayName;
	}
	if (nextData.selectionTitleKey) {
		delete nextData.selectionTitle;
	}
	if (Array.isArray(nextData.dialogueRows)) {
		nextData.dialogueRows = nextData.dialogueRows.map((row) => {
			const nextRow = { ...(row || {}) };
			if (nextRow.textKey) {
				delete nextRow.text;
			}
			return nextRow;
		});
	}
	return nextData;
}

function getProjectLocalizationState(project) {
	const localization = normalizeProjectLocalizationConfig(project?.localization || {});
	return {
		defaultLocale: localization.defaultLocale || DEFAULT_LOCALE,
		supportedLocales: localization.supportedLocales || [DEFAULT_LOCALE],
	};
}

async function loadDialogueLocalizedEntries(projectId, dialogueId) {
	const allEntries = await db.localizedStrings.where('projectId').equals(projectId).toArray();
	return filterLocalizedEntriesByDialogue(allEntries, dialogueId);
}

function stripLocalizedTextFromRows(rows = []) {
	return normalizeDialogueRows(rows).map((row) => {
		const next = { ...row };
		delete next.text;
		return next;
	});
}

function buildPersistedNodesWithoutLocalizedText(nodes = [], dialogueId = '') {
	return (nodes || []).map((node) => ({
		...node,
		dialogueId,
		data: stripLocalizedTextFromNodeData(node?.data || {}),
	}));
}

function summarizeLocalizationValidationErrors(errors = [], limit = 3) {
	if (!Array.isArray(errors) || errors.length === 0) {
		return 'unknown localization validation error';
	}
	const parts = errors.slice(0, limit).map((error) => {
		const type = String(error?.type || 'unknown');
		const key = String(error?.key || '').trim();
		return key ? `${type} (${key})` : type;
	});
	const remainder = errors.length - parts.length;
	return remainder > 0 ? `${parts.join(', ')} (+${remainder} more)` : parts.join(', ');
}

async function ensureDialogueLocalizationMetadata(dialogue = null) {
	if (!dialogue?.id) return dialogue;
	const nextSlug = ensureDialogueLocalizationSlug(dialogue);
	const nextVersion = 2;
	const shouldUpdate =
		String(dialogue.localizationSlug || '').trim() !== nextSlug ||
		Number(dialogue.localizationVersion || 0) < nextVersion;
	if (!shouldUpdate) return dialogue;
	await db.dialogues.update(dialogue.id, {
		localizationSlug: nextSlug,
		localizationVersion: nextVersion,
		modifiedAt: new Date().toISOString(),
	});
	return {
		...dialogue,
		localizationSlug: nextSlug,
		localizationVersion: nextVersion,
	};
}

/**
 * Dialogue Store
 * Manages dialogues, nodes, and edges state
 */
export const useDialogueStore = create((set, get) => ({
	dialogues: [],
	currentDialogue: null,
	nodes: [],
	edges: [],
	isLoading: false,
	error: null,

	/**
	 * Load dialogues for a project (or all dialogues if no projectId)
	 */
	loadDialogues: async (projectId) => {
		set({ isLoading: true, error: null });
		try {
			const dialogues = projectId
				? await db.dialogues.where('projectId').equals(projectId).toArray()
				: await db.dialogues.toArray();

			// Load node counts for each dialogue
			const dialoguesWithCounts = await Promise.all(
				dialogues.map(async (dialogue) => {
					const nodeCount = await db.nodes
						.where('dialogueId')
						.equals(dialogue.id)
						.count();
					return { ...dialogue, nodeCount };
				})
			);

			set({ dialogues: dialoguesWithCounts, isLoading: false });
		} catch (error) {
			console.error('Error loading dialogues:', error);
			toast({
				variant: 'error',
				title: 'Failed to Load Dialogues',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
		}
	},

	/**
	 * Create a new dialogue
	 */
		createDialogue: async (dialogueData) => {
			set({ isLoading: true, error: null });
			try {
				const now = new Date().toISOString();
				const id = uuidv4();
				const localizationSlug = ensureDialogueLocalizationSlug({
					id,
					name: dialogueData?.name,
				});
				const newDialogue = {
					id,
					...dialogueData,
					localizationSlug,
					localizationVersion: 2,
					createdAt: now,
					modifiedAt: now,
				};
			await db.dialogues.add(newDialogue);
			await get().loadDialogues(dialogueData.projectId);
			useSyncStore.getState().schedulePush(dialogueData.projectId);
			toast({
				variant: 'success',
				title: 'Dialogue Created',
				description: `${dialogueData.name} has been created successfully`,
			});
			return newDialogue;
		} catch (error) {
			console.error('Error creating dialogue:', error);
			toast({
				variant: 'error',
				title: 'Failed to Create Dialogue',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Update a dialogue
	 */
	updateDialogue: async (id, updates) => {
		set({ isLoading: true, error: null });
		try {
			await db.dialogues.update(id, {
				...updates,
				modifiedAt: new Date().toISOString(),
			});
			const dialogue = await db.dialogues.get(id);
			await get().loadDialogues(dialogue.projectId);
			useSyncStore.getState().schedulePush(dialogue.projectId);
			toast({
				variant: 'success',
				title: 'Dialogue Updated',
				description: 'Dialogue has been updated successfully',
			});
		} catch (error) {
			console.error('Error updating dialogue:', error);
			toast({
				variant: 'error',
				title: 'Failed to Update Dialogue',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Delete a dialogue and all its nodes/edges
	 */
	deleteDialogue: async (id) => {
		set({ isLoading: true, error: null });
		try {
			const dialogue = await db.dialogues.get(id);
			await db.transaction('rw', [db.dialogues, db.nodes, db.edges, db.localizedStrings], async () => {
				await db.dialogues.delete(id);
				await db.nodes.where('dialogueId').equals(id).delete();
				await db.edges.where('dialogueId').equals(id).delete();
				await db.localizedStrings.where('dialogueId').equals(id).delete();
			});
			await get().loadDialogues(dialogue.projectId);
			useSyncStore.getState().schedulePush(dialogue.projectId);
			toast({
				variant: 'success',
				title: 'Dialogue Deleted',
				description: 'Dialogue and all nodes have been deleted',
			});
		} catch (error) {
			console.error('Error deleting dialogue:', error);
			toast({
				variant: 'error',
				title: 'Failed to Delete Dialogue',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Set current active dialogue and load its nodes/edges
	 */
	setCurrentDialogue: async (id) => {
		set({ isLoading: true, error: null });
		try {
			const dialogue = await db.dialogues.get(id);
			const nodes = await db.nodes.where('dialogueId').equals(id).toArray();
			const edges = await db.edges.where('dialogueId').equals(id).toArray();
			set({
				currentDialogue: dialogue,
				nodes,
				edges,
				isLoading: false
			});
		} catch (error) {
			console.error('Error setting current dialogue:', error);
			toast({
				variant: 'error',
				title: 'Failed to Load Dialogue',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Update nodes for current dialogue
	 */
	updateNodes: async (dialogueId, nodes, options = {}) => {
		const dialogue = await db.dialogues.get(dialogueId);
		const edges = await db.edges.where('dialogueId').equals(dialogueId).toArray();
		return get().saveDialogueGraph(
			dialogueId,
			nodes,
			edges,
			dialogue?.viewport || { x: 0, y: 0, zoom: 1 },
			options
		);
	},

	/**
	 * Update edges for current dialogue
	 */
	updateEdges: async (dialogueId, edges) => {
		set({ isLoading: true, error: null });
		try {
			await db.transaction('rw', db.edges, async () => {
				await db.edges.where('dialogueId').equals(dialogueId).delete();
				await db.edges.bulkAdd(
					edges.map(edge => ({ ...edge, dialogueId }))
				);
			});
			set({ edges, isLoading: false });
		} catch (error) {
			console.error('Error updating edges:', error);
			toast({
				variant: 'error',
				title: 'Failed to Update Edges',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Save both nodes and edges for a dialogue
	 */
		saveDialogueGraph: async (dialogueId, nodes, edges, viewport, options = {}) => {
			set({ isLoading: true, error: null });
			try {
				const { prepareAudioForStorage } = await import('@/lib/audioUtils');
				const dialogue = await ensureDialogueLocalizationMetadata(await db.dialogues.get(dialogueId));
				const project = dialogue?.projectId ? await db.projects.get(dialogue.projectId) : null;
				const localizationState = getProjectLocalizationState(project);
				const activeLocale = normalizeLocaleTag(
					options?.activeLocale,
					localizationState.defaultLocale
				);

				if (!dialogue?.projectId) {
					throw new Error('Dialogue has no project scope for localization.');
				}

				const existingEntries = await loadDialogueLocalizedEntries(dialogue.projectId, dialogueId);
				const prepared = prepareLocalizedNodesAndEntries({
					projectId: dialogue.projectId,
					dialogueId,
					dialogueSlug: dialogue.localizationSlug,
					nodes,
					locale: activeLocale,
					existingEntries,
				});
				const sourceNodesForPersistence = prepared.nodes;
				const localizedEntriesToUpsert = prepared.entries;

				if (prepared.diagnostics.some((item) => item.type === 'duplicate_key')) {
					throw new Error('Localization key collision detected. Please rename duplicated items.');
				}
				const validation = validateLocalizedEntriesForDialogue({
					nodes: sourceNodesForPersistence,
					entries: localizedEntriesToUpsert,
					defaultLocale: localizationState.defaultLocale,
				});
				if (!validation.valid) {
					console.error('[localization] Validation errors', validation.errors);
					throw new Error(
						`Localization integrity validation failed for this dialogue: ${summarizeLocalizationValidationErrors(
							validation.errors
						)}`
					);
				}

				// Convert audio blobs to base64 for storage
				const processedNodes = await Promise.all(
					sourceNodesForPersistence.map(async (node) => {
						if (node.data?.dialogueRows) {
							const processedRows = await Promise.all(
								node.data.dialogueRows.map(async (row) => {
									if (row.audioFile?.blob) {
										const storedAudio = await prepareAudioForStorage(row.audioFile);
										return { ...row, audioFile: storedAudio, text: undefined };
									}
									return row;
								})
							);
							return {
								...node,
								data: {
									...node.data,
									dialogueRows: stripLocalizedTextFromRows(processedRows),
								},
							};
						}
						return node;
					})
				);

				await db.transaction('rw', [db.nodes, db.edges, db.dialogues, db.localizedStrings], async () => {
					await db.localizedStrings.where('dialogueId').equals(dialogueId).delete();
					if (localizedEntriesToUpsert.length > 0) {
						await db.localizedStrings.bulkPut(localizedEntriesToUpsert);
					}

				// Delete existing nodes and edges
				await db.nodes.where('dialogueId').equals(dialogueId).delete();
				await db.edges.where('dialogueId').equals(dialogueId).delete();

				// Add new nodes and edges with processed audio.
				const persistedNodes = buildPersistedNodesWithoutLocalizedText(
					processedNodes,
					dialogueId
				);
				if (persistedNodes.length > 0) {
					await db.nodes.bulkAdd(persistedNodes);
				}
				if (edges.length > 0) {
					await db.edges.bulkAdd(
						edges.map(edge => ({ ...edge, dialogueId }))
					);
				}

					// Update dialogue modified time and viewport
					await db.dialogues.update(dialogueId, {
						modifiedAt: new Date().toISOString(),
						viewport: viewport || { x: 0, y: 0, zoom: 1 },
						localizationSlug: dialogue.localizationSlug,
						localizationVersion: 2,
					});
				});
			set({ nodes, edges, isLoading: false });
			if (dialogue?.projectId) {
				useSyncStore.getState().schedulePush(dialogue.projectId);
			}
		} catch (error) {
			console.error('Error saving dialogue graph:', error);
			toast({
				variant: 'error',
				title: 'Failed to Save Dialogue',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Load dialogue graph (nodes and edges)
	 */
		loadDialogueGraph: async (dialogueId, options = {}) => {
			set({ isLoading: true, error: null });
			try {
				const { restoreAudioFromStorage } = await import('@/lib/audioUtils');

				const loadedNodes = await db.nodes.where('dialogueId').equals(dialogueId).toArray();
				const edges = await db.edges.where('dialogueId').equals(dialogueId).toArray();
				const dialogue = await ensureDialogueLocalizationMetadata(await db.dialogues.get(dialogueId));
				const project = dialogue?.projectId ? await db.projects.get(dialogue.projectId) : null;
				const viewport = dialogue?.viewport || { x: 0, y: 0, zoom: 1 };
				const localizationState = getProjectLocalizationState(project);
				const activeLocale = normalizeLocaleTag(
					options?.activeLocale,
					localizationState.defaultLocale
				);
				const defaultLocale = localizationState.defaultLocale;
				let entries = dialogue?.projectId
					? await loadDialogueLocalizedEntries(dialogue.projectId, dialogueId)
					: [];
				let didPersistMigration = false;

				// Convert base64 back to blobs for audio playback and export
				let nodes = loadedNodes.map((node) => {
					if (node.data?.dialogueRows) {
						const restoredRows = normalizeDialogueRows(node.data.dialogueRows).map((row) => {
						if (row.audioFile?.base64) {
							const restoredAudio = restoreAudioFromStorage(row.audioFile);
							return { ...row, audioFile: restoredAudio };
						}
						return row;
					});
					return { ...node, data: { ...node.data, dialogueRows: restoredRows } };
					}
					return node;
				});

				nodes = materializeLocalizedNodes({
					nodes,
					dialogueId,
					dialogueSlug: dialogue?.localizationSlug,
					locale: activeLocale,
					defaultLocale,
					stringEntries: entries,
				});

				const hasMissingRefs = nodes.some((node) => {
					const nodeData = node?.data || {};
					if (Object.prototype.hasOwnProperty.call(nodeData, 'displayName') && !nodeData.displayNameKey) {
						return true;
					}
					if (
						Object.prototype.hasOwnProperty.call(nodeData, 'selectionTitle') &&
						!nodeData.selectionTitleKey
					) {
						return true;
					}
					return Array.isArray(nodeData.dialogueRows)
						? nodeData.dialogueRows.some((row) => !row?.textKey)
						: false;
				});

				if (dialogue?.projectId && (Number(dialogue.localizationVersion || 0) < 2 || hasMissingRefs)) {
					const migrated = prepareLocalizedNodesAndEntries({
						projectId: dialogue.projectId,
						dialogueId,
						dialogueSlug: dialogue.localizationSlug,
						nodes,
						locale: defaultLocale,
						existingEntries: entries,
					});
					if (migrated.entries.length > 0) {
						const validation = validateLocalizedEntriesForDialogue({
							nodes: migrated.nodes,
							entries: migrated.entries,
							defaultLocale,
						});
						if (validation.valid) {
							await db.transaction('rw', [db.nodes, db.localizedStrings, db.dialogues], async () => {
								await db.nodes.where('dialogueId').equals(dialogueId).delete();
								const migratedPersistedNodes = buildPersistedNodesWithoutLocalizedText(
									migrated.nodes,
									dialogueId
								);
								if (migratedPersistedNodes.length > 0) {
									await db.nodes.bulkAdd(migratedPersistedNodes);
								}
								await db.localizedStrings.where('dialogueId').equals(dialogueId).delete();
								await db.localizedStrings.bulkPut(migrated.entries);
								await db.dialogues.update(dialogueId, {
									localizationSlug: dialogue.localizationSlug,
									localizationVersion: 2,
									modifiedAt: new Date().toISOString(),
								});
							});
							didPersistMigration = true;
							entries = migrated.entries;
							nodes = materializeLocalizedNodes({
								nodes: migrated.nodes,
								dialogueId,
								dialogueSlug: dialogue.localizationSlug,
								locale: activeLocale,
								defaultLocale,
								stringEntries: entries,
							});
						} else {
							console.error('[localization] Migration validation failed', validation.errors);
						}
					}
				}

				if (didPersistMigration && dialogue?.projectId) {
					useSyncStore.getState().schedulePush(dialogue.projectId);
				}

				set({ nodes, edges, isLoading: false });
				return { nodes, edges, viewport };
		} catch (error) {
			console.error('Error loading dialogue graph:', error);
			toast({
				variant: 'error',
				title: 'Failed to Load Dialogue Graph',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Clear current dialogue
	 */
	clearCurrentDialogue: () => {
		set({ currentDialogue: null, nodes: [], edges: [] });
	},

	/**
	 * Export dialogue to .mnteadlg format (ZIP file)
	 */
	exportDialogue: async (dialogueId) => {
		try {
			const { saveAs } = await import('file-saver');

			// Get dialogue name for the file
			const dialogue = await db.dialogues.get(dialogueId);
			if (!dialogue) {
				throw new Error('Dialogue not found');
			}

			// Use the shared blob export function
			const blob = await get().exportDialogueAsBlob(dialogueId);

			// Download
			saveAs(blob, `${dialogue.name}.mnteadlg`);


			toast({
				variant: 'success',
				title: 'Dialogue Exported',
				description: `${dialogue.name}.mnteadlg has been exported`,
			});
		} catch (error) {
			console.error('Error exporting dialogue:', error);
			toast({
				variant: 'error',
				title: 'Failed to Export Dialogue',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	// Export dialogue as Blob (for nested exports in project)
		exportDialogueAsBlob: async (dialogueId) => {
			try {
				console.log(`[exportDialogueAsBlob] Starting export for dialogue: ${dialogueId}`);
				const JSZip = (await import('jszip')).default;

				const dialogue = await ensureDialogueLocalizationMetadata(await db.dialogues.get(dialogueId));
				if (!dialogue) {
					throw new Error(`Dialogue not found: ${dialogueId}`);
				}
				console.log(`[exportDialogueAsBlob] Found dialogue: ${dialogue.name}`);

				const project = dialogue.projectId ? await db.projects.get(dialogue.projectId) : null;
				const localizationState = getProjectLocalizationState(project);
				const loadedNodes = await db.nodes.where('dialogueId').equals(dialogueId).toArray();
				const edges = await db.edges.where('dialogueId').equals(dialogueId).toArray();
				const stringTableEntries = dialogue.projectId
					? await loadDialogueLocalizedEntries(dialogue.projectId, dialogueId)
					: [];

			// Restore audio from base64 to blobs for export
			const { restoreAudioFromStorage } = await import('@/lib/audioUtils');
				const nodes = loadedNodes.map((node) => {
					if (node.data?.dialogueRows) {
						const restoredRows = normalizeDialogueRows(node.data.dialogueRows).map((row) => {
							if (row.audioFile?.base64) {
								const restoredAudio = restoreAudioFromStorage(row.audioFile);
							return { ...row, audioFile: restoredAudio };
						}
						return row;
					});
					return { ...node, data: { ...node.data, dialogueRows: restoredRows } };
					}
					return node;
				});
				let persistedNodes = loadedNodes;
				let effectiveStringTableEntries = stringTableEntries;
				let localizedPreviewNodes = materializeLocalizedNodes({
					nodes: persistedNodes,
					dialogueId,
					dialogueSlug: dialogue.localizationSlug,
					locale: localizationState.defaultLocale,
					defaultLocale: localizationState.defaultLocale,
					stringEntries: effectiveStringTableEntries,
				});
				let exportValidation = validateLocalizedEntriesForDialogue({
					nodes: localizedPreviewNodes,
					entries: effectiveStringTableEntries,
					defaultLocale: localizationState.defaultLocale,
				});
				if (!exportValidation.valid && dialogue.projectId) {
					const repaired = prepareLocalizedNodesAndEntries({
						projectId: dialogue.projectId,
						dialogueId,
						dialogueSlug: dialogue.localizationSlug,
						nodes: localizedPreviewNodes,
						locale: localizationState.defaultLocale,
						existingEntries: effectiveStringTableEntries,
					});
					const repairedValidation = validateLocalizedEntriesForDialogue({
						nodes: repaired.nodes,
						entries: repaired.entries,
						defaultLocale: localizationState.defaultLocale,
					});
					if (!repairedValidation.valid) {
						throw new Error(
							`Dialogue export blocked by invalid localization references: ${summarizeLocalizationValidationErrors(
								repairedValidation.errors
							)}`
						);
					}
					await db.transaction('rw', [db.nodes, db.localizedStrings, db.dialogues], async () => {
						await db.nodes.where('dialogueId').equals(dialogueId).delete();
						const repairedPersistedNodes = buildPersistedNodesWithoutLocalizedText(
							repaired.nodes,
							dialogueId
						);
						if (repairedPersistedNodes.length > 0) {
							await db.nodes.bulkAdd(repairedPersistedNodes);
						}
						await db.localizedStrings.where('dialogueId').equals(dialogueId).delete();
						await db.localizedStrings.bulkPut(repaired.entries);
						await db.dialogues.update(dialogueId, {
							localizationSlug: dialogue.localizationSlug,
							localizationVersion: 2,
							modifiedAt: new Date().toISOString(),
						});
					});
					useSyncStore.getState().schedulePush(dialogue.projectId);
					persistedNodes = repaired.nodes;
					effectiveStringTableEntries = repaired.entries;
					localizedPreviewNodes = materializeLocalizedNodes({
						nodes: persistedNodes,
						dialogueId,
						dialogueSlug: dialogue.localizationSlug,
						locale: localizationState.defaultLocale,
						defaultLocale: localizationState.defaultLocale,
						stringEntries: effectiveStringTableEntries,
					});
					exportValidation = repairedValidation;
				}
				if (!exportValidation.valid) {
					throw new Error(
						`Dialogue export blocked by invalid localization references: ${summarizeLocalizationValidationErrors(
							exportValidation.errors
						)}`
					);
				}

				console.log(`[exportDialogueAsBlob] Found ${nodes.length} nodes and ${edges.length} edges`);
				// Validate Start Node exists
				const startNode = nodes.find((n) => n.id === '00000000-0000-0000-0000-000000000001');
			if (!startNode) {
				throw new Error('Export failed: Start Node (00000000-0000-0000-0000-000000000001) is missing from the dialogue');
			}

			// Collect unique participants and categories from nodes
			const participantSet = new Set();
			const decoratorsExport = [];
				const allDialogueRows = [];

				localizedPreviewNodes.forEach((node) => {
					// Extract participant
					if (node.data?.participant) {
						participantSet.add(node.data.participant);
					}

					// Extract dialogue rows
					if (node.data?.dialogueRows) {
						normalizeDialogueRows(node.data.dialogueRows).forEach((row) => {
							allDialogueRows.push({
								id: row.id,
								textKey: row.textKey || '',
								audioPath: row.audioFile?.blob ? `audio/${row.id}/` : null,
								nodeId: node.id,
								duration: row.duration || 0,
							});
						});
				}

				// Extract decorators with nodeId
				if (node.data?.decorators) {
					node.data.decorators.forEach((decorator) => {
						decoratorsExport.push({
							...decorator,
							nodeId: node.id,
						});
					});
				}
			});

			// Load participants and categories from database
			const categories = await db.categories
				.where('projectId')
				.equals(dialogue.projectId)
				.toArray();

			const participants = await db.participants
				.where('projectId')
				.equals(dialogue.projectId)
				.toArray();

			// Filter to only used participants
			const usedParticipants = participants.filter((p) =>
				participantSet.has(p.name)
			);

			// Get categories for used participants
			const usedCategoryNames = new Set(usedParticipants.map((p) => p.category));
			const usedCategories = categories.filter((c) =>
				usedCategoryNames.has(c.name)
			);

			// Build category path map
			const { useCategoryStore } = await import('./categoryStore');
			const categoryPathMap = new Map();
			categories.forEach((cat) => {
				const fullPath = useCategoryStore.getState().buildCategoryPath(cat.id, categories);
				categoryPathMap.set(cat.name, fullPath);
			});

				// Prepare export data
				const dialogueData = {
					dialogueGuid: dialogue.id,
					dialogueName: dialogue.name,
					localizationSlug: dialogue.localizationSlug,
					localizationVersion: dialogue.localizationVersion || 2,
					modifiedOnDate: dialogue.modifiedAt || new Date().toISOString(),
				};

			const categoriesExport = usedCategories.map((cat) => ({
				name: cat.name,
				fullPath: categoryPathMap.get(cat.name) || cat.name,
			}));

			const participantsExport = usedParticipants.map((p) => ({
				name: p.name,
				fullPath: categoryPathMap.get(p.category) || p.category,
			}));

				// Create ZIP file
				const zip = new JSZip();

				// Strip audio data from nodes for JSON serialization
				// (actual audio files go in the audio/ folder)
				const nodesForExport = persistedNodes.map((node) => {
					if (!node.data?.dialogueRows) {
						return node;
					}
					const rowsWithoutAudio = node.data.dialogueRows.map((row) => {
						const rowWithoutAudio = { ...(row || {}) };
						delete rowWithoutAudio.audioFile;
						delete rowWithoutAudio.text;
						return rowWithoutAudio;
					});
					return { ...node, data: { ...node.data, dialogueRows: rowsWithoutAudio } };
				});

			// Add JSON files
				zip.file('dialogueData.json', JSON.stringify(dialogueData, null, 2));
				zip.file('categories.json', JSON.stringify(categoriesExport, null, 2));
				zip.file('participants.json', JSON.stringify(participantsExport, null, 2));
				zip.file('nodes.json', JSON.stringify(nodesForExport, null, 2));
				zip.file('edges.json', JSON.stringify(edges, null, 2));
				zip.file('dialogueRows.json', JSON.stringify(allDialogueRows, null, 2));
				zip.file('decorators.json', JSON.stringify(decoratorsExport, null, 2));
				zip.file(
					'stringTable.json',
					JSON.stringify(
						buildStringTableV2Payload({
							dialogueId,
							defaultLocale: localizationState.defaultLocale,
							locales: localizationState.supportedLocales,
							entries: effectiveStringTableEntries,
						}),
						null,
						2
					)
				);

			// Add audio files
			const audioFolder = zip.folder('audio');
				for (const row of allDialogueRows) {
					if (row.audioPath) {
						// Find the actual audio file from nodes
						const node = localizedPreviewNodes.find((n) =>
							n.data?.dialogueRows?.some((r) => r.id === row.id)
						);
						if (node) {
							const dialogueRow = node.data.dialogueRows.find((r) => r.id === row.id);
						if (dialogueRow?.audioFile?.blob) {
							const rowFolder = audioFolder.folder(row.id);
							rowFolder.file(dialogueRow.audioFile.name, dialogueRow.audioFile.blob);
						}
					}
				}
			}

			// Generate and return blob
			const blob = await zip.generateAsync({ type: 'blob' });
			return blob;
		} catch (error) {
			console.error('Error exporting dialogue as blob:', error);
			throw error;
		}
	},

	// Import dialogue from .mnteadlg file
	importDialogue: async (projectId, file) => {
		try {
			// Load JSZip dynamically
			const JSZip = (await import('jszip')).default;

			// Read the ZIP file
			const zip = await JSZip.loadAsync(file);

			// Extract all JSON files
			const dialogueDataStr = await zip.file('dialogueData.json')?.async('text');
			const categoriesStr = await zip.file('categories.json')?.async('text');
			const participantsStr = await zip.file('participants.json')?.async('text');
			const decoratorsStr = await zip.file('decorators.json')?.async('text');
			const nodesStr = await zip.file('nodes.json')?.async('text');
			const edgesStr = await zip.file('edges.json')?.async('text');
			const dialogueRowsStr = await zip.file('dialogueRows.json')?.async('text');
			const stringTableStr = await zip.file('stringTable.json')?.async('text');

			// Validate all required files exist
			if (!dialogueDataStr || !nodesStr || !edgesStr) {
				throw new Error('Invalid dialogue file: missing required files');
			}

			// Parse JSON
			const dialogueData = JSON.parse(dialogueDataStr);
			const categories = categoriesStr ? JSON.parse(categoriesStr) : [];
			const participants = participantsStr ? JSON.parse(participantsStr) : [];
			const decorators = decoratorsStr ? JSON.parse(decoratorsStr) : [];
			const nodes = JSON.parse(nodesStr);
			const edges = JSON.parse(edgesStr);
				const dialogueRows = dialogueRowsStr ? JSON.parse(dialogueRowsStr) : [];
				const stringTableData = stringTableStr ? JSON.parse(stringTableStr) : null;
				const importedStringEntries = parseImportedStringTableData(stringTableData);
			// Validate Start Node exists
			const startNode = nodes.find((n) => n.id === '00000000-0000-0000-0000-000000000001');
			if (!startNode) {
				throw new Error('Import failed: Start Node (00000000-0000-0000-0000-000000000001) is missing from the dialogue file');
			}

			// Step 1: Import categories with deduplication
			const { useCategoryStore } = await import('./categoryStore');
			const categoryStore = useCategoryStore.getState();
			const existingCategories = await db.categories
				.where('projectId')
				.equals(projectId)
				.toArray();

			// Build map of existing category paths
			const existingCategoryPaths = new Map();
			existingCategories.forEach((cat) => {
				const fullPath = categoryStore.buildCategoryPath(cat.id, existingCategories);
				existingCategoryPaths.set(fullPath, cat);
			});

			// Import categories that don't exist - directly into DB to avoid conflicts
			const categoryMapping = new Map(); // fullPath -> categoryName
			const now = new Date().toISOString();
			for (const catData of categories) {
				const fullPath = catData.fullPath;
				if (!existingCategoryPaths.has(fullPath)) {
					// Create the category hierarchy
					const pathParts = fullPath.split('.');
					let parentId = null;
					let currentPath = '';

					for (const part of pathParts) {
						currentPath = currentPath ? `${currentPath}.${part}` : part;

						// Check if this level already exists
						if (!existingCategoryPaths.has(currentPath)) {
							const newCat = {
								id: uuidv4(),
								name: part,
								parentCategoryId: parentId,
								projectId,
								createdAt: now,
								modifiedAt: now,
							};
							await db.categories.add(newCat);
							existingCategoryPaths.set(currentPath, newCat);
							parentId = newCat.id;
						} else {
							parentId = existingCategoryPaths.get(currentPath).id;
						}
					}
				}
				categoryMapping.set(fullPath, catData.name);
			}

			// Step 2: Import participants with deduplication
			const existingParticipants = await db.participants
				.where('projectId')
				.equals(projectId)
				.toArray();

			const existingParticipantNames = new Set(existingParticipants.map((p) => p.name));
			const participantMapping = new Map(); // old name -> new name

			for (const partData of participants) {
				if (!existingParticipantNames.has(partData.name)) {
					// Find the category by fullPath
					const categoryName = categoryMapping.get(partData.fullPath) ||
						existingCategoryPaths.get(partData.fullPath)?.name;

					if (!categoryName) {
						throw new Error(`Category not found for participant ${partData.name}: ${partData.fullPath}`);
					}

					// Directly insert to avoid conflicts
					const newParticipant = {
						id: uuidv4(),
						name: partData.name,
						category: categoryName,
						projectId,
						createdAt: now,
						modifiedAt: now,
					};
					await db.participants.add(newParticipant);
					existingParticipantNames.add(partData.name);
				}
				participantMapping.set(partData.name, partData.name);
			}

			// Step 3: Import decorators with deduplication
			const existingDecorators = await db.decorators
				.where('projectId')
				.equals(projectId)
				.toArray();

			// Build map of existing decorators by name
			const existingDecoratorMap = new Map();
			existingDecorators.forEach((dec) => {
				existingDecoratorMap.set(dec.name, dec);
			});

			// Track unique decorator names from instances
			const decoratorNames = new Set();
			decorators.forEach((dec) => {
				decoratorNames.add(dec.name);
			});

			// Import decorator definitions that don't exist
			for (const name of decoratorNames) {
				if (!existingDecoratorMap.has(name)) {
					// Create a basic decorator definition (properties will be empty since we only have instances)
					const newDec = {
						id: uuidv4(),
						name: name,
						type: '',
						properties: [],
						projectId,
						createdAt: now,
						modifiedAt: now,
					};
					await db.decorators.add(newDec);
					existingDecoratorMap.set(name, newDec);
				}
			}

			// Step 4: Validate dialogue name
			if (!dialogueData.dialogueName || !dialogueData.dialogueName.trim()) {
				throw new Error('Invalid dialogue name');
			}

			// Check for name conflicts
			const existingDialogues = await db.dialogues
				.where('projectId')
				.equals(projectId)
				.toArray();

			let finalName = dialogueData.dialogueName;
			let counter = 1;
			while (existingDialogues.some((d) => d.name === finalName)) {
				finalName = `${dialogueData.dialogueName} (${counter})`;
				counter++;
			}

			// Step 5: Create the dialogue
			const dialogueId = uuidv4();
				const newDialogue = {
					id: dialogueId,
					projectId,
					name: finalName,
					description: '',
					nodeCount: nodes.length,
					localizationSlug: ensureDialogueLocalizationSlug({
						localizationSlug: dialogueData?.localizationSlug,
						name: finalName,
						id: dialogueId,
					}),
					localizationVersion: 2,
					createdAt: now,
					modifiedAt: now,
				};

			await db.dialogues.add(newDialogue);

			// Step 6: Import nodes
			// Build a map of old node IDs to new node IDs
			const nodeIdMapping = new Map();
			const rowIdMapping = new Map();
			const importedNodesForLocalization = [];

			for (const node of nodes) {
				const oldNodeId = node.id;
				const newNodeId = node.type === 'startNode'
					? '00000000-0000-0000-0000-000000000001'
					: uuidv4();

				nodeIdMapping.set(oldNodeId, newNodeId);

				// Process node data
				const nodeData = { ...node.data };

				// Update participant reference
				if (nodeData.participant) {
					// participant might be a string or an object
					if (typeof nodeData.participant === 'object' && nodeData.participant.name) {
						nodeData.participant = nodeData.participant.name;
					}
				}

				// Update decorators - remove nodeId as it's stored in node data
				if (nodeData.decorators) {
					nodeData.decorators = nodeData.decorators.map((dec) => {
						// Find matching decorator definition
						const existingDec = existingDecoratorMap.get(dec.name);
						return {
							id: existingDec?.id || dec.id,
							name: dec.name,
							values: dec.values || {},
						};
					});
				}

				// Normalize rows so each row has a stable ID for audio rebinding.
				if (nodeData.dialogueRows) {
					nodeData.dialogueRows = normalizeDialogueRows(nodeData.dialogueRows).map((row) => {
						const oldRowId = row.id;
						const newRowId = uuidv4();
						rowIdMapping.set(`${oldNodeId}:${oldRowId}`, newRowId);
						return {
							...row,
							id: newRowId,
						};
					});
				}

				const newNode = {
					id: newNodeId,
					dialogueId,
					type: node.type,
					position: node.position,
					data: nodeData,
				};

				importedNodesForLocalization.push(newNode);
			}

			// Step 7: Import edges with updated node IDs
			const remappedEdges = [];
			for (const edge of edges) {
				const newEdge = {
					id: uuidv4(),
					dialogueId,
					source: nodeIdMapping.get(edge.source),
					target: nodeIdMapping.get(edge.target),
					sourceHandle: edge.sourceHandle,
					targetHandle: edge.targetHandle,
					markerEnd: edge.markerEnd,
				};

				remappedEdges.push(newEdge);
			}

				// Step 8: Import optional StringTable data and remap to current dialogue metadata
				let localizedEntriesToUpsert = [];
				if (importedStringEntries.length > 0) {
					const remappedEntries = remapLocalizedEntriesForImportedDialogue({
						entries: importedStringEntries,
						newProjectId: projectId,
						newDialogueId: dialogueId,
						newDialogueSlug: newDialogue.localizationSlug,
						nodeIdMap: nodeIdMapping,
						rowIdMap: rowIdMapping,
					});
					if (remappedEntries.length > 0) {
						localizedEntriesToUpsert = remappedEntries;
					}
				}

				const project = await db.projects.get(projectId);
				const localizationState = getProjectLocalizationState(project);
				const preparedImport = prepareLocalizedNodesAndEntries({
					projectId,
					dialogueId,
					dialogueSlug: newDialogue.localizationSlug,
					nodes: importedNodesForLocalization,
					locale: localizationState.defaultLocale,
					existingEntries: localizedEntriesToUpsert,
				});
				const validation = validateLocalizedEntriesForDialogue({
					nodes: preparedImport.nodes,
					entries: preparedImport.entries,
					defaultLocale: localizationState.defaultLocale,
				});
				if (!validation.valid) {
					throw new Error('Imported dialogue contains invalid localization references.');
				}
				await db.transaction('rw', [db.nodes, db.edges, db.localizedStrings], async () => {
					await db.nodes.where('dialogueId').equals(dialogueId).delete();
					const importPersistedNodes = buildPersistedNodesWithoutLocalizedText(
						preparedImport.nodes,
						dialogueId
					);
					if (importPersistedNodes.length > 0) {
						await db.nodes.bulkAdd(importPersistedNodes);
					}
					await db.edges.where('dialogueId').equals(dialogueId).delete();
					if (remappedEdges.length > 0) {
						await db.edges.bulkAdd(remappedEdges);
					}
					await db.localizedStrings.where('dialogueId').equals(dialogueId).delete();
					if (preparedImport.entries.length > 0) {
						await db.localizedStrings.bulkPut(preparedImport.entries);
					}
				});
			// Step 9: Process audio files from dialogueRows
			// Note: Audio files in the export are stored as blobs in the ZIP
			// We'll need to extract them if they exist
			const audioFolder = zip.folder('audio');
			if (audioFolder) {
				// Process each dialogue row's audio
				for (const row of dialogueRows) {
					if (row.audioPath) {
						// The audioPath is like "audio/rowId/"
						// Look for audio files in that subfolder
						const rowFolder = audioFolder.folder(row.id);
						if (rowFolder) {
							// Get the first file in the folder (should only be one)
							const audioFiles = Object.keys(rowFolder.files).filter(
								(path) => !path.endsWith('/')
							);

							if (audioFiles.length > 0) {
								const audioFile = rowFolder.files[audioFiles[0]];
								const audioBlob = await audioFile.async('blob');

								// Store audio in IndexedDB
								// We'll need to update the node's dialogue row with audio data
								const nodeId = nodeIdMapping.get(row.nodeId);
									const remappedRowId =
										rowIdMapping.get(`${row.nodeId}:${row.id}`) || row.id;
									if (nodeId) {
										const node = await db.nodes.get(nodeId);
										if (node && node.data.dialogueRows) {
											const normalizedRows = node.data.dialogueRows.map((item) => ({
												...(item || {}),
											}));
											const rowIndex = normalizedRows.findIndex((r) => r.id === remappedRowId);
											if (rowIndex !== -1) {
											// Create audio file data
											const audioFileData = {
												id: uuidv4(),
												name: audioFiles[0].split('/').pop(),
												type: audioBlob.type,
												size: audioBlob.size,
												blob: audioBlob,
												path: `audio/${remappedRowId}/${audioFiles[0].split('/').pop()}`,
											};

												normalizedRows[rowIndex].audioFile = audioFileData;
												normalizedRows[rowIndex].duration = row.duration;
												delete normalizedRows[rowIndex].text;
												node.data.dialogueRows = normalizedRows;

											await db.nodes.update(nodeId, { data: node.data });
										}
									}
								}
							}
						}
					}
				}
			}

			// Reload dialogues
			await get().loadDialogues(projectId);
			useSyncStore.getState().schedulePush(projectId);

			toast({
				variant: 'success',
				title: 'Dialogue Imported',
				description: `${finalName} has been imported successfully`,
			});

			return newDialogue;
		} catch (error) {
			console.error('Error importing dialogue:', error);
			toast({
				variant: 'error',
				title: 'Failed to Import Dialogue',
				description: error.message || 'An unexpected error occurred',
			});
			// Don't re-throw - error has been handled with toast
		}
	},
}));
