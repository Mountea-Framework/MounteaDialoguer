import { isDesktopElectronRuntime } from '@/lib/electronRuntime';

function getElectronApi() {
	if (typeof window === 'undefined') return null;
	return window.electronAPI || null;
}

function bytesToBase64(bytes) {
	let binary = '';
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		const chunk = bytes.subarray(i, i + chunkSize);
		binary += String.fromCharCode(...chunk);
	}
	return btoa(binary);
}

export async function saveExportBlob({ blob, defaultFileName, filters = [] }) {
	if (!(blob instanceof Blob)) {
		throw new Error('Export payload is not a Blob');
	}

	const electronApi = getElectronApi();
	if (
		isDesktopElectronRuntime() &&
		electronApi &&
		typeof electronApi.saveFileDialog === 'function'
	) {
		const arrayBuffer = await blob.arrayBuffer();
		const fileBase64 = bytesToBase64(new Uint8Array(arrayBuffer));
		const result = await electronApi.saveFileDialog({
			defaultFileName,
			filters,
			fileBase64,
		});
		return {
			canceled: Boolean(result?.canceled),
			filePath: String(result?.filePath || ''),
			savedViaDialog: !result?.canceled,
		};
	}

	const { saveAs } = await import('file-saver');
	saveAs(blob, defaultFileName);
	return {
		canceled: false,
		filePath: '',
		savedViaDialog: false,
	};
}

export async function openContainingFolder(filePath) {
	const targetFilePath = String(filePath || '').trim();
	if (!targetFilePath) return false;
	const electronApi = getElectronApi();
	if (!electronApi || typeof electronApi.openContainingFolder !== 'function') {
		return false;
	}
	return Boolean(await electronApi.openContainingFolder(targetFilePath));
}
