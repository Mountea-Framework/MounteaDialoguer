import {
	PARTICIPANT_THUMBNAIL_ALLOWED_TYPES,
	PARTICIPANT_THUMBNAIL_MAX_BYTES,
	PARTICIPANT_THUMBNAIL_MAX_DIMENSION,
	PARTICIPANT_THUMBNAIL_MAX_INPUT_BYTES,
	PARTICIPANT_THUMBNAIL_MIN_DIMENSION,
} from '@/lib/sync/core/constants';


function sanitizeImageIdSegment(value, fallback = 'Unknown') {
	const normalized = String(value || '')
		.trim()
		.replace(/[.\s/\\>-]+/g, '_')
		.replace(/[^a-zA-Z0-9_]/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');
	return normalized || fallback;
}

function base64ToBlob(dataUrl) {
	const normalized = String(dataUrl || '');
	const separatorIndex = normalized.indexOf(',');
	if (separatorIndex <= 0) {
		throw new Error('Invalid thumbnail payload');
	}

	const metadata = normalized.slice(0, separatorIndex);
	const data = normalized.slice(separatorIndex + 1);
	const mimeMatch = metadata.match(/^data:([^;]+);base64$/i);
	if (!mimeMatch) {
		throw new Error('Invalid thumbnail payload');
	}

	const binary = atob(data);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return new Blob([bytes], { type: mimeMatch[1] || 'image/png' });
}

function blobToDataUrl(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ''));
		reader.onerror = () => reject(new Error('Failed to read thumbnail data'));
		reader.readAsDataURL(blob);
	});
}

function loadImageFromBlob(blob) {
	const objectUrl = URL.createObjectURL(blob);
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			URL.revokeObjectURL(objectUrl);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error('Failed to decode image'));
		};
		image.src = objectUrl;
	});
}

function renderSquarePngBlob(image, targetSize) {
	const size = Math.max(1, Math.floor(targetSize));
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('Failed to initialize image canvas');
	}

	const sourceWidth = image.naturalWidth || image.width;
	const sourceHeight = image.naturalHeight || image.height;
	const cropSize = Math.min(sourceWidth, sourceHeight);
	const offsetX = Math.max(0, Math.floor((sourceWidth - cropSize) / 2));
	const offsetY = Math.max(0, Math.floor((sourceHeight - cropSize) / 2));

	context.clearRect(0, 0, size, size);
	context.drawImage(image, offsetX, offsetY, cropSize, cropSize, 0, 0, size, size);

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error('Failed to create PNG thumbnail'));
					return;
				}
				resolve(blob);
			},
			'image/png',
			1
		);
	});
}

async function normalizeImageBlobToStoredThumbnail(blob) {
	const image = await loadImageFromBlob(blob);
	const sourceWidth = image.naturalWidth || image.width;
	const sourceHeight = image.naturalHeight || image.height;
	const sourceSize = Math.max(sourceWidth, sourceHeight);
	if (!sourceSize) {
		throw new Error('Invalid image dimensions');
	}

	let targetSize = Math.min(PARTICIPANT_THUMBNAIL_MAX_DIMENSION, sourceSize);
	let latestBlob = null;

	for (let attempt = 0; attempt < 10; attempt += 1) {
		latestBlob = await renderSquarePngBlob(image, targetSize);
		if (latestBlob.size <= PARTICIPANT_THUMBNAIL_MAX_BYTES) {
			const base64 = await blobToDataUrl(latestBlob);
			return {
				base64,
				mimeType: 'image/png',
				sizeBytes: latestBlob.size,
				width: Math.max(1, Math.floor(targetSize)),
				height: Math.max(1, Math.floor(targetSize)),
				updatedAt: new Date().toISOString(),
			};
		}
		if (targetSize <= PARTICIPANT_THUMBNAIL_MIN_DIMENSION) break;
		targetSize = Math.max(
			PARTICIPANT_THUMBNAIL_MIN_DIMENSION,
			Math.floor(targetSize * 0.82)
		);
	}

	const measuredSize = latestBlob?.size || 0;
	throw new Error(
		`Thumbnail exceeds 1 MB after normalization (${Math.round(
			measuredSize / 1024
		)} KB). Please use a simpler image.`
	);
}

export function buildParticipantImageId({ participantName = '', categoryPath = '' } = {}) {
	const safeCategoryPath = sanitizeImageIdSegment(categoryPath || 'Uncategorized', 'Uncategorized');
	const safeName = sanitizeImageIdSegment(participantName || 'Participant', 'Participant');
	return `T_${safeCategoryPath}_${safeName}_Thumbnail`;
}

export function resolveParticipantThumbnailDataUrl(thumbnail = null) {
	if (!thumbnail || typeof thumbnail !== 'object') return '';
	const base64 = String(thumbnail.base64 || '').trim();
	if (!base64.startsWith('data:image/')) return '';
	return base64;
}

export function storedParticipantThumbnailToBlob(thumbnail = null) {
	const dataUrl = resolveParticipantThumbnailDataUrl(thumbnail);
	if (!dataUrl) return null;
	return base64ToBlob(dataUrl);
}

export async function blobToStoredParticipantThumbnail(blob) {
	if (!(blob instanceof Blob)) {
		throw new Error('Invalid thumbnail file');
	}
	if (blob.size > PARTICIPANT_THUMBNAIL_MAX_INPUT_BYTES) {
		throw new Error('Thumbnail input file is too large.');
	}
	return await normalizeImageBlobToStoredThumbnail(blob);
}

export async function processParticipantThumbnailFile(file) {
	if (!(file instanceof Blob)) {
		throw new Error('No image selected');
	}
	const mimeType = String(file.type || '').trim().toLowerCase();
	if (!PARTICIPANT_THUMBNAIL_ALLOWED_TYPES.has(mimeType)) {
		throw new Error('Invalid image type. Please use PNG, JPG, or WEBP.');
	}
	if (file.size > PARTICIPANT_THUMBNAIL_MAX_INPUT_BYTES) {
		throw new Error('Image is too large. Maximum input size is 10 MB.');
	}
	return await normalizeImageBlobToStoredThumbnail(file);
}
