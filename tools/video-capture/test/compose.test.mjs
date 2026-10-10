import test from 'node:test';
import assert from 'node:assert/strict';
import { buildComposition } from '../compose/build.mjs';

const manifest = {
	version: 1, scenario: 's', fps: 30, size: [1920, 1080], totalFrames: 54, language: 'en',
	beats: [
		{ id: 'graph-reveal', kind: 'graph', theme: 'dark', frames: 30, startFrame: 0, duration: 1, pattern: 'graph-reveal/frame-%04d.png', tracks: {} },
		{ id: 'theme', kind: 'stills', theme: 'dark', frames: 1, startFrame: 30, duration: 1 / 30, stills: { dark: 'theme/dark.png', light: 'theme/light.png' } },
		{ id: 'drag', kind: 'graph', theme: 'light', frames: 24, startFrame: 31, duration: 0.8, pattern: 'drag/frame-%04d.png', tracks: { sell: [[100, 200, 250, 124], [110, 190, 250, 124]] } },
	],
};
const design = {
	background: { dark: '#0d0d0d', light: '#f5f4f0' },
	music: { src: 'assets/music/bed.mp3', volume: 0.3, fadeIn: 0.6, fadeOut: 1 },
	captions: [{ text: 'Branch. Loop. Return. Done.', at: 0.2, until: 0.9 }],
	themeToggle: { x: 1802, y: 84, w: 132, h: 64 },
	cursor: [{ at: 0.1, to: { track: 'drag:sell', offset: [-40, -18] }, duration: 0.3 }],
	sfx: [{ src: 'assets/sfx/click_002.ogg', at: 1.0, duration: 0.2, volume: 0.12 }],
	endCard: { at: 1.5, duration: 1, title: 'Mountea Dialoguer', tagline: 'Dialogue manager made easy.', logo: 'assets/img/logo.png' },
};

test('buildComposition emits a standalone HyperFrames root sized to the manifest', () => {
	const html = buildComposition({ manifest, design, mode: 'webm' });
	assert.match(html, /data-composition-id="brag"/);
	assert.match(html, /data-width="1920"/);
	assert.match(html, /data-height="1080"/);
	assert.match(html, /window\.__timelines\["brag"\]/);
	assert.doesNotMatch(html, /<template/);
});

test('every beat becomes a timed clip at its start frame; stills become two stacked images', () => {
	const html = buildComposition({ manifest, design, mode: 'webm' });
	assert.match(html, /id="beat-graph-reveal"[^>]*data-start="0"[^>]*data-duration="1"/);
	assert.match(html, /id="beat-drag"[^>]*data-start="1.0333/);
	assert.match(html, /id="still-theme-dark"/);
	assert.match(html, /id="still-theme-light"/);
});

test('the root duration covers the end card and music fades are carried over', () => {
	const html = buildComposition({ manifest, design, mode: 'webm' });
	assert.match(html, /data-composition-id="brag"[^>]*data-duration="2.5"/);
	assert.match(html, /data-fade-in="0.6"/);
	assert.match(html, /data-fade-out="1"/);
});

test('cursor waypoints resolve manifest tracks to screen coordinates', () => {
	// Rule: x = track centre x + offset[0], y = track centre y + offset[1], using the first sample of the beat.
	// Track "drag:sell" starts at [100, 200]; offset [-40, -18] gives (60, 182).
	const html = buildComposition({ manifest, design, mode: 'webm' });
	assert.match(html, /x: 60/);
	assert.match(html, /y: 182/);
});

test('an unknown cursor track fails with the available tracks', () => {
	const bad = { ...design, cursor: [{ at: 0, to: { track: 'drag:ghost' }, duration: 0.2 }] };
	assert.throws(() => buildComposition({ manifest, design: bad, mode: 'webm' }), /Unknown track "drag:ghost".*drag:sell/s);
});

test('a clicked ui waypoint resolves design.ui and can flash the clicked chip', () => {
	const withUi = { ...design, ui: { autoLayout: [360, 1006] }, cursor: [{ at: 0.2, to: { ui: 'autoLayout' }, duration: 0.5, press: true, flash: 'chip-autoLayout' }] };
	const html = buildComposition({ manifest, design: withUi, mode: 'webm' });
	assert.match(html, /tl\.to\("#cursor", \{ x: 360, y: 1006, duration: 0\.5/);
	assert.match(html, /tl\.to\("#chip-autoLayout", \{ backgroundColor: "#f97316"[^)]*\}, 0\.72\)/);
});
