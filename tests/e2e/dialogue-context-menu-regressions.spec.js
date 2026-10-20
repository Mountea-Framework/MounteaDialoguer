import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { seedLocalState, uniqueToken, openDashboard, createProject, openDialoguesSection, createDialogue, seedGraph } from './helpers/appHarness';

async function fixture(page, location = 'overview') {
	const name = uniqueToken('Dialogue');
	await seedLocalState(page);
	await openDashboard(page);
	await createProject(page, uniqueToken('Project'));
	await openDialoguesSection(page);
	await createDialogue(page, name);
	await seedGraph(page, {
		nodes: [
			{ id: 'line', type: 'leadNode', data: { displayName: 'Greeting', dialogueRows: [{ id: 'row', text: 'Hello from the target', duration: 5 }] } },
			{ id: 'end', type: 'completeNode', data: { displayName: 'Done' } },
		], edges: [['start', 'line'], ['line', 'end']],
	});
	const ids = await page.evaluate(async () => {
		const [, projectId, dialogueId] = window.location.hash.match(/projects\/([^/]+)\/dialogue\/([^/?]+)/);
		const { useDialogueStore } = await import('/src/stores/dialogueStore.js');
		const other = await useDialogueStore.getState().createDialogue({ projectId, name: 'Other dialogue' });
		await useDialogueStore.getState().saveDialogueGraph(other.id, [
			{ id: '00000000-0000-0000-0000-000000000001', type: 'startNode', position: { x: 0, y: 0 }, data: { displayName: 'Start' } },
			{ id: 'other-end', type: 'completeNode', position: { x: 300, y: 0 }, data: { displayName: 'Other end' } },
		], [{ id: 'other-edge', source: '00000000-0000-0000-0000-000000000001', target: 'other-end', type: 'conditionEdge', data: { conditions: { mode: 'all', rules: [] } } }], { x: 0, y: 0, zoom: 1 }, {});
		return { projectId, dialogueId, otherId: other.id };
	});
	await page.goto(`/#/projects/${ids.projectId}`);
	if (location === 'cards') await openDialoguesSection(page);
	const target = page.locator('a', { hasText: name });
	const other = page.locator('a', { hasText: 'Other dialogue' });
	await expect(target).toBeVisible();
	await expect(other).toBeVisible();
	await page.evaluate(async () => (await import('/src/components/ui/toaster.jsx')).clearToasts());
	return { ...ids, name, target, other };
}

async function openMenu(page, target) {
	await target.click({ button: 'right' });
	await expect(page.getByRole('menu')).toBeVisible();
}

async function assertArchive(bytes, state) {
	const zip = await JSZip.loadAsync(bytes);
	const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
	expect(manifest.kind).toBe('dialogue');
	expect(manifest.dialogueId).toBe(state.dialogueId);
	const records = {};
	for (const item of manifest.records) (records[item.table] ||= []).push(JSON.parse(await zip.file(item.path).async('string')));
	expect(records.dialogues.map(d => [d.id, d.name])).toEqual([[state.dialogueId, state.name]]);
	expect(records.nodes.map(n => n.id).sort()).toEqual(['00000000-0000-0000-0000-000000000001', 'end', 'line'].sort());
	expect(records.edges).toHaveLength(2);
	expect(records.localizedStrings.some(s => Object.values(s.values).includes('Hello from the target'))).toBe(true);
}

async function downloadDialogue(page, state, select) {
	await openMenu(page, state.target);
	const downloaded = page.waitForEvent('download', { timeout: 15000 });
	await select();
	const download = await downloaded;
	expect(download.suggestedFilename()).toBe(`${state.name}.mnteadlg`);
	await assertArchive(await readFile(await download.path()), state);
	await expect(page.getByRole('menu')).toHaveCount(0);
}

async function recordState(page, id) {
	return page.evaluate(async id => {
		const { db } = await import('/src/lib/db.js');
		return (await db.dialogues.get(id)) || null;
	}, id);
}

