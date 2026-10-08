import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultSource = path.join(repoRoot, 'release', 'mac-arm64');
const defaultMacApp = path.join(defaultSource, 'Mountea Dialoguer.app');
const defaultStagingRoot = path.join('/private', 'tmp', 'mountea-dialoguer-steam-staging');
const steamcmdCandidates = [
	process.env.STEAMCMD,
	process.env.STEAMCMD_PATH,
	'/opt/homebrew/bin/steamcmd',
	'/usr/local/bin/steamcmd',
	path.join(process.env.HOME || '', 'steamcmd', 'steamcmd.sh'),
	path.join(process.env.HOME || '', 'SteamworksSDK', 'sdk', 'tools', 'ContentBuilder', 'builder_osx', 'steamcmd.sh'),
	path.join(process.env.HOME || '', 'SteamworksSDK', 'sdk', 'tools', 'ContentBuilder', 'builder_osx', 'steamcmd'),
	'/Applications/SteamCMD/steamcmd.sh',
].filter(Boolean);

function parseArguments(args) {
	const options = {};
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (['--execute', '--upload', '--dry-run'].includes(arg)) {
			options[arg.slice(2)] = true;
			continue;
		}
		if (
			[
				'--source',
				'--staging-root',
				'--steamcmd',
				'--username',
				'--app-id',
				'--depot-id',
				'--platform',
				'--branch',
			].includes(arg) &&
			args[index + 1] &&
			!args[index + 1].startsWith('--')
		) {
			options[arg.slice(2)] = args[index + 1];
			index += 1;
			continue;
		}
		throw new Error(`Unsupported or incomplete argument: ${arg}`);
	}
	return options;
}

async function exists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function resolveSteamcmd(explicitPath) {
	if (explicitPath && !explicitPath.includes('<')) return explicitPath;
	for (const candidate of steamcmdCandidates) {
		if (await exists(candidate)) return candidate;
	}
	return '';
}

function run(command, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: repoRoot,
			stdio: 'inherit',
			env: process.env,
			windowsHide: true,
		});
		child.on('error', reject);
		child.on('exit', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
		});
	});
}

const options = parseArguments(process.argv.slice(2));
options.platform ||= 'macos';
options.source ||= defaultSource;
options['staging-root'] ||= defaultStagingRoot;
options['app-id'] ||= '4509320';
options['depot-id'] ||= '4509322';
options.branch ||= process.env.STEAM_BRANCH || 'developer';
options.steamcmd = await resolveSteamcmd(options.steamcmd);

await fs.mkdir(options['staging-root'], { recursive: true });

if (options.execute && !options.steamcmd) {
	throw new Error(
		[
			'SteamCMD was not found.',
			'Install SteamCMD, or set STEAMCMD to the executable path, then rerun this command.',
			'Checked: /opt/homebrew/bin/steamcmd, /usr/local/bin/steamcmd, ~/steamcmd/steamcmd.sh, /Applications/SteamCMD/steamcmd.sh',
		].join('\n')
	);
}

const uploadArgs = [];
for (const flag of ['execute', 'upload', 'dry-run']) {
	if (options[flag]) uploadArgs.push(`--${flag}`);
}
for (const key of ['platform', 'source', 'staging-root', 'steamcmd', 'username', 'app-id', 'depot-id', 'branch']) {
	if (options[key]) uploadArgs.push(`--${key}`, options[key]);
}

await run('npm', ['run', 'build:steam']);
await run('node', ['scripts/release-artifact.mjs', 'finalize']);
await run('node', ['scripts/release-artifact.mjs', 'attest']);
await run('npm', ['run', 'electron:pack:steam']);
if (process.platform === 'darwin' && options.platform === 'macos' && await exists(defaultMacApp)) {
	await run('codesign', ['--force', '--deep', '--sign', '-', defaultMacApp]);
}
await run('node', ['scripts/steam-upload.mjs', ...uploadArgs]);
