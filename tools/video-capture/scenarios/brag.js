// Beat durations line up with the cues in compose/video-design.json (timeline seconds in comments).
export default {
	id: 'brag', fps: 30, size: [1920, 1080], language: 'en',
	fixture: 'ExampleProject/OnboardingExample.mnteadlgproj',
	beats: [
		// 0.0 - 3.0: the real Dialogue Preview overlay, opaque (lines advance on the fake clock, no typewriter).
		{ id: 'preview', kind: 'preview', theme: 'dark', opaque: true, duration: 3.0 },
		// 3.0 - 7.5: tiers fade in (about 2.9 s), then hold while the captions play and the cursor reaches the toggle.
		{ id: 'graph-reveal', kind: 'graph', theme: 'dark', reveal: 'tiers', tierStagger: 0.35, fade: 0.4, duration: 4.5 },
		// 7.5 - 8.7: dark and light stills; the composition plays the circular reveal from the toggle over them.
		{ id: 'theme-switch', kind: 'stills', of: 'graph-reveal', from: 'dark', to: 'light', duration: 1.2 },
		// 8.7 - 9.5: drag "Sell Apples" (the cursor grabs it at the end of the stills hold).
		{ id: 'drag', kind: 'graph', theme: 'light', move: { node: 'Sell Apples', to: [1500, 700] }, ease: 'power3.inOut', duration: 0.8, track: ['Sell Apples'] },
		// 9.5 - 10.5: hold after the drop while the cursor travels to Auto Layout.
		{ id: 'drop-hold', kind: 'graph', theme: 'light', duration: 1.0 },
		// 10.5 - 11.8: Auto Layout, staggered by tier.
		{ id: 'auto-layout', kind: 'graph', theme: 'light', layout: 'auto', stagger: 'tier', ease: 'power3.inOut', duration: 1.3 },
		// 11.8 - 12.8: settle before the end card.
		{ id: 'layout-hold', kind: 'graph', theme: 'light', duration: 1.0 },
	],
};
