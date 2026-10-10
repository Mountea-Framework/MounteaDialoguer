// Turns a captured manifest plus video-design.json into a HyperFrames composition (compose/index.html).
//
// Layer modes (decided by the Task 7 spike, see the README):
//  - 'webm'   (default): each frame-sequence beat is one transparent VP9 WebM (yuva420p) in a <video> clip.
//             HyperFrames 0.8.145 keeps the alpha channel in both `snapshot` and `render`, and seeks the clip per frame.
//  - 'images' (fallback): one <img> per beat whose src is swapped from a GSAP onUpdate (frames preloaded first).
//
// compose/hyperframes.json sets media.autoProxy to false on purpose: the preview proxy transcodes the beat WebMs
// to H.264 (yuv420p, no alpha), so Studio preview would show a different video than the render. The alpha WebM
// path stays authoritative in preview, snapshot and render.
//
// Music is user-supplied and not committed (assets/music/ is git-ignored): when design.music.src is missing,
// buildProject warns and builds without the music track.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = fs.readFileSync(path.join(here, 'template.html'), 'utf8');

export const MODES = ['webm', 'images'];
export const DEFAULT_MODE = 'webm';

/** Colours of the HyperFrames-drawn chrome (captions, toggle, toolbar, end card), mirroring the app themes. */
const THEMES = {
	dark: {
		bgc: '#0d0d0d', dots: '#2a2a2a', border: '#333333', chipBg: '#1a1a1a', chipText: '#e6e6e6',
		capBg: 'rgba(13,13,13,0.86)', capText: '#ffffff', accentText: '#f97316', knobBg: '#2f2f2f', knobFg: '#e5e5e5',
	},
	light: {
		bgc: '#f5f4f0', dots: '#cdcbc3', border: '#cfcdc6', chipBg: '#ffffff', chipText: '#262626',
		capBg: 'rgba(255,255,255,0.92)', capText: '#111111', accentText: '#c2410c', knobBg: '#fef3c7', knobFg: '#b45309',
	},
};

const CURSOR_SVG = '<svg viewBox="0 0 24 24" width="44" height="44"><path d="M3 2l7 18 2.6-7.4L20 10z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round" /></svg>';
const TOGGLE_ICON = `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
					<defs><mask id="moonMask"><rect x="0" y="0" width="24" height="24" fill="#fff" /><circle id="moonCut" cx="17" cy="8" r="6.2" fill="#000" /></mask></defs>
					<circle id="sunBody" cx="12" cy="12" r="8" fill="currentColor" mask="url(#moonMask)" />
					<g id="rays" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0">
						<line x1="12" y1="1.2" x2="12" y2="3.4" /><line x1="12" y1="20.6" x2="12" y2="22.8" />
						<line x1="1.2" y1="12" x2="3.4" y2="12" /><line x1="20.6" y1="12" x2="22.8" y2="12" />
						<line x1="4.4" y1="4.4" x2="5.9" y2="5.9" /><line x1="18.1" y1="18.1" x2="19.6" y2="19.6" />
						<line x1="4.4" y1="19.6" x2="5.9" y2="18.1" /><line x1="18.1" y1="5.9" x2="19.6" y2="4.4" />
					</g>
				</svg>`;

/** Seconds as a short decimal string (4 places), e.g. 31/30 -> "1.0333". */
const sec = (n) => String(Math.round(n * 10000) / 10000);
const px = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const js = (v) => JSON.stringify(v);
const cssVars = (theme) => Object.fromEntries(Object.entries(theme).map(([k, v]) => [`--${k}`, v]));
const varStyle = (theme) => Object.entries(cssVars(theme)).map(([k, v]) => `${k}: ${v}`).join('; ');

function beatTimes(manifest) {
	return manifest.beats.map((beat) => ({ beat, start: beat.startFrame / manifest.fps, duration: beat.duration }));
}

