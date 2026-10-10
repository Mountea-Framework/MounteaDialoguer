import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openSession, idle } from './session.mjs';
import { sourceDigest } from './digest.mjs';
import { frameCount } from '../shared/scenario.js';
import { sceneBounds, graphFrame, resolveNodeId, endPositions, initialPositions } from '../shared/graphState.js';
import { escapeRegExp } from '../shared/escapeRegExp.js';
import { beatHash, buildManifest } from '../shared/manifest.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const toolRoot = path.resolve(here, '..');
export const repoRoot = path.resolve(toolRoot, '../..');

/** Fake-clock time stepped after a theme switch so CSS colour transitions finish before capture. */
export const THEME_SETTLE_MS = 600;
const padded = (n) => String(n + 1).padStart(4, '0');
const digestOf = (bytes) => crypto.createHash('sha1').update(bytes).digest('hex');

async function readFixture(scenario) {
	const file = path.resolve(repoRoot, scenario.fixture);
	try {
		return [...await fs.readFile(file)];
	} catch (error) {
		throw new Error(`Cannot read fixture "${scenario.fixture}" (${file}): ${error.message}`);
	}
}

async function loadScene(session, scenario, bytes) {
	try {
		return await session.page.evaluate((b) => window.__capture.loadFixture(b), bytes);
	} catch (error) {
		throw new Error(`Fixture "${scenario.fixture}" could not be parsed: ${error.message}`);
	}
}

/** Viewport that frames every position the graph visits, computed once so layers align. */
async function viewportFor(session, scenario, scene) {
	const bounds = sceneBounds(scene, scenario.beats);
	return session.page.evaluate(({ bounds, size }) => window.__capture.viewportFor(bounds, size), { bounds, size: scenario.size });
}

function reactNodes(scene, frame) {
	return scene.nodes.map((n) => ({
		...n,
		position: frame.positions[n.id],
		style: { opacity: frame.nodeOpacity[n.id] },
	}));
}

function reactEdges(scene, frame) {
	return scene.edges.map((e) => ({ ...e, style: { opacity: Math.min(frame.nodeOpacity[e.source], frame.nodeOpacity[e.target]) } }));
}

async function pushFrame(session, scenario, scene, view, beat, index, frame, theme) {
	await session.page.evaluate(({ scene, view, theme, language }) => {
		window.__capture.setState({ language, theme, scene, view });
	}, {
		scene: { nodes: reactNodes(scene, frame), edges: reactEdges(scene, frame), participants: scene.participants },
		view, theme, language: scenario.language || 'en',
	});
	await idle(session.page);
}

async function captureGraphBeat(session, scenario, scene, view, beat, index, tmpDir) {
	const frames = frameCount(beat, scenario.fps);
	const trackIds = (beat.track || []).map((ref) => resolveNodeId(scene, ref));
	const tracks = Object.fromEntries(trackIds.map((id) => [id, []]));
	let previous = null;
	for (let i = 0; i < frames; i++) {
		const t = i / scenario.fps;
		const frame = graphFrame(scene, scenario.beats, index, t);
		await pushFrame(session, scenario, scene, view, beat, index, frame, beat.theme || 'dark');
		await session.page.clock.runFor(1000 / scenario.fps);
		await idle(session.page);
		const file = path.join(tmpDir, `frame-${padded(i)}.png`);
		const bytes = await session.page.screenshot({ path: file, omitBackground: !beat.opaque });
		const digest = digestOf(bytes);
		const moving = scene.nodes.some((n) => {
			const a = graphFrame(scene, scenario.beats, index, Math.max(0, t - 1 / scenario.fps)).positions[n.id];
			return Math.abs(a.x - frame.positions[n.id].x) + Math.abs(a.y - frame.positions[n.id].y) > 0.5;
		});
		if (previous && moving && digest === previous) throw new Error(`Beat "${beat.id}": stuck frame at frame ${i + 1} (identical to the previous frame while nodes move)`);
		previous = digest;
		for (const id of Object.keys(tracks)) {
			const rect = await session.page.evaluate((nodeId) => window.__capture.rectOf(nodeId), id);
			tracks[id].push(rect && [rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height]);
		}
	}
	return { frames, tracks };
}

