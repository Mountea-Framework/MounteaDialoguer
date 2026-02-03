import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, FolderOpen, MessageCircle, HardDrive, Calendar, HelpCircle } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useDialogueStore } from '@/stores/dialogueStore';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { formatFileSize, formatDate } from '@/lib/dateUtils';
import { calculateDiskUsage } from '@/lib/storageUtils';
import { OnboardingTour, useOnboarding } from '@/components/ui/onboarding-tour';
import { EmptyState } from '@/components/ui/empty-state';


export const Route = createFileRoute('/')({
	component: ProjectsDashboard,
});

// Dashboard Header Component
function DashboardHeader({ onNewProject, onSearch, searchQuery, onShowTour }) {
	const { t } = useTranslation();

	return (
		<header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="flex flex-col md:flex-row md:h-16 md:items-center px-4 py-3 md:px-12 max-w-7xl mx-auto w-full gap-3">
				<div className="flex items-center gap-3 justify-between md:justify-start">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
							<MessageCircle className="h-6 w-6 text-primary-foreground" />
						</div>
						<div className="hidden sm:block">
							<h1 className="text-lg font-bold tracking-tight">{t('app.title')}</h1>
							<p className="text-xs text-muted-foreground">{t('app.subtitle')}</p>
						</div>
					</div>
					<Button
						onClick={onNewProject}
						size="sm"
						className="md:hidden gap-1"
					>
						<Plus className="h-4 w-4" />
						<span className="sr-only sm:not-sr-only">{t('common.new')}</span>
					</Button>
				</div>
				<div className="flex-1 flex items-center gap-2 md:justify-end">
					<div className="relative flex-1 md:w-64 md:flex-none" data-tour="search">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							type="text"
							placeholder={t('common.search')}
							value={searchQuery}
							onChange={(e) => onSearch(e.target.value)}
							className="pl-9 h-9"
						/>
					</div>
					<LanguageSelector />
					<Button variant="ghost" size="icon" onClick={onShowTour} className="rounded-full shrink-0">
						<HelpCircle className="h-4 w-4" />
					</Button>
					<Button onClick={onNewProject} className="hidden md:flex gap-2" data-tour="create-project">
						<Plus className="h-4 w-4" />
						{t('projects.createNew')}
					</Button>
				</div>
			</div>
		</header>
	);
}

