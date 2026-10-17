import { test, expect } from '@playwright/test';
import { seedLocalState, uniqueToken, openDashboard, createProject, openDialoguesSection, createDialogue } from './helpers/appHarness';

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
	await nodes.first().click();

	await page.keyboard.press('Control+c');
	await page.keyboard.press('Control+v');
	await expect(nodes).toHaveCount(2);

	await page.keyboard.press('Control+v');
	await expect(nodes).toHaveCount(3);

	// Duplicate (Ctrl+D) the selected node.
	await page.keyboard.press('Control+d');
	await expect(nodes).toHaveCount(4);

	// Saving must not hit a localization key collision.
	await page.keyboard.press('Control+s');
	await page.waitForTimeout(1500);
	await expect(page.getByText(/Failed to Save/i)).toHaveCount(0);
	await page.reload();
	await expect(page.locator('.react-flow__node-leadNode')).toHaveCount(4);
});
