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

export async function resolveOnboardingExampleTemplateFile() {
	const remoteUrl = String(getOnboardingExampleProjectRemoteUrl() || '').trim();
	if (!remoteUrl) {
		throw new OnboardingTemplateError(
			'Onboarding template URL is not configured',
			ONBOARDING_TEMPLATE_ERROR_CODES.REMOTE_FETCH_FAILED
		);
	}

	try {
		const blob = await fetchBlob(remoteUrl, 'Remote onboarding template');
		return {
			file: toTemplateFile(blob, 'remote'),
			source: 'onboarding-remote',
			remoteUrl,
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
