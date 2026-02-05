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
			await db.transaction('rw', [db.projects, db.dialogues, db.participants, db.categories, db.decorators], async () => {
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