/** Every reference a cursor waypoint may use, as "beatId:key" (node ids and their labels). */
function trackIndex(manifest) {
	const refs = [];
	for (const beat of manifest.beats) {
		for (const id of Object.keys(beat.tracks || {})) {
			refs.push({ ref: `${beat.id}:${id}`, beat, id });
			const label = beat.trackLabels?.[id];
			if (label) refs.push({ ref: `${beat.id}:${label}`, beat, id });
		}
	}
	return refs;
}

/** Screen position for a waypoint target, sampled at the frame the cursor arrives. */
function resolveTarget(to, arrival, manifest, design) {
	if (Array.isArray(to)) return { x: to[0], y: to[1] };
	if (to?.ui) {
		const p = design.ui?.[to.ui];
		if (!p) throw new Error(`Unknown ui target "${to.ui}". Available: ${Object.keys(design.ui || {}).join(', ') || '(none)'}`);
		return { x: p[0] + (to.offset?.[0] || 0), y: p[1] + (to.offset?.[1] || 0) };
	}
	if (to?.track) {
		const refs = trackIndex(manifest);
		const wanted = String(to.track).trim().toLowerCase();
		const hit = refs.find((r) => r.ref.toLowerCase() === wanted);
		if (!hit) throw new Error(`Unknown track "${to.track}". Available: ${refs.map((r) => r.ref).join(', ') || '(none)'}`);
		const samples = hit.beat.tracks[hit.id];
		const start = hit.beat.startFrame / manifest.fps;
		const i = Math.min(samples.length - 1, Math.max(0, Math.round((arrival - start) * manifest.fps)));
		const sample = samples[i] || samples.find(Boolean);
		if (!sample) throw new Error(`Track "${to.track}" has no visible samples`);
		return { x: sample[0] + (to.offset?.[0] || 0), y: sample[1] + (to.offset?.[1] || 0) };
	}
	throw new Error(`Cursor target must be [x, y], { track } or { ui } (got ${js(to)})`);
}

function beatMarkup(entry, index, mode, size, themeOf) {
	const { beat, start, duration } = entry;
	const timing = `data-start="${sec(start)}" data-duration="${sec(duration)}" data-track-index="${index + 1}"`;
	if (beat.kind === 'stills') {
		const [from, to] = Object.keys(beat.stills);
		return `		<div id="beat-${beat.id}" class="clip layer" ${timing}>
			<img id="still-${beat.id}-${from}" class="still" src="assets/beats/${beat.id}-${from}.png" alt="">
			<div id="reveal-${beat.id}" class="reveal" style="clip-path: circle(0px at 0px 0px)">
				<div class="backdrop" style="${varStyle(themeOf(to))}; background: var(--bgc)"><div class="grid"></div></div>
				<img id="still-${beat.id}-${to}" class="still" src="assets/beats/${beat.id}-${to}.png" alt="">
			</div>
		</div>`;
	}
	if (mode === 'images') {
		return `		<img id="beat-${beat.id}" class="clip layer" ${timing} src="assets/beats/${beat.id}/frame-0001.png" alt="" width="${size[0]}" height="${size[1]}">`;
	}
	return `		<video id="beat-${beat.id}" class="clip layer" ${timing} muted playsinline src="assets/beats/${beat.id}.webm"></video>`;
}

/**
 * Pure: returns the full index.html for a manifest and a video design.
 * @param {{ manifest: object, design: object, mode?: 'webm' | 'images', compositionId?: string, withMusic?: boolean }} options
 *   withMusic: false omits the music track (used when the user-supplied music file is absent).
 */
