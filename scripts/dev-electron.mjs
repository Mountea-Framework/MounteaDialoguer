import net from "node:net";
import process from "node:process";
import { spawn } from "node:child_process";

const START_PORT = 5173;
const PORT_SCAN_LIMIT = 50;
const CONNECT_TIMEOUT_MS = 500;
const BOOT_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 200;

function commandForCurrentPlatform(command) {
	return process.platform === "win32" ? `${command}.cmd` : command;
}

function getFreePort(startPort, maxAttempts) {
	return new Promise((resolve, reject) => {
		let attempts = 0;
		let currentPort = startPort;

		const tryPort = () => {
			if (attempts >= maxAttempts) {
				reject(
					new Error(
						`Could not find a free port in range ${startPort}-${startPort + maxAttempts - 1}`
					)
				);
				return;
			}

			const server = net.createServer();
			server.unref();

			server.on("error", () => {
				attempts += 1;
				currentPort += 1;
				tryPort();
			});

			server.listen(currentPort, "127.0.0.1", () => {
				const selectedPort = currentPort;
				server.close(() => resolve(selectedPort));
			});
		};

		tryPort();
	});
}

function waitForPort(port, timeoutMs) {
	return new Promise((resolve, reject) => {
		const deadline = Date.now() + timeoutMs;

		const checkPort = () => {
			const socket = new net.Socket();
			let settled = false;

			const finish = (callback) => {
				if (settled) return;
				settled = true;
				socket.destroy();
				callback();
			};

			socket.setTimeout(CONNECT_TIMEOUT_MS);
			socket.once("connect", () => finish(resolve));
			socket.once("timeout", () => finish(retryOrFail));
			socket.once("error", () => finish(retryOrFail));

			socket.connect(port, "127.0.0.1");
		};

		const retryOrFail = () => {
			if (Date.now() >= deadline) {
				reject(new Error(`Timed out waiting for Vite on port ${port}`));
				return;
			}
			setTimeout(checkPort, POLL_INTERVAL_MS);
		};

		checkPort();
	});
}

function terminateProcess(child) {
	if (!child || child.killed) return;
	child.kill("SIGTERM");
}

async function main() {
	const port = await getFreePort(START_PORT, PORT_SCAN_LIMIT);
	const url = `http://localhost:${port}`;

	console.log(`[dev:electron] Using Vite dev server: ${url}`);

	const vite = spawn(commandForCurrentPlatform("vite"), ["--port", String(port), "--strictPort"], {
		stdio: "inherit",
		env: process.env,
	});

	let electron = null;
	let shuttingDown = false;

	const shutdown = (exitCode = 0) => {
		if (shuttingDown) return;
		shuttingDown = true;

		terminateProcess(electron);
		terminateProcess(vite);

		setTimeout(() => process.exit(exitCode), 250);
	};

	process.on("SIGINT", () => shutdown(0));
	process.on("SIGTERM", () => shutdown(0));

	vite.once("exit", (code, signal) => {
		if (!shuttingDown) {
			console.error(
				`[dev:electron] Vite exited before Electron start (code=${code ?? "null"}, signal=${signal ?? "null"})`
			);
			shutdown(code ?? 1);
		}
	});

	await waitForPort(port, BOOT_TIMEOUT_MS);

	electron = spawn(commandForCurrentPlatform("electron"), ["."], {
		stdio: "inherit",
		env: {
			...process.env,
			VITE_DEV_SERVER_URL: url,
		},
	});

	electron.once("exit", (code) => {
		if (!shuttingDown) {
			shutdown(code ?? 0);
		}
	});
}

main().catch((error) => {
	console.error(`[dev:electron] ${error.message}`);
	process.exit(1);
});
