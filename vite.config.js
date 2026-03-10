import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import path from 'path';

export default defineConfig({
	plugins: [
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
	build: {
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
});
