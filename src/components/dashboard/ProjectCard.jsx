import { MoreHorizontal, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from '@/lib/dateUtils';

/**
 * Project Card Component
 * Displays a single project in grid view
 */
export function ProjectCard({ project }) {
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<Link to="/projects/$projectId" params={{ projectId: project.id }}>
			<Card className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all h-full flex flex-col overflow-hidden">
				<div className="h-40 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center relative overflow-hidden">
					<div className="absolute inset-0 opacity-30 dark:opacity-20 bg-[radial-gradient(#007AFF_1px,transparent_1px)] [background-size:16px_16px]" />
					<span className="text-5xl opacity-80 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
						📁
					</span>
					<div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 rounded-full bg-background/90 backdrop-blur-sm"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								navigate({
									to: '/projects/$projectId',
									params: { projectId: project.id },
									search: { section: 'settings' }
								});
							}}
						>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</div>
				</div>

				<CardContent className="p-5 flex-1 flex flex-col">
					<div className="flex justify-between items-start mb-2">
						<h3 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-1">
							{project.name}
						</h3>
						{project.version && (
							<Badge variant="success" className="ml-2 shrink-0">
								v{project.version}
							</Badge>
						)}
					</div>

					{project.description && (
						<p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
							{project.description}
						</p>
					)}

					<div className="mt-auto pt-4 border-t flex items-center justify-between text-xs text-muted-foreground font-medium">
						<span className="flex items-center gap-1">
							<Save className="h-3.5 w-3.5" />
							{formatDistanceToNow(project.modifiedAt)}
						</span>
						<span>{project.dialogueCount || 0} dialogues</span>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
