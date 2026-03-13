import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
	seedLocalState,
	uniqueToken,
	openDashboard,
	createProject,
	openDialoguesSection,
	createDialogue,
	openDialogueSettings,
} from './helpers/appHarness';

const screenshotsDir = path.resolve('DocumentationSource/qa/screenshots');

function ensureCleanEvidenceDirectory() {
	fs.rmSync(screenshotsDir, { recursive: true, force: true });
	fs.mkdirSync(screenshotsDir, { recursive: true });
}

function shotPath(fileName) {
	return path.join(screenshotsDir, fileName);
}

test.describe('QA Evidence Capture', () => {
	test.beforeEach(async ({ page }) => {
		await seedLocalState(page);
	});

	test('captures dashboard to settings evidence', async ({ page }) => {
		ensureCleanEvidenceDirectory();

		const projectName = uniqueToken('proj');
		const dialogueName = uniqueToken('dlg');

		await openDashboard(page);
		await page.screenshot({ path: shotPath('01-dashboard.png'), fullPage: true });

		await page.getByRole('button', { name: /(create new|new project|new dialogue)/i }).first().click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await page.screenshot({ path: shotPath('02-create-project-dialog.png'), fullPage: true });
		await page.keyboard.press('Escape');

		await createProject(page, projectName);
		await page.screenshot({ path: shotPath('03-project-overview.png'), fullPage: true });

		await openDialoguesSection(page);
		await page.screenshot({ path: shotPath('04-dialogues-section.png'), fullPage: true });

		await createDialogue(page, dialogueName);
		await expect(page.locator('[data-tour="canvas"]')).toBeVisible();
		await page.screenshot({ path: shotPath('05-dialogue-editor.png'), fullPage: true });

		await openDialogueSettings(page);
		await page.screenshot({ path: shotPath('06-dialogue-settings.png'), fullPage: true });
	});
});
