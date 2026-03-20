import { useCallback, useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import {
	ArrowLeft,
	Bug,
	Cloud,
	Crosshair,
	Download,
	FileText,
	FolderOpen,
	LifeBuoy,
	Languages,
	LocateFixed,
	Palette,
	Play,
	Plus,
	RotateCcw,
	Redo2,
	Save,
	Search as SearchIcon,
	Settings,
	ShieldCheck,
	Undo2,
	Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { normalizeLocaleTag, normalizeProjectLocalizationConfig } from '@/lib/localization/stringTable';
import { APP_LANGUAGE_OPTIONS, getAppLanguageLabel } from '@/lib/localization/appLanguages';
import { useTheme } from '@/contexts/ThemeProvider';
import { useTranslation } from 'react-i18next';
import { formatShortcut, getPrimaryModifierKey } from '@/lib/keyboardShortcuts';
import { isMobileDevice } from '@/lib/deviceDetection';

const SUPPORT_URL = 'https://discord.gg/hCjh8e3Y9r';
const ISSUES_URL = 'https://github.com/Mountea-Framework/MounteaDialoguer/issues';

function getLocaleMenuLabel(localeCode) {
	const normalized = String(localeCode || '').trim();
	if (!normalized) return '';

	const exactLabel = getAppLanguageLabel(normalized);
	if (exactLabel) {
		return `${exactLabel} (${normalized})`;
	}

	const base = normalized.split('-')[0];
	const baseLabel = getAppLanguageLabel(base);
	if (baseLabel) {
		return `${baseLabel} (${normalized})`;
	}

	try {
		const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
		const fallbackLabel = displayNames.of(base) || normalized;
		return `${fallbackLabel} (${normalized})`;
	} catch (error) {
		return normalized;
	}
}

function resolveRouteContext() {
	const rawPath =
		(window.location.hash && window.location.hash.replace(/^#/, '')) ||
		window.location.pathname ||
		'';
	const dialogueSettingsMatch = rawPath.match(/^\/projects\/([^/]+)\/dialogue\/([^/]+)\/settings\/?$/);
	if (dialogueSettingsMatch) {
		return {
			type: 'dialogue-settings',
			projectId: dialogueSettingsMatch[1],
			dialogueId: dialogueSettingsMatch[2],
		};
	}

	const dialogueMatch = rawPath.match(/^\/projects\/([^/]+)\/dialogue\/([^/]+)\/?$/);
	if (dialogueMatch) {
		return {
			type: 'dialogue',
			projectId: dialogueMatch[1],
			dialogueId: dialogueMatch[2],
		};
	}

	const projectMatch = rawPath.match(/^\/projects\/([^/]+)\/?$/);
	if (projectMatch) {
		return { type: 'project', projectId: projectMatch[1], dialogueId: '' };
	}

	if (rawPath === '/') {
		return { type: 'dashboard', projectId: '', dialogueId: '' };
	}

	if (rawPath === '/terms-of-service' || rawPath === '/data-policy') {
		return { type: 'legal', projectId: '', dialogueId: '' };
	}

	return { type: 'none', projectId: '', dialogueId: '' };
}

/**
 * Command Palette Component
 * Quick access to actions via keyboard shortcut (Ctrl/Cmd + K)
 */
export function CommandPalette({ open, onOpenChange, actions: actionsProp, placeholder }) {
	const [search, setSearch] = useState('');
	const primaryModifier = getPrimaryModifierKey();
	const isMobile = isMobileDevice();
	const { actions: storeActions, placeholder: storePlaceholder } = useCommandPaletteStore();
	const projects = useProjectStore((state) => state.projects);
	const contentLocaleByProject = useUIStore((state) => state.contentLocaleByProject);
	const { theme } = useTheme();
	const { t, i18n: runtimeI18n } = useTranslation();
	const currentAppLanguage = String(runtimeI18n.resolvedLanguage || runtimeI18n.language || 'en')
		.split('-')[0]
		.trim() || 'en';

	// Handle keyboard shortcut
	useEffect(() => {
		const down = (e) => {
			if (e.key === 'Escape' && open) {
				e.preventDefault();
				onOpenChange(false);
				return;
			}
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

	const routeContext = resolveRouteContext();
	const menuLocalizationContext = useMemo(() => {
		const projectId = String(routeContext.projectId || '');
		if (!projectId) {
			return { contentLocale: '', supportedContentLocales: [] };
		}
		const project = (projects || []).find((item) => String(item?.id || '') === projectId);
		const localization = normalizeProjectLocalizationConfig(project?.localization || {});
		const savedLocale = normalizeLocaleTag(contentLocaleByProject?.[projectId], '');
		const contentLocale =
			savedLocale && localization.supportedLocales.includes(savedLocale)
				? savedLocale
				: localization.defaultLocale;
		return {
			contentLocale,
			supportedContentLocales: localization.supportedLocales,
		};
	}, [contentLocaleByProject, projects, routeContext.projectId]);
	const dispatchMenuCommand = useCallback((command, payload = {}) => {
		window.dispatchEvent(
			new CustomEvent('command:menu-command', {
				detail: { command, payload },
			})
		);
	}, []);
	const openExternalLink = useCallback(async (url) => {
		if (!url) return;
		const electronApi = typeof window !== 'undefined' ? window.electronAPI : null;
		if (electronApi?.isElectron && typeof electronApi.openExternal === 'function') {
			await electronApi.openExternal(url);
			return;
		}
		window.open(url, '_blank', 'noopener,noreferrer');
	}, []);

	const defaultActions = useMemo(() => {
		const groups = [];
		const isDashboard = routeContext.type === 'dashboard';
		const isProject = routeContext.type === 'project';
		const isDialogue = routeContext.type === 'dialogue';
		const isDialogueSettings = routeContext.type === 'dialogue-settings';
		const isLegal = routeContext.type === 'legal';
		const canNavigateBack = isProject || isDialogue || isDialogueSettings || isLegal;
		const canImportExportProject = isProject;
		const canSaveDialogue = isDialogue;
		const canExportDialogue = isDialogue || isDialogueSettings;
		const canOpenDialogueLastExport = canExportDialogue;
		const canGraphNavigation = isDialogue;
		const canSetContentLocale =
			(isDialogue || isDialogueSettings) && Boolean(routeContext.projectId);
		const canOpenSettingsDialog = isProject || isDialogue || isDialogueSettings;
		const canOpenSync = !isDialogue;
		const canShowTour = isDashboard || isDialogue;

		const fileItems = [];
		if (canNavigateBack) {
			fileItems.push({
				icon: ArrowLeft,
				label: 'Back',
				shortcut: 'Ctrl+[',
				onSelect: () => dispatchMenuCommand('navigate-back'),
			});
		}
		if (isDashboard) {
			fileItems.push({
				icon: Plus,
				label: 'New Project',
				shortcut: 'Ctrl+N',
				onSelect: () => dispatchMenuCommand('new-project'),
			});
		} else if (isProject) {
			fileItems.push({
				icon: Plus,
				label: 'New Dialogue',
				shortcut: 'Ctrl+N',
				onSelect: () => dispatchMenuCommand('new-dialogue'),
			});
		}
		if (isDashboard) {
			fileItems.push({
				icon: SearchIcon,
				label: 'Find Projects',
				shortcut: 'Ctrl+F',
				onSelect: () => dispatchMenuCommand('dashboard-focus-search'),
			});
		}
		if (canImportExportProject) {
			fileItems.push(
				{
					icon: Upload,
					label: 'Import Project',
					shortcut: 'Ctrl+I',
					onSelect: () => dispatchMenuCommand('project-import'),
				},
				{
					icon: Download,
					label: 'Export Project',
					shortcut: 'Ctrl+Shift+E',
					onSelect: () => dispatchMenuCommand('project-export'),
				},
				{
					icon: FolderOpen,
					label: 'Open Last Project Export Path',
					shortcut: '',
					onSelect: () => dispatchMenuCommand('project-open-last-export'),
				}
			);
		}
		if (canSaveDialogue) {
			fileItems.push({
				icon: Save,
				label: 'Save Dialogue',
				shortcut: 'Ctrl+S',
				onSelect: () => dispatchMenuCommand('dialogue-save'),
			});
		}
		if (canExportDialogue) {
			fileItems.push({
				icon: Download,
				label: 'Export Dialogue',
				shortcut: 'Ctrl+E',
				onSelect: () => dispatchMenuCommand('dialogue-export'),
			});
		}
		if (canOpenDialogueLastExport) {
			fileItems.push({
				icon: FolderOpen,
				label: 'Open Last Dialogue Export Path',
				shortcut: '',
				onSelect: () => dispatchMenuCommand('dialogue-open-last-export'),
			});
		}
		if (fileItems.length > 0) {
			groups.push({ group: 'File', items: fileItems });
		}

		const editItems = [];
		if (isDialogue) {
			editItems.push(
				{
					icon: Undo2,
					label: 'Undo',
					shortcut: 'Ctrl+Z',
					onSelect: () => dispatchMenuCommand('dialogue-undo'),
				},
				{
					icon: Redo2,
					label: 'Redo',
					shortcut: 'Ctrl+Y',
					onSelect: () => dispatchMenuCommand('dialogue-redo'),
				}
			);
		}
		if (editItems.length > 0) {
			groups.push({ group: 'Edit', items: editItems });
		}

		const viewItems = [];
		if (isDialogue) {
			viewItems.push({
				icon: Play,
				label: 'Start Preview',
				shortcut: '',
				onSelect: () => dispatchMenuCommand('dialogue-start-preview'),
			});
		}
		if (canGraphNavigation) {
			viewItems.push(
				{
					icon: LocateFixed,
					label: 'Recenter Graph',
					shortcut: '',
					onSelect: () => dispatchMenuCommand('dialogue-recenter'),
				},
				{
					icon: Crosshair,
					label: 'Focus Start Node',
					shortcut: '',
					onSelect: () => dispatchMenuCommand('dialogue-focus-start'),
				}
			);
		}
		if (viewItems.length > 0) {
			groups.push({ group: 'View', items: viewItems });
		}

		const settingsItems = [];
		settingsItems.push({
			key: 'theme-select',
			render: () => (
				<div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
					<Palette className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm min-w-[6rem]">Theme</span>
					<select
						className="h-8 flex-1 rounded-md border bg-background px-2 text-sm"
						value={theme}
						onChange={(event) =>
							dispatchMenuCommand('set-theme', { theme: event.target.value })
						}
					>
						<option value="light">Light</option>
						<option value="dark">Dark</option>
						<option value="system">System</option>
					</select>
				</div>
			),
		});
		settingsItems.push({
			key: 'language-select',
			render: () => (
				<div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
					<Languages className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm min-w-[6rem]">Language</span>
					<select
						className="h-8 flex-1 rounded-md border bg-background px-2 text-sm"
						value={currentAppLanguage}
						onChange={(event) =>
							dispatchMenuCommand('set-language', { language: event.target.value })
						}
					>
						{APP_LANGUAGE_OPTIONS.map(({ code, label }) => (
							<option key={code} value={code}>
								{label} ({code})
							</option>
						))}
					</select>
				</div>
			),
		});
		if (canSetContentLocale && menuLocalizationContext.supportedContentLocales.length > 0) {
			settingsItems.push({
				key: 'content-locale-select',
				render: () => (
					<div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
						<Palette className="h-4 w-4 text-muted-foreground" />
						<span className="text-sm min-w-[6rem]">Content Locale</span>
						<select
							className="h-8 flex-1 rounded-md border bg-background px-2 text-sm"
							value={menuLocalizationContext.contentLocale}
							onChange={(event) =>
								dispatchMenuCommand('set-content-locale', { locale: event.target.value })
							}
						>
							{menuLocalizationContext.supportedContentLocales.map((localeCode) => (
								<option key={localeCode} value={localeCode}>
									{getLocaleMenuLabel(localeCode)}
								</option>
							))}
						</select>
					</div>
				),
			});
		}
		if (canOpenSettingsDialog) {
			settingsItems.push({
				icon: Settings,
				label: 'Open Settings',
				shortcut: 'Ctrl+,',
				onSelect: () => dispatchMenuCommand('open-settings'),
			});
		}
		if (canOpenSync) {
			settingsItems.push({
				icon: Cloud,
				label: 'Cloud Sync',
				shortcut: 'Ctrl+Shift+S',
				onSelect: () => dispatchMenuCommand('open-sync'),
			});
		}
		groups.push({ group: 'Settings', items: settingsItems });

		const helpItems = [];
		if (canShowTour) {
			helpItems.push({
				icon: RotateCcw,
				label: isDialogue ? 'Restart Graph Tour' : 'Restart Dashboard Tour',
				shortcut: '',
				onSelect: () => dispatchMenuCommand('show-tour'),
			});
		}
		helpItems.push(
			{
				icon: FileText,
				label: t('legal.links.terms', { defaultValue: 'Terms of Service' }),
				shortcut: '',
				onSelect: () => dispatchMenuCommand('open-terms'),
			},
			{
				icon: ShieldCheck,
				label: t('legal.links.data', { defaultValue: 'Data Policy' }),
				shortcut: '',
				onSelect: () => dispatchMenuCommand('open-data-policy'),
			},
			{
				icon: Bug,
				label: 'Report Issue',
				shortcut: '',
				onSelect: () => {
					void openExternalLink(ISSUES_URL);
				},
			},
			{
				icon: LifeBuoy,
				label: 'Community Discord',
				shortcut: '',
				onSelect: () => {
					void openExternalLink(SUPPORT_URL);
				},
			}
		);
		groups.push({ group: 'Help', items: helpItems });
		return groups;
	}, [
		currentAppLanguage,
		dispatchMenuCommand,
		menuLocalizationContext,
		openExternalLink,
		routeContext.projectId,
		routeContext.type,
		t,
		theme,
	]);

	const actions =
		(actionsProp && actionsProp.length ? actionsProp : null) ||
		(storeActions && storeActions.length ? storeActions : null) ||
		defaultActions;
	const resolvedPlaceholder = placeholder || storePlaceholder || 'Type a command or search...';

	if (!open) return null;

	return (
		<>
			<div
				className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in"
				onClick={() => onOpenChange(false)}
			/>
			<div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2.5rem)] sm:w-full max-w-2xl animate-in fade-in zoom-in-95">
				<Command
					className="rounded-lg border bg-card shadow-2xl"
					shouldFilter={true}
					value={search}
					onValueChange={setSearch}
				>
					<div className="flex items-center border-b px-3">
						<SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
						<Command.Input
							placeholder={resolvedPlaceholder}
							className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
						/>
						{!isMobile && (
							<kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
								<span className="text-xs">ESC</span>
							</kbd>
						)}
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
											{item.shortcut && !isMobile && (
												<kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
													{formatShortcut(item.shortcut)}
												</kbd>
											)}
										</Command.Item>
									);
								})}
							</Command.Group>
						))}
					</Command.List>

					{!isMobile && (
						<div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
							<span>Press</span>
							<kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono font-medium">
								<span>{primaryModifier}</span>
								<span>K</span>
							</kbd>
							<span>to toggle</span>
						</div>
					)}
				</Command>
			</div>
		</>
	);
}
