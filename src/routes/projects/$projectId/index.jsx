import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Menu, Trash2, Sun, Moon } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useProjectStore } from '@/stores/projectStore';
import { useDialogueStore } from '@/stores/dialogueStore';
import { useParticipantStore } from '@/stores/participantStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { useDecoratorStore } from '@/stores/decoratorStore';
import { useConditionStore } from '@/stores/conditionStore';
import { useSyncStore } from '@/stores/syncStore';
import { ProjectSidebar } from '@/components/projects/ProjectSidebar';
import { CreateDialogueDialog } from '@/components/dialogues/CreateDialogueDialog';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeProvider';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { AppHeader } from '@/components/ui/app-header';
import { SaveIndicator } from '@/components/ui/save-indicator';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { isMobileDevice } from '@/lib/deviceDetection';
import { isDesktopElectronRuntime } from '@/lib/electronRuntime';
import { toast } from '@/components/ui/toaster';
import { openContainingFolder } from '@/lib/export/exportFile';

// Import section components (we'll create these)
import { OverviewSection } from '@/components/projects/sections/OverviewSection';
import { DialoguesSection } from '@/components/projects/sections/DialoguesSection';
import { ParticipantsSection } from '@/components/projects/sections/ParticipantsSection';
import { CategoriesSection } from '@/components/projects/sections/CategoriesSection';
import { DecoratorsSection } from '@/components/projects/sections/DecoratorsSection';
import { ConditionsSection } from '@/components/projects/sections/ConditionsSection';
import { ProjectSettingsSection } from '@/components/projects/sections/ProjectSettingsSection';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const Route = createFileRoute('/projects/$projectId/')({
	component: ProjectDetailsPage,
});

