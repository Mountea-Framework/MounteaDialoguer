// Captures an `app` beat: a scripted walk through the real app, one screenshot per fake-clock frame.
import fs from 'node:fs/promises';
import path from 'node:path';
import { advance, settle } from './app-session.mjs';
import { escapeRegExp } from '../shared/escapeRegExp.js';
import { ease } from '../shared/ease.js';
import { holdFrames, lookupKey, moveFrames, targetText, typeSchedule } from '../shared/steps.js';

const padded = (n) => String(n + 1).padStart(4, '0');
/** Frames the app may take to show a target before the script is declared broken (5 s at 30 fps). */
const WAIT_LIMIT_SECONDS = 5;
/** Pause between two steps, so the video has a calm rhythm. */
export const DEFAULT_GAP_SECONDS = 0.3;
const DEFAULT_CPS = 14;
const DEFAULT_HINT_SECONDS = 1.4;

/** Resolves `:project` / `:dialogue` placeholders of a start route. */
export const resolveRoute = (route, ids) => route.replace(':project', ids.projectId || '').replace(':dialogue', ids.dialogueId || '');

/** Boots the app, optionally seeds a project from an archive, and opens the scenario's start route. */
export async function prepareApp(session, scenario, fixtureBytes) {
	const { page } = session;
	const fps = scenario.fps;
	const frame = 1000 / fps;
	// Loading screen (tips, fade) runs on the fake clock; step it until the first route is mounted.
	let ready = false;
	for (let i = 0; i < 600 && !ready; i++) {
		await advance(session, 100);
		await new Promise((resolve) => setTimeout(resolve, 10));
		ready = await page.locator('.route-fade-enter').count().then((n) => n > 0).catch(() => false);
	}
	if (!ready) throw new Error('The app never left its loading screen');
	for (let i = 0; i < 10; i++) await advance(session, 100);
	await settle(session);

	// Outside English, a key missing from the language must fail the capture instead of silently showing English.
	if (scenario.language && scenario.language !== 'en') {
		await page.evaluate(async (language) => {
			const { default: i18n } = await import('/src/i18n/index.js');
			window.__missingKeys = [];
			i18n.options.saveMissing = true;
			i18n.options.fallbackLng = false;
			i18n.on('missingKey', (_languages, _namespace, key) => { if (!window.__missingKeys.includes(key)) window.__missingKeys.push(key); });
			// Re-announce the language so everything already on screen asks for its keys again.
			await i18n.changeLanguage(language);
		}, scenario.language);
		for (let i = 0; i < 5; i++) await advance(session, 100);
		await settle(session);
	}

	const ids = { projectId: null, dialogueId: null };
	if (fixtureBytes) {
		const imported = await page.evaluate(async (bytes) => {
			const { useProjectStore } = await import('/src/stores/projectStore.js');
			let result = null;
			const projectId = await useProjectStore.getState().importProject(new Uint8Array(bytes), { onImported: (info) => { result = info; } });
			return { projectId, firstDialogueId: result?.firstDialogueId || null };
		}, [...fixtureBytes]);
		ids.projectId = imported.projectId;
		ids.dialogueId = imported.firstDialogueId;
		// Let the "Project Imported" toast leave before recording starts.
		for (let i = 0; i < 50; i++) await advance(session, 100);
		await settle(session);
	}

	const route = resolveRoute(scenario.start?.route || '/', ids);
	await page.evaluate((hash) => { window.location.hash = `#${hash}`; }, route);
	for (let i = 0; i < 20; i++) await advance(session, frame * 3);
	await settle(session);
	await page.evaluate(() => window.__hud.ready());
	return ids;
}

