import { Download, MoreHorizontal, MessageCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useSettingsCommandStore } from '@/stores/settingsCommandStore';
import { useDialogueStore } from '@/stores/dialogueStore';

/**
 * Dialogue Card Component
 * Displays a single dialogue in the project details view
 */
export function DialogueCard({ dialogue, projectId }) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const openSettingsCommand = useSettingsCommandStore((state) => state.openWithContext);
	const { deleteDialogue, exportDialogue } = useDialogueStore();

	const nodeCount = dialogue.nodeCount || 0;

	const handleExport = async () => {
		try {
			await exportDialogue(dialogue.id);
		} catch (error) {
			console.error('Failed to export dialogue:', error);
		}
	};

	const handleDelete = async () => {
		const confirmed = window.confirm(
			t('dialogues.deleteConfirm', {
				name: dialogue.name,
				defaultValue: `Delete "${dialogue.name}"? This action cannot be undone.`,
			})
		);
		if (!confirmed) return;

		try {
			await deleteDialogue(dialogue.id);
		} catch (error) {
			console.error('Failed to delete dialogue:', error);
		}
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
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
										openSettingsCommand({
											context: {
												type: 'dialogue',
												name: dialogue.name,
												projectId,
												dialogueId: dialogue.id,
											},
											onOpenSettings: () =>
												navigate({
													to: '/projects/$projectId/dialogue/$dialogueId/settings',
													params: { projectId, dialogueId: dialogue.id },
												}),
											mode: 'detail',
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
									<span className="font-medium">
										{t('dialogues.nodeCount', { count: nodeCount })}
									</span>
								</span>
							</div>
						</CardContent>
					</Card>
				</Link>
			</ContextMenuTrigger>
			<ContextMenuContent className="w-44">
				<ContextMenuItem
					onSelect={(event) => {
						event.preventDefault();
						void handleExport();
					}}
				>
					<Download className="mr-2 h-4 w-4" />
					{t('common.export')}
					<ContextMenuShortcut>Ctrl+E</ContextMenuShortcut>
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem
					variant="destructive"
					onSelect={(event) => {
						event.preventDefault();
						void handleDelete();
					}}
				>
					<Trash2 className="mr-2 h-4 w-4" />
					{t('common.delete')}
					<ContextMenuShortcut>Del</ContextMenuShortcut>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
