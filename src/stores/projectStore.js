import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { toast } from '@/components/ui/toaster';
import { openContainingFolder, saveExportBlob } from '@/lib/export/exportFile';
import { useSyncStore } from '@/stores/syncStore';
import { useDialogueStore } from '@/stores/dialogueStore';
import {
	DEFAULT_LOCALE,
	LOCALIZED_STRING_FIELDS,
	buildLocalizedEntriesFromNodes,
	ensureDialogueLocalizationSlug,
	isValidLocaleTag,
	normalizeProjectLocalizationConfig,
} from '@/lib/localization/stringTable';
import {
	trackExampleProjectCreated,
	trackFirstNonExampleProjectCreated,
} from '@/lib/achievements/achievementTracker';

const MAX_PROJECT_IMPORT_ARCHIVE_BYTES = 25 * 1024 * 1024;
const MAX_PROJECT_IMPORT_ENTRY_COUNT = 1000;
const MAX_PROJECT_IMPORT_TEXT_BYTES = 5 * 1024 * 1024;
const MAX_PROJECT_IMPORT_DIALOGUE_FILES = 250;

function parseImportedJsonText({ label, value }) {
	if (!value) return null;
	const byteLength = new TextEncoder().encode(String(value)).length;
	if (byteLength > MAX_PROJECT_IMPORT_TEXT_BYTES) {
		throw new Error(`${label} exceeds import size limit`);
	}
	try {
		return JSON.parse(value);
	} catch (error) {
		throw new Error(`Invalid JSON in ${label}`);
	}
}

async function seedProjectLocalizationDefaultLocale(projectId, defaultLocale) {
	const dialogues = await db.dialogues.where('projectId').equals(projectId).toArray();
	const allExisting = await db.localizedStrings.where('projectId').equals(projectId).toArray();
	const existingByDialogue = new Map();

	for (const entry of allExisting) {
		const key = String(entry?.dialogueId || '').trim();
		if (!key) continue;
		if (!existingByDialogue.has(key)) {
			existingByDialogue.set(key, []);
		}
		existingByDialogue.get(key).push(entry);
	}

	const toUpsert = [];
	for (const dialogue of dialogues) {
		const nodes = await db.nodes.where('dialogueId').equals(dialogue.id).toArray();
		const entries = buildLocalizedEntriesFromNodes({
			projectId,
			dialogueId: dialogue.id,
			dialogueSlug: dialogue.localizationSlug || '',
			nodes,
			locale: defaultLocale,
			existingEntries: existingByDialogue.get(dialogue.id) || [],
		});
		toUpsert.push(...entries);
	}

	if (toUpsert.length > 0) {
		await db.localizedStrings.bulkPut(toUpsert);
	}
}

const EXAMPLE_PROJECT_DEFAULT_LOCALE = DEFAULT_LOCALE;
const EXAMPLE_PROJECT_SUPPORTED_LOCALES = [DEFAULT_LOCALE, 'de'];