export function buildComposition({ manifest, design, mode = DEFAULT_MODE, compositionId = 'brag', withMusic = true }) {
	if (!MODES.includes(mode)) throw new Error(`Unknown mode "${mode}". Use one of ${MODES.join(', ')}`);
	const [width, height] = manifest.size;
	const fps = manifest.fps;
	const endCard = design.endCard;
	const total = Math.max(manifest.totalFrames / fps, endCard ? endCard.at + endCard.duration : 0);
	const beats = beatTimes(manifest);
	const stillsBeat = beats.find((b) => b.beat.kind === 'stills');
	const firstTheme = manifest.beats.find((b) => b.kind !== 'stills')?.theme || 'dark';
	const themeOf = (name) => ({ ...THEMES[name], bgc: design.background?.[name] || THEMES[name].bgc });
	const startTheme = themeOf(firstTheme);

	const body = [];
	const script = [];
	const tl = (line) => script.push(`			${line}`);

	// ---------- markup ----------
	body.push(`		<div id="bg" class="backdrop" style="--bgc: ${startTheme.bgc}; --dots: ${startTheme.dots}"><div class="grid"></div></div>`);
	beats.forEach((entry, i) => body.push(beatMarkup(entry, i, mode, manifest.size, themeOf)));

	(design.captions || []).forEach((c, i) => {
		let text = esc(c.text);
		if (c.emphasis) text = text.replace(esc(c.emphasis), `<em>${esc(c.emphasis)}</em>`);
		body.push(`		<div id="caption-${i}" class="caption"><span>${text}</span></div>`);
	});

	const toolbar = design.toolbar;
	if (toolbar) {
		const chips = toolbar.chips.map((c, i) => `<div id="chip-${c.id || i}" class="chip${c.primary ? ' primary' : ''}"${c.color ? ` style="border-color: ${c.color}"` : ''}>${esc(c.label)}</div>`).join('');
		body.push(`		<div id="toolbar" class="toolbar" style="top: ${toolbar.top}px">${chips}</div>`);
	}

	const toggle = design.themeToggle;
	if (toggle) {
		body.push(`		<div id="ring" class="ring" style="left: ${toggle.x}px; top: ${toggle.y}px"></div>
		<div id="toggle" class="toggle" style="left: ${toggle.x - toggle.w / 2}px; top: ${toggle.y - toggle.h / 2}px; width: ${toggle.w}px; height: ${toggle.h}px">
			<div id="knob" class="knob">
				${TOGGLE_ICON}
			</div>
		</div>`);
	}

	if (design.cursor?.length) body.push(`		<div id="cursor" class="cursor">${CURSOR_SVG}</div>`);

	if (endCard) {
		body.push(`		<div id="endcard" class="clip layer endcard" data-start="${sec(endCard.at)}" data-duration="${sec(endCard.duration)}" data-track-index="${beats.length + 1}">
			<div id="end-backdrop" class="backdrop" style="background: var(--bgc)"><div class="grid"></div></div>
			<div id="halo" class="halo"></div>
			<div class="endblock">
				<img id="logo" src="${esc(endCard.logo)}" alt="">
				<h1 id="end-title">${esc(endCard.title)}</h1>
				<h2 id="end-tagline">${esc(endCard.tagline)}</h2>
			</div>
		</div>`);
	}

	const music = withMusic ? design.music : null;
	if (music) {
		body.push(`		<audio id="music" src="${esc(music.src)}" data-start="0" data-duration="${sec(total)}" data-track-index="20" data-volume="${music.volume}" data-fade-in="${music.fadeIn}" data-fade-out="${music.fadeOut}"></audio>`);
	}
	(design.sfx || []).forEach((s, i) => {
		body.push(`		<audio id="sfx-${i}" src="${esc(s.src)}" data-start="${sec(s.at)}" data-duration="${sec(s.duration)}" data-track-index="${21 + i}" data-volume="${s.volume}"></audio>`);
	});

	// ---------- timeline ----------
	tl(`const tl = gsap.timeline({ paused: true });`);
	// Chrome colours only: the page background (--bgc/--dots) flips separately, hidden under the reveal.
	const chrome = (name) => { const { bgc, dots, ...rest } = themeOf(name); return cssVars(rest); };
	tl(`const LIGHT = ${js(chrome('light'))};`);
	tl(`const DARK = ${js(chrome('dark'))};`);

	(design.captions || []).forEach((c, i) => {
		tl(`tl.fromTo("#caption-${i}", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out", immediateRender: false }, ${sec(c.at)});`);
		tl(`tl.to("#caption-${i}", { opacity: 0, duration: 0.3, ease: "power1.in" }, ${sec(Math.max(c.at + 0.4, c.until - 0.3))});`);
	});

	if (toolbar) {
		toolbar.chips.forEach((c, i) => {
			tl(`tl.fromTo("#chip-${c.id || i}", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.6)", immediateRender: false }, ${sec(toolbar.at + i * (toolbar.stagger ?? 0.12))});`);
		});
	}
	if (toggle) tl(`tl.fromTo("#toggle", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.6)", immediateRender: false }, ${sec(toggle.at ?? 0)});`);

	if (stillsBeat) {
		const { beat, start } = stillsBeat;
		const [from, to] = Object.keys(beat.stills);
		const reveal = design.reveal?.duration ?? 1;
		const cx = toggle ? toggle.x : width;
		const cy = toggle ? toggle.y : 0;
		const radius = Math.max(2400, Math.ceil(Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy)) + 40));
		const FROM = from === 'light' ? 'LIGHT' : 'DARK';
		const TO = to === 'light' ? 'LIGHT' : 'DARK';
		// Circular reveal of the "to" still (and its backdrop) from the toggle centre.
		tl(`tl.fromTo("#reveal-${beat.id}", { clipPath: "circle(0px at ${cx}px ${cy}px)" }, { clipPath: "circle(${radius}px at ${cx}px ${cy}px)", duration: ${reveal}, ease: "power2.inOut" }, ${sec(start)});`);
		// Chrome text flips theme the moment the circle's edge reaches it (no mid-morph low-contrast frames):
		// invert power2.inOut to find when the radius reaches the element's centre.
		const reach = (x, y) => {
			const f = Math.min(1, Math.hypot(x - cx, y - cy) / radius);
			const u = f < 0.5 ? Math.sqrt(f / 2) : 1 - Math.sqrt((1 - f) / 2);
			return start + u * reveal;
		};
		if (toolbar) tl(`tl.fromTo("#toolbar", ${FROM}, { ...${TO}, duration: 0.05, immediateRender: false }, ${sec(reach(width / 2, toolbar.top + 30))});`);
		(design.captions || []).forEach((_, i) => tl(`tl.fromTo("#caption-${i}", ${FROM}, { ...${TO}, duration: 0.05, immediateRender: false }, ${sec(reach(width / 2, 100))});`));
		// The page background and the end card follow once the circle covers the whole frame.
		tl(`tl.set("#root", { ...${TO}, "--bgc": ${js(themeOf(to).bgc)}, "--dots": ${js(themeOf(to).dots)} }, ${sec(start + reveal)});`);
		tl(`tl.set("#bg", { "--bgc": ${js(themeOf(to).bgc)}, "--dots": ${js(themeOf(to).dots)} }, ${sec(start + reveal)});`);
		if (toggle) {
			tl(`tl.fromTo("#toggle", ${FROM}, { ...${TO}, duration: 0.6, ease: "power2.inOut", immediateRender: false }, ${sec(start)});`);
			const knobTravel = toggle.w - 64;
			tl(`tl.to("#knob", { x: ${knobTravel}, duration: 0.6, ease: "power3.inOut" }, ${sec(start)});`);
			tl(`tl.to("#sunBody", { attr: { r: 5.4 }, duration: 0.6, ease: "power3.inOut" }, ${sec(start)});`);
			tl(`tl.to("#moonCut", { attr: { cx: 30, cy: -6 }, duration: 0.6, ease: "power3.inOut" }, ${sec(start)});`);
			tl(`tl.fromTo("#rays", { opacity: 0, scale: 0.3, rotation: -60, svgOrigin: "12 12" }, { opacity: 1, scale: 1, rotation: 0, svgOrigin: "12 12", duration: 0.7, ease: "back.out(1.8)", immediateRender: false }, ${sec(start + 0.13)});`);
			tl(`tl.fromTo("#ring", { opacity: 0.9, width: 0, height: 0, xPercent: -50, yPercent: -50 }, { width: 4400, height: 4400, duration: 1, ease: "power2.out", immediateRender: false }, ${sec(start)});`);
			tl(`tl.to("#ring", { opacity: 0, duration: 0.6, ease: "power1.in" }, ${sec(start + 0.4)});`);
		}
	}

	if (design.cursor?.length) {
		const [sx, sy] = design.cursorStart || [width * 0.78, height * 0.74];
		const first = design.cursor[0];
		tl(`tl.set("#cursor", { x: ${px(sx)}, y: ${px(sy)}, transformOrigin: "12% 8%" }, 0);`);
		tl(`tl.to("#cursor", { opacity: 1, duration: 0.2 }, ${sec(Math.max(0, first.at - 0.2))});`);
		for (const w of design.cursor) {
			const arrival = w.at + w.duration;
			const { x, y } = resolveTarget(w.to, arrival, manifest, design);
			tl(`tl.to("#cursor", { x: ${px(x)}, y: ${px(y)}, duration: ${sec(w.duration)}, ease: ${js(w.ease || 'power2.inOut')} }, ${sec(w.at)});`);
			if (w.press === true) tl(`tl.to("#cursor", { scale: 0.85, duration: 0.08, yoyo: true, repeat: 1 }, ${sec(arrival)});`);
			else if (w.press === 'down') tl(`tl.to("#cursor", { scale: 0.85, duration: 0.08 }, ${sec(arrival)});`);
			else if (w.press === 'up') tl(`tl.to("#cursor", { scale: 1, duration: 0.1 }, ${sec(arrival)});`);
			// Click feedback on composition-drawn chrome (e.g. the Auto Layout chip fills orange).
			if (w.flash) tl(`tl.to(${js(`#${w.flash}`)}, { backgroundColor: "#f97316", borderColor: "#f97316", color: "#111111", duration: 0.15 }, ${sec(arrival + 0.02)});`);
		}
		const hideAt = design.cursorHide ?? (endCard ? endCard.at : total - 0.3);
		tl(`tl.to("#cursor", { opacity: 0, duration: 0.2 }, ${sec(hideAt)});`);
	}

	if (endCard) {
		const a = endCard.at;
		const chromeIds = [toolbar && '#toolbar', toggle && '#toggle'].filter(Boolean);
		if (chromeIds.length) tl(`tl.to(${js(chromeIds)}, { opacity: 0, duration: 0.3, ease: "power1.in" }, ${sec(a)});`);
		tl(`tl.to("#end-backdrop", { opacity: 1, duration: 0.4, ease: "power2.out" }, ${sec(a)});`);
		tl(`tl.to("#halo", { opacity: 1, duration: 0.8 }, ${sec(a + 0.3)});`);
		tl(`tl.fromTo("#logo", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", immediateRender: false }, ${sec(a + 0.3)});`);
		tl(`tl.fromTo("#end-title", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", immediateRender: false }, ${sec(a + 0.4)});`);
		tl(`tl.fromTo("#end-tagline", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", immediateRender: false }, ${sec(a + 0.8)});`);
	}

	if (mode === 'images') {
		// Fallback: swap each beat's <img> src per frame; preload every frame before registering the timeline.
		const sequences = beats.filter((b) => b.beat.kind !== 'stills').map(({ beat, start, duration }) => ({ id: beat.id, frames: beat.frames, start: Number(sec(start)), duration: Number(sec(duration)) }));
		tl(`const SEQUENCES = ${js(sequences)};`);
		tl(`const frameSrc = (id, i) => "assets/beats/" + id + "/frame-" + String(i + 1).padStart(4, "0") + ".png";`);
		tl(`const preload = [];`);
		tl(`for (const s of SEQUENCES) {`);
		tl(`	const img = document.getElementById("beat-" + s.id);`);
		tl(`	for (let i = 0; i < s.frames; i++) preload.push(new Promise((done) => { const im = new Image(); im.onload = im.onerror = done; im.src = frameSrc(s.id, i); }));`);
		tl(`	const head = { f: 0 };`);
		tl(`	tl.fromTo(head, { f: 0 }, { f: s.frames - 1, duration: s.duration, ease: "none", onUpdate: () => { img.src = frameSrc(s.id, Math.round(head.f)); } }, s.start);`);
		tl(`}`);
		tl(`Promise.all(preload).then(() => { window.__timelines[${js(compositionId)}] = tl; tl.seek(0); });`);
	} else {
		tl(`window.__timelines[${js(compositionId)}] = tl;`);
		tl(`tl.seek(0);`);
	}

	const root = `		<div id="root" data-composition-id="${compositionId}" data-start="0" data-duration="${sec(total)}" data-width="${width}" data-height="${height}" style="${varStyle(startTheme)}">
${body.map((l) => `\t${l}`).join('\n')}
		</div>`;
	return TEMPLATE
		.replaceAll('{{WIDTH}}', String(width))
		.replaceAll('{{HEIGHT}}', String(height))
		.replaceAll('{{BODY_BG}}', startTheme.bgc)
		.replace('{{BODY}}', () => root)
		.replace('{{SCRIPT}}', () => script.join('\n'));
}

