import { MessageCircle, Users, Folder, Paintbrush, Settings, LayoutDashboard, X, Cloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSyncStore } from '@/stores/syncStore';
import { useSettingsCommandStore } from '@/stores/settingsCommandStore';

/**
 * Project Sidebar Component
 * Navigation sidebar for project details with sections
 */
export function ProjectSidebar({
	activeSection,
	onSectionChange,
	project,
	dialogueCount = 0,
	participantCount = 0,
	isMobileOpen = false,
	onMobileClose
}) {
	const { t } = useTranslation();
	const { status, setLoginDialogOpen } = useSyncStore();
	const openSettingsCommand = useSettingsCommandStore((state) => state.openWithContext);
	const cloudStatusColor = {
		connected: 'text-green-500',
		connecting: 'text-blue-500',
		syncing: 'text-blue-500',
		error: 'text-red-500',
		disconnected: 'text-muted-foreground',
	}[status] || 'text-muted-foreground';

	const sections = [
		{
			id: 'overview',
			label: t('navigation.dashboard'),
			icon: LayoutDashboard,
			color: 'text-blue-500',
		},
		{
			id: 'dialogues',
			label: t('dialogues.title'),
			icon: MessageCircle,
			color: 'text-blue-500',
			count: dialogueCount,
		},
		{
			id: 'participants',
			label: t('participants.title'),
			icon: Users,
			color: 'text-purple-500',
			count: participantCount,
		},
		{
			id: 'categories',
			label: t('categories.title'),
			icon: Folder,
			color: 'text-orange-500',
		},
		{
			id: 'decorators',
			label: t('decorators.title'),
			icon: Paintbrush,
			color: 'text-green-500',
		},
	];

	return (
		<aside
			className={cn(
				"flex-shrink-0 bg-card border-border flex flex-col transition-transform duration-300 ease-in-out",
				"fixed inset-y-0 left-0 z-50 h-full w-64",
				"lg:static lg:z-0 lg:translate-x-0",
				"lg:w-80",
				"lg:rounded-none",
				isMobileOpen ? "translate-x-0 rounded-none" : "-translate-x-full lg:translate-x-0 md:rounded-xl"
			)}
		>
			{/* Mobile Close Button */}
			<div className="lg:hidden flex justify-end p-4">
				<Button
					variant="ghost"
					size="icon"
					onClick={onMobileClose}
					className="rounded-full"
				>
					<X className="h-5 w-5" />
				</Button>
			</div>

			{/* Project Info Card */}
			<div className="p-4">
				<div className={cn(
					`p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-900/30 flex flex-col items-center text-center`,
					isMobileOpen ? "flex-row justify-between" : ""
				)}>
					<div className={cn(`w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-md mb-2`,
						isMobileOpen ? "hidden" : ""
					)}>
						<Folder className="h-6 w-6" />
					</div>
					<h3 className="font-bold text-sm line-clamp-1">{project?.name}</h3>
					{project?.version && (
						<p className="text-xs text-muted-foreground mt-1">v{project.version}</p>
					)}
				</div>
			</div>

			{/* Navigation */}
			<nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
				{sections.map((section) => {
					const Icon = section.icon;
					const isActive = activeSection === section.id;

					return (
						<button
							key={section.id}
							onClick={() => onSectionChange(section.id)}
							className={cn(
								'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
								isActive
									? 'bg-primary/10 text-primary'
									: 'text-muted-foreground hover:bg-accent hover:text-foreground'
							)}
						>
							<Icon className={cn('h-5 w-5', isActive && section.color)} />
							<span className="flex-1 text-left">{section.label}</span>
							{section.count !== undefined && (
								<span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md">
									{section.count}
								</span>
							)}
						</button>
					);
				})}
			</nav>

			{/* Sync Section */}
			<div className="p-4 border-t border-border">
				<button
					onClick={() => setLoginDialogOpen(true)}
					className={cn(
						'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
						'text-muted-foreground hover:bg-accent hover:text-foreground'
					)}
				>
					<Cloud className={cn('h-5 w-5', cloudStatusColor)} />
					<span>{t('sync.title')}</span>
				</button>
			</div>

			{/* Settings at Bottom */}
			<div className="p-4 border-t border-border">
				<button
					onClick={() =>
						openSettingsCommand({
							context: { type: 'project', projectId: project?.id },
							onOpenSettings: onSectionChange
								? () => onSectionChange('settings')
								: null,
							mode: 'detail',
						})
					}
					className={cn(
						'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
						activeSection === 'settings'
							? 'bg-primary/10 text-primary'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					)}
				>
					<Settings className="h-5 w-5" />
					<span>{t('navigation.settings')}</span>
				</button>
			</div>
		</aside>
	);
}
