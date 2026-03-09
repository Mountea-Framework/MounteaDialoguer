import { createRootRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, LifeBuoy, ShieldCheck } from 'lucide-react';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Toaster } from '@/components/ui/toaster';
import { CommandPalette } from '@/components/ui/command-palette';
import { SettingsCommandDialog } from '@/components/ui/SettingsCommandDialog';
import { SyncLoginDialog } from '@/components/sync/SyncLoginDialog';
import { SyncPullDialog } from '@/components/sync/SyncPullDialog';
import { db } from '@/lib/db';
import { useSyncStore } from '@/stores/syncStore';
import { useSteamStore } from '@/stores/steamStore';
import { markUserActivity, trackActiveMinute } from '@/lib/achievements/achievementTracker';
import { isGoogleSyncEnabled, isSteamChannel } from '@/lib/runtimeConfig';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { useSettingsCommandStore } from '@/stores/settingsCommandStore';
import { isMobileDevice, startDeviceOverrideListener } from '@/lib/deviceDetection';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import i18n from '@/i18n';

export const Route = createRootRoute({
	component: RootComponent,
});

function RootComponent() {
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(true);
	const [showContent, setShowContent] = useState(false);
	const [promptedThisSession, setPromptedThisSession] = useState(false);
	const [, setDeviceOverrideTick] = useState(0);
	const [onboardingSignal, setOnboardingSignal] = useState(0);
	const hasAutoSyncedRef = useRef(false);
	const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } =
		useCommandPaletteStore();
	const openSettingsCommand = useSettingsCommandStore((state) => state.openWithContext);
	const loadSteamStatus = useSteamStore((state) => state.loadStatus);
	const googleSyncEnabled = isGoogleSyncEnabled();
	const steamChannel = isSteamChannel();
	const {
		loadAccount,
		hasHydrated,
		status,
		passphrase,
		syncAllProjects,
		hideLoginPrompt,
		setHideLoginPrompt,
		loginDialogOpen,
		setLoginDialogOpen,
	} = useSyncStore();
	const currentPath = useRouterState({
		select: (state) => state.location.pathname || '',
	});
	const routeContext = useMemo(() => {
		const dialogueSettingsMatch = currentPath.match(
			/^\/projects\/([^/]+)\/dialogue\/([^/]+)\/settings\/?$/
		);
		if (dialogueSettingsMatch) {
			return {
				type: 'dialogue-settings',
				projectId: dialogueSettingsMatch[1],
				dialogueId: dialogueSettingsMatch[2],
			};
		}

		const dialogueMatch = currentPath.match(/^\/projects\/([^/]+)\/dialogue\/([^/]+)\/?$/);
		if (dialogueMatch) {
			return {
				type: 'dialogue',
				projectId: dialogueMatch[1],
				dialogueId: dialogueMatch[2],
			};
		}

		const projectMatch = currentPath.match(/^\/projects\/([^/]+)\/?$/);
		if (projectMatch) {
			return { type: 'project', projectId: projectMatch[1], dialogueId: '' };
		}
		if (currentPath === '/') {
			return { type: 'dashboard', projectId: '', dialogueId: '' };
		}
		if (currentPath === '/terms-of-service' || currentPath === '/data-policy') {
			return { type: 'legal', projectId: '', dialogueId: '' };
		}

		return { type: 'none', projectId: '', dialogueId: '' };
	}, [currentPath]);
	const isLegalPage =
		currentPath === '/terms-of-service' || currentPath === '/data-policy';

	useEffect(() => {
		const allowedOrigins = (import.meta.env.VITE_EMBED_ALLOWED_ORIGINS || '')
			.split(',')
			.map((origin) => origin.trim())
			.filter(Boolean);

		if (import.meta.env.DEV) {
			allowedOrigins.push('null');
		}

		const cleanupListener = startDeviceOverrideListener({ allowedOrigins });
		const handleOverride = () => {
			setDeviceOverrideTick((value) => value + 1);
		};

		window.addEventListener('device-override', handleOverride);

		return () => {
			cleanupListener();
			window.removeEventListener('device-override', handleOverride);
		};
	}, []);

	useEffect(() => {
		const initializeApp = async () => {
			try {
				// Wait for database to be ready
				await db.open();
				await loadAccount();
				await loadSteamStatus();

				// Ensure minimum loading time for smooth UX (1.5 seconds)
				await new Promise((resolve) => setTimeout(resolve, 1500));

				// Mark loading as complete
				setIsLoading(false);
			} catch (error) {
				console.error('Failed to initialize app:', error);
				// Still proceed even if there's an error
				setIsLoading(false);
			}
		};

		initializeApp();
	}, [loadAccount, loadSteamStatus]);

	useEffect(() => {
		const activityEvents = [
			'mousemove',
			'mousedown',
			'keydown',
			'touchstart',
			'pointerdown',
			'focus',
		];

		const handleActivity = () => {
			markUserActivity();
		};

		handleActivity();
		activityEvents.forEach((eventName) =>
			window.addEventListener(eventName, handleActivity, { passive: true })
		);

		const timer = window.setInterval(() => {
			trackActiveMinute().catch((error) => {
				console.warn('[achievements] Failed to track active minute:', error);
			});
		}, 60_000);

		return () => {
			window.clearInterval(timer);
			activityEvents.forEach((eventName) =>
				window.removeEventListener(eventName, handleActivity)
			);
		};
	}, []);

	useEffect(() => {
		if (!hasHydrated) return;
		if (status !== 'connected') return;
		if (!passphrase || !passphrase.trim()) return;
		if (isLoading || !showContent) return;
		if (hasAutoSyncedRef.current) return;
		console.log('[sync] Auto sync after hydration');
		hasAutoSyncedRef.current = true;
		syncAllProjects({ mode: 'pull' });
	}, [hasHydrated, status, passphrase, isLoading, showContent, syncAllProjects]);

	useEffect(() => {
		if (status === 'disconnected') {
			hasAutoSyncedRef.current = false;
		}
	}, [status]);

	useEffect(() => {
		const handleOnboardingComplete = (event) => {
			if (event?.detail?.key === 'dashboard') {
				setOnboardingSignal((value) => value + 1);
			}
		};

		window.addEventListener('onboarding:completed', handleOnboardingComplete);
		return () => {
			window.removeEventListener('onboarding:completed', handleOnboardingComplete);
		};
	}, []);

	useEffect(() => {
		if (isLegalPage) {
			setLoginDialogOpen(false);
		}
	}, [isLegalPage, setLoginDialogOpen]);

	useEffect(() => {
		if (!hasHydrated || isLoading) return;
		if (isLegalPage) return;
		if (!googleSyncEnabled) return;
		if (steamChannel) return;
		if (promptedThisSession) return;
		if (hideLoginPrompt) return;
		if (status === 'connected' || status === 'connecting' || status === 'syncing') return;

		// On first dashboard visit (desktop), wait for onboarding tour completion before showing sync login.
		const isDashboardPath = currentPath === '/';
		const hasCompletedDashboardOnboarding = Boolean(localStorage.getItem('onboarding-dashboard'));
		if (!isMobileDevice() && isDashboardPath && !hasCompletedDashboardOnboarding) return;

		console.log('[sync] Showing login prompt');
		setLoginDialogOpen(true);
		setPromptedThisSession(true);
	}, [
		hasHydrated,
		isLoading,
		googleSyncEnabled,
		steamChannel,
		promptedThisSession,
		hideLoginPrompt,
		status,
		isLegalPage,
		currentPath,
		onboardingSignal,
		setLoginDialogOpen,
	]);

	useEffect(() => {
		const electronApi = typeof window !== 'undefined' ? window.electronAPI : null;
		if (!electronApi?.isElectron || typeof electronApi.onMenuCommand !== 'function') {
			return undefined;
		}

		const emit = (eventName, detail = {}) => {
			window.dispatchEvent(new CustomEvent(eventName, { detail }));
		};

		const unsubscribe = electronApi.onMenuCommand((payload) => {
			const command = payload?.command || '';
			const commandPayload = payload?.payload || {};
			switch (command) {
				case 'new-project': {
					if (currentPath !== '/') {
						navigate({ to: '/' });
						window.setTimeout(() => emit('menu:new-project'), 120);
					} else {
						emit('menu:new-project');
					}
					return;
				}
				case 'navigate-back': {
					if (routeContext.type === 'dialogue-settings') {
						navigate({
							to: '/projects/$projectId/dialogue/$dialogueId',
							params: {
								projectId: routeContext.projectId,
								dialogueId: routeContext.dialogueId,
							},
						});
						return;
					}
					if (routeContext.type === 'dialogue') {
						navigate({
							to: '/projects/$projectId',
							params: { projectId: routeContext.projectId },
						});
						return;
					}
					if (routeContext.type === 'project' || routeContext.type === 'legal') {
						navigate({ to: '/' });
						return;
					}
					window.history.back();
					return;
				}
				case 'dashboard-focus-search': {
					emit('command:dashboard-focus-search');
					return;
				}
				case 'open-command-palette': {
					setCommandPaletteOpen(true);
					return;
				}
				case 'project-import': {
					if (routeContext.projectId) {
						emit('command:project-import', { projectId: routeContext.projectId });
					}
					return;
				}
				case 'project-export': {
					if (routeContext.projectId) {
						emit('command:project-export', { projectId: routeContext.projectId });
					}
					return;
				}
				case 'dialogue-save': {
					if (routeContext.type === 'dialogue') {
						emit('command:dialogue-save', {
							projectId: routeContext.projectId,
							dialogueId: routeContext.dialogueId,
						});
					}
					return;
				}
				case 'dialogue-export': {
					if (
						routeContext.type === 'dialogue' ||
						routeContext.type === 'dialogue-settings'
					) {
						emit('command:dialogue-export', {
							projectId: routeContext.projectId,
							dialogueId: routeContext.dialogueId,
						});
					}
					return;
				}
				case 'dialogue-undo': {
					if (routeContext.type === 'dialogue') {
						emit('command:dialogue-undo', {
							projectId: routeContext.projectId,
							dialogueId: routeContext.dialogueId,
						});
					}
					return;
				}
				case 'dialogue-redo': {
					if (routeContext.type === 'dialogue') {
						emit('command:dialogue-redo', {
							projectId: routeContext.projectId,
							dialogueId: routeContext.dialogueId,
						});
					}
					return;
				}
				case 'dialogue-start-preview': {
					if (routeContext.type === 'dialogue') {
						emit('command:dialogue-start-preview', {
							projectId: routeContext.projectId,
							dialogueId: routeContext.dialogueId,
						});
					}
					return;
				}
				case 'dialogue-recenter': {
					if (routeContext.type === 'dialogue') {
						emit('command:dialogue-recenter', {
							projectId: routeContext.projectId,
							dialogueId: routeContext.dialogueId,
						});
					}
					return;
				}
				case 'dialogue-focus-start': {
					if (routeContext.type === 'dialogue') {
						emit('command:dialogue-focus-start', {
							projectId: routeContext.projectId,
							dialogueId: routeContext.dialogueId,
						});
					}
					return;
				}
				case 'set-theme': {
					const theme = commandPayload.theme;
					if (theme === 'light' || theme === 'dark' || theme === 'system') {
						emit('app:set-theme', { theme });
					}
					return;
				}
				case 'set-language': {
					const language = commandPayload.language;
					if (['en', 'cs', 'de', 'fr', 'es', 'pl'].includes(language)) {
						i18n.changeLanguage(language);
						window.localStorage.setItem('i18nextLng', language);
					}
					return;
				}
				case 'open-settings': {
					if (
						routeContext.type === 'dialogue' ||
						routeContext.type === 'dialogue-settings'
					) {
						openSettingsCommand({
							context: {
								type: 'dialogue',
								projectId: routeContext.projectId,
								dialogueId: routeContext.dialogueId,
							},
							mode: 'detail',
						});
					} else if (routeContext.type === 'project') {
						openSettingsCommand({
							context: { type: 'project', projectId: routeContext.projectId },
							mode: 'detail',
						});
					} else {
						openSettingsCommand({ mode: 'list' });
					}
					return;
				}
				case 'open-sync': {
					setLoginDialogOpen(true);
					return;
				}
				case 'open-terms': {
					emit('command:open-terms-of-service');
					return;
				}
				case 'open-data-policy': {
					emit('command:open-data-policy');
					return;
				}
				case 'show-tour': {
					if (routeContext.type === 'dashboard') {
						emit('command:dashboard-show-tour');
					} else if (routeContext.type === 'dialogue') {
						emit('command:dialogue-show-tour', {
							projectId: routeContext.projectId,
							dialogueId: routeContext.dialogueId,
						});
					}
					return;
				}
				case 'open-support': {
					emit('command:open-support');
					return;
				}
				default:
					return;
			}
		});

		return () => {
			if (typeof unsubscribe === 'function') {
				unsubscribe();
			}
		};
	}, [
		currentPath,
		navigate,
		openSettingsCommand,
		routeContext.dialogueId,
		routeContext.projectId,
		routeContext.type,
		setCommandPaletteOpen,
		setLoginDialogOpen,
	]);

	useEffect(() => {
		const electronApi = typeof window !== 'undefined' ? window.electronAPI : null;
		if (!electronApi?.isElectron || typeof electronApi.setMenuContext !== 'function') {
			return;
		}

		electronApi.setMenuContext({
			route: routeContext.type,
			projectId: routeContext.projectId,
			dialogueId: routeContext.dialogueId,
		});
	}, [routeContext.dialogueId, routeContext.projectId, routeContext.type]);

	return (
		<ThemeProvider defaultTheme="system" storageKey="mountea-dialoguer-theme">
			<LoadingScreen
				isLoading={isLoading}
				onLoadingComplete={() => setShowContent(true)}
			/>
			{(showContent || !isLoading) && (
				<div className="min-h-screen">
					<div key={currentPath} className="route-fade-enter">
						<Outlet />
					</div>
					<PolicyQuickLinks />
				</div>
			)}
			{!isLegalPage && (
				<>
					<SyncLoginDialog
						open={loginDialogOpen}
						onOpenChange={setLoginDialogOpen}
						showPromptControls
						hideLoginPrompt={hideLoginPrompt}
						onHideLoginPromptChange={setHideLoginPrompt}
					/>
					<SyncPullDialog />
				</>
			)}
			<Toaster />
			<CommandPalette
				open={commandPaletteOpen}
				onOpenChange={setCommandPaletteOpen}
			/>
			<SettingsCommandDialog />
		</ThemeProvider>
	);
}

