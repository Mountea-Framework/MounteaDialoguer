import { ArrowLeft, MoreVertical, Download, Trash2, Edit, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/dateUtils';

/**
 * Project Header Component
 * Displays project information and actions at the top of the project details page
 */
export function ProjectHeader({ project, onEdit, onExport, onDelete }) {
	const { t } = useTranslation();

	if (!project) {
		return null;
	}

	return (
		<div className="bg-background border-b sticky top-0 z-10">
			<div className="max-w-7xl mx-auto px-6 py-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Link to="/">
							<Button variant="ghost" size="icon" className="rounded-full">
								<ArrowLeft className="h-5 w-5" />
							</Button>
						</Link>
						<div>
							<div className="flex items-center gap-3">
								<h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
								{project.version && (
									<Badge variant="success">v{project.version}</Badge>
								)}
							</div>
							{project.description && (
								<p className="text-sm text-muted-foreground mt-1">
									{project.description}
								</p>
							)}
							<div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
								<span>
									{t('projects.created')}: {formatDate(project.createdAt)}
								</span>
								<span>
									{t('projects.modified')}: {formatDate(project.modifiedAt)}
								</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={onExport}
							className="gap-2"
						>
							<Download className="h-4 w-4" />
							{t('common.export')}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={onEdit}
							className="gap-2"
						>
							<Edit className="h-4 w-4" />
							{t('common.edit')}
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={onDelete}
							className="text-destructive hover:text-destructive"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