async function capturePreviewBeat(session, scenario, scene, view, beat, index, tmpDir, dialogueId) {
	const frames = frameCount(beat, scenario.fps);
	// Show the graph as the previous graph beat left it (initial layout if there is none).
	const gi = lastGraphIndex(scenario, index);
	const positions = scenario.beats[gi]?.kind === 'graph' && gi < index ? endPositions(scene, scenario.beats, gi) : initialPositions(scene);
	const frame = { positions, nodeOpacity: Object.fromEntries(scene.nodes.map((n) => [n.id, 1])) };
	const wasOpaque = await session.page.evaluate((opaque) => {
		const before = document.body.classList.contains('opaque');
		document.body.classList.toggle('opaque', Boolean(opaque));
		return before;
	}, beat.opaque);
	await session.page.evaluate(({ scene, view, theme, language, dialogueId }) => {
		window.__capture.setState({ language, theme, scene, view, dialogueId, preview: false });
	}, { scene: { nodes: reactNodes(scene, frame), edges: reactEdges(scene, frame), participants: scene.participants }, view, theme: beat.theme || 'dark', language: scenario.language || 'en', dialogueId });
	// The overlay plays the stored graph with localized text materialized (as the editor does).
	await session.page.evaluate(async (id) => {
		const previewGraph = await window.__capture.graphForPreview(id);
		window.__capture.setState({ previewGraph, preview: true });
	}, dialogueId);
	const actions = [...(beat.actions || [])].sort((a, b) => a.at - b.at);
	const text = [];
	try {
		for (let i = 0; i < frames; i++) {
			const t = i / scenario.fps;
			while (actions.length && actions[0].at <= t) {
				const { click } = actions.shift();
				await session.page.getByRole('button', { name: new RegExp(escapeRegExp(click), 'i') }).first().click();
			}
			await session.page.clock.runFor(1000 / scenario.fps);
			await idle(session.page);
			await session.page.screenshot({ path: path.join(tmpDir, `frame-${padded(i)}.png`), omitBackground: !beat.opaque });
			text.push(await session.page.evaluate(() => window.__capture.previewText()));
		}
	} finally {
		await session.page.evaluate((before) => {
			window.__capture.setState({ preview: false });
			document.body.classList.toggle('opaque', before);
		}, wasOpaque).catch(() => {});
	}
	return { frames, text };
}

/** Same final layout and viewport rendered once per theme (only the dark/light class differs). */
async function captureStillsBeat(session, scenario, scene, view, beat, index, tmpDir) {
	const sourceIndex = scenario.beats.findIndex((b) => b.id === beat.of);
	if (scenario.beats[sourceIndex]?.kind !== 'graph') throw new Error(`Beat "${beat.id}": "of" must reference a graph beat (got "${beat.of}")`);
	const positions = endPositions(scene, scenario.beats, sourceIndex);
	const frame = { positions, nodeOpacity: Object.fromEntries(scene.nodes.map((n) => [n.id, 1])) };
	const stills = {};
	const wasOpaque = await session.page.evaluate((opaque) => {
		const before = document.body.classList.contains('opaque');
		document.body.classList.toggle('opaque', Boolean(opaque));
		return before;
	}, beat.opaque);
	try {
		for (const theme of [beat.from, beat.to]) {
			await pushFrame(session, scenario, scene, view, beat, index, frame, theme);
			// Step well past any CSS colour transition so neither theme is captured mid-fade.
			await session.page.clock.runFor(THEME_SETTLE_MS);
			await idle(session.page);
			await session.page.screenshot({ path: path.join(tmpDir, `${theme}.png`), omitBackground: !beat.opaque });
			stills[theme] = `${beat.id}/${theme}.png`;
		}
	} finally {
		await session.page.evaluate((before) => document.body.classList.toggle('opaque', before), wasOpaque).catch(() => {});
	}
	return { frames: 1, stills };
}

