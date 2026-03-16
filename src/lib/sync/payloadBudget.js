import { MAX_SYNC_PAYLOAD_BYTES, MAX_SYNC_PAYLOAD_MIB } from '@/lib/sync/core/constants';

const AES_GCM_AUTH_TAG_BYTES = 16;
const PAYLOAD_WRAPPER_OVERHEAD_BYTES = 512;

export function getUtf8ByteLength(value) {
	return new TextEncoder().encode(String(value || '')).length;
}

export function estimateEncryptedPayloadBytesForPlaintextBytes(plaintextBytes) {
	const normalizedPlaintextBytes = Math.max(0, Number(plaintextBytes) || 0);
	const encryptedBytes = normalizedPlaintextBytes + AES_GCM_AUTH_TAG_BYTES;
	const base64Bytes = Math.ceil(encryptedBytes / 3) * 4;
	return base64Bytes + PAYLOAD_WRAPPER_OVERHEAD_BYTES;
}

export function estimateEncryptedPayloadBytesFromData(data) {
	const serialized = JSON.stringify(data);
	return estimateEncryptedPayloadBytesForPlaintextBytes(getUtf8ByteLength(serialized));
}

export function formatBytesToMib(bytes) {
	return (bytes / (1024 * 1024)).toFixed(2);
}

export function assertEstimatedSyncPayloadWithinBudget(data, contextLabel = 'sync payload') {
	const estimatedBytes = estimateEncryptedPayloadBytesFromData(data);
	if (estimatedBytes > MAX_SYNC_PAYLOAD_BYTES) {
		throw new Error(
			`${contextLabel} is too large for sync (${formatBytesToMib(
				estimatedBytes
			)} MiB > ${MAX_SYNC_PAYLOAD_MIB} MiB limit).`
		);
	}
	return estimatedBytes;
}
