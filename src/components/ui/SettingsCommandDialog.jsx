import { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import {
	Command,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandShortcut,
} from '@/components/ui/command';
import { useSettingsCommandStore } from '@/stores/settingsCommandStore';
import { useProjectStore } from '@/stores/projectStore';
import { useDialogueStore } from '@/stores/dialogueStore';
import { ProjectSettingsSection } from '@/components/projects/sections/ProjectSettingsSection';
import { DialogueSettingsPanel } from '@/components/dialogue/DialogueSettingsPanel';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Kbd } from '@/components/ui/kbd';
import { formatShortcutKeys } from '@/lib/keyboardShortcuts';
import { isMobileDevice } from '@/lib/deviceDetection';
import {
	AlertTriangle,
	Command as CommandIcon,
	Keyboard,
	Redo2,
	Save,
	Settings,
	Trash2,
	Undo2,
	X,
} from 'lucide-react';

function ShortcutKeys({ keys }) {
	if (isMobileDevice()) return null;
	const resolvedKeys = formatShortcutKeys(keys);
	if (!resolvedKeys?.length) return null;
	return (
		<CommandShortcut>
			<span className="flex items-center gap-1">
				{resolvedKeys.map((key, index) => (
					<span key={`${key}-${index}`} className="flex items-center gap-1">
						<Kbd>{key}</Kbd>
						{index < resolvedKeys.length - 1 && (
							<span className="text-muted-foreground text-[10px]">+</span>
						)}
					</span>
				))}
			</span>
		</CommandShortcut>
	);
}

