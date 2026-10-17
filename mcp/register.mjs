// Run with:  node --import ./mcp/register.mjs mcp/server.mjs
// Lets Node load the web app's pure modules (src/lib/...) unchanged: "@/..." aliases, extension-less imports
// and JSON imports are resolved the way Vite does it.
import { register } from 'node:module';

register('./alias-hooks.mjs', import.meta.url);
