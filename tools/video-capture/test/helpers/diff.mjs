import { chromium } from '@playwright/test';

/** Share of pixels that differ by more than a few levels between two PNGs (1 when sizes differ). */
export async function diffRatio(aBytes, bBytes) {
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