// Install only the save bridge after normal startup; authentication/profile setup stays real.
async function saveBridge(page, mode) {
	await page.evaluate(mode => {
		window.__saveCalls = [];
		window.__saveMode = mode;
		window.electronAPI = { isElectron: true, saveFileDialog: async request => {
			window.__saveCalls.push(request);
			if (window.__saveMode === 'reject') throw new Error('Save dialog failed');
			if (window.__saveMode === 'defer') return new Promise(resolve => { window.__finishSave = resolve; });
			return window.__saveMode === 'cancel' ? { canceled: true } : { canceled: false, filePath: '/exports/target.mnteadlg' };
		} };
	}, mode);
}

async function exportWithBridge(page, state, mode) {
	await saveBridge(page, mode);
	await openMenu(page, state.target);
	await page.getByRole('menuitem', { name: /export/i }).click();
	await expect.poll(() => page.evaluate(() => window.__saveCalls.length)).toBe(1);
	await expect(page.getByRole('menu')).toHaveCount(0);
}

for (const location of ['overview', 'cards']) {
	test.describe(location, () => {
		test('menu opens without navigation, Escape restores focus, and export downloads only the target', async ({ page }) => {
			const state = await fixture(page, location);
			const url = page.url();
			await openMenu(page, state.target);
			expect(page.url()).toBe(url);
			await page.keyboard.press('Escape');
			await expect(page.getByRole('menu')).toHaveCount(0);
			await expect(state.target).toBeFocused();
			await downloadDialogue(page, state, () => page.getByRole('menuitem', { name: /export/i }).click());
			expect(page.url()).toBe(url);
			await expect(state.other).toBeVisible();
		});

		test('cancelled deletion closes the menu; confirmed deletion persists and preserves the other dialogue', async ({ page }) => {
			const state = await fixture(page, location);
			await openMenu(page, state.target);
			page.once('dialog', dialog => dialog.dismiss());
			await page.getByRole('menuitem', { name: /delete/i }).click();
			await expect(page.getByRole('menu')).toHaveCount(0);
			await expect(state.target).toBeVisible();
			await openMenu(page, state.target);
			page.once('dialog', dialog => dialog.accept());
			await page.getByRole('menuitem', { name: /delete/i }).click();
			await expect(state.target).toHaveCount(0);
			await page.reload();
			if (location === 'cards') await openDialoguesSection(page);
			await expect(state.other).toBeVisible();
			await expect(state.target).toHaveCount(0);
			expect(await recordState(page, state.dialogueId)).toBeNull();
			expect(await recordState(page, state.otherId)).not.toBeNull();
		});

		test('a child-graph reference prevents deletion and shows an error', async ({ page }) => {
			const state = await fixture(page, location);
			await page.evaluate(async ({ otherId, dialogueId }) => {
				const { db } = await import('/src/lib/db.js');
				await db.nodes.put({ id: 'call', dialogueId: otherId, type: 'childNode', data: { targetDialogue: dialogueId } });
			}, { otherId: state.otherId, dialogueId: state.dialogueId });
			await openMenu(page, state.target);
			page.once('dialog', dialog => dialog.accept());
			await page.getByRole('menuitem', { name: /delete/i }).click();
			await expect(page.getByRole('menu')).toHaveCount(0);
			await expect(page.getByText('Could not update item', { exact: true })).toBeVisible();
			await expect(state.target).toBeVisible();
			expect(await recordState(page, state.dialogueId)).not.toBeNull();
		});
	});
}

test('deletion confirmation uses every app locale and interpolates the dialogue name', async ({ page }) => {
	const state = await fixture(page);
	const locales = await page.evaluate(async () => (await import('/src/lib/localization/appLanguages.js')).APP_LANGUAGE_CODES);
	for (const locale of locales) {
		const translations = JSON.parse(await readFile(new URL(`../../src/i18n/locales/${locale}.json`, import.meta.url), 'utf8'));
		const template = translations.dialogues.deleteConfirm;
		expect(template).toContain('{{name}}');
		await page.evaluate(async locale => {
			const { default: i18n } = await import('/src/i18n/index.js');
			await i18n.changeLanguage(locale);
		}, locale);
		await openMenu(page, state.target);
		const confirmation = page.waitForEvent('dialog');
		const clicked = page.getByRole('menuitem').last().click();
		const dialog = await confirmation;
		const message = dialog.message();
		await dialog.dismiss();
		await clicked;
		expect(message).toBe(template.replace('{{name}}', state.name));
		await expect(page.getByRole('menu')).toHaveCount(0);
		await expect(state.target).toBeVisible();
	}
});

