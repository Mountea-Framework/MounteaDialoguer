const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(buffer) {
	const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i += 1) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value) {
	const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(value.length + (4 - (value.length % 4)) % 4, '=');
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

async function deriveKey(passphrase, salt) {
	const baseKey = await crypto.subtle.importKey(
		'raw',
		encoder.encode(passphrase),
		'PBKDF2',
		false,
		['deriveKey']
	);

	return await crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt,
			iterations: 150000,
			hash: 'SHA-256',
		},
		baseKey,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

export async function encryptPayload(passphrase, data) {
	if (typeof passphrase !== 'string' || !passphrase.trim()) throw new Error('Encryption passphrase is required');
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await deriveKey(passphrase, salt);
	const encoded = encoder.encode(JSON.stringify(data));

	const cipherBuffer = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		encoded
	);

	return {
		version: 1,
		salt: toBase64Url(salt),
		iv: toBase64Url(iv),
		ciphertext: toBase64Url(cipherBuffer),
	};
}

export async function decryptPayload(passphrase, payload) {
	if (payload?.version !== 1 || typeof passphrase !== 'string' || !passphrase.trim() || !['salt', 'iv', 'ciphertext'].every((field) => typeof payload[field] === 'string' && /^[A-Za-z0-9_-]+$/.test(payload[field])) || payload.ciphertext.length > 32 * 1024 * 1024) {
		throw new Error('Invalid encrypted payload');
	}

	const salt = fromBase64Url(payload.salt);
	const iv = fromBase64Url(payload.iv);
	const ciphertext = fromBase64Url(payload.ciphertext);
	if (salt.byteLength !== 16 || iv.byteLength !== 12 || ciphertext.byteLength < 16) throw new Error('Invalid encrypted payload parameters');
	const key = await deriveKey(passphrase, salt);

	const plainBuffer = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv },
		key,
		ciphertext
	);

	const json = decoder.decode(plainBuffer);
	return JSON.parse(json);
}
