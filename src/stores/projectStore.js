import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { toast } from '@/components/ui/toaster';
import { openContainingFolder, saveExportBlob } from '@/lib/export/exportFile';
import { useSyncStore } from '@/stores/syncStore';
import { useDialogueStore } from '@/stores/dialogueStore';
import {
	DEFAULT_LOCALE,
	buildLocalizedEntriesFromNodes,
	isValidLocaleTag,
	normalizeProjectLocalizationConfig,
} from '@/lib/localization/stringTable';
import {
	trackExampleProjectCreated,
	trackFirstNonExampleProjectCreated,
} from '@/lib/achievements/achievementTracker';
import {
	blobToStoredParticipantThumbnail,
	buildParticipantImageId,
	storedParticipantThumbnailToBlob,
} from '@/lib/participantThumbnails';
import { resolveOnboardingExampleTemplateFile } from '@/lib/onboarding/templateLoader';

const MAX_PROJECT_IMPORT_ARCHIVE_BYTES = 25 * 1024 * 1024;
const MAX_PROJECT_IMPORT_ENTRY_COUNT = 1000;
const MAX_PROJECT_IMPORT_TEXT_BYTES = 5 * 1024 * 1024;
const MAX_PROJECT_IMPORT_DIALOGUE_FILES = 250;
const ONBOARDING_EXAMPLE_PROJECT_NAME = 'OnboardingExample';

function parseImportedJsonText({ label, value }) {
	if (!value) return null;
	const byteLength = new TextEncoder().encode(String(value)).length;
	if (byteLength > MAX_PROJECT_IMPORT_TEXT_BYTES) {
		throw new Error(`${label} exceeds import size limit`);
	}
	try {
		return JSON.parse(value);
	} catch (error) {
		throw new Error(`Invalid JSON in ${label}`);
	}
}

async function seedProjectLocalizationDefaultLocale(projectId, defaultLocale) {
	const dialogues = await db.dialogues.where('projectId').equals(projectId).toArray();
	const allExisting = await db.localizedStrings.where('projectId').equals(projectId).toArray();
	const existingByDialogue = new Map();

	for (const entry of allExisting) {
		const key = String(entry?.dialogueId || '').trim();
		if (!key) continue;
		if (!existingByDialogue.has(key)) {
			existingByDialogue.set(key, []);
		}
		existingByDialogue.get(key).push(entry);
	}

	const toUpsert = [];
	for (const dialogue of dialogues) {
		const nodes = await db.nodes.where('dialogueId').equals(dialogue.id).toArray();
		const entries = buildLocalizedEntriesFromNodes({
			projectId,
			dialogueId: dialogue.id,
			dialogueSlug: dialogue.localizationSlug || '',
			nodes,
			locale: defaultLocale,
			existingEntries: existingByDialogue.get(dialogue.id) || [],
		});
		toUpsert.push(...entries);
	}

	if (toUpsert.length > 0) {
		await db.localizedStrings.bulkPut(toUpsert);
	}
}

