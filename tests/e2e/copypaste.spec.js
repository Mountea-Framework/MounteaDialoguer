import { test, expect } from '@playwright/test';
import { seedLocalState, uniqueToken, openDashboard, createProject, openDialoguesSection, createDialogue, seedGraph, textRow } from './helpers/appHarness';

test('nodes can be copied and pasted with the keyboard', async ({ page }) => {
	await seedLocalState(page);
	await openDashboard(page);
	await createProject(page, uniqueToken('proj'));
	await openDialoguesSection(page);
	await createDialogue(page, uniqueToken('dlg'));

	const toolbar = page.locator('[data-tour="node-toolbar"]');
	await toolbar.locator('button.cursor-move').first().click();

	const nodes = page.locator('.react-flow__node-leadNode');
	await expect(nodes).toHaveCount(1);
	await page.getByRole('button', { name: /^recenter graph$/i }).click();
	await nodes.first().click();

	await page.keyboard.press('Control+c');
	await page.keyboard.press('Control+v');
	await expect(nodes).toHaveCount(2);

	await page.keyboard.press('Control+v');
	await expect(nodes).toHaveCount(3);

	// Duplicate (Ctrl+D) the selected node.
	await page.keyboard.press('Control+d');
	await expect(nodes).toHaveCount(4);
	await expect(page.getByText('Pasted with changes', { exact: true })).toHaveCount(0);

	// Saving must not hit a localization key collision.
	await page.keyboard.press('Control+s');
	await page.waitForTimeout(1500);
	await expect(page.getByText(/Failed to Save/i)).toHaveCount(0);
	await page.reload();
	await expect(page.locator('.react-flow__node-leadNode')).toHaveCount(4);
});

test('cross-project keyboard paste gives one notice, clears row speakers and supports undo/redo', async ({ page }) => {
	await seedLocalState(page); await openDashboard(page);
	await createProject(page, uniqueToken('Source')); await openDialoguesSection(page); await createDialogue(page, uniqueToken('Scene'));
	await seedGraph(page, { nodes: [{ id: 'speaker', type: 'leadNode', data: { dialogueRows: [{ ...textRow('r', 'Clipboard line'), participant: 'Tester' }] } }], edges: [['start', 'speaker']] });
	await page.locator('.react-flow__node[data-id="speaker"]').click();
	await page.keyboard.press('Control+c');
	await page.keyboard.press('Escape');
	const target = await page.evaluate(async () => {
		const { useProjectStore } = await import('/src/stores/projectStore.js');
		const { useDialogueStore } = await import('/src/stores/dialogueStore.js');
		const p = await useProjectStore.getState().createProject({ name: 'PasteDestination' });
		const d = await useDialogueStore.getState().createDialogue({ projectId: p.id, name: 'Target' });
		window.location.hash = `/projects/${p.id}/dialogue/${d.id}`;
		return { projectId: p.id, dialogueId: d.id };
	});
	await expect(page).toHaveURL(new RegExp(target.dialogueId));
	await expect(page.locator('.react-flow__node-leadNode')).toHaveCount(0);
	await expect(page.getByText(/preparing dialogue graph/i)).toHaveCount(0);
	await page.locator('.react-flow__pane').click({ position: { x: 25, y: 25 } });
	await page.keyboard.press('Control+v');
	await expect(page.locator('.react-flow__node-leadNode')).toHaveCount(1);
	await expect(page.getByText('Pasted with changes', { exact: true })).toHaveCount(1);
	await page.keyboard.press('Escape');
	await page.keyboard.press('Control+z'); await expect(page.locator('.react-flow__node-leadNode')).toHaveCount(0);
	await page.keyboard.press('Control+y'); await expect(page.locator('.react-flow__node-leadNode')).toHaveCount(1);
	await page.keyboard.press('Control+s');
	await expect.poll(async () => page.evaluate(async ({ projectId, dialogueId }) => {
		const { readProjectState } = await import('/src/lib/persistence/projectRepository.js');
		const { snapshot } = await readProjectState(projectId);
		const node = snapshot.nodes.find((n) => n.dialogueId === dialogueId && n.type === 'leadNode');
		return node ? { participant: node.data.participant, participantId: node.data.participantId, rowParticipant: node.data.dialogueRows[0].participant, rowParticipantId: node.data.dialogueRows[0].participantId } : null;
	}, target)).toEqual({ participant: '', participantId: undefined, rowParticipant: '', rowParticipantId: undefined });
	await page.reload(); await expect(page.locator('.react-flow__node-leadNode')).toHaveCount(1);
});
