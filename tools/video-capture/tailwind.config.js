import path from 'node:path';
import { fileURLToPath } from 'node:url';
import base from '../../tailwind.config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');

export default {
	...base,
	content: [
		path.join(repo, 'src/**/*.{js,jsx}'),
		path.join(here, 'sandbox/**/*.{js,jsx}'),
		path.join(here, 'index.html'),
	],
};