test('scoped shortcuts export with Ctrl or Cmd, suppress project shortcuts, and Delete confirms', async ({ page }) => {
	const state = await fixture(page);
	const downloads = [];
	page.on('download', download => downloads.push(download.suggestedFilename()));
	await openMenu(page, state.target);
	for (const modifier of ['Control', 'Meta']) for (const key of ['e', 'i', 'n']) await page.keyboard.press(`${modifier}+${key}`);
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page.getByRole('menu')).toBeVisible();
	expect(downloads).toEqual([]);
	await page.keyboard.press('Escape');
	for (const modifier of ['Control', 'Meta']) await page.keyboard.press(`${modifier}+Alt+e`);
	expect(downloads).toEqual([]);
	for (const modifier of ['Control', 'Meta']) await downloadDialogue(page, state, () => page.keyboard.press(`${modifier}+Alt+e`));
	await openMenu(page, state.target);
	page.once('dialog', dialog => dialog.dismiss());
	await page.keyboard.press('Delete');
	await expect(page.getByRole('menu')).toHaveCount(0);
	await expect(state.target).toBeVisible();
	const downloaded = page.waitForEvent('download');
	await page.keyboard.press('Control+e');
	expect((await downloaded).suggestedFilename()).toMatch(/\.mnteadlgproj$/);
});

test('keyboard opening, arrow navigation, Enter and shortcut labels follow the platform', async ({ page }) => {
	const state = await fixture(page);
	await state.target.focus();
	await page.keyboard.press('Shift+F10');
	await expect(page.getByRole('menu')).toBeVisible();
	await page.keyboard.press('ArrowDown');
	await expect(page.getByRole('menuitem', { name: /export/i })).toBeFocused();
	const downloaded = page.waitForEvent('download', { timeout: 15000 });
	await page.keyboard.press('Enter');
	await assertArchive(await readFile(await (await downloaded).path()), state);
	await expect(page.getByRole('menu')).toHaveCount(0);
	await expect(state.target).toBeFocused();
	// Mock identity only for label assertions, not the storage/download libraries.
	await page.evaluate(() => {
		Object.defineProperty(navigator, 'platform', { configurable: true, value: 'MacIntel' });
		Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' });
	});
	await state.target.press('ContextMenu');
	await expect(page.getByRole('menuitem', { name: /Cmd\+Alt\+E/ })).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('menu')).toHaveCount(0);
	await expect(state.target).toBeFocused();
	await page.evaluate(() => {
		Object.defineProperty(navigator, 'platform', { configurable: true, value: 'Win32' });
		Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });
	});
	await state.target.press('ContextMenu');
	await expect(page.getByRole('menuitem', { name: /Ctrl\+Alt\+E/ })).toBeVisible();
});

test('pending export ignores repeats and duplicate actions, then cancellation releases the guard', async ({ page }) => {
	const state = await fixture(page);
	await saveBridge(page, 'defer');
	await openMenu(page, state.target);
	await page.getByRole('menu').evaluate(menu => {
		const input = document.createElement('input');
		input.setAttribute('aria-label', 'Editable menu field');
		menu.append(input);
		input.focus();
	});
	await page.getByRole('textbox', { name: 'Editable menu field' }).press('Control+Alt+e');
	expect(await page.evaluate(() => window.__saveCalls.length)).toBe(0);
	await page.getByRole('textbox', { name: 'Editable menu field' }).evaluate(input => input.remove());
	await page.getByRole('menu').focus();
	await page.getByRole('menu').dispatchEvent('keydown', { key: 'e', ctrlKey: true, altKey: true, repeat: true });
	await expect(page.getByRole('menu')).toBeVisible();
	expect(await page.evaluate(() => window.__saveCalls.length)).toBe(0);
	await page.getByRole('menu').dispatchEvent('keydown', { key: 'Dead', code: 'KeyE', ctrlKey: true, altKey: true });
	await expect.poll(() => page.evaluate(() => window.__saveCalls.length)).toBe(1);
	await openMenu(page, state.target);
	await expect(page.getByRole('menuitem', { name: /export/i })).toBeDisabled();
	await page.keyboard.press('Control+Alt+e');
	await page.keyboard.press('Delete');
	expect(await page.evaluate(() => window.__saveCalls.length)).toBe(1);
	await page.evaluate(() => window.__finishSave({ canceled: true }));
	await expect(page.getByRole('menuitem', { name: /export/i })).toBeEnabled();
	await page.keyboard.press('Escape');
	await exportWithBridge(page, state, 'cancel');
});

