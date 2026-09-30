import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { finalizeArtifact, attestArtifact, verifyArtifact } from '../../scripts/release-artifact.mjs';
import { signingArguments } from '../../scripts/run-electron-builder.mjs';
import { planSteamUpload, executeSteamPlan } from '../../scripts/steam-upload.mjs';
import integrity from '../../electron/artifact-integrity.cjs';
import { generateKeyPairSync, verify } from 'node:crypto';
import { signLinuxArtifacts } from '../../scripts/sign-linux-release.mjs';

let directory;
test.beforeEach(async () => { directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mountea-release-test-')); });
test.afterEach(async () => { if (path.dirname(directory) !== os.tmpdir() || !path.basename(directory).startsWith('mountea-release-test-')) throw new Error('Unsafe test cleanup path'); await fs.rm(directory, { recursive: true, force: true }); });
async function artifact(reportingEnabled = false) {
	const target = path.join(directory, 'dist'); await fs.mkdir(target);
	for (const [name, contents] of Object.entries({ 'index.html': '<html/>', 'release.json': JSON.stringify({ release: 'test-release', reportingEnabled }), 'onboarding-example.mnteadlgproj': 'template', 'app.js': 'const app=true;', 'app.js.map': 'private source' })) await fs.writeFile(path.join(target, name), contents);
	return target;
}
test('artifact gate strips private maps and rejects changed or unvalidated production bytes', async () => {
	const target = await artifact(); await finalizeArtifact(target);
	expect(await fs.readdir(target)).not.toContain('app.js.map');
	await expect(verifyArtifact(target)).rejects.toThrow();
	await attestArtifact(target); await expect(verifyArtifact(target)).resolves.toMatchObject({ release: 'test-release' });
	await fs.appendFile(path.join(target, 'app.js'), 'tamper'); await expect(verifyArtifact(target)).rejects.toThrow('changed after fingerprinting');
});
test('reporting release requires credentials and removes maps only after matching upload succeeds', async () => {
	const target = await artifact(true); await expect(finalizeArtifact(target, { env: {} })).rejects.toThrow('SENTRY_AUTH_TOKEN');
	expect(await fs.readFile(path.join(target, 'app.js.map'), 'utf8')).toBe('private source');
	const env = { SENTRY_AUTH_TOKEN: 'test-secret', SENTRY_ORG: 'org', SENTRY_PROJECT: 'project', SENTRY_CLI: 'fake-cli' };
	await expect(finalizeArtifact(target, { env, execute: () => ({ status: 1 }) })).rejects.toThrow('upload failed');
	let uploaded, executable; await finalizeArtifact(target, { env: { ...env, SENTRY_CLI: 'sentry-cli.cmd' }, execute: (command, args) => { executable = command; uploaded = args; return { status: 0 }; } });
	expect(executable).not.toMatch(/\.(cmd|bat)$/i);
	expect((await fs.stat(executable)).isFile()).toBe(true);
	expect(uploaded).toEqual(['releases', 'files', 'test-release', 'upload-sourcemaps', target, '--url-prefix', '~/']);
	expect(await fs.readdir(target)).not.toContain('app.js.map');
});
test('public native distribution cannot silently skip signing or notarization', () => {
	expect(() => signingArguments('win32', {})).toThrow('CSC_LINK');
	expect(() => signingArguments('darwin', { CSC_LINK: 'cert', CSC_KEY_PASSWORD: 'password' })).toThrow('APPLE_ID');
	expect(signingArguments('darwin', { CSC_LINK: 'cert', CSC_KEY_PASSWORD: 'password', APPLE_ID: 'test', APPLE_APP_SPECIFIC_PASSWORD: 'test', APPLE_TEAM_ID: 'test' })).toContain('--config.mac.notarize=true');
	expect(() => signingArguments('linux', {})).toThrow('MOUNTEA_LINUX_SIGNING_KEY_FILE');
});
test('packaged renderer verification detects changed, missing and added content with an unchanged manifest', async () => {
	const target = await artifact(); await finalizeArtifact(target); await attestArtifact(target);
	const packaged = path.join(directory, 'packaged'); await fs.cp(target, packaged, { recursive: true });
	const original = integrity.fingerprintDirectory(target);
	expect(integrity.fingerprintDirectory(packaged)).toEqual(original);
	await fs.appendFile(path.join(packaged, 'app.js'), 'tamper'); expect(integrity.fingerprintDirectory(packaged)).not.toEqual(original);
	await fs.copyFile(path.join(target, 'app.js'), path.join(packaged, 'app.js'));
	await fs.writeFile(path.join(packaged, 'extra.js'), 'injected'); expect(integrity.fingerprintDirectory(packaged)).not.toEqual(original);
	await fs.unlink(path.join(packaged, 'extra.js')); await fs.unlink(path.join(packaged, 'app.js')); expect(integrity.fingerprintDirectory(packaged)).not.toEqual(original);
});
test('Linux detached signatures bind actual package hashes and validated renderer identity', async () => {
	const target = await artifact(); await finalizeArtifact(target); await attestArtifact(target);
	const { privateKey, publicKey } = generateKeyPairSync('ed25519');
	const env = { MOUNTEA_LINUX_SIGNING_KEY_FILE: path.join(directory, 'private.pem'), MOUNTEA_LINUX_PUBLIC_KEY_FILE: path.join(directory, 'public.pem') };
	await fs.writeFile(env.MOUNTEA_LINUX_SIGNING_KEY_FILE, privateKey.export({ type: 'pkcs8', format: 'pem' }));
	await fs.writeFile(env.MOUNTEA_LINUX_PUBLIC_KEY_FILE, publicKey.export({ type: 'spki', format: 'pem' }));
	const output = path.join(directory, 'linux'); await fs.mkdir(output); await fs.writeFile(path.join(output, 'test.AppImage'), 'package bytes');
	const record = await signLinuxArtifacts(output, { renderer: target, env }); expect(record.release).toBe('test-release'); expect(record.files['test.AppImage']).toMatch(/^[a-f0-9]{64}$/);
	const manifest = await fs.readFile(path.join(output, 'release-manifest.json')), signature = await fs.readFile(path.join(output, 'release-manifest.sig'));
	expect(verify(null, manifest, publicKey, signature)).toBe(true);
	expect(verify(null, Buffer.concat([manifest, Buffer.from('tamper')]), publicKey, signature)).toBe(false);
	await fs.appendFile(path.join(target, 'app.js'), 'tamper'); await expect(signLinuxArtifacts(output, { renderer: target, env })).rejects.toThrow('changed after fingerprinting');
});
test('Steam dry run leaves staging untouched and rejects overlapping paths or injected account IDs', async () => {
	const source = path.join(directory, 'source'), staging = path.join(directory, 'staging'); await fs.mkdir(source); await fs.mkdir(staging); await fs.writeFile(path.join(source, 'app'), 'validated');
	const options = { source, 'staging-root': staging, username: 'build_account', 'app-id': '123', 'depot-id': '456', platform: 'windows' };
	const plan = await planSteamUpload(options); expect(await executeSteamPlan(plan)).toMatchObject({ dryRun: true, preview: true }); expect(await fs.readdir(staging)).toEqual([]);
	await expect(planSteamUpload({ ...options, 'staging-root': source })).rejects.toThrow('separate');
	await expect(planSteamUpload({ ...options, username: 'account +quit' })).rejects.toThrow('Steam account');
});
