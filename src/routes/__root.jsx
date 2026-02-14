import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { useState, useEffect, useRef } from 'react';
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
	const [openModal, setOpenModal] = useState(null);

	return (
		<>
			<nav
				className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border bg-background/95 px-3 py-2 shadow-lg backdrop-blur"
				aria-label="Policy links"
			>
				<div className="flex items-center gap-2 text-sm">
					<button
						type="button"
						onClick={() => setOpenModal('tos')}
						className="rounded-full px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
					>
						Terms of Service
					</button>
					<button
						type="button"
						onClick={() => setOpenModal('data')}
						className="rounded-full px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
					>
						Data Policy
					</button>
					<a
						href="https://discord.gg/hCjh8e3Y9r"
						target="_blank"
						rel="noreferrer"
						className="rounded-full px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
						aria-label="Support on Discord"
					>
						Support
					</a>
				</div>
			</nav>

			<Dialog
				open={openModal === 'tos'}
				onOpenChange={(open) => setOpenModal(open ? 'tos' : null)}
			>
				<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Terms of Service</DialogTitle>
						<DialogDescription>Effective date: February 14, 2026</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 text-sm leading-6 text-foreground/90">
						<p>
							By using this application, you agree to use it in compliance with applicable laws and these terms.
						</p>
						<p>
							You are responsible for the accuracy and legality of the content you create, import, or export while
							using this tool.
						</p>
						<p>
							The software is provided "as is" without warranties of any kind. Use is at your own risk.
						</p>
						<p>
							Support is provided on a best-effort basis only. There is no contractual right to claim support,
							response times, or issue resolution.
						</p>
						<p>
							For community support, use the Discord server:{' '}
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
						<p>
							We may update these terms over time. Continued use after updates means you accept the revised terms.
						</p>
						<p>If you do not agree with these terms, stop using the application.</p>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={openModal === 'data'}
				onOpenChange={(open) => setOpenModal(open ? 'data' : null)}
			>
				<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Data Policy</DialogTitle>
						<DialogDescription>Effective date: February 14, 2026</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 text-sm leading-6 text-foreground/90">
						<p>
							This application primarily stores project data locally in your browser/device storage.
						</p>
						<p>
							When optional sync features are enabled, data may be transferred to configured third-party storage
							services.
						</p>
						<p>
							You control what information is entered, exported, and synchronized. Avoid storing sensitive data
							unless appropriate safeguards are used.
						</p>
						<p>We recommend using secure devices, account protection, and encryption where available.</p>
						<p>By continuing to use this application, you acknowledge this data handling model.</p>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
