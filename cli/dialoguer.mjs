#!/usr/bin/env node
// Mountea Dialoguer CLI. Drives the desktop app's local endpoint (electron/automation.cjs), starting the app hidden
// (--headless) when it is not running. Speaks MCP JSON-RPC, so `--url` can point it at any Mountea Dialoguer MCP
// endpoint instead. `dialoguer mcp` exposes the desktop app to MCP clients over stdio. No dependencies: runs on
// Node 18+ or, in an installed app, on the app's own runtime (ELECTRON_RUN_AS_NODE, see dialoguer.cmd).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = fs.existsSync(path.join(HERE, '..', 'electron', 'main.cjs')) ? path.resolve(HERE, '..') : null;
const { userDataCandidates } = require(fs.existsSync(path.join(HERE, 'userDataPaths.cjs')) ? path.join(HERE, 'userDataPaths.cjs') : path.join(HERE, '..', 'electron', 'userDataPaths.cjs'));

const ENDPOINT_FILE = 'automation.json';
const EXIT = { ok: 0, tool: 1, usage: 2, unreachable: 3 };

const USAGE = `Mountea Dialoguer CLI

Usage: dialoguer <command> [arguments] [options]

App
  status                                   Is the desktop app reachable? (never starts it)
  start                                    Start the app hidden (headless) if it is not running
  stop                                     Quit a headless app started by the CLI

Projects and dialogues
  projects                                 List projects
  project <projectId>                      Project overview
  dialogues <projectId>                    List dialogues
  dialogue <projectId> <dialogueId>        Read a dialogue graph   [--locale <tag>]
  validate <projectId> <dialogueId>        Check a dialogue

Files
  import <file>                            Import a .mnteadlgproj / .mnteadlg archive
        [--project <id>]                   destination project (dialogue archives) or project to replace
        [--dialogue <id>] [--replace]      replace that project or dialogue instead of adding a copy
  export project <projectId>               Write a .mnteadlgproj archive   [-o <file>]
  export dialogue <projectId> <dialogueId> Write a .mnteadlg archive       [-o <file>]

Any tool
  tools                                    List every tool
  call <tool> [key=value ...]              Run a tool  [--args '<json>'] [--args-file <file>]
  mcp                                      Serve MCP over stdio (claude mcp add dialoguer -- dialoguer mcp)

Options
  --json                 Print raw JSON
  --no-start             Fail instead of starting the app
  --timeout <seconds>    How long to wait for the app to start (default 60)
  --user-data-dir <dir>  Profile folder of the app (default: the app's own)
  --url <url> --token <token>
                         Use another Mountea Dialoguer MCP endpoint (for example a self-hosted /mcp)

Exit codes: 0 ok, 1 tool error, 2 usage error, 3 app not reachable.`;

class CliError extends Error {
	constructor(message, exitCode = EXIT.tool) { super(message); this.exitCode = exitCode; }
}

// ---------------------------------------------------------------------------------------------------------------
// Arguments

const VALUE_OPTIONS = new Set(['--timeout', '--user-data-dir', '--url', '--token', '--args', '--args-file', '--locale', '--project', '--dialogue', '-o', '--output']);

function parseArguments(argv) {
	const positional = [];
	const options = {};
	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === '--') { positional.push(...argv.slice(index + 1)); break; }
		if (argument.startsWith('--') && argument.includes('=')) {
			const [key, ...rest] = argument.split('=');
			options[key] = rest.join('=');
		} else if (VALUE_OPTIONS.has(argument)) {
			if (index + 1 >= argv.length) throw new CliError(`${argument} needs a value`, EXIT.usage);
			options[argument] = argv[++index];
		} else if (argument.startsWith('-') && argument !== '-') {
			options[argument] = true;
		} else positional.push(argument);
	}
	return { positional, options };
}

