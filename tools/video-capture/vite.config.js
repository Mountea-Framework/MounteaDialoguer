import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
// node_modules may be a junction to another checkout; Vite serves files from its real path.
const realModules = fs.realpathSync(path.resolve(repo, 'node_modules'));

export default defineConfig({
	root: here,
	plugins: [react()],
	define: { __APP_RELEASE__: JSON.stringify({ version: 'video-capture', channel: 'sandbox' }) },
	resolve: { alias: { '@': path.resolve(repo, 'src'), '@repo': repo } },
	css: { postcss: { plugins: [tailwindcss({ config: path.resolve(here, 'tailwind.config.js') }), autoprefixer] } },
	server: { host: '127.0.0.1', fs: { allow: [repo, realModules] } },
	logLevel: 'warn',
});
