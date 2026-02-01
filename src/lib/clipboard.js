/**
 * Copy text to clipboard with fallback support
 * Returns true if successful, false otherwise
 */
export async function copyToClipboard(text) {
	try {
		// Try using modern Clipboard API first
		if (navigator.clipboard && window.isSecureContext) {
			await navigator.clipboard.writeText(text);
			return true;
		}

		// Fallback for older browsers or non-HTTPS
		const textArea = document.createElement('textarea');
		textArea.value = text;
		textArea.style.position = 'fixed';
		textArea.style.left = '-9999px';
		textArea.style.top = '-9999px';
		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();

		const successful = document.execCommand('copy');
		document.body.removeChild(textArea);

		return successful;
	} catch (error) {
		console.error('Failed to copy to clipboard:', error);
		return false;
	}
}

/**
 * Copy text to clipboard and show a toast notification
 * Requires the toast function from useToast hook
 */
export async function copyToClipboardWithToast(text, toast, options = {}) {
	const success = await copyToClipboard(text);

	if (success) {
		toast({
			variant: 'success',
			title: options.successTitle || 'Copied!',
			description: options.successMessage || 'Copied to clipboard',
			duration: 2000,
		});
	} else {
		toast({
			variant: 'error',
			title: options.errorTitle || 'Copy failed',
			description: options.errorMessage || 'Failed to copy to clipboard',
		});
	}

	return success;
}
