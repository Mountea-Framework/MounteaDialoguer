import { describe, it, expect } from 'vitest';
import { canonicalizeProject, hashProject, validateCanonicalProject } from './canonicalProject';

// A remote revision is accepted only if canonicalizing its snapshot reproduces its payload hash.
// Localized entries are stamped by prepareLocalizedNodesAndEntries, so this must not depend on the clock.
describe('canonicalizeProject', () => {
	const START = '00000000-0000-0000-0000-000000000001';
	const stamp = '2026-01-02T03:04:05.000Z';
	const input = {
		project: { id: 'p1', name: 'P', createdAt: stamp, modifiedAt: stamp, localization: { defaultLocale: 'en', supportedLocales: ['en'] } },
		dialogues: [{ id: 'd1', projectId: 'p1', name: 'D', createdAt: stamp, modifiedAt: stamp }],
		nodes: [
			{ id: START, dialogueId: 'd1', type: 'startNode', position: { x: 0, y: 0 }, data: { displayName: 'Start' } },
			{ id: 'n1', dialogueId: 'd1', type: 'leadNode', position: { x: 0, y: 100 }, data: { displayName: 'Hello', dialogueRows: [{ id: 'r1', text: 'Hi there', duration: 3 }] } },
		],
		edges: [{ id: 'e1', dialogueId: 'd1', source: START, target: 'n1' }],
	};

	it('is idempotent: a canonical snapshot keeps its hash when canonicalized again later', async () => {
		const first = await canonicalizeProject(input);
		expect(first.localizedStrings.length).toBeGreaterThan(0);
		await new Promise((resolve) => setTimeout(resolve, 25));
		const second = await canonicalizeProject(first);
		expect(await hashProject(second)).toBe(await hashProject(first));
	});

	it('still refreshes entries whose text changed', async () => {
		const first = await canonicalizeProject(input);
		const changed = structuredClone(first);
		const entry = changed.localizedStrings.find((e) => e.values.en === 'Hello');
		entry.values.en = 'Hello again';
		await new Promise((resolve) => setTimeout(resolve, 25));
		const second = await canonicalizeProject(changed);
		expect(second.localizedStrings.find((e) => e.key === entry.key).values.en).toBe('Hello again');
	});
});

describe('legacy property types', () => {
	it('normalizes legacy property types before hashing, so validation does not change the snapshot', async () => {
		const stamp = '2026-01-02T03:04:05.000Z';
		const snapshot = await canonicalizeProject({
			project: { id: 'p2', name: 'P', createdAt: stamp, modifiedAt: stamp },
			decorators: [{ id: 'dec1', projectId: 'p2', name: 'Item', properties: [{ name: 'on', type: 'bool', defaultValue: 'true' }, { name: 'count', type: 'int', defaultValue: 2 }] }],
		});
		expect(snapshot.decorators[0].properties.map((property) => property.type)).toEqual(['boolean', 'number']);
		expect(snapshot.decorators[0].properties[0].defaultValue).toBe(true);
		const hashBefore = await hashProject(snapshot);
		expect(validateCanonicalProject(snapshot, { localization: false })).toEqual([]);
		expect(await hashProject(snapshot)).toBe(hashBefore); // validation does not change the snapshot
	});
});
