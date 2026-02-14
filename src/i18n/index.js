import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from './locales/en.json';
import csTranslations from './locales/cs.json';
import deTranslations from './locales/de.json';
import frTranslations from './locales/fr.json';
import esTranslations from './locales/es.json';
import plTranslations from './locales/pl.json';

/**
 * i18next configuration for Mountea Dialoguer
 * Supports multiple languages with browser language detection
 */
i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			en: { translation: enTranslations },
			cs: { translation: csTranslations },
			de: { translation: deTranslations },
			fr: { translation: frTranslations },
			es: { translation: esTranslations },
			pl: { translation: plTranslations },
		},
		supportedLngs: ['en', 'cs', 'de', 'fr', 'es', 'pl'],
		nonExplicitSupportedLngs: true,
		fallbackLng: 'en',
		interpolation: {
			escapeValue: false,
		},
		detection: {
			order: ['localStorage', 'navigator'],
			caches: ['localStorage'],
		},
	});

export default i18n;
