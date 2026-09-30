import { describeError, errorToast } from '@/lib/errorPresentation';
import { exportProjectArchive, prepareArchiveImport } from '@/lib/persistence/projectArchive';
import { buildProjectSnapshot } from '@/lib/sync/snapshot';
import { prepareProjectCommit, commitPreparedProject, mutateProject } from '@/lib/persistence/projectRepository';
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { getRepositoryContext } from '@/lib/db';
import { toast } from '@/components/ui/toaster';
import { saveExportBlob } from '@/lib/export/exportFile';
import { useSyncStore } from '@/stores/syncStore';
import { useDialogueStore } from '@/stores/dialogueStore';
import {
	DEFAULT_LOCALE,
	allocateDialogueLocalizationSlug,
	prepareLocalizedNodesAndEntries,
	validateLocalizedEntriesForDialogue,
	isValidLocaleTag,
	normalizeProjectLocalizationConfig,
} from '@/lib/localization/stringTable';
import {
	trackExampleProjectCreated,
	trackFirstNonExampleProjectCreated,
} from '@/lib/achievements/achievementTracker';
import { resolveOnboardingExampleTemplateFile } from '@/lib/onboarding/templateLoader';

const ONBOARDING_EXAMPLE_PROJECT_NAME = 'OnboardingExample';

function seedProjectLocalizationDefaultLocale(snapshot, projectId, defaultLocale, previousDefaultLocale) {
	const dialogues = snapshot.dialogues;
	// Migrate original inline text using the OLD default before changing its meaning.
	for (const dialogue of dialogues) {
		const nodes = snapshot.nodes.filter((node) => node.dialogueId === dialogue.id);
		const projectEntries = snapshot.localizedStrings;
		const existingEntries = projectEntries.filter((entry) => entry.dialogueId === dialogue.id);
		const slug = allocateDialogueLocalizationSlug(dialogue, dialogues);
		const prepared = prepareLocalizedNodesAndEntries({ projectId, dialogueId: dialogue.id, dialogueSlug: slug, nodes, locale: previousDefaultLocale, existingEntries });
		const validation = validateLocalizedEntriesForDialogue({ projectId, dialogueId: dialogue.id, dialogueSlug: slug, nodes: prepared.nodes, entries: prepared.entries, defaultLocale: previousDefaultLocale, projectEntries });
		if (!validation.valid) {
			const error = new Error(`Repair localization before changing the default locale: ${validation.errors[0].type}`);
			error.code = 'LOCALIZATION_REPAIR_REQUIRED';
			error.diagnostics = validation.errors;
			throw error;
		}
		snapshot.nodes = snapshot.nodes.filter((node) => node.dialogueId !== dialogue.id).concat(prepared.nodes);
		snapshot.localizedStrings = snapshot.localizedStrings.filter((entry) => entry.dialogueId !== dialogue.id).concat(prepared.entries);
		dialogue.localizationVersion = 2;
		dialogue.localizationSlug = slug;
	}
	const entries = snapshot.localizedStrings;
	const updates = [];
	for (const entry of entries) {
		const values = entry.values || {};
		if (Object.prototype.hasOwnProperty.call(values, defaultLocale)) continue;
		if (!Object.prototype.hasOwnProperty.call(values, previousDefaultLocale)) {
			const error = new Error(`Missing source translation for ${entry.key}; repair this entry before changing the default locale.`);
			error.code = 'LOCALIZATION_REPAIR_REQUIRED';
			error.diagnostics = [{ type: 'missing_default_locale_value', key: entry.key, locale: previousDefaultLocale }];
			throw error;
		}
		updates.push({ ...entry, values: { ...values, [defaultLocale]: values[previousDefaultLocale] }, modifiedAt: new Date().toISOString() });
	}
	const byKey = new Map(updates.map((entry) => [entry.key, entry]));
	snapshot.localizedStrings = snapshot.localizedStrings.map((entry) => byKey.get(entry.key) || entry);
}

