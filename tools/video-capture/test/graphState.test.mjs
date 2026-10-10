import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScene, resolveNodeId, initialPositions, endPositions, graphFrame, sceneBounds } from '../shared/graphState.js';

const START = '00000000-0000-0000-0000-000000000001';
const snapshot = {
	nodes: [
		{ id: START, dialogueId: 'd', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Start' }, measured: { width: 200, height: 88 } },
		{ id: 'a', dialogueId: 'd', type: 'leadNode', position: { x: 300, y: 300 }, data: { label: 'Greeting' }, measured: { width: 250, height: 124 } },
		{ id: 'b', dialogueId: 'd', type: 'answerNode', position: { x: 100, y: 700 }, data: { label: 'Sell Goods' }, measured: { width: 250, height: 124 } },
		{ id: 'c', dialogueId: 'd', type: 'answerNode', position: { x: 600, y: 700 }, data: { label: 'Leave' }, measured: { width: 250, height: 124 } },
		{ id: 'z', dialogueId: 'other', type: 'leadNode', position: { x: 0, y: 0 }, data: { label: 'Other graph' } },
	],
	edges: [
		{ id: 'e1', dialogueId: 'd', source: START, target: 'a' },
		{ id: 'e2', dialogueId: 'd', source: 'a', target: 'b' },
		{ id: 'e3', dialogueId: 'd', source: 'a', target: 'c' },
	],
	participants: [{ id: 'p', name: 'Waldermar' }],
};
const scene = () => buildScene(snapshot, 'd');

test('buildScene keeps only the dialogue and computes tier depth from the start node', () => {
	const s = scene();
	assert.equal(s.nodes.length, 4);
	assert.equal(s.edges.length, 3);
	assert.deepEqual(s.depth, { [START]: 0, a: 1, b: 2, c: 2 });
	assert.equal(s.maxDepth, 2);
	assert.equal(s.nodes[1].width, 250);
});

test('resolveNodeId matches ids and unique labels and explains failures', () => {
	const s = scene();
	assert.equal(resolveNodeId(s, 'b'), 'b');
	assert.equal(resolveNodeId(s, 'sell goods'), 'b');
	assert.throws(() => resolveNodeId(s, 'nope'), /No node "nope".*Greeting.*Sell Goods/s);
	const dup = buildScene({ ...snapshot, nodes: [...snapshot.nodes, { id: 'b2', dialogueId: 'd', type: 'answerNode', position: { x: 0, y: 0 }, data: { label: 'Sell Goods' } }] }, 'd');
	assert.throws(() => resolveNodeId(dup, 'Sell Goods'), /ambiguous.*matches: b, b2.*Labels:.*Greeting.*Leave/is);
});

test('move then auto layout: end positions fold across beats', () => {
	const s = scene();
	const beats = [
		{ id: 'm', kind: 'graph', duration: 1, move: { node: 'Sell Goods', to: [900, 120] } },
		{ id: 'l', kind: 'graph', duration: 1, layout: 'auto' },
	];
	assert.deepEqual(initialPositions(s).b, { x: 100, y: 700 });
	assert.deepEqual(endPositions(s, beats, 0).b, { x: 900, y: 120 });
	assert.deepEqual(endPositions(s, beats, 0).c, { x: 600, y: 700 });
	const laidOut = endPositions(s, beats, 1);
	assert.deepEqual(laidOut[START], { x: 0, y: 0 });
	assert.ok(laidOut.b.y > laidOut.a.y, 'children sit below their parent after auto layout');
});

test('graphFrame interpolates from start to end and is exact at both ends', () => {
	const s = scene();
	const beats = [{ id: 'm', kind: 'graph', duration: 2, ease: 'linear', move: { node: 'b', to: [900, 120] } }];
	assert.deepEqual(graphFrame(s, beats, 0, 0).positions.b, { x: 100, y: 700 });
	assert.deepEqual(graphFrame(s, beats, 0, 2).positions.b, { x: 900, y: 120 });
	const mid = graphFrame(s, beats, 0, 1).positions.b;
	assert.ok(Math.abs(mid.x - 500) < 1e-9 && Math.abs(mid.y - 410) < 1e-9);
});

test('tier-staggered auto layout moves shallow tiers before deep ones', () => {
	const s = scene();
	const beats = [{ id: 'l', kind: 'graph', duration: 1, ease: 'linear', layout: 'auto', stagger: 'tier' }];
	const end = endPositions(s, beats, 0);
	const early = graphFrame(s, beats, 0, 0.25).positions;
	const progress = (id) => {
		const from = initialPositions(s)[id];
		const to = end[id];
		const dx = to.x - from.x, dy = to.y - from.y;
		return Math.hypot(early[id].x - from.x, early[id].y - from.y) / (Math.hypot(dx, dy) || 1);
	};
	assert.ok(progress('a') > progress('b'), 'tier 1 leads tier 2');
});

test('reveal fades nodes in by tier and every node is fully visible without reveal', () => {
	const s = scene();
	const reveal = [{ id: 'r', kind: 'graph', duration: 3, reveal: 'tiers', tierStagger: 1, fade: 1 }];
	assert.equal(graphFrame(s, reveal, 0, 0).nodeOpacity[START], 0);
	assert.equal(graphFrame(s, reveal, 0, 1).nodeOpacity[START], 1);
	assert.equal(graphFrame(s, reveal, 0, 1).nodeOpacity.b, 0);
	assert.equal(graphFrame(s, reveal, 0, 3).nodeOpacity.b, 1);
	const plain = [{ id: 'p', kind: 'graph', duration: 1 }];
	assert.ok(Object.values(graphFrame(s, plain, 0, 0).nodeOpacity).every((v) => v === 1));
});

test('sceneBounds covers every position the graph will visit', () => {
	const s = scene();
	const beats = [{ id: 'm', kind: 'graph', duration: 1, move: { node: 'b', to: [2000, 900] } }];
	const bounds = sceneBounds(s, beats);
	assert.ok(bounds.x <= 0 && bounds.x + bounds.width >= 2000 + 250);
	assert.ok(bounds.y + bounds.height >= 900 + 124);
});
