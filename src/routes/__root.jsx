import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { useState, useEffect } from 'react';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Toaster } from '@/components/ui/toaster';
import { db } from '@/lib/db';

export const Route = createRootRoute({
	component: RootComponent,
});

function RootComponent() {
	const [isLoading, setIsLoading] = useState(true);
	const [showContent, setShowContent] = useState(false);

	useEffect(() => {
		const initializeApp = async () => {
			try {
				// Wait for database to be ready
				await db.open();

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
	}, []);

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
			<Toaster />
		</ThemeProvider>
	);
}
