import { flushSync } from 'react-dom';
import i18n from '@/i18n';
import { getState, setState as storeSetState } from './captureStore.js';

const missingKeys = [];
i18n.options.saveMissing = true;
// Keys must exist in the requested language itself: with the app's default `fallbackLng: 'en'`
// a key missing from e.g. cs would silently render English and never emit missingKey.
i18n.options.fallbackLng = false;
i18n.on('missingKey', (_languages, _namespace, key) => {
	if (!missingKeys.includes(key)) missingKeys.push(key);
});

export function installDriver() {
	window.__capture = {
		missingKeys,
		// Loads the bundled Inter weights and reports every FontFace, so the runner can fail on a missing face.
		async fontFaces(weights) {
			await Promise.all(weights.map((w) => document.fonts.load(`${w} 16px Inter`).catch(() => [])));
			return [...document.fonts].map((f) => ({ family: f.family, weight: f.weight, status: f.status }));
		},
		// Test hook: delete every key equal to or starting with `prefix_` (plural forms) from a language bundle.
		dropKeys(lang, prefix) {
			const bundle = JSON.parse(JSON.stringify(i18n.getResourceBundle(lang, 'translation')));
			const dropped = [];
			const walk = (node, trail) => {
				for (const k of Object.keys(node)) {
					const full = trail ? `${trail}.${k}` : k;
					if (node[k] && typeof node[k] === 'object') walk(node[k], full);
					else if (full === prefix || full.startsWith(`${prefix}_`)) { delete node[k]; dropped.push(full); }
				}
			};
			walk(bundle, '');
			i18n.removeResourceBundle(lang, 'translation');
			i18n.addResourceBundle(lang, 'translation', bundle, false, true);
			return dropped;
		},
		setState(partial) {
			if (partial.language && partial.language !== i18n.language) {
				i18n.changeLanguage(partial.language);
			}
			flushSync(() => storeSetState(partial));
		},
		async loadFixture(bytes) {
			const { parseProjectArchive } = await import('@/lib/persistence/projectArchive.js');
			const { buildScene } = await import('../shared/graphState.js');
			const parsed = await parseProjectArchive(new Uint8Array(bytes));
			const { snapshot } = parsed;
			const dialogueId = parsed.dialogueId || snapshot.dialogues[0]?.id;
			if (!dialogueId) throw new Error('Fixture contains no dialogue');
			window.__fixture = { snapshot, dialogueId };
			return { dialogueId, scene: buildScene(snapshot, dialogueId), dialogues: snapshot.dialogues.map((d) => ({ id: d.id, name: d.name })) };
		},
		async viewportFor(bounds, size) {
			const { getViewportForBounds } = await import('@xyflow/react');
			return getViewportForBounds(bounds, size[0], size[1], 0.05, 2, 0.08);
		},
		// Mirrors dialogueStore.loadDialogueGraphForPreview: { nodes, edges, viewport }.
		// nodes are the dialogue's stored records with localized text materialized for the
		// active locale; edges are the stored records; viewport defaults to { x: 0, y: 0, zoom: 1 }.
		async graphForPreview(dialogueId) {
			const { snapshot } = window.__fixture;
			const dialogue = snapshot.dialogues.find((d) => d.id === dialogueId);
			if (!dialogue) return { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
			const { materializeLocalizedNodes, filterLocalizedEntriesByDialogue, normalizeProjectLocalizationConfig, normalizeLocaleTag, DEFAULT_LOCALE } = await import('@/lib/localization/stringTable');
			const project = snapshot.project || snapshot.projects?.find((p) => p.id === dialogue.projectId);
			const defaultLocale = normalizeProjectLocalizationConfig(project?.localization || {}).defaultLocale || DEFAULT_LOCALE;
			const entries = filterLocalizedEntriesByDialogue(snapshot.localizedStrings || [], dialogueId);
			const nodes = materializeLocalizedNodes({
				nodes: snapshot.nodes.filter((n) => n.dialogueId === dialogueId),
				dialogueId,
				dialogueSlug: dialogue.localizationSlug,
				locale: normalizeLocaleTag(i18n.language, defaultLocale),
				defaultLocale,
				stringEntries: entries,
			});
			return {
				nodes,
				edges: snapshot.edges.filter((e) => e.dialogueId === dialogueId),
				viewport: dialogue.viewport || { x: 0, y: 0, zoom: 1 },
			};
		},
		previewText() {
			const el = document.querySelector('[data-testid="preview-line"]');
			// The empty-line placeholder is not dialogue text.
			return el && el.textContent !== i18n.t('editor.preview.waiting') ? el.textContent : '';
		},
		isIdle() {
			const { scene } = getState();
			if (!scene) return false;
			if (document.fonts.status !== 'loaded') return false;
			const renderedNodes = document.querySelectorAll('.react-flow__node').length;
			const renderedEdges = document.querySelectorAll('.react-flow__edge').length;
			return renderedNodes === scene.nodes.length && renderedEdges === scene.edges.length;
		},
		rectOf(nodeId) {
			const el = document.querySelector(`.react-flow__node[data-id="${CSS.escape(nodeId)}"]`);
			if (!el) return null;
			const { x, y, width, height } = el.getBoundingClientRect();
			return { x, y, width, height };
		},
	};
	window.__captureReady = true;
}