const EXAMPLE_GERMAN_ROW_TRANSLATIONS = Object.freeze({
	'Welcome, traveler. How can I help today?': 'Willkommen, Reisender. Wie kann ich heute helfen?',
	'I can trade, buy your wares, or share local news.':
		'Ich kann handeln, eure Waren kaufen oder lokale Neuigkeiten teilen.',
	'Show me what you have in stock.': 'Zeig mir, was du auf Lager hast.',
	'What have you heard lately?': 'Was hast du in letzter Zeit gehoert?',
	'Got any tasks that pay?': 'Hast du bezahlte Auftraege?',
	'I have a few things to sell.': 'Ich habe ein paar Dinge zu verkaufen.',
	'I should get moving.': 'Ich sollte weiterziehen.',
	'Right, one moment while I check the crate list.':
		'Gut, einen Moment, waehrend ich die Kistenliste pruefe.',
	'I can offer a basic travel bundle or the premium pack.':
		'Ich kann ein einfaches Reisepaket oder das Premiumpaket anbieten.',
	'The standard bundle is enough.': 'Das Standardpaket reicht.',
	'I want the premium pack.': 'Ich nehme das Premiumpaket.',
	'Let us pause the trade for now.': 'Lassen wir den Handel vorerst ruhen.',
	'Done. Safe roads and fair weather.': 'Erledigt. Sichere Wege und gutes Wetter.',
	'A wise choice. You are fully provisioned now.':
		'Eine weise Wahl. Du bist jetzt bestens ausgeruestet.',
	'Keep this between us. Which story do you want first?':
		'Das bleibt unter uns. Welche Geschichte willst du zuerst hoeren?',
	'What is happening on the roads?': 'Was ist auf den Strassen los?',
	'Anything about the old ruins?': 'Gibt es etwas ueber die alten Ruinen?',
	'That is enough gossip for now.': 'Das reicht fuer jetzt mit den Geruechten.',
	'Scouts saw raiders near the northern toll bridge.':
		'Spaeher haben Pluenderer nahe der noerdlichen Zollbruecke gesehen.',
	'Strange lights were seen there after dusk. Best avoid it.':
		'Dort wurden nach Einbruch der Daemmerung seltsame Lichter gesehen. Besser meiden.',
	'Actually yes. A crate is overdue at the mill road checkpoint.':
		'Tatsaechlich ja. Eine Kiste ist am Kontrollpunkt an der Muehlenstrasse ueberfaellig.',
	'I can handle that delivery.': 'Ich kann diese Lieferung uebernehmen.',
	'Not right now, sorry.': 'Gerade nicht, tut mir leid.',
	'Excellent. Take this token and report back before dusk.':
		'Ausgezeichnet. Nimm diese Marke und melde dich vor Einbruch der Daemmerung zurueck.',
	'Set it on the counter. What are you offering?':
		'Leg es auf den Tresen. Was bietest du an?',
	'A sack of orchard apples.': 'Ein Sack Obstgarten-Aepfel.',
	'I found this old relic in a ruined watchtower.':
		'Ich habe dieses alte Relikt in einem verfallenen Wachturm gefunden.',
	'Fair produce. I can pay ten silver.': 'Gute Ware. Ich kann zehn Silber zahlen.',
	'Interesting craftsmanship. I will pay fifty silver.':
		'Interessante Handwerkskunst. Ich zahle fuenfzig Silber.',
	'Safe travels. My stall stays open till moonrise.':
		'Gute Reise. Mein Stand bleibt bis Mondaufgang geoeffnet.',
	'If you visit the ruins, light a lantern first and avoid the lower vault.':
		'Wenn du die Ruinen besuchst, zuende zuerst eine Laterne an und meide das untere Gewoelbe.',
	'That is all I know. Return safely.': 'Das ist alles, was ich weiss. Komm sicher zurueck.',
});

const EXAMPLE_GERMAN_DISPLAY_NAME_TRANSLATIONS = Object.freeze({
	'Start Node': 'Startknoten',
	'Waldermar Greeting': 'Waldermar Begruessung',
	'Buy Supplies': 'Vorraete kaufen',
	'Ask Rumors': 'Nach Geruechten fragen',
	'Ask for Work': 'Nach Arbeit fragen',
	'Sell Goods': 'Waren verkaufen',
	Leave: 'Verlassen',
	'Waldermar Stock Check': 'Waldermar prueft Bestand',
	'Check Inventory': 'Bestand pruefen',
	'Waldermar Offer': 'Waldermars Angebot',
	'Take Standard Bundle': 'Standardpaket nehmen',
	'Take Premium Bundle': 'Premiumpaket nehmen',
	'Maybe Later': 'Vielleicht spaeter',
	'Trade Complete': 'Handel abgeschlossen',
	'Premium Trade Complete': 'Premium-Handel abgeschlossen',
	'Return To Greeting': 'Zur Begruessung zurueck',
	'Waldermar Lowers Voice': 'Waldermar senkt die Stimme',
	'Ask About Roads': 'Nach den Strassen fragen',
	'Ask About Ruins': 'Nach den Ruinen fragen',
	'Return to Main Topics': 'Zu den Hauptthemen zurueck',
	'Road Warning': 'Warnung vor den Strassen',
	'Ruins Warning': 'Warnung vor den Ruinen',
	'Open Ruins Follow-up': 'Ruinen-Folgegespraech oeffnen',
	'Waldermar Needs Help': 'Waldermar braucht Hilfe',
	'Think About Offer': 'Ueber Angebot nachdenken',
	'Accept Delivery Job': 'Lieferauftrag annehmen',
	'Decline Delivery Job': 'Lieferauftrag ablehnen',
	'Quest Accepted': 'Auftrag angenommen',
	'Waldermar Appraises Goods': 'Waldermar schaetzt Waren',
	'Sell Apples': 'Aepfel verkaufen',
	'Sell Old Relic': 'Altes Relikt verkaufen',
	'Sale Complete': 'Verkauf abgeschlossen',
	'Inspect Relic': 'Relikt begutachten',
	'Relic Sale Complete': 'Reliktverkauf abgeschlossen',
	'Farewell Complete': 'Abschied abgeschlossen',
	'Waldermar Ruins Follow-up': 'Waldermar Ruinen-Folgegespraech',
	'Ruins Follow-up Complete': 'Ruinen-Folgegespraech abgeschlossen',
});

