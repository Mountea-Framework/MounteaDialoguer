import { test, expect } from '@playwright/test';
import { openModuleHarness } from './helpers/moduleHarness.js';

const loadLayout = (page, fn, arg) =>
	page.evaluate(async ({ source, arg }) => {
		const mod = await import('/src/lib/graphLayout.js');
		return new Function('mod', 'arg', `return (${source})(mod, arg)`)(mod, arg);
	}, { source: fn.toString(), arg });

test('graph layout anchors the start node at the origin and ranks children below it', async ({ page }) => {
	await openModuleHarness(page);
	const out = await loadLayout(page, ({ getLayoutedElements, START_NODE_ID }) => {
		const nodes = [
			{ id: START_NODE_ID, type: 'startNode', position: { x: 500, y: 500 } },
			{ id: 'a', type: 'leadNode', position: { x: 0, y: 0 } },
			{ id: 'b', type: 'answerNode', position: { x: 0, y: 0 } },
			{ id: 'c', type: 'answerNode', position: { x: 0, y: 0 } },
		];
		const edges = [
			{ id: 'e1', source: START_NODE_ID, target: 'a' },
			{ id: 'e2', source: 'a', target: 'b' },
			{ id: 'e3', source: 'a', target: 'c' },
		];
		const first = getLayoutedElements(nodes, edges, 'TB');
		const second = getLayoutedElements(nodes, edges, 'TB');
		const pos = (result) => Object.fromEntries(result.nodes.map((n) => [n.id, n.position]));
		return { first: pos(first), second: pos(second), start: START_NODE_ID };
	});
	// Start node (200x88) anchored at (0,0); rank separation 100; nodesep 50.
	expect(out.first[out.start]).toEqual({ x: 0, y: 0 });
	expect(out.first.a.x).toBeCloseTo(-25, 3);
	expect(out.first.a.y).toBeCloseTo(188, 3);
	expect(out.first.b.x).toBeCloseTo(-175, 3);
	expect(out.first.c.x).toBeCloseTo(125, 3);
	expect(out.first.b.y).toBeCloseTo(412, 3);
	expect(out.first.c.y).toBeCloseTo(412, 3);
	// Deterministic: same input, same output.
	expect(out.second).toEqual(out.first);
});

test('graph layout tolerates an empty graph, a missing start node and edges to unknown nodes', async ({ page }) => {
	await openModuleHarness(page);
	const out = await loadLayout(page, ({ getLayoutedElements }) => {
		const empty = getLayoutedElements([], [], 'TB');
		const noStart = getLayoutedElements(
			[{ id: 'x', type: 'leadNode', position: { x: 7, y: 9 } }],
			[{ id: 'e', source: 'x', target: 'ghost' }],
			'TB'
		);
		return { empty: empty.nodes.length, noStart: noStart.nodes.map((n) => [n.id, n.position.x, n.position.y]) };
	});
	expect(out.empty).toBe(0);
	expect(out.noStart).toHaveLength(1);
	expect(out.noStart[0][0]).toBe('x');
	expect(Number.isFinite(out.noStart[0][1])).toBe(true);
	expect(Number.isFinite(out.noStart[0][2])).toBe(true);
});

test('getNodeSize prefers measured, then width/height, then style, then the type default', async ({ page }) => {
	await openModuleHarness(page);
	const out = await loadLayout(page, ({ getNodeSize }) => ({
		measured: getNodeSize({ type: 'leadNode', measured: { width: 11, height: 12 }, width: 1, height: 2 }),
		explicit: getNodeSize({ type: 'leadNode', width: 21, height: 22 }),
		style: getNodeSize({ type: 'leadNode', style: { width: '31px', height: '32px' } }),
		byType: getNodeSize({ type: 'startNode' }),
		fallback: getNodeSize({ type: 'mystery' }),
	}));
	expect(out.measured).toEqual({ width: 11, height: 12 });
	expect(out.explicit).toEqual({ width: 21, height: 22 });
	expect(out.style).toEqual({ width: 31, height: 32 });
	expect(out.byType).toEqual({ width: 200, height: 88 });
	expect(out.fallback).toEqual({ width: 250, height: 120 });
});
