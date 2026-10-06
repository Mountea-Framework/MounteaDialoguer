import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const inventoryName = 'artifact-integrity.json';
const validationName = 'artifact-validation.json';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
export async function filesUnder(directory, prefix = '') {
	const result = [];
	for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
		const name = prefix + entry.name;
		if (entry.isSymbolicLink()) throw new Error(`Release artifacts cannot contain symbolic links: ${name}`);
		if (entry.isDirectory()) result.push(...await filesUnder(path.join(directory, entry.name), `${name}/`));
		else if (entry.isFile()) result.push(name);
	}
	return result.sort();
}
async function inventory(directory) {
	const files = (await filesUnder(directory)).filter((name) => ![inventoryName, validationName].includes(name));
	if (files.some((name) => name.endsWith('.map'))) throw new Error('Private source maps must be removed before validation or distribution.');
	if (!files.includes('index.html') || !files.includes('release.json') || !files.includes('onboarding-example.mnteadlgproj')) throw new Error('The renderer artifact is incomplete.');
	return Object.fromEntries(await Promise.all(files.map(async (name) => [name, digest(await fs.readFile(path.join(directory, name)))])));
}
export async function finalizeArtifact(directory, { env = process.env, execute = spawnSync } = {}) {
	const manifest = JSON.parse(await fs.readFile(path.join(directory, 'release.json'), 'utf8'));
	if (typeof manifest.release !== 'string' || !manifest.release) throw new Error('A release identity is required.');
	const maps = (await filesUnder(directory)).filter((name) => name.endsWith('.map'));
	if (manifest.reportingEnabled) {
		for (const key of ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT']) if (!env[key]) throw new Error(`Reporting-enabled releases require ${key}; source maps have not been uploaded.`);
		if (!maps.length) throw new Error('Reporting-enabled releases require private source maps.');
		const args = ['releases', 'files', manifest.release, 'upload-sourcemaps', directory, '--url-prefix', '~/'];
		// npm's Windows .cmd shim cannot be spawned with shell:false. Resolve the
		// installed native binary instead; never put release inputs through a shell.
		const command = env.SENTRY_CLI && !/\.(cmd|bat)$/i.test(env.SENTRY_CLI) ? env.SENTRY_CLI : createRequire(import.meta.url)('@sentry/cli').getPath();
		const uploaded = execute(command, args, { env, stdio: 'inherit', windowsHide: true, shell: false });
		if (uploaded.error || uploaded.status !== 0) throw new Error('Sentry source-map upload failed; artifact is not ready for validation.');
	}
	for (const name of maps) await fs.unlink(path.join(directory, name));
	await fs.rm(path.join(directory, validationName), { force: true });
	const record = { version: 1, release: manifest.release, files: await inventory(directory) };
	await fs.writeFile(path.join(directory, inventoryName), JSON.stringify(record, null, 2) + '\n');
	return record;
}
export async function verifyArtifact(directory, { requireValidated = true } = {}) {
	const contents = await fs.readFile(path.join(directory, inventoryName));
	const recorded = JSON.parse(contents), actual = await inventory(directory);
	if (JSON.stringify(recorded.files) !== JSON.stringify(actual)) throw new Error('Renderer artifact changed after fingerprinting. Revalidate the rebuilt artifact.');
	const manifest = JSON.parse(await fs.readFile(path.join(directory, 'release.json'), 'utf8'));
	if (recorded.release !== manifest.release) throw new Error('Artifact release identity mismatch.');
	if (requireValidated) {
		const proof = JSON.parse(await fs.readFile(path.join(directory, validationName), 'utf8'));
		if (proof.inventorySha256 !== digest(contents) || proof.release !== recorded.release || proof.productionBrowser !== 'passed') throw new Error('Artifact has no matching production validation record.');
	}
	return recorded;
}
export async function attestArtifact(directory) {
	const record = await verifyArtifact(directory, { requireValidated: false });
	await fs.writeFile(path.join(directory, validationName), JSON.stringify({ release: record.release, inventorySha256: digest(await fs.readFile(path.join(directory, inventoryName))), productionBrowser: 'passed' }, null, 2) + '\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const [command = 'verify', directory = 'dist'] = process.argv.slice(2);
	if (command === 'finalize') await finalizeArtifact(directory);
	else if (command === 'attest') await attestArtifact(directory);
	else if (command === 'verify') await verifyArtifact(directory, { requireValidated: !process.argv.includes('--unvalidated') });
	else throw new Error(`Unknown artifact command: ${command}`);
	console.log(`Artifact ${command} passed.`);
}
