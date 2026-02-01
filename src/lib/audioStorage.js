/**
 * Audio Storage Utilities
 * Handles storing and retrieving audio files from IndexedDB
 */

import { db } from './db';

/**
 * Store audio file in IndexedDB
 * Returns the stored audio object with metadata
 */
export async function storeAudioFile(file) {
	try {
		// Read file as ArrayBuffer
		const arrayBuffer = await file.arrayBuffer();

		// Create audio object with metadata
		const audioData = {
			id: crypto.randomUUID(),
			name: file.name,
			type: file.type,
			size: file.size,
			data: arrayBuffer,
			createdAt: new Date().toISOString(),
		};

		// Store in a custom audio table (we'll need to add this to schema)
		// For now, return the audio data to be stored with the dialogue row
		return {
			id: audioData.id,
			name: audioData.name,
			type: audioData.type,
			size: audioData.size,
			blob: new Blob([arrayBuffer], { type: file.type }),
			dataUrl: await fileToDataUrl(file),
		};
	} catch (error) {
		console.error('Error storing audio file:', error);
		throw error;
	}
}

/**
 * Convert File to Data URL for storage
 */
function fileToDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

/**
 * Convert Data URL back to Blob
 */
export function dataUrlToBlob(dataUrl) {
	const parts = dataUrl.split(',');
	const mime = parts[0].match(/:(.*?);/)[1];
	const bstr = atob(parts[1]);
	let n = bstr.length;
	const u8arr = new Uint8Array(n);
	while (n--) {
		u8arr[n] = bstr.charCodeAt(n);
	}
	return new Blob([u8arr], { type: mime });
}

/**
 * Create object URL from audio data for playback
 */
export function createAudioUrl(audioData) {
	if (!audioData || !audioData.dataUrl) return null;

	try {
		const blob = dataUrlToBlob(audioData.dataUrl);
		return URL.createObjectURL(blob);
	} catch (error) {
		console.error('Error creating audio URL:', error);
		return null;
	}
}

/**
 * Get audio duration from file
 */
export function getAudioDuration(file) {
	return new Promise((resolve, reject) => {
		const audio = new Audio();
		const url = URL.createObjectURL(file);

		audio.addEventListener('loadedmetadata', () => {
			URL.revokeObjectURL(url);
			resolve(audio.duration);
		});

		audio.addEventListener('error', () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load audio'));
		});

		audio.src = url;
	});
}

/**
 * Validate audio file
 */
export function validateAudioFile(file) {
	const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3'];
	const maxSize = 10 * 1024 * 1024; // 10MB

	if (!validTypes.includes(file.type)) {
		return { valid: false, error: 'Invalid file type. Please upload WAV or MP3 files.' };
	}

	if (file.size > maxSize) {
		return { valid: false, error: 'File too large. Maximum size is 10MB.' };
	}

	return { valid: true };
}
