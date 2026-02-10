import { useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from '@tanstack/react-router';
import {
	Search,
	Save,
	Download,
	FolderOpen,
	Settings,
	Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { useSettingsCommandStore } from '@/stores/settingsCommandStore';
import { useTheme } from '@/contexts/ThemeProvider';
import { useTranslation } from 'react-i18next';

/**
 * Command Palette Component
 * Quick access to actions via keyboard shortcut (Ctrl/Cmd + K)
 */
export function CommandPalette({ open, onOpenChange, actions: actionsProp, placeholder }) {
	const navigate = useNavigate();
	const [search, setSearch] = useState('');
	const { actions: storeActions, placeholder: storePlaceholder } = useCommandPaletteStore();
	const openSettingsCommand = useSettingsCommandStore((state) => state.openWithContext);
	const { resolvedTheme, setTheme } = useTheme();
	const { t } = useTranslation();

	// Handle keyboard shortcut
	useEffect(() => {
		const down = (e) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				onOpenChange(!open);
			}
		};

		document.addEventListener('keydown', down);
		return () => document.removeEventListener('keydown', down);
	}, [open, onOpenChange]);

	// Reset search on close
	useEffect(() => {
		if (!open) {
			setSearch('');
		}
	}, [open]);

	const routeContext = useMemo(() => {
		const rawPath =
			(window.location.hash && window.location.hash.replace(/^#/, '')) ||
			window.location.pathname ||
			'';

		const dialogueMatch = rawPath.match(/\/projects\/([^/]+)\/dialogue\/([^/]+)/);
		if (dialogueMatch) {
			return {
				type: 'dialogue',
				projectId: dialogueMatch[1],
				dialogueId: dialogueMatch[2],
			};
		}

		const projectMatch = rawPath.match(/\/projects\/([^/]+)\/?$/);
		if (projectMatch) {
			return { type: 'project', projectId: projectMatch[1] };
		}

		return { type: 'none' };
	}, [open]);

	const defaultActions = useMemo(() => {
		const actions = [
			{
				group: t('navigation.dashboard'),
				items: [
					{
						icon: FolderOpen,
						label: t('navigation.projects'),
						shortcut: '',
						onSelect: () => {
							navigate({ to: '/' });
							onOpenChange(false);
						},
					},
				],
			},
		];

		const actionItems = [];
		if (routeContext.type === 'dialogue') {
			actionItems.push(
				{
					icon: Save,
					label: t('common.save'),
					shortcut: 'Ctrl+S',
					onSelect: () => {
						window.dispatchEvent(
							new CustomEvent('command:dialogue-save', {
								detail: {
									projectId: routeContext.projectId,
									dialogueId: routeContext.dialogueId,
								},
							})
						);
					},
				},
				{
					icon: Download,
					label: t('common.export'),
					shortcut: 'Ctrl+E',
					onSelect: () => {
						window.dispatchEvent(
							new CustomEvent('command:dialogue-export', {
								detail: {
									projectId: routeContext.projectId,
									dialogueId: routeContext.dialogueId,
								},
							})
						);
					},
				}
			);
		} else if (routeContext.type === 'project') {
			actionItems.push(
				{
					icon: Save,
					label: t('common.save'),
					shortcut: 'Ctrl+S',
					onSelect: () => {
						window.dispatchEvent(
							new CustomEvent('command:project-save', {
								detail: { projectId: routeContext.projectId },
							})
						);
					},
				},
				{
					icon: Download,
					label: t('common.export'),
					shortcut: 'Ctrl+E',
					onSelect: () => {
						window.dispatchEvent(
							new CustomEvent('command:project-export', {
								detail: { projectId: routeContext.projectId },
							})
						);
					},
				}
			);
		}

		if (actionItems.length) {
			actions.push({ group: t('common.manage'), items: actionItems });
		}

		const settingsItems = [
			{
				icon: Palette,
				label:
					resolvedTheme === 'dark'
						? t('settings.lightMode')
						: t('settings.darkMode'),
				shortcut: '',
				onSelect: () => {
					setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
				},
			},
		];

		if (routeContext.type === 'project') {
			settingsItems.push({
				icon: Settings,
				label: t('settings.title'),
				shortcut: '',
				onSelect: () =>
					openSettingsCommand({
						context: { type: 'project', projectId: routeContext.projectId },
						mode: 'detail',
					}),
			});
		}

		if (routeContext.type === 'dialogue') {
			settingsItems.push({
				icon: Settings,
				label: t('settings.title'),
				shortcut: '',
				onSelect: () =>
					openSettingsCommand({
						context: {
							type: 'dialogue',
							projectId: routeContext.projectId,
							dialogueId: routeContext.dialogueId,
						},
						mode: 'detail',
					}),
			});
		}

		if (settingsItems.length) {
			actions.push({ group: t('settings.title'), items: settingsItems });
		}

		return actions;
	}, [
		navigate,
		onOpenChange,
		openSettingsCommand,
		resolvedTheme,
		routeContext.type,
		routeContext.projectId,
		routeContext.dialogueId,
		setTheme,
		t,
	]);
	const actions =
		(actionsProp && actionsProp.length ? actionsProp : null) ||
		(storeActions && storeActions.length ? storeActions : null) ||
		defaultActions;
	const resolvedPlaceholder = placeholder || storePlaceholder || "Type a command or search...";

	if (!open) return null;

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in"
				onClick={() => onOpenChange(false)}
			/>

			{/* Command Palette */}
			<div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl animate-in fade-in zoom-in-95">
				<Command
					className="rounded-lg border bg-card shadow-2xl"
					shouldFilter={true}
					value={search}
					onValueChange={setSearch}
				>
					<div className="flex items-center border-b px-3">
						<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
					<Command.Input
						placeholder={resolvedPlaceholder}
						className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
					/>
						<kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
							<span className="text-xs">ESC</span>
						</kbd>
					</div>

					<Command.List className="max-h-[400px] overflow-y-auto p-2">
						<Command.Empty className="py-6 text-center text-sm text-muted-foreground">
							No results found.
						</Command.Empty>

						{actions.map((group) => (
							<Command.Group
								key={group.group}
								heading={group.group}
								className="px-2 py-2"
							>
								{group.items.map((item) => {
									if (item.render) {
										return (
											<div key={item.key || item.label} className="px-2 py-2">
												{item.render()}
											</div>
										);
									}

									return (
										<Command.Item
											key={item.label}
											onSelect={() => {
												item.onSelect?.();
												onOpenChange(false);
											}}
											className={cn(
												'flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer',
												'hover:bg-accent hover:text-accent-foreground',
												'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground'
											)}
										>
											<item.icon className="h-4 w-4" />
											<span className="flex-1">{item.label}</span>
											{item.shortcut && (
												<kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
													{item.shortcut}
												</kbd>
											)}
										</Command.Item>
									);
								})}
							</Command.Group>
						))}
					</Command.List>

					<div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
						<span>Press</span>
						<kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono font-medium">
							<span>⌘</span>
							<span>K</span>
						</kbd>
						<span>to toggle</span>
					</div>
				</Command>
			</div>
		</>
	);
}
