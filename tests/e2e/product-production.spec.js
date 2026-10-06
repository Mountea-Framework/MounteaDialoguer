import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seedLocalState, openDashboard, createProject, openDialoguesSection, createDialogue } from './helpers/appHarness';

test('graph keyboard actions expose names and preserve editing shortcuts', async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('mountea-dialoguer-theme', 'light'));
	await seedLocalState(page); await openDashboard(page); await createProject(page, 'KeyboardProject'); await openDialoguesSection(page); await createDialogue(page, 'KeyboardDialogue');
	await expect(page.getByRole('button', { name: 'Recenter graph', exact: true })).toBeVisible();
	const add = page.locator('[data-tour="node-toolbar"]').getByRole('button', { name: 'Delay', exact: true });
	await add.focus(); await page.keyboard.press('Enter');
	await expect(page.locator('.react-flow__node-delayNode')).toHaveCount(1);
	await page.keyboard.press('Control+z'); await expect(page.locator('.react-flow__node-delayNode')).toHaveCount(0);
	await page.keyboard.press('Control+y'); await expect(page.locator('.react-flow__node-delayNode')).toHaveCount(1);
	await page.keyboard.press('Control+s');
	// Let celebration canvases finish so axe can determine the actual background.
	await expect(page.locator('body > canvas')).toHaveCount(0);
	const scan = await new AxeBuilder({ page }).include('[data-tour="canvas"]').include('[data-tour="node-toolbar"]').withTags(['wcag2a', 'wcag2aa']).analyze();
	expect(scan.violations).toEqual([]);
});

for (const theme of ['light', 'dark']) {
	test(`graph attribution has accessible contrast in ${theme} normal, hover and keyboard focus states`, async ({ page }) => {
		await page.addInitScript((value) => localStorage.setItem('mountea-dialoguer-theme', value), theme);
		await seedLocalState(page); await openDashboard(page); await createProject(page, 'AttributionProject'); await openDialoguesSection(page); await createDialogue(page, 'AttributionDialogue');
		await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
		const selector = '[data-tour="node-toolbar"] a[href="https://reactflow.dev"]';
		const attribution = page.locator(selector);
		await expect(attribution).toBeVisible();
		await expect(attribution).toHaveAccessibleName('React Flow');
		// Confetti overlays make axe report contrast as incomplete instead of testing it.
		await expect(page.locator('body > canvas')).toHaveCount(0);
		for (const state of ['normal', 'hover', 'focus']) {
			await test.step(state, async () => {
				if (state === 'hover') await attribution.hover();
				if (state === 'focus') {
					await page.mouse.move(0, 0);
					await attribution.focus();
					await page.keyboard.press('Shift+Tab');
					await page.keyboard.press('Tab');
					await expect(attribution).toBeFocused();
					await expect(attribution).toHaveCSS('outline-style', 'solid');
				}
				if (state !== 'normal') await expect(attribution).toHaveCSS('text-decoration-line', 'underline');
				const scan = await new AxeBuilder({ page }).include(selector).withRules(['color-contrast']).analyze();
				expect(scan.violations).toEqual([]);
				// Measure the rendered colors too: axe may mark transparent overlays as incomplete.
				const contrast = await attribution.evaluate((link) => {
					const luminance = (color) => {
						const [red, green, blue] = color.match(/[0-9.]+/g).slice(0, 3).map(Number).map((value) => {
							const channel = value / 255;
							return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
						});
						return red * 0.2126 + green * 0.7152 + blue * 0.0722;
					};
					const foreground = luminance(getComputedStyle(link).color);
					const background = luminance(getComputedStyle(link.closest('[data-tour="node-toolbar"]')).backgroundColor);
					return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
				});
				expect(contrast).toBeGreaterThanOrEqual(4.5);
			});
		}
	});
}

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


