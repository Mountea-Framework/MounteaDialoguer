import { useTheme } from '@/contexts/ThemeProvider';

export function SteamIcon({ className = 'h-5 w-8 object-contain' }) {
	const { resolvedTheme } = useTheme();
	const iconFile =
		resolvedTheme === 'dark'
			? 'steam-logo-official-white-small.png'
			: 'steam-logo-official-black-small.png';
	const iconSrc = `${import.meta.env.BASE_URL}${iconFile}`;
	return <img src={iconSrc} alt="Steam" className={className} />;
}
