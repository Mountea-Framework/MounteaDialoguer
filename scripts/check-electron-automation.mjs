// Real Electron check of the desktop CLI (cli/dialoguer.mjs + electron/automation.cjs) on a disposable profile with
// provider network blocked: headless start, authoring and archive round trip from the CLI, stop, then a windowed
// launch that shows the CLI's work, refreshes live on further CLI edits, and turns CLI access off again.
import { _electron as electron, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { seedLocalState } from '../tests/e2e/helpers/appHarness.js';
import { NATIVE_TEST_VIEWPORT } from './native-test-support.mjs';

// MOUNTEA_PACKAGED_EXECUTABLE checks an installed build instead of the repository's Electron.
const executablePath = process.env.MOUNTEA_PACKAGED_EXECUTABLE ? path.resolve(process.env.MOUNTEA_PACKAGED_EXECUTABLE) : '';
const evidence = { schemaVersion: 1, status: 'failed', platform: process.platform, architecture: process.arch, packaged: Boolean(executablePath), checks: {} };
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mountea-electron-cli-'));
const resolved = path.resolve(directory);
if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('mountea-electron-cli-')) throw new Error('Refusing unexpected cleanup path');
const userData = path.join(directory, 'user-data');
const environment = { ...process.env, MOUNTEA_STARTUP_CHECK: '1', VITE_DEV_SERVER_URL: '', VITE_DIST_CHANNEL: 'desktop', MOUNTEA_DIST_CHANNEL: 'desktop', MOUNTEA_SENTRY_DSN: '', VITE_SENTRY_DSN: '', ...(executablePath ? { MOUNTEA_APP_PATH: executablePath } : {}) };
delete environment.ELECTRON_RUN_AS_NODE;

function cli(...args) {
	const result = spawnSync(process.execPath, ['cli/dialoguer.mjs', ...args, '--user-data-dir', userData], { env: environment, encoding: 'utf8', timeout: 120000 });
	if (result.status !== 0) throw new Error(`dialoguer ${args.join(' ')} exited ${result.status}: ${result.stderr || result.stdout}`);
	return result.stdout;
}
const cliJson = (...args) => JSON.parse(cli(...args, '--json'));
const exists = (file) => fs.access(file).then(() => true, () => false);

let application;
try {
	await fs.mkdir(userData, { recursive: true });

	// 1. Headless start and authoring through the CLI.
	assert.match(cli('start', '--json'), /"mode": "headless"/);
	assert.equal(cliJson('status').mode, 'headless');
	evidence.checks.headlessStart = 'passed';
	const project = cliJson('call', 'create_project', 'name=CliE2EProject');
	const dialogue = cliJson('call', 'create_dialogue', `projectId=${project.projectId}`, 'name=Greeting');
	const graphFile = path.join(directory, 'graph.json');
	await fs.writeFile(graphFile, JSON.stringify({
		projectId: project.projectId, dialogueId: dialogue.dialogueId, mode: 'replace',
		nodes: [{ ref: 'hello', type: 'leadNode', displayName: 'Hello', rows: ['Well met.'] }, { ref: 'end', type: 'completeNode', displayName: 'End' }],
		edges: [{ source: 'start', target: 'hello' }, { source: 'hello', target: 'end' }],
	}));
	cliJson('call', 'set_graph', '--args-file', graphFile);
	const read = cliJson('dialogue', project.projectId, dialogue.dialogueId);
	assert.equal(read.nodes.find((node) => node.type === 'leadNode').rows[0].text, 'Well met.');
	const archive = path.join(directory, 'round-trip.mnteadlgproj');
	cli('export', 'project', project.projectId, '-o', archive);
	const imported = cliJson('import', archive);
	assert.notEqual(imported.projectId, project.projectId);
	assert.equal(cliJson('projects').length, 2);
	evidence.checks.cliAuthoringAndArchives = 'passed';

	// 2. Stop: the endpoint file goes away with the process.
	cli('stop');
	await expect.poll(() => exists(path.join(userData, 'automation.json')), { timeout: 15000 }).toBe(false);
	assert.equal(cliJson('status').running, false);
	evidence.checks.headlessStop = 'passed';

	// 3. Windowed launch on the same profile shows what the CLI wrote.
	const bootstrap = path.join(directory, 'bootstrap.cjs');
	await fs.writeFile(bootstrap, `
const { app, BrowserWindow, session } = require('electron');
app.setPath('userData', ${JSON.stringify(userData)});
BrowserWindow.prototype.show = function () {};
app.whenReady().then(() => session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true })));
require(${JSON.stringify(path.resolve('electron/main.cjs'))});
`);
	application = await electron.launch({
		...(executablePath ? { executablePath } : {}),
		args: [...(executablePath ? [] : [bootstrap]), `--user-data-dir=${userData}`],
		env: environment,
		timeout: 30000,
	});
	const page = await application.firstWindow();
	await application.evaluate(({ BrowserWindow }, viewport) => BrowserWindow.getAllWindows()[0].setContentSize(viewport.width, viewport.height), NATIVE_TEST_VIEWPORT);
	await seedLocalState(page);
	await page.waitForFunction(() => Boolean(window.electronAPI?.isElectron) && document.querySelector('#root')?.textContent.length > 50);
	await page.reload();
	await page.waitForFunction(() => document.querySelector('#root')?.textContent.length > 50);
	await expect(page.getByText('CliE2EProject').filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
	assert.equal((await page.evaluate(() => window.electronAPI.getAutomationStatus())).running, false, 'CLI access stays off unless enabled');
	evidence.checks.windowedSeesCliData = 'passed';

	// 4. With CLI access on, CLI edits refresh the open app.
	assert.equal((await page.evaluate(() => window.electronAPI.setAutomationEnabled(true))).running, true);
	assert.equal(cliJson('status', '--no-start').mode, 'windowed');
	cliJson('call', 'create_project', 'name=LiveRefreshProject', '--no-start');
	await expect(page.getByText('LiveRefreshProject').filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
	await page.evaluate(({ projectId, dialogueId }) => { location.hash = `/projects/${projectId}/dialogue/${dialogueId}`; }, { projectId: project.projectId, dialogueId: dialogue.dialogueId });
	await expect(page.locator('.react-flow__node-leadNode')).toHaveCount(1, { timeout: 15000 });
	cliJson('call', 'add_node', `projectId=${project.projectId}`, `dialogueId=${dialogue.dialogueId}`, 'type=delayNode', '--no-start');
	await expect(page.locator('.react-flow__node-delayNode')).toHaveCount(1, { timeout: 15000 });
	evidence.checks.liveRefresh = 'passed';

	// 5. Turning CLI access off closes the endpoint.
	assert.equal((await page.evaluate(() => window.electronAPI.setAutomationEnabled(false))).running, false);
	assert.equal(await exists(path.join(userData, 'automation.json')), false);
	evidence.checks.disable = 'passed';
	evidence.status = 'passed';
} catch (error) {
	evidence.failure = { name: error.name, message: error.message };
	throw error;
} finally {
	try { await application?.close(); }
	finally {
		spawnSync(process.execPath, ['cli/dialoguer.mjs', 'stop', '--user-data-dir', userData], { env: environment, timeout: 15000 });
		await new Promise((resolve) => setTimeout(resolve, 1000));
		await fs.rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
		console.log(JSON.stringify(evidence));
	}
}
