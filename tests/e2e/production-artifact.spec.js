import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { verifyArtifact } from '../../scripts/release-artifact.mjs';
import { seedLocalState, openDashboard } from './helpers/appHarness';

test('production serves the fingerprinted release and bundled offline template without development modules', async ({ page, request }) => {
	const inventory = await verifyArtifact('dist', { requireValidated: false });
	const requested = [];
	page.on('request', (entry) => requested.push(entry.url()));
	await seedLocalState(page);
	await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => route.abort());
	await openDashboard(page);
	const response = await request.get('/release.json');
	expect((await response.json()).release).toBe(inventory.release);
	const template = await request.get('/onboarding-example.mnteadlgproj');
	expect(template.ok()).toBeTruthy();
	expect(await template.body()).toEqual(await fs.readFile('ExampleProject/OnboardingExample.mnteadlgproj'));
	expect(requested.some((url) => /\/@vite|\/@react-refresh|\/src\//.test(url))).toBe(false);
	for (const name of Object.keys(inventory.files).filter((name) => name.endsWith('.js'))) expect(await fs.readFile(`dist/${name}`, 'utf8')).not.toMatch(/sourceMappingURL=/);
});
