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
import { isMobileDevice } from '@/lib/deviceDetection';

export const Route = createRootRoute({
	component: RootComponent,
});

function RootComponent() {
	const [isLoading, setIsLoading] = useState(true);
	const [showContent, setShowContent] = useState(false);
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const [promptedThisSession, setPromptedThisSession] = useState(false);
	const [onboardingSignal, setOnboardingSignal] = useState(0);
	const hasAutoSyncedRef = useRef(false);
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
				<div className="min-h-screen">
					<Outlet />
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
