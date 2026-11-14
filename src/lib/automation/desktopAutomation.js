// Answers the desktop CLI endpoint (electron/automation.cjs). The main process forwards MCP JSON-RPC payloads here
// and they run through the shared tool layer (mcp/) against the local database. The tool code loads on the first
// request, so nothing extra is loaded unless the CLI is actually used. The web build never has the bridge.
import { isElectronRuntime } from '@/lib/electronRuntime';
import { useExternalChangeStore } from '@/stores/externalChangeStore';

const INSTRUCTIONS =
	'Edits the projects of the Mountea Dialoguer desktop app on this computer (its active profile). Workflow: list_projects -> get_project -> create participants/categories -> create_dialogue -> set_graph -> validate_dialogue. Changes appear in the open app straight away and sync like edits made in the app. import_archive and export_* move .mnteadlgproj / .mnteadlg files as base64.';

let unsubscribe = null;
let handlerPromise = null;

function loadHandler() {
	handlerPromise ||= (async () => {
		const [{ setBackend }, { createCommandExecutor }, { createRpcHandler }, { CORE_TOOLS }, { createDexieBackend }, { createDesktopTools }] = await Promise.all([
			import('../../../mcp/lib/backend.mjs'),
			import('../../../mcp/lib/dispatch.mjs'),
			import('../../../mcp/lib/jsonrpc.mjs'),
			import('../../../mcp/tools/core.mjs'),
			import('./dexieBackend'),
			import('./desktopTools'),
		]);
		const notify = (projectId, dialogueIds) => useExternalChangeStore.getState().notify(projectId, dialogueIds);
		setBackend(createDexieBackend({ onWrite: notify }));
		const tools = [...CORE_TOOLS, ...createDesktopTools({ onImported: (projectId, snapshot) => notify(projectId, snapshot.dialogues.map((dialogue) => dialogue.id)) })];
		const execute = createCommandExecutor(new Map(tools.map((tool) => [tool.name, tool])));
		return createRpcHandler({ tools, execute: (name, args) => execute(name, args), instructions: INSTRUCTIONS, onUnexpectedError: (name, error) => console.error('[automation] tool failed', name, error) });
	})().catch((error) => {
		handlerPromise = null;
		throw error;
	});
	return handlerPromise;
}

async function answer(api, { id, message }) {
	let response;
	try {
		response = await (await loadHandler()).handlePayload(message, {});
	} catch (error) {
		console.error('[automation] request failed', error);
		response = { jsonrpc: '2.0', id: Array.isArray(message) ? null : message?.id ?? null, error: { code: -32603, message: 'Internal error' } };
	}
	api.sendAutomationResponse({ id, response: response ?? null });
}

/** Registers the request listener (once) and tells the main process this renderer can answer. */
export function startDesktopAutomation() {
	const api = typeof window === 'undefined' ? null : window.electronAPI;
	if (!isElectronRuntime() || typeof api?.onAutomationRequest !== 'function') return;
	unsubscribe ||= api.onAutomationRequest((payload) => { void answer(api, payload || {}); });
	api.notifyAutomationReady();
}

export function stopDesktopAutomation() {
	unsubscribe?.();
	unsubscribe = null;
}
