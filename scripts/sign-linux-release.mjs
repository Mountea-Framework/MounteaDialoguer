import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { verifyArtifact } from './release-artifact.mjs';

export async function linuxSigningKeys(env = process.env) {
	for (const key of ['MOUNTEA_LINUX_SIGNING_KEY_FILE', 'MOUNTEA_LINUX_PUBLIC_KEY_FILE']) if (!env[key]) throw new Error(`Public linux release requires ${key}; signing cannot be skipped.`);
	const privateKey = createPrivateKey(await fs.readFile(env.MOUNTEA_LINUX_SIGNING_KEY_FILE));
	const publicKey = createPublicKey(await fs.readFile(env.MOUNTEA_LINUX_PUBLIC_KEY_FILE));
	if (privateKey.asymmetricKeyType !== 'ed25519' || publicKey.asymmetricKeyType !== 'ed25519') throw new Error('Linux release keys must use Ed25519.');
	if (!verify(null, Buffer.from('release-key-check'), publicKey, sign(null, Buffer.from('release-key-check'), privateKey))) throw new Error('Linux release signing keys do not match.');
	return { privateKey, publicKey };
}
export async function signLinuxArtifacts(directory, { renderer = 'dist', env = process.env } = {}) {
	const keys = await linuxSigningKeys(env), artifact = await verifyArtifact(renderer);
	const names = (await fs.readdir(directory)).filter((name) => /\.(AppImage|deb)$/.test(name)).sort();
	if (!names.length) throw new Error('No Linux distribution artifacts were produced.');
	const files = {};
	for (const name of names) files[name] = createHash('sha256').update(await fs.readFile(path.join(directory, name))).digest('hex');
	const manifest = Buffer.from(JSON.stringify({ version: 1, release: artifact.release, rendererInventorySha256: createHash('sha256').update(await fs.readFile(path.join(renderer, 'artifact-integrity.json'))).digest('hex'), files }, null, 2) + '\n');
	const signature = sign(null, manifest, keys.privateKey);
	if (!verify(null, manifest, keys.publicKey, signature)) throw new Error('Linux detached signature verification failed.');
	await fs.writeFile(path.join(directory, 'release-manifest.json'), manifest);
	await fs.writeFile(path.join(directory, 'release-manifest.sig'), signature);
	await fs.writeFile(path.join(directory, 'release-public-key.pem'), keys.publicKey.export({ type: 'spki', format: 'pem' }));
	return JSON.parse(manifest);
}