function toolArguments(pairs, options) {
	let args = {};
	if (options['--args-file']) args = { ...args, ...parseJsonObject(fs.readFileSync(options['--args-file'], 'utf8'), '--args-file') };
	if (options['--args']) args = { ...args, ...parseJsonObject(options['--args'], '--args') };
	for (const pair of pairs) {
		const split = pair.indexOf('=');
		if (split < 1) throw new CliError(`Expected key=value, got "${pair}"`, EXIT.usage);
		const raw = pair.slice(split + 1);
		let value = raw;
		try { value = JSON.parse(raw); } catch { /* plain string */ }
		args[pair.slice(0, split)] = value;
	}
	return args;
}

function parseJsonObject(text, label) {
	let value;
	try { value = JSON.parse(text); } catch { throw new CliError(`${label} is not valid JSON`, EXIT.usage); }
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CliError(`${label} must be a JSON object`, EXIT.usage);
	return value;
}

// ---------------------------------------------------------------------------------------------------------------
// Finding and starting the desktop app

function candidateDirectories(options) {
	const explicit = options['--user-data-dir'] || '';
	if (explicit) return [path.resolve(explicit)];
	const dirs = userDataCandidates({ platform: process.platform, env: process.env, homedir: os.homedir(), tempPath: os.tmpdir() });
	// `npm run dev:electron` keeps its profile in the repository.
	if (REPO) dirs.push(path.join(REPO, '.mountea-user-data'));
	return [...new Set(dirs)];
}

function processAlive(pid) {
	if (!Number.isInteger(pid) || pid <= 0) return false;
	try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; }
}

async function health(port) {
	try {
		const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1500) });
		return response.ok ? await response.json() : null;
	} catch {
		return null;
	}
}

/** The live endpoint of a running desktop app, or null. */
async function discover(options) {
	for (const directory of candidateDirectories(options)) {
		let endpoint;
		try { endpoint = JSON.parse(fs.readFileSync(path.join(directory, ENDPOINT_FILE), 'utf8')); } catch { continue; }
		if (!endpoint?.port || !endpoint.token || !processAlive(endpoint.pid)) continue;
		const state = await health(endpoint.port);
		if (state) return { ...endpoint, ready: Boolean(state.ready), directory, url: `http://127.0.0.1:${endpoint.port}/mcp` };
	}
	return null;
}

