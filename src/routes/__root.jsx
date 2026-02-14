import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Toaster } from '@/components/ui/toaster';
import { CommandPalette } from '@/components/ui/command-palette';
import { SettingsCommandDialog } from '@/components/ui/SettingsCommandDialog';
import { SyncLoginDialog } from '@/components/sync/SyncLoginDialog';
import { SyncPullDialog } from '@/components/sync/SyncPullDialog';
import { db } from '@/lib/db';
import { useSyncStore } from '@/stores/syncStore';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { isMobileDevice, startDeviceOverrideListener } from '@/lib/deviceDetection';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

export const Route = createRootRoute({
	component: RootComponent,
});

function RootComponent() {
	const [isLoading, setIsLoading] = useState(true);
	const [showContent, setShowContent] = useState(false);
	const [promptedThisSession, setPromptedThisSession] = useState(false);
	const [, setDeviceOverrideTick] = useState(0);
	const [onboardingSignal, setOnboardingSignal] = useState(0);
	const hasAutoSyncedRef = useRef(false);
	const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } =
		useCommandPaletteStore();
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
	}, [loadAccount]);

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
		if (!hasHydrated || isLoading) return;
		if (promptedThisSession) return;
		if (hideLoginPrompt) return;
		if (status === 'connected' || status === 'connecting' || status === 'syncing') return;

		// On first dashboard visit (desktop), wait for onboarding tour completion before showing sync login.
		const isDashboardPath = window.location.pathname === '/';
		const hasCompletedDashboardOnboarding = Boolean(localStorage.getItem('onboarding-dashboard'));
		if (!isMobileDevice() && isDashboardPath && !hasCompletedDashboardOnboarding) return;

		console.log('[sync] Showing login prompt');
		setLoginDialogOpen(true);
		setPromptedThisSession(true);
	}, [
		hasHydrated,
		isLoading,
		promptedThisSession,
		hideLoginPrompt,
		status,
		onboardingSignal,
		setLoginDialogOpen,
	]);

	return (
		<ThemeProvider defaultTheme="system" storageKey="mountea-dialoguer-theme">
			<LoadingScreen
				isLoading={isLoading}
				onLoadingComplete={() => setShowContent(true)}
			/>
			{(showContent || !isLoading) && (
				<div className="min-h-screen pb-20">
					<Outlet />
					<PolicyQuickLinks />
				</div>
			)}
			<SyncLoginDialog
				open={loginDialogOpen}
				onOpenChange={setLoginDialogOpen}
				showPromptControls
				hideLoginPrompt={hideLoginPrompt}
				onHideLoginPromptChange={setHideLoginPrompt}
			/>
			<SyncPullDialog />
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
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const mobileMenuRef = useRef(null);
	const mobileAutoHideTimerRef = useRef(null);

	useEffect(() => {
		if (!isMobileMenuOpen) {
			if (mobileAutoHideTimerRef.current) {
				clearTimeout(mobileAutoHideTimerRef.current);
				mobileAutoHideTimerRef.current = null;
			}
			return;
		}

		mobileAutoHideTimerRef.current = setTimeout(() => {
			setIsMobileMenuOpen(false);
		}, 3000);

		return () => {
			if (mobileAutoHideTimerRef.current) {
				clearTimeout(mobileAutoHideTimerRef.current);
				mobileAutoHideTimerRef.current = null;
			}
		};
	}, [isMobileMenuOpen]);

	useEffect(() => {
		if (!isMobileMenuOpen) return;

		const handlePointerDown = (event) => {
			if (!mobileMenuRef.current?.contains(event.target)) {
				setIsMobileMenuOpen(false);
			}
		};

		const handleFocusIn = (event) => {
			if (!mobileMenuRef.current?.contains(event.target)) {
				setIsMobileMenuOpen(false);
			}
		};

		document.addEventListener('pointerdown', handlePointerDown);
		document.addEventListener('focusin', handleFocusIn);

		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
			document.removeEventListener('focusin', handleFocusIn);
		};
	}, [isMobileMenuOpen]);

	return (
		<>
			<nav
				className="fixed bottom-4 left-1/2 z-50 hidden -translate-x-1/2 rounded-full border bg-background/95 px-3 py-2 shadow-lg backdrop-blur md:block"
				aria-label={t('legal.navAriaLabel')}
			>
				<div className="flex items-center gap-2 text-sm">
					<button
						type="button"
						onClick={() => setOpenModal('tos')}
						className="rounded-full px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
					>
						{t('legal.links.terms')}
					</button>
					<button
						type="button"
						onClick={() => setOpenModal('data')}
						className="rounded-full px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
					>
						{t('legal.links.data')}
					</button>
					<a
						href="https://discord.gg/hCjh8e3Y9r"
						target="_blank"
						rel="noreferrer"
						className="rounded-full px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
						aria-label={t('legal.links.supportAriaLabel')}
					>
						{t('legal.links.support')}
					</a>
				</div>
			</nav>

			<div ref={mobileMenuRef} className="fixed bottom-4 right-4 z-50 md:hidden">
				{isMobileMenuOpen && (
					<div
						className="mb-2 w-52 rounded-2xl border bg-background/95 p-2 shadow-xl backdrop-blur"
						role="menu"
						aria-label={t('legal.navAriaLabel')}
					>
						<button
							type="button"
							onClick={() => {
								setOpenModal('tos');
								setIsMobileMenuOpen(false);
							}}
							className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted transition-colors"
						>
							{t('legal.links.terms')}
						</button>
						<button
							type="button"
							onClick={() => {
								setOpenModal('data');
								setIsMobileMenuOpen(false);
							}}
							className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted transition-colors"
						>
							{t('legal.links.data')}
						</button>
						<a
							href="https://discord.gg/hCjh8e3Y9r"
							target="_blank"
							rel="noreferrer"
							className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted transition-colors"
							aria-label={t('legal.links.supportAriaLabel')}
						>
							{t('legal.links.support')}
						</a>
					</div>
				)}
				<button
					type="button"
					onClick={() => setIsMobileMenuOpen((value) => !value)}
					className="h-12 w-12 rounded-full border bg-primary text-primary-foreground shadow-lg"
					aria-label={t('legal.mobileBubbleAriaLabel')}
					aria-expanded={isMobileMenuOpen}
				>
					?
				</button>
			</div>

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
		</>
	);
}
