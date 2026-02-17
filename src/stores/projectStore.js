import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { toast } from '@/components/ui/toaster';
import { useSyncStore } from '@/stores/syncStore';

/**
 * Project Store
 * Manages projects state and CRUD operations
 */
export const useProjectStore = create((set, get) => ({
	projects: [],
	currentProject: null,
	isLoading: false,
	error: null,

	/**
	 * Load all projects from IndexedDB
	 */
	loadProjects: async () => {
		set({ isLoading: true, error: null });
		try {
			const projects = await db.projects.toArray();

			// Load dialogue counts for each project
			const projectsWithCounts = await Promise.all(
				projects.map(async (project) => {
					const dialogueCount = await db.dialogues
						.where('projectId')
						.equals(project.id)
						.count();
					return { ...project, dialogueCount };
				})
			);

			set({ projects: projectsWithCounts, isLoading: false });
		} catch (error) {
			console.error('Error loading projects:', error);
			toast({
				variant: 'error',
				title: 'Failed to Load Projects',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
		}
	},

	/**
	 * Create a new project
	 */
	createProject: async (projectData) => {
		set({ isLoading: true, error: null });
		try {
			const now = new Date().toISOString();
			const id = uuidv4();
			const newProject = {
				id,
				...projectData,
				createdAt: now,
				modifiedAt: now,
			};
			await db.projects.add(newProject);
			await get().loadProjects();
			useSyncStore.getState().schedulePush(newProject.id);
			toast({
				variant: 'success',
				title: 'Project Created',
				description: `${projectData.name} has been created successfully`,
			});
			return newProject;
		} catch (error) {
			console.error('Error creating project:', error);
			toast({
				variant: 'error',
				title: 'Failed to Create Project',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Create onboarding example project with predefined categories, participants, and graph.
	 * Node/edge/row IDs are intentionally hardcoded for a stable example graph template.
	 */
	createOnboardingExampleProject: async () => {
		set({ isLoading: true, error: null });
		try {
			const now = new Date().toISOString();
			const projectId = uuidv4();
			const dialogueId = '68cfbce9-4117-4996-bc8b-fd963efc4454';

			const existingDialogue = await db.dialogues.get(dialogueId);
			if (existingDialogue) {
				throw new Error('Example graph already exists. Delete the previous example project first.');
			}

			const newProject = {
				id: projectId,
				name: 'OnboardingExample',
				description: 'Example branching dialogue project created from onboarding',
				version: '1.0.0',
				createdAt: now,
				modifiedAt: now,
			};

			const categories = [
				{
					id: uuidv4(),
					name: 'NPC',
					parentCategoryId: null,
					projectId,
					createdAt: now,
					modifiedAt: now,
				},
				{
					id: uuidv4(),
					name: 'Merchant',
					parentCategoryId: null,
					projectId,
					createdAt: now,
					modifiedAt: now,
				},
				{
					id: uuidv4(),
					name: 'Player',
					parentCategoryId: null,
					projectId,
					createdAt: now,
					modifiedAt: now,
				},
			];
			categories[1].parentCategoryId = categories[0].id; // NPC.Merchant

			const participants = [
				{
					id: uuidv4(),
					name: 'Waldermar',
					category: 'Merchant',
					projectId,
					createdAt: now,
					modifiedAt: now,
				},
				{
					id: uuidv4(),
					name: 'Player',
					category: 'Player',
					projectId,
					createdAt: now,
					modifiedAt: now,
				},
			];

			const dialogue = {
				id: dialogueId,
				projectId,
				name: 'MerchantBranchingExample',
				description: 'Branching example that demonstrates all node types',
				createdAt: now,
				modifiedAt: now,
				viewport: { x: 60, y: -20, zoom: 0.68 },
			};
			const DECORATOR_PLAY_ANIM_ID = 'd1000000-0000-4000-8000-000000000001';
			const DECORATOR_OPEN_STORE_ID = 'd2000000-0000-4000-8000-000000000002';
			const decorators = [
				{
					id: DECORATOR_PLAY_ANIM_ID,
					name: 'playAnim',
					type: 'Animation',
					properties: [
						{
							name: 'animName',
							type: 'string',
							defaultValue: 'Idle',
						},
					],
					projectId,
					createdAt: now,
					modifiedAt: now,
				},
				{
					id: DECORATOR_OPEN_STORE_ID,
					name: 'openStore',
					type: 'Gameplay',
					properties: [
						{
							name: 'bCloseDialogue',
							type: 'bool',
							defaultValue: 'false',
						},
					],
					projectId,
					createdAt: now,
					modifiedAt: now,
				},
			];

			const makeRows = (base, texts) =>
				texts.map((entry, index) => ({
					id: `${base.toString(16).padStart(4, '0')}${(index + 1)
						.toString(16)
						.padStart(4, '0')}-0000-4000-8000-000000000000`,
					text: entry.text,
					duration: entry.duration,
					audioFile: null,
				}));

			const makeDecorator = (id, name, values) => ({ id, name, values });

			const NODE_START = '00000000-0000-0000-0000-000000000001';
			const NODE_GREETING = '10000000-0000-4000-8000-000000000001';
			const NODE_CHOICE_BUY = '10000000-0000-4000-8000-000000000002';
			const NODE_CHOICE_RUMORS = '10000000-0000-4000-8000-000000000003';
			const NODE_CHOICE_QUESTS = '10000000-0000-4000-8000-000000000004';
			const NODE_CHOICE_SELL = '10000000-0000-4000-8000-000000000005';
			const NODE_CHOICE_GOODBYE = '10000000-0000-4000-8000-000000000006';

			const NODE_BUY_INTRO = '20000000-0000-4000-8000-000000000001';
			const NODE_BUY_DELAY = '20000000-0000-4000-8000-000000000002';
			const NODE_BUY_OFFER = '20000000-0000-4000-8000-000000000003';
			const NODE_BUY_STANDARD = '20000000-0000-4000-8000-000000000004';
			const NODE_BUY_PREMIUM = '20000000-0000-4000-8000-000000000005';
			const NODE_BUY_BACK = '20000000-0000-4000-8000-000000000006';
			const NODE_BUY_STANDARD_COMPLETE = '20000000-0000-4000-8000-000000000007';
			const NODE_BUY_PREMIUM_COMPLETE = '20000000-0000-4000-8000-000000000008';
			const NODE_BUY_BACK_RETURN = '20000000-0000-4000-8000-000000000009';

			const NODE_RUMOR_INTRO = '30000000-0000-4000-8000-000000000001';
			const NODE_RUMOR_ROAD_CHOICE = '30000000-0000-4000-8000-000000000002';
			const NODE_RUMOR_RUINS_CHOICE = '30000000-0000-4000-8000-000000000003';
			const NODE_RUMOR_BACK_CHOICE = '30000000-0000-4000-8000-000000000004';
			const NODE_RUMOR_ROAD = '30000000-0000-4000-8000-000000000005';
			const NODE_RUMOR_RUINS = '30000000-0000-4000-8000-000000000006';
			const NODE_RUMOR_BACK_RETURN = '30000000-0000-4000-8000-000000000007';
			const NODE_RUMOR_ROAD_RETURN = '30000000-0000-4000-8000-000000000008';
			const NODE_RUMOR_RUINS_RETURN = '30000000-0000-4000-8000-000000000009';

			const NODE_QUEST_INTRO = '40000000-0000-4000-8000-000000000001';
			const NODE_QUEST_DELAY = '40000000-0000-4000-8000-000000000002';
			const NODE_QUEST_ACCEPT = '40000000-0000-4000-8000-000000000003';
			const NODE_QUEST_DECLINE = '40000000-0000-4000-8000-000000000004';
			const NODE_QUEST_ACCEPT_COMPLETE = '40000000-0000-4000-8000-000000000005';
			const NODE_QUEST_DECLINE_RETURN = '40000000-0000-4000-8000-000000000006';

			const NODE_SELL_INTRO = '50000000-0000-4000-8000-000000000001';
			const NODE_SELL_APPLES = '50000000-0000-4000-8000-000000000002';
			const NODE_SELL_RELIC = '50000000-0000-4000-8000-000000000003';
			const NODE_SELL_APPLES_COMPLETE = '50000000-0000-4000-8000-000000000004';
			const NODE_SELL_RELIC_DELAY = '50000000-0000-4000-8000-000000000005';
			const NODE_SELL_RELIC_COMPLETE = '50000000-0000-4000-8000-000000000006';

			const NODE_GOODBYE_COMPLETE = '60000000-0000-4000-8000-000000000001';

			const nodes = [
				{
					id: NODE_START,
					dialogueId,
					type: 'startNode',
					position: { x: 760, y: 40 },
					data: { label: 'Dialogue entry point', displayName: 'Start Node' },
				},
				{
					id: NODE_GREETING,
					dialogueId,
					type: 'leadNode',
					position: { x: 760, y: 220 },
					data: {
						label: 'Greeting',
						displayName: 'Waldermar Greeting',
						participant: 'Waldermar',
						decorators: [makeDecorator(DECORATOR_PLAY_ANIM_ID, 'playAnim', { animName: 'Wave' })],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: makeRows(1, [
							{ text: 'Welcome, traveler. How can I help today?', duration: 2.8 },
							{ text: 'I can trade, buy your wares, or share local news.', duration: 2.8 },
						]),
					},
				},
				{
					id: NODE_CHOICE_BUY,
					dialogueId,
					type: 'answerNode',
					position: { x: 120, y: 470 },
					data: {
						label: 'Player Choice',
						displayName: 'Buy Supplies',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'Show me your supplies.',
						hasAudio: false,
						dialogueRows: makeRows(2, [{ text: 'Show me what you have in stock.', duration: 2.2 }]),
					},
				},
				{
					id: NODE_CHOICE_RUMORS,
					dialogueId,
					type: 'answerNode',
					position: { x: 430, y: 470 },
					data: {
						label: 'Player Choice',
						displayName: 'Ask Rumors',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'Any rumors worth hearing?',
						hasAudio: false,
						dialogueRows: makeRows(3, [{ text: 'What have you heard lately?', duration: 2.0 }]),
					},
				},
				{
					id: NODE_CHOICE_QUESTS,
					dialogueId,
					type: 'answerNode',
					position: { x: 760, y: 470 },
					data: {
						label: 'Player Choice',
						displayName: 'Ask for Work',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'Need help with anything?',
						hasAudio: false,
						dialogueRows: makeRows(4, [{ text: 'Got any tasks that pay?', duration: 2.0 }]),
					},
				},
				{
					id: NODE_CHOICE_SELL,
					dialogueId,
					type: 'answerNode',
					position: { x: 1080, y: 470 },
					data: {
						label: 'Player Choice',
						displayName: 'Sell Goods',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'I want to sell items.',
						hasAudio: false,
						dialogueRows: makeRows(5, [{ text: 'I have a few things to sell.', duration: 1.9 }]),
					},
				},
				{
					id: NODE_CHOICE_GOODBYE,
					dialogueId,
					type: 'answerNode',
					position: { x: 1380, y: 470 },
					data: {
						label: 'Player Choice',
						displayName: 'Leave',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'Not today. Goodbye.',
						hasAudio: false,
						dialogueRows: makeRows(6, [{ text: 'I should get moving.', duration: 1.6 }]),
					},
				},

				{
					id: NODE_BUY_INTRO,
					dialogueId,
					type: 'leadNode',
					position: { x: 120, y: 730 },
					data: {
						label: 'Buy Intro',
						displayName: 'Waldermar Stock Check',
						participant: 'Waldermar',
						decorators: [makeDecorator(DECORATOR_PLAY_ANIM_ID, 'playAnim', { animName: 'OpenLedger' })],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: makeRows(7, [{ text: 'Right, one moment while I check the crate list.', duration: 2.5 }]),
					},
				},
				{
					id: NODE_BUY_DELAY,
					dialogueId,
					type: 'delayNode',
					position: { x: 120, y: 900 },
					data: { label: 'Stock Delay', displayName: 'Check Inventory', duration: 1.7 },
				},
				{
					id: NODE_BUY_OFFER,
					dialogueId,
					type: 'leadNode',
					position: { x: 120, y: 1080 },
					data: {
						label: 'Buy Offer',
						displayName: 'Waldermar Offer',
						participant: 'Waldermar',
						decorators: [makeDecorator(DECORATOR_OPEN_STORE_ID, 'openStore', { bCloseDialogue: 'false' })],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: makeRows(8, [
							{ text: 'I can offer a basic travel bundle or the premium pack.', duration: 2.8 },
						]),
					},
				},
				{
					id: NODE_BUY_STANDARD,
					dialogueId,
					type: 'answerNode',
					position: { x: -80, y: 1280 },
					data: {
						label: 'Buy Standard',
						displayName: 'Take Standard Bundle',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'I will take the standard bundle.',
						hasAudio: false,
						dialogueRows: makeRows(9, [{ text: 'The standard bundle is enough.', duration: 1.8 }]),
					},
				},
				{
					id: NODE_BUY_PREMIUM,
					dialogueId,
					type: 'answerNode',
					position: { x: 120, y: 1280 },
					data: {
						label: 'Buy Premium',
						displayName: 'Take Premium Bundle',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'I will take the premium pack.',
						hasAudio: false,
						dialogueRows: makeRows(10, [{ text: 'I want the premium pack.', duration: 1.8 }]),
					},
				},
				{
					id: NODE_BUY_BACK,
					dialogueId,
					type: 'answerNode',
					position: { x: 320, y: 1280 },
					data: {
						label: 'Buy Back',
						displayName: 'Maybe Later',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'Actually, maybe later.',
						hasAudio: false,
						dialogueRows: makeRows(11, [{ text: 'Let us pause the trade for now.', duration: 1.8 }]),
					},
				},
				{
					id: NODE_BUY_STANDARD_COMPLETE,
					dialogueId,
					type: 'completeNode',
					position: { x: -80, y: 1480 },
					data: {
						label: 'Standard Trade Complete',
						displayName: 'Trade Complete',
						participant: 'Waldermar',
						decorators: [],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: makeRows(12, [{ text: 'Done. Safe roads and fair weather.', duration: 2.0 }]),
					},
				},
				{
					id: NODE_BUY_PREMIUM_COMPLETE,
					dialogueId,
					type: 'completeNode',
					position: { x: 120, y: 1480 },
					data: {
						label: 'Premium Trade Complete',
						displayName: 'Premium Trade Complete',
						participant: 'Waldermar',
						decorators: [makeDecorator(DECORATOR_PLAY_ANIM_ID, 'playAnim', { animName: 'Nod' })],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: makeRows(13, [{ text: 'A wise choice. You are fully provisioned now.', duration: 2.2 }]),
					},
				},
				{
					id: NODE_BUY_BACK_RETURN,
					dialogueId,
					type: 'returnNode',
					position: { x: 320, y: 1480 },
					data: {
						label: 'Return to Greeting',
						displayName: 'Return To Greeting',
						targetNode: NODE_GREETING,
					},
				},

				{
					id: NODE_RUMOR_INTRO,
					dialogueId,
					type: 'leadNode',
					position: { x: 430, y: 730 },
					data: {
						label: 'Rumor Intro',
						displayName: 'Waldermar Lowers Voice',
						participant: 'Waldermar',
						decorators: [makeDecorator(DECORATOR_PLAY_ANIM_ID, 'playAnim', { animName: 'LeanIn' })],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: makeRows(14, [{ text: 'Keep this between us. Which story do you want first?', duration: 2.7 }]),
					},
				},
				{
					id: NODE_RUMOR_ROAD_CHOICE,
					dialogueId,
					type: 'answerNode',
					position: { x: 250, y: 930 },
					data: {
						label: 'Road Rumor',
						displayName: 'Ask About Roads',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'Tell me about the roads.',
						hasAudio: false,
						dialogueRows: makeRows(15, [{ text: 'What is happening on the roads?', duration: 1.7 }]),
					},
				},
				{
					id: NODE_RUMOR_RUINS_CHOICE,
					dialogueId,
					type: 'answerNode',
					position: { x: 430, y: 930 },
					data: {
						label: 'Ruins Rumor',
						displayName: 'Ask About Ruins',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'What about the old ruins?',
						hasAudio: false,
						dialogueRows: makeRows(16, [{ text: 'Anything about the old ruins?', duration: 1.8 }]),
					},
				},
				{
					id: NODE_RUMOR_BACK_CHOICE,
					dialogueId,
					type: 'answerNode',
					position: { x: 610, y: 930 },
					data: {
						label: 'Back Choice',
						displayName: 'Return to Main Topics',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'Let us talk about something else.',
						hasAudio: false,
						dialogueRows: makeRows(17, [{ text: 'That is enough gossip for now.', duration: 1.7 }]),
					},
				},
				{
					id: NODE_RUMOR_ROAD,
					dialogueId,
					type: 'leadNode',
					position: { x: 250, y: 1130 },
					data: {
						label: 'Road Rumor Response',
						displayName: 'Road Warning',
						participant: 'Waldermar',
						decorators: [],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: makeRows(18, [{ text: 'Scouts saw raiders near the northern toll bridge.', duration: 2.7 }]),
					},
				},
				{
					id: NODE_RUMOR_RUINS,
					dialogueId,
					type: 'leadNode',
					position: { x: 430, y: 1130 },
					data: {
						label: 'Ruins Rumor Response',
						displayName: 'Ruins Warning',
						participant: 'Waldermar',
						decorators: [],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: makeRows(19, [{ text: 'Strange lights were seen there after dusk. Best avoid it.', duration: 2.9 }]),
					},
				},
				{
					id: NODE_RUMOR_BACK_RETURN,
					dialogueId,
					type: 'returnNode',
					position: { x: 610, y: 1130 },
					data: { label: 'Return', displayName: 'Return To Greeting', targetNode: NODE_GREETING },
				},
				{
					id: NODE_RUMOR_ROAD_RETURN,
					dialogueId,
					type: 'returnNode',
					position: { x: 250, y: 1320 },
					data: { label: 'Return', displayName: 'Return To Greeting', targetNode: NODE_GREETING },
				},
				{
					id: NODE_RUMOR_RUINS_RETURN,
					dialogueId,
					type: 'returnNode',
					position: { x: 430, y: 1320 },
					data: { label: 'Return', displayName: 'Return To Greeting', targetNode: NODE_GREETING },
				},

				{
					id: NODE_QUEST_INTRO,
					dialogueId,
					type: 'leadNode',
					position: { x: 760, y: 730 },
					data: {
						label: 'Quest Intro',
						displayName: 'Waldermar Needs Help',
						participant: 'Waldermar',
						decorators: [],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: makeRows(20, [{ text: 'Actually yes. A crate is overdue at the mill road checkpoint.', duration: 2.8 }]),
					},
				},
				{
					id: NODE_QUEST_DELAY,
					dialogueId,
					type: 'delayNode',
					position: { x: 760, y: 900 },
					data: { label: 'Quest Pause', displayName: 'Think About Offer', duration: 1.4 },
				},
				{
					id: NODE_QUEST_ACCEPT,
					dialogueId,
					type: 'answerNode',
					position: { x: 660, y: 1080 },
					data: {
						label: 'Quest Accept',
						displayName: 'Accept Delivery Job',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'I can deliver it.',
						hasAudio: false,
						dialogueRows: makeRows(21, [{ text: 'I can handle that delivery.', duration: 1.8 }]),
					},
				},
				{
					id: NODE_QUEST_DECLINE,
					dialogueId,
					type: 'answerNode',
					position: { x: 860, y: 1080 },
					data: {
						label: 'Quest Decline',
						displayName: 'Decline Delivery Job',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'I cannot right now.',
						hasAudio: false,
						dialogueRows: makeRows(22, [{ text: 'Not right now, sorry.', duration: 1.7 }]),
					},
				},
				{
					id: NODE_QUEST_ACCEPT_COMPLETE,
					dialogueId,
					type: 'completeNode',
					position: { x: 660, y: 1280 },
					data: {
						label: 'Quest Accepted',
						displayName: 'Quest Accepted',
						participant: 'Waldermar',
						decorators: [makeDecorator(DECORATOR_OPEN_STORE_ID, 'openStore', { bCloseDialogue: 'true' })],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: makeRows(23, [{ text: 'Excellent. Take this token and report back before dusk.', duration: 2.5 }]),
					},
				},
				{
					id: NODE_QUEST_DECLINE_RETURN,
					dialogueId,
					type: 'returnNode',
					position: { x: 860, y: 1280 },
					data: { label: 'Return', displayName: 'Return To Greeting', targetNode: NODE_GREETING },
				},

				{
					id: NODE_SELL_INTRO,
					dialogueId,
					type: 'leadNode',
					position: { x: 1080, y: 730 },
					data: {
						label: 'Sell Intro',
						displayName: 'Waldermar Appraises Goods',
						participant: 'Waldermar',
						decorators: [makeDecorator(DECORATOR_PLAY_ANIM_ID, 'playAnim', { animName: 'InspectItem' })],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: makeRows(24, [{ text: 'Set it on the counter. What are you offering?', duration: 2.2 }]),
					},
				},
				{
					id: NODE_SELL_APPLES,
					dialogueId,
					type: 'answerNode',
					position: { x: 980, y: 930 },
					data: {
						label: 'Sell Apples',
						displayName: 'Sell Apples',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'Fresh apples.',
						hasAudio: false,
						dialogueRows: makeRows(25, [{ text: 'A sack of orchard apples.', duration: 1.5 }]),
					},
				},
				{
					id: NODE_SELL_RELIC,
					dialogueId,
					type: 'answerNode',
					position: { x: 1180, y: 930 },
					data: {
						label: 'Sell Relic',
						displayName: 'Sell Old Relic',
						participant: 'Player',
						decorators: [],
						selectionTitle: 'An old relic.',
						hasAudio: false,
						dialogueRows: makeRows(26, [{ text: 'I found this old relic in a ruined watchtower.', duration: 2.0 }]),
					},
				},
				{
					id: NODE_SELL_APPLES_COMPLETE,
					dialogueId,
					type: 'completeNode',
					position: { x: 980, y: 1130 },
					data: {
						label: 'Sell Apples Complete',
						displayName: 'Sale Complete',
						participant: 'Waldermar',
						decorators: [],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: makeRows(27, [{ text: 'Fair produce. I can pay ten silver.', duration: 2.0 }]),
					},
				},
				{
					id: NODE_SELL_RELIC_DELAY,
					dialogueId,
					type: 'delayNode',
					position: { x: 1180, y: 1130 },
					data: { label: 'Relic Appraisal Delay', displayName: 'Inspect Relic', duration: 1.6 },
				},
				{
					id: NODE_SELL_RELIC_COMPLETE,
					dialogueId,
					type: 'completeNode',
					position: { x: 1180, y: 1310 },
					data: {
						label: 'Sell Relic Complete',
						displayName: 'Relic Sale Complete',
						participant: 'Waldermar',
						decorators: [],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: makeRows(28, [{ text: 'Interesting craftsmanship. I will pay fifty silver.', duration: 2.3 }]),
					},
				},

				{
					id: NODE_GOODBYE_COMPLETE,
					dialogueId,
					type: 'completeNode',
					position: { x: 1380, y: 730 },
					data: {
						label: 'Farewell',
						displayName: 'Farewell Complete',
						participant: 'Waldermar',
						decorators: [makeDecorator(DECORATOR_PLAY_ANIM_ID, 'playAnim', { animName: 'Farewell' })],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: makeRows(29, [{ text: 'Safe travels. My stall stays open till moonrise.', duration: 2.1 }]),
					},
				},
			];

			const edges = [
				{ id: 'e1000000-0000-4000-8000-000000000001', dialogueId, source: NODE_START, target: NODE_GREETING },
				{ id: 'e1000000-0000-4000-8000-000000000002', dialogueId, source: NODE_GREETING, target: NODE_CHOICE_BUY },
				{ id: 'e1000000-0000-4000-8000-000000000003', dialogueId, source: NODE_GREETING, target: NODE_CHOICE_RUMORS },
				{ id: 'e1000000-0000-4000-8000-000000000004', dialogueId, source: NODE_GREETING, target: NODE_CHOICE_QUESTS },
				{ id: 'e1000000-0000-4000-8000-000000000005', dialogueId, source: NODE_GREETING, target: NODE_CHOICE_SELL },
				{ id: 'e1000000-0000-4000-8000-000000000006', dialogueId, source: NODE_GREETING, target: NODE_CHOICE_GOODBYE },

				{ id: 'e2000000-0000-4000-8000-000000000001', dialogueId, source: NODE_CHOICE_BUY, target: NODE_BUY_INTRO },
				{ id: 'e2000000-0000-4000-8000-000000000002', dialogueId, source: NODE_BUY_INTRO, target: NODE_BUY_DELAY },
				{ id: 'e2000000-0000-4000-8000-000000000003', dialogueId, source: NODE_BUY_DELAY, target: NODE_BUY_OFFER },
				{ id: 'e2000000-0000-4000-8000-000000000004', dialogueId, source: NODE_BUY_OFFER, target: NODE_BUY_STANDARD },
				{ id: 'e2000000-0000-4000-8000-000000000005', dialogueId, source: NODE_BUY_OFFER, target: NODE_BUY_PREMIUM },
				{ id: 'e2000000-0000-4000-8000-000000000006', dialogueId, source: NODE_BUY_OFFER, target: NODE_BUY_BACK },
				{ id: 'e2000000-0000-4000-8000-000000000007', dialogueId, source: NODE_BUY_STANDARD, target: NODE_BUY_STANDARD_COMPLETE },
				{ id: 'e2000000-0000-4000-8000-000000000008', dialogueId, source: NODE_BUY_PREMIUM, target: NODE_BUY_PREMIUM_COMPLETE },
				{ id: 'e2000000-0000-4000-8000-000000000009', dialogueId, source: NODE_BUY_BACK, target: NODE_BUY_BACK_RETURN },

				{ id: 'e3000000-0000-4000-8000-000000000001', dialogueId, source: NODE_CHOICE_RUMORS, target: NODE_RUMOR_INTRO },
				{ id: 'e3000000-0000-4000-8000-000000000002', dialogueId, source: NODE_RUMOR_INTRO, target: NODE_RUMOR_ROAD_CHOICE },
				{ id: 'e3000000-0000-4000-8000-000000000003', dialogueId, source: NODE_RUMOR_INTRO, target: NODE_RUMOR_RUINS_CHOICE },
				{ id: 'e3000000-0000-4000-8000-000000000004', dialogueId, source: NODE_RUMOR_INTRO, target: NODE_RUMOR_BACK_CHOICE },
				{ id: 'e3000000-0000-4000-8000-000000000005', dialogueId, source: NODE_RUMOR_ROAD_CHOICE, target: NODE_RUMOR_ROAD },
				{ id: 'e3000000-0000-4000-8000-000000000006', dialogueId, source: NODE_RUMOR_RUINS_CHOICE, target: NODE_RUMOR_RUINS },
				{ id: 'e3000000-0000-4000-8000-000000000007', dialogueId, source: NODE_RUMOR_BACK_CHOICE, target: NODE_RUMOR_BACK_RETURN },
				{ id: 'e3000000-0000-4000-8000-000000000008', dialogueId, source: NODE_RUMOR_ROAD, target: NODE_RUMOR_ROAD_RETURN },
				{ id: 'e3000000-0000-4000-8000-000000000009', dialogueId, source: NODE_RUMOR_RUINS, target: NODE_RUMOR_RUINS_RETURN },

				{ id: 'e4000000-0000-4000-8000-000000000001', dialogueId, source: NODE_CHOICE_QUESTS, target: NODE_QUEST_INTRO },
				{ id: 'e4000000-0000-4000-8000-000000000002', dialogueId, source: NODE_QUEST_INTRO, target: NODE_QUEST_DELAY },
				{ id: 'e4000000-0000-4000-8000-000000000003', dialogueId, source: NODE_QUEST_DELAY, target: NODE_QUEST_ACCEPT },
				{ id: 'e4000000-0000-4000-8000-000000000004', dialogueId, source: NODE_QUEST_DELAY, target: NODE_QUEST_DECLINE },
				{ id: 'e4000000-0000-4000-8000-000000000005', dialogueId, source: NODE_QUEST_ACCEPT, target: NODE_QUEST_ACCEPT_COMPLETE },
				{ id: 'e4000000-0000-4000-8000-000000000006', dialogueId, source: NODE_QUEST_DECLINE, target: NODE_QUEST_DECLINE_RETURN },

				{ id: 'e5000000-0000-4000-8000-000000000001', dialogueId, source: NODE_CHOICE_SELL, target: NODE_SELL_INTRO },
				{ id: 'e5000000-0000-4000-8000-000000000002', dialogueId, source: NODE_SELL_INTRO, target: NODE_SELL_APPLES },
				{ id: 'e5000000-0000-4000-8000-000000000003', dialogueId, source: NODE_SELL_INTRO, target: NODE_SELL_RELIC },
				{ id: 'e5000000-0000-4000-8000-000000000004', dialogueId, source: NODE_SELL_APPLES, target: NODE_SELL_APPLES_COMPLETE },
				{ id: 'e5000000-0000-4000-8000-000000000005', dialogueId, source: NODE_SELL_RELIC, target: NODE_SELL_RELIC_DELAY },
				{ id: 'e5000000-0000-4000-8000-000000000006', dialogueId, source: NODE_SELL_RELIC_DELAY, target: NODE_SELL_RELIC_COMPLETE },

				{ id: 'e6000000-0000-4000-8000-000000000001', dialogueId, source: NODE_CHOICE_GOODBYE, target: NODE_GOODBYE_COMPLETE },
			];

			await db.transaction(
				'rw',
				[db.projects, db.dialogues, db.categories, db.participants, db.decorators, db.nodes, db.edges],
				async () => {
					await db.projects.add(newProject);
					await db.categories.bulkAdd(categories);
					await db.participants.bulkAdd(participants);
					await db.decorators.bulkAdd(decorators);
					await db.dialogues.add(dialogue);
					await db.nodes.bulkAdd(nodes);
					await db.edges.bulkAdd(edges);
				}
			);

			await get().loadProjects();
			useSyncStore.getState().schedulePush(projectId);
			toast({
				variant: 'success',
				title: 'Example Project Created',
				description: `${newProject.name} has been created successfully`,
			});

			return { projectId, dialogueId };
		} catch (error) {
			console.error('Error creating onboarding example project:', error);
			toast({
				variant: 'error',
				title: 'Failed to Create Example Project',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Update an existing project
	 */
	updateProject: async (id, updates) => {
		set({ isLoading: true, error: null });
		try {
			await db.projects.update(id, {
				...updates,
				modifiedAt: new Date().toISOString(),
			});
			await get().loadProjects();
			useSyncStore.getState().schedulePush(id);
			toast({
				variant: 'success',
				title: 'Project Updated',
				description: 'Project has been updated successfully',
			});
		} catch (error) {
			console.error('Error updating project:', error);
			toast({
				variant: 'error',
				title: 'Failed to Update Project',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Delete a project and all its related data
	 */
	deleteProject: async (id) => {
		set({ isLoading: true, error: null });
		try {
			await db.transaction('rw', [db.projects, db.dialogues, db.participants, db.categories, db.decorators, db.nodes, db.edges], async () => {
				const projectDialogues = await db.dialogues.where('projectId').equals(id).toArray();
				const dialogueIds = projectDialogues.map((dialogue) => dialogue.id);

				if (dialogueIds.length > 0) {
					await db.nodes.where('dialogueId').anyOf(dialogueIds).delete();
					await db.edges.where('dialogueId').anyOf(dialogueIds).delete();
				}

				await db.projects.delete(id);
				await db.dialogues.where('projectId').equals(id).delete();
				await db.participants.where('projectId').equals(id).delete();
				await db.categories.where('projectId').equals(id).delete();
				await db.decorators.where('projectId').equals(id).delete();
			});
			await get().loadProjects();
			useSyncStore.getState().schedulePush(id);
			toast({
				variant: 'success',
				title: 'Project Deleted',
				description: 'Project and all related data have been deleted',
			});
		} catch (error) {
			console.error('Error deleting project:', error);
			toast({
				variant: 'error',
				title: 'Failed to Delete Project',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Set the current active project
	 */
	setCurrentProject: async (id) => {
		set({ isLoading: true, error: null });
		try {
			const project = await db.projects.get(id);
			set({ currentProject: project, isLoading: false });
		} catch (error) {
			console.error('Error setting current project:', error);
			toast({
				variant: 'error',
				title: 'Failed to Load Project',
				description: error.message || 'An unexpected error occurred',
			});
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	/**
	 * Clear current project
	 */
	clearCurrentProject: () => {
		set({ currentProject: null });
	},

	/**
	 * Export entire project with all dialogues
	 */
	exportProject: async (projectId) => {
		try {
			// Load JSZip and file-saver
			const JSZip = (await import('jszip')).default;
			const { saveAs } = await import('file-saver');

			// Get project data
			const project = await db.projects.get(projectId);
			if (!project) {
				throw new Error('Project not found');
			}

			// Get all dialogues for this project
			const dialogues = await db.dialogues
				.where('projectId')
				.equals(projectId)
				.toArray();

			// Get categories, participants, and decorators
			const categories = await db.categories
				.where('projectId')
				.equals(projectId)
				.toArray();

			const participants = await db.participants
				.where('projectId')
				.equals(projectId)
				.toArray();

			const decorators = await db.decorators
				.where('projectId')
				.equals(projectId)
				.toArray();

			// Build category path map
			const { useCategoryStore } = await import('./categoryStore');
			const categoryPathMap = new Map();
			categories.forEach((cat) => {
				const fullPath = useCategoryStore.getState().buildCategoryPath(cat.id, categories);
				categoryPathMap.set(cat.name, fullPath);
			});

			// Prepare project data
			const projectData = {
				projectGuid: project.id,
				projectName: project.name,
				projectDescription: project.description || '',
				version: project.version || '1.0.0',
				createdAt: project.createdAt,
				modifiedAt: project.modifiedAt || new Date().toISOString(),
			};

			// Export categories with fullPath
			const categoriesExport = categories.map((cat) => ({
				name: cat.name,
				fullPath: categoryPathMap.get(cat.name) || cat.name,
			}));

			// Export participants with fullPath
			const participantsExport = participants.map((p) => ({
				name: p.name,
				fullPath: categoryPathMap.get(p.category) || p.category,
			}));

			// Export decorators (definitions only)
			const decoratorsExport = decorators.map(({ id, projectId, createdAt, modifiedAt, ...rest }) => rest);

			// Create main project ZIP
			const projectZip = new JSZip();

			// Add project JSON files
			projectZip.file('projectData.json', JSON.stringify(projectData, null, 2));
			projectZip.file('categories.json', JSON.stringify(categoriesExport, null, 2));
			projectZip.file('participants.json', JSON.stringify(participantsExport, null, 2));
			projectZip.file('decorators.json', JSON.stringify(decoratorsExport, null, 2));

			// Create dialogues folder
			const dialoguesFolder = projectZip.folder('dialogues');

			// Export each dialogue as a .mnteadlg file
			const { useDialogueStore } = await import('./dialogueStore');
			const dialogueStore = useDialogueStore.getState();

			let successCount = 0;
			let errorCount = 0;

			for (const dialogue of dialogues) {
				try {
					console.log(`Exporting dialogue: ${dialogue.name} (${dialogue.id})`);

					// Generate the dialogue export blob
					const dialogueBlob = await dialogueStore.exportDialogueAsBlob(dialogue.id);

					// Add to dialogues folder with sanitized name
					const sanitizedName = dialogue.name.replace(/[^a-z0-9]/gi, '_');
					dialoguesFolder.file(`${sanitizedName}.mnteadlg`, dialogueBlob);

					successCount++;
					console.log(`Successfully exported dialogue: ${dialogue.name}`);
				} catch (error) {
					errorCount++;
					console.error(`Failed to export dialogue ${dialogue.name}:`, error);

					// Show error for this dialogue
					toast({
						variant: 'error',
						title: `Failed to Export Dialogue: ${dialogue.name}`,
						description: error.message,
					});
				}
			}

			console.log(`Exported ${successCount} dialogues, ${errorCount} failed`);

			// Generate the final ZIP
			const blob = await projectZip.generateAsync({ type: 'blob' });
			saveAs(blob, `${project.name}.mnteadlgproj`);

			toast({
				variant: 'success',
				title: 'Project Exported',
				description: `${project.name}.mnteadlgproj has been exported`,
			});
		} catch (error) {
			console.error('Error exporting project:', error);
			toast({
				variant: 'error',
				title: 'Failed to Export Project',
				description: error.message || 'An unexpected error occurred',
			});
			throw error;
		}
	},

	importProject: async (file) => {
		try {
			const JSZip = (await import('jszip')).default;
			const zip = await JSZip.loadAsync(file);

			const projectDataStr = await zip.file('projectData.json')?.async('text');
			const participantsStr = await zip.file('participants.json')?.async('text');
			const categoriesStr = await zip.file('categories.json')?.async('text');
			const decoratorsStr = await zip.file('decorators.json')?.async('text');

			if (!projectDataStr) {
				throw new Error('Invalid project file: missing projectData.json');
			}

			const projectData = JSON.parse(projectDataStr);
			const participants = participantsStr ? JSON.parse(participantsStr) : [];
			const categories = categoriesStr ? JSON.parse(categoriesStr) : [];
			const decorators = decoratorsStr ? JSON.parse(decoratorsStr) : [];

			const { v4: uuidv4 } = await import('uuid');
			const newProjectId = uuidv4();
			const now = new Date().toISOString();

			const newProject = {
				id: newProjectId,
				name: projectData.projectName,
				description: projectData.description || '',
				createdAt: now,
				modifiedAt: now,
			};

			await db.projects.add(newProject);

			const categoryIdMap = new Map();
			const { useCategoryStore } = await import('./categoryStore');

			for (const cat of categories) {
				const newCatId = uuidv4();
				const newCat = {
					id: newCatId,
					name: cat.name,
					parentCategoryId: null,
					projectId: newProjectId,
					createdAt: now,
					modifiedAt: now,
				};
				await db.categories.add(newCat);
				categoryIdMap.set(cat.id, newCatId);
			}

			for (const cat of categories) {
				if (cat.parentCategoryId) {
					const newCatId = categoryIdMap.get(cat.id);
					const newParentId = categoryIdMap.get(cat.parentCategoryId);
					if (newCatId && newParentId) {
						await db.categories.update(newCatId, { parentCategoryId: newParentId });
					}
				}
			}

			for (const part of participants) {
				const newPartId = uuidv4();
				await db.participants.add({
					id: newPartId,
					name: part.name,
					category: part.category,
					projectId: newProjectId,
					createdAt: now,
					modifiedAt: now,
				});
			}

			for (const dec of decorators) {
				const newDecId = uuidv4();
				await db.decorators.add({
					id: newDecId,
					name: dec.name,
					type: dec.type,
					values: dec.values || {},
					projectId: newProjectId,
					createdAt: now,
					modifiedAt: now,
				});
			}

			const { useDialogueStore } = await import('./dialogueStore');
			const dialogueStore = useDialogueStore.getState();

			const dialoguesFolder = zip.folder('dialogues');
			if (dialoguesFolder) {
				const dialogueFiles = [];
				dialoguesFolder.forEach((relativePath, file) => {
					if (relativePath.endsWith('.mnteadlg') && !file.dir) {
						dialogueFiles.push({ path: relativePath, file });
					}
				});

				for (const { path, file } of dialogueFiles) {
					try {
						const dialogueBlob = await file.async('blob');
						const dialogueFile = new File([dialogueBlob], path);
						await dialogueStore.importDialogue(newProjectId, dialogueFile);
					} catch (error) {
						console.error(`Failed to import dialogue ${path}:`, error);
						toast({
							variant: 'error',
							title: 'Failed to Import Dialogue',
							description: `${path}: ${error.message}`,
						});
					}
				}
			}

			await get().loadProjects();

			useSyncStore.getState().schedulePush(newProjectId);

			toast({
				variant: 'success',
				title: 'Project Imported',
				description: `${newProject.name} has been imported successfully`,
			});

			return newProjectId;
		} catch (error) {
			console.error('Error importing project:', error);
			toast({
				variant: 'error',
				title: 'Failed to Import Project',
				description: error.message || 'An unexpected error occurred',
			});
		}
	},
}));