test('Electron save success receives the archive and records its path', async ({ page }) => {
	const state = await fixture(page);
	await exportWithBridge(page, state, 'success');
	const request = await page.evaluate(() => window.__saveCalls[0]);
	expect(request.defaultFileName).toBe(`${state.name}.mnteadlg`);
	expect(request.filters).toEqual([{ name: 'Dialogue Export', extensions: ['mnteadlg'] }]);
	await assertArchive(Buffer.from(request.fileBase64, 'base64'), state);
	await expect.poll(async () => (await recordState(page, state.dialogueId)).lastExportPath).toBe('/exports/target.mnteadlg');
	await expect(page.getByText('Dialogue Exported', { exact: true })).toBeVisible();
	expect((await recordState(page, state.otherId)).lastExportPath).toBeUndefined();
});

test('Electron save cancellation leaves paths unchanged and produces no download or success', async ({ page }) => {
	const state = await fixture(page);
	const downloads = [];
	page.on('download', download => downloads.push(download));
	await page.evaluate(async id => {
		const { db } = await import('/src/lib/db.js');
		await db.dialogues.update(id, { lastExportPath: '/exports/previous.mnteadlg' });
	}, state.dialogueId);
	await exportWithBridge(page, state, 'cancel');
	await openMenu(page, state.target);
	await expect(page.getByRole('menuitem', { name: /export/i })).toBeEnabled();
	expect((await recordState(page, state.dialogueId)).lastExportPath).toBe('/exports/previous.mnteadlg');
	await expect(page.getByText('Dialogue Exported', { exact: true })).toHaveCount(0);
	expect(downloads).toEqual([]);
});

test('Electron save rejection closes the menu, shows an error, and permits retry', async ({ page }) => {
	const state = await fixture(page);
	await exportWithBridge(page, state, 'reject');
	await expect(page.getByText('Could not export archive', { exact: true })).toBeVisible();
	await page.evaluate(() => { window.__saveMode = 'success'; });
	await openMenu(page, state.target);
	await expect(page.getByRole('menuitem', { name: /export/i })).toBeEnabled();
	await page.getByRole('menuitem', { name: /export/i }).click();
	await expect.poll(() => page.evaluate(() => window.__saveCalls.length)).toBe(2);
	await expect(page.getByText('Dialogue Exported', { exact: true })).toBeVisible();
});

test.describe('touch', () => {
	test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
	test('long press opens the menu; normal tap opens the dialogue', async ({ page }) => {
		// The shared creation harness uses desktop navigation; exercise touch at phone size afterwards.
		await page.setViewportSize({ width: 1280, height: 900 });
		const state = await fixture(page);
		await page.setViewportSize({ width: 390, height: 844 });
		await expect(state.target).toBeVisible();
		const url = page.url();
		await state.target.scrollIntoViewIfNeeded();
		const bounds = await state.target.boundingBox();
		const touch = { x: Math.round(bounds.x + bounds.width / 2), y: Math.round(bounds.y + bounds.height / 2) };
		const session = await page.context().newCDPSession(page);
		await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
		await expect(page.getByRole('menu')).toBeVisible();
		await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
		await session.detach();
		expect(page.url()).toBe(url);
		await page.keyboard.press('Escape');
		await state.target.tap();
		await expect(page).toHaveURL(new RegExp(`/dialogue/${state.dialogueId}`));
	});
});
