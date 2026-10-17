import { test, expect } from '@playwright/test';
import { openModuleHarness } from './helpers/moduleHarness';

test.beforeEach(async ({ page }) => { await openModuleHarness(page); });

// A remote revision is accepted only if canonicalizing its snapshot reproduces its payload hash.
// Localized entries are stamped while canonicalizing, so the result must not depend on the clock.
test('canonicalizing a canonical snapshot keeps its hash', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { canonicalizeProject, hashProject } = await import('/src/lib/persistence/canonicalProject.js');
		const START = '00000000-0000-0000-0000-000000000001', stamp = '2026-01-02T03:04:05.000Z';
		const first = await canonicalizeProject({
			project: { id: 'p1', name: 'P', createdAt: stamp, modifiedAt: stamp, localization: { defaultLocale: 'en', supportedLocales: ['en'] } },
			dialogues: [{ id: 'd1', projectId: 'p1', name: 'D', createdAt: stamp, modifiedAt: stamp }],
			nodes: [
				{ id: START, dialogueId: 'd1', type: 'startNode', position: { x: 0, y: 0 }, data: { displayName: 'Start' } },
				{ id: 'n1', dialogueId: 'd1', type: 'leadNode', position: { x: 0, y: 100 }, data: { displayName: 'Hello', dialogueRows: [{ id: 'r1', text: 'Hi there', duration: 3 }] } },
			],
			edges: [{ id: 'e1', dialogueId: 'd1', source: START, target: 'n1' }],
		});
		await new Promise((resolve) => setTimeout(resolve, 25));
		const second = await canonicalizeProject(first);
		const changed = structuredClone(first);
		const entry = changed.localizedStrings.find((item) => item.values.en === 'Hello');
		entry.values.en = 'Hello again';
		await new Promise((resolve) => setTimeout(resolve, 25));
		const refreshed = await canonicalizeProject(changed);
		return {
			entries: first.localizedStrings.length,
			stable: await hashProject(second) === await hashProject(first),
			refreshed: refreshed.localizedStrings.find((item) => item.key === entry.key).values.en,
		};
	});
	expect(result.entries).toBeGreaterThan(0);
	expect(result.stable).toBe(true);
	expect(result.refreshed).toBe('Hello again');
});

test('legacy property types are normalized before hashing, so validation does not change the snapshot', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { canonicalizeProject, hashProject, validateCanonicalProject } = await import('/src/lib/persistence/canonicalProject.js');
		const stamp = '2026-01-02T03:04:05.000Z';
		const snapshot = await canonicalizeProject({
			project: { id: 'p2', name: 'P', createdAt: stamp, modifiedAt: stamp },
			decorators: [{ id: 'dec1', projectId: 'p2', name: 'Item', properties: [{ name: 'on', type: 'bool', defaultValue: 'true' }, { name: 'count', type: 'int', defaultValue: 2 }] }],
		});
		const before = await hashProject(snapshot);
		const problems = validateCanonicalProject(snapshot, { localization: false });
		return { types: snapshot.decorators[0].properties.map((property) => property.type), flag: snapshot.decorators[0].properties[0].defaultValue, problems, unchanged: before === await hashProject(snapshot) };
	});
	expect(result.types).toEqual(['boolean', 'number']);
	expect(result.flag).toBe(true);
	expect(result.problems).toEqual([]);
	expect(result.unchanged).toBe(true);
});