function ProjectDetailsPage() {
	const { t } = useTranslation();
	const { resolvedTheme, setTheme } = useTheme();
	const { projectId } = Route.useParams();
	const searchParams = Route.useSearch();
	const isMobile = isMobileDevice();
	const isDesktopElectron = isDesktopElectronRuntime();
	const { projects, loadProjects, deleteProject, exportProject, importProject } =
		useProjectStore();
	const { dialogues, loadDialogues } = useDialogueStore();
	const { participants, loadParticipants } = useParticipantStore();
	const { categories, loadCategories } = useCategoryStore();
	const { decorators, loadDecorators } = useDecoratorStore();
	const { conditions, loadConditions } = useConditionStore();
	const { status: syncStatus, checkRemoteDiff, startPull, lastSyncedAt } = useSyncStore();

	const [isLoading, setIsLoading] = useState(true);
	const [activeSection, setActiveSection] = useState(searchParams?.section || 'overview');
	const [isImporting, setIsImporting] = useState(false);
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [isCreateDialogueDialogOpen, setIsCreateDialogueDialogOpen] = useState(false);
	const syncCheckedRef = useRef(new Set());
	const fileInputRef = useRef(null);

	const loadData = useCallback(async () => {
		setIsLoading(true);
		await Promise.all([
			loadProjects(),
			loadDialogues(),
			loadParticipants(projectId),
			loadCategories(projectId),
			loadDecorators(projectId),
			loadConditions(projectId),
		]);
		setIsLoading(false);
	}, [loadProjects, loadDialogues, loadParticipants, loadCategories, loadDecorators, loadConditions, projectId]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	useEffect(() => {
		if (!lastSyncedAt) return;
		loadData();
	}, [lastSyncedAt, loadData]);

	useEffect(() => {
		const runSyncCheck = async () => {
			if (!projectId || syncStatus !== 'connected') return;
			if (syncCheckedRef.current.has(projectId)) return;

			syncCheckedRef.current.add(projectId);
			const hasRemoteChanges = await checkRemoteDiff(projectId);
			if (hasRemoteChanges) {
				await startPull(projectId, { simulate: true });
			}
		};

		runSyncCheck();
	}, [projectId, syncStatus, checkRemoteDiff, startPull]);

	const project = projects.find((p) => p.id === projectId);
	const projectDialogues = dialogues.filter((d) => d.projectId === projectId);
	const projectParticipants = participants.filter((p) => p.projectId === projectId);
	const projectCategories = categories.filter((c) => c.projectId === projectId);
	const projectDecorators = decorators.filter((d) => d.projectId === projectId);
	const projectConditions = conditions.filter((c) => c.projectId === projectId);

	const handleExport = async () => {
		try {
			await exportProject(projectId);
		} catch (error) {
			console.error('Failed to export project:', error);
		}
	};

	const handleOpenLastExportPath = useCallback(async () => {
		const lastExportPath = String(project?.lastExportPath || '').trim();
		if (!lastExportPath) {
			toast({
				variant: 'warning',
				title: 'No export path available',
				description: 'Export this project first to create a last export path.',
			});
			return;
		}

		const opened = await openContainingFolder(lastExportPath);
		if (!opened) {
			toast({
				variant: 'error',
				title: 'Unable to open export path',
				description: isDesktopElectron
					? 'The export folder could not be opened.'
					: 'Open Last Export Path is available in the desktop app.',
			});
		}
	}, [isDesktopElectron, project?.lastExportPath]);

	const handleCreateDialogueRequest = useCallback(() => {
		setActiveSection('dialogues');
		setIsCreateDialogueDialogOpen(true);
	}, []);

	useEffect(() => {
		const handleCommandExport = (event) => {
			const detail = event?.detail;
			if (!detail || detail.projectId !== projectId) return;
			handleExport();
		};

		const handleCommandImport = (event) => {
			const detail = event?.detail;
			if (!detail || detail.projectId !== projectId) return;
			if (fileInputRef.current) {
				fileInputRef.current.click();
			}
		};

		const handleCommandOpenLastExport = (event) => {
			const detail = event?.detail;
			if (!detail || detail.projectId !== projectId) return;
			void handleOpenLastExportPath();
		};

		const handleCommandNewDialogue = (event) => {
			const detail = event?.detail;
			if (!detail || detail.projectId !== projectId) return;
			handleCreateDialogueRequest();
		};

		window.addEventListener('command:project-export', handleCommandExport);
		window.addEventListener('command:project-import', handleCommandImport);
		window.addEventListener(
			'command:project-open-last-export',
			handleCommandOpenLastExport
		);
		window.addEventListener('command:project-new-dialogue', handleCommandNewDialogue);

		return () => {
			window.removeEventListener('command:project-export', handleCommandExport);
			window.removeEventListener('command:project-import', handleCommandImport);
			window.removeEventListener(
				'command:project-open-last-export',
				handleCommandOpenLastExport
			);
			window.removeEventListener('command:project-new-dialogue', handleCommandNewDialogue);
		};
	}, [projectId, handleCreateDialogueRequest, handleExport, handleOpenLastExportPath]);

	useEffect(() => {
		if (isMobile) return;

		const handleKeyDown = (event) => {
			const target = event.target;
			const isTyping =
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.isContentEditable;

			if (isTyping) return;

			if (event.ctrlKey || event.metaKey) {
				const key = event.key.toLowerCase();
				if (key === 'e') {
					event.preventDefault();
					handleExport();
					return;
				}
				if (key === 'i') {
					event.preventDefault();
					if (fileInputRef.current) {
						fileInputRef.current.click();
					}
					return;
				}
				if (key === 'n') {
					event.preventDefault();
					handleCreateDialogueRequest();
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleCreateDialogueRequest, handleExport, isMobile]);

	const handleImport = async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;

		setIsImporting(true);
		try {
			await importProject(file);
			// Reload all data after import
			await loadData();
		} catch (error) {
			console.error('Failed to import project:', error);
		} finally {
			setIsImporting(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	const handleDelete = async () => {
		await deleteProject(projectId);
		window.location.href = '#/';
	};

	const handleDeleteRequest = () => {
		setShowDeleteDialog(true);
	};

	if (isLoading) {
		return (
			<div className={`${isMobile ? 'min-h-screen' : 'h-screen'} flex items-center justify-center`}>
				<p className="text-muted-foreground">{t('common.loading')}</p>
			</div>
		);
	}

	if (!project) {
		return (
			<div className={`${isMobile ? 'min-h-screen' : 'h-screen'} flex items-center justify-center`}>
				<div className="text-center">
					<h2 className="text-2xl font-bold mb-2">{t('projects.notFound')}</h2>
					<p className="text-muted-foreground">{t('projects.notFoundDescription')}</p>
				</div>
			</div>
		);
	}

	return (
		<div className={`${isMobile ? 'h-[100dvh]' : 'h-screen'} flex flex-col overflow-hidden`}>
			<AppHeader
				className={isMobileSidebarOpen ? 'z-40' : undefined}
				left={
					<>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setIsMobileSidebarOpen(true)}
							className="lg:hidden rounded-full shrink-0"
						>
							<Menu className="h-5 w-5" />
						</Button>
						<Link to="/">
							<SimpleTooltip content={t('common.back')} side="bottom">
								<Button variant="ghost" size="icon" className="rounded-full shrink-0">
									<ArrowLeft className="h-5 w-5" />
								</Button>
							</SimpleTooltip>
						</Link>
						<div className="min-w-0">
							<h1 className="text-sm md:text-2xl font-bold tracking-tight truncate">{project.name}</h1>
						</div>
					</>
				}
				right={
					<span className="hidden md:flex" data-header-mobile-hidden>
						<SaveIndicator status="saved" className="hidden md:flex" />
					</span>
				}
				menuItems={
					isDesktopElectron ? null : (
						<>
							<LanguageSelector />
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
								className="justify-start"
							>
								{resolvedTheme === 'dark' ? (
									<>
										<Sun className="h-4 w-4 mr-2" />
										{t('settings.lightMode')}
									</>
								) : (
									<>
										<Moon className="h-4 w-4 mr-2" />
										{t('settings.darkMode')}
									</>
								)}
							</Button>
						</>
					)
				}
			/>

			{/* Mobile Sidebar Overlay */}
			{isMobileSidebarOpen && (
				<div
					className="fixed inset-0 bg-black/50 z-50 lg:hidden"
					onClick={() => setIsMobileSidebarOpen(false)}
				/>
			)}

			<input
				ref={fileInputRef}
				type="file"
				accept=".mnteadlgproj"
				onChange={handleImport}
				className="hidden"
			/>
			<CreateDialogueDialog
				open={isCreateDialogueDialogOpen}
				onOpenChange={setIsCreateDialogueDialogOpen}
				projectId={projectId}
			/>

			{/* Main Content */}
			<div className="flex-1 flex min-h-0 overflow-hidden">
				<ProjectSidebar
					activeSection={activeSection}
					onSectionChange={(section) => {
						setActiveSection(section);
						setIsMobileSidebarOpen(false);
					}}
					project={project}
					dialogueCount={projectDialogues.length}
					participantCount={projectParticipants.length}
					isMobileOpen={isMobileSidebarOpen}
					onMobileClose={() => setIsMobileSidebarOpen(false)}
				/>

				<main className="flex-1 bg-grid overflow-x-hidden overflow-y-auto overscroll-contain">
					<div className="max-w-5xl mx-auto p-4 md:p-8 lg:p-12">
						{activeSection === 'overview' && (
							<OverviewSection
								project={project}
								dialogues={projectDialogues}
								participants={projectParticipants}
								categories={projectCategories}
								decorators={projectDecorators}
								conditions={projectConditions}
								onExport={handleExport}
								onOpenLastExportPath={handleOpenLastExportPath}
								onImport={handleImport}
								onDelete={handleDeleteRequest}
								onSectionChange={setActiveSection}
								fileInputRef={fileInputRef}
								isImporting={isImporting}
							/>
						)}
						{activeSection === 'dialogues' && (
							<DialoguesSection
								projectId={projectId}
								dialogues={projectDialogues}
								onCreateDialogue={handleCreateDialogueRequest}
							/>
						)}
						{activeSection === 'participants' && (
							<ParticipantsSection
								projectId={projectId}
								participants={projectParticipants}
							/>
						)}
						{activeSection === 'categories' && (
							<CategoriesSection
								projectId={projectId}
								categories={projectCategories}
							/>
						)}
						{activeSection === 'decorators' && (
							<DecoratorsSection
								projectId={projectId}
								decorators={projectDecorators}
							/>
						)}
						{activeSection === 'conditions' && (
							<ConditionsSection
								projectId={projectId}
								conditions={projectConditions}
							/>
						)}
						{activeSection === 'settings' && (
							<ProjectSettingsSection
								project={project}
								onExport={handleExport}
								onOpenLastExportPath={handleOpenLastExportPath}
								onDelete={handleDeleteRequest}
							/>
						)}
					</div>
				</main>
			</div>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent variant="destructive" size="sm">
					<AlertDialogHeader>
						<AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
							<Trash2 className="h-6 w-6" />
						</AlertDialogMedia>
						<AlertDialogTitle>{t('projects.deleteProject')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('projects.deleteConfirm')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel variant="outline">
							{t('common.cancel')}
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								setShowDeleteDialog(false);
								handleDelete();
							}}
						>
							{t('common.delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
