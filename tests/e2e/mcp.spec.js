import { test, expect } from '@playwright/test';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import { seedLocalState, uniqueToken, openDialogueSettings } from './helpers/appHarness';
import { mcpEnabled, mcpTool, buildSampleProject } from './helpers/mcpClient';

// Runs against the production server and the MCP server sharing one DATA_DIR:
//   PORT=8088 DATA_DIR=/tmp/td node server/index.mjs
//   MCP_PORT=8089 MCP_TOKEN=... DATA_DIR=/tmp/td node --import ./mcp/register.mjs mcp/server.mjs
//   MCP_URL=http://127.0.0.1:8089 MCP_TOKEN=... PLAYWRIGHT_BASE_URL=http://127.0.0.1:8088 npx playwright test mcp
test.skip(!mcpEnabled, 'MCP_URL and MCP_TOKEN not set');

const previewLine = (page, text) => page.locator('p.whitespace-pre-wrap', { hasText: text });

async function openDialogue(page, { projectId, dialogueId }) {
	await seedLocalState(page);
	await page.goto(`/#/projects/${projectId}/dialogue/${dialogueId}`);
	await expect(page.locator('[data-tour="canvas"]')).toBeVisible({ timeout: 30000 });
	await expect(page.locator('.react-flow__node').first()).toBeVisible();
	await expect(page.getByText(/preparing dialogue graph/i)).toHaveCount(0, { timeout: 15000 });
}

test('a dialogue built through MCP opens, previews and exports in the app', async ({ page }) => {
	const sample = await buildSampleProject(uniqueToken('a'));
	await openDialogue(page, sample);

	await expect(page.locator('.react-flow__node')).toHaveCount(5);
	await expect(page.locator('.react-flow__edge')).toHaveCount(4);

	await page.getByRole('button', { name: /^preview$/i }).first().click();
	await expect(previewLine(page, 'Well met, traveller.')).toBeVisible();
	await page.keyboard.press('Escape');

	await openDialogueSettings(page);
	const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /export dialogue/i }).click()]);
	const zip = await JSZip.loadAsync(await readFile(await download.path()));
	const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
	expect(manifest.format).toBe('mountea.archive.v3');
	const readJson = async (archive, path) => JSON.parse(await archive.file(path).async('string'));
	const strings = [];
	for (const record of manifest.records.filter((entry) => entry.table === 'localizedStrings')) strings.push(await readJson(zip, record.path));
	const valuesOf = (field) => strings.filter((entry) => entry.field === field).map((entry) => entry.values.en);
	expect(valuesOf('selectionTitle')).toEqual(expect.arrayContaining(['Ask about the curse', 'Say goodbye']));
	expect(valuesOf('displayName')).toEqual(expect.arrayContaining(['Hello', 'AskCurse', 'Leave']));

	// The MCP export must match the UI export record for record.
	const viaMcp = await mcpTool('export_dialogue', { projectId: sample.projectId, dialogueId: sample.dialogueId, inline: true });
	const mcpZip = await JSZip.loadAsync(Buffer.from(viaMcp.base64, 'base64'));
	const mcpManifest = await readJson(mcpZip, 'manifest.json');
	expect(mcpManifest.records).toEqual(manifest.records);
	for (const { path } of manifest.records) expect(await readJson(mcpZip, path), path).toEqual(await readJson(zip, path));
	expect(await readJson(mcpZip, 'project.json')).toEqual(await readJson(zip, 'project.json'));
});

const syncNow = (page) => page.evaluate(() => window.dispatchEvent(new Event('online')));
const addedByClaude = (sample) =>
	mcpTool('add_node', { projectId: sample.projectId, dialogueId: sample.dialogueId, type: 'leadNode', displayName: 'AddedByClaude', participant: 'Bob', rows: ['Hello from MCP'] });

test('competing saves are kept as a conflict, never silently overwritten', async ({ page }) => {
	const sample = await buildSampleProject(uniqueToken('d'));
	await openDialogue(page, sample);

	// Save locally, then MCP writes before the tab has synced.
	await page.locator('[data-tour="node-toolbar"] button.cursor-move').first().click();
	await expect(page.locator('.react-flow__node')).toHaveCount(6);
	await page.keyboard.press('Control+s');
	await addedByClaude(sample);
	await syncNow(page);

	await expect(page.getByRole('complementary', { name: /synchronization conflicts/i })).toBeVisible({ timeout: 40000 });
	// MCP's version is still the server's view of the project, intact.
	const g = await mcpTool('get_dialogue', { projectId: sample.projectId, dialogueId: sample.dialogueId }).catch((error) => ({ error: error.message }));
	expect(JSON.stringify(g)).toMatch(/divergent|AddedByClaude/);
});

test('REST project deletion syncs to a fresh browser and preserves historical files', async ({ browser, baseURL, request }) => {
	const sample = await buildSampleProject(uniqueToken('Deleted'));
	const before = await (await request.get(`${baseURL}/api/sync/files?prefix=mountea-revision-v2--`)).json();
	const deleted = await fetch(`${process.env.MCP_URL}/api/v1/projects/${sample.projectId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${process.env.MCP_TOKEN}` } });
	expect(deleted.status).toBe(200);
	await expect(mcpTool('get_project', { projectId: sample.projectId })).rejects.toThrow(/deleted/);
	const after = await (await request.get(`${baseURL}/api/sync/files?prefix=mountea-revision-v2--`)).json();
	expect(after.files.length).toBeGreaterThan(before.files.length);
	for (const file of before.files) expect((await request.get(`${baseURL}/api/sync/files/${file.id}`)).status()).toBe(200);
	const context = await browser.newContext({ baseURL });
	try {
		const fresh = await context.newPage(); await seedLocalState(fresh); await fresh.goto('/#/');
		await expect(fresh.getByRole('button', { name: /(create new|new project)/i }).first()).toBeVisible();
		await expect(fresh.getByText(sample.name, { exact: true })).toHaveCount(0);
	} finally { await context.close(); }
});
