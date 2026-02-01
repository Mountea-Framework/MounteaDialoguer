import { MoreHorizontal, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from '@/lib/dateUtils';

/**
 * Dialogue Card Component
 * Displays a single dialogue in the project details view
 */
export function DialogueCard({ dialogue, projectId }) {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const nodeCount = dialogue.nodeCount || 0;
	const categoryColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
	const randomColor = categoryColors[Math.floor(Math.random() * categoryColors.length)];

	return (
		<Link
			to="/projects/$projectId/dialogue/$dialogueId"
			params={{ projectId, dialogueId: dialogue.id }}
		>
			<Card className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all h-full flex flex-col overflow-hidden rounded-lg">
				<div className="h-32 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-center relative overflow-hidden rounded-t-lg">
					<div className="absolute inset-0 opacity-30 dark:opacity-20 bg-[radial-gradient(#9333ea_1px,transparent_1px)] [background-size:16px_16px]" />
					<MessageCircle className="h-12 w-12 text-purple-500 dark:text-purple-400 opacity-80 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative z-10" />
					<div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 rounded-full bg-background/90 backdrop-blur-sm"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								navigate({
									to: '/projects/$projectId/dialogue/$dialogueId/settings',
									params: { projectId, dialogueId: dialogue.id }
								});
							}}
						>
							<MoreHorizontal className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>

				<CardContent className="p-4 flex-1 flex flex-col">
					<div className="flex justify-between items-start mb-2">
						<h3 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1">
							{dialogue.name}
						</h3>
					</div>

					{dialogue.description && (
						<p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
							{dialogue.description}
						</p>
					)}

					<div className="mt-auto pt-3 border-t flex items-center justify-center text-xs text-muted-foreground">
						<span className="flex items-center gap-1.5">
							<MessageCircle className="h-3.5 w-3.5 group-hover:text-purple-500 transition-colors" />
							<span className="font-medium">{nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}</span>
						</span>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
