/**
 * Device detection utilities
 * Determines if the user is on mobile, tablet, or desktop
 * Works correctly inside iframes by using multiple detection methods
 */

export const getDeviceType = () => {
	// Check if window is available (SSR safety)
	if (typeof window === 'undefined') return 'desktop';

	const isInIframe = (() => {
		try {
			return window.self !== window.top;
		} catch (error) {
			return true;
		}
	})();

	const viewportWidth =
		window.visualViewport?.width ||
		window.innerWidth ||
		document.documentElement?.clientWidth ||
		window.screen?.width ||
		0;

	const userAgent = navigator.userAgent || navigator.vendor || window.opera;

	// Check touch capability - most reliable for mobile/tablet detection
	const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
	const hasCoarsePointer =
		typeof window.matchMedia === 'function' &&
		(window.matchMedia('(pointer: coarse)').matches ||
			window.matchMedia('(hover: none)').matches);

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

	// In iframes, prefer the viewport width to match the embedded size
	if (isInIframe && viewportWidth) {
		if (viewportWidth < 768) {
			return 'mobile';
		}
		if (viewportWidth < 1024) {
			return 'tablet';
		}
	}

	// For touch or coarse pointer devices with small viewports, treat as mobile/tablet
	if ((hasTouchScreen || hasCoarsePointer) && viewportWidth < 768) {
		return 'mobile';
	}

	if ((hasTouchScreen || hasCoarsePointer) && viewportWidth < 1024) {
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
