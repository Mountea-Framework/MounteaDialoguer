import { flushSync } from 'react-dom';
import i18n from '@/i18n';
import { getState, setState as storeSetState } from './captureStore.js';

const missingKeys = [];
i18n.options.saveMissing = true;
i18n.on('missingKey', (_languages, _namespace, key) => {
	if (!missingKeys.includes(key)) missingKeys.push(key);
});

export function installDriver() {
	window.__capture = {
		missingKeys,
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
