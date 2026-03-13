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

test.describe('Core Smoke Flows', () => {
	test.beforeEach(async ({ page }) => {
		await seedLocalState(page);
	});

	test('creates a project from dashboard', async ({ page }) => {
		const projectName = uniqueToken('proj');
		await openDashboard(page);
		await createProject(page, projectName);
		await expect(page.getByRole('heading', { name: projectName }).first()).toBeVisible();
	});

	test('creates a dialogue and opens graph editor', async ({ page }) => {
		const projectName = uniqueToken('proj');
		const dialogueName = uniqueToken('dlg');
		await openDashboard(page);
		await createProject(page, projectName);
		await openDialoguesSection(page);
		await createDialogue(page, dialogueName);
		await expect(page.locator('[data-tour="node-toolbar"]')).toBeVisible();
	});

	test('opens dialogue settings and validates locale selector', async ({ page }) => {
		const projectName = uniqueToken('proj');
		const dialogueName = uniqueToken('dlg');
		await openDashboard(page);
		await createProject(page, projectName);
		await openDialoguesSection(page);
		await createDialogue(page, dialogueName);
		await openDialogueSettings(page);
		const localeSelector = page.locator('#settings-content-locale');
		await expect(localeSelector).toBeVisible();
		await expect(localeSelector).toHaveValue(/en/i);
	});
});