export function SettingsCommandDialog() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [isDesktop, setIsDesktop] = useState(!isMobileDevice());
	const { open, context, setOpen, close, mode, setMode } =
		useSettingsCommandStore();
	const { projects, loadProjects, exportProject, deleteProject } = useProjectStore();
	const { dialogues, loadDialogues, exportDialogue, deleteDialogue } = useDialogueStore();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	useEffect(() => {
		if (!open) return;
		loadProjects();
		if (context?.type === 'dialogue' && context?.projectId) {
			loadDialogues(context.projectId);
		}
	}, [open, context?.type, context?.projectId, loadProjects, loadDialogues]);

	useEffect(() => {
		const updateViewportType = () => setIsDesktop(!isMobileDevice());
		updateViewportType();
		window.addEventListener('resize', updateViewportType);
		window.addEventListener('orientationchange', updateViewportType);
		window.addEventListener('device-override', updateViewportType);
		return () => {
			window.removeEventListener('resize', updateViewportType);
			window.removeEventListener('orientationchange', updateViewportType);
			window.removeEventListener('device-override', updateViewportType);
		};
	}, []);

	const project =
		context?.projectId && projects.length
			? projects.find((p) => p.id === context.projectId)
			: null;
	const dialogue =
		context?.dialogueId && dialogues.length
			? dialogues.find((d) => d.id === context.dialogueId)
			: null;

	const actionLabel = useMemo(() => {
		if (context?.type === 'project') {
			return t('settingsCommand.actions.openProjectSettings');
		}
		if (context?.type === 'dialogue') {
			return t('settingsCommand.actions.openDialogueSettings');
		}
		return t('settingsCommand.actions.openSettings');
	}, [context?.type, t]);

	const groups = useMemo(
		() => [
			{
				id: 'actions',
				title: t('settingsCommand.groups.actions'),
				items: [
					{
						id: 'open-settings',
						label: actionLabel,
						icon: Settings,
						onSelect: () => setMode('detail'),
					},
				],
			},
			{
				id: 'shortcuts',
				title: t('settingsCommand.groups.shortcuts'),
				items:
					context?.type === 'dialogue'
						? [
								{
									id: 'shortcut-save',
									label: t('settingsCommand.items.save'),
									icon: Save,
									keys: ['Ctrl', 'S'],
								},
								{
									id: 'shortcut-undo',
									label: t('settingsCommand.items.undo'),
									icon: Undo2,
									keys: ['Ctrl', 'Z'],
								},
								{
									id: 'shortcut-redo',
									label: t('settingsCommand.items.redo'),
									icon: Redo2,
									keys: ['Ctrl', 'Y'],
								},
								{
									id: 'shortcut-delete',
									label: t('settingsCommand.items.deleteSelection'),
									icon: Trash2,
									keys: ['Delete'],
								},
								{
									id: 'shortcut-deselect',
									label: t('settingsCommand.items.deselectAll'),
									icon: X,
									keys: ['Esc'],
								},
						  ]
						: [
								{
									id: 'shortcut-command',
									label: t('settingsCommand.items.commandPalette'),
									icon: CommandIcon,
									keys: ['Ctrl', 'K'],
								},
								{
									id: 'shortcut-shortcuts',
									label: t('settingsCommand.items.showShortcuts'),
									icon: Keyboard,
									keys: ['?'],
								},
						  ],
			},
		],
		[actionLabel, context?.type, setMode, t]
	);

	const detailContent = (
		<div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto p-6">
			{context?.type === 'dialogue' ? (
				<DialogueSettingsPanel
					dialogue={dialogue}
					onExport={() => exportDialogue(context?.dialogueId)}
					onDelete={() => setShowDeleteDialog(true)}
				/>
			) : (
				<>
					{project ? (
						<ProjectSettingsSection
							project={project}
							onExport={() => exportProject(context?.projectId)}
							onDelete={() => setShowDeleteDialog(true)}
						/>
					) : (
						<div className="h-full flex items-center justify-center">
							<p className="text-muted-foreground">{t('common.loading')}</p>
						</div>
					)}
				</>
			)}
		</div>
	);

	const listContent = (
		<Command className="max-h-[70vh]">
			<div className="px-4 pt-4 pb-2">
				<p className="text-sm font-semibold">{t('settingsCommand.title')}</p>
				<p className="text-xs text-muted-foreground">
					{t('settingsCommand.description')}
				</p>
			</div>
			<CommandInput placeholder={t('settingsCommand.searchPlaceholder')} />
			<CommandList>
				<CommandEmpty>{t('settingsCommand.noResults')}</CommandEmpty>
				{groups.map((group) => (
					<CommandGroup key={group.id} heading={group.title}>
						{group.items.map((item) => (
							<CommandItem
								key={item.id}
								value={item.label}
								onSelect={() => {
									if (item.onSelect) {
										item.onSelect();
									}
								}}
							>
								<item.icon className="mr-2 h-4 w-4" />
								<span>{item.label}</span>
								<ShortcutKeys keys={item.keys} />
							</CommandItem>
						))}
					</CommandGroup>
				))}
			</CommandList>
		</Command>
	);

	return (
		<>
			{isDesktop ? (
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogContent
						className={mode === 'detail'
							? 'max-w-4xl w-[calc(100%-2rem)] overflow-hidden p-0 shadow-2xl'
							: 'max-w-2xl w-[calc(100%-2rem)] overflow-hidden p-0 shadow-2xl'}
					>
						<DialogTitle className="sr-only">{t('settingsCommand.title')}</DialogTitle>
						{mode === 'detail' ? detailContent : listContent}
					</DialogContent>
				</Dialog>
			) : (
				<Drawer open={open} onOpenChange={setOpen}>
					<DrawerContent className="max-h-[92vh]">
						<DrawerHeader className="sr-only">
							<DrawerTitle>{t('settingsCommand.title')}</DrawerTitle>
							<DrawerDescription>{t('settingsCommand.description')}</DrawerDescription>
						</DrawerHeader>
						<div className="overflow-y-auto">{mode === 'detail' ? detailContent : listContent}</div>
					</DrawerContent>
				</Drawer>
			)}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent variant="destructive" size="sm">
					<AlertDialogHeader>
						<AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
							<AlertTriangle className="h-6 w-6" />
						</AlertDialogMedia>
						<AlertDialogTitle>
							{context?.type === 'dialogue'
								? t('dialogues.dialogueSettings')
								: t('projects.deleteProject')}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{context?.type === 'dialogue'
								? 'Delete this dialogue and all its nodes? This action cannot be undone.'
								: t('projects.deleteConfirm')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel variant="outline">
							{t('common.cancel')}
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
								onClick={async () => {
									if (context?.type === 'dialogue') {
										await deleteDialogue(context?.dialogueId);
										if (context?.projectId) {
											navigate({ to: '/projects/$projectId', params: { projectId: context.projectId } });
										} else {
											navigate({ to: '/' });
										}
									} else {
										await deleteProject(context?.projectId);
										navigate({ to: '/' });
									}
									setShowDeleteDialog(false);
									close();
								}}
							>
							{t('common.delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
