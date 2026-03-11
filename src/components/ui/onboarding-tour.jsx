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

	const resolveTarget = (...selectors) => {
		for (const selector of selectors) {
			if (!selector) continue;
			const visible = getVisibleTarget(selector);
			if (visible) return visible;
		}
		return 'body';
	};

	const renderStepContent = ({
		title,
		description,
		points = [],
		note = '',
	}) => (
		<div className="text-left">
			<h3 className="font-semibold mb-1">{title}</h3>
			<p className="text-sm">{description}</p>
			{points.length > 0 && (
				<ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-muted-foreground">
					{points.map((point, index) => (
						<li key={`${title}-${index}`}>{point}</li>
					))}
				</ul>
			)}
			{note && <p className="text-xs mt-2 font-medium">{note}</p>}
		</div>
	);

	const dashboardExampleTarget = getVisibleTarget('[data-tour="example-project"]');

	const dashboardSteps = [
		{
			target: 'body',
			content: renderStepContent({
				title: t('tour.dashboard.welcomeTitle'),
				description: t('tour.dashboard.welcomeText', {
					defaultValue:
						'This walkthrough guides you from first project to first playable dialogue in clear, production-style steps.',
				}),
				points: [
					t('tour.dashboard.welcomePoint1', {
						defaultValue: 'Step 1: Create a project workspace.',
					}),
					t('tour.dashboard.welcomePoint2', {
						defaultValue: 'Step 2: Add dialogues and structure your content.',
					}),
					t('tour.dashboard.welcomePoint3', {
						defaultValue: 'Step 3: Open the editor, preview logic, and iterate.',
					}),
				],
			}),
			placement: 'center',
			disableBeacon: true,
		},
		{
			target: resolveTarget('[data-tour="create-project"]'),
			content: renderStepContent({
				title: t('tour.dashboard.createTitle'),
				description: t('tour.dashboard.createText', {
					defaultValue:
						'Start by creating a project. Projects are top-level containers for dialogues, participants, categories, decorators, and conditions.',
				}),
				points: [
					t('tour.dashboard.createPoint1', {
						defaultValue: 'Use a clear project name that matches your game or episode.',
					}),
					t('tour.dashboard.createPoint2', {
						defaultValue: 'Keep one narrative domain per project to stay organized.',
					}),
				],
			}),
			disableBeacon: true,
		},
		...(dashboardExampleTarget
			? [
					{
						target: dashboardExampleTarget,
						content: renderStepContent({
							title: t('tour.dashboard.exampleTitle', {
								defaultValue: 'Generate an Example Project',
							}),
							description: t('tour.dashboard.exampleText', {
								defaultValue:
									'If you want to learn fast, generate the onboarding example. It gives you a full branching setup with reusable data and multiple node patterns.',
							}),
							points: [
								t('tour.dashboard.examplePoint1', {
									defaultValue: 'Use it to understand recommended graph structure.',
								}),
								t('tour.dashboard.examplePoint2', {
									defaultValue: 'Duplicate and adapt it instead of starting from zero.',
								}),
							],
							note: t('tour.dashboard.exampleActionHint', {
								defaultValue: 'Action: click Create Example Project to auto-generate a starter workspace.',
							}),
						}),
						disableBeacon: true,
					},
				]
			: []),
		{
			target: resolveTarget('[data-tour="search"]'),
			content: renderStepContent({
				title: t('tour.dashboard.searchTitle'),
				description: t('tour.dashboard.searchText', {
					defaultValue:
						'Use search to quickly jump between projects as your library grows.',
				}),
				points: [
					t('tour.dashboard.searchPoint1', {
						defaultValue: 'Filter by partial project name.',
					}),
					t('tour.dashboard.searchPoint2', {
						defaultValue: 'Use this constantly once you manage many dialogue sets.',
					}),
				],
			}),
			disableBeacon: true,
		},
		{
			target: resolveTarget('[data-tour="dashboard-metrics"]'),
			content: renderStepContent({
				title: t('tour.dashboard.metricsTitle', {
					defaultValue: 'Track Project Health',
				}),
				description: t('tour.dashboard.metricsText', {
					defaultValue:
						'The metrics area gives a quick overview of project count, dialogue volume, and storage usage.',
				}),
				points: [
					t('tour.dashboard.metricsPoint1', {
						defaultValue: 'Use this to spot growth and keep scope under control.',
					}),
					t('tour.dashboard.metricsPoint2', {
						defaultValue: 'Check storage usage before exporting or sharing.',
					}),
				],
			}),
			disableBeacon: true,
		},
		{
			target: resolveTarget('[data-tour="workspace-section"]'),
			content: renderStepContent({
				title: t('tour.dashboard.workspaceTitle', {
					defaultValue: 'Navigate Your Workspace',
				}),
				description: t('tour.dashboard.workspaceText', {
					defaultValue:
						'This section is your operational hub. Open existing projects, create new ones, and move into dialogue authoring.',
				}),
				points: [
					t('tour.dashboard.workspacePoint1', {
						defaultValue: 'Open a project to access its dialogues and metadata sections.',
					}),
					t('tour.dashboard.workspacePoint2', {
						defaultValue: 'Keep related dialogues grouped in the same project.',
					}),
				],
			}),
			disableBeacon: true,
		},
		{
			target: 'body',
			content: renderStepContent({
				title: t('tour.dashboard.nextTitle', {
					defaultValue: 'Recommended Next Steps',
				}),
				description: t('tour.dashboard.nextText', {
					defaultValue:
						'You are ready to build production-ready dialogue content with a structured workflow.',
				}),
				points: [
					t('tour.dashboard.nextPoint1', {
						defaultValue: 'Create or open a project.',
					}),
					t('tour.dashboard.nextPoint2', {
						defaultValue: 'Create a dialogue and start mapping branches in the editor.',
					}),
					t('tour.dashboard.nextPoint3', {
						defaultValue: 'Run preview and save before exporting or syncing.',
					}),
				],
			}),
			placement: 'center',
			disableBeacon: true,
		},
	];

	const dialogueEditorSteps = [
		{
			target: 'body',
			content: renderStepContent({
				title: t('tour.editor.welcomeTitle'),
				description: t('tour.editor.welcomeText', {
					defaultValue:
						'This editor tour follows a practical order: orient, build, validate, and save.',
				}),
				points: [
					t('tour.editor.welcomePoint1', {
						defaultValue: 'Orient: understand where navigation and key actions live.',
					}),
					t('tour.editor.welcomePoint2', {
						defaultValue: 'Build: place nodes and connect branching paths.',
					}),
					t('tour.editor.welcomePoint3', {
						defaultValue: 'Validate: run debug preview before final save/export.',
					}),
				],
			}),
			placement: 'center',
			disableBeacon: true,
		},
		{
			target: resolveTarget('[data-tour="editor-header"]'),
			content: renderStepContent({
				title: t('tour.editor.headerTitle', {
					defaultValue: 'Editor Context & Navigation',
				}),
				description: t('tour.editor.headerText', {
					defaultValue:
						'The header shows where you are and gives quick access back to the project workspace.',
				}),
				points: [
					t('tour.editor.headerPoint1', {
						defaultValue: 'Use it to confirm active project/dialogue before major edits.',
					}),
					t('tour.editor.headerPoint2', {
						defaultValue: 'Return to project sections when you need metadata edits.',
					}),
				],
			}),
			disableBeacon: true,
		},
		{
			target: resolveTarget('[data-tour="node-toolbar"]'),
			content: renderStepContent({
				title: t('tour.editor.nodeToolbarTitle'),
				description: t('tour.editor.nodeToolbarText', {
					defaultValue:
						'Use the bottom toolbar to add dialogue nodes and core logic elements.',
				}),
				points: [
					t('tour.editor.nodeToolbarPoint1', {
						defaultValue: 'Drag nodes onto the canvas or click to place quickly.',
					}),
					t('tour.editor.nodeToolbarPoint2', {
						defaultValue: 'Use Auto Layout to clean complex graphs before review.',
					}),
				],
			}),
			disableBeacon: true,
		},
		{
			target: resolveTarget('[data-tour="canvas"]'),
			content: renderStepContent({
				title: t('tour.editor.canvasTitle'),
				description: t('tour.editor.canvasText', {
					defaultValue:
						'The canvas is where flow logic lives. Connect nodes to build playable conversation paths.',
				}),
				points: [
					t('tour.editor.canvasPoint1', {
						defaultValue: 'Keep layouts readable by grouping related branches.',
					}),
					t('tour.editor.canvasPoint2', {
						defaultValue: 'Validate that each branch reaches a meaningful outcome.',
					}),
				],
			}),
			disableBeacon: true,
		},
		{
			target: resolveTarget('[data-tour="preview-button"]', '[data-tour="node-toolbar"]'),
			content: renderStepContent({
				title: t('tour.editor.previewTitle', {
					defaultValue: 'Debug Preview',
				}),
				description: t('tour.editor.previewText', {
					defaultValue:
						'Run preview to simulate dialogue progression, test choice logic, and catch broken paths early.',
				}),
				points: [
					t('tour.editor.previewPoint1', {
						defaultValue: 'Use preview before handing content to implementation.',
					}),
					t('tour.editor.previewPoint2', {
						defaultValue: 'Iterate until branches behave as expected end to end.',
					}),
				],
			}),
			disableBeacon: true,
		},
		{
			target: resolveTarget('[data-tour="minimap"]', '[data-tour="canvas"]'),
			content: renderStepContent({
				title: t('tour.editor.minimapTitle', {
					defaultValue: 'Graph Navigation',
				}),
				description: t('tour.editor.minimapText', {
					defaultValue:
						'Use minimap and viewport controls to navigate large graphs quickly.',
				}),
				points: [
					t('tour.editor.minimapPoint1', {
						defaultValue: 'Recenter often to keep spatial context.',
					}),
					t('tour.editor.minimapPoint2', {
						defaultValue: 'Jump back to start when reviewing branch entry points.',
					}),
				],
			}),
			disableBeacon: true,
		},
		{
			target: resolveTarget('[data-tour="save-button"]', '[data-tour="editor-header"]'),
			content: renderStepContent({
				title: t('tour.editor.saveTitle'),
				description: t('tour.editor.saveText', {
					defaultValue:
						'Persist your latest edits before leaving the editor or sharing the project.',
				}),
				points: [
					t('tour.editor.savePoint1', {
						defaultValue: 'Save after structural changes and before preview runs.',
					}),
					t('tour.editor.savePoint2', {
						defaultValue: 'Use export from file actions when you need external handoff.',
					}),
				],
			}),
			disableBeacon: true,
		},
		{
			target: 'body',
			content: renderStepContent({
				title: t('tour.editor.nextTitle', {
					defaultValue: 'You Are Ready',
				}),
				description: t('tour.editor.nextText', {
					defaultValue:
						'Your core workflow is now set: design nodes, connect logic, preview behavior, and save iteratively.',
				}),
				points: [
					t('tour.editor.nextPoint1', {
						defaultValue: 'Next: refine metadata in project sections for cleaner logic.',
					}),
					t('tour.editor.nextPoint2', {
						defaultValue: 'Then export or sync when the dialogue is production-ready.',
					}),
				],
			}),
			placement: 'center',
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
					textAlign: 'left',
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
 * @param {boolean} options.skipIfExistingProjects - Skip tour if project data already exists
 */
export function useOnboarding(tourKey, options = {}) {
	const {
		skipOnMobile = true,
		skipIfExistingProjects = tourKey === 'dashboard',
	} = options;
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

			if (skipIfExistingProjects) {
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
	}, [tourKey, skipOnMobile, skipIfExistingProjects]);

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
