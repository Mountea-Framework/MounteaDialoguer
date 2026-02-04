import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, Trash2, Edit3, Play, Sun, Moon, Menu, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useProjectStore } from '@/stores/projectStore';
import { useDialogueStore } from '@/stores/dialogueStore';
import { useParticipantStore } from '@/stores/participantStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { useDecoratorStore } from '@/stores/decoratorStore';
import { ProjectSidebar } from '@/components/projects/ProjectSidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/ThemeProvider';
import { formatDate, formatDistanceToNow, formatFileSize } from '@/lib/dateUtils';
import { SimpleTooltip } from '@/components/ui/tooltip';

// Import section components (we'll create these)
import { OverviewSection } from '@/components/projects/sections/OverviewSection';
import { DialoguesSection } from '@/components/projects/sections/DialoguesSection';
import { ParticipantsSection } from '@/components/projects/sections/ParticipantsSection';
import { CategoriesSection } from '@/components/projects/sections/CategoriesSection';
import { DecoratorsSection } from '@/components/projects/sections/DecoratorsSection';
import { ProjectSettingsSection } from '@/components/projects/sections/ProjectSettingsSection';

export const Route = createFileRoute('/projects/$projectId/')({
	component: ProjectDetailsPage,
});

function ProjectDetailsPage() {
	const { t } = useTranslation();
	const { theme, resolvedTheme, setTheme } = useTheme();
	const { projectId } = Route.useParams();
	const searchParams = Route.useSearch();
	const { projects, loadProjects, deleteProject, exportProject, importProject } = useProjectStore();
	const { dialogues, loadDialogues } = useDialogueStore();
	const { participants, loadParticipants } = useParticipantStore();
	const { categories, loadCategories } = useCategoryStore();
	const { decorators, loadDecorators } = useDecoratorStore();

	const [isLoading, setIsLoading] = useState(true);
	const [activeSection, setActiveSection] = useState(searchParams?.section || 'overview');
	const [isImporting, setIsImporting] = useState(false);
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
	const fileInputRef = useRef(null);

	useEffect(() => {
		const loadData = async () => {
			setIsLoading(true);
			await Promise.all([
				loadProjects(),
				loadDialogues(),
				loadParticipants(projectId),
				loadCategories(projectId),
				loadDecorators(projectId),
			]);
			setIsLoading(false);
		};
		loadData();
	}, [loadProjects, loadDialogues, loadParticipants, loadCategories, loadDecorators, projectId]);

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
		// TODO: Show delete confirmation modal
		if (window.confirm(t('projects.deleteConfirm'))) {
			await deleteProject(projectId);
			window.location.href = '#/';
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p className="text-muted-foreground">{t('common.loading')}</p>
			</div>
		);
	}

	if (!project) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<h2 className="text-2xl font-bold mb-2">{t('projects.notFound')}</h2>
					<p className="text-muted-foreground">{t('projects.notFoundDescription')}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col">
			{/* Header */}
			<header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 md:px-12 py-3 md:py-4 flex items-center justify-between">
				<div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsMobileSidebarOpen(true)}
						className="lg:hidden rounded-full shrink-0"
					>
						<Menu className="h-5 w-5" />
					</Button>
					<Link to="/">
						<SimpleTooltip content="Back to projects" side="bottom">
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
				</div>
				<div className="flex items-center gap-2 md:gap-4">
					<div className="hidden md:flex items-center text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
						<span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
						{t('dialogues.autoSaved')}
					</div>
					<SimpleTooltip content={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} side="bottom">
						<Button
							variant="outline"
							size="icon"
							onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
							className="rounded-full"
						>
							{resolvedTheme === 'dark' ? (
								<Sun className="h-4 w-4" />
							) : (
								<Moon className="h-4 w-4" />
							)}
						</Button>
					</SimpleTooltip>
				</div>
			</header>

			{/* Mobile Sidebar Overlay */}
			{isMobileSidebarOpen && (
				<div
					className="fixed inset-0 bg-black/50 z-40 lg:hidden"
					onClick={() => setIsMobileSidebarOpen(false)}
				/>
			)}

			{/* Main Content */}
			<div className="flex-1 flex">
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

				<main className="flex-1 bg-grid">
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
								onDelete={handleDelete}
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
								onDelete={handleDelete}
							/>
						)}
					</div>
				</main>
			</div>
		</div>
	);
}
