// Desktop-only tools for the local CLI endpoint. Export reuses the UI's archive writer (same bytes as the Export
// button); import reuses the UI's archive reader, ID remapping and commit path, minus the toasts and file dialogs.
import { getRepositoryContext } from '@/lib/db';
import { exportProjectArchive, prepareArchiveImport } from '@/lib/persistence/projectArchive';
import { commitPreparedProject } from '@/lib/persistence/projectRepository';
import { buildProjectSnapshot } from '@/lib/sync/snapshot';
import { useDialogueStore } from '@/stores/dialogueStore';
import { loadSnapshot } from '../../../mcp/lib/backend.mjs';
import { ToolError } from '../../../mcp/lib/core.mjs';
import { getDialogue } from '../../../mcp/lib/graph.mjs';
import { defineTool, str, bool, PROJECT, DIALOGUE } from '../../../mcp/tools/util.mjs';
import { toToolError } from './dexieBackend';

function bytesToBase64(bytes) {
	let binary = '';
	for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
	return btoa(binary);
}

function base64ToBytes(text) {
	const clean = String(text).replace(/^data:[^,]*,/, '').replace(/\s/g, '');
	if (!clean || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) throw new ToolError('Argument "data" must be the archive as base64');
	const binary = atob(clean);
	return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

const INLINE_ONLY = 'Desktop exports are always returned as base64; omit inline or set it to true';

async function archiveResult(blob, fileName) {
	const bytes = new Uint8Array(await blob.arrayBuffer());
	return { fileName, sizeBytes: bytes.length, base64: bytesToBase64(bytes) };
}

/** onImported(projectId, snapshot) runs after an archive import commits (the committed snapshot). */
export function createDesktopTools({ onImported = () => {} } = {}) {
	return [
		defineTool(
			'export_dialogue',
			'Export a dialogue as a .mnteadlg archive (format mountea.archive.v3, the file the Unreal plugin imports; same content as the Export button; includes child dialogues it opens). Returns the file as base64.',
			{ projectId: PROJECT, dialogueId: DIALOGUE, inline: bool('Accepted for compatibility; desktop exports are always base64') },
			['projectId', 'dialogueId'],
			async ({ projectId, dialogueId, inline }) => {
				if (inline === false) throw new ToolError(INLINE_ONLY);
				const dialogue = getDialogue(await loadSnapshot(projectId), dialogueId);
				try {
					const context = await getRepositoryContext();
					const blob = await useDialogueStore.getState().exportDialogueAsBlob(dialogueId, { context });
					return await archiveResult(blob, `${dialogue.name}.mnteadlg`);
				} catch (error) { throw toToolError(error); }
			}
		),

		defineTool(
			'export_project',
			'Export the whole project as a .mnteadlgproj archive (mountea.archive.v3), the same file as the Export button. Returns the file as base64.',
			{ projectId: PROJECT, inline: bool('Accepted for compatibility; desktop exports are always base64') },
			['projectId'],
			async ({ projectId, inline }) => {
				if (inline === false) throw new ToolError(INLINE_ONLY);
				await loadSnapshot(projectId);
				try {
					const context = await getRepositoryContext();
					const snapshot = await buildProjectSnapshot(projectId, { context, requireReady: true });
					return await archiveResult(await exportProjectArchive(snapshot), `${snapshot.project.name || 'Project'}.mnteadlgproj`);
				} catch (error) { throw toToolError(error); }
			}
		),

		defineTool(
			'import_archive',
			'Import a .mnteadlgproj or .mnteadlg archive (base64). A project archive becomes a new project (mode "copy"), or replaces projectId (mode "replace"). A dialogue archive needs projectId and is added to it (mode "copy"), or replaces dialogueId (mode "replace"). Imported records get new ids.',
			{
				data: str('Archive bytes, base64'),
				fileName: str('Original file name (informational)'),
				mode: str('copy (default) or replace', { enum: ['copy', 'replace'] }),
				projectId: str('Destination project id (dialogue archives, or the project to replace)'),
				dialogueId: str('Dialogue to replace (dialogue archives with mode "replace")'),
			},
			['data'],
			async ({ data, mode = 'copy', projectId, dialogueId }) => {
				const bytes = base64ToBytes(data);
				if (projectId) await loadSnapshot(projectId);
				try {
					const context = await getRepositoryContext();
					const imported = await prepareArchiveImport(bytes, { context, mode, projectId, dialogueId });
					const outcome = await commitPreparedProject(imported.prepared);
					onImported(imported.projectId, outcome.snapshot);
					return { projectId: imported.projectId, projectName: outcome.snapshot.project.name, dialogueId: imported.firstDialogueId || null, mode };
				} catch (error) { throw toToolError(error); }
			}
		),
	];
}