function isOnboardingExampleProject(project) {
	if (!project || typeof project !== 'object') return false;
	return Boolean(project.isExample) || String(project.name || '').trim() === ONBOARDING_EXAMPLE_PROJECT_NAME;
}

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
					return {
						...project,
						localization: normalizeProjectLocalizationConfig(project?.localization || {}),
						dialogueCount,
					};
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
				localization: normalizeProjectLocalizationConfig(
					projectData?.localization || {
						enabled: false,
						defaultLocale: DEFAULT_LOCALE,
						supportedLocales: [DEFAULT_LOCALE],
					}
				),
				isExample: false,
				createdAt: now,
				modifiedAt: now,
			};
			await db.projects.add(newProject);
			try {
				await trackFirstNonExampleProjectCreated();
			} catch (error) {
				console.warn('[achievements] Failed to track first project:', error);
			}
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
	 * Create onboarding example project from a remote template with desktop fallback asset.
	 */
	createOnboardingExampleProject: async () => {
		set({ isLoading: true, error: null });
		try {
			const projects = await db.projects.toArray();
			const existingExampleProject = projects.find(isOnboardingExampleProject);
			if (existingExampleProject) {
				throw new Error('Example graph already exists. Delete the previous example project first.');
			}

			const template = await resolveOnboardingExampleTemplateFile();
			let importedResult = null;
			const projectId = await get().importProject(template.file, {
				isExample: true,
				source: template.source,
				onImported: (payload) => {
					importedResult = payload;
				},
			});
			if (!projectId) {
				throw new Error('Failed to import onboarding example project');
			}
			const dialogueId =
				String(importedResult?.firstDialogueId || '').trim() ||
				String((await db.dialogues.where('projectId').equals(projectId).first())?.id || '').trim();
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
			const existingProject = await db.projects.get(id);
			if (!existingProject) {
				throw new Error('Project not found');
			}

			const previousLocalization = normalizeProjectLocalizationConfig(
				existingProject.localization || {}
			);
			const nextLocalization =
				updates && Object.prototype.hasOwnProperty.call(updates, 'localization')
					? normalizeProjectLocalizationConfig(updates.localization || {})
					: previousLocalization;

			const nextPayload = {
				...updates,
				modifiedAt: new Date().toISOString(),
			};

			if (Object.prototype.hasOwnProperty.call(nextPayload, 'localization')) {
				nextPayload.localization = nextLocalization;
			}

				await db.projects.update(id, nextPayload);

				if (previousLocalization.defaultLocale !== nextLocalization.defaultLocale) {
					await seedProjectLocalizationDefaultLocale(id, nextLocalization.defaultLocale);
				}
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

	updateProjectLocalization: async (id, localizationUpdates = {}) => {
		set({ isLoading: true, error: null });
		try {
			const project = await db.projects.get(id);
			if (!project) {
				throw new Error('Project not found');
			}

			const rawSupported = Array.isArray(localizationUpdates?.supportedLocales)
				? localizationUpdates.supportedLocales
				: [];
			const invalidLocale = rawSupported.find((locale) => !isValidLocaleTag(locale));
			if (invalidLocale) {
				throw new Error(`Invalid locale tag: ${invalidLocale}`);
			}

			const rawDefault = String(localizationUpdates?.defaultLocale || '').trim();
			if (rawDefault && !isValidLocaleTag(rawDefault)) {
				throw new Error(`Invalid locale tag: ${rawDefault}`);
			}

			const nextLocalization = normalizeProjectLocalizationConfig({
				...(project.localization || {}),
				...localizationUpdates,
			});

			await get().updateProject(id, {
				localization: nextLocalization,
			});

			return nextLocalization;
		} catch (error) {
			console.error('Error updating project localization:', error);
			toast({
				variant: 'error',
				title: 'Failed to Update Localization',
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
			const syncedProviders = Array.from(
				new Set(
					(await db.syncProjects.where('projectId').equals(id).toArray())
						.map((entry) => String(entry?.provider || '').trim())
						.filter(Boolean)
				)
			);
			await db.transaction('rw', [db.projects, db.dialogues, db.participants, db.categories, db.decorators, db.conditions, db.localizedStrings, db.nodes, db.edges], async () => {
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
				await db.conditions.where('projectId').equals(id).delete();
				await db.localizedStrings.where('projectId').equals(id).delete();
			});
			await get().loadProjects();
			await useDialogueStore.getState().loadDialogues();
			await useSyncStore.getState().scheduleProjectDeletion(id, {
				providers: syncedProviders,
			});
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
			set({
				currentProject: project
					? {
						...project,
						localization: normalizeProjectLocalizationConfig(project.localization || {}),
					}
					: null,
				isLoading: false,
			});
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
			// Load JSZip
			const JSZip = (await import('jszip')).default;

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

			// Get categories, participants, decorators, and conditions
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
			const conditions = await db.conditions
				.where('projectId')
				.equals(projectId)
				.toArray();
			const dialogueIds = dialogues.map((dialogue) => dialogue.id).filter(Boolean);
			const nodes = dialogueIds.length > 0
				? await db.nodes.where('dialogueId').anyOf(dialogueIds).toArray()
				: [];
			const edges = dialogueIds.length > 0
				? await db.edges.where('dialogueId').anyOf(dialogueIds).toArray()
				: [];

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
				localization: normalizeProjectLocalizationConfig(project.localization || {}),
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
				participantImage: p.thumbnail
					? buildParticipantImageId({
						participantName: p.name,
						categoryPath: categoryPathMap.get(p.category) || p.category,
					})
					: null,
			}));

			const usedDecoratorIds = new Set();
			const usedDecoratorNames = new Set();
			const usedConditionIds = new Set();
			const usedConditionNames = new Set();

			nodes.forEach((node) => {
				const decoratorInstances = Array.isArray(node?.data?.decorators) ? node.data.decorators : [];
				decoratorInstances.forEach((decorator) => {
					const decoratorId = String(decorator?.id || '').trim();
					const decoratorName = String(decorator?.name || '').trim();
					if (decoratorId) usedDecoratorIds.add(decoratorId);
					if (decoratorName) usedDecoratorNames.add(decoratorName);
				});
			});

			edges.forEach((edge) => {
				const rules = Array.isArray(edge?.data?.conditions?.rules) ? edge.data.conditions.rules : [];
				rules.forEach((rule) => {
					const conditionId = String(rule?.id || '').trim();
					const conditionName = String(rule?.name || '').trim();
					if (conditionId) usedConditionIds.add(conditionId);
					if (conditionName) usedConditionNames.add(conditionName);
				});
			});

			// Export used decorator/condition definitions only (retain GUID/id).
			const exportWithoutMeta = (entry) => {
				const exported = { ...entry };
				delete exported.projectId;
				delete exported.createdAt;
				delete exported.modifiedAt;
				return exported;
			};
			const decoratorsExport = decorators
				.filter((definition) => {
					const definitionId = String(definition?.id || '').trim();
					const definitionName = String(definition?.name || '').trim();
					return usedDecoratorIds.has(definitionId) || usedDecoratorNames.has(definitionName);
				})
				.map(exportWithoutMeta);
			const conditionsExport = conditions
				.filter((definition) => {
					const definitionId = String(definition?.id || '').trim();
					const definitionName = String(definition?.name || '').trim();
					return usedConditionIds.has(definitionId) || usedConditionNames.has(definitionName);
				})
				.map(exportWithoutMeta);

			// Create main project ZIP
			const projectZip = new JSZip();

			// Add project JSON files
			projectZip.file('projectData.json', JSON.stringify(projectData, null, 2));
			projectZip.file('categories.json', JSON.stringify(categoriesExport, null, 2));
			projectZip.file('participants.json', JSON.stringify(participantsExport, null, 2));
			projectZip.file('decorators.json', JSON.stringify(decoratorsExport, null, 2));
			projectZip.file('conditions.json', JSON.stringify(conditionsExport, null, 2));
			const thumbnailsFolder = projectZip.folder('Thumbnails');
			participantsExport.forEach((entry, index) => {
				const participantImageId = String(entry?.participantImage || '').trim();
				if (!participantImageId) return;
				const participant = participants[index];
				try {
					const thumbnailBlob = storedParticipantThumbnailToBlob(participant?.thumbnail);
					if (!thumbnailBlob) return;
					thumbnailsFolder.file(`${participantImageId}.png`, thumbnailBlob);
				} catch (error) {
					console.warn(
						`Skipping invalid participant thumbnail for ${participant?.name || participantImageId}`
					);
				}
			});

			// Create dialogues folder
			const dialoguesFolder = projectZip.folder('dialogues');

			// Export each dialogue as a .mnteadlg file
			const { useDialogueStore } = await import('./dialogueStore');
			const dialogueStore = useDialogueStore.getState();

			for (const dialogue of dialogues) {
				try {
					console.log(`Exporting dialogue: ${dialogue.name} (${dialogue.id})`);

					// Generate nested dialogue export blob without thumbnails.
					// Project-level archive already contains all participant thumbnails.
					const dialogueBlob = await dialogueStore.exportDialogueAsBlob(dialogue.id, {
						includeThumbnails: false,
					});

					// Add to dialogues folder with sanitized name
					const sanitizedName = dialogue.name.replace(/[^a-z0-9]/gi, '_');
					dialoguesFolder.file(`${sanitizedName}.mnteadlg`, dialogueBlob);
					console.log(`Successfully exported dialogue: ${dialogue.name}`);
				} catch (error) {
					console.error(`Failed to export dialogue ${dialogue.name}:`, error);
					throw new Error(
						`Failed to export dialogue "${dialogue.name}": ${error.message || 'Unknown error'}`
					);
				}
			}

			// Generate the final ZIP
			const blob = await projectZip.generateAsync({ type: 'blob' });
			const defaultFileName = `${project.name}.mnteadlgproj`;
			const saveResult = await saveExportBlob({
				blob,
				defaultFileName,
				filters: [{ name: 'Project Export', extensions: ['mnteadlgproj'] }],
			});
			if (saveResult.canceled) {
				return;
			}

			if (saveResult.filePath) {
				await db.projects.update(projectId, {
					lastExportPath: saveResult.filePath,
				});
				set((state) => ({
					projects: state.projects.map((entry) =>
						entry.id === projectId
							? { ...entry, lastExportPath: saveResult.filePath }
							: entry
					),
					currentProject:
						state.currentProject?.id === projectId
							? { ...state.currentProject, lastExportPath: saveResult.filePath }
							: state.currentProject,
				}));
			}

			toast({
				variant: 'success',
				title: 'Project Exported',
				description: `${defaultFileName} has been exported`,
				action: saveResult.filePath
					? {
						label: 'Open Folder',
						onClick: () => {
							void openContainingFolder(saveResult.filePath);
						},
					}
					: undefined,
				duration: saveResult.filePath ? 8000 : 3000,
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

	importProject: async (file, options = {}) => {
		try {
			const importOptions = options && typeof options === 'object' ? options : {};
			if (!file) {
				throw new Error('Missing import file');
			}
			if (file.size > MAX_PROJECT_IMPORT_ARCHIVE_BYTES) {
				throw new Error(
					`Project archive is too large (max ${Math.floor(
						MAX_PROJECT_IMPORT_ARCHIVE_BYTES / (1024 * 1024)
					)} MB)`
				);
			}

			const JSZip = (await import('jszip')).default;
			const zip = await JSZip.loadAsync(file);
			const allZipEntries = Object.values(zip.files || {});
			const fileEntries = allZipEntries.filter((entry) => entry && !entry.dir);
			if (fileEntries.length > MAX_PROJECT_IMPORT_ENTRY_COUNT) {
				throw new Error('Project archive contains too many files');
			}
			for (const entry of fileEntries) {
				const safePath = String(entry?.name || '');
				if (safePath.startsWith('/') || safePath.includes('..')) {
					throw new Error(`Unsafe path in project archive: ${safePath}`);
				}
			}

			const projectDataStr = await zip.file('projectData.json')?.async('text');
			const participantsStr = await zip.file('participants.json')?.async('text');
			const categoriesStr = await zip.file('categories.json')?.async('text');
			const decoratorsStr = await zip.file('decorators.json')?.async('text');
			const conditionsStr = await zip.file('conditions.json')?.async('text');

			if (!projectDataStr) {
				throw new Error('Invalid project file: missing projectData.json');
			}

			const projectData = parseImportedJsonText({
				label: 'projectData.json',
				value: projectDataStr,
			});
			if (!projectData || typeof projectData !== 'object' || Array.isArray(projectData)) {
				throw new Error('Invalid project metadata in projectData.json');
			}
			const participants =
				parseImportedJsonText({
					label: 'participants.json',
					value: participantsStr,
				}) || [];
			const categories =
				parseImportedJsonText({
					label: 'categories.json',
					value: categoriesStr,
				}) || [];
			const decorators =
				parseImportedJsonText({
					label: 'decorators.json',
					value: decoratorsStr,
				}) || [];
			const conditions =
				parseImportedJsonText({
					label: 'conditions.json',
					value: conditionsStr,
				}) || [];
			if (
				!Array.isArray(participants) ||
				!Array.isArray(categories) ||
				!Array.isArray(decorators) ||
				!Array.isArray(conditions)
			) {
				throw new Error('Imported project metadata must contain arrays');
			}

			const { v4: uuidv4 } = await import('uuid');
			const importedProjectGuid = String(projectData?.projectGuid || projectData?.id || '').trim();
			const newProjectId = importedProjectGuid || uuidv4();
			const now = new Date().toISOString();
			const existingProject = await db.projects.get(newProjectId);

			if (existingProject) {
				await db.transaction(
					'rw',
					[
						db.dialogues,
						db.nodes,
						db.edges,
						db.participants,
						db.categories,
						db.decorators,
						db.conditions,
						db.localizedStrings,
						db.syncProjects,
						db.syncDeletions,
						db.syncTombstones,
					],
					async () => {
						const existingDialogues = await db.dialogues.where('projectId').equals(newProjectId).toArray();
						const dialogueIds = existingDialogues
							.map((dialogue) => String(dialogue?.id || '').trim())
							.filter(Boolean);

						if (dialogueIds.length > 0) {
							await db.nodes.where('dialogueId').anyOf(dialogueIds).delete();
							await db.edges.where('dialogueId').anyOf(dialogueIds).delete();
						}

						await db.dialogues.where('projectId').equals(newProjectId).delete();
						await db.participants.where('projectId').equals(newProjectId).delete();
						await db.categories.where('projectId').equals(newProjectId).delete();
						await db.decorators.where('projectId').equals(newProjectId).delete();
						await db.conditions.where('projectId').equals(newProjectId).delete();
						await db.localizedStrings.where('projectId').equals(newProjectId).delete();
						await db.syncProjects.where('projectId').equals(newProjectId).delete();
						await db.syncDeletions.where('projectId').equals(newProjectId).delete();
						await db.syncTombstones.where('projectId').equals(newProjectId).delete();
					}
				);
			}

			const newProject = {
				id: newProjectId,
				name: projectData.projectName,
				description: projectData.projectDescription || projectData.description || '',
				version: projectData.version || '1.0.0',
				localization: normalizeProjectLocalizationConfig(projectData.localization || {}),
				isExample: Boolean(importOptions.isExample),
				importSource: String(importOptions.source || 'manual-import'),
				createdAt: projectData.createdAt || existingProject?.createdAt || now,
				modifiedAt: now,
			};

			await db.projects.put(newProject);

			// Build category hierarchy from fullPath (e.g. "NPC.Merchant" → NPC > Merchant)
			const existingCategoryPaths = new Map(); // fullPath → { id, name }

			for (const cat of categories) {
				const fullPath = String(cat?.fullPath || cat?.name || '').trim();
				if (!fullPath) continue;
				const pathParts = fullPath.split('.');
				let parentId = null;
				let currentPath = '';

				for (const part of pathParts) {
					currentPath = currentPath ? `${currentPath}.${part}` : part;
					if (!existingCategoryPaths.has(currentPath)) {
						const newCatId = uuidv4();
						await db.categories.add({
							id: newCatId,
							name: part,
							parentCategoryId: parentId,
							projectId: newProjectId,
							createdAt: now,
							modifiedAt: now,
						});
						existingCategoryPaths.set(currentPath, { id: newCatId, name: part });
						parentId = newCatId;
					} else {
						parentId = existingCategoryPaths.get(currentPath).id;
					}
				}
			}

			// Build path-to-leaf-name map for participant category resolution
			const importedCategoryPathToName = new Map();
			for (const [path, entry] of existingCategoryPaths) {
				importedCategoryPathToName.set(path, entry.name);
			}

			for (const part of participants) {
				const participantImageId = String(part?.participantImage || '').trim();
				let thumbnail = null;
				if (participantImageId) {
					const thumbnailEntry =
						zip.file(`Thumbnails/${participantImageId}.png`) ||
						zip.file(`thumbnails/${participantImageId}.png`);
					if (thumbnailEntry) {
						try {
							const thumbnailBlob = await thumbnailEntry.async('blob');
							thumbnail = await blobToStoredParticipantThumbnail(thumbnailBlob);
						} catch (error) {
							console.warn(
								`Skipping invalid participant thumbnail in project import (${participantImageId})`
							);
						}
					}
				}

				const fullPath = String(part?.fullPath || '').trim();
				const categoryName =
					importedCategoryPathToName.get(fullPath) ||
					String(part?.category || '').trim() ||
					(fullPath ? fullPath.split('.').pop() : 'Unknown');

				const newPartId = uuidv4();
				await db.participants.add({
					id: newPartId,
					name: part.name,
					category: categoryName || 'Unknown',
					thumbnail,
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

			for (const cond of conditions) {
				const newConditionId = uuidv4();
				await db.conditions.add({
					id: newConditionId,
					name: cond.name,
					type: cond.type,
					properties: cond.properties || [],
					projectId: newProjectId,
					createdAt: now,
					modifiedAt: now,
				});
			}

			const { useDialogueStore } = await import('./dialogueStore');
			const dialogueStore = useDialogueStore.getState();
			let firstDialogueId = null;

			const dialoguesFolder = zip.folder('dialogues');
			if (dialoguesFolder) {
				const dialogueFiles = [];
				dialoguesFolder.forEach((relativePath, file) => {
					if (relativePath.endsWith('.mnteadlg') && !file.dir) {
						dialogueFiles.push({ path: relativePath, file });
					}
				});
				if (dialogueFiles.length > MAX_PROJECT_IMPORT_DIALOGUE_FILES) {
					throw new Error('Project archive contains too many dialogue files');
				}

				for (const { path, file } of dialogueFiles) {
					try {
						if (String(path || '').startsWith('/') || String(path || '').includes('..')) {
							throw new Error('Unsafe dialogue archive path');
						}
						const dialogueBlob = await file.async('blob');
						const dialogueFile = new File([dialogueBlob], path);
						const importedDialogue = await dialogueStore.importDialogue(newProjectId, dialogueFile);
						if (!firstDialogueId) {
							firstDialogueId = String(importedDialogue?.id || '').trim() || null;
						}
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

			if (importOptions.isExample) {
				try {
					await trackExampleProjectCreated();
				} catch (error) {
					console.warn('[achievements] Failed to track example project:', error);
				}
			}

			useSyncStore.getState().schedulePush(newProjectId);

			if (typeof importOptions.onImported === 'function') {
				importOptions.onImported({
					projectId: newProjectId,
					firstDialogueId,
					source: importOptions.source || 'manual-import',
					isExample: Boolean(importOptions.isExample),
				});
			}

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

