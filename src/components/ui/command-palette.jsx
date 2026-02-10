import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from '@tanstack/react-router';
import {
	Search,
	Plus,
	Save,
	Download,
	FolderOpen,
	MessageCircle,
	Users,
	Tag,
	Settings,
	Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';

/**
 * Command Palette Component
 * Quick access to actions via keyboard shortcut (Ctrl/Cmd + K)
 */
export function CommandPalette({ open, onOpenChange, actions: actionsProp, placeholder }) {
	const navigate = useNavigate();
	const [search, setSearch] = useState('');
	const { actions: storeActions, placeholder: storePlaceholder } = useCommandPaletteStore();

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

	if (!open) return null;

	const defaultActions = [
		{
			group: 'Navigation',
			items: [
				{
					icon: FolderOpen,
					label: 'Go to Projects',
					shortcut: '',
					onSelect: () => {
						navigate({ to: '/' });
						onOpenChange(false);
					},
				},
			],
		},
		{
			group: 'Create',
			items: [
				{
					icon: Plus,
					label: 'New Project',
					shortcut: '',
					onSelect: () => {
						// Trigger project creation dialog
						onOpenChange(false);
					},
				},
				{
					icon: MessageCircle,
					label: 'New Dialogue',
					shortcut: 'Ctrl+N',
					onSelect: () => {
						// Trigger dialogue creation
						onOpenChange(false);
					},
				},
				{
					icon: Users,
					label: 'New Participant',
					shortcut: '',
					onSelect: () => {
						// Trigger participant creation
						onOpenChange(false);
					},
				},
				{
					icon: Tag,
					label: 'New Category',
					shortcut: '',
					onSelect: () => {
						// Trigger category creation
						onOpenChange(false);
					},
				},
			],
		},
		{
			group: 'Actions',
			items: [
				{
					icon: Save,
					label: 'Save',
					shortcut: 'Ctrl+S',
					onSelect: () => {
						// Trigger save
						onOpenChange(false);
					},
				},
				{
					icon: Download,
					label: 'Export',
					shortcut: 'Ctrl+E',
					onSelect: () => {
						// Trigger export
						onOpenChange(false);
					},
				},
			],
		},
		{
			group: 'Settings',
			items: [
				{
					icon: Palette,
					label: 'Toggle Theme',
					shortcut: '',
					onSelect: () => {
						// Toggle theme
						onOpenChange(false);
					},
				},
				{
					icon: Settings,
					label: 'Preferences',
					shortcut: '',
					onSelect: () => {
						// Open preferences
						onOpenChange(false);
					},
				},
			],
		},
	];
	const actions =
		(actionsProp && actionsProp.length ? actionsProp : null) ||
		(storeActions && storeActions.length ? storeActions : null) ||
		defaultActions;
	const resolvedPlaceholder = placeholder || storePlaceholder || "Type a command or search...";

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
