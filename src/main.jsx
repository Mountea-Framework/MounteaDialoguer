import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter, createHashHistory } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { initRendererSentry } from '@/lib/monitoring/sentry';
import './i18n';
import './index.css';

// Create hash history for static hosting compatibility
const hashHistory = createHashHistory();

// Create router instance with hash history
const router = createRouter({
	routeTree,
	defaultPreload: 'intent',
	history: hashHistory,
});

initRendererSentry();

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<AppErrorBoundary>
			<RouterProvider router={router} />
		</AppErrorBoundary>
	</React.StrictMode>
);
