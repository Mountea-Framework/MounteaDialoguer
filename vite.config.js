import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import path from 'path';
import { readFileSync } from 'node:fs';
import { productBuildPlugin, resolveReleaseIdentity } from './scripts/product-build.mjs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const release = resolveReleaseIdentity({ version });

export default defineConfig(({ mode }) => ({
	define: { __APP_RELEASE__: JSON.stringify(release) },
	plugins: [
		productBuildPlugin(release, Boolean(String(loadEnv(mode, process.cwd()).VITE_SENTRY_DSN || '').trim())),
		TanStackRouterVite({
			autoCodeSplitting: true,
		}),
		react()
	],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	base: './',
	// Electron's development profile lives in the repository so it can be
	// inspected easily. Its transient Chromium files are often locked on
	// Windows, so they must never be passed to Vite's file watcher.
	server: {
		watch: {
			ignored: ['**/.mountea-user-data/**'],
		},
	},
	build: {
		sourcemap: 'hidden',
		outDir: 'dist',
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (!id.includes('node_modules')) return;
					if (id.includes('@xyflow') || id.includes('dagre')) return 'flow';
					if (id.includes('@radix-ui') || id.includes('vaul') || id.includes('cmdk') || id.includes('embla-carousel')) {
						return 'ui-kit';
					}
					if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n';
					if (id.includes('dexie')) return 'data';
					if (id.includes('lucide-react')) return 'icons';
					if (id.includes('react-joyride') || id.includes('canvas-confetti')) return 'tour';
					if (id.includes('@tanstack')) return 'router';
					return 'vendor';
				},
			},
		},
	},
}));
