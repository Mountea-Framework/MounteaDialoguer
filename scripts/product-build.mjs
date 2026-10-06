import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export function resolveReleaseIdentity({ version, env = process.env, git = (args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true }).trim() }) {
	const explicit = String(env.MOUNTEA_RELEASE || '').trim();
	if (explicit) return explicit;
	if (env.CI && env.GITHUB_SHA) return `mountea-dialoguer@${version}+${env.GITHUB_SHA}`;
	let revision = 'unknown';
	let dirty = true;
	try { revision = git(['rev-parse', 'HEAD']); dirty = Boolean(git(['status', '--porcelain'])); } catch { /* Source archives have no Git metadata. */ }
	return `mountea-dialoguer@${version}+local.${revision}${dirty ? '.dirty' : ''}`;
}

export function productBuildPlugin(release, reportingEnabled = false) {
	const filename = 'onboarding-example.mnteadlgproj';
	const source = readFileSync(new URL('../ExampleProject/OnboardingExample.mnteadlgproj', import.meta.url));
	return {
		name: 'mountea-product-artifacts',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (req.url?.split('?')[0] !== `/${filename}`) return next();
				res.setHeader('Content-Type', 'application/octet-stream');
				res.end(source);
			});
		},
		generateBundle() {
			this.emitFile({ type: 'asset', fileName: filename, source });
			this.emitFile({ type: 'asset', fileName: 'release.json', source: JSON.stringify({ release, reportingEnabled }, null, 2) + '\n' });
		},
	};
}
