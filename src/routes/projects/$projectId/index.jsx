import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, Trash2, Edit3, Play, Sun, Moon, Menu, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useProjectStore } from '@/stores/projectStore';
import { useDialogueStore } from '@/stores/dialogueStore';
import { useParticipantStore } from '@/stores/participantStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { useDecoratorStore } from '@/stores/decoratorStore';
import { useSyncStore } from '@/stores/syncStore';
import { ProjectSidebar } from '@/components/projects/ProjectSidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/ThemeProvider';
import { formatDate, formatDistanceToNow, formatFileSize } from '@/lib/dateUtils';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { AppHeader } from '@/components/ui/app-header';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { isMobileDevice } from '@/lib/deviceDetection';

// Import section components (we'll create these)
import { OverviewSection } from '@/components/projects/sections/OverviewSection';
import { DialoguesSection } from '@/components/projects/sections/DialoguesSection';
import { ParticipantsSection } from '@/components/projects/sections/ParticipantsSection';
import { CategoriesSection } from '@/components/projects/sections/CategoriesSection';
import { DecoratorsSection } from '@/components/projects/sections/DecoratorsSection';
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
	const { theme, resolvedTheme, setTheme } = useTheme();
	const { projectId } = Route.useParams();
	const searchParams = Route.useSearch();
	const isMobile = isMobileDevice();
	const { projects, loadProjects, deleteProject, exportProject, importProject } = useProjectStore();
	const { dialogues, loadDialogues } = useDialogueStore();
	const { participants, loadParticipants } = useParticipantStore();
	const { categories, loadCategories } = useCategoryStore();
	const { decorators, loadDecorators } = useDecoratorStore();
	const { status: syncStatus, checkRemoteDiff, startPull, lastSyncedAt } = useSyncStore();

	const [isLoading, setIsLoading] = useState(true);
	const [activeSection, setActiveSection] = useState(searchParams?.section || 'overview');
	const [isImporting, setIsImporting] = useState(false);
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
		]);
		setIsLoading(false);
	}, [loadProjects, loadDialogues, loadParticipants, loadCategories, loadDecorators, projectId]);

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

	const handleExport = async () => {
		try {
			await exportProject(projectId);
		} catch (error) {
			console.error('Failed to export project:', error);
		}
	};

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
		<div className={`${isMobile ? 'min-h-screen' : 'h-screen'} flex flex-col`}>
			{/* Header */}
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
							<p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
								{t('projects.projectDetails')}
							</p>
						</div>
					</>
				}
				right={
					<div
						className="hidden md:flex items-center text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full"
						data-header-mobile-hidden
					>
						<span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
						{t('dialogues.autoSaved')}
					</div>
				}
				menuItems={
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
				}
			/>

			{/* Mobile Sidebar Overlay */}
			{isMobileSidebarOpen && (
				<div
					className="fixed inset-0 bg-black/50 z-50 lg:hidden"
					onClick={() => setIsMobileSidebarOpen(false)}
				/>
			)}

			{/* Main Content */}
			<div className={`flex-1 flex min-h-0 ${isMobile ? '' : 'overflow-hidden'}`}>
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

				<main className={`flex-1 bg-grid ${isMobile ? '' : 'overflow-y-auto'}`}>
					<div className="max-w-5xl mx-auto p-4 md:p-8 lg:p-12">
						{activeSection === 'overview' && (
							<OverviewSection
								project={project}
								dialogues={projectDialogues}
								participants={projectParticipants}
								categories={projectCategories}
								decorators={projectDecorators}
								onExport={handleExport}
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
						{activeSection === 'settings' && (
							<ProjectSettingsSection
								project={project}
								onExport={handleExport}
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