/** CLI: encode captured beats, copy stills, write compose/index.html. */
export function buildProject({ scenario = 'brag', mode = DEFAULT_MODE, toolRoot = path.resolve(here, '..') } = {}) {
	const out = path.join(toolRoot, 'out', scenario);
	const composeDir = path.join(toolRoot, 'compose');
	const manifestFile = path.join(out, 'manifest.json');
	if (!fs.existsSync(manifestFile)) throw new Error(`No manifest at ${manifestFile}; run "node runner/cli.mjs --scenario ${scenario}" first`);
	const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
	const design = JSON.parse(fs.readFileSync(path.join(composeDir, 'video-design.json'), 'utf8'));
	const beatsDir = path.join(composeDir, 'assets', 'beats');
	fs.rmSync(beatsDir, { recursive: true, force: true });
	fs.mkdirSync(beatsDir, { recursive: true });
	for (const beat of manifest.beats) {
		if (beat.kind === 'stills') {
			for (const [theme, rel] of Object.entries(beat.stills)) fs.copyFileSync(path.join(out, rel), path.join(beatsDir, `${beat.id}-${theme}.png`));
		} else if (mode === 'images') {
			fs.cpSync(path.join(out, beat.dir), path.join(beatsDir, beat.id), { recursive: true });
		} else {
			execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(manifest.fps), '-i', path.join(out, beat.dir, 'frame-%04d.png'), '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-b:v', '0', '-crf', '24', path.join(beatsDir, `${beat.id}.webm`)], { stdio: 'inherit' });
		}
	}
	const withMusic = !design.music || fs.existsSync(path.join(composeDir, design.music.src));
	if (!withMusic) console.warn(`music "${design.music.src}" not found; building without music. Put an audio file there to enable it.`);
	const html = buildComposition({ manifest, design, mode, withMusic });
	fs.writeFileSync(path.join(composeDir, 'index.html'), html);
	return { manifest, file: path.join(composeDir, 'index.html') };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const args = process.argv.slice(2);
	const opt = (name, fallback) => {
		const i = args.indexOf(`--${name}`);
		return i >= 0 ? args[i + 1] : fallback;
	};
	const { file, manifest } = buildProject({ scenario: opt('scenario', 'brag'), mode: opt('mode', DEFAULT_MODE) });
	console.log(`Wrote ${path.relative(process.cwd(), file)} (${manifest.beats.length} beats, ${(manifest.totalFrames / manifest.fps).toFixed(2)} s captured)`);
}
