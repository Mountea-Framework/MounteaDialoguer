import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seedLocalState, openDashboard, createProject, openDialoguesSection, createDialogue } from './helpers/appHarness';

test('graph keyboard actions expose names and preserve editing shortcuts', async ({ page }) => {
	await seedLocalState(page); await openDashboard(page); await createProject(page, 'KeyboardProject'); await openDialoguesSection(page); await createDialogue(page, 'KeyboardDialogue');
	await expect(page.getByRole('button', { name: 'Recenter graph', exact: true })).toBeVisible();
	const add = page.locator('[data-tour="node-toolbar"]').getByRole('button', { name: 'Delay', exact: true });
	await add.focus(); await page.keyboard.press('Enter');
	await expect(page.locator('.react-flow__node-delayNode')).toHaveCount(1);
	await page.keyboard.press('Control+z'); await expect(page.locator('.react-flow__node-delayNode')).toHaveCount(0);
	await page.keyboard.press('Control+y'); await expect(page.locator('.react-flow__node-delayNode')).toHaveCount(1);
	await page.keyboard.press('Control+s');
	const scan = await new AxeBuilder({ page }).include('[data-tour="canvas"]').include('[data-tour="node-toolbar"]').withTags(['wcag2a', 'wcag2aa']).analyze();
	expect(scan.violations).toEqual([]);
});

test('mobile graph keyboard flow opens a named node drawer, returns focus and creates a node', async ({ page }) => {
	await seedLocalState(page); await openDashboard(page); await createProject(page, 'MobileProject'); await openDialoguesSection(page); await createDialogue(page, 'MobileDialogue');
	await page.setViewportSize({ width: 390, height: 844 });
	await page.evaluate(() => window.postMessage({ type: 'mountea:device', value: 'mobile' }, location.origin));
	const add = page.getByRole('button', { name: 'Add Node', exact: true });
	await expect(add).toBeVisible(); await add.focus(); await page.keyboard.press('Enter');
	const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
	await expect(dialog).toHaveAccessibleName('Select node type');
	const scan = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa']).analyze();
	expect(scan.violations).toEqual([]);
	await dialog.getByRole('button', { name: 'Cancel', exact: true }).focus(); await page.keyboard.press('Enter');
	await expect(dialog).not.toBeVisible(); await expect(add).toBeFocused();
	await page.keyboard.press('Enter'); await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: /^Delay/ }).focus(); await page.keyboard.press('Enter');
	await expect(dialog).not.toBeVisible(); await expect(page.locator('.react-flow__node-delayNode')).toHaveCount(1);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('production creates the bundled onboarding project with external network blocked', async ({ page }) => {
	await seedLocalState(page);
	await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => route.abort());
	await openDashboard(page);
	await page.locator('[data-tour="example-project"]').click();
	await expect(page).toHaveURL(/#\/projects\/[^/]+\/?$/);
	await expect(page.getByRole('heading', { name: 'OnboardingExample', exact: true }).first()).toBeVisible();
	await openDialoguesSection(page);
	await expect(page.getByText('MerchantBranchingExample', { exact: true }).first()).toBeVisible();
});


