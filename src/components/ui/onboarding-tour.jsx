import { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';

/**
 * Onboarding Tour Component
 * Guides new users through the application features
 */
export function OnboardingTour({ run, onFinish, tourType = 'dashboard' }) {
	const [stepIndex, setStepIndex] = useState(0);

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
		},
		{
			target: '[data-tour="projects-grid"]',
			content: (
				<div>
					<h3 className="font-semibold mb-1">Your Projects</h3>
					<p className="text-sm">
						All your projects will appear here. Each project can contain multiple dialogues.
					</p>
				</div>
			),
		},
		{
			target: '[data-tour="search"]',
			content: (
				<div>
					<h3 className="font-semibold mb-1">Quick Search</h3>
					<p className="text-sm">
						Use the search bar to quickly find projects or dialogues.
					</p>
				</div>
			),
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
		},
		{
			target: '[data-tour="minimap"]',
			content: (
				<div>
					<h3 className="font-semibold mb-1">Minimap</h3>
					<p className="text-sm">
						Use the minimap to navigate large dialogue trees.
					</p>
				</div>
			),
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
					zIndex: 10000,
				},
				spotlight: {
					borderRadius: 8,
				},
				tooltip: {
					borderRadius: 8,
					fontSize: 14,
				},
				buttonNext: {
					borderRadius: 6,
					padding: '8px 16px',
					fontSize: 14,
				},
				buttonBack: {
					color: 'hsl(var(--muted-foreground))',
					marginRight: 8,
				},
				buttonSkip: {
					color: 'hsl(var(--muted-foreground))',
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
 */
export function useOnboarding(tourKey) {
	const [runTour, setRunTour] = useState(false);

	useEffect(() => {
		// Check if user has seen this tour
		const hasSeenTour = localStorage.getItem(`onboarding-${tourKey}`);
		if (!hasSeenTour) {
			// Delay showing tour to let page load
			const timer = setTimeout(() => {
				setRunTour(true);
			}, 500);
			return () => clearTimeout(timer);
		}
	}, [tourKey]);

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
