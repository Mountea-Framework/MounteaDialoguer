// Beat durations line up with the cues in compose/video-design.json (timeline seconds in comments).
export default {
	id: 'brag', fps: 30, size: [1920, 1080], language: 'en',
	fixture: 'ExampleProject/OnboardingExample.mnteadlgproj',
	beats: [
		// 0.0 - 2.4: the whole graph and the toolbar; the cursor clicks Preview (cues in video-design.json).
		{ id: 'intro', kind: 'graph', theme: 'dark', duration: 2.4 },
		// 2.4 - 9.4 (second line from 2.2 s, its progress bar fills by about 5.3 s, then the answers show; the composition fades the card out over the last 0.4 s): the real Dialogue Preview overlay, opaque (lines advance on the fake clock, no typewriter).
		{ id: 'preview', kind: 'preview', theme: 'dark', opaque: true, duration: 7.0 },
		// 9.4 - 13.9: the graph again (overlaps the preview fade-out by 0.4 s), held while the captions play and the cursor reaches the toggle.
		{ id: 'graph-reveal', kind: 'graph', theme: 'dark', duration: 4.5 },
		// 13.9 - 15.1: dark and light stills; the composition plays the circular reveal from the toggle over them.
		{ id: 'theme-switch', kind: 'stills', of: 'graph-reveal', from: 'dark', to: 'light', duration: 1.2 },
		// 15.1 - 15.9: drag "Sell Apples" (the cursor grabs it at the end of the stills hold).
		{ id: 'drag', kind: 'graph', theme: 'light', move: { node: 'Sell Apples', to: [1500, 700] }, ease: 'power3.inOut', duration: 0.8, track: ['Sell Apples'] },
		// 15.9 - 16.9: hold after the drop while the cursor travels to Auto Layout.
		{ id: 'drop-hold', kind: 'graph', theme: 'light', duration: 1.0 },
		// 16.9 - 18.2: Auto Layout, staggered by tier.
		{ id: 'auto-layout', kind: 'graph', theme: 'light', layout: 'auto', stagger: 'tier', ease: 'power3.inOut', duration: 1.3 },
		// 18.2 - 19.2: settle before the end card.
		{ id: 'layout-hold', kind: 'graph', theme: 'light', duration: 1.0 },
	],
};
