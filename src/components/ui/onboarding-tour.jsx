import { useState, useEffect } from 'react';
import Joyride, { STATUS, EVENTS } from 'react-joyride';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeProvider';
import { db } from '@/lib/db';
import { isMobileDevice } from '@/lib/deviceDetection';

const emitOnboardingCompleted = (tourKey) => {
	window.dispatchEvent(new CustomEvent('onboarding:completed', { detail: { key: tourKey } }));
};

/**
 * Onboarding Tour Component
 * Guides new users through the application features
 */
export function OnboardingTour({
	run,
	onFinish,
	tourType = 'dashboard',
}) {
	const [stepIndex, setStepIndex] = useState(0);
	const { theme } = useTheme();
	const { t } = useTranslation();

	// Determine if we're in dark mode
	const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

	const getVisibleTarget = (selector) => {
		if (typeof document === 'undefined') return null;
		const candidates = Array.from(document.querySelectorAll(selector));
		return (
			candidates.find((element) => {
				if (!element) return false;
				const style = window.getComputedStyle(element);
				if (style.display === 'none' || style.visibility === 'hidden') return false;
				return element.getClientRects().length > 0;
			}) || null
		);
	};

	const dashboardSteps = [
		{
			target: 'body',
			content: (
				<div>
					<h2 className="text-lg font-bold mb-2">{t('tour.dashboard.welcomeTitle')}</h2>
					<p className="text-sm text-muted-foreground">
						{t('tour.dashboard.welcomeText')}
					</p>
				</div>
			),
			placement: 'center',
			disableBeacon: true,
		},
		{
			target: getVisibleTarget('[data-tour="create-project"]') || 'body',
			content: (
				<div>
					<h3 className="font-semibold mb-1">{t('tour.dashboard.createTitle')}</h3>
					<p className="text-sm">
						{t('tour.dashboard.createText')}
					</p>
				</div>
			),
			disableBeacon: true,
		},
		{
			target: getVisibleTarget('[data-tour="search"]') || 'body',
			content: (
				<div>
					<h3 className="font-semibold mb-1">{t('tour.dashboard.searchTitle')}</h3>
					<p className="text-sm">
						{t('tour.dashboard.searchText')}
					</p>
				</div>
			),
			disableBeacon: true,
		},
		{
			target: 'body',
			content: (
				<div>
					<h3 className="font-semibold mb-2">{t('tour.dashboard.communityTitle')}</h3>
					<p className="text-sm mb-3">{t('tour.dashboard.communityText')}</p>
					<div className="flex flex-wrap gap-2">
						<a
							href="https://github.com/sponsors/Mountea-Framework"
							target="_blank"
							rel="noreferrer"
							className="inline-flex rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent"
						>
							{t('tour.dashboard.communitySupport')}
						</a>
						<a
							href="https://discord.gg/hCjh8e3Y9r"
							target="_blank"
							rel="noreferrer"
							className="inline-flex rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent"
						>
							{t('tour.dashboard.communityDiscord')}
						</a>
						<a
							href="https://www.fab.com/listings/8bf33586-fba3-4906-bb89-3ca592a8d97c"
							target="_blank"
							rel="noreferrer"
							className="inline-flex rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent"
						>
							{t('tour.dashboard.communityUnreal')}
						</a>
					</div>
				</div>
			),
			placement: 'center',
			disableBeacon: true,
		},
	];

	const dialogueEditorSteps = [
		{
			target: 'body',
			content: (
				<div>
					<h2 className="text-lg font-bold mb-2">{t('tour.editor.welcomeTitle')}</h2>
					<p className="text-sm text-muted-foreground">
						{t('tour.editor.welcomeText')}
					</p>
				</div>
			),
			placement: 'center',
			disableBeacon: true,
		},
		{
			target: '[data-tour="node-toolbar"]',
			content: (
				<div>
					<h3 className="font-semibold mb-1">{t('tour.editor.nodeToolbarTitle')}</h3>
					<p className="text-sm">
						{t('tour.editor.nodeToolbarText')}
					</p>
				</div>
			),
			disableBeacon: true,
		},
		{
			target: '[data-tour="canvas"]',
			content: (
				<div>
					<h3 className="font-semibold mb-1">{t('tour.editor.canvasTitle')}</h3>
					<p className="text-sm">
						{t('tour.editor.canvasText')}
					</p>
				</div>
			),
			disableBeacon: true,
		},
		{
			target: '[data-tour="save-button"]',
			content: (
				<div>
					<h3 className="font-semibold mb-1">{t('tour.editor.saveTitle')}</h3>
					<p className="text-sm">
						{t('tour.editor.saveText')}
					</p>
				</div>
			),
			disableBeacon: true,
		},
	];

	const steps = tourType === 'dashboard' ? dashboardSteps : dialogueEditorSteps;

	const handleJoyrideCallback = (data) => {
		const { status, type, index, action } = data;

		if (
			[STATUS.FINISHED, STATUS.SKIPPED].includes(status) ||
			action === 'close' ||
			type === 'tour:end'
		) {
			setStepIndex(0);
			if (onFinish) {
				onFinish();
			}
			return;
		}

		if (type === EVENTS.TARGET_NOT_FOUND) {
			setStepIndex((prevIndex) => Math.min(prevIndex + 1, steps.length - 1));
			return;
		}

		if (type === 'step:after') {
			const delta = action === 'prev' ? -1 : 1;
			const nextIndex = Math.max(0, index + delta);
			setStepIndex(nextIndex);
		}
	};

	return (
		<Joyride
			steps={steps}
			run={run}
			stepIndex={stepIndex}
			continuous
			showProgress
			showSkipButton
			showCloseButton
			callback={handleJoyrideCallback}
			styles={{
				options: {
					primaryColor: 'hsl(var(--primary))',
					backgroundColor: isDark ? 'hsl(var(--card))' : '#fff',
					textColor: isDark ? 'hsl(var(--foreground))' : '#333',
					arrowColor: isDark ? 'hsl(var(--card))' : '#fff',
					overlayColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
					zIndex: 10000,
				},
				spotlight: {
					borderRadius: 8,
					backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
				},
				tooltip: {
					borderRadius: 8,
					fontSize: 14,
					backgroundColor: isDark ? 'hsl(var(--card))' : '#fff',
					color: isDark ? 'hsl(var(--foreground))' : '#333',
					border: isDark ? '1px solid hsl(var(--border))' : '1px solid #e5e7eb',
				},
				tooltipContent: {
					padding: '12px 16px',
				},
				buttonNext: {
					borderRadius: 6,
					padding: '8px 16px',
					fontSize: 14,
					backgroundColor: 'hsl(var(--primary))',
					color: 'hsl(var(--primary-foreground))',
				},
				buttonBack: {
					color: isDark ? 'hsl(var(--muted-foreground))' : '#666',
					marginRight: 8,
				},
				buttonSkip: {
					color: isDark ? 'hsl(var(--muted-foreground))' : '#666',
				},
			}}
			locale={{
				back: t('tour.controls.back'),
				close: t('tour.controls.close'),
				last: t('tour.controls.last'),
				next: t('tour.controls.next'),
				nextLabelWithProgress: t('tour.controls.nextWithProgress'),
				skip: t('tour.controls.skip'),
			}}
		/>
	);
}

