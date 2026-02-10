import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { toast } from '@/components/ui/toaster';
import { useSyncStore } from '@/stores/syncStore';

const normalizeDialogueRow = (row = {}) => ({
	...row,
	id: row.id || uuidv4(),
	text: row.text || '',
	duration: typeof row.duration === 'number' ? row.duration : 3.0,
	audioFile: row.audioFile || null,
});

const normalizeDialogueRows = (rows = []) => rows.map((row) => normalizeDialogueRow(row));

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
			const newDialogue = {
				id,
				...dialogueData,
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
			await db.transaction('rw', [db.dialogues, db.nodes, db.edges], async () => {
				await db.dialogues.delete(id);
				await db.nodes.where('dialogueId').equals(id).delete();
				await db.edges.where('dialogueId').equals(id).delete();
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
	updateNodes: async (dialogueId, nodes) => {
		set({ isLoading: true, error: null });
		try {
			await db.transaction('rw', db.nodes, async () => {
				await db.nodes.where('dialogueId').equals(dialogueId).delete();
				await db.nodes.bulkAdd(
					nodes.map(node => ({ ...node, dialogueId }))
				);
			});
			set({ nodes, isLoading: false });
		} catch (error) {
			console.error('Error updating nodes:', error);
			toast({
				variant: 'error',
				title: 'Failed to Update Nodes',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
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
	saveDialogueGraph: async (dialogueId, nodes, edges, viewport) => {
		set({ isLoading: true, error: null });
		try {
			const { prepareAudioForStorage } = await import('@/lib/audioUtils');

			// Convert audio blobs to base64 for storage
			const processedNodes = await Promise.all(
				nodes.map(async (node) => {
					if (node.data?.dialogueRows) {
						const processedRows = await Promise.all(
							normalizeDialogueRows(node.data.dialogueRows).map(async (row) => {
								if (row.audioFile?.blob) {
									const storedAudio = await prepareAudioForStorage(row.audioFile);
									return { ...row, audioFile: storedAudio };
								}
								return row;
							})
						);
						return { ...node, data: { ...node.data, dialogueRows: processedRows } };
					}
					return node;
				})
			);

			await db.transaction('rw', [db.nodes, db.edges, db.dialogues], async () => {
				// Delete existing nodes and edges
				await db.nodes.where('dialogueId').equals(dialogueId).delete();
				await db.edges.where('dialogueId').equals(dialogueId).delete();

				// Add new nodes and edges with processed audio
				if (processedNodes.length > 0) {
					await db.nodes.bulkAdd(
						processedNodes.map(node => ({ ...node, dialogueId }))
					);
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
				});
			});
			set({ nodes, edges, isLoading: false });
			const dialogue = await db.dialogues.get(dialogueId);
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
	loadDialogueGraph: async (dialogueId) => {
		set({ isLoading: true, error: null });
		try {
			const { restoreAudioFromStorage } = await import('@/lib/audioUtils');

			const loadedNodes = await db.nodes.where('dialogueId').equals(dialogueId).toArray();
			const edges = await db.edges.where('dialogueId').equals(dialogueId).toArray();
			const dialogue = await db.dialogues.get(dialogueId);
			const viewport = dialogue?.viewport || { x: 0, y: 0, zoom: 1 };

			// Convert base64 back to blobs for audio playback and export
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

			const dialogue = await db.dialogues.get(dialogueId);
			if (!dialogue) {
				throw new Error(`Dialogue not found: ${dialogueId}`);
			}
			console.log(`[exportDialogueAsBlob] Found dialogue: ${dialogue.name}`);

			const loadedNodes = await db.nodes.where('dialogueId').equals(dialogueId).toArray();
			const edges = await db.edges.where('dialogueId').equals(dialogueId).toArray();

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

			nodes.forEach((node) => {
				// Extract participant
				if (node.data?.participant) {
					participantSet.add(node.data.participant);
				}

				// Extract dialogue rows
				if (node.data?.dialogueRows) {
					normalizeDialogueRows(node.data.dialogueRows).forEach((row) => {
						allDialogueRows.push({
							id: row.id,
							text: row.text || '',
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
			const nodesForExport = nodes.map((node) => {
				if (node.data?.dialogueRows) {
					const rowsWithoutAudio = normalizeDialogueRows(node.data.dialogueRows).map((row) => {
						const rowWithoutAudio = { ...row };
						delete rowWithoutAudio.audioFile;
						return rowWithoutAudio;
					});
					return { ...node, data: { ...node.data, dialogueRows: rowsWithoutAudio } };
				}
				return node;
			});

			// Add JSON files
			zip.file('dialogueData.json', JSON.stringify(dialogueData, null, 2));
			zip.file('categories.json', JSON.stringify(categoriesExport, null, 2));
			zip.file('participants.json', JSON.stringify(participantsExport, null, 2));
			zip.file('nodes.json', JSON.stringify(nodesForExport, null, 2));
			zip.file('edges.json', JSON.stringify(edges, null, 2));
			zip.file('dialogueRows.json', JSON.stringify(allDialogueRows, null, 2));
			zip.file('decorators.json', JSON.stringify(decoratorsExport, null, 2));

			// Add audio files
			const audioFolder = zip.folder('audio');
			for (const row of allDialogueRows) {
				if (row.audioPath) {
					// Find the actual audio file from nodes
					const node = nodes.find((n) =>
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
				createdAt: now,
				modifiedAt: now,
			};

			await db.dialogues.add(newDialogue);

			// Step 6: Import nodes
			// Build a map of old node IDs to new node IDs
			const nodeIdMapping = new Map();

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
					nodeData.dialogueRows = normalizeDialogueRows(nodeData.dialogueRows);
				}

				const newNode = {
					id: newNodeId,
					dialogueId,
					type: node.type,
					position: node.position,
					data: nodeData,
				};

				await db.nodes.add(newNode);
			}

			// Step 7: Import edges with updated node IDs
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

				await db.edges.add(newEdge);
			}

			// Step 8: Process audio files from dialogueRows
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
								if (nodeId) {
									const node = await db.nodes.get(nodeId);
									if (node && node.data.dialogueRows) {
										const normalizedRows = normalizeDialogueRows(node.data.dialogueRows);
										const rowIndex = normalizedRows.findIndex((r) => r.id === row.id);
										if (rowIndex !== -1) {
											// Create audio file data
											const audioFileData = {
												id: uuidv4(),
												name: audioFiles[0].split('/').pop(),
												type: audioBlob.type,
												size: audioBlob.size,
												blob: audioBlob,
												path: `audio/${row.id}/${audioFiles[0].split('/').pop()}`,
											};

											normalizedRows[rowIndex].audioFile = audioFileData;
											normalizedRows[rowIndex].duration = row.duration;
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
