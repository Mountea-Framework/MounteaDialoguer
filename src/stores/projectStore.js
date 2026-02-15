import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { toast } from '@/components/ui/toaster';
import { useSyncStore } from '@/stores/syncStore';

/**
 * Project Store
 * Manages projects state and CRUD operations
 */
export const useProjectStore = create((set, get) => ({
	projects: [],
	currentProject: null,
	isLoading: false,
	error: null,

	/**
	 * Load all projects from IndexedDB
	 */
	loadProjects: async () => {
		set({ isLoading: true, error: null });
		try {
			const projects = await db.projects.toArray();

			// Load dialogue counts for each project
			const projectsWithCounts = await Promise.all(
				projects.map(async (project) => {
					const dialogueCount = await db.dialogues
						.where('projectId')
						.equals(project.id)
						.count();
					return { ...project, dialogueCount };
				})
			);

			set({ projects: projectsWithCounts, isLoading: false });
		} catch (error) {
			console.error('Error loading projects:', error);
			toast({
				variant: 'error',
				title: 'Failed to Load Projects',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
		}
	},

	/**
	 * Create a new project
	 */
	createProject: async (projectData) => {
		set({ isLoading: true, error: null });
		try {
			const now = new Date().toISOString();
			const id = uuidv4();
			const newProject = {
				id,
				...projectData,
				createdAt: now,
				modifiedAt: now,
			};
			await db.projects.add(newProject);
			await get().loadProjects();
			useSyncStore.getState().schedulePush(newProject.id);
			toast({
				variant: 'success',
				title: 'Project Created',
				description: `${projectData.name} has been created successfully`,
			});
			return newProject;
		} catch (error) {
			console.error('Error creating project:', error);
			toast({
				variant: 'error',
				title: 'Failed to Create Project',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Create onboarding example project with predefined categories, participants, and graph.
	 * Node/edge/row IDs are intentionally hardcoded for a stable example graph template.
	 */
	createOnboardingExampleProject: async () => {
		set({ isLoading: true, error: null });
		try {
			const now = new Date().toISOString();
			const projectId = uuidv4();
			const dialogueId = '68cfbce9-4117-4996-bc8b-fd963efc4454';

			const existingDialogue = await db.dialogues.get(dialogueId);
			if (existingDialogue) {
				throw new Error('Example graph already exists. Delete the previous example project first.');
			}

			const newProject = {
				id: projectId,
				name: 'OnboardingExample',
				description: 'Example branching dialogue project created from onboarding',
				version: '1.0.0',
				createdAt: now,
				modifiedAt: now,
			};

			const categories = [
				{
					id: uuidv4(),
					name: 'NPC',
					parentCategoryId: null,
					projectId,
					createdAt: now,
					modifiedAt: now,
				},
				{
					id: uuidv4(),
					name: 'Merchant',
					parentCategoryId: null,
					projectId,
					createdAt: now,
					modifiedAt: now,
				},
				{
					id: uuidv4(),
					name: 'Player',
					parentCategoryId: null,
					projectId,
					createdAt: now,
					modifiedAt: now,
				},
			];
			categories[1].parentCategoryId = categories[0].id; // NPC.Merchant

			const participants = [
				{
					id: uuidv4(),
					name: 'Waldermar',
					category: 'Merchant',
					projectId,
					createdAt: now,
					modifiedAt: now,
				},
				{
					id: uuidv4(),
					name: 'Player',
					category: 'Player',
					projectId,
					createdAt: now,
					modifiedAt: now,
				},
			];

			const dialogue = {
				id: dialogueId,
				projectId,
				name: 'MerchantBranchingExample',
				description: 'Branching example that demonstrates all node types',
				createdAt: now,
				modifiedAt: now,
				viewport: { x: 20, y: 10, zoom: 0.82 },
			};

			// Hardcoded graph IDs
			const NODE_START = '00000000-0000-0000-0000-000000000001';
			const NODE_GREETING = '11111111-1111-1111-1111-111111111111';
			const NODE_CHOICE_BUY = '22222222-2222-2222-2222-222222222222';
			const NODE_CHOICE_RUMORS = '33333333-3333-3333-3333-333333333333';
			const NODE_CHOICE_GOODBYE = '44444444-4444-4444-4444-444444444444';
			const NODE_BUY_RESPONSE = '55555555-5555-5555-5555-555555555555';
			const NODE_DELAY_CHECK_STOCK = '66666666-6666-6666-6666-666666666666';
			const NODE_BUY_COMPLETE = '77777777-7777-7777-7777-777777777777';
			const NODE_RUMOR_RESPONSE = '88888888-8888-8888-8888-888888888888';
			const NODE_RUMOR_RETURN = '99999999-9999-9999-9999-999999999999';
			const NODE_GOODBYE_COMPLETE = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

			const nodes = [
				{
					id: NODE_START,
					dialogueId,
					type: 'startNode',
					position: { x: 80, y: 260 },
					data: { label: 'Dialogue entry point', displayName: 'Start' },
				},
				{
					id: NODE_GREETING,
					dialogueId,
					type: 'leadNode',
					position: { x: 320, y: 260 },
					data: {
						label: 'Greeting',
						displayName: 'Waldermar',
						participant: 'Waldermar',
						decorators: [],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: [
							{
								id: 'c1c1c1c1-1111-4111-8111-c1c1c1c1c1c1',
								text: 'Welcome, traveler. Looking to trade, hear rumors, or move on?',
								duration: 3.0,
								audioFile: null,
							},
						],
					},
				},
				{
					id: NODE_CHOICE_BUY,
					dialogueId,
					type: 'answerNode',
					position: { x: 620, y: 100 },
					data: {
						label: 'Player Choice',
						displayName: 'Player',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'I want to buy supplies.',
						hasAudio: false,
						dialogueRows: [
							{
								id: 'c2c2c2c2-2222-4222-8222-c2c2c2c2c2c2',
								text: 'I need provisions for the road.',
								duration: 2.4,
								audioFile: null,
							},
						],
					},
				},
				{
					id: NODE_CHOICE_RUMORS,
					dialogueId,
					type: 'answerNode',
					position: { x: 620, y: 260 },
					data: {
						label: 'Player Choice',
						displayName: 'Player',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'Any rumors lately?',
						hasAudio: false,
						dialogueRows: [
							{
								id: 'c3c3c3c3-3333-4333-8333-c3c3c3c3c3c3',
								text: 'What news is spreading through the market?',
								duration: 2.4,
								audioFile: null,
							},
						],
					},
				},
				{
					id: NODE_CHOICE_GOODBYE,
					dialogueId,
					type: 'answerNode',
					position: { x: 620, y: 420 },
					data: {
						label: 'Player Choice',
						displayName: 'Player',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'Not today. Goodbye.',
						hasAudio: false,
						dialogueRows: [
							{
								id: 'c4c4c4c4-4444-4444-8444-c4c4c4c4c4c4',
								text: 'Maybe another time.',
								duration: 1.8,
								audioFile: null,
							},
						],
					},
				},
				{
					id: NODE_BUY_RESPONSE,
					dialogueId,
					type: 'leadNode',
					position: { x: 900, y: 100 },
					data: {
						label: 'Merchant Response',
						displayName: 'Waldermar',
						participant: 'Waldermar',
						decorators: [],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: [
							{
								id: 'c5c5c5c5-5555-4555-8555-c5c5c5c5c5c5',
								text: 'Good choice. Let me check what is still in stock.',
								duration: 2.8,
								audioFile: null,
							},
						],
					},
				},
				{
					id: NODE_DELAY_CHECK_STOCK,
					dialogueId,
					type: 'delayNode',
					position: { x: 1180, y: 100 },
					data: {
						label: 'Check stock delay',
						displayName: 'Delay',
						duration: 1.5,
					},
				},
				{
					id: NODE_BUY_COMPLETE,
					dialogueId,
					type: 'completeNode',
					position: { x: 1450, y: 100 },
					data: {
						label: 'Transaction Complete',
						displayName: 'Complete',
						participant: 'Waldermar',
						decorators: [],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: [
							{
								id: 'c6c6c6c6-6666-4666-8666-c6c6c6c6c6c6',
								text: 'Here you go. Safe travels.',
								duration: 2.0,
								audioFile: null,
							},
						],
					},
				},
				{
					id: NODE_RUMOR_RESPONSE,
					dialogueId,
					type: 'leadNode',
					position: { x: 900, y: 260 },
					data: {
						label: 'Rumor Response',
						displayName: 'Waldermar',
						participant: 'Waldermar',
						decorators: [],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: [
							{
								id: 'c7c7c7c7-7777-4777-8777-c7c7c7c7c7c7',
								text: 'Bandits were seen near the northern pass. Keep your torch close.',
								duration: 3.2,
								audioFile: null,
							},
						],
					},
				},
				{
					id: NODE_RUMOR_RETURN,
					dialogueId,
					type: 'returnNode',
					position: { x: 1180, y: 260 },
					data: {
						label: 'Return to choices',
						displayName: 'Return',
						targetNode: NODE_GREETING,
					},
				},
				{
					id: NODE_GOODBYE_COMPLETE,
					dialogueId,
					type: 'completeNode',
					position: { x: 900, y: 420 },
					data: {
						label: 'Goodbye Complete',
						displayName: 'Complete',
						participant: 'Waldermar',
						decorators: [],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: [
							{
								id: 'c8c8c8c8-8888-4888-8888-c8c8c8c8c8c8',
								text: 'Until next time.',
								duration: 1.8,
								audioFile: null,
							},
						],
					},
				},
			];

			const edges = [
				{ id: 'e0000000-0000-4000-8000-000000000001', dialogueId, source: NODE_START, target: NODE_GREETING },
				{ id: 'e1111111-1111-4111-8111-111111111111', dialogueId, source: NODE_GREETING, target: NODE_CHOICE_BUY },
				{ id: 'e2222222-2222-4222-8222-222222222222', dialogueId, source: NODE_GREETING, target: NODE_CHOICE_RUMORS },
				{ id: 'e3333333-3333-4333-8333-333333333333', dialogueId, source: NODE_GREETING, target: NODE_CHOICE_GOODBYE },
				{ id: 'e4444444-4444-4444-8444-444444444444', dialogueId, source: NODE_CHOICE_BUY, target: NODE_BUY_RESPONSE },
				{ id: 'e5555555-5555-4555-8555-555555555555', dialogueId, source: NODE_BUY_RESPONSE, target: NODE_DELAY_CHECK_STOCK },
				{ id: 'e6666666-6666-4666-8666-666666666666', dialogueId, source: NODE_DELAY_CHECK_STOCK, target: NODE_BUY_COMPLETE },
				{ id: 'e7777777-7777-4777-8777-777777777777', dialogueId, source: NODE_CHOICE_RUMORS, target: NODE_RUMOR_RESPONSE },
				{ id: 'e8888888-8888-4888-8888-888888888888', dialogueId, source: NODE_RUMOR_RESPONSE, target: NODE_RUMOR_RETURN },
				{ id: 'e9999999-9999-4999-8999-999999999999', dialogueId, source: NODE_CHOICE_GOODBYE, target: NODE_GOODBYE_COMPLETE },
			];

			await db.transaction(
				'rw',
				[db.projects, db.dialogues, db.categories, db.participants, db.nodes, db.edges],
				async () => {
					await db.projects.add(newProject);
					await db.categories.bulkAdd(categories);
					await db.participants.bulkAdd(participants);
					await db.dialogues.add(dialogue);
					await db.nodes.bulkAdd(nodes);
					await db.edges.bulkAdd(edges);
				}
			);

			await get().loadProjects();
			useSyncStore.getState().schedulePush(projectId);
			toast({
				variant: 'success',
				title: 'Example Project Created',
				description: `${newProject.name} has been created successfully`,
			});

			return { projectId, dialogueId };
		} catch (error) {
			console.error('Error creating onboarding example project:', error);
			toast({
				variant: 'error',
				title: 'Failed to Create Example Project',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Update an existing project
	 */
	updateProject: async (id, updates) => {
		set({ isLoading: true, error: null });
		try {
			await db.projects.update(id, {
				...updates,
				modifiedAt: new Date().toISOString(),
			});
			await get().loadProjects();
			useSyncStore.getState().schedulePush(id);
			toast({
				variant: 'success',
				title: 'Project Updated',
				description: 'Project has been updated successfully',
			});
		} catch (error) {
			console.error('Error updating project:', error);
			toast({
				variant: 'error',
				title: 'Failed to Update Project',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Delete a project and all its related data
	 */
	deleteProject: async (id) => {
		set({ isLoading: true, error: null });
		try {
			await db.transaction('rw', [db.projects, db.dialogues, db.participants, db.categories, db.decorators, db.nodes, db.edges], async () => {
				const projectDialogues = await db.dialogues.where('projectId').equals(id).toArray();
				const dialogueIds = projectDialogues.map((dialogue) => dialogue.id);

				if (dialogueIds.length > 0) {
					await db.nodes.where('dialogueId').anyOf(dialogueIds).delete();
					await db.edges.where('dialogueId').anyOf(dialogueIds).delete();
				}

				await db.projects.delete(id);
				await db.dialogues.where('projectId').equals(id).delete();
				await db.participants.where('projectId').equals(id).delete();
				await db.categories.where('projectId').equals(id).delete();
				await db.decorators.where('projectId').equals(id).delete();
			});
			await get().loadProjects();
			useSyncStore.getState().schedulePush(id);
			toast({
				variant: 'success',
				title: 'Project Deleted',
				description: 'Project and all related data have been deleted',
			});
		} catch (error) {
			console.error('Error deleting project:', error);
			toast({
				variant: 'error',
				title: 'Failed to Delete Project',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Set the current active project
	 */
	setCurrentProject: async (id) => {
		set({ isLoading: true, error: null });
		try {
			const project = await db.projects.get(id);
			set({ currentProject: project, isLoading: false });
		} catch (error) {
			console.error('Error setting current project:', error);
			toast({
				variant: 'error',
				title: 'Failed to Load Project',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Clear current project
	 */
	clearCurrentProject: () => {
		set({ currentProject: null });
	},

	/**
	 * Export entire project with all dialogues
	 */
	exportProject: async (projectId) => {
		try {
			// Load JSZip and file-saver
			const JSZip = (await import('jszip')).default;
			const { saveAs } = await import('file-saver');

			// Get project data
			const project = await db.projects.get(projectId);
			if (!project) {
				throw new Error('Project not found');
			}

			// Get all dialogues for this project
			const dialogues = await db.dialogues
				.where('projectId')
				.equals(projectId)
				.toArray();

			// Get categories, participants, and decorators
			const categories = await db.categories
				.where('projectId')
				.equals(projectId)
				.toArray();

			const participants = await db.participants
				.where('projectId')
				.equals(projectId)
				.toArray();

			const decorators = await db.decorators
				.where('projectId')
				.equals(projectId)
				.toArray();

			// Build category path map
			const { useCategoryStore } = await import('./categoryStore');
			const categoryPathMap = new Map();
			categories.forEach((cat) => {
				const fullPath = useCategoryStore.getState().buildCategoryPath(cat.id, categories);
				categoryPathMap.set(cat.name, fullPath);
			});

			// Prepare project data
			const projectData = {
				projectGuid: project.id,
				projectName: project.name,
				projectDescription: project.description || '',
				version: project.version || '1.0.0',
				createdAt: project.createdAt,
				modifiedAt: project.modifiedAt || new Date().toISOString(),
			};

			// Export categories with fullPath
			const categoriesExport = categories.map((cat) => ({
				name: cat.name,
				fullPath: categoryPathMap.get(cat.name) || cat.name,
			}));

			// Export participants with fullPath
			const participantsExport = participants.map((p) => ({
				name: p.name,
				fullPath: categoryPathMap.get(p.category) || p.category,
			}));

			// Export decorators (definitions only)
			const decoratorsExport = decorators.map(({ id, projectId, createdAt, modifiedAt, ...rest }) => rest);

			// Create main project ZIP
			const projectZip = new JSZip();

			// Add project JSON files
			projectZip.file('projectData.json', JSON.stringify(projectData, null, 2));
			projectZip.file('categories.json', JSON.stringify(categoriesExport, null, 2));
			projectZip.file('participants.json', JSON.stringify(participantsExport, null, 2));
			projectZip.file('decorators.json', JSON.stringify(decoratorsExport, null, 2));

			// Create dialogues folder
			const dialoguesFolder = projectZip.folder('dialogues');

			// Export each dialogue as a .mnteadlg file
			const { useDialogueStore } = await import('./dialogueStore');
			const dialogueStore = useDialogueStore.getState();

			let successCount = 0;
			let errorCount = 0;

			for (const dialogue of dialogues) {
				try {
					console.log(`Exporting dialogue: ${dialogue.name} (${dialogue.id})`);

					// Generate the dialogue export blob
					const dialogueBlob = await dialogueStore.exportDialogueAsBlob(dialogue.id);

					// Add to dialogues folder with sanitized name
					const sanitizedName = dialogue.name.replace(/[^a-z0-9]/gi, '_');
					dialoguesFolder.file(`${sanitizedName}.mnteadlg`, dialogueBlob);

					successCount++;
					console.log(`Successfully exported dialogue: ${dialogue.name}`);
				} catch (error) {
					errorCount++;
					console.error(`Failed to export dialogue ${dialogue.name}:`, error);

					// Show error for this dialogue
					toast({
						variant: 'error',
						title: `Failed to Export Dialogue: ${dialogue.name}`,
						description: error.message,
					});
				}
			}

			console.log(`Exported ${successCount} dialogues, ${errorCount} failed`);

			// Generate the final ZIP
			const blob = await projectZip.generateAsync({ type: 'blob' });
			saveAs(blob, `${project.name}.mnteadlgproj`);

			toast({
				variant: 'success',
				title: 'Project Exported',
				description: `${project.name}.mnteadlgproj has been exported`,
			});
		} catch (error) {
			console.error('Error exporting project:', error);
			toast({
				variant: 'error',
				title: 'Failed to Export Project',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	importProject: async (file) => {
		try {
			const JSZip = (await import('jszip')).default;
			const zip = await JSZip.loadAsync(file);

			const projectDataStr = await zip.file('projectData.json')?.async('text');
			const participantsStr = await zip.file('participants.json')?.async('text');
			const categoriesStr = await zip.file('categories.json')?.async('text');
			const decoratorsStr = await zip.file('decorators.json')?.async('text');

			if (!projectDataStr) {
				throw new Error('Invalid project file: missing projectData.json');
			}

			const projectData = JSON.parse(projectDataStr);
			const participants = participantsStr ? JSON.parse(participantsStr) : [];
			const categories = categoriesStr ? JSON.parse(categoriesStr) : [];
			const decorators = decoratorsStr ? JSON.parse(decoratorsStr) : [];

			const { v4: uuidv4 } = await import('uuid');
			const newProjectId = uuidv4();
			const now = new Date().toISOString();

			const newProject = {
				id: newProjectId,
				name: projectData.projectName,
				description: projectData.description || '',
				createdAt: now,
				modifiedAt: now,
			};

			await db.projects.add(newProject);

			const categoryIdMap = new Map();
			const { useCategoryStore } = await import('./categoryStore');

			for (const cat of categories) {
				const newCatId = uuidv4();
				const newCat = {
					id: newCatId,
					name: cat.name,
					parentCategoryId: null,
					projectId: newProjectId,
					createdAt: now,
					modifiedAt: now,
				};
				await db.categories.add(newCat);
				categoryIdMap.set(cat.id, newCatId);
			}

			for (const cat of categories) {
				if (cat.parentCategoryId) {
					const newCatId = categoryIdMap.get(cat.id);
					const newParentId = categoryIdMap.get(cat.parentCategoryId);
					if (newCatId && newParentId) {
						await db.categories.update(newCatId, { parentCategoryId: newParentId });
					}
				}
			}

			for (const part of participants) {
				const newPartId = uuidv4();
				await db.participants.add({
					id: newPartId,
					name: part.name,
					category: part.category,
					projectId: newProjectId,
					createdAt: now,
					modifiedAt: now,
				});
			}

			for (const dec of decorators) {
				const newDecId = uuidv4();
				await db.decorators.add({
					id: newDecId,
					name: dec.name,
					type: dec.type,
					values: dec.values || {},
					projectId: newProjectId,
					createdAt: now,
					modifiedAt: now,
				});
			}

			const { useDialogueStore } = await import('./dialogueStore');
			const dialogueStore = useDialogueStore.getState();

			const dialoguesFolder = zip.folder('dialogues');
			if (dialoguesFolder) {
				const dialogueFiles = [];
				dialoguesFolder.forEach((relativePath, file) => {
					if (relativePath.endsWith('.mnteadlg') && !file.dir) {
						dialogueFiles.push({ path: relativePath, file });
					}
				});

				for (const { path, file } of dialogueFiles) {
					try {
						const dialogueBlob = await file.async('blob');
						const dialogueFile = new File([dialogueBlob], path);
						await dialogueStore.importDialogue(newProjectId, dialogueFile);
					} catch (error) {
						console.error(`Failed to import dialogue ${path}:`, error);
						toast({
							variant: 'error',
							title: 'Failed to Import Dialogue',
							description: `${path}: ${error.message}`,
						});
					}
				}
			}

			await get().loadProjects();

			useSyncStore.getState().schedulePush(newProjectId);

			toast({
				variant: 'success',
				title: 'Project Imported',
				description: `${newProject.name} has been imported successfully`,
			});

			return newProjectId;
		} catch (error) {
			console.error('Error importing project:', error);
			toast({
				variant: 'error',
				title: 'Failed to Import Project',
				description: error.message || 'An unexpected error occurred',
			});
		}
	},
}));