/**
 * Hook to manage onboarding tour state
 * @param {string} tourKey - Unique key for this tour
 * @param {Object} options - Configuration options
 * @param {boolean} options.skipOnMobile - Skip tour on mobile devices (default: true)
 */
export function useOnboarding(tourKey, options = {}) {
	const { skipOnMobile = true } = options;
	const [runTour, setRunTour] = useState(false);

	useEffect(() => {
		let timer = null;
		let cancelled = false;

		const checkAndShowTour = async () => {
			// Skip on mobile devices if configured
			if (skipOnMobile && isMobileDevice()) {
				return;
			}

			// Check if user has seen this tour
			const hasSeenTour = localStorage.getItem(`onboarding-${tourKey}`);
			if (hasSeenTour) {
				return;
			}

			// Check if user already has projects (not a first-time user)
			try {
				const projectCount = await db.projects.count();
				if (projectCount > 0) {
					// User already has projects, mark tour as seen and skip
					localStorage.setItem(`onboarding-${tourKey}`, 'true');
					emitOnboardingCompleted(tourKey);
					return;
				}
			} catch (error) {
				console.error('Error checking projects for onboarding:', error);
				// On error, still show tour to be safe
			}

			// Delay showing tour to let page load
			if (!cancelled) {
				timer = setTimeout(() => {
					setRunTour(true);
				}, 500);
			}
		};

		checkAndShowTour();

		return () => {
			cancelled = true;
			if (timer) {
				clearTimeout(timer);
			}
		};
	}, [tourKey, skipOnMobile]);

	const finishTour = () => {
		localStorage.setItem(`onboarding-${tourKey}`, 'true');
		setRunTour(false);
		emitOnboardingCompleted(tourKey);
	};

	const resetTour = () => {
		localStorage.removeItem(`onboarding-${tourKey}`);
		setRunTour(true);
	};

	return { runTour, finishTour, resetTour };
}