// Metrics Cards Component
function MetricsCards({ projectCount, dialogueCount, diskUsage }) {
	const { t } = useTranslation();

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
			<Card>
				<CardContent className="p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">{t('projects.title')}</p>
							<h3 className="text-3xl font-bold mt-2">{projectCount}</h3>
						</div>
						<div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
							<FolderOpen className="h-6 w-6 text-primary" />
						</div>
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">{t('dialogues.title')}</p>
							<h3 className="text-3xl font-bold mt-2">{dialogueCount}</h3>
						</div>
						<div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
							<MessageCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
						</div>
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">{t('dashboard.diskUsage')}</p>
							<h3 className="text-3xl font-bold mt-2">{diskUsage}</h3>
						</div>
						<div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
							<HardDrive className="h-6 w-6 text-orange-600 dark:text-orange-400" />
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// Project Card Component
function ProjectCard({ project }) {
	const { t } = useTranslation();
	const { dialogues } = useDialogueStore();
	const projectDialogues = dialogues.filter((d) => d.projectId === project.id);

	// Random gradient colors for variety
	const gradients = [
		'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
		'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
		'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20',
		'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
	];
	const iconColors = [
		'text-blue-500 dark:text-blue-400',
		'text-purple-500 dark:text-purple-400',
		'text-orange-500 dark:text-orange-400',
		'text-green-500 dark:text-green-400',
	];
	const patternColors = [
		'#3b82f6',
		'#9333ea',
		'#f97316',
		'#22c55e',
	];

	// Use project ID to consistently assign colors
	const colorIndex = parseInt(project.id.substring(0, 8), 16) % gradients.length;

	return (
		<Link
			to="/projects/$projectId"
			params={{ projectId: project.id }}
		>
			<Card className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all h-full flex flex-col overflow-hidden rounded-lg">
				<div className={`h-32 bg-gradient-to-br ${gradients[colorIndex]} flex items-center justify-center relative overflow-hidden rounded-t-lg`}>
					<div
						className="absolute inset-0 opacity-30 dark:opacity-20 bg-[radial-gradient(circle,currentColor_1px,transparent_1px)] [background-size:16px_16px]"
						style={{ color: patternColors[colorIndex] }}
					/>
					<FolderOpen className={`h-12 w-12 ${iconColors[colorIndex]} opacity-80 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative z-10`} />
					<div className="absolute top-3 right-3 text-xs text-muted-foreground flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full">
						<Calendar className="h-3 w-3" />
						{formatDate(project.createdAt)}
					</div>
				</div>

				<CardContent className="p-4 flex-1 flex flex-col">
					<div className="flex justify-between items-start mb-2">
						<h3 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1">
							{project.name}
						</h3>
						{project.version && (
							<span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
								v{project.version}
							</span>
						)}
					</div>

					{project.description && (
						<p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
							{project.description}
						</p>
					)}

					<div className="mt-auto pt-3 border-t flex items-center justify-center text-xs text-muted-foreground">
						<span className="flex items-center gap-1.5">
							<MessageCircle className={`h-3.5 w-3.5 group-hover:${iconColors[colorIndex].replace('text-', 'text-')} transition-colors`} />
							<span className="font-medium">{projectDialogues.length} {projectDialogues.length === 1 ? t('dialogues.title').slice(0, -1) : t('dialogues.title')}</span>
						</span>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}

function ProjectsDashboard() {
	const { t } = useTranslation();
	const { projects, loadProjects, isLoading } = useProjectStore();
	const { dialogues } = useDialogueStore();
	const [searchQuery, setSearchQuery] = useState('');
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [diskUsageBytes, setDiskUsageBytes] = useState(0);
	const { runTour, finishTour, resetTour } = useOnboarding('dashboard');

	useEffect(() => {
		loadProjects();
	}, [loadProjects]);

	useEffect(() => {
		const loadDiskUsage = async () => {
			const usage = await calculateDiskUsage();
			setDiskUsageBytes(usage);
		};
		loadDiskUsage();
	}, [projects, dialogues]);

	const handleNewProject = () => {
		setIsCreateDialogOpen(true);
	};

	const filteredProjects = projects.filter((project) =>
		project.name.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const totalDialogues = dialogues.length;
	const diskUsage = formatFileSize(diskUsageBytes);

	return (
		<div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
			<OnboardingTour
				run={runTour}
				onFinish={finishTour}
				tourType="dashboard"
			/>

			<CreateProjectDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
			/>

			<DashboardHeader
				onNewProject={handleNewProject}
				onSearch={setSearchQuery}
				searchQuery={searchQuery}
				onShowTour={resetTour}
			/>

			<main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
				<MetricsCards
					projectCount={projects.length}
					dialogueCount={totalDialogues}
					diskUsage={diskUsage}
				/>

				<div className="mt-10">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-xl font-bold tracking-tight">
							{t('projects.recentProjects')}
						</h2>
					</div>

					{isLoading ? (
						<div className="text-center py-12">
							<p className="text-muted-foreground">{t('common.loading')}</p>
						</div>
					) : filteredProjects.length === 0 ? (
						<EmptyState
							icon={FolderOpen}
							title={t('projects.noProjects')}
							description={t('projects.createFirst')}
							action={
								<Button onClick={handleNewProject}>
									<Plus className="h-4 w-4 mr-2" />
									{t('projects.createNew')}
								</Button>
							}
							tips={[
								'Projects help organize your dialogues by game or story',
								'Each project can contain multiple dialogues',
								'Use the search bar to quickly find projects',
							]}
						/>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-tour="projects-grid">
							{filteredProjects.map((project) => (
								<ProjectCard key={project.id} project={project} />
							))}

							<button
								onClick={handleNewProject}
								className="border-2 border-dashed rounded-2xl flex flex-col items-center justify-center min-h-[320px] hover:border-primary hover:bg-primary/5 transition-all group"
							>
								<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
									<Plus className="h-8 w-8 text-primary" />
								</div>
								<span className="font-bold text-lg">
									{t('projects.createNew')}
								</span>
								<span className="text-sm text-muted-foreground mt-2">
									{t('projects.createNewDescription')}
								</span>
							</button>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
