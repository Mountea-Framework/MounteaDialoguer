import { MessageCircle, Users, Folder, Paintbrush, Settings, LayoutDashboard, X, Cloud, SlidersHorizontal } from 'lucide-react';
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
		},
		{
			id: 'dialogues',
			label: t('dialogues.title'),
			icon: MessageCircle,
			count: dialogueCount,
		},
		{
			id: 'participants',
			label: t('participants.title'),
			icon: Users,
			count: participantCount,
		},
		{
			id: 'categories',
			label: t('categories.title'),
			icon: Folder,
		},
		{
			id: 'decorators',
			label: t('decorators.title'),
			icon: Paintbrush,
		},
		{
			id: 'conditions',
			label: t('conditions.title'),
			icon: SlidersHorizontal,
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
			<div className="lg:hidden flex justify-end">
				<Button
					variant="ghost"
					size="icon"
					onClick={onMobileClose}
					className="rounded-full"
				>
					<X className="h-5 w-5" />
				</Button>
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
							<Icon className="h-5 w-5" />
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