function lastGraphIndex(scenario, before) {
	for (let i = before - 1; i >= 0; i--) if (scenario.beats[i].kind === 'graph') return i;
	return 0;
}

export async function captureScenario(scenario, { lang = null, beat: onlyBeat = null, force = false, scale = 1 } = {}) {
	const effective = { ...scenario, language: lang || scenario.language || 'en' };
	const outDir = path.join(toolRoot, 'out', effective.id);
	await fs.mkdir(outDir, { recursive: true });
	const fixtureBytes = await readFixture(effective);
	const digest = digestOf(`${await sourceDigest(repoRoot)}:${digestOf(Buffer.from(fixtureBytes))}`);
	const previous = await fs.readFile(path.join(outDir, 'manifest.json'), 'utf8').then(JSON.parse).catch(() => null);

	if (onlyBeat) {
		if (!effective.beats.some((b) => b.id === onlyBeat)) throw new Error(`Unknown beat "${onlyBeat}"`);
		for (const b of effective.beats) {
			if (b.id === onlyBeat) continue;
			const cachedEntry = previous?.beats.find((entry) => entry.id === b.id);
			const present = cachedEntry && await fs.stat(path.join(outDir, b.id)).then(() => true).catch(() => false);
			if (!present) throw new Error(`Beat "${b.id}" has no cached capture; run the whole scenario once before using --beat`);
		}
	}

	const session = await openSession({ size: effective.size, scale });
	const entries = [];
	try {
		const { scene, dialogueId } = await loadScene(session, effective, fixtureBytes);
		const view = await viewportFor(session, effective, scene);
		for (let index = 0; index < effective.beats.length; index++) {
			const beat = effective.beats[index];
			const hash = beatHash(effective, index, digest, scale);
			const cached = previous?.beats.find((b) => b.id === beat.id);
			const finalDir = path.join(outDir, beat.id);
			const skip = !force && cached?.hash === hash && await fs.stat(finalDir).then(() => true).catch(() => false);
			if (skip || (onlyBeat && onlyBeat !== beat.id)) {
				if (cached) entries.push(cached);
				continue;
			}
			const capture = { graph: captureGraphBeat, preview: capturePreviewBeat, stills: captureStillsBeat }[beat.kind];
			if (!capture) throw new Error(`Beat kind "${beat.kind}" is not implemented yet (beat "${beat.id}")`);
			const tmpDir = path.join(outDir, `.tmp-${beat.id}-${process.pid}`);
			await fs.rm(tmpDir, { recursive: true, force: true });
			await fs.mkdir(tmpDir, { recursive: true });
			try {
				const { frames, tracks, text, stills } = await capture(session, effective, scene, view, beat, index, tmpDir, dialogueId);
				await fs.rm(finalDir, { recursive: true, force: true });
				await fs.rename(tmpDir, finalDir);
				entries.push({ id: beat.id, kind: beat.kind, theme: beat.theme || 'dark', frames, hash, dir: beat.id, pattern: `${beat.id}/frame-%04d.png`, ...(tracks && { tracks }), ...(text && { text }), ...(stills && { stills }) });
			} catch (error) {
				await fs.rm(tmpDir, { recursive: true, force: true });
				throw error;
			}
		}
		const missing = await session.page.evaluate(() => window.__capture.missingKeys);
		if (missing.length) throw new Error(`Missing translation keys for "${effective.language}": ${missing.join(', ')}`);
	} finally {
		await session.close();
	}
	const manifest = buildManifest(effective, entries, { scale });
	await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
	return manifest;
}
