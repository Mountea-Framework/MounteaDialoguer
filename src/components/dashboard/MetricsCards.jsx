import { Folder, MessageCircle, HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';

/**
 * Metrics Cards Component
 * Displays project statistics
 */
export function MetricsCards({ projectCount, dialogueCount, diskUsage }) {
	const { t } = useTranslation();

	const metrics = [
		{
			label: t('projects.totalProjects'),
			value: projectCount,
			icon: Folder,
			color: 'text-blue-500',
			bgColor: 'bg-blue-50 dark:bg-blue-900/20',
		},
		{
			label: t('projects.totalDialogues'),
			value: dialogueCount,
			icon: MessageCircle,
			color: 'text-green-500',
			bgColor: 'bg-green-50 dark:bg-green-900/20',
		},
		{
			label: t('projects.diskUsage'),
			value: diskUsage,
			icon: HardDrive,
			color: 'text-purple-500',
			bgColor: 'bg-purple-50 dark:bg-purple-900/20',
		},
	];

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
			{metrics.map((metric) => {
				const Icon = metric.icon;
				return (
					<Card
						key={metric.label}
						className="p-6 flex items-center justify-between group hover:border-primary/30 transition-all cursor-pointer"
					>
						<div>
							<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
								{metric.label}
							</p>
							<h3 className="text-3xl font-bold">{metric.value}</h3>
						</div>
						<div
							className={`w-12 h-12 rounded-full ${metric.bgColor} flex items-center justify-center ${metric.color} group-hover:scale-110 transition-transform`}
						>
							<Icon className="h-6 w-6" />
						</div>
					</Card>
				);
			})}
		</div>
	);
}
