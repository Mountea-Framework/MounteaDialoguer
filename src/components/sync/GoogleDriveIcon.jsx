export function GoogleDriveIcon({ className = 'h-5 w-5' }) {
	const iconSrc = `${import.meta.env.BASE_URL}google-drive-icon.svg`;
	return (
		<img src={iconSrc} alt="Google Drive" className={className} />
	);
}
