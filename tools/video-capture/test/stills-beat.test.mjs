import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { captureScenario, toolRoot } from '../runner/capture.mjs';

/** Decodes an 8-bit RGBA PNG to a raw RGBA buffer. */
function rgbaOf(png) {
	const width = png.readUInt32BE(16);
	const height = png.readUInt32BE(20);
	assert.equal(png[24], 8, 'bit depth');
	assert.equal(png[25], 6, 'colour type RGBA');
	const chunks = [];
	for (let o = 8; o < png.length;) {
		const len = png.readUInt32BE(o);
		if (png.toString('latin1', o + 4, o + 8) === 'IDAT') chunks.push(png.subarray(o + 8, o + 8 + len));
		o += 12 + len;
	}
	const raw = zlib.inflateSync(Buffer.concat(chunks));
	const stride = width * 4;
	const out = Buffer.alloc(stride * height);
	for (let y = 0; y < height; y++) {
		const filter = raw[y * (stride + 1)];
		for (let x = 0; x < stride; x++) {
			const v = raw[y * (stride + 1) + 1 + x];
			const a = x >= 4 ? out[y * stride + x - 4] : 0;
			const b = y ? out[(y - 1) * stride + x] : 0;
			const c = x >= 4 && y ? out[(y - 1) * stride + x - 4] : 0;
			const p = a + b - c;
			const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
			const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
			out[y * stride + x] = (v + [0, a, b, (a + b) >> 1, paeth][filter]) & 255;
		}
	}
	return out;
}

test('theme stills share identical geometry but differ in colour', { timeout: 240000 }, async () => {
	const manifest = await captureScenario({
		id: 'stills', fps: 10, size: [960, 540], language: 'en',
		fixture: 'ExampleProject/OnboardingExample.mnteadlgproj',
		beats: [
			{ id: 'g', kind: 'graph', theme: 'dark', duration: 0.2 },
			{ id: 'theme', kind: 'stills', of: 'g', from: 'dark', to: 'light' },
			{ id: 'theme-hold', kind: 'stills', of: 'g', from: 'dark', to: 'light', duration: 1.2 },
		],
	}, { force: true });
	const entry = manifest.beats.find((b) => b.id === 'theme');
	assert.equal(entry.frames, 1);
	// An optional duration holds the stills on the timeline (the composition plays the morph over it).
	assert.equal(manifest.beats.find((b) => b.id === 'theme-hold').frames, 12);
	assert.equal(entry.kind, 'stills');
	assert.deepEqual(entry.stills, { dark: 'theme/dark.png', light: 'theme/light.png' });
	const dir = path.join(toolRoot, 'out/stills/theme');
	const [dark, light] = await Promise.all([fs.readFile(path.join(dir, 'dark.png')), fs.readFile(path.join(dir, 'light.png'))]);
	assert.notDeepEqual(dark, light);
	const size = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
	assert.deepEqual(size(dark), size(light));
	assert.deepEqual(size(dark), [960, 540]);
	// Same layout: the non-transparent footprint (nodes, edges) coincides pixel for pixel.
	const [dp, lp] = [rgbaOf(dark), rgbaOf(light)];
	const total = 960 * 540;
	let covered = 0, mismatched = 0, common = 0, recoloured = 0;
	for (let i = 0; i < total; i++) {
		const a = dp[i * 4 + 3] > 0, b = lp[i * 4 + 3] > 0;
		if (a) covered++;
		if (a !== b) mismatched++;
		if (a && b) {
			common++;
			const diff = Math.abs(dp[i * 4] - lp[i * 4]) + Math.abs(dp[i * 4 + 1] - lp[i * 4 + 1]) + Math.abs(dp[i * 4 + 2] - lp[i * 4 + 2]);
			if (diff > 30) recoloured++;
		}
	}
	assert.ok(covered > 1000, 'stills contain graph content');
	assert.ok(covered < 0.9 * total, `background must stay transparent (covered ${covered} of ${total} px)`);
	assert.ok(mismatched / covered < 0.02, `footprints differ: ${mismatched} of ${covered} px`);
	assert.ok(recoloured / common > 0.5, `theme must change colours (${recoloured} of ${common} px recoloured)`);
});
