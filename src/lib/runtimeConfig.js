function readFlag(rawValue, defaultValue = false) {
	if (rawValue === undefined || rawValue === null || rawValue === '') return defaultValue;
	const value = String(rawValue).trim().toLowerCase();
	if (['1', 'true', 'yes', 'on'].includes(value)) return true;
	if (['0', 'false', 'no', 'off'].includes(value)) return false;
	return defaultValue;
}

export function getDistributionChannel() {
	const raw = import.meta.env.VITE_DIST_CHANNEL || 'desktop';
	return String(raw).trim().toLowerCase();
}

export function isSteamChannel() {
	return getDistributionChannel() === 'steam';
}

/** Build flag for the self-hosted web edition: sync goes to the bundled server (server/), with no login. */
export function isSelfHostedSync() {
	return readFlag(import.meta.env.VITE_SYNC_SERVER, false);
}

export function isGoogleSyncEnabled() {
	if (isSelfHostedSync()) return false;
	return readFlag(import.meta.env.VITE_ENABLE_GOOGLE_SYNC, true);
}

const ONBOARDING_EXAMPLE_REMOTE_URL =
	'https://github.com/Mountea-Framework/MounteaDialoguer/raw/refs/heads/master/ExampleProject/OnboardingExample.mnteadlgproj';
const ONBOARDING_EXAMPLE_BUNDLED_PATH = 'onboarding-example.mnteadlgproj';

export function getOnboardingExampleProjectRemoteUrl() {
	return ONBOARDING_EXAMPLE_REMOTE_URL;
}

export function getOnboardingExampleBundledPath() {
	return ONBOARDING_EXAMPLE_BUNDLED_PATH;
}
