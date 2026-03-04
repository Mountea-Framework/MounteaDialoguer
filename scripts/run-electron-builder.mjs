import { spawn } from "node:child_process";
import process from "node:process";

const FILTERED_PATTERNS = [
	"duplicate dependency references",
	"skipped macOS notarization",
];

function commandForCurrentPlatform(command) {
	return process.platform === "win32" ? `${command}.cmd` : command;
}

function shouldFilterLine(line) {
	return FILTERED_PATTERNS.some((pattern) => line.includes(pattern));
}

function forwardStream(stream, target, rawLogsEnabled) {
	let pending = "";

	stream.on("data", (chunk) => {
		const text = pending + chunk.toString();
		const lines = text.split(/\r?\n/);
		pending = lines.pop() ?? "";

		for (const line of lines) {
			if (rawLogsEnabled || !shouldFilterLine(line)) {
				target.write(`${line}\n`);
			}
		}
	});

	stream.on("end", () => {
		if (!pending) return;
		if (rawLogsEnabled || !shouldFilterLine(pending)) {
			target.write(`${pending}\n`);
		}
	});
}

function main() {
	const args = process.argv.slice(2);
	const rawLogsEnabled = process.env.ELECTRON_BUILDER_RAW_LOGS === "1";

	const child = spawn(commandForCurrentPlatform("electron-builder"), args, {
		stdio: ["inherit", "pipe", "pipe"],
		env: process.env,
	});

	forwardStream(child.stdout, process.stdout, rawLogsEnabled);
	forwardStream(child.stderr, process.stderr, rawLogsEnabled);

	child.on("exit", (code, signal) => {
		if (signal) {
			process.kill(process.pid, signal);
			return;
		}
		process.exit(code ?? 1);
	});
}

main();
