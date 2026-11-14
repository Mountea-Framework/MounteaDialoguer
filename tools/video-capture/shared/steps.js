// Step language for `app` beats: scripted interaction with the real app.
// Pure helpers only (validation, timing, i18n target text), so they can be unit tested without a browser.
import { EASES } from './ease.js';

export const STEP_KINDS = ['hold', 'move', 'click', 'type', 'press', 'drag', 'select', 'wait'];

/** Keys a target may use to find an element. Exactly one is required. */
export const TARGET_KEYS = ['role', 'label', 'labelKey', 'text', 'textKey', 'placeholder', 'placeholderKey', 'testid', 'tour', 'css', 'node', 'handle', 'point'];
const NAMED = ['name', 'nameKey'];

/** Seconds the cursor needs for a move: short hops are quick, long travels settle slower. */
export function moveSeconds(distance, speed = 1) {
	const base = Math.min(1.1, Math.max(0.3, 0.28 + distance / 1800));
	return base / speed;
}

export const moveFrames = (distance, fps, speed = 1) => Math.max(1, Math.round(moveSeconds(distance, speed) * fps));

export const holdFrames = (seconds, fps) => Math.max(1, Math.round(seconds * fps));

/** Characters to emit on each frame so `text` is typed at `cps` characters per second. */
export function typeSchedule(text, cps, fps) {
	const chars = [...text];
	const schedule = [];
	let sent = 0;
	for (let frame = 0; sent < chars.length; frame++) {
		const upTo = Math.min(chars.length, Math.floor(((frame + 1) * cps) / fps));
		schedule.push(chars.slice(sent, upTo).join(''));
		sent = upTo;
	}
	return schedule;
}

/** Looks a dotted i18n key up in a locale bundle. Throws, naming the key, so scripts fail loudly when a label disappears. */
export function lookupKey(bundle, key) {
	let node = bundle;
	for (const part of key.split('.')) node = node?.[part];
	if (typeof node !== 'string') throw new Error(`Unknown translation key "${key}"`);
	return node;
}

/** i18n text usable as a matcher: anything from the first interpolation on is dropped. */
export function matcherText(value) {
	const cut = value.indexOf('{{');
	return (cut >= 0 ? value.slice(0, cut) : value).trim();
}

/** Text a target looks for ("" when it has none), resolving `*Key` entries against a locale bundle. */
export function targetText(target, bundle) {
	const direct = target.name ?? target.label ?? target.text ?? target.placeholder;
	if (typeof direct === 'string') return direct;
	const key = target.nameKey ?? target.labelKey ?? target.textKey ?? target.placeholderKey;
	if (typeof key === 'string') return matcherText(lookupKey(bundle, key));
	return '';
}

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

export function validateTarget(target, at, problems, { allowPoint = true } = {}) {
	if (!isObject(target)) { problems.push(`${at}: target must be an object`); return; }
	const present = TARGET_KEYS.filter((k) => target[k] !== undefined);
	if (present.length !== 1) { problems.push(`${at}: target needs exactly one of ${TARGET_KEYS.join(', ')} (got ${present.join(', ') || 'none'})`); return; }
	const key = present[0];
	if (key === 'role') {
		if (typeof target.role !== 'string' || !target.role) problems.push(`${at}: target.role must be a string`);
		if (target.name !== undefined && target.nameKey !== undefined) problems.push(`${at}: target may have name or nameKey, not both`);
	} else if (key === 'point') {
		if (!allowPoint) problems.push(`${at}: point targets are not allowed here`);
		else if (!Array.isArray(target.point) || target.point.length !== 2 || target.point.some((n) => typeof n !== 'number')) problems.push(`${at}: target.point must be [x, y]`);
	} else if (key === 'handle') {
		const h = target.handle;
		if (!isObject(h) || typeof h.node !== 'string' || !['source', 'target'].includes(h.type)) problems.push(`${at}: target.handle must be { node: label, type: 'source' | 'target' }`);
	} else if (typeof target[key] !== 'string' || !target[key]) {
		problems.push(`${at}: target.${key} must be a non-empty string`);
	}
	if (target.nth !== undefined && !(Number.isInteger(target.nth) && target.nth >= 0)) problems.push(`${at}: target.nth must be an integer >= 0`);
	if (target.within !== undefined) validateTarget(target.within, `${at}.within`, problems, { allowPoint: false });
	for (const k of Object.keys(target)) {
		if (![...TARGET_KEYS, ...NAMED, 'nth', 'within', 'exact', 'offset', 'vars'].includes(k)) problems.push(`${at}: unknown target key "${k}"`);
	}
}

