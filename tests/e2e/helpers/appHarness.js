import { expect } from '@playwright/test';

export function uniqueToken(prefix = 'e2e') {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).slice(2, 7);
	return `${prefix}${timestamp}${random}`;
}

export async function seedLocalState(page) {
	await page.addInitScript(() => {
		try {
			window.localStorage.setItem('onboarding-dashboard', 'true');
			window.localStorage.setItem('onboarding-dialogue-editor', 'true');
			window.localStorage.setItem(
				'mountea-dialoguer-sync::local',
				JSON.stringify({
					state: { hideLoginPrompt: true },
					version: 0,
				})
			);
		} catch (_error) {
			// Best-effort seeding for deterministic tests.
		}
	});
}

export async function openDashboard(page) {
	await page.goto('/#/');
	await expect(page.getByRole('button', { name: /(create new|new project|new dialogue)/i }).first()).toBeVisible();
}

export async function createProject(page, projectName) {
	await page.getByRole('button', { name: /(create new|new project|new dialogue)/i }).first().click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await dialog.getByLabel(/project name/i).fill(projectName);
	await dialog.getByRole('button', { name: /^create$/i }).click();
	await expect(page).toHaveURL(/#\/projects\/[^/]+\/?$/);
	await expect(page.getByRole('heading', { name: projectName }).first()).toBeVisible();
}

export async function openDialoguesSection(page) {
	await page.getByRole('button', { name: /dialogues/i }).first().click();
	await expect(page.getByRole('heading', { name: /dialogues/i }).first()).toBeVisible();
}

export async function createDialogue(page, dialogueName) {
	await page.getByRole('button', { name: /(create new|new project|new dialogue)/i }).first().click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await dialog.getByLabel(/dialogue name/i).fill(dialogueName);
	await dialog.getByRole('button', { name: /^create$/i }).click();
	await expect(page).toHaveURL(/#\/projects\/[^/]+\/dialogue\/[^/]+\/?$/);
	await expect(page.locator('[data-tour="canvas"]')).toBeVisible();
}

export async function openDialogueSettings(page) {
	const url = new URL(page.url());
	const hash = url.hash || '';
	const settingsHash = hash.endsWith('/')
		? `${hash}settings`
		: `${hash}/settings`;
	await page.goto(`/${settingsHash}`);
	await expect(page).toHaveURL(/#\/projects\/[^/]+\/dialogue\/[^/]+\/settings\/?$/);
	await expect(page.getByRole('heading', { name: /dialogue settings/i }).first()).toBeVisible();
}
