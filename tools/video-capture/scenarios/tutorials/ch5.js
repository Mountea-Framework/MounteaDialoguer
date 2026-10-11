// Chapter 5: preview and tidy up. Starts from the end state of chapter 4.
const recenter = { role: 'button', nameKey: 'editor.nodeToolbar.recenter' };

export default {
	id: 'ch5', fps: 30, size: [1920, 960], language: 'en', theme: 'dark', seed: 5,
	start: { fixture: 'tools/video-capture/tutorials/fixtures/ch5-start.mnteadlgproj', route: '/projects/:project/dialogue/:dialogue' },
	beats: [
		{
			id: 'main', kind: 'app', tail: 1.2,
			steps: [
				{ id: 'preview', do: 'click', target: { role: 'button', nameKey: 'editor.preview.start' }, caption: 'Test the conversation before you ship it.', captionFor: 3.2 },
				{ id: 'wait-answers', do: 'wait', target: { text: 'Heard any rumors?' } },
				{ id: 'answer', do: 'click', target: { role: 'button', name: 'I need a room.' }, caption: 'Pick an answer, just like a player.', captionFor: 3 },
				// The preview closes by itself when the dialogue ends; the toolbar is dimmed and inert until then.
				{ id: 'preview-done', do: 'wait', target: { css: '[data-tour="node-toolbar"]:not(.pointer-events-none)' } },
				{ id: 'settle', do: 'hold', seconds: 1.5 },
				{ id: 'recenter-before', do: 'click', target: recenter },
				{ id: 'mess', do: 'drag', from: { css: '.react-flow__node-answerNode', nth: 1, offset: [0, -30] }, to: { point: [1500, 280] }, caption: 'Graph got messy?' },
				{ id: 'tidy', do: 'click', target: { role: 'button', nameKey: 'editor.nodeToolbar.autoLayout' }, caption: 'One click to tidy it up.', captionFor: 2.6 },
				{ id: 'recenter-after', do: 'click', target: recenter, caption: 'Recenter to see the whole graph.', captionFor: 2.6 },
				{ id: 'admire', do: 'hold', seconds: 1.5 },
			],
		},
	],
};