const EXAMPLE_GERMAN_SELECTION_TITLE_TRANSLATIONS = Object.freeze({
	'Show me your supplies.': 'Zeig mir deine Vorratswaren.',
	'Any rumors worth hearing?': 'Gibt es Geruechte, die sich lohnen?',
	'Need help with anything?': 'Brauchst du bei etwas Hilfe?',
	'I want to sell items.': 'Ich moechte Gegenstaende verkaufen.',
	'Not today. Goodbye.': 'Heute nicht. Auf Wiedersehen.',
	'I will take the standard bundle.': 'Ich nehme das Standardpaket.',
	'I will take the premium pack.': 'Ich nehme das Premiumpaket.',
	'Actually, maybe later.': 'Eigentlich vielleicht spaeter.',
	'Tell me about the roads.': 'Erzaehl mir von den Strassen.',
	'What about the old ruins?': 'Was ist mit den alten Ruinen?',
	'Let us talk about something else.': 'Lass uns ueber etwas anderes sprechen.',
	'I can deliver it.': 'Ich kann es liefern.',
	'I cannot right now.': 'Ich kann gerade nicht.',
	'Fresh apples.': 'Frische Aepfel.',
	'An old relic.': 'Ein altes Relikt.',
});

async function applyExampleGermanTranslations(projectId) {
	const entries = await db.localizedStrings.where('projectId').equals(projectId).toArray();
	const now = new Date().toISOString();
	const updates = [];
	const fieldTranslationMap = {
		[LOCALIZED_STRING_FIELDS.rowText]: EXAMPLE_GERMAN_ROW_TRANSLATIONS,
		[LOCALIZED_STRING_FIELDS.displayName]: EXAMPLE_GERMAN_DISPLAY_NAME_TRANSLATIONS,
		[LOCALIZED_STRING_FIELDS.selectionTitle]: EXAMPLE_GERMAN_SELECTION_TITLE_TRANSLATIONS,
	};

	for (const entry of entries) {
		const translationMap = fieldTranslationMap[entry?.field];
		if (!translationMap) continue;
		const values = entry?.values && typeof entry.values === 'object' ? { ...entry.values } : {};
		const sourceText = String(values.en || values[DEFAULT_LOCALE] || '').trim();
		const germanText = translationMap[sourceText];
		if (!germanText || values.de === germanText) continue;
		updates.push({
			...entry,
			values: {
				...values,
				de: germanText,
			},
			modifiedAt: now,
		});
	}

	if (updates.length > 0) {
		await db.localizedStrings.bulkPut(updates);
	}
}

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
			const exampleProjectsWithGerman = projects.filter((project) => {
				if (!project?.isExample) return false;
				const localization = normalizeProjectLocalizationConfig(project?.localization || {});
				return localization.supportedLocales.includes('de');
			});

			for (const exampleProject of exampleProjectsWithGerman) {
				await applyExampleGermanTranslations(exampleProject.id);
			}

			// Load dialogue counts for each project
			const projectsWithCounts = await Promise.all(
				projects.map(async (project) => {
					const dialogueCount = await db.dialogues
						.where('projectId')
						.equals(project.id)
						.count();
					return {
						...project,
						localization: normalizeProjectLocalizationConfig(project?.localization || {}),
						dialogueCount,
					};
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
				localization: normalizeProjectLocalizationConfig(
					projectData?.localization || {
						enabled: false,
						defaultLocale: DEFAULT_LOCALE,
						supportedLocales: [DEFAULT_LOCALE],
					}
				),
				isExample: false,
				createdAt: now,
				modifiedAt: now,
			};
			await db.projects.add(newProject);
			try {
				await trackFirstNonExampleProjectCreated();
			} catch (error) {
				console.warn('[achievements] Failed to track first project:', error);
			}
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
			const childDialogueId = '7bc3efb2-4d63-467c-8d31-6d5ca6f5af09';

			const [existingDialogue, existingChildDialogue] = await Promise.all([
				db.dialogues.get(dialogueId),
				db.dialogues.get(childDialogueId),
			]);
			if (existingDialogue || existingChildDialogue) {
				const candidateProjectIds = Array.from(
					new Set(
						[
							String(existingDialogue?.projectId || '').trim(),
							String(existingChildDialogue?.projectId || '').trim(),
						].filter(Boolean)
					)
				);
				const candidateProjects = await Promise.all(
					candidateProjectIds.map(async (id) => await db.projects.get(id))
				);
				const existingExampleProject = candidateProjects.find(Boolean);
				if (existingExampleProject) {
					throw new Error('Example graph already exists. Delete the previous example project first.');
				}

				// Recover from orphaned example dialogues left without a parent project.
				await db.transaction('rw', [db.dialogues, db.nodes, db.edges, db.localizedStrings], async () => {
					await db.dialogues.delete(dialogueId);
					await db.dialogues.delete(childDialogueId);
					await db.nodes.where('dialogueId').anyOf([dialogueId, childDialogueId]).delete();
					await db.edges.where('dialogueId').anyOf([dialogueId, childDialogueId]).delete();
					await db.localizedStrings.where('dialogueId').anyOf([dialogueId, childDialogueId]).delete();
				});
			}

			const newProject = {
				id: projectId,
				name: 'OnboardingExample',
				description: 'Example branching dialogue project created from onboarding',
				version: '1.0.0',
				localization: normalizeProjectLocalizationConfig({
					enabled: true,
					defaultLocale: EXAMPLE_PROJECT_DEFAULT_LOCALE,
					supportedLocales: EXAMPLE_PROJECT_SUPPORTED_LOCALES,
				}),
				isExample: true,
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
				localizationSlug: ensureDialogueLocalizationSlug({
					name: 'MerchantBranchingExample',
				}),
				localizationVersion: 2,
				createdAt: now,
				modifiedAt: now,
				viewport: { x: 0, y: 0, zoom: 1 },
			};
			const childDialogue = {
				id: childDialogueId,
				projectId,
				name: 'RuinsFollowupExample',
				description: 'Small child dialogue opened from the rumors branch',
				localizationSlug: ensureDialogueLocalizationSlug({
					name: 'RuinsFollowupExample',
				}),
				localizationVersion: 2,
				createdAt: now,
				modifiedAt: now,
				viewport: { x: 0, y: 0, zoom: 1 },
			};
			const dialogues = [dialogue, childDialogue];
			const DECORATOR_PLAY_ANIM_ID = 'd1000000-0000-4000-8000-000000000001';
			const DECORATOR_OPEN_STORE_ID = 'd2000000-0000-4000-8000-000000000002';
			const CONDITION_PLAYER_LEVEL_ID = 'c1000000-0000-4000-8000-000000000001';
			const CONDITION_HAS_GUILD_BADGE_ID = 'c2000000-0000-4000-8000-000000000002';
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
			const conditions = [
				{
					id: CONDITION_PLAYER_LEVEL_ID,
					name: 'playerLevelAtLeast',
					type: 'Progression',
					properties: [
						{
							name: 'minimumLevel',
							type: 'int',
							defaultValue: 5,
						},
					],
					projectId,
					createdAt: now,
					modifiedAt: now,
				},
				{
					id: CONDITION_HAS_GUILD_BADGE_ID,
					name: 'hasGuildBadge',
					type: 'Quest',
					properties: [
						{
							name: 'required',
							type: 'bool',
							defaultValue: true,
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
					type: 'openChildGraphNode',
					position: { x: 430, y: 1320 },
					data: {
						label: 'Open Ruins Follow-up',
						displayName: 'Open Ruins Follow-up',
						targetDialogue: childDialogueId,
					},
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
				{
					id: 'e2000000-0000-4000-8000-000000000005',
					dialogueId,
					source: NODE_BUY_OFFER,
					target: NODE_BUY_PREMIUM,
					data: {
						conditions: {
							mode: 'all',
							rules: [
								{
									id: CONDITION_PLAYER_LEVEL_ID,
									name: 'playerLevelAtLeast',
									values: { minimumLevel: 5 },
									negate: false,
								},
								{
									id: CONDITION_HAS_GUILD_BADGE_ID,
									name: 'hasGuildBadge',
									values: { required: true },
									negate: false,
								},
							],
						},
					},
				},
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
				{
					id: 'e4000000-0000-4000-8000-000000000004',
					dialogueId,
					source: NODE_QUEST_DELAY,
					target: NODE_QUEST_DECLINE,
					data: {
						conditions: {
							mode: 'any',
							rules: [
								{
									id: CONDITION_PLAYER_LEVEL_ID,
									name: 'playerLevelAtLeast',
									values: { minimumLevel: 3 },
									negate: true,
								},
							],
						},
					},
				},
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
			const childNodes = [
				{
					id: NODE_START,
					dialogueId: childDialogueId,
					type: 'startNode',
					position: { x: 40, y: 40 },
					data: { label: 'Dialogue entry point', displayName: 'Start Node' },
				},
				{
					id: '70000000-0000-4000-8000-000000000001',
					dialogueId: childDialogueId,
					type: 'leadNode',
					position: { x: 60, y: 240 },
					data: {
						label: 'Ruins Follow-up',
						displayName: 'Waldermar Ruins Follow-up',
						participant: 'Waldermar',
						decorators: [],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: makeRows(30, [
							{
								text: 'If you visit the ruins, light a lantern first and avoid the lower vault.',
								duration: 3.0,
							},
						]),
					},
				},
				{
					id: '70000000-0000-4000-8000-000000000002',
					dialogueId: childDialogueId,
					type: 'completeNode',
					position: { x: 60, y: 460 },
					data: {
						label: 'Ruins Follow-up Complete',
						displayName: 'Ruins Follow-up Complete',
						participant: 'Waldermar',
						decorators: [],
						selectionTitle: '',
						hasAudio: false,
						dialogueRows: makeRows(31, [
							{
								text: 'That is all I know. Return safely.',
								duration: 2.1,
							},
						]),
					},
				},
			];
			const childEdges = [
				{
					id: 'e7000000-0000-4000-8000-000000000001',
					dialogueId: childDialogueId,
					source: NODE_START,
					target: '70000000-0000-4000-8000-000000000001',
				},
				{
					id: 'e7000000-0000-4000-8000-000000000002',
					dialogueId: childDialogueId,
					source: '70000000-0000-4000-8000-000000000001',
					target: '70000000-0000-4000-8000-000000000002',
				},
			];
			const allNodes = [...nodes, ...childNodes];
			const allEdges = [...edges, ...childEdges];
			const hardcodedNodePositions = {
				'00000000-0000-0000-0000-000000000001': { x: 0, y: 0 },
				'10000000-0000-4000-8000-000000000001': { x: -54.5, y: 188 },
				'10000000-0000-4000-8000-000000000002': { x: -1932.75, y: 449 },
				'10000000-0000-4000-8000-000000000003': { x: -834.25, y: 449 },
				'10000000-0000-4000-8000-000000000004': { x: -25, y: 449 },
				'10000000-0000-4000-8000-000000000005': { x: 619.5, y: 449 },
				'10000000-0000-4000-8000-000000000006': { x: 1002, y: 449 },
				'20000000-0000-4000-8000-000000000001': { x: -1974.25, y: 673 },
				'20000000-0000-4000-8000-000000000002': { x: -1919.25, y: 950 },
				'20000000-0000-4000-8000-000000000003': { x: -1990.75, y: 1158 },
				'20000000-0000-4000-8000-000000000004': { x: -2211.75, y: 1437.5 },
				'20000000-0000-4000-8000-000000000005': { x: -1862.25, y: 1437.5 },
				'20000000-0000-4000-8000-000000000006': { x: -1535.25, y: 1437.5 },
				'20000000-0000-4000-8000-000000000007': { x: -2219.25, y: 1698.5 },
				'20000000-0000-4000-8000-000000000008': { x: -1904.25, y: 1680 },
				'20000000-0000-4000-8000-000000000009': { x: -1520.25, y: 1690.5 },
				'30000000-0000-4000-8000-000000000001': { x: -903.25, y: 673 },
				'30000000-0000-4000-8000-000000000002': { x: -1251.75, y: 934 },
				'30000000-0000-4000-8000-000000000003': { x: -834.25, y: 934 },
				'30000000-0000-4000-8000-000000000004': { x: -486.25, y: 934 },
				'30000000-0000-4000-8000-000000000005': { x: -1303.25, y: 1176.5 },
				'30000000-0000-4000-8000-000000000006': { x: -897.25, y: 1176.5 },
				'30000000-0000-4000-8000-000000000007': { x: -471.25, y: 1168.5 },
				'30000000-0000-4000-8000-000000000008': { x: -1235.25, y: 1429.5 },
				'30000000-0000-4000-8000-000000000009': { x: -819.25, y: 1429.5 },
				'40000000-0000-4000-8000-000000000001': { x: -81, y: 691.5 },
				'40000000-0000-4000-8000-000000000002': { x: -15, y: 950 },
				'40000000-0000-4000-8000-000000000003': { x: -198.75, y: 1176.5 },
				'40000000-0000-4000-8000-000000000004': { x: 148.75, y: 1176.5 },
				'40000000-0000-4000-8000-000000000005': { x: -261.25, y: 1419 },
				'40000000-0000-4000-8000-000000000006': { x: 163.75, y: 1429.5 },
				'50000000-0000-4000-8000-000000000001': { x: 581, y: 673 },
				'50000000-0000-4000-8000-000000000002': { x: 451.25, y: 934 },
				'50000000-0000-4000-8000-000000000003': { x: 751.25, y: 934 },
				'50000000-0000-4000-8000-000000000004': { x: 448.75, y: 1176.5 },
				'50000000-0000-4000-8000-000000000005': { x: 797.75, y: 1192.5 },
				'50000000-0000-4000-8000-000000000006': { x: 737.75, y: 1437.5 },
				'60000000-0000-4000-8000-000000000001': { x: 958, y: 673 },
			};
			const positionedNodes = allNodes.map((node) => ({
				...node,
				position: hardcodedNodePositions[node.id]
					? hardcodedNodePositions[node.id]
					: node.position,
			}));

			await db.transaction(
				'rw',
				[db.projects, db.dialogues, db.categories, db.participants, db.decorators, db.conditions, db.nodes, db.edges],
				async () => {
					await db.projects.add(newProject);
					await db.categories.bulkAdd(categories);
					await db.participants.bulkAdd(participants);
					await db.decorators.bulkAdd(decorators);
					await db.conditions.bulkAdd(conditions);
					await db.dialogues.bulkAdd(dialogues);
					await db.nodes.bulkAdd(positionedNodes);
					await db.edges.bulkAdd(allEdges);
				}
			);

			await seedProjectLocalizationDefaultLocale(projectId, newProject.localization.defaultLocale);
			for (const locale of newProject.localization.supportedLocales || []) {
				if (locale === newProject.localization.defaultLocale) continue;
				await seedProjectLocalizationDefaultLocale(projectId, locale);
			}
			await applyExampleGermanTranslations(projectId);

			try {
				await trackExampleProjectCreated();
			} catch (error) {
				console.warn('[achievements] Failed to track example project:', error);
			}

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
			const existingProject = await db.projects.get(id);
			if (!existingProject) {
				throw new Error('Project not found');
			}

			const previousLocalization = normalizeProjectLocalizationConfig(
				existingProject.localization || {}
			);
			const nextLocalization =
				updates && Object.prototype.hasOwnProperty.call(updates, 'localization')
					? normalizeProjectLocalizationConfig(updates.localization || {})
					: previousLocalization;

			const nextPayload = {
				...updates,
				modifiedAt: new Date().toISOString(),
			};

			if (Object.prototype.hasOwnProperty.call(nextPayload, 'localization')) {
				nextPayload.localization = nextLocalization;
			}

				await db.projects.update(id, nextPayload);

				if (previousLocalization.defaultLocale !== nextLocalization.defaultLocale) {
					await seedProjectLocalizationDefaultLocale(id, nextLocalization.defaultLocale);
				}
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

	updateProjectLocalization: async (id, localizationUpdates = {}) => {
		set({ isLoading: true, error: null });
		try {
			const project = await db.projects.get(id);
			if (!project) {
				throw new Error('Project not found');
			}

			const rawSupported = Array.isArray(localizationUpdates?.supportedLocales)
				? localizationUpdates.supportedLocales
				: [];
			const invalidLocale = rawSupported.find((locale) => !isValidLocaleTag(locale));
			if (invalidLocale) {
				throw new Error(`Invalid locale tag: ${invalidLocale}`);
			}

			const rawDefault = String(localizationUpdates?.defaultLocale || '').trim();
			if (rawDefault && !isValidLocaleTag(rawDefault)) {
				throw new Error(`Invalid locale tag: ${rawDefault}`);
			}

			const nextLocalization = normalizeProjectLocalizationConfig({
				...(project.localization || {}),
				...localizationUpdates,
			});

			await get().updateProject(id, {
				localization: nextLocalization,
			});

			return nextLocalization;
		} catch (error) {
			console.error('Error updating project localization:', error);
			toast({
				variant: 'error',
				title: 'Failed to Update Localization',
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
			const syncedProviders = Array.from(
				new Set(
					(await db.syncProjects.where('projectId').equals(id).toArray())
						.map((entry) => String(entry?.provider || '').trim())
						.filter(Boolean)
				)
			);
			await db.transaction('rw', [db.projects, db.dialogues, db.participants, db.categories, db.decorators, db.conditions, db.localizedStrings, db.nodes, db.edges], async () => {
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
				await db.conditions.where('projectId').equals(id).delete();
				await db.localizedStrings.where('projectId').equals(id).delete();
			});
			await get().loadProjects();
			await useDialogueStore.getState().loadDialogues();
			await useSyncStore.getState().scheduleProjectDeletion(id, {
				providers: syncedProviders,
			});
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
			set({
				currentProject: project
					? {
						...project,
						localization: normalizeProjectLocalizationConfig(project.localization || {}),
					}
					: null,
				isLoading: false,
			});
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
			// Load JSZip
			const JSZip = (await import('jszip')).default;

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

			// Get categories, participants, decorators, and conditions
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
			const conditions = await db.conditions
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
				localization: normalizeProjectLocalizationConfig(project.localization || {}),
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
			const exportWithoutMeta = (entry) => {
				const exported = { ...entry };
				delete exported.id;
				delete exported.projectId;
				delete exported.createdAt;
				delete exported.modifiedAt;
				return exported;
			};
			const decoratorsExport = decorators.map(exportWithoutMeta);
			const conditionsExport = conditions.map(exportWithoutMeta);

			// Create main project ZIP
			const projectZip = new JSZip();

			// Add project JSON files
			projectZip.file('projectData.json', JSON.stringify(projectData, null, 2));
			projectZip.file('categories.json', JSON.stringify(categoriesExport, null, 2));
			projectZip.file('participants.json', JSON.stringify(participantsExport, null, 2));
			projectZip.file('decorators.json', JSON.stringify(decoratorsExport, null, 2));
			projectZip.file('conditions.json', JSON.stringify(conditionsExport, null, 2));

			// Create dialogues folder
			const dialoguesFolder = projectZip.folder('dialogues');

			// Export each dialogue as a .mnteadlg file
			const { useDialogueStore } = await import('./dialogueStore');
			const dialogueStore = useDialogueStore.getState();

			for (const dialogue of dialogues) {
				try {
					console.log(`Exporting dialogue: ${dialogue.name} (${dialogue.id})`);

					// Generate the dialogue export blob
					const dialogueBlob = await dialogueStore.exportDialogueAsBlob(dialogue.id);

					// Add to dialogues folder with sanitized name
					const sanitizedName = dialogue.name.replace(/[^a-z0-9]/gi, '_');
					dialoguesFolder.file(`${sanitizedName}.mnteadlg`, dialogueBlob);
					console.log(`Successfully exported dialogue: ${dialogue.name}`);
				} catch (error) {
					console.error(`Failed to export dialogue ${dialogue.name}:`, error);
					throw new Error(
						`Failed to export dialogue "${dialogue.name}": ${error.message || 'Unknown error'}`
					);
				}
			}

			// Generate the final ZIP
			const blob = await projectZip.generateAsync({ type: 'blob' });
			const defaultFileName = `${project.name}.mnteadlgproj`;
			const saveResult = await saveExportBlob({
				blob,
				defaultFileName,
				filters: [{ name: 'Project Export', extensions: ['mnteadlgproj'] }],
			});
			if (saveResult.canceled) {
				return;
			}

			if (saveResult.filePath) {
				await db.projects.update(projectId, {
					lastExportPath: saveResult.filePath,
				});
				set((state) => ({
					projects: state.projects.map((entry) =>
						entry.id === projectId
							? { ...entry, lastExportPath: saveResult.filePath }
							: entry
					),
					currentProject:
						state.currentProject?.id === projectId
							? { ...state.currentProject, lastExportPath: saveResult.filePath }
							: state.currentProject,
				}));
			}

			toast({
				variant: 'success',
				title: 'Project Exported',
				description: `${defaultFileName} has been exported`,
				action: saveResult.filePath
					? {
						label: 'Open Folder',
						onClick: () => {
							void openContainingFolder(saveResult.filePath);
						},
					}
					: undefined,
				duration: saveResult.filePath ? 8000 : 3000,
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
			if (!file) {
				throw new Error('Missing import file');
			}
			if (file.size > MAX_PROJECT_IMPORT_ARCHIVE_BYTES) {
				throw new Error(
					`Project archive is too large (max ${Math.floor(
						MAX_PROJECT_IMPORT_ARCHIVE_BYTES / (1024 * 1024)
					)} MB)`
				);
			}

			const JSZip = (await import('jszip')).default;
			const zip = await JSZip.loadAsync(file);
			const allZipEntries = Object.values(zip.files || {});
			const fileEntries = allZipEntries.filter((entry) => entry && !entry.dir);
			if (fileEntries.length > MAX_PROJECT_IMPORT_ENTRY_COUNT) {
				throw new Error('Project archive contains too many files');
			}
			for (const entry of fileEntries) {
				const safePath = String(entry?.name || '');
				if (safePath.startsWith('/') || safePath.includes('..')) {
					throw new Error(`Unsafe path in project archive: ${safePath}`);
				}
			}

			const projectDataStr = await zip.file('projectData.json')?.async('text');
			const participantsStr = await zip.file('participants.json')?.async('text');
			const categoriesStr = await zip.file('categories.json')?.async('text');
			const decoratorsStr = await zip.file('decorators.json')?.async('text');
			const conditionsStr = await zip.file('conditions.json')?.async('text');

			if (!projectDataStr) {
				throw new Error('Invalid project file: missing projectData.json');
			}

			const projectData = parseImportedJsonText({
				label: 'projectData.json',
				value: projectDataStr,
			});
			if (!projectData || typeof projectData !== 'object' || Array.isArray(projectData)) {
				throw new Error('Invalid project metadata in projectData.json');
			}
			const participants =
				parseImportedJsonText({
					label: 'participants.json',
					value: participantsStr,
				}) || [];
			const categories =
				parseImportedJsonText({
					label: 'categories.json',
					value: categoriesStr,
				}) || [];
			const decorators =
				parseImportedJsonText({
					label: 'decorators.json',
					value: decoratorsStr,
				}) || [];
			const conditions =
				parseImportedJsonText({
					label: 'conditions.json',
					value: conditionsStr,
				}) || [];
			if (
				!Array.isArray(participants) ||
				!Array.isArray(categories) ||
				!Array.isArray(decorators) ||
				!Array.isArray(conditions)
			) {
				throw new Error('Imported project metadata must contain arrays');
			}

			const { v4: uuidv4 } = await import('uuid');
			const newProjectId = uuidv4();
			const now = new Date().toISOString();

			const newProject = {
				id: newProjectId,
				name: projectData.projectName,
				description: projectData.projectDescription || projectData.description || '',
				version: projectData.version || '1.0.0',
				localization: normalizeProjectLocalizationConfig(projectData.localization || {}),
				isExample: false,
				createdAt: now,
				modifiedAt: now,
			};

			await db.projects.add(newProject);

			const categoryIdMap = new Map();

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

			for (const cond of conditions) {
				const newConditionId = uuidv4();
				await db.conditions.add({
					id: newConditionId,
					name: cond.name,
					type: cond.type,
					properties: cond.properties || [],
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
				if (dialogueFiles.length > MAX_PROJECT_IMPORT_DIALOGUE_FILES) {
					throw new Error('Project archive contains too many dialogue files');
				}

				for (const { path, file } of dialogueFiles) {
					try {
						if (String(path || '').startsWith('/') || String(path || '').includes('..')) {
							throw new Error('Unsafe dialogue archive path');
						}
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
