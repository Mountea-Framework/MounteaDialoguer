import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { captureScenario, toolRoot } from '../runner/capture.mjs';
import brag from '../scenarios/brag.js';

const goldens = path.join(toolRoot, 'goldens/brag');

async function diffRatio(aBytes, bBytes) {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		return await page.evaluate(async ([a, b]) => {
			const load = (bytes) => new Promise((resolve, reject) => {
				const img = new Image();
				img.onload = () => resolve(img);
				img.onerror = reject;
				img.src = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
			});
			const [ia, ib] = await Promise.all([load(a), load(b)]);
			if (ia.width !== ib.width || ia.height !== ib.height) return 1;
			const draw = (img) => {
				const c = document.createElement('canvas');
				c.width = img.width; c.height = img.height;
				const ctx = c.getContext('2d');
				ctx.drawImage(img, 0, 0);
				return ctx.getImageData(0, 0, c.width, c.height).data;
			};
			const da = draw(ia), db = draw(ib);
			let bad = 0;
			for (let i = 0; i < da.length; i += 4) {
				if (Math.abs(da[i] - db[i]) > 8 || Math.abs(da[i + 1] - db[i + 1]) > 8 || Math.abs(da[i + 2] - db[i + 2]) > 8 || Math.abs(da[i + 3] - db[i + 3]) > 8) bad++;
			}
			return bad / (da.length / 4);
		}, [[...aBytes], [...bBytes]]);
	} finally { await browser.close(); }
}

test('brag beats match their golden frames', { timeout: 600000 }, async () => {
	const manifest = await captureScenario({ ...brag, id: 'brag-golden' }, { force: true });
	await fs.mkdir(goldens, { recursive: true });
	for (const beat of manifest.beats) {
		const file = beat.kind === 'stills'
			? path.join(toolRoot, 'out/brag-golden', beat.stills.light)
			: path.join(toolRoot, 'out/brag-golden', beat.dir, `frame-${String(Math.ceil(beat.frames / 2)).padStart(4, '0')}.png`);
		const actual = await fs.readFile(file);
		const goldenFile = path.join(goldens, `${beat.id}.png`);
		if (process.env.UPDATE_GOLDENS === '1') { await fs.writeFile(goldenFile, actual); continue; }
		const expected = await fs.readFile(goldenFile).catch(() => { throw new Error(`Missing golden ${goldenFile}. Run with UPDATE_GOLDENS=1.`); });
		const ratio = await diffRatio(actual, expected);
		assert.ok(ratio <= 0.005, `Beat "${beat.id}" differs from its golden by ${(ratio * 100).toFixed(2)}% of pixels. If the UI change is intended, rerun with UPDATE_GOLDENS=1.`);
	}
});
