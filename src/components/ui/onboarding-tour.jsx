import { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useTheme } from '@/contexts/ThemeProvider';
import { db } from '@/lib/db';
import { isMobileDevice } from '@/lib/deviceDetection';

/**
 * Onboarding Tour Component
 * Guides new users through the application features
 */
export function OnboardingTour({ run, onFinish, tourType = 'dashboard' }) {
	const [stepIndex, setStepIndex] = useState(0);
	const { theme } = useTheme();

	// Determine if we're in dark mode
	const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

	const dashboardSteps = [
		{
			target: 'body',
			content: (
				<div>
					<h2 className="text-lg font-bold mb-2">Welcome to Mountea Dialoguer!</h2>
					<p className="text-sm text-muted-foreground">
						Let's take a quick tour to help you get started.
					</p>
				</div>
			),
			placement: 'center',
			disableBeacon: true,
		},
		{
			target: '[data-tour="create-project"]',
			content: (
				<div>
					<h3 className="font-semibold mb-1">Create Your First Project</h3>
					<p className="text-sm">
						Click here to create a new project. Projects help organize your dialogues.
					</p>
				</div>
			),
			disableBeacon: true,
		},
		{
			target: '[data-tour="search"]',
			content: (
				<div>
					<h3 className="font-semibold mb-1">Quick Search</h3>
					<p className="text-sm">
						Use the search bar to quickly find projects and dialogues.
					</p>
				</div>
			),
			disableBeacon: true,
		},
	];

	const dialogueEditorSteps = [
		{
			target: 'body',
			content: (
				<div>
					<h2 className="text-lg font-bold mb-2">Dialogue Editor Tour</h2>
					<p className="text-sm text-muted-foreground">
						Learn how to create interactive dialogues.
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
					<h3 className="font-semibold mb-1">Node Toolbar</h3>
					<p className="text-sm">
						Drag these nodes onto the canvas to build your conversation flow.
					</p>
				</div>
			),
			disableBeacon: true,
		},
		{
			target: '[data-tour="canvas"]',
			content: (
				<div>
					<h3 className="font-semibold mb-1">Canvas</h3>
					<p className="text-sm">
						This is where you'll build your dialogue tree. Connect nodes to create conversation paths.
					</p>
				</div>
			),
			disableBeacon: true,
		},
		{
			target: '[data-tour="save-button"]',
			content: (
				<div>
					<h3 className="font-semibold mb-1">Save Your Work</h3>
					<p className="text-sm">
						Don't forget to save! Your changes are stored locally.
					</p>
				</div>
			),
			disableBeacon: true,
		},
	];

	const steps = tourType === 'dashboard' ? dashboardSteps : dialogueEditorSteps;

	const handleJoyrideCallback = (data) => {
		const { status, type, index } = data;

		if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
			setStepIndex(0);
			if (onFinish) {
				onFinish();
			}
		} else if (type === 'step:after') {
			setStepIndex(index + 1);
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
				back: 'Back',
				close: 'Close',
				last: 'Finish',
				next: 'Next',
				skip: 'Skip tour',
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
	};

	const resetTour = () => {
		localStorage.removeItem(`onboarding-${tourKey}`);
		setRunTour(true);
	};

	return { runTour, finishTour, resetTour };
}
