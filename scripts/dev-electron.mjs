import net from "node:net";
import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const START_PORT = 5173;
const PORT_SCAN_LIMIT = 50;
const CONNECT_TIMEOUT_MS = 500;
const BOOT_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 200;
const DEFAULT_CHOKIDAR_INTERVAL_MS = 300;
const LINUX_ELECTRON_SAFE_ARGS = Object.freeze([
	"--disable-gpu",
	"--disable-software-rasterizer",
	"--disable-gpu-sandbox",
	"--in-process-gpu",
	"--use-gl=swiftshader",
	"--no-sandbox",
	"--disable-setuid-sandbox",
	"--ozone-platform-hint=x11",
]);

function spawnTool(tool, args, options = {}) {
	const isWindows = process.platform === "win32";
	if (tool === "electron") {
		const electronBinary = isWindows
			? path.join(process.cwd(), "node_modules", "electron", "dist", "electron.exe")
			: path.join(process.cwd(), "node_modules", "electron", "dist", "electron");
		if (fs.existsSync(electronBinary)) {
			return spawn(electronBinary, args, options);
		}
	}

	const localBin = path.join(
		process.cwd(),
		"node_modules",
		".bin",
		isWindows ? `${tool}.cmd` : tool
	);
	if (fs.existsSync(localBin)) {
		if (isWindows) {
			return spawn("cmd.exe", ["/d", "/s", "/c", localBin, ...args], options);
		}
		return spawn(localBin, args, options);
	}

	const command = isWindows ? "cmd.exe" : "npx";
	const commandArgs = isWindows ? ["/d", "/s", "/c", "npx", tool, ...args] : [tool, ...args];
	return spawn(command, commandArgs, options);
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
	if (process.platform === "win32") {
		if (!child.pid) return;
		const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
			stdio: "ignore",
			windowsHide: true,
		});
		killer.on("error", () => {
			// Ignore cleanup errors.
		});
		return;
	}
	child.kill("SIGTERM");
}

function resolveSteamAppIdFromEnv() {
	const value = Number(process.env.STEAM_APP_ID || process.env.VITE_STEAM_APP_ID || 0);
	if (!Number.isFinite(value)) return 0;
	if (value <= 0) return 0;
	return Math.floor(value);
}

function prepareSteamAppIdFile() {
	const channel = String(process.env.VITE_DIST_CHANNEL || "").trim().toLowerCase();
	if (channel !== "steam") return () => {};

	const appId = resolveSteamAppIdFromEnv();
	if (!appId) return () => {};

	const filePath = path.join(process.cwd(), "steam_appid.txt");
	const hadExistingFile = fs.existsSync(filePath);
	if (!hadExistingFile) {
		fs.writeFileSync(filePath, `${appId}\n`, "utf8");
		console.log(`[dev:electron] Created steam_appid.txt for AppID ${appId}`);
	}

	return () => {
		if (!hadExistingFile) {
			try {
				fs.unlinkSync(filePath);
				console.log("[dev:electron] Removed temporary steam_appid.txt");
			} catch {
				// Ignore cleanup errors.
			}
		}
	};
}

async function main() {
	const cleanupSteamAppIdFile = prepareSteamAppIdFile();
	const port = await getFreePort(START_PORT, PORT_SCAN_LIMIT);
	const url = `http://localhost:${port}`;

	console.log(`[dev:electron] Using Vite dev server: ${url}`);

	const shouldUsePolling =
		process.env.CHOKIDAR_USEPOLLING === "1" ||
		(process.platform === "linux" && process.env.CHOKIDAR_USEPOLLING !== "0");
	const viteEnv = {
		...process.env,
		CHOKIDAR_USEPOLLING: shouldUsePolling ? "1" : process.env.CHOKIDAR_USEPOLLING,
		CHOKIDAR_INTERVAL:
			process.env.CHOKIDAR_INTERVAL || String(DEFAULT_CHOKIDAR_INTERVAL_MS),
	};
	if (shouldUsePolling) {
		console.log(
			`[dev:electron] Using polling file watcher (CHOKIDAR_INTERVAL=${viteEnv.CHOKIDAR_INTERVAL}ms)`
		);
	}

	const vite = spawnTool("vite", ["--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
		stdio: "inherit",
		env: viteEnv,
	});

	let electron = null;
	let shuttingDown = false;

	const shutdown = (exitCode = 0) => {
		if (shuttingDown) return;
		shuttingDown = true;

		terminateProcess(electron);
		terminateProcess(vite);
		cleanupSteamAppIdFile();

		setTimeout(() => process.exit(exitCode), 750);
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

	const electronEnv = { ...process.env };
	delete electronEnv.ELECTRON_RUN_AS_NODE;
	if (!electronEnv.MOUNTEA_USER_DATA_DIR) {
		electronEnv.MOUNTEA_USER_DATA_DIR = path.join(process.cwd(), ".mountea-user-data");
	}
	if (process.platform === "linux" && !electronEnv.ELECTRON_OZONE_PLATFORM_HINT) {
		electronEnv.ELECTRON_OZONE_PLATFORM_HINT = "x11";
	}

	const shouldUseLinuxSafeMode =
		process.platform === "linux" &&
		String(electronEnv.MOUNTEA_ELECTRON_SAFE_MODE || "1").trim() !== "0";
	const electronBaseArgs = [
		".",
		`--user-data-dir=${electronEnv.MOUNTEA_USER_DATA_DIR}`,
		"--mountea-user-data-reroute",
	];

	let retriedAfterSegfault = false;
	const launchElectron = (extraArgs = []) =>
		spawnTool("electron", [...electronBaseArgs, ...extraArgs], {
			stdio: "inherit",
			env: {
				...electronEnv,
				VITE_DEV_SERVER_URL: url,
			},
		});

	const bindElectronExit = () => {
		if (!electron) return;
		electron.once("exit", (code, signal) => {
			if (shuttingDown) return;

			const exitCode = code ?? 0;
			const exitSignal = signal ?? null;

			if (
				process.platform === "linux" &&
				exitSignal === "SIGSEGV" &&
				!retriedAfterSegfault
			) {
				retriedAfterSegfault = true;
				console.error(
					"[dev:electron] Electron crashed with SIGSEGV. Retrying once in Linux safe mode."
				);
				electron = launchElectron(LINUX_ELECTRON_SAFE_ARGS);
				bindElectronExit();
				return;
			}

			if (exitSignal) {
				console.error(
					`[dev:electron] Electron exited via signal ${exitSignal} (code=${exitCode})`
				);
			}

			shutdown(exitCode);
		});
	};

	electron = launchElectron(shouldUseLinuxSafeMode ? LINUX_ELECTRON_SAFE_ARGS : []);
	bindElectronExit();
}

main().catch((error) => {
	console.error(`[dev:electron] ${error.message}`);
	process.exit(1);
});