function PolicyQuickLinks() {
	const { t } = useTranslation();
	const [openModal, setOpenModal] = useState(null);
	const [isSupportConfirmOpen, setIsSupportConfirmOpen] = useState(false);
	const openWithActions = useCommandPaletteStore((state) => state.openWithActions);
	const currentPath = useRouterState({
		select: (state) => state.location.pathname || '',
	});
	const isDialogueEditorRoute = currentPath.includes('/dialogue/');

	useEffect(() => {
		const openTerms = () => setOpenModal('tos');
		const openData = () => setOpenModal('data');
		const openSupport = () => setIsSupportConfirmOpen(true);

		window.addEventListener('command:open-terms-of-service', openTerms);
		window.addEventListener('command:open-data-policy', openData);
		window.addEventListener('command:open-support', openSupport);

		return () => {
			window.removeEventListener('command:open-terms-of-service', openTerms);
			window.removeEventListener('command:open-data-policy', openData);
			window.removeEventListener('command:open-support', openSupport);
		};
	}, []);

	const openSupportConfirmation = useCallback(() => {
		setIsSupportConfirmOpen(true);
	}, []);

	const mobileActions = useMemo(
		() => [
			{
				group: t('legal.paletteGroup'),
				items: [
					{
						icon: FileText,
						label: t('legal.links.terms'),
						onSelect: () => setOpenModal('tos'),
					},
					{
						icon: ShieldCheck,
						label: t('legal.links.data'),
						onSelect: () => setOpenModal('data'),
					},
					{
						icon: LifeBuoy,
						label: t('legal.links.support'),
						onSelect: openSupportConfirmation,
					},
				],
			},
		],
		[openSupportConfirmation, t]
	);

	return (
		<>
			{!isDialogueEditorRoute && (
				<>
					<nav
						className="fixed bottom-4 left-1/2 z-50 hidden -translate-x-1/2 md:block"
						aria-label={t('legal.navAriaLabel')}
					>
						<TooltipProvider>
							<div className="flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-2 text-sm shadow-md">
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											onClick={() => setOpenModal('tos')}
											className="rounded-full px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
										>
											{t('legal.links.terms')}
										</button>
									</TooltipTrigger>
									<TooltipContent>{t('legal.tooltips.terms')}</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											onClick={() => setOpenModal('data')}
											className="rounded-full px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
										>
											{t('legal.links.data')}
										</button>
									</TooltipTrigger>
									<TooltipContent>{t('legal.tooltips.data')}</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											onClick={openSupportConfirmation}
											className="rounded-full px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
											aria-label={t('legal.links.supportAriaLabel')}
										>
											{t('legal.links.support')}
										</button>
									</TooltipTrigger>
									<TooltipContent>{t('legal.tooltips.support')}</TooltipContent>
								</Tooltip>
							</div>
						</TooltipProvider>
					</nav>

					<div className="fixed bottom-6 right-4 z-50 md:hidden">
						<button
							type="button"
							onClick={() =>
								openWithActions({
									actions: mobileActions,
									placeholder: t('legal.palettePlaceholder'),
								})
							}
							className="h-12 w-12 rounded-full border bg-primary text-primary-foreground shadow-lg"
							aria-label={t('legal.mobileBubbleAriaLabel')}
						>
							?
						</button>
					</div>
				</>
			)}

			<Dialog
				open={openModal === 'tos'}
				onOpenChange={(open) => setOpenModal(open ? 'tos' : null)}
			>
				<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{t('legal.terms.title')}</DialogTitle>
						<DialogDescription>{t('legal.effectiveDate')}</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 text-sm leading-6 text-foreground/90">
						<p>{t('legal.terms.paragraphs.1')}</p>
						<p>{t('legal.terms.paragraphs.2')}</p>
						<p>{t('legal.terms.paragraphs.3')}</p>
						<p>{t('legal.terms.paragraphs.4')}</p>
						<p>
							{t('legal.terms.paragraphs.5')}{' '}
							<a
								href="https://discord.gg/hCjh8e3Y9r"
								target="_blank"
								rel="noreferrer"
								className="text-primary underline underline-offset-2"
							>
								https://discord.gg/hCjh8e3Y9r
							</a>
							.
						</p>
						<p>{t('legal.terms.paragraphs.6')}</p>
						<p>{t('legal.terms.paragraphs.7')}</p>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={openModal === 'data'}
				onOpenChange={(open) => setOpenModal(open ? 'data' : null)}
			>
				<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{t('legal.data.title')}</DialogTitle>
						<DialogDescription>{t('legal.effectiveDate')}</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 text-sm leading-6 text-foreground/90">
						<p>{t('legal.data.paragraphs.1')}</p>
						<p>{t('legal.data.paragraphs.2')}</p>
						<p>{t('legal.data.paragraphs.3')}</p>
						<p>{t('legal.data.paragraphs.4')}</p>
						<p>{t('legal.data.paragraphs.5')}</p>
					</div>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={isSupportConfirmOpen}
				onOpenChange={setIsSupportConfirmOpen}
			>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>{t('legal.supportConfirm.title')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('legal.supportConfirm.description')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('legal.supportConfirm.no')}</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								window.open('https://discord.gg/hCjh8e3Y9r', '_blank', 'noopener,noreferrer');
							}}
						>
							{t('legal.supportConfirm.yes')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
