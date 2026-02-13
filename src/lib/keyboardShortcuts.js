import { isAppleDevice } from '@/lib/deviceDetection';

export const getPrimaryModifierKey = () => (isAppleDevice() ? '⌘' : 'Ctrl');

export const formatShortcut = (shortcut) => {
	if (!shortcut) return shortcut;
	const primary = getPrimaryModifierKey();
	return shortcut
		.replace(/\bCtrl\b/gi, primary)
		.replace(/\bCmd\b/gi, primary)
		.replace(/\bCommand\b/gi, primary);
};

export const formatShortcutKeys = (keys = []) => {
	if (!Array.isArray(keys)) return keys;
	const primary = getPrimaryModifierKey();
	return keys.map((key) => {
		if (key === 'Ctrl' || key === 'Cmd' || key === 'Command') {
			return primary;
		}
		return key;
	});
};
