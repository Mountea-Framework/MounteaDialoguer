import { isMobileDevice } from '@/lib/deviceDetection';

export const isElectronRuntime = () => {
	if (typeof window === 'undefined') return false;
	return Boolean(window.electronAPI?.isElectron);
};

export const isDesktopElectronRuntime = () => {
	return isElectronRuntime() && !isMobileDevice();
};

export const hasSteamBridge = () => {
	if (typeof window === 'undefined') return false;
	return typeof window.electronAPI?.getSteamStatus === 'function';
};
