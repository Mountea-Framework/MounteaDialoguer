import { createContext, useContext, useEffect, useState } from 'react';

const ThemeProviderContext = createContext({
	theme: 'system',
	resolvedTheme: 'light',
	setTheme: () => null,
});

export function ThemeProvider({
	children,
	defaultTheme = 'system',
	storageKey = 'mountea-dialoguer-theme',
	...props
}) {
	const [theme, setTheme] = useState(
		() => localStorage.getItem(storageKey) || defaultTheme
	);
	const [resolvedTheme, setResolvedTheme] = useState('light');

	useEffect(() => {
		const root = window.document.documentElement;

		root.classList.remove('light', 'dark');

		if (theme === 'system') {
			const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
				.matches
				? 'dark'
				: 'light';

			root.classList.add(systemTheme);
			setResolvedTheme(systemTheme);
			return;
		}

		root.classList.add(theme);
		setResolvedTheme(theme);
	}, [theme]);

	// Listen for system theme changes when in system mode
	useEffect(() => {
		if (theme !== 'system') return;

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = (e) => {
			const newTheme = e.matches ? 'dark' : 'light';
			const root = window.document.documentElement;
			root.classList.remove('light', 'dark');
			root.classList.add(newTheme);
			setResolvedTheme(newTheme);
		};

		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	}, [theme]);

	const value = {
		theme,
		resolvedTheme,
		setTheme: (newTheme) => {
			localStorage.setItem(storageKey, newTheme);
			setTheme(newTheme);
		},
	};

	return (
		<ThemeProviderContext.Provider {...props} value={value}>
			{children}
		</ThemeProviderContext.Provider>
	);
}

export const useTheme = () => {
	const context = useContext(ThemeProviderContext);

	if (context === undefined)
		throw new Error('useTheme must be used within a ThemeProvider');

	return context;
};
