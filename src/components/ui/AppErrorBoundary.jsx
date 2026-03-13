import * as Sentry from '@sentry/react';

function FallbackScreen() {
	return (
		<div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
			<div className="max-w-md text-center space-y-3">
				<h1 className="text-2xl font-semibold">Unexpected Error</h1>
				<p className="text-sm text-muted-foreground">
					An unexpected error occurred. Please restart the app and try again.
				</p>
			</div>
		</div>
	);
}

export function AppErrorBoundary({ children }) {
	return <Sentry.ErrorBoundary fallback={<FallbackScreen />}>{children}</Sentry.ErrorBoundary>;
}
