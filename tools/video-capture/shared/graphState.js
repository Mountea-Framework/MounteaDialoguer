import { getLayoutedElements, START_NODE_ID, getNodeSize } from '../../../src/lib/graphLayout.js';
import { ease, clamp01 } from './ease.js';

const TIER_SPREAD = 0.3; // fraction of a staggered layout beat spent offsetting tiers

export function buildScene(snapshot, dialogueId) {
	const nodes = snapshot.nodes
		.filter((n) => n.dialogueId === dialogueId)
		.map((n) => ({
			id: n.id, type: n.type, data: n.data, position: { x: n.position.x, y: n.position.y },
			measured: n.measured, width: n.measured?.width, height: n.measured?.height,
		}));
	const ids = new Set(nodes.map((n) => n.id));
	const edges = snapshot.edges
		.filter((e) => e.dialogueId === dialogueId && ids.has(e.source) && ids.has(e.target))
		.map((e) => ({ id: e.id, source: e.source, target: e.target, type: e.type, data: e.data, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle }));

	const depth = {};
	const queue = [];
	if (ids.has(START_NODE_ID)) { depth[START_NODE_ID] = 0; queue.push(START_NODE_ID); }
	while (queue.length) {
		const current = queue.shift();
		for (const edge of edges) {
			if (edge.source === current && depth[edge.target] === undefined) {
				depth[edge.target] = depth[current] + 1;
				queue.push(edge.target);
			}
		}
	}
	const reached = Object.values(depth);
	const maxDepth = reached.length ? Math.max(...reached) : 0;
	for (const node of nodes) if (depth[node.id] === undefined) depth[node.id] = maxDepth;
	return { nodes, edges, participants: snapshot.participants || [], depth, maxDepth };
}

export function resolveNodeId(scene, ref) {
	if (scene.nodes.some((n) => n.id === ref)) return ref;
	const wanted = String(ref).trim().toLowerCase();
	const matches = scene.nodes.filter((n) => String(n.data?.label || '').trim().toLowerCase() === wanted);
	if (matches.length === 1) return matches[0].id;
	const labels = scene.nodes.map((n) => n.data?.label).filter(Boolean).join(', ');
	if (matches.length > 1) throw new Error(`Node reference "${ref}" is ambiguous (${matches.length} matches: ${matches.map((n) => n.id).join(', ')}). Use an id. Labels: ${labels}`);
	throw new Error(`No node "${ref}" in this graph. Labels: ${labels}`);
}

export function initialPositions(scene) {
	return Object.fromEntries(scene.nodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }]));
}

function autoPositions(scene) {
	const { nodes } = getLayoutedElements(scene.nodes, scene.edges, 'TB');
	return Object.fromEntries(nodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }]));
}

export function endPositions(scene, beats, index) {
	let positions = initialPositions(scene);
	for (let i = 0; i <= index; i++) {
		const beat = beats[i];
		if (beat.kind !== 'graph') continue;
		if (beat.move) positions = { ...positions, [resolveNodeId(scene, beat.move.node)]: { x: beat.move.to[0], y: beat.move.to[1] } };
		if (beat.layout === 'auto') positions = autoPositions(scene);
	}
	return positions;
}

export function graphFrame(scene, beats, index, tSec) {
	const beat = beats[index];
	const from = index > 0 ? endPositions(scene, beats, index - 1) : initialPositions(scene);
	const to = endPositions(scene, beats, index);
	const u = clamp01(tSec / beat.duration);
	const easeName = beat.ease || 'power3.inOut';
	const staggered = beat.layout === 'auto' && beat.stagger === 'tier' && scene.maxDepth > 0;

	const positions = {};
	for (const node of scene.nodes) {
		let local = u;
		if (staggered) {
			const delay = TIER_SPREAD * (scene.depth[node.id] / scene.maxDepth);
			local = clamp01((u - delay) / (1 - TIER_SPREAD));
		}
		const p = ease(easeName, local);
		const a = from[node.id], b = to[node.id];
		positions[node.id] = { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
	}

	const nodeOpacity = {};
	const tierStagger = beat.tierStagger ?? 0.35;
	const fade = beat.fade ?? 0.4;
	for (const node of scene.nodes) {
		nodeOpacity[node.id] = beat.reveal === 'tiers'
			? ease('power2.out', (tSec - scene.depth[node.id] * tierStagger) / fade)
			: 1;
	}
	return { positions, nodeOpacity };
}

export function sceneBounds(scene, beats) {
	const stages = [initialPositions(scene), ...beats.map((_, i) => endPositions(scene, beats, i))];
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (const stage of stages) {
		for (const node of scene.nodes) {
			const { width, height } = getNodeSize(node);
			const p = stage[node.id];
			minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
			maxX = Math.max(maxX, p.x + width); maxY = Math.max(maxY, p.y + height);
		}
	}
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