function appLaunchCommand() {
	if (process.env.MOUNTEA_APP_PATH) return { command: process.env.MOUNTEA_APP_PATH, args: [] };
	// Installed app: dialoguer.cmd / dialoguer run this file with the app's executable as Node.
	if (process.versions.electron) return { command: process.execPath, args: [] };
	if (REPO) {
		let electron;
		try { electron = require(path.join(REPO, 'node_modules', 'electron')); } catch { electron = null; }
		if (typeof electron === 'string') {
			if (!fs.existsSync(path.join(REPO, 'dist', 'index.html'))) throw new CliError('The app is not built. Run "npm run build" first.', EXIT.unreachable);
			return { command: electron, args: [REPO] };
		}
	}
	throw new CliError('Cannot find the Mountea Dialoguer app. Set MOUNTEA_APP_PATH to its executable.', EXIT.unreachable);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startApp(options) {
	const { command, args } = appLaunchCommand();
	const env = { ...process.env };
	delete env.ELECTRON_RUN_AS_NODE;
	const userDataDir = options['--user-data-dir'] ? [`--user-data-dir=${path.resolve(options['--user-data-dir'])}`] : [];
	const child = spawn(command, [...args, '--headless', ...userDataDir], { detached: true, stdio: 'ignore', env, windowsHide: true });
	let exited = null;
	child.on('exit', (code) => { exited = code ?? 0; });
	child.on('error', (error) => { exited = error; });
	child.unref();

	const deadline = Date.now() + Number(options['--timeout'] || 60) * 1000;
	while (Date.now() < deadline) {
		await sleep(300);
		const endpoint = await discover(options);
		if (endpoint?.ready) return endpoint;
		if (exited instanceof Error) throw new CliError(`Could not start the app: ${exited.message}`, EXIT.unreachable);
		// A second instance hands over to the running one and quits straight away.
		if (exited !== null && !endpoint) {
			await sleep(1500);
			const late = await discover(options);
			if (late?.ready) return late;
			throw new CliError('The app is already open without CLI access. Turn on "CLI access" in its command palette (Ctrl+K), or close it and try again.', EXIT.unreachable);
		}
	}
	throw new CliError('The app did not become ready in time (see --timeout).', EXIT.unreachable);
}

async function waitUntilReady(endpoint, options) {
	const deadline = Date.now() + Number(options['--timeout'] || 60) * 1000;
	while (!endpoint.ready && Date.now() < deadline) {
		await sleep(300);
		endpoint = (await discover(options)) || endpoint;
	}
	if (!endpoint.ready) throw new CliError('The app is starting but not ready yet; try again.', EXIT.unreachable);
	return endpoint;
}

async function connect(options) {
	if (options['--url']) {
		if (!options['--token']) throw new CliError('--url needs --token', EXIT.usage);
		return { url: options['--url'], token: options['--token'], remote: true };
	}
	const found = await discover(options);
	if (found) return waitUntilReady(found, options);
	if (options['--no-start']) throw new CliError('The desktop app is not running with CLI access.', EXIT.unreachable);
	return startApp(options);
}

// ---------------------------------------------------------------------------------------------------------------
// MCP over HTTP

async function post(endpoint, message, { timeoutMs = 120000 } = {}) {
	for (let attempt = 0; ; attempt += 1) {
		let response;
		try {
			response = await fetch(endpoint.url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${endpoint.token}` },
				body: JSON.stringify(message),
				signal: AbortSignal.timeout(timeoutMs),
			});
		} catch (error) {
			throw new CliError(`Cannot reach ${endpoint.remote ? endpoint.url : 'the desktop app'}: ${error.cause?.code || error.message}`, EXIT.unreachable);
		}
		if (response.status === 503 && attempt < 100) { await sleep(300); continue; }
		if (response.status === 202) return null;
		const text = await response.text();
		if (!response.ok) {
			let detail = text;
			try { const parsed = JSON.parse(text); detail = parsed.error?.message || parsed.error || text; } catch { /* plain text */ }
			throw new CliError(`Request failed (${response.status}): ${detail}`, response.status === 401 ? EXIT.unreachable : EXIT.tool);
		}
		return JSON.parse(text);
	}
}

let rpcId = 1;
async function rpc(endpoint, method, params) {
	const response = await post(endpoint, { jsonrpc: '2.0', id: rpcId++, method, params });
	if (response?.error) throw new CliError(response.error.message || 'Request failed');
	return response?.result;
}

async function callTool(endpoint, name, args = {}) {
	const result = await rpc(endpoint, 'tools/call', { name, arguments: args });
	const text = result?.content?.[0]?.text ?? '';
	if (result?.isError) throw new CliError(text || `${name} failed`);
	try { return JSON.parse(text); } catch { return text; }
}

// ---------------------------------------------------------------------------------------------------------------
// Output

function printJson(value) {
	process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printTable(rows, columns) {
	if (!rows.length) { process.stdout.write('(none)\n'); return; }
	const cells = rows.map((row) => columns.map(([key]) => String(row[key] ?? '')));
	const widths = columns.map(([, title], index) => Math.max(title.length, ...cells.map((line) => line[index].length)));
	const line = (values) => values.map((value, index) => value.padEnd(widths[index])).join('  ').trimEnd();
	process.stdout.write(`${line(columns.map(([, title]) => title))}\n${cells.map(line).join('\n')}\n`);
}

function requirePositional(values, count, usage) {
	if (values.length < count || values.slice(0, count).some((value) => !value)) throw new CliError(`Usage: dialoguer ${usage}`, EXIT.usage);
}

// ---------------------------------------------------------------------------------------------------------------
// Commands

async function status(options) {
	if (options['--url']) {
		const endpoint = await connect(options);
		const result = await rpc(endpoint, 'ping', {});
		printJson({ reachable: Boolean(result), url: endpoint.url });
		return;
	}
	const endpoint = await discover(options);
	const summary = endpoint
		? { running: true, ready: endpoint.ready, mode: endpoint.mode, port: endpoint.port, pid: endpoint.pid, version: endpoint.version, userData: endpoint.directory }
		: { running: false };
	if (options['--json']) return printJson(summary);
	if (!endpoint) { process.stdout.write('The desktop app is not running with CLI access.\n'); return; }
	process.stdout.write(`Running (${endpoint.mode}${endpoint.ready ? '' : ', starting'}) on port ${endpoint.port}, version ${endpoint.version}, pid ${endpoint.pid}\nProfile: ${endpoint.directory}\n`);
}

async function stop(options) {
	const endpoint = await discover(options);
	if (!endpoint) { process.stdout.write('The desktop app is not running with CLI access.\n'); return; }
	const response = await fetch(`http://127.0.0.1:${endpoint.port}/shutdown`, { method: 'POST', headers: { Authorization: `Bearer ${endpoint.token}` }, signal: AbortSignal.timeout(5000) });
	if (response.status === 409) throw new CliError('The app window is open; close it from the app instead.');
	if (!response.ok) throw new CliError(`Stop failed (${response.status})`);
	process.stdout.write('Stopped.\n');
}

function writeArchive(result, output) {
	const file = path.resolve(output || result.fileName);
	fs.writeFileSync(file, Buffer.from(result.base64, 'base64'));
	return file;
}

async function run(argv) {
	const { positional, options } = parseArguments(argv);
	const [command, ...rest] = positional;
	const json = Boolean(options['--json']);
	if (!command || options['--help'] || options['-h'] || command === 'help') { process.stdout.write(`${USAGE}\n`); return; }

	switch (command) {
		case 'status': return status(options);
		case 'stop': return stop(options);
		case 'start': {
			const endpoint = await connect(options);
			if (json) return printJson({ running: true, mode: endpoint.mode, port: endpoint.port });
			process.stdout.write(`Ready (${endpoint.mode || 'remote'}).\n`);
			return;
		}
		case 'mcp': return serveStdio(options);
	}

	// Arguments are checked before connecting, so a typo never starts the app.
	let connection = null;
	const endpoint = () => (connection ||= connect(options));
	switch (command) {
		case 'tools': {
			const { tools } = await rpc(await endpoint(), 'tools/list', {});
			if (json) return printJson(tools);
			return printTable(tools.map((tool) => ({ name: tool.name, summary: tool.description.split(/(?<=\.)\s/)[0] })), [['name', 'TOOL'], ['summary', 'DESCRIPTION']]);
		}
		case 'call': {
			requirePositional(rest, 1, 'call <tool> [key=value ...]');
			const args = toolArguments(rest.slice(1), options);
			return printJson(await callTool(await endpoint(), rest[0], args));
		}
		case 'projects': {
			const { projects } = await callTool(await endpoint(), 'list_projects');
			if (json) return printJson(projects);
			return printTable(projects.map((project) => ({ ...project, conflict: project.conflict ? 'conflict' : '' })), [['id', 'ID'], ['name', 'NAME'], ['modifiedAt', 'MODIFIED'], ['conflict', '']]);
		}
		case 'project':
			requirePositional(rest, 1, 'project <projectId>');
			return printJson(await callTool(await endpoint(), 'get_project', { projectId: rest[0] }));
		case 'dialogues': {
			requirePositional(rest, 1, 'dialogues <projectId>');
			const { dialogues } = await callTool(await endpoint(), 'list_dialogues', { projectId: rest[0] });
			if (json) return printJson(dialogues);
			return printTable(dialogues, [['id', 'ID'], ['name', 'NAME'], ['nodeCount', 'NODES'], ['modifiedAt', 'MODIFIED']]);
		}
		case 'dialogue':
			requirePositional(rest, 2, 'dialogue <projectId> <dialogueId> [--locale <tag>]');
			return printJson(await callTool(await endpoint(), 'get_dialogue', { projectId: rest[0], dialogueId: rest[1], ...(options['--locale'] ? { locale: options['--locale'] } : {}) }));
		case 'validate':
			requirePositional(rest, 2, 'validate <projectId> <dialogueId>');
			return printJson(await callTool(await endpoint(), 'validate_dialogue', { projectId: rest[0], dialogueId: rest[1] }));
		case 'import': {
			requirePositional(rest, 1, 'import <file> [--project <id>] [--dialogue <id>] [--replace]');
			const file = path.resolve(rest[0]);
			if (!fs.existsSync(file)) throw new CliError(`File not found: ${file}`, EXIT.usage);
			const args = {
				data: fs.readFileSync(file).toString('base64'),
				fileName: path.basename(file),
				mode: options['--replace'] ? 'replace' : 'copy',
				...(options['--project'] ? { projectId: options['--project'] } : {}),
				...(options['--dialogue'] ? { dialogueId: options['--dialogue'] } : {}),
			};
			const result = await callTool(await endpoint(), 'import_archive', args);
			if (json) return printJson(result);
			process.stdout.write(`Imported into "${result.projectName}" (${result.projectId}).\n`);
			return;
		}
		case 'export': {
			const [kind, projectId, dialogueId] = rest;
			if (kind === 'project') requirePositional(rest, 2, 'export project <projectId> [-o <file>]');
			else if (kind === 'dialogue') requirePositional(rest, 3, 'export dialogue <projectId> <dialogueId> [-o <file>]');
			else throw new CliError('Usage: dialoguer export project|dialogue ...', EXIT.usage);
			const result = kind === 'project'
				? await callTool(await endpoint(), 'export_project', { projectId, inline: true })
				: await callTool(await endpoint(), 'export_dialogue', { projectId, dialogueId, inline: true });
			if (!result?.base64) throw new CliError('The endpoint did not return the file; use a download link from the hosted app instead.');
			const written = writeArchive(result, options['-o'] || options['--output']);
			if (json) return printJson({ file: written, sizeBytes: result.sizeBytes });
			process.stdout.write(`Wrote ${written} (${result.sizeBytes} bytes).\n`);
			return;
		}
		default:
			throw new CliError(`Unknown command "${command}". Run "dialoguer help".`, EXIT.usage);
	}
}

// ---------------------------------------------------------------------------------------------------------------
// MCP over stdio: newline-delimited JSON-RPC in, responses out. Logs go to stderr only.

function serveStdio(options) {
	let endpointPromise = null;
	const endpoint = () => {
		endpointPromise ||= connect(options).catch((error) => { endpointPromise = null; throw error; });
		return endpointPromise;
	};
	const write = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
	const failure = (message, error) => {
		const ids = (Array.isArray(message) ? message : [message]).map((entry) => entry?.id).filter((id) => id !== undefined && id !== null);
		for (const id of ids) write({ jsonrpc: '2.0', id, error: { code: -32603, message: error.message } });
	};
	const forward = async (message) => {
		try {
			return await post(await endpoint(), message);
		} catch (error) {
			if (error.exitCode !== EXIT.unreachable) throw error;
			// The app may have been closed or restarted; find it again once.
			endpointPromise = null;
			return post(await endpoint(), message);
		}
	};

	const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
	const inFlight = new Set();
	input.on('line', (line) => {
		if (!line.trim()) return;
		let message;
		try { message = JSON.parse(line); } catch { write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); return; }
		const work = forward(message)
			.then((response) => { if (response) write(response); })
			.catch((error) => { process.stderr.write(`[dialoguer] ${error.message}\n`); failure(message, error); })
			.finally(() => inFlight.delete(work));
		inFlight.add(work);
	});
	return new Promise((resolve) => input.on('close', () => { Promise.allSettled([...inFlight]).then(() => resolve()); }));
}

// ---------------------------------------------------------------------------------------------------------------

run(process.argv.slice(2)).then(
	() => { process.exitCode = EXIT.ok; },
	(error) => {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = error instanceof CliError ? error.exitCode : EXIT.tool;
	}
);
