export default {
	id: 'brag', fps: 30, size: [1920, 1080], language: 'en',
	fixture: 'ExampleProject/OnboardingExample.mnteadlgproj',
	beats: [
		{ id: 'graph-reveal', kind: 'graph', theme: 'dark', reveal: 'tiers', tierStagger: 0.35, fade: 0.4, duration: 3.0 },
		{ id: 'drag', kind: 'graph', theme: 'light', move: { node: 'Sell Apples', to: [1500, 700] }, ease: 'power3.inOut', duration: 0.8, track: ['Sell Apples'] },
		{ id: 'auto-layout', kind: 'graph', theme: 'light', layout: 'auto', stagger: 'tier', ease: 'power3.inOut', duration: 1.3 },
	],
};
