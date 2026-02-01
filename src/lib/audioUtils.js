/**
 * Audio Utility Functions
 * Handles audio blob conversion and storage
 */

/**
 * Convert a Blob to base64 string for storage
 */
export async function blobToBase64(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

/**
 * Convert base64 string back to Blob
 */
export function base64ToBlob(base64, mimeType = 'audio/wav') {
	const byteCharacters = atob(base64.split(',')[1]);
	const byteNumbers = new Array(byteCharacters.length);
	for (let i = 0; i < byteCharacters.length; i++) {
		byteNumbers[i] = byteCharacters.charCodeAt(i);
	}
	const byteArray = new Uint8Array(byteNumbers);
	return new Blob([byteArray], { type: mimeType });
}

/**
 * Prepare audio file for storage (convert blob to base64)
 */
export async function prepareAudioForStorage(audioFile) {
	if (!audioFile || !audioFile.blob) return null;
	
	const base64 = await blobToBase64(audioFile.blob);
	return {
		name: audioFile.name,
		base64: base64,
		mimeType: audioFile.blob.type,
	};
}

/**
 * Restore audio file from storage (convert base64 to blob)
 */
export function restoreAudioFromStorage(storedAudio) {
	if (!storedAudio || !storedAudio.base64) return null;
	
	const blob = base64ToBlob(storedAudio.base64, storedAudio.mimeType);
	return {
		name: storedAudio.name,
		blob: blob,
		url: URL.createObjectURL(blob),
	};
}
