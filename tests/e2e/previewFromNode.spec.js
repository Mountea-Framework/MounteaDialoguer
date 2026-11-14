import { test, expect } from '@playwright/test';
import {
	seedLocalState,
	uniqueToken,
	openDashboard,
	createProject,
	openDialoguesSection,
	createDialogue,
	seedGraph,
	textRow,
} from './helpers/appHarness';

// The preview line is the only whitespace-pre-wrap paragraph; the canvas nodes show the same text too.
const previewLine = (page, text) => page.locator('p.whitespace-pre-wrap', { hasText: text });

async function openGraph(page) {
	await seedLocalState(page);
	await openDashboard(page);
	await createProject(page, uniqueToken('proj'));
	await openDialoguesSection(page);
	await createDialogue(page, uniqueToken('dlg'));
	await seedGraph(page, {
		nodes: [
			{ id: 'npc-one', type: 'leadNode', data: { dialogueRows: [textRow('r1', 'ALPHA first line')] } },
			{ id: 'npc-two', type: 'leadNode', data: { dialogueRows: [textRow('r2', 'BRAVO second line')] } },
		],
		edges: [
			['start', 'npc-one'],
			['npc-one', 'npc-two'],
		],
	});
	await expect(page.locator('.react-flow__node-leadNode')).toHaveCount(2);
}

test('node context menu offers "Preview from here"', async ({ page }) => {
	await openGraph(page);
	await page.locator('.react-flow__node[data-id="npc-two"]').click({ button: 'right' });
	await expect(page.getByRole('menuitem', { name: /preview from here/i })).toBeVisible();
});

test('"Preview from here" starts the preview at the chosen node', async ({ page }) => {
	await openGraph(page);
	await page.locator('.react-flow__node[data-id="npc-two"]').click({ button: 'right' });
	await page.getByRole('menuitem', { name: /preview from here/i }).click();

	await expect(previewLine(page, 'BRAVO second line')).toBeVisible();
	await expect(previewLine(page, 'ALPHA first line')).toHaveCount(0);
});

test('regular Preview starts at the first node after Start', async ({ page }) => {
	await openGraph(page);
	await page.getByRole('button', { name: /^preview$/i }).first().click();
	await expect(previewLine(page, 'ALPHA first line')).toBeVisible();
});
