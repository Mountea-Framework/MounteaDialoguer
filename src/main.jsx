import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import './i18n';
import './index.css';

// Create router instance with base path
const router = createRouter({
	routeTree,
	defaultPreload: 'intent',
	basepath: '/MounteaDialoguer',
});

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
);
