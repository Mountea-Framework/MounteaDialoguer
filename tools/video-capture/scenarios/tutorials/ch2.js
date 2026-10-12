// Chapter 2: categories and participants. Starts from the end state of chapter 1.
import { sidebar, dialogButton, inDialog } from './_steps.js';

const addParticipant = (id, name, first) => [
	{ id: `${id}-add`, do: 'click', target: { role: 'button', nameKey: 'participants.addNew' } },
	{ id: `${id}-name`, do: 'type', target: inDialog({ labelKey: 'participants.name' }), text: name },
	{ id: `${id}-category`, do: 'select', target: inDialog({ labelKey: 'participants.category' }), option: 'Characters', ...(first && { caption: 'Every participant needs a category.' }) },
	{ id: `${id}-create`, do: 'click', target: dialogButton('common.create') },
];

export default {
	id: 'ch2', fps: 30, size: [1920, 960], language: 'en', theme: 'dark', seed: 2, pace: 1.6, captionDwell: 3.2,
	start: { fixture: 'tools/video-capture/tutorials/fixtures/ch2-start.mnteadlgproj', route: '/projects/:project' },
	beats: [
		{
			id: 'main', kind: 'app', tail: 1.2,
			steps: [
				{ id: 'categories', do: 'click', target: sidebar('categories.title'), caption: 'Categories group your characters.' },
				{ id: 'cat-add', do: 'click', target: { role: 'button', nameKey: 'categories.addNew' } },
				{ id: 'cat-name', do: 'type', target: inDialog({ labelKey: 'categories.name' }), text: 'Characters' },
				{ id: 'cat-create', do: 'click', target: dialogButton('common.create') },
				{ id: 'participants', do: 'click', target: sidebar('participants.title'), caption: 'Participants are the speakers.' },
				...addParticipant('innkeeper', 'Innkeeper', true),
				...addParticipant('traveler', 'Traveler', false),
			],
		},
	],
};
