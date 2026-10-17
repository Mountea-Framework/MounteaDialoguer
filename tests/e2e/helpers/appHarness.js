import { expect } from '@playwright/test';

export function uniqueToken(prefix = 'e2e') {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).slice(2, 7);
	return `${prefix}${timestamp}${random}`;
}

export async function seedLocalState(page) {
	await page.addInitScript(() => {
		try {
			window.localStorage.setItem('onboarding-dashboard', 'true');
			window.localStorage.setItem('onboarding-dialogue-editor', 'true');
			window.localStorage.setItem(
				'mountea-dialoguer-sync::local',
				JSON.stringify({
					state: { hideLoginPrompt: true },
					version: 0,
				})
			);
		} catch (_error) {
			// Best-effort seeding for deterministic tests.
		}
	});
}

export async function openDashboard(page) {
	await page.goto('/#/');
	await expect(page.getByRole('button', { name: /(create new|new project|new dialogue)/i }).first()).toBeVisible();
}

export async function createProject(page, projectName) {
	await page.getByRole('button', { name: /(create new|new project|new dialogue)/i }).first().click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await dialog.getByLabel(/project name/i).fill(projectName);
	await dialog.getByRole('button', { name: /^create$/i }).click();
	await expect(page).toHaveURL(/#\/projects\/[^/]+\/?$/);
	await expect(page.getByRole('heading', { name: projectName }).first()).toBeVisible();
}

export async function openDialoguesSection(page) {
	await page.getByRole('button', { name: /dialogues/i }).first().click();
	await expect(page.getByRole('heading', { name: /dialogues/i }).first()).toBeVisible();
}

export async function createDialogue(page, dialogueName) {
	await page.getByRole('button', { name: /(create new|new project|new dialogue)/i }).first().click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await dialog.getByLabel(/dialogue name/i).fill(dialogueName);
	await dialog.getByRole('button', { name: /^create$/i }).click();
	await expect(page).toHaveURL(/#\/projects\/[^/]+\/dialogue\/[^/]+\/?$/);
	await expect(page.locator('[data-tour="canvas"]')).toBeVisible();
}

export async function openDialogueSettings(page) {
	const url = new URL(page.url());
	const hash = url.hash || '';
	const settingsHash = hash.endsWith('/')
		? `${hash}settings`
		: `${hash}/settings`;
	await page.goto(`/${settingsHash}`);
	await expect(page).toHaveURL(/#\/projects\/[^/]+\/dialogue\/[^/]+\/settings\/?$/);
	await expect(page.getByRole('heading', { name: /dialogue settings/i }).first()).toBeVisible();
}

export const START_NODE_ID = '00000000-0000-0000-0000-000000000001';

// Builds the graph of the currently open dialogue through the app's own stores (the same path the editor
// uses), then reloads the editor. Needs the Vite dev server: modules are imported by path, so this does not
// work against the production bundle.
// `nodes`: [{ id, type, data }] (text is plain), `edges`: [[source, target]] where "start" is the Start node.
// Every node gets participant "Tester" unless it sets its own.
export async function seedGraph(page, { nodes = [], edges = [] }) {
	await page.evaluate(
		async ({ nodes: seedNodes, edges: seedEdges, startId }) => {
			const [, projectId, dialogueId] = window.location.hash.match(/projects\/([^/]+)\/dialogue\/([^/?]+)/);
			const { useCategoryStore } = await import('/src/stores/categoryStore.js');
			const { useParticipantStore } = await import('/src/stores/participantStore.js');
			const { useDialogueStore } = await import('/src/stores/dialogueStore.js');
			const category = await useCategoryStore.getState().createCategory({ projectId, name: 'Folk' });
			const participant = await useParticipantStore.getState().createParticipant({ projectId, name: 'Tester', category: category.name, categoryId: category.id });
			const toNode = (node, index) => ({
				position: { x: 300, y: 150 * (index + 1) },
				...node,
				data: {
					label: node.id,
					displayName: node.id,
					participant: participant.name,
					participantId: participant.id,
					decorators: [],
					hasAudio: false,
					...node.data,
				},
			});
			const start = {
				id: startId,
				type: 'startNode',
				position: { x: 0, y: 0 },
				deletable: false,
				data: { label: 'Dialogue entry point', displayName: 'Start', decorators: [], dialogueRows: [], hasAudio: false },
			};
			const edges = seedEdges.map(([source, target]) => ({
				id: `${source}-${target}`,
				source: source === 'start' ? startId : source,
				target,
				type: 'conditionEdge',
				data: { conditions: { mode: 'all', rules: [] } },
			}));
			await useDialogueStore.getState().saveDialogueGraph(dialogueId, [start, ...seedNodes.map(toNode)], edges, { x: 0, y: 0, zoom: 1 }, {});
		},
		{ nodes, edges, startId: START_NODE_ID }
	);
	await page.reload();
	await expect(page.locator('[data-tour="canvas"]')).toBeVisible();
	// The editor shows a loading overlay for a moment; wait until the seeded graph is on screen.
	await expect(page.locator('.react-flow__node').first()).toBeVisible();
	await expect(page.getByText(/preparing dialogue graph/i)).toHaveCount(0, { timeout: 15000 });
}

export function textRow(id, text, duration = 5) {
	return { id, text, duration };
}
