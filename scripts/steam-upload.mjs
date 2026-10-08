import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function parseArguments(args) {
	const options = {};
	for (let index = 0; index < args.length; index++) {
		const key = args[index].replace(/^--/, '');
		if (['execute', 'upload', 'dry-run'].includes(key)) options[key] = true;
		else if (['source', 'staging-root', 'steamcmd', 'username', 'app-id', 'depot-id', 'platform', 'branch'].includes(key) && args[index + 1] && !args[index + 1].startsWith('--')) options[key] = args[++index];
		else throw new Error(`Unsupported or incomplete argument: ${args[index]}`);
	}
	return options;
}
const contains = (root, target) => { const relative = path.relative(root, target); return !relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)); };
async function filesUnder(directory, prefix = '') {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const result = [];
	for (const entry of entries) {
		const name = prefix + entry.name;
		const fullPath = path.join(directory, entry.name);
		if (entry.isDirectory()) result.push(...await filesUnder(fullPath, `${name}/`));
		else if (entry.isFile() || entry.isSymbolicLink()) result.push(name);
	}
	return result.sort();
}
async function codeSignatureMappings(source) {
	const files = await filesUnder(source);
	return files.filter((name) => name.includes('/_CodeSignature/CodeResources')).map((name) => `   "FileMapping" { "LocalPath" "${name.replaceAll('\\', '/')}" "DepotPath" "${name.replaceAll('\\', '/')}" }\n`).join('');
}
export async function planSteamUpload(options) {
	for (const key of ['source', 'staging-root', 'username', 'app-id', 'depot-id', 'platform']) if (!options[key]) throw new Error(`Required argument: --${key}`);
	for (const key of ['app-id', 'depot-id']) if (!/^[1-9][0-9]*$/.test(options[key])) throw new Error(`${key} must be a positive numeric ID.`);
	if (!/^[A-Za-z0-9_]+$/.test(options.username)) throw new Error('Steam account must contain only letters, digits or underscores.');
	if (!['windows', 'macos', 'linux'].includes(options.platform)) throw new Error('Platform must be windows, macos or linux.');
	if (options.branch && !/^[A-Za-z0-9_.-]+$/.test(options.branch)) throw new Error('Branch must contain only letters, digits, dots, underscores, or hyphens.');
	const source = await fs.realpath(options.source), root = await fs.realpath(options['staging-root']);
	for (const directory of [source, root]) if (directory === path.parse(directory).root || !((await fs.stat(directory)).isDirectory())) throw new Error('Source and staging root must be explicit non-root directories.');
	if (contains(source, root) || contains(root, source)) throw new Error('Source and staging root must be separate directories.');
	if (/['"\r\n]/.test(source + root)) throw new Error('Paths cannot contain quotes or newlines.');
	const destination = path.join(root, `mountea-${options['app-id']}-${options.platform}-${Date.now()}`);
	if (!contains(root, destination)) throw new Error('Staging destination escaped its root.');
	const preview = !options.upload;
	const setLive = options.upload && options.branch ? ` "SetLive" "${options.branch}"\n` : '';
	const explicitSignatureMappings = options.platform === 'macos' ? await codeSignatureMappings(source) : '';
	const vdf = `"AppBuild"\n{\n "AppID" "${options['app-id']}"\n "Desc" "Validated ${options.platform} package"\n "Preview" "${preview ? '1' : '0'}"\n${setLive} "ContentRoot" "${destination.replaceAll('\\', '/')}/content"\n "BuildOutput" "${destination.replaceAll('\\', '/')}/output"\n "Depots"\n {\n  "${options['depot-id']}"\n  {\n   "FileMapping" { "LocalPath" "*" "DepotPath" "." "Recursive" "1" }\n${explicitSignatureMappings}  }\n }\n}\n`;
	return { source, stagingRoot: root, destination, vdf, preview, username: options.username, execute: Boolean(options.execute && !options['dry-run']), upload: Boolean(options.upload), steamcmd: options.steamcmd, platform: options.platform };
}
async function runChecked(command, args, options = {}) {
	const child = spawn(command, args, { stdio: 'inherit', windowsHide: true, shell: false, ...options });
	const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
	if (code !== 0) throw new Error(`${command} failed (${code})`);
}
async function prepareMacStagedApp(contentRoot) {
	const entries = await fs.readdir(contentRoot, { withFileTypes: true });
	const appEntry = entries.find((entry) => entry.isDirectory() && entry.name.endsWith('.app'));
	if (!appEntry) return;
	const appPath = path.join(contentRoot, appEntry.name);
	await runChecked('codesign', ['--force', '--deep', '--sign', '-', appPath]);
	await runChecked('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath]);
}
export async function executeSteamPlan(plan) {
	if (!plan.execute) return { dryRun: true, destination: plan.destination, preview: plan.preview };
	if (!plan.steamcmd) throw new Error('--steamcmd must name an installed executable for --execute.');
	const executable = await fs.realpath(plan.steamcmd);
	if (!((await fs.stat(executable)).isFile())) throw new Error('SteamCMD executable is missing.');
	// Never mirror-delete another directory. Each run owns a newly allocated
	// staging directory; an existing destination fails before any copy.
	await fs.mkdir(plan.destination);
	const contentRoot = path.join(plan.destination, 'content');
	if (plan.platform === 'macos') {
		await runChecked('ditto', [plan.source, contentRoot]);
	} else {
		await fs.cp(plan.source, contentRoot, { recursive: true, errorOnExist: true, force: false });
	}
	if (plan.platform === 'macos') await prepareMacStagedApp(contentRoot);
	await fs.mkdir(path.join(plan.destination, 'output'));
	const vdfPath = path.join(plan.destination, 'app-build.vdf');
	await fs.writeFile(vdfPath, plan.vdf, { flag: 'wx' });
	const loginArgs = ['+login', plan.username];
	if (process.env.STEAM_PASSWORD) loginArgs.push(process.env.STEAM_PASSWORD);
	if (process.env.STEAM_GUARD_CODE) loginArgs.push(process.env.STEAM_GUARD_CODE);
	const args = [...loginArgs, '+run_app_build', vdfPath, '+quit'];
	const child = spawn(executable.endsWith('.sh') ? 'bash' : executable, executable.endsWith('.sh') ? [executable, ...args] : args, { stdio: 'inherit', windowsHide: true, shell: false });
	const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
	if (code !== 0) throw new Error(`SteamCMD failed (${code}); staged files remain for inspection.`);
	return { dryRun: false, uploaded: plan.upload, destination: plan.destination };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const plan = await planSteamUpload(parseArguments(process.argv.slice(2)));
	console.log(JSON.stringify(await executeSteamPlan(plan), null, 2));
}