/** Exports the current project through the app's own export code (used to chain chapters). */
export async function exportState(session) {
	const bytes = await session.page.evaluate(async () => {
		const { useProjectStore } = await import('/src/stores/projectStore.js');
		const store = useProjectStore.getState();
		const fromHash = window.location.hash.match(/projects\/([^/?#]+)/)?.[1];
		const projectId = fromHash || store.projects?.[0]?.id;
		if (!projectId) throw new Error('No project to export');
		const blob = await store.exportProject(projectId);
		return Array.from(new Uint8Array(await blob.arrayBuffer()));
	});
	return Buffer.from(bytes);
}

function locatorFor(page, target, bundle) {
	const text = targetText(target, bundle);
	const matcher = () => new RegExp(target.exact ? `^\\s*${escapeRegExp(text)}\\s*$` : escapeRegExp(text), 'i');
	const scope = target.within ? locatorFor(page, target.within, bundle).first() : page;
	let locator;
	if (target.role) locator = scope.getByRole(target.role, text ? { name: matcher() } : {});
	else if (target.label !== undefined || target.labelKey !== undefined) locator = scope.getByLabel(matcher());
	else if (target.text !== undefined || target.textKey !== undefined) locator = scope.getByText(matcher());
	else if (target.placeholder !== undefined || target.placeholderKey !== undefined) locator = scope.getByPlaceholder(matcher());
	else if (target.testid) locator = scope.getByTestId(target.testid);
	else if (target.tour) locator = scope.locator(`[data-tour="${target.tour}"]`);
	else if (target.css) locator = scope.locator(target.css);
	else if (target.node) locator = scope.locator('.react-flow__node').filter({ hasText: new RegExp(escapeRegExp(target.node), 'i') });
	else if (target.handle) {
		locator = locatorFor(page, { node: target.handle.node, nth: target.handle.nth }, bundle).locator(`.react-flow__handle.${target.handle.type}`);
	} else throw new Error(`Unsupported target ${JSON.stringify(target)}`);
	return locator.filter({ visible: true }).nth(target.nth ?? 0);
}

export async function captureAppBeat(session, scenario, scene, view, beat, index, tmpDir, { strings, saveState = null }) {
	const { page } = session;
	const fps = scenario.fps;
	const frameMs = 1000 / fps;
	// pace > 1 slows everything down (cursor, typing, pauses) so each step leaves room for a voice-over.
	const pace = scenario.pace ?? 1;
	const gap = holdFrames((scenario.gap ?? DEFAULT_GAP_SECONDS) * pace, fps);
	const dwell = scenario.captionDwell ?? 0;
	const bundle = strings;
	const cues = [];
	let count = 0;
	let hintUntil = -1;
	let pos = { x: scenario.size[0] * 0.78, y: scenario.size[1] * 0.74, pressed: false };

	const drawCursor = async () => {
		await page.mouse.move(pos.x, pos.y);
		await page.evaluate(({ x, y, pressed }) => window.__hud.moveTo(x, y, pressed), pos);
	};
	const tick = async () => {
		if (hintUntil >= 0 && count >= hintUntil) { hintUntil = -1; await page.evaluate(() => window.__hud.hideHint()); }
		await advance(session, frameMs);
		await settle(session);
		await page.screenshot({ path: path.join(tmpDir, `frame-${padded(count)}.png`) });
		count++;
	};
	const hold = async (frames) => { for (let i = 0; i < frames; i++) await tick(); };
	const box = async (locator) => {
		const found = await locator.boundingBox();
		return found && { x: found.x, y: found.y, width: found.width, height: found.height };
	};

	/** Shows the frames the app needs before `target` exists; fails with the target when it never appears. */
	const find = async (target) => {
		if (target.point) return { rect: { x: target.point[0], y: target.point[1], width: 0, height: 0 }, locator: null };
		const locator = locatorFor(page, target, bundle);
		for (let i = 0; i <= WAIT_LIMIT_SECONDS * fps; i++) {
			if (await locator.isVisible().catch(() => false)) {
				// Targets inside scroll containers (long lists, the palette) are brought into view first.
				await locator.scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => {});
				const rect = await box(locator);
				if (rect) return { rect, locator };
			}
			await tick();
		}
		// Leave the last frame next to the beat output so a broken script can be diagnosed by eye.
		await page.screenshot({ path: path.join(tmpDir, '..', `failure-${beat.id}.png`) }).catch(() => {});
		throw new Error(`Beat "${beat.id}": target not visible after ${WAIT_LIMIT_SECONDS} s: ${JSON.stringify(target)}`);
	};
	const centerOf = (rect, target) => ({ x: rect.x + rect.width / 2 + (target.offset?.[0] || 0), y: rect.y + rect.height / 2 + (target.offset?.[1] || 0) });

	const travel = async (to, step) => {
		const from = { x: pos.x, y: pos.y };
		const frames = moveFrames(Math.hypot(to.x - from.x, to.y - from.y), fps, (step.speed || 1) / pace);
		for (let i = 1; i <= frames; i++) {
			const k = ease(step.ease || 'power2.inOut', i / frames);
			pos = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, pressed: pos.pressed };
			await drawCursor();
			await tick();
		}
	};
	const press = async (pressed) => { pos = { ...pos, pressed }; await drawCursor(); await tick(); };
	const clickAt = async (x, y) => {
		await page.evaluate(({ x, y }) => window.__hud.ripple(x, y), { x, y });
		await press(true);
		await page.mouse.down();
		await press(false);
		await page.mouse.up();
	};

	for (let i = 0; i < beat.steps.length; i++) {
		const step = beat.steps[i];
		const cue = { id: step.id || `s${i + 1}`, kind: step.do, start: count / fps };
		let rect = null;
		const target = step.target || step.from;
		let locator = null;

		if (step.do === 'hold') {
			await hold(holdFrames(step.seconds * pace, fps));
		} else if (step.do === 'wait') {
			({ rect } = await find(step.target));
		} else if (step.do === 'move' || step.do === 'click') {
			({ rect, locator } = await find(step.target));
			const to = centerOf(rect, step.target);
			await travel(to, step);
			cue.at = count / fps;
			if (step.do === 'click') await clickAt(to.x, to.y);
		} else if (step.do === 'type') {
			if (step.target) {
				({ rect, locator } = await find(step.target));
				const to = centerOf(rect, step.target);
				await travel(to, step);
				await clickAt(to.x, to.y);
			}
			cue.at = count / fps;
			// A field that already holds text (a node's default name) is replaced, not appended to.
			if (step.replace && step.target) await page.keyboard.press('Control+A');
			const text = step.textKey ? lookupKey(bundle, step.textKey) : step.text;
			for (const chunk of typeSchedule(text, (step.cps || DEFAULT_CPS) / pace, fps)) {
				if (chunk) await page.keyboard.type(chunk);
				await tick();
			}
		} else if (step.do === 'press') {
			cue.at = count / fps;
			if (step.hint) { await page.evaluate((text) => window.__hud.showHint(text), step.hint); hintUntil = count + holdFrames(step.hintFor ?? DEFAULT_HINT_SECONDS, fps); }
			await page.keyboard.press(step.keys);
			await hold(holdFrames((step.after ?? 0.35) * pace, fps));
		} else if (step.do === 'select') {
			({ rect, locator } = await find(step.target));
			const to = centerOf(rect, step.target);
			await travel(to, step);
			cue.at = count / fps;
			await page.evaluate(({ x, y }) => window.__hud.ripple(x, y), to);
			await press(true);
			await press(false);
			const wanted = step.optionKey ? lookupKey(bundle, step.optionKey) : step.option;
			const index = await locator.evaluate((el, pattern) => [...el.options].findIndex((o) => new RegExp(pattern, 'i').test(o.textContent)), escapeRegExp(wanted));
			if (index < 0) throw new Error(`Beat "${beat.id}": no option matching "${wanted}" in ${JSON.stringify(step.target)}`);
			await locator.selectOption({ index });
		} else if (step.do === 'drag') {
			const source = await find(step.from);
			rect = source.rect;
			const start = centerOf(source.rect, step.from);
			await travel(start, step);
			cue.at = count / fps;
			await press(true);
			await page.mouse.down();
			const destination = await find(step.to);
			const end = centerOf(destination.rect, step.to);
			const frames = moveFrames(Math.hypot(end.x - start.x, end.y - start.y), fps, (step.speed || 1) / pace);
			for (let f = 1; f <= frames; f++) {
				const k = ease(step.ease || 'power2.inOut', f / frames);
				pos = { x: start.x + (end.x - start.x) * k, y: start.y + (end.y - start.y) * k, pressed: true };
				await drawCursor();
				await tick();
			}
			await page.mouse.up();
			await press(false);
		}

		if (step.zoom) {
			const zoomRect = step.zoom.target ? (await find(step.zoom.target)).rect : rect;
			if (!zoomRect) throw new Error(`Beat "${beat.id}": step "${cue.id}" has zoom but no rectangle to zoom to`);
			cue.zoom = { level: step.zoom.level, hold: step.zoom.hold ?? 0, rect: zoomRect };
		}
		// A captioned step lasts long enough to read the caption (or to speak it).
		if (step.caption && dwell > 0) await hold(Math.max(0, holdFrames(dwell, fps) - Math.round((count / fps - cue.start) * fps)));
		cue.end = count / fps;
		if (rect) cue.rect = rect;
		if (step.caption) { cue.caption = step.caption; if (step.captionFor) cue.captionFor = step.captionFor; }
		cues.push(cue);
		if (i < beat.steps.length - 1) await hold(gap);
	}
	await hold(holdFrames((beat.tail ?? 1) * pace, fps));
	return { frames: count, cues };
}
