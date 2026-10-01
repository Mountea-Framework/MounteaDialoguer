import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import AxeBuilder from '@axe-core/playwright';
import { openModuleHarness } from './helpers/moduleHarness';
import { seedLocalState, openDashboard, createProject, openDialoguesSection, createDialogue } from './helpers/appHarness';
import { resolveReleaseIdentity } from '../../scripts/product-build.mjs';

test('release identity distinguishes CI, local dirty and explicit builds', () => {
	expect(resolveReleaseIdentity({ version: '1', env: { CI: 'true', GITHUB_SHA: 'abc' } })).toBe('mountea-dialoguer@1+abc');
	expect(resolveReleaseIdentity({ version: '1', env: {}, git: (args) => args[0] === 'status' ? ' M src/app.js' : 'abc' })).toBe('mountea-dialoguer@1+local.abc.dirty');
	expect(resolveReleaseIdentity({ version: '1', env: { MOUNTEA_RELEASE: 'release-test' } })).toBe('release-test');
});

test('offline onboarding loads the tracked archive and aborts stalled remote fetches', async ({ page }) => {
	await openModuleHarness(page);
	await page.clock.install();
	await page.evaluate(async () => {
		const mod = await import('/src/lib/onboarding/templateLoader.js');
		const original = window.fetch;
		window.fetch = (url, options) => String(url).startsWith('http') ? new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')))) : original(url, options);
		window.templateResult = mod.resolveOnboardingExampleTemplateFile();
	});
	await page.clock.runFor(21_000);
	const result = await page.evaluate(async () => { const result = await window.templateResult; return { source: result.source, bytes: Array.from(new Uint8Array(await result.file.arrayBuffer())) }; });
	expect(result.source).toBe('onboarding-bundled');
	expect(Buffer.from(result.bytes)).toEqual(readFileSync('ExampleProject/OnboardingExample.mnteadlgproj'));
});

test('earned achievements retry failures, acknowledge once and reject late cross-profile replies', async ({ page }) => {
	await openModuleHarness(page);
	const result = await page.evaluate(async () => {
		const tracker = await import('/src/lib/achievements/achievementTracker.js');
		const { useSteamStore } = await import('/src/stores/steamStore.js');
		const profile = await import('/src/lib/profile/activeProfile.js');
		let calls = 0;
		useSteamStore.setState({ status: { available: false }, unlockAchievement: async () => { calls++; return { ok: calls > 1 }; } });
		await tracker.trackExampleProjectCreated();
		const unavailableCalls = calls;
		useSteamStore.setState({ status: { available: true } });
		await tracker.retryPendingAchievements();
		const failed = JSON.parse(profile.readProfileScopedItem('mountea-achievements-state-v1'));
		await tracker.retryPendingAchievements();
		await tracker.retryPendingAchievements();
		const acknowledged = JSON.parse(profile.readProfileScopedItem('mountea-achievements-state-v1'));
		profile.setActiveProfileId('second-product-profile');
		let finish;
		useSteamStore.setState({ unlockAchievement: () => new Promise((resolve) => { finish = resolve; }) });
		const pending = tracker.trackExampleProjectCreated();
		profile.setActiveProfileId('third-product-profile');
		finish({ ok: true }); await pending;
		return { unavailableCalls, calls, failed: Object.values(failed)[0].status, acknowledged: Object.values(acknowledged)[0].status, third: profile.readProfileScopedItem('mountea-achievements-state-v1', '{}'), second: JSON.parse(localStorage.getItem(profile.buildProfileScopedKey('mountea-achievements-state-v1', 'second-product-profile'))) };
	});
	expect(result).toMatchObject({ unavailableCalls: 0, calls: 2, failed: 'pending', acknowledged: 'acknowledged', third: '{}' });
	expect(Object.values(result.second)[0].status).toBe('pending');
});

test('activity bursts write only on bounded ticks and flush the captured profile once', async ({ page }) => {
	await openModuleHarness(page);
	await page.clock.install();
	await page.evaluate(async () => {
		window.tracker = await import('/src/lib/achievements/achievementTracker.js');
		window.profile = await import('/src/lib/profile/activeProfile.js');
		window.oldProfile = window.profile.getActiveProfileId();
		window.activityWrites = [];
		const original = Storage.prototype.setItem;
		Storage.prototype.setItem = function (key, value) { if (key.startsWith('mountea-activity-v2')) window.activityWrites.push(key); return original.call(this, key, value); };
		for (let i = 0; i < 5000; i++) window.tracker.markUserActivity();
	});
	expect(await page.evaluate(() => window.activityWrites.length)).toBe(0);
	await page.clock.runFor(60_000);
	await page.evaluate(async () => { await window.tracker.trackActiveMinute(); await window.tracker.trackActiveMinute(); });
	expect(await page.evaluate(() => window.activityWrites.length)).toBe(1);
	const result = await page.evaluate(() => {
		window.tracker.markUserActivity();
		window.profile.setActiveProfileId('activity-next');
		window.tracker.flushActivity({ force: true });
		return { keys: window.activityWrites, old: window.profile.buildProfileScopedKey('mountea-activity-v2', window.oldProfile), next: window.tracker.getTrackedPlaytimeMinutes() };
	});
	expect(result.keys).toEqual([result.old, result.old]);
	expect(result.next).toBe(0);
});

