import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR } from '../../server/storage.mjs';
import { loadSnapshot } from '../lib/backend.mjs';
import { ToolError } from '../lib/core.mjs';
import { buildDialogueExport, buildProjectExport } from '../lib/export.mjs';
import { getDialogue } from '../lib/graph.mjs';
import { defineTool, bool, PROJECT, DIALOGUE } from './util.mjs';

export const EXPORT_DIR = path.join(DATA_DIR, 'exports');
const KEEP_MS = 24 * 60 * 60 * 1000;
const INLINE_LIMIT = 1024 * 1024;

async function pruneOldExports() {
	const files = await fs.readdir(EXPORT_DIR).catch(() => []);
	for (const f of files) {
		const stat = await fs.stat(path.join(EXPORT_DIR, f)).catch(() => null);
		if (stat && Date.now() - stat.mtimeMs > KEEP_MS) await fs.unlink(path.join(EXPORT_DIR, f)).catch(() => {});
	}
}

export const exportTools = [
	defineTool(
		'export_dialogue',
		'Export a dialogue as a .mnteadlg archive (format mountea.archive.v3, the file the Unreal plugin imports; same content as the Export button; includes child dialogues it opens). Returns a download link valid for 24 hours, or the file as base64 when inline=true and it is under 1 MB.',
		{ projectId: PROJECT, dialogueId: DIALOGUE, inline: bool('Return base64 instead of a link (small files only)') },
		['projectId', 'dialogueId'],
		async ({ projectId, dialogueId, inline }) => {
			const snapshot = await loadSnapshot(projectId);
			const dialogue = getDialogue(snapshot, dialogueId);
			const zip = await buildDialogueExport(snapshot, dialogueId);
			if (inline) {
				if (zip.length > INLINE_LIMIT) throw new ToolError(`Export is ${zip.length} bytes; use a download link instead (inline=false)`);
				return { fileName: `${dialogue.name}.mnteadlg`, sizeBytes: zip.length, base64: zip.toString('base64') };
			}
			await fs.mkdir(EXPORT_DIR, { recursive: true });
			await pruneOldExports();
			const fileName = `${dialogue.name}-${new Date().toISOString().replace(/[:.]/g, '-')}.mnteadlg`;
			await fs.writeFile(path.join(EXPORT_DIR, fileName), zip);
			return { fileName, sizeBytes: zip.length, downloadPath: `/export/${fileName}` };
		}
	),

	defineTool(
		'export_project',
		'Export the whole project as a .mnteadlgproj archive (mountea.archive.v3). Returns a download link valid for 24 hours, or base64 when inline=true and the file is under 1 MB.',
		{ projectId: PROJECT, inline: bool('Return base64 instead of a link (small files only)') },
		['projectId'],
		async ({ projectId, inline }) => {
			const snapshot = await loadSnapshot(projectId);
			const zip = await buildProjectExport(snapshot);
			const baseName = snapshot.project.name || 'Project';
			if (inline) {
				if (zip.length > INLINE_LIMIT) throw new ToolError(`Export is ${zip.length} bytes; use a download link instead (inline=false)`);
				return { fileName: `${baseName}.mnteadlgproj`, sizeBytes: zip.length, base64: zip.toString('base64') };
			}
			await fs.mkdir(EXPORT_DIR, { recursive: true });
			await pruneOldExports();
			const fileName = `${baseName}-${new Date().toISOString().replace(/[:.]/g, '-')}.mnteadlgproj`;
			await fs.writeFile(path.join(EXPORT_DIR, fileName), zip);
			return { fileName, sizeBytes: zip.length, downloadPath: `/export/${fileName}` };
		}
	),
];
