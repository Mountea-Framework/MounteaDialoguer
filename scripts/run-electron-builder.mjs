import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyArtifact } from './release-artifact.mjs';
import fs from 'node:fs/promises';
import { linuxSigningKeys, signLinuxArtifacts } from './sign-linux-release.mjs';

export function signingArguments(platform, env) {
	const requireKeys = (keys) => { for (const key of keys) if (!env[key]) throw new Error(`Public ${platform} release requires ${key}; signing cannot be skipped.`); };
	if (platform === 'win32') { requireKeys(['CSC_LINK', 'CSC_KEY_PASSWORD']); return ['--config.forceCodeSigning=true']; }
	if (platform === 'darwin') { requireKeys(['CSC_LINK', 'CSC_KEY_PASSWORD', 'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID']); return ['--config.forceCodeSigning=true', '--config.mac.notarize=true']; }
	if (platform === 'linux') { requireKeys(['MOUNTEA_LINUX_SIGNING_KEY_FILE', 'MOUNTEA_LINUX_PUBLIC_KEY_FILE']); return []; }
	throw new Error(`Unsupported public release platform: ${platform}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const args = process.argv.slice(2), publicRelease = args.includes('--public-release');
	await verifyArtifact('dist');
	const signing = publicRelease ? signingArguments(process.platform, process.env) : [];
	let linuxOutput;
	if (publicRelease && process.platform === 'linux') {
		await linuxSigningKeys();
		await fs.mkdir('release', { recursive: true });
		linuxOutput = await fs.mkdtemp(path.resolve('release/linux-public-'));
		signing.push(`--config.directories.output=${linuxOutput}`);
	}
	if (!publicRelease) console.log('Local package validation: this command does not establish a signed public release.');
	const child = spawn(process.execPath, [path.resolve('node_modules/electron-builder/out/cli/cli.js'), ...args.filter((arg) => arg !== '--public-release'), ...signing, '--publish', 'never'], { stdio: 'inherit', env: process.env, windowsHide: true });
	const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', (value) => resolve(value ?? 1)); });
	await verifyArtifact('dist');
	if (code === 0 && linuxOutput) await signLinuxArtifacts(linuxOutput);
	process.exitCode = code;
}
