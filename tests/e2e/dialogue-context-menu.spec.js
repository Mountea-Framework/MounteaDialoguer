import { test, expect } from '@playwright/test';
import { seedLocalState, uniqueToken, openDashboard, createProject, openDialoguesSection, createDialogue } from './helpers/appHarness';

async function projectWithDialogue(page, dialogueName) {
	await seedLocalState(page);
	await openDashboard(page);
	await createProject(page, uniqueToken('proj'));
	await openDialoguesSection(page);
	await createDialogue(page, dialogueName);
	const projectHash = new URL(page.url()).hash.replace(/\/dialogue\/.*$/, '');
	await page.goto(`/${projectHash}`);
	await expect(page.getByRole('heading', { name: /dialogues/i }).first()).toBeVisible();
}

// The project overview lists recent dialogues; they offer the same right-click menu as the cards in the Dialogues tab.
test('a dialogue in the project overview can be deleted from its context menu', async ({ page }) => {
	const name = uniqueToken('Dlg');
	await projectWithDialogue(page, name);
	const row = page.locator('a', { hasText: name });
	await expect(row).toBeVisible();

	await row.click({ button: 'right' });
	await expect(page.getByRole('menuitem', { name: /export/i })).toBeVisible();

	page.once('dialog', (dialog) => dialog.dismiss());
	await page.getByRole('menuitem', { name: /delete/i }).click();
	await expect(row).toBeVisible(); // cancelling the confirmation keeps it
	await page.keyboard.press('Escape');

	await row.click({ button: 'right' });
	page.once('dialog', (dialog) => dialog.accept());
	await page.getByRole('menuitem', { name: /delete/i }).click();
	await expect(row).toHaveCount(0);
});

test('the Dialogues tab keeps its context menu', async ({ page }) => {
	const name = uniqueToken('Dlg');
	await projectWithDialogue(page, name);
	await openDialoguesSection(page);
	const card = page.locator('a', { hasText: name });
	await card.click({ button: 'right' });
	await expect(page.getByRole('menuitem', { name: /export/i })).toBeVisible();
	await expect(page.getByRole('menuitem', { name: /delete/i })).toBeVisible();
});
