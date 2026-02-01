import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

const LANGUAGES = [
	{ code: 'en', name: 'English', flag: '🇬🇧' },
	{ code: 'de', name: 'Deutsch', flag: '🇩🇪' },
	{ code: 'fr', name: 'Français', flag: '🇫🇷' },
	{ code: 'es', name: 'Español', flag: '🇪🇸' },
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

	const currentLanguage = LANGUAGES.find((lang) => lang.code === i18n.language) || LANGUAGES[0];

	if (variant === 'icon') {
		return (
			<Select value={i18n.language} onValueChange={handleLanguageChange}>
				<SelectTrigger className="w-[50px] px-2">
					<Languages className="h-4 w-4" />
				</SelectTrigger>
				<SelectContent>
					{LANGUAGES.map((language) => (
						<SelectItem key={language.code} value={language.code}>
							<div className="flex items-center gap-2">
								<span>{language.flag}</span>
								<span>{language.name}</span>
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	return (
		<Select value={i18n.language} onValueChange={handleLanguageChange}>
			<SelectTrigger className="w-[180px]">
				<SelectValue>
					<div className="flex items-center gap-2">
						<span>{currentLanguage.flag}</span>
						<span>{currentLanguage.name}</span>
					</div>
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{LANGUAGES.map((language) => (
					<SelectItem key={language.code} value={language.code}>
						<div className="flex items-center gap-2">
							<span>{language.flag}</span>
							<span>{language.name}</span>
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
