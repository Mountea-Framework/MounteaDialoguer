// Runs in the real app before any app code (Playwright addInitScript). Prefixed by app-session.mjs with
// `window.__APP_CAPTURE__ = { seed, storage, fontCss }`.
// Makes the real app repeatable: seeded randomness, animations stepped by hand, a visible cursor, a key-hint chip.
(() => {
	const config = window.__APP_CAPTURE__;

	// ---- seeded randomness (node placement, ids, card colours) ----
	let state = config.seed >>> 0;
	const next = () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 4294967296;
	};
	Math.random = next;
	crypto.getRandomValues = (array) => {
		const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
		for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(next() * 256);
		return array;
	};
	crypto.randomUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = Math.floor(next() * 16);
		return (c === 'x' ? r : (r & 3) | 8).toString(16);
	});

	// ---- storage usage shown on the dashboard varies per machine; pin it ----
	if (navigator.storage) navigator.storage.estimate = async () => ({ usage: 26 * 1024, quota: 10 * 1024 * 1024 * 1024 });

	// ---- first-run state: no tours, no sync prompt, fixed theme and language ----
	try {
		for (const [key, value] of Object.entries(config.storage)) localStorage.setItem(key, value);
	} catch { /* storage unavailable: the app still renders */ }

	// ---- animations follow the fake clock: CSS/Web animations are stepped by hand ----
	const virtual = new WeakMap();
	window.__stepAnimations = async (ms) => {
		const fresh = [];
		for (const animation of document.getAnimations()) {
			if (virtual.get(animation) === undefined) { animation.pause(); fresh.push(animation); }
		}
		// pause() only takes effect on the next rendering opportunity; until then the animation still follows the
		// real clock, so wait for it before pinning its time (otherwise the first frames differ by a few pixels).
		await Promise.all(fresh.map((animation) => animation.ready.catch(() => {})));
		for (const animation of document.getAnimations()) {
			let t = virtual.get(animation);
			t = t === undefined ? 0 : t + (fresh.includes(animation) ? 0 : ms);
			virtual.set(animation, t);
			animation.currentTime = t;
			const end = animation.effect?.getComputedTiming().endTime;
			if (Number.isFinite(end) && t >= end) animation.finish();
		}
		return fresh.length;
	};

	// ---- quiet detection: real-time wait until React/IndexedDB/fetch stop touching the DOM ----
	let mutations = 0;
	new MutationObserver((records) => { mutations += records.length; }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
	window.__mutationCount = () => mutations;

	// ---- fonts: the bundled Inter replaces the blocked Google Fonts stylesheet ----
	document.addEventListener('DOMContentLoaded', () => {
		const style = document.createElement('style');
		style.textContent = config.fontCss;
		document.head.appendChild(style);
	});

	// ---- HUD: cursor, click ripple, key hint (part of the captured frames) ----
	const CURSOR = '<svg viewBox="0 0 24 24" width="40" height="40"><path d="M3 2l7 18 2.6-7.4L20 10z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round" /></svg>';
	let cursor = null;
	let hint = null;
	const build = () => {
		if (cursor) return;
		const host = document.createElement('div');
		host.setAttribute('data-capture-hud', '');
		host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;overflow:hidden;';
		cursor = document.createElement('div');
		cursor.style.cssText = 'position:absolute;left:0;top:0;width:40px;height:40px;opacity:0;transform-origin:12% 8%;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45));';
		cursor.innerHTML = CURSOR;
		hint = document.createElement('div');
		hint.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);bottom:112px;padding:10px 18px;border-radius:12px;font:600 26px Inter,system-ui,sans-serif;color:#fff;background:rgba(17,17,17,.88);border:2px solid #f97316;opacity:0;';
		host.append(cursor, hint);
		document.documentElement.appendChild(host);
	};
	window.__hud = {
		ready() { build(); },
		moveTo(x, y, pressed) {
			build();
			cursor.style.opacity = '1';
			cursor.style.transform = `translate(${x}px, ${y}px) scale(${pressed ? 0.85 : 1})`;
		},
		hideCursor() { build(); cursor.style.opacity = '0'; },
		ripple(x, y) {
			build();
			const ring = document.createElement('div');
			ring.style.cssText = `position:absolute;left:${x - 24}px;top:${y - 24}px;width:48px;height:48px;border-radius:50%;border:3px solid #f97316;`;
			cursor.parentElement.appendChild(ring);
			const animation = ring.animate([{ transform: 'scale(.3)', opacity: 0.9 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 450, easing: 'ease-out' });
			animation.finished.then(() => ring.remove(), () => ring.remove());
		},
		showHint(text) { build(); hint.textContent = text; hint.style.opacity = '1'; },
		hideHint() { build(); hint.style.opacity = '0'; },
	};
})();