test('telemetry distinguishes disabled development and clamps sample probabilities', async ({ page }) => {
	await openModuleHarness(page);
	const result = await page.evaluate(async () => {
		const config = await import('/src/lib/monitoring/config.js');
		return { rates: [-2, 2, '', 'bad', 0, 0.25].map((v) => config.parseSampleRate(v)), disabled: config.rendererReportingEnabled({ VITE_SENTRY_DSN: 'x', DEV: true }), enabled: config.rendererReportingEnabled({ VITE_SENTRY_DSN: 'x', DEV: false }) };
	});
	expect(result).toEqual({ rates: [0, 1, 0.1, 0.1, 0, 0.25], disabled: false, enabled: true });
});

test('native telemetry uses the renderer manifest release, clamps rates and reports actual enablement', () => {
	for (const [packaged, dsn, rate, expected] of [[false, 'test', '2', false], [true, '', '2', false], [true, 'test', '2', true], [true, 'test', '-1', true]]) {
		let config;
		const scope = { module: { exports: {} }, console, process: { env: { MOUNTEA_SENTRY_DSN: dsn, MOUNTEA_SENTRY_TRACES_SAMPLE_RATE: rate } }, require: (name) => {
			if (name === '@sentry/electron/main') return { init: (value) => { config = value; } };
			if (name === 'electron') return { app: { isPackaged: packaged, getAppPath: () => '/app', getVersion: () => '1' } };
			if (name === 'node:fs') return { readFileSync: () => JSON.stringify({ release: 'shared-renderer-release' }) };
			if (name === 'node:path') return { join: (...parts) => parts.join('/') };
			throw new Error(`Unexpected dependency: ${name}`);
		} };
		vm.runInNewContext(readFileSync('electron/sentry.cjs', 'utf8'), scope);
		expect(scope.module.exports.isMainProcessSentryEnabled()).toBe(false);
		expect(scope.module.exports.initMainProcessSentry()).toBe(expected);
		expect(scope.module.exports.isMainProcessSentryEnabled()).toBe(expected);
		if (expected) expect(config).toMatchObject({ release: 'shared-renderer-release', tracesSampleRate: rate === '2' ? 1 : 0 });
	}
});

test('payload estimates measure canonical media, unused definitions and localized records', async ({ page }) => {
	await openModuleHarness(page);
	const result = await page.evaluate(async () => {
		const { completeProjectFixture } = await import('/tests/e2e/helpers/projectFixtures.js');
		const { getRepositoryContext } = await import('/src/lib/db.js');
		const context = await getRepositoryContext();
		const fixture = completeProjectFixture('size-project');
		const audio = fixture.nodes[1].data.dialogueRows[0].audioFile;
		audio.blob = new Blob([new Uint8Array(1024 * 1024)], { type: 'audio/wav' }); audio.size = audio.blob.size;
		await context.db.projects.put(fixture.project);
		for (const table of ['dialogues', 'categories', 'participants', 'decorators', 'conditions', 'nodes', 'edges', 'localizedStrings']) await context.db[table].bulkPut(fixture[table]);
		const { calculateProjectSize, calculateDialogueSize } = await import('/src/lib/storageUtils.js');
		const { buildProjectSnapshot } = await import('/src/lib/sync/snapshot.js');
		const snapshot = await buildProjectSnapshot(fixture.project.id);
		const before = await calculateProjectSize(fixture.project.id);
		await context.db.conditions.add({ id: 'unused-condition', projectId: fixture.project.id, name: 'Extra', description: '界'.repeat(2000), properties: [] });
		return { before, expected: new TextEncoder().encode(JSON.stringify(snapshot)).length, after: await calculateProjectSize(fixture.project.id), dialogue: await calculateDialogueSize(fixture.dialogues[0].id) };
	});
	expect(result.before).toBe(result.expected);
	expect(result.before).toBeGreaterThan(1_390_000);
	expect(result.after - result.before).toBeGreaterThan(6000);
	expect(result.dialogue).toBeGreaterThan(1_390_000);
});

test('new product fallback and recovery copy exists in all six languages', () => {
	for (const lang of ['en', 'cs', 'de', 'fr', 'es', 'pl']) {
		const data = JSON.parse(readFileSync(`src/i18n/locales/${lang}.json`, 'utf8'));
		for (const group of ['archive', 'recovery', 'metrics', 'accessibility', 'syncConflicts']) for (const value of Object.values(data[group])) expect(value).toBeTruthy();
		expect(data.errors.unexpectedDescription).toBeTruthy();
		expect(data.errors.storageInitialization).toBeTruthy();
	}
});

