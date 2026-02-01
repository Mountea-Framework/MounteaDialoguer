import { Moon, Sun, FolderPlus, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LanguageSelector } from '@/components/ui/LanguageSelector';

/**
 * Dashboard Header Component
 * Contains logo, search, theme toggle, and new project button
 */
export function DashboardHeader({ onNewProject, onSearch, searchQuery }) {
	const { t } = useTranslation();
	const { theme, setTheme } = useTheme();

	const toggleTheme = () => {
		setTheme(theme === 'dark' ? 'light' : 'dark');
	};

	return (
		<header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-6 md:px-12 py-4 flex items-center justify-between">
			<div className="flex items-center gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						{t('navigation.projects')}
					</h1>
					<p className="text-sm text-muted-foreground hidden sm:block">
						{t('app.tagline')}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-4">
				<div className="hidden md:flex relative">
					<Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						className="pl-10 w-64"
						placeholder={t('common.search')}
						value={searchQuery}
						onChange={(e) => onSearch(e.target.value)}
					/>
				</div>

				<LanguageSelector variant="icon" />

				<Button
					variant="outline"
					size="icon"
					onClick={toggleTheme}
					className="rounded-full"
				>
					{theme === 'dark' ? (
						<Sun className="h-4 w-4" />
					) : (
						<Moon className="h-4 w-4" />
					)}
				</Button>

				<Button onClick={onNewProject} className="shadow-lg">
					<FolderPlus className="h-4 w-4 mr-2" />
					{t('projects.createNew')}
				</Button>
			</div>
		</header>
	);
}
