import { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	CommandDialog,
	Command,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandSeparator,
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
import { Kbd } from '@/components/ui/kbd';
import {
	AlertTriangle,
	Command as CommandIcon,
	Database,
	Download,
	Info,
	Keyboard,
	Redo2,
	Save,
	Settings,
	Trash2,
	Undo2,
	X,
} from 'lucide-react';

function ShortcutKeys({ keys }) {
	if (!keys?.length) return null;
	return (
		<CommandShortcut>
			<span className="flex items-center gap-1">
				{keys.map((key, index) => (
					<span key={`${key}-${index}`} className="flex items-center gap-1">
						<Kbd>{key}</Kbd>
						{index < keys.length - 1 && (
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
	const { open, context, onOpenSettings, setOpen, close, mode, setMode } =
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

	return (
		<>
			<CommandDialog
				open={open}
				onOpenChange={setOpen}
				contentClassName={mode === 'detail' ? 'max-w-4xl w-[calc(100%-2rem)]' : 'max-w-2xl w-[calc(100%-2rem)]'}
			>
				{mode === 'detail' ? (
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
										<p className="text-muted-foreground">
											{t('common.loading')}
										</p>
									</div>
								)}
							</>
						)}
					</div>
				) : (
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
				)}
			</CommandDialog>
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
								} else {
									await deleteProject(context?.projectId);
									window.location.href = '#/';
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
