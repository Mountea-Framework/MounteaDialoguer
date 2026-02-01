/**
 * Date utility functions
 */

/**
 * Format a date as relative time (e.g., "2 hours ago")
 * @param {string | Date} date - Date to format
 * @returns {string} Formatted relative time
 */
export function formatDistanceToNow(date) {
	const now = new Date();
	const then = new Date(date);
	const diffInSeconds = Math.floor((now - then) / 1000);

	if (diffInSeconds < 60) {
		return 'just now';
	}

	const diffInMinutes = Math.floor(diffInSeconds / 60);
	if (diffInMinutes < 60) {
		return `${diffInMinutes}m ago`;
	}

	const diffInHours = Math.floor(diffInMinutes / 60);
	if (diffInHours < 24) {
		return `${diffInHours}h ago`;
	}

	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays < 7) {
		return `${diffInDays}d ago`;
	}

	const diffInWeeks = Math.floor(diffInDays / 7);
	if (diffInWeeks < 4) {
		return `${diffInWeeks}w ago`;
	}

	const diffInMonths = Math.floor(diffInDays / 30);
	if (diffInMonths < 12) {
		return `${diffInMonths}mo ago`;
	}

	const diffInYears = Math.floor(diffInDays / 365);
	return `${diffInYears}y ago`;
}

/**
 * Format a date as a readable string (e.g., "Jan 15, 2024")
 * @param {string | Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
	return new Date(date).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "42 KB")
 */
export function formatFileSize(bytes) {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i];
}