function isOnboardingExampleProject(project) {
	if (!project || typeof project !== 'object') return false;
	return Boolean(project.isExample) || String(project.name || '').trim() === ONBOARDING_EXAMPLE_PROJECT_NAME;
}

const loadRequests = {};

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
		const request = loadRequests.loadProjects = (loadRequests.loadProjects || 0) + 1;
		set({ isLoading: true, error: null });
		try {
			const context = await getRepositoryContext();
			const database = context.db;
			const projects = await database.projects.toArray();

			// Load dialogue counts for each project
			const projectsWithCounts = await Promise.all(
				projects.map(async (project) => {
					const dialogueCount = await database.dialogues
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

			context.assertCurrent();
			if (request !== loadRequests.loadProjects) return;
			set({ projects: projectsWithCounts, isLoading: false });
		} catch (error) {
			if (error.code === 'STALE_PROFILE') throw error;
			if (request !== loadRequests.loadProjects) return;
			console.error('Error loading projects:', error);
			toast(errorToast(error, 'load'));
			set({ error: describeError(error), isLoading: false });
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
				...projectData,
				id,
				localization: normalizeProjectLocalizationConfig(
					projectData?.localization || {
						defaultLocale: DEFAULT_LOCALE,
						supportedLocales: [DEFAULT_LOCALE],
					}
				),
				isExample: false,
				createdAt: now,
				modifiedAt: now,
			};
			const context = await getRepositoryContext();
			await commitPreparedProject(await prepareProjectCommit({ project: newProject }, { context, expectedSequence: 0, operation: 'create' }));
			context.assertCurrent();
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
			if (error.code === 'STALE_PROFILE') throw error;
			console.error('Error creating project:', error);
			toast(errorToast(error, 'create'));
			set({ error: describeError(error), isLoading: false });
			throw error;
		}
	},

	/**
	 * Create onboarding example project from a remote template with desktop fallback asset.
	 */
	createOnboardingExampleProject: async () => {
		set({ isLoading: true, error: null });
		try {
			const context = await getRepositoryContext();
			const database = context.db;
			const projects = await database.projects.toArray();
			const existingExampleProject = projects.find(isOnboardingExampleProject);
			if (existingExampleProject) {
				throw new Error('Example graph already exists. Delete the previous example project first.');
			}

			const template = await resolveOnboardingExampleTemplateFile();
			context.assertCurrent();
			let importedResult = null;
			const projectId = await get().importProject(template.file, {
				isExample: true,
				context,
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
				String((await database.dialogues.where('projectId').equals(projectId).first())?.id || '').trim();
			return { projectId, dialogueId };
		} catch (error) {
			if (error.code === 'STALE_PROFILE') throw error;
			console.error('Error creating onboarding example project:', error);
			toast(errorToast(error, 'create'));
			set({ error: describeError(error), isLoading: false });
			throw error;
		}
	},
	/**
	 * Update an existing project
	 */
	updateProject: async (id, updates, options = {}) => {
		set({ isLoading: true, error: null });
		try {
			const context = options.repositoryContext || await getRepositoryContext();
			const database = context.db;
			context.assertCurrent();
			await mutateProject(id, { context, transform: (snapshot) => {
				const previous = normalizeProjectLocalizationConfig(snapshot.project.localization || {});
				const next = Object.prototype.hasOwnProperty.call(updates || {}, 'localization') ? normalizeProjectLocalizationConfig(updates.localization || {}) : previous;
				if (previous.defaultLocale !== next.defaultLocale) seedProjectLocalizationDefaultLocale(snapshot, id, next.defaultLocale, previous.defaultLocale);
				snapshot.project = { ...snapshot.project, ...updates, id, localization: next, modifiedAt: new Date().toISOString() };
			} });
			context.assertCurrent();
			const projects = await database.projects.toArray();
			context.assertCurrent();
			set((state) => ({ projects: projects.map((project) => ({ ...state.projects.find((existing) => existing.id === project.id), ...project })), isLoading: false }));
			useSyncStore.getState().schedulePush(id);
			toast({ variant: 'success', title: 'Project Updated', description: 'Project has been updated successfully' });
		} catch (error) {
			if (error.code !== 'STALE_PROFILE') {
				toast(errorToast(error, 'update'));
				set({ error: describeError(error), isLoading: false });
			}
			throw error;
		}
	},

	updateProjectLocalization: async (id, localizationUpdates = {}) => {
		set({ isLoading: true, error: null });
		try {
			const context = await getRepositoryContext();
			const project = await context.db.projects.get(id);
			context.assertCurrent();
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
			}, { repositoryContext: context });
			context.assertCurrent();

			return nextLocalization;
		} catch (error) {
			if (error.code === 'STALE_PROFILE') throw error;
			console.error('Error updating project localization:', error);
			toast(errorToast(error, 'update'));
			set({ error: describeError(error), isLoading: false });
			throw error;
		}
	},

	/**
	 * Delete a project and all its related data
	 */
	deleteProject: async (id) => {
		set({ isLoading: true, error: null });
		try {
			const context = await getRepositoryContext();
			await mutateProject(id, { context, operation: 'delete' }); context.assertCurrent();
			await get().loadProjects(); context.assertCurrent();
			await useDialogueStore.getState().loadDialogues(); context.assertCurrent();
			toast({
				variant: 'success',
				title: 'Project Deleted',
				description: 'Project and all related data have been deleted',
			});
		} catch (error) {
			if (error.code === 'STALE_PROFILE') throw error;
			console.error('Error deleting project:', error);
			toast(errorToast(error, 'delete'));
			set({ error: describeError(error), isLoading: false });
			throw error;
		}
	},

	/**
	 * Set the current active project
	 */
	setCurrentProject: async (id) => {
		const request = loadRequests.setCurrentProject = (loadRequests.setCurrentProject || 0) + 1;
		set({ isLoading: true, error: null });
		try {
			const context = await getRepositoryContext();
			const database = context.db;
			const project = await database.projects.get(id);
			context.assertCurrent();
			if (request !== loadRequests.setCurrentProject) return;
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
			if (error.code === 'STALE_PROFILE') throw error;
			if (request !== loadRequests.setCurrentProject) return;
			console.error('Error setting current project:', error);
			toast(errorToast(error, 'load'));
			set({ error: describeError(error), isLoading: false });
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
		const context = await getRepositoryContext();
		try {
			const snapshot = await buildProjectSnapshot(projectId, { context, requireReady: true });
			const blob = await exportProjectArchive(snapshot);
			context.assertCurrent();
			const saved = await saveExportBlob({ blob, defaultFileName: `${snapshot.project.name}.mnteadlgproj`, filters: [{ name: 'Project Export', extensions: ['mnteadlgproj'] }] });
			context.assertCurrent();
			if (saved.canceled) return;
			if (saved.filePath) await context.db.projects.update(projectId, { lastExportPath: saved.filePath });
			toast({ variant: 'success', title: 'Project Exported', description: snapshot.project.name });
			return blob;
		} catch (error) { if (error.code !== 'STALE_PROFILE') toast(errorToast(error, 'export')); throw error; }
	},
	importProject: async (file, options = {}) => {
		const context = options.context || await getRepositoryContext();
		context.assertCurrent();
		try {
			const imported = await prepareArchiveImport(file, { ...options, context });
			await commitPreparedProject(imported.prepared); context.assertCurrent();
			await get().loadProjects(); context.assertCurrent();
			if (options.isExample) await trackExampleProjectCreated();
			options.onImported?.({ projectId: imported.projectId, firstDialogueId: imported.firstDialogueId, source: options.source || 'manual-import', isExample: Boolean(options.isExample) });
			useSyncStore.getState().schedulePush(imported.projectId);
			toast({ variant: 'success', title: 'Project Imported', description: imported.prepared.revision.snapshot.project.name });
			return imported.projectId;
		} catch (error) { if (error.code !== 'STALE_PROFILE') toast(errorToast(error, 'import')); throw error; }
	},
}));
