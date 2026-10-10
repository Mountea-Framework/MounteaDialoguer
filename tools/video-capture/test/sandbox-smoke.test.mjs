import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { openSession, idle } from '../runner/session.mjs';

test('sandbox renders a real StartNode to a transparent RGBA PNG', { timeout: 120000 }, async () => {
	const session = await openSession({ size: [640, 360], port: 5198 });
	try {
		await session.page.evaluate(() => window.__capture.setState({
			language: 'en', theme: 'dark',
			scene: {
				nodes: [{ id: 'n1', type: 'startNode', position: { x: 40, y: 40 }, data: { label: 'Dialogue entry point' }, width: 200, height: 88 }],
				edges: [], participants: [],
			},
			view: { x: 0, y: 0, zoom: 1 },
		}));
		await idle(session.page);
		const file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'cap-')), 'node.png');
		await session.page.screenshot({ path: file, omitBackground: true });
		const bytes = await fs.readFile(file);
		assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG');
		assert.equal(bytes[25], 6, 'PNG colour type must be 6 (RGBA)');
		assert.ok(bytes.length > 1500, 'PNG should contain the rendered node');
		assert.deepEqual(await session.page.evaluate(() => window.__capture.missingKeys), []);
	} finally {
		await session.close();
	}
});

test('fake clock: page timers only advance when the runner advances the clock', { timeout: 120000 }, async () => {
	const session = await openSession({ size: [320, 180], port: 5197 });
	try {
		const { page } = session;
		await page.evaluate(() => { window.__ticks = 0; setInterval(() => { window.__ticks += 1; }, 100); });
		await new Promise((resolve) => setTimeout(resolve, 400));
		assert.equal(await page.evaluate(() => window.__ticks), 0, 'timers must not run on their own');
		await page.clock.runFor(1000);
		assert.equal(await page.evaluate(() => window.__ticks), 10);
		await page.waitForFunction(() => window.__ticks === 10);
	} finally {
		await session.close();
	}
});
