import { useEffect, useRef, useState } from 'react';
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
import { isAppleDevice } from '@/lib/deviceDetection';

/**
 * Right-click menu (Export, Delete) for one dialogue. Wrap the element that represents the dialogue,
 * for example a card or a list row; it is rendered as the context menu trigger.
 */
export function DialogueContextMenu({ dialogue, children }) {
	const { t } = useTranslation();
	const deleteDialogue = useDialogueStore((state) => state.deleteDialogue);
	const exportDialogue = useDialogueStore((state) => state.exportDialogue);
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const pendingRef = useRef(false);
	const triggerRef = useRef(null);
	const exportItemRef = useRef(null);
	const deleteItemRef = useRef(null);
	const exportShortcut = isAppleDevice() ? 'Cmd+Alt+E' : 'Ctrl+Alt+E';

	const runAction = async (action) => {
		if (pendingRef.current) return;
		pendingRef.current = true;
		setPending(true);
		try {
			if (action === 'delete') {
				const confirmed = window.confirm(
					t('dialogues.deleteConfirm', { name: dialogue.name })
				);
				if (!confirmed) return;
				await deleteDialogue(dialogue.id);
			} else {
				await exportDialogue(dialogue.id);
			}
		} catch (error) {
			console.error(`Failed to ${action} dialogue:`, error);
		} finally {
			pendingRef.current = false;
			setPending(false);
		}
	};

	useEffect(() => {
		if (!open) return;
		const handleMenuKeyDown = (event) => {
			if (event.defaultPrevented || event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
			const key = event.key.toLowerCase();
			const modifier = event.ctrlKey || event.metaKey;
			// Alt can produce a composed character on non-US keyboards.
			const exportKey = modifier && event.altKey && !event.shiftKey && (key === 'e' || event.code === 'KeyE');
			const deleteKey = !modifier && !event.altKey && !event.shiftKey && key === 'delete';
			const projectKey = modifier && ['e', 'i', 'n'].includes(key);
			if (!exportKey && !deleteKey && !projectKey) return;

			event.preventDefault();
			event.stopPropagation();
			if (event.repeat || pendingRef.current) return;
			// Select through Radix so keyboard shortcuts also dismiss the menu.
			if (exportKey) exportItemRef.current?.click();
			if (deleteKey) deleteItemRef.current?.click();
		};
		// Capture while open, including when focus is returning from a closing menu.
		document.addEventListener('keydown', handleMenuKeyDown, true);
		return () => document.removeEventListener('keydown', handleMenuKeyDown, true);
	}, [open]);

	return (
		<ContextMenu onOpenChange={setOpen}>
			<ContextMenuTrigger
				asChild
				ref={triggerRef}
				onKeyDown={(event) => {
					if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
					event.preventDefault();
					const bounds = event.currentTarget.getBoundingClientRect();
					event.currentTarget.dispatchEvent(new MouseEvent('contextmenu', {
						bubbles: true, cancelable: true, clientX: bounds.left, clientY: bounds.bottom,
					}));
				}}
			>{children}</ContextMenuTrigger>
			<ContextMenuContent
				className="w-56"
				onCloseAutoFocus={(event) => {
					event.preventDefault();
					triggerRef.current?.focus();
				}}
			>
				<ContextMenuItem
					ref={exportItemRef}
					disabled={pending}
					onSelect={() => { void runAction('export'); }}
				>
					<Download className="mr-2 h-4 w-4" />
					{t('common.export')}
					<ContextMenuShortcut>{exportShortcut}</ContextMenuShortcut>
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem
					ref={deleteItemRef}
					variant="destructive"
					disabled={pending}
					onSelect={() => { void runAction('delete'); }}
				>
					<Trash2 className="mr-2 h-4 w-4" />
					{t('common.delete')}
					<ContextMenuShortcut>Del</ContextMenuShortcut>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
