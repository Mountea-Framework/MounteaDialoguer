/**
 * Device detection utilities
 * Determines if the user is on mobile, tablet, or desktop
 * Works correctly inside iframes by prioritizing user agent over viewport width
 */

export const getDeviceType = () => {
	// Check if window is available (SSR safety)
	if (typeof window === 'undefined') return 'desktop';

	const userAgent = navigator.userAgent || navigator.vendor || window.opera;

	// Use screen width for more reliable detection in iframes
	// screen.width gives actual device screen width, not iframe width
	const screenWidth = window.screen?.width || window.innerWidth;
	const viewportWidth = window.innerWidth;

	// Use the smaller of screen width or viewport width for detection
	// This handles both iframe and direct browsing scenarios
	const width = Math.min(screenWidth, viewportWidth);

	// Check for tablet
	// iPads (including iPad Pro) report as desktop in modern iOS, so we check both UA and screen size
	const isIpad = /iPad/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	const isAndroidTablet = /android/i.test(userAgent) && !/mobile/i.test(userAgent);

	if (isIpad || isAndroidTablet) {
		return 'tablet';
	}

	// Check for mobile - prioritize user agent detection
	const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

	// If user agent indicates mobile device, trust it (important for iframes)
	if (isMobileUA) {
		// Only override to tablet if screen is actually large (>= 768px)
		if (screenWidth >= 768 && screenWidth < 1024) {
			return 'tablet';
		}
		return 'mobile';
	}

	// For non-mobile user agents, use width-based detection
	if (width >= 1024) {
		return 'desktop';
	} else if (width >= 768) {
		return 'tablet';
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
