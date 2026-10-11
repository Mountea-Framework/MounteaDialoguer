// Chapter 3: first dialogue and nodes. Starts from the end state of chapter 2.
import { sidebar, dialogButton, inDialog } from './_steps.js';

const toolbar = (nameKey) => ({ role: 'button', nameKey, within: { tour: 'node-toolbar' } });

export default {
	id: 'ch3', fps: 30, size: [1920, 960], language: 'en', theme: 'dark', seed: 3,
	start: { fixture: 'tools/video-capture/tutorials/fixtures/ch3-start.mnteadlgproj', route: '/projects/:project' },
	beats: [
		{
			id: 'main', kind: 'app', tail: 1.2,
			steps: [
				{ id: 'dialogues', do: 'click', target: sidebar('dialogues.title') },
				{ id: 'new', do: 'click', target: { role: 'button', nameKey: 'dialogues.createNew' } },
				{ id: 'name', do: 'type', target: inDialog({ labelKey: 'dialogues.dialogueName' }), text: 'GreetingAtTheInn' },
				{ id: 'create', do: 'click', target: dialogButton('common.create') },
				{ id: 'tour-canvas', do: 'move', target: { tour: 'canvas' }, caption: 'The canvas is where the conversation grows.', captionFor: 3 },
				{ id: 'tour-toolbar', do: 'move', target: { tour: 'node-toolbar' } },
				{ id: 'move-start', do: 'drag', from: { node: 'Start', offset: [0, -20] }, to: { point: [960, 150] }, caption: 'Drag nodes wherever you like.' },
				{ id: 'npc', do: 'click', target: toolbar('editor.nodeToolbar.npc'), caption: 'NPC nodes are lines spoken by characters.', zoom: { level: 1.5, hold: 0.6 } },
				{ id: 'npc-place', do: 'drag', from: { node: 'NPC', offset: [0, -27] }, to: { point: [960, 330] } },
				{ id: 'player1', do: 'click', target: toolbar('editor.nodeToolbar.player'), caption: 'Player nodes are the answers.' },
				{ id: 'player1-place', do: 'drag', from: { node: 'Player', nth: 0, offset: [0, -27] }, to: { point: [700, 560] } },
				{ id: 'player2', do: 'click', target: toolbar('editor.nodeToolbar.player') },
				{ id: 'player2-place', do: 'drag', from: { node: 'Player', nth: 1, offset: [0, -27] }, to: { point: [1220, 560] } },
				{ id: 'save', do: 'press', keys: 'Control+S', hint: 'Ctrl+S', caption: 'Save with Ctrl+S.', after: 1.2 },
			],
		},
	],
};
