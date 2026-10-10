import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { captureScenario, toolRoot } from '../runner/capture.mjs';

/** Decodes an 8-bit RGBA PNG and returns its alpha channel (enough to compare footprints). */
function alphaOf(png) {
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
	const alpha = new Uint8Array(width * height);
	for (let i = 0; i < alpha.length; i++) alpha[i] = out[i * 4 + 3];
	return alpha;
}

test('theme stills share identical geometry but differ in colour', { timeout: 240000 }, async () => {
	const manifest = await captureScenario({
		id: 'stills', fps: 10, size: [960, 540], language: 'en',
		fixture: 'ExampleProject/OnboardingExample.mnteadlgproj',
		beats: [
			{ id: 'g', kind: 'graph', theme: 'dark', duration: 0.2 },
			{ id: 'theme', kind: 'stills', of: 'g', from: 'dark', to: 'light' },
		],
	}, { force: true });
	const entry = manifest.beats.find((b) => b.id === 'theme');
	assert.equal(entry.frames, 1);
	assert.equal(entry.kind, 'stills');
	assert.deepEqual(entry.stills, { dark: 'theme/dark.png', light: 'theme/light.png' });
	const dir = path.join(toolRoot, 'out/stills/theme');
	const [dark, light] = await Promise.all([fs.readFile(path.join(dir, 'dark.png')), fs.readFile(path.join(dir, 'light.png'))]);
	assert.notDeepEqual(dark, light);
	const size = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
	assert.deepEqual(size(dark), size(light));
	assert.deepEqual(size(dark), [960, 540]);
	// Same layout: the non-transparent footprint (nodes, edges) coincides pixel for pixel.
	const [da, la] = [alphaOf(dark), alphaOf(light)];
	const covered = da.reduce((n, v) => n + (v > 0 ? 1 : 0), 0);
	assert.ok(covered > 1000, 'stills contain graph content');
	let mismatched = 0;
	for (let i = 0; i < da.length; i++) if ((da[i] > 0) !== (la[i] > 0)) mismatched++;
	assert.ok(mismatched / covered < 0.02, `footprints differ: ${mismatched} of ${covered} px`);
});
