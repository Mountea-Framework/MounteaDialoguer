import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, FolderOpen, MessageCircle, HardDrive, Calendar } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useDialogueStore } from '@/stores/dialogueStore';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { formatFileSize, formatDate } from '@/lib/dateUtils';
import { calculateDiskUsage } from '@/lib/storageUtils';


export const Route = createFileRoute('/')({
	component: ProjectsDashboard,
});

// Dashboard Header Component
function DashboardHeader({ onNewProject, onSearch, searchQuery }) {
	const { t } = useTranslation();

	return (
		<header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="flex h-16 items-center px-6 md:px-12 max-w-7xl mx-auto w-full">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
						<MessageCircle className="h-6 w-6 text-primary-foreground" />
					</div>
					<div>
						<h1 className="text-lg font-bold tracking-tight">{t('app.title')}</h1>
						<p className="text-xs text-muted-foreground">{t('app.subtitle')}</p>
					</div>
				</div>
				<div className="flex-1 flex items-center justify-end gap-3">
					<div className="relative w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							type="text"
							placeholder={t('common.search')}
							value={searchQuery}
							onChange={(e) => onSearch(e.target.value)}
							className="pl-9"
						/>
					</div>
					<LanguageSelector />
					<Button onClick={onNewProject}>
						<Plus className="h-4 w-4 mr-2" />
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

	return (
		<Link
			to="/projects/$projectId"
			params={{ projectId: project.id }}
			className="block"
		>
			<Card className="hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer group h-full">
				<CardContent className="p-6">
					<div className="flex items-start justify-between mb-4">
						<div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
							<FolderOpen className="h-6 w-6 text-primary-foreground" />
						</div>
						<div className="text-xs text-muted-foreground flex items-center gap-1">
							<Calendar className="h-3 w-3" />
							{formatDate(project.createdAt)}
						</div>
					</div>
					<h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
						{project.name}
					</h3>
					{project.description && (
						<p className="text-sm text-muted-foreground line-clamp-2 mb-4">
							{project.description}
						</p>
					)}
					<div className="flex items-center gap-4 pt-4 border-t border-border">
						<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
							<MessageCircle className="h-4 w-4" />
							<span>{projectDialogues.length} {t('dialogues.title')}</span>
						</div>
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
			<CreateProjectDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
			/>

			<DashboardHeader
				onNewProject={handleNewProject}
				onSearch={setSearchQuery}
				searchQuery={searchQuery}
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
						<div className="text-center py-12">
							<div className="mx-auto w-64">
								<div className="mb-4 text-6xl opacity-20">📁</div>
								<h3 className="font-semibold mb-2">
									{t('projects.noProjects')}
								</h3>
								<p className="text-sm text-muted-foreground mb-4">
									{t('projects.createFirst')}
								</p>
								<Button onClick={handleNewProject}>
									<Plus className="h-4 w-4 mr-2" />
									{t('projects.createNew')}
								</Button>
							</div>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
