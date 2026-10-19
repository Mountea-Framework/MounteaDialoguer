import { Download, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useDialogueStore } from '@/stores/dialogueStore';

/**
 * Right-click menu (Export, Delete) for one dialogue. Wrap the element that represents the dialogue,
 * for example a card or a list row; it is rendered as the context menu trigger.
 */
export function DialogueContextMenu({ dialogue, children }) {
	const { t } = useTranslation();
	const { deleteDialogue, exportDialogue } = useDialogueStore();

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
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
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
