import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useDialogueStore } from '@/stores/dialogueStore';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/dateUtils';
import { calculateDiskUsage } from '@/lib/storageUtils';

export const Route = createFileRoute('/')({
	component: ProjectsDashboard,
});

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
									Start from scratch or import
								</span>
							</button>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