/** Every i18n key a step list refers to (for the script lint). */
export function collectKeys(steps) {
	const keys = [];
	const fromTarget = (target) => {
		if (!isObject(target)) return;
		for (const k of ['nameKey', 'labelKey', 'textKey', 'placeholderKey']) if (typeof target[k] === 'string') keys.push(target[k]);
		fromTarget(target.within);
	};
	for (const step of steps) {
		fromTarget(step.target); fromTarget(step.from); fromTarget(step.to);
		if (typeof step.optionKey === 'string') keys.push(step.optionKey);
		if (typeof step.textKey === 'string') keys.push(step.textKey);
	}
	return [...new Set(keys)];
}

export function validateSteps(steps, beatAt = 'steps') {
	const problems = [];
	if (!Array.isArray(steps) || steps.length === 0) return [`${beatAt}: must be a non-empty array`];
	const seen = new Set();
	steps.forEach((step, i) => {
		const at = `${beatAt}[${i}]${step?.id ? ` (${step.id})` : ''}`;
		if (!isObject(step)) { problems.push(`${at}: must be an object`); return; }
		if (step.id !== undefined) {
			if (typeof step.id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/i.test(step.id)) problems.push(`${at}: id must match /^[a-z0-9][a-z0-9_-]*$/i`);
			else if (seen.has(step.id)) problems.push(`${at}: duplicate id`);
			else seen.add(step.id);
		}
		if (!STEP_KINDS.includes(step.do)) { problems.push(`${at}: do must be one of ${STEP_KINDS.join(', ')}`); return; }
		if (step.caption !== undefined && (typeof step.caption !== 'string' || !step.caption)) problems.push(`${at}: caption must be a non-empty string`);
		if (step.captionFor !== undefined && !(step.captionFor > 0)) problems.push(`${at}: captionFor must be > 0 seconds`);
		if (step.zoom !== undefined && !(step.zoom?.level > 1)) problems.push(`${at}: zoom needs { level > 1 }`);
		if (step.speed !== undefined && !(step.speed > 0)) problems.push(`${at}: speed must be > 0`);
		if (step.ease !== undefined && !EASES.includes(step.ease)) problems.push(`${at}: unknown ease "${step.ease}"`);
		switch (step.do) {
			case 'hold':
				if (!(step.seconds > 0)) problems.push(`${at}: hold needs seconds > 0`);
				break;
			case 'move': case 'click': case 'wait':
				validateTarget(step.target, `${at}.target`, problems);
				break;
			case 'type':
				if (typeof step.text !== 'string' || !step.text) problems.push(`${at}: type needs text`);
				if (step.cps !== undefined && !(step.cps > 0)) problems.push(`${at}: cps must be > 0`);
				if (step.replace !== undefined && typeof step.replace !== 'boolean') problems.push(`${at}: replace must be true or false`);
				if (step.target !== undefined) validateTarget(step.target, `${at}.target`, problems, { allowPoint: false });
				break;
			case 'press':
				if (typeof step.keys !== 'string' || !step.keys) problems.push(`${at}: press needs keys (e.g. "Control+S")`);
				break;
			case 'drag':
				validateTarget(step.from, `${at}.from`, problems);
				validateTarget(step.to, `${at}.to`, problems);
				break;
			case 'select':
				validateTarget(step.target, `${at}.target`, problems, { allowPoint: false });
				if (typeof step.option !== 'string' && typeof step.optionKey !== 'string') problems.push(`${at}: select needs option or optionKey`);
				break;
			default:
		}
	});
	return problems;
}