test('archive import supports keyboard selection, localized failure and focus return', async ({ page }) => {
	await openModuleHarness(page);
	await page.evaluate(async () => {
		await import('/src/i18n/index.js');
		const { default: React } = await import('/node_modules/.vite/deps/react.js'); const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
		const { ArchiveImportDialog } = await import('/src/components/projects/ArchiveImportDialog.jsx');
		function Harness() { const [file, setFile] = React.useState(null); return React.createElement(React.Fragment, null, React.createElement('button', { onClick: () => setFile(new File(['x'], 'test.zip')) }, 'Open import'), file && React.createElement(ArchiveImportDialog, { file, targets: [{ id: 'target', name: 'Target project' }], kind: 'project', onClose: () => setFile(null), onImport: async () => { throw Object.assign(new Error('Injected raw English failure'), { code: 'ARCHIVE_EXPANSION_LIMIT', path: 'media/oversized.wav' }); } })); }
		createRoot(document.getElementById('root')).render(React.createElement(Harness));
	});
	await page.getByRole('button', { name: 'Open import' }).focus(); await page.keyboard.press('Enter');
	const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
	await dialog.getByRole('radio', { name: 'Replace an existing item' }).focus(); await page.keyboard.press('Space');
	await expect(dialog.getByRole('combobox')).toHaveAccessibleName('Item to replace');
	await dialog.getByRole('button', { name: 'Replace selected item' }).focus(); await page.keyboard.press('Enter');
	await expect(dialog.getByRole('alert')).toContainText('Import failed');
	await expect(dialog.getByRole('alert')).toContainText('128 MiB');
	await expect(dialog.getByRole('alert')).toContainText('media/oversized.wav');
	await expect(dialog.getByRole('alert')).not.toContainText('Injected raw English');
	const scan = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa']).analyze();
	expect(scan.violations).toEqual([]);
	await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
	await expect(page.getByRole('button', { name: 'Open import' })).toBeFocused();
});

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


for (const language of ['en', 'cs', 'de', 'fr', 'es', 'pl']) test(`real store failures localize titles and details in ${language} and preserve references`, async ({ page }) => {
	await openModuleHarness(page);
	await page.evaluate(async (language) => {
		const { default: i18n } = await import('/src/i18n/index.js'); await i18n.changeLanguage(language);
		const { default: React } = await import('/node_modules/.vite/deps/react.js');
		const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
		const { useToast } = await import('/src/components/ui/toaster.jsx');
		function Capture() { const { toasts } = useToast(); return React.createElement('div', null, ...toasts.map((toast) => React.createElement('div', { key: toast.id, role: 'alert' }, toast.title, ' ', toast.description))); }
		createRoot(document.getElementById('root')).render(React.createElement(Capture));
		const { completeProjectFixture } = await import('/tests/e2e/helpers/projectFixtures.js');
		const { getRepositoryContext } = await import('/src/lib/db.js'); const context = await getRepositoryContext();
		const fixture = completeProjectFixture('localized-errors'); await context.db.projects.put(fixture.project);
		for (const table of ['dialogues', 'categories', 'participants', 'decorators', 'conditions', 'nodes', 'edges', 'localizedStrings']) await context.db[table].bulkPut(fixture[table]);
		const { useProjectStore } = await import('/src/stores/projectStore.js');
		const { useDialogueStore } = await import('/src/stores/dialogueStore.js');
		const { useCategoryStore } = await import('/src/stores/categoryStore.js');
		for (const action of [() => useProjectStore.getState().importProject(new File(['broken'], 'bad.zip')), () => useDialogueStore.getState().importDialogue(fixture.project.id, new File(['broken'], 'bad.zip')), () => useCategoryStore.getState().deleteCategory(fixture.categories[0].id)]) try { await action(); } catch { /* Expected real archive/domain validation failures. */ }
	}, language);
	const locale = JSON.parse(readFileSync(`src/i18n/locales/${language}.json`, 'utf8'));
	await expect(page.getByRole('alert')).toHaveCount(3);
	for (const index of [0, 1]) {
		await expect(page.getByRole('alert').nth(index)).toContainText(locale.errors.actions.import);
		await expect(page.getByRole('alert').nth(index)).toContainText(locale.errors.details.archiveCorrupt);
	}
	await expect(page.getByRole('alert').nth(2)).toContainText(locale.errors.details.referenced);
	await expect(page.getByRole('alert').nth(2)).toContainText('localized-errors-speaker');
	await expect(page.getByRole('alert').nth(2)).toContainText('categoryId');
	await expect(page.locator('body')).not.toContainText('central directory');
});
