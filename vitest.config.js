import { defineConfig } from 'vitest/config';
import path from 'path';

// Only the MCP server tests use Vitest; the application is covered by the Playwright specs in tests/e2e.
export default defineConfig({
	resolve: {
		alias: { '@': path.resolve(__dirname, './src') },
	},
	test: {
		globals: true,
		include: ['mcp/**/*.test.js'],
	},
});
