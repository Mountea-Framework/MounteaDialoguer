/**
 * Device detection utilities
 * Determines if the user is on mobile, tablet, or desktop
 */

export const getDeviceType = () => {
	// Check if window is available (SSR safety)
	if (typeof window === 'undefined') return 'desktop';

	const userAgent = navigator.userAgent || navigator.vendor || window.opera;
	const width = window.innerWidth;

	// Check for tablet
	// iPads (including iPad Pro) report as desktop in modern iOS, so we check both UA and screen size
	const isIpad = /iPad/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	const isAndroidTablet = /android/i.test(userAgent) && !/mobile/i.test(userAgent);
	const isLargeScreen = width >= 768; // md breakpoint

	if (isIpad || isAndroidTablet) {
		return 'tablet';
	}

	// Check for mobile
	const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

	if (isMobile && width < 768) {
		return 'mobile';
	}

	// Default to desktop for tablets and larger screens
	if (isLargeScreen) {
		return width >= 1024 ? 'desktop' : 'tablet';
	}

	return 'mobile';
};

export const isMobileDevice = () => getDeviceType() === 'mobile';
export const isTabletDevice = () => getDeviceType() === 'tablet';
export const isDesktopDevice = () => getDeviceType() === 'desktop';
export const isTouchDevice = () => {
	if (typeof window === 'undefined') return false;
	return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};
