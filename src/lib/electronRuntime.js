import { isMobileDevice } from '@/lib/deviceDetection';

export const isElectronRuntime = () => {
	if (typeof window === 'undefined') return false;
	return Boolean(window.electronAPI?.isElectron);
};

export const isDesktopElectronRuntime = () => {
	return isElectronRuntime() && !isMobileDevice();
};
