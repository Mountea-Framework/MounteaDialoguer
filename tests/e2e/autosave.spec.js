import { test, expect } from '@playwright/test';
import { seedLocalState, openDashboard, createProject, uniqueToken } from './helpers/appHarness.js';

// Runs against the production server:  node server/index.mjs  (PLAYWRIGHT_BASE_URL=http://127.0.0.1:8088)
test.skip(!process.env.PLAYWRIGHT_BASE_URL, 'needs the production server (PLAYWRIGHT_BASE_URL)');

async function revisionNames(request, baseURL) {
	const res = await request.get(`${baseURL}/api/sync/files?prefix=mountea-revision-v2--`);
	const { files } = await res.json();
	const names = [];
	for (const file of files) {
		const text = await (await request.get(`${baseURL}/api/sync/files/${encodeURIComponent(file.id)}`)).text();
		const revision = JSON.parse(text).revision;
		if (revision?.snapshot?.project?.name) names.push(revision.snapshot.project.name);
	}
	return names;
}

test('a new project is autosaved to the server and restored in a fresh browser', async ({ browser, baseURL }) => {
	const name = uniqueToken('Autosave');

	const first = await browser.newContext();
	const page = await first.newPage();
	await seedLocalState(page);
	await openDashboard(page);
	await createProject(page, name);

	await expect
		.poll(async () => (await revisionNames(page.request, baseURL)).includes(name), { timeout: 20000 })
		.toBe(true);
	await first.close();

	// A brand new browser profile has no local data. It must get the project from the server.
	const second = await browser.newContext();
	const page2 = await second.newPage();
	await seedLocalState(page2);
	await page2.goto('/#/');
	await expect(page2.getByText(name).locator('visible=true').first()).toBeVisible({ timeout: 30000 });
	await second.close();
});

for (const trigger of ['online', 'timer']) test(`startup outage recovers through ${trigger} and uploads local edits`, async ({ browser, baseURL }) => {
	const first = await browser.newContext({ baseURL });
	try {
		const page = await first.newPage(); await seedLocalState(page);
		await page.route('**/api/health', (route) => route.fulfill({ status: 503, body: '{}' }));
		await page.route('**/api/sync/**', (route) => route.fulfill({ status: 503, body: '{}' }));
		await openDashboard(page);
		const name = uniqueToken('Recovery'); await createProject(page, name);
		await page.clock.install();
		await page.unroute('**/api/health'); await page.unroute('**/api/sync/**');
		if (trigger === 'online') await page.evaluate(() => window.dispatchEvent(new Event('online')));
		else await page.clock.runFor(35000);
		await expect.poll(async () => (await revisionNames(page.request, baseURL)).includes(name), { timeout: 15000 }).toBe(true);
		const second = await browser.newContext({ baseURL });
		try { const fresh = await second.newPage(); await seedLocalState(fresh); await fresh.goto('/#/'); await expect(fresh.getByText(name).locator('visible=true').first()).toBeVisible({ timeout: 30000 }); }
		finally { await second.close(); }
	} finally { await first.close(); }
});
