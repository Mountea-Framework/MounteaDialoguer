import { serializeAudio } from '@/lib/persistence/canonicalProject';

/** Keep binary evidence durable before presenting it as editable/downloadable JSON. */
export async function serializeRecoveryEvidence(value) {
 if (value instanceof Blob) return { recoveredBlob: await serializeAudio({ blob: value }, 'recovery.original'), ...(value instanceof File ? { name: value.name, lastModified: value.lastModified } : {}) };
 if (value instanceof Date) return { recoveredType: 'Date', value: Number.isNaN(value.getTime()) ? null : value.toISOString() };
 if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
  const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  let binary = ''; for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return { recoveredType: value.constructor.name, base64: btoa(binary), byteLength: bytes.length };
 }
 if (!value || typeof value !== 'object') return value;
 if (value.blob instanceof Blob) {
  const original = Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await serializeRecoveryEvidence(item)])));
  const audio = await serializeAudio({ blob: value.blob }, 'recovery.original.audioFile');
  return { ...original, ...audio, recoveredOriginal: original };
 }
 if (Array.isArray(value)) return Promise.all(value.map(serializeRecoveryEvidence));
 return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await serializeRecoveryEvidence(item)])));
}
