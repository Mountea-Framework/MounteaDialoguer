import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function packagedExecutable(platform, architecture) {
	if (platform === 'win32') return `release/${architecture === 'x64' ? 'win-unpacked' : `win-${architecture}-unpacked`}/Mountea Dialoguer.exe`;
	if (platform === 'darwin') return `release/${architecture === 'x64' ? 'mac' : `mac-${architecture}`}/Mountea Dialoguer.app/Contents/MacOS/Mountea Dialoguer`;
	if (platform === 'linux') return `release/${architecture === 'x64' ? 'linux-unpacked' : `linux-${architecture}-unpacked`}/mountea-dialoguer`;
	throw new Error(`Unsupported native validation platform: ${platform}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	process.env.MOUNTEA_PACKAGED_EXECUTABLE ||= packagedExecutable(process.platform, process.arch);
	process.env.MOUNTEA_NATIVE_EVIDENCE_PATH ||= `tmp/native-validation-${process.platform}-${process.arch}.json`;
	await import('./check-electron-startup.mjs');
}
