import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { NativeSelect } from '@/components/ui/native-select';

const LANGUAGES = [
	{ code: 'en', name: 'English', flag: '🇬🇧' },
	{ code: 'de', name: 'Deutsch', flag: '🇩🇪' },
	{ code: 'fr', name: 'Français', flag: '🇫🇷' },
	{ code: 'es', name: 'Español', flag: '🇪🇸' },
	{ code: 'pl', name: 'Polski', flag: '🇵🇱' },
];

/**
 * Language Selector Component
 * Allows users to change the application language
 */
export function LanguageSelector({ variant = 'default' }) {
	const { i18n } = useTranslation();

	const handleLanguageChange = (languageCode) => {
		i18n.changeLanguage(languageCode);
		localStorage.setItem('i18nextLng', languageCode);
	};

	const activeLanguage = i18n.resolvedLanguage || i18n.language || 'en';
	const normalizedLanguage = activeLanguage.split('-')[0];
	const currentLanguage = LANGUAGES.find((lang) => lang.code === normalizedLanguage) || LANGUAGES[0];

	if (variant === 'icon') {
		return (
			<div className="relative">
				<NativeSelect
					aria-label="Language"
					value={normalizedLanguage}
					onChange={(e) => handleLanguageChange(e.target.value)}
					className="w-[50px] px-2 text-transparent"
				>
					{LANGUAGES.map((language) => (
						<option key={language.code} value={language.code}>
							{language.flag} {language.name}
						</option>
					))}
				</NativeSelect>
				<Languages className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			</div>
		);
	}

	return (
		<NativeSelect
			value={normalizedLanguage}
			onChange={(e) => handleLanguageChange(e.target.value)}
			className="w-[180px]"
		>
			{LANGUAGES.map((language) => (
				<option key={language.code} value={language.code}>
					{language.flag} {language.name}
				</option>
			))}
		</NativeSelect>
	);
}
