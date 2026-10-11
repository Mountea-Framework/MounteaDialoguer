// Chapter 4: connect nodes and write the lines. Starts from the end state of chapter 3.
const drawer = { role: 'dialog' };
const inDrawer = (target) => ({ ...target, within: drawer });
// The drawer's X button has no accessible name in the app, so it is found by its icon.
const closeDrawer = (id) => ({ id, do: 'click', target: { css: '[role="dialog"] button:has(svg.lucide-x)' } });

/** One node's details: name, speaker and a single line of text. */
const edit = (id, node, { name, speaker, title, line, captions = {} }) => [
	{ id: `${id}-open`, do: 'click', target: node, ...(captions.open && { caption: captions.open }) },
	{ id: `${id}-name`, do: 'type', target: inDrawer({ labelKey: 'editor.sections.displayName' }), text: name, replace: true },
	{ id: `${id}-speaker`, do: 'select', target: inDrawer({ labelKey: 'editor.sections.participant' }), option: speaker, ...(captions.speaker && { caption: captions.speaker }) },
	...(title ? [{ id: `${id}-title`, do: 'type', target: inDrawer({ labelKey: 'editor.sections.selectionTitle' }), text: title, ...(captions.title && { caption: captions.title }) }] : []),
	{ id: `${id}-row`, do: 'click', target: inDrawer({ role: 'button', name: 'Add First Row' }) },
	{ id: `${id}-line`, do: 'type', target: inDrawer({ placeholder: 'Enter dialogue text' }), text: line, ...(captions.line && { caption: captions.line }) },
	closeDrawer(`${id}-close`),
];

export default {
	id: 'ch4', fps: 30, size: [1920, 960], language: 'en', theme: 'dark', seed: 4,
	start: { fixture: 'tools/video-capture/tutorials/fixtures/ch4-start.mnteadlgproj', route: '/projects/:project/dialogue/:dialogue' },
	beats: [
		{
			id: 'main', kind: 'app', tail: 1.2,
			steps: [
				{ id: 'recenter', do: 'click', target: { role: 'button', nameKey: 'editor.nodeToolbar.recenter' } },
				{ id: 'link-start', do: 'drag', from: { handle: { node: 'Start', type: 'source' } }, to: { handle: { node: 'NPC', type: 'target' } }, caption: 'Drag from one node to the next.' },
				{ id: 'link-p1', do: 'drag', from: { handle: { node: 'NPC', type: 'source' } }, to: { handle: { node: 'Player', type: 'target', nth: 0 } } },
				{ id: 'link-p2', do: 'drag', from: { handle: { node: 'NPC', type: 'source' } }, to: { handle: { node: 'Player', type: 'target', nth: 1 } } },
				...edit('npc', { node: 'NPC' }, { name: 'Welcome', speaker: 'Innkeeper', line: 'Welcome, traveler! What brings you here?', captions: { open: 'Click a node to edit it.', speaker: 'Pick who is speaking.', line: 'Write the line.' } }),
				...edit('p1', { css: '.react-flow__node-answerNode', nth: 0 }, { name: 'A room', speaker: 'Traveler', title: 'I need a room.', line: 'Just a room, please.', captions: { title: 'The title is what players pick.' } }),
				...edit('p2', { css: '.react-flow__node-answerNode', nth: 1 }, { name: 'Rumors', speaker: 'Traveler', title: 'Heard any rumors?', line: 'Any rumors?' }),
				{ id: 'save', do: 'press', keys: 'Control+S', hint: 'Ctrl+S', caption: 'Save before you move on.', after: 1.2 },
			],
		},
	],
};
