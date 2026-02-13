/**
 * Device detection utilities
 * Determines if the user is on mobile, tablet, or desktop
 * Works correctly inside iframes by using multiple detection methods
 */

export const getDeviceType = () => {
	// Check if window is available (SSR safety)
	if (typeof window === 'undefined') return 'desktop';

	const userAgent = navigator.userAgent || navigator.vendor || window.opera;

	// Check touch capability - most reliable for mobile/tablet detection
	const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

	// Check for tablet first
	const isIpad = /iPad/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	const isAndroidTablet = /android/i.test(userAgent) && !/mobile/i.test(userAgent);

	if (isIpad || isAndroidTablet) {
		return 'tablet';
	}

	// Check for mobile via user agent
	const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(userAgent);

	// If user agent indicates mobile, return mobile
	if (isMobileUA) {
		return 'mobile';
	}

	// For touch devices with small screens, treat as mobile
	// Use screen.width which works in iframes
	const screenWidth = window.screen?.width || window.innerWidth;

	if (hasTouchScreen && screenWidth < 768) {
		return 'mobile';
	}

	if (hasTouchScreen && screenWidth < 1024) {
		return 'tablet';
	}

	// Default to desktop
	return 'desktop';
};

export const isMobileDevice = () => getDeviceType() === 'mobile';
export const isTabletDevice = () => getDeviceType() === 'tablet';
export const isDesktopDevice = () => getDeviceType() === 'desktop';
export const isTouchDevice = () => {
	if (typeof window === 'undefined') return false;
	return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const isAppleDevice = () => {
	if (typeof window === 'undefined') return false;

	const userAgent = navigator.userAgent || navigator.vendor || window.opera;
	const platform = navigator.platform || '';
	const isIpad = /iPad/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	const isIphoneOrIpod = /iPhone|iPod/.test(userAgent);
	const isMac = /Mac/.test(platform) || /Mac/.test(userAgent);

	return isMac || isIpad || isIphoneOrIpod;
};
