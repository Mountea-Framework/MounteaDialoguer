import { isDesktopElectronRuntime } from '@/lib/electronRuntime';
import {
	getOnboardingExampleBundledPath,
	getOnboardingExampleProjectRemoteUrl,
} from '@/lib/runtimeConfig';

export const ONBOARDING_TEMPLATE_ERROR_CODES = Object.freeze({
	REMOTE_FETCH_FAILED: 'ONBOARDING_TEMPLATE_REMOTE_FETCH_FAILED',
	BUNDLED_FETCH_FAILED: 'ONBOARDING_TEMPLATE_BUNDLED_FETCH_FAILED',
	WEB_FALLBACK_REQUIRED: 'ONBOARDING_TEMPLATE_WEB_FALLBACK_REQUIRED',
});

export class OnboardingTemplateError extends Error {
	constructor(message, code, details = {}) {
		super(message);
		this.name = 'OnboardingTemplateError';
		this.code = code;
		this.details = details;
	}
}

function toTemplateFile(blob, source) {
	return new File([blob], `onboarding-example-${source}.mnteadlgproj`, {
		type: 'application/octet-stream',
	});
}

async function fetchBlob(url, sourceLabel) {
	const response = await fetch(url, { cache: 'no-store' });
	if (!response.ok) {
		throw new Error(`${sourceLabel} fetch failed with HTTP ${response.status}`);
	}
	return await response.blob();
}

function tryBuildGithubRawUrl(urlString) {
	try {
		const url = new URL(String(urlString || '').trim());
		if (url.protocol !== 'https:' || url.hostname !== 'github.com') return null;
		const parts = url.pathname.split('/').filter(Boolean);
		if (parts.length < 5) return null;
		const owner = parts[0];
		const repo = parts[1];
		const mode = parts[2];

		if (mode === 'blob') {
			const ref = parts[3];
			const filePath = parts.slice(4).join('/');
			if (!owner || !repo || !ref || !filePath) return null;
			return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${filePath}`;
		}

		if (mode === 'raw') {
			if (parts[3] === 'refs' && parts[4] === 'heads' && parts.length >= 7) {
				const ref = parts[5];
				const filePath = parts.slice(6).join('/');
				return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${filePath}`;
			}
			if (parts.length >= 5) {
				const ref = parts[3];
				const filePath = parts.slice(4).join('/');
				return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${filePath}`;
			}
		}
	} catch (_error) {
		return null;
	}
	return null;
}

function buildRemoteTemplateCandidates(remoteUrl) {
	const candidates = [];
	const normalized = String(remoteUrl || '').trim();
	if (normalized) {
		candidates.push(normalized);
	}
	const githubRawCandidate = tryBuildGithubRawUrl(normalized);
	if (githubRawCandidate && !candidates.includes(githubRawCandidate)) {
		candidates.unshift(githubRawCandidate);
	}
	return candidates;
}

export async function resolveOnboardingExampleTemplateFile() {
	const remoteUrl = String(getOnboardingExampleProjectRemoteUrl() || '').trim();
	if (!remoteUrl) {
		throw new OnboardingTemplateError(
			'Onboarding template URL is not configured',
			ONBOARDING_TEMPLATE_ERROR_CODES.REMOTE_FETCH_FAILED
		);
	}

	try {
		const remoteCandidates = buildRemoteTemplateCandidates(remoteUrl);
		let remoteFetchError = null;
		let remoteBlob = null;
		let resolvedRemoteUrl = remoteUrl;

		for (const candidate of remoteCandidates) {
			try {
				remoteBlob = await fetchBlob(candidate, 'Remote onboarding template');
				resolvedRemoteUrl = candidate;
				remoteFetchError = null;
				break;
			} catch (error) {
				remoteFetchError = error;
			}
		}

		if (!remoteBlob) {
			throw remoteFetchError || new Error('Remote onboarding template fetch failed');
		}

		return {
			file: toTemplateFile(remoteBlob, 'remote'),
			source: 'onboarding-remote',
			remoteUrl: resolvedRemoteUrl,
		};
	} catch (remoteError) {
		if (!isDesktopElectronRuntime()) {
			throw new OnboardingTemplateError(
				'Could not download onboarding example. Import a local .mnteadlgproj file to continue.',
				ONBOARDING_TEMPLATE_ERROR_CODES.WEB_FALLBACK_REQUIRED,
				{ remoteUrl, cause: remoteError }
			);
		}

		const bundledRelativePath = String(getOnboardingExampleBundledPath() || '').trim();
		const bundledUrl = `${import.meta.env.BASE_URL}${bundledRelativePath}`;
		try {
			const blob = await fetchBlob(bundledUrl, 'Bundled onboarding template');
			return {
				file: toTemplateFile(blob, 'bundled'),
				source: 'onboarding-bundled',
				remoteUrl,
				bundledUrl,
			};
		} catch (bundledError) {
			throw new OnboardingTemplateError(
				'Could not load onboarding example from remote or bundled template.',
				ONBOARDING_TEMPLATE_ERROR_CODES.BUNDLED_FETCH_FAILED,
				{ remoteUrl, bundledUrl, remoteError, bundledError }
			);
		}
	}
}
