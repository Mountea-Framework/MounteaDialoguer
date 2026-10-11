// Chapter 6: save, make it yours, share. Starts from the end state of chapter 5.
// The project page's back arrow has no accessible name in the app, so it is found by its icon.
const back = { css: 'button:has(svg.lucide-arrow-left)' };
// The palette's Theme and Language rows each hold a native select (their labels are not translated in the app).
const themeSelect = { css: '[cmdk-list] select', nth: 0 };
const languageSelect = { css: '[cmdk-list] select', nth: 1 };

export default {
	id: 'ch6', fps: 30, size: [1920, 960], language: 'en', theme: 'dark', seed: 6,
	start: { fixture: 'tools/video-capture/tutorials/fixtures/ch6-start.mnteadlgproj', route: '/projects/:project/dialogue/:dialogue' },
	beats: [
		{
			id: 'main', kind: 'app', tail: 1.2,
			steps: [
				{ id: 'recenter', do: 'click', target: { role: 'button', nameKey: 'editor.nodeToolbar.recenter' } },
				{ id: 'tweak', do: 'drag', from: { css: '.react-flow__node-answerNode', nth: 1, offset: [0, -30] }, to: { point: [1330, 640] }, caption: 'Edit as much as you like.' },
				{ id: 'save', do: 'press', keys: 'Control+s', hint: 'Ctrl+S', caption: 'Save as you go.', after: 1.5 },
				{ id: 'palette', do: 'press', keys: 'Control+k', hint: 'Ctrl+K', caption: 'Ctrl+K opens the command palette.', after: 1 },
				{ id: 'light', do: 'select', target: themeSelect, option: 'Light', caption: 'Dark or light. Your call.' },
				{ id: 'light-look', do: 'hold', seconds: 1.4 },
				{ id: 'german', do: 'select', target: languageSelect, option: 'German', caption: 'Pick your language.' },
				{ id: 'german-look', do: 'hold', seconds: 1.6 },
				{ id: 'english', do: 'select', target: languageSelect, option: 'English' },
				{ id: 'english-look', do: 'hold', seconds: 0.8 },
				{ id: 'close-palette', do: 'press', keys: 'Escape', after: 0.6 },
				{ id: 'to-project', do: 'click', target: back },
				{ id: 'export', do: 'click', target: { role: 'button', nameKey: 'common.export' }, caption: 'Back up or share your project.', captionFor: 3 },
				{ id: 'export-look', do: 'hold', seconds: 1.8 },
				{ id: 'to-dashboard', do: 'click', target: back },
				{ id: 'import', do: 'move', target: { textKey: 'common.import', exact: true }, caption: 'Import a project from a file.', captionFor: 3 },
			],
		},
	],
};
