// Chapter 1: first project. Length follows the steps; captions come from the steps (cues), not from absolute seconds.
import { sidebar, dialogButton, inDialog } from './_steps.js';

export default {
	id: 'ch1', fps: 30, size: [1920, 960], language: 'en', theme: 'dark', seed: 1,
	start: { route: '/' },
	beats: [
		{
			id: 'main', kind: 'app', tail: 1.2,
			steps: [
				{ id: 'dashboard', do: 'move', target: { placeholderKey: 'common.search' }, caption: 'This is your dashboard.', captionFor: 2.2 },
				{ id: 'example', do: 'move', target: { tour: 'example-project' }, caption: 'Want a ready-made sample? Start here.' },
				{ id: 'new', do: 'click', target: { role: 'button', nameKey: 'projects.createNew' }, caption: 'Every dialogue lives in a project.' },
				{ id: 'name', do: 'type', target: inDialog({ labelKey: 'projects.projectName' }), text: 'TavernTales', caption: 'Name it. No spaces.' },
				{ id: 'desc', do: 'type', target: inDialog({ labelKey: 'projects.projectDescription' }), text: 'A tiny tavern and a lot of talk.' },
				{ id: 'create', do: 'click', target: dialogButton('common.create') },
				{ id: 'tour-dialogues', do: 'move', target: sidebar('dialogues.title'), caption: 'Everything for your project lives here.', captionFor: 3.4 },
				{ id: 'tour-participants', do: 'move', target: sidebar('participants.title') },
				{ id: 'tour-categories', do: 'move', target: sidebar('categories.title') },
				{ id: 'tour-decorators', do: 'move', target: sidebar('decorators.title') },
				{ id: 'tour-conditions', do: 'move', target: sidebar('conditions.title') },
			],
		},
	],
};
