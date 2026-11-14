import { assertUnreferenced } from '../../src/lib/domainIntegrity.js';
import { loadSnapshot, mutateProject } from '../lib/backend.mjs';
import { nowIso, ToolError, uuid } from '../lib/core.mjs';
import {
	MAX_NAME_LENGTH,
	assertCategoryPlacement,
	assertUniqueCategoryName,
	assertUniqueParticipant,
	cleanName,
} from '../lib/rules.mjs';
import { defineTool, str, bool, PROJECT } from './util.mjs';

const MAX_THUMBNAIL_BYTES = 1024 * 1024;

const findCategory = (categories, ref, label = 'Category') => {
	const hit = categories.find((c) => c.id === ref || c.name.toLowerCase() === String(ref).toLowerCase());
	if (!hit) throw new ToolError(`${label} "${ref}" not found. Existing: ${categories.map((c) => c.name).join(', ') || '(none)'}`, { code: 'NOT_FOUND', status: 404 });
	return hit;
};
const findParticipant = (participants, ref) => {
	const hit = participants.find((p) => p.id === ref || p.name.toLowerCase() === String(ref).toLowerCase());
	if (!hit) throw new ToolError(`Participant "${ref}" not found. Existing: ${participants.map((p) => p.name).join(', ') || '(none)'}`, { code: 'NOT_FOUND', status: 404 });
	return hit;
};
const participantUsage = (s, participant) => s.nodes.filter((n) => n.data?.participantId === participant.id || (!n.data?.participantId && n.data?.participant === participant.name)).length;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// Lenient like Buffer.from(..., 'base64'): URL-safe characters and missing padding are accepted, other characters
// outside the alphabet are skipped, and decoding stops at the first "=".
function decodeBase64(text) {
	let clean = text.split('=')[0].replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
	if (clean.length % 4 === 1) clean = clean.slice(0, -1);
	const binary = atob(clean + '='.repeat((4 - (clean.length % 4)) % 4));
	return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeBase64(bytes) {
	let binary = '';
	for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
	return btoa(binary);
}

function pngThumbnail(base64) {
	const raw = String(base64).replace(/^data:image\/png;base64,/, '');
	const bytes = decodeBase64(raw);
	if (bytes.length < 24 || PNG_SIGNATURE.some((value, index) => bytes[index] !== value)) throw new ToolError('Thumbnail must be a PNG image (base64)');
	if (bytes.length > MAX_THUMBNAIL_BYTES) throw new ToolError('Thumbnail must be 1 MiB or smaller');
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	return {
		base64: `data:image/png;base64,${encodeBase64(bytes)}`,
		name: 'thumbnail.png',
		mimeType: 'image/png',
		size: bytes.length,
		sizeBytes: bytes.length,
		width: view.getUint32(16),
		height: view.getUint32(20),
		updatedAt: nowIso(),
	};
}

export const peopleTools = [
	defineTool('list_participants', 'List participants (speakers) of a project.', { projectId: PROJECT }, ['projectId'], async ({ projectId }) => {
		const s = await loadSnapshot(projectId);
		return { participants: s.participants.map((p) => ({ id: p.id, name: p.name, category: p.category, hasThumbnail: Boolean(p.thumbnail), usedByNodes: participantUsage(s, p) })) };
	}),

	defineTool(
		'create_participant',
		`Create a participant. Name: PascalCase, letters/numbers/_/-, max ${MAX_NAME_LENGTH} chars, unique within its category tree. The category must exist (create_category).`,
		{ projectId: PROJECT, name: str('Participant name'), category: str('Category name or id') },
		['projectId', 'name', 'category'],
		(args) =>
			mutateProject(args.projectId, (s) => {
				const name = cleanName(args.name, 'Participant', { maxLength: MAX_NAME_LENGTH });
				const category = findCategory(s.categories, args.category);
				assertUniqueParticipant(name, category.name, s.participants, s.categories);
				const now = nowIso();
				const participant = { id: uuid(), projectId: args.projectId, name, category: category.name, categoryId: category.id, thumbnail: null, createdAt: now, modifiedAt: now };
				s.participants.push(participant);
				return { participantId: participant.id, name, category: category.name };
			})
	),

	defineTool(
		'update_participant',
		'Rename a participant and/or move it to another category. A rename also updates every node that uses it.',
		{ projectId: PROJECT, participant: str('Participant name or id'), name: str('New name'), category: str('New category name or id') },
		['projectId', 'participant'],
		(args) =>
			mutateProject(args.projectId, (s) => {
				const p = findParticipant(s.participants, args.participant);
				const oldName = p.name;
				const name = args.name !== undefined ? cleanName(args.name, 'Participant', { maxLength: MAX_NAME_LENGTH }) : p.name;
				const category = args.category !== undefined ? findCategory(s.categories, args.category) : s.categories.find((c) => c.id === p.categoryId) || findCategory(s.categories, p.category);
				const categoryName = category.name;
				assertUniqueParticipant(name, categoryName, s.participants, s.categories, p.id);
				p.name = name;
				p.category = categoryName;
				p.categoryId = category.id;
				p.modifiedAt = nowIso();
				let renamedIn = 0;
				if (name !== oldName) {
					for (const n of s.nodes) {
						if (n.data?.participantId === p.id || (!n.data?.participantId && n.data?.participant === oldName)) {
							n.data.participant = name;
							renamedIn += 1;
						}
					}
				}
				return { name, category: categoryName, nodesUpdated: renamedIn };
			})
	),

	defineTool(
		'delete_participant',
		'Delete a participant. References must be removed or reassigned first; force does not bypass this safeguard.',
		{ projectId: PROJECT, participant: str('Participant name or id'), force: bool('Compatibility argument; referenced records cannot be deleted') },
		['projectId', 'participant'],
		(args) =>
			mutateProject(args.projectId, (s) => {
				const p = findParticipant(s.participants, args.participant);
				const used = participantUsage(s, p);
				assertUnreferenced(s, 'participants', p);
				s.participants = s.participants.filter((x) => x.id !== p.id);
				return { deleted: p.name, nodesStillReferencing: used };
			})
	),

	defineTool(
		'set_participant_thumbnail',
		'Set (or clear) a participant portrait. PNG, base64 (with or without data: prefix), max 1 MiB. Omit pngBase64 to clear.',
		{ projectId: PROJECT, participant: str('Participant name or id'), pngBase64: str('PNG image, base64') },
		['projectId', 'participant'],
		(args) =>
			mutateProject(args.projectId, (s) => {
				const p = findParticipant(s.participants, args.participant);
				p.thumbnail = args.pngBase64 ? pngThumbnail(args.pngBase64) : null;
				p.modifiedAt = nowIso();
				return { participant: p.name, thumbnail: p.thumbnail ? { width: p.thumbnail.width, height: p.thumbnail.height, sizeBytes: p.thumbnail.sizeBytes } : null };
			})
	),

	defineTool('list_categories', 'List participant categories as a tree.', { projectId: PROJECT }, ['projectId'], async ({ projectId }) => {
		const s = await loadSnapshot(projectId);
		const build = (parent) =>
			s.categories
				.filter((c) => (c.parentCategoryId || null) === parent)
				.map((c) => ({ id: c.id, name: c.name, participants: s.participants.filter((p) => p.category === c.name).map((p) => p.name), children: build(c.id) }));
		return { categories: build(null) };
	}),

	defineTool(
		'create_category',
		`Create a participant category (max depth 5, name max ${MAX_NAME_LENGTH} chars, unique within its tree). Omit parent for a top-level category.`,
		{ projectId: PROJECT, name: str('Category name'), parent: str('Parent category name or id') },
		['projectId', 'name'],
		(args) =>
			mutateProject(args.projectId, (s) => {
				const name = cleanName(args.name, 'Category', { maxLength: MAX_NAME_LENGTH });
				const parent = args.parent ? findCategory(s.categories, args.parent, 'Parent category') : null;
				assertCategoryPlacement(null, parent?.id, s.categories);
				assertUniqueCategoryName(name, parent?.id || null, s.categories);
				const now = nowIso();
				const category = { id: uuid(), projectId: args.projectId, name, parentCategoryId: parent?.id || null, createdAt: now, modifiedAt: now };
				s.categories.push(category);
				return { categoryId: category.id, name, parent: parent?.name || null };
			})
	),

	defineTool(
		'update_category',
		'Rename a category and/or move it (parent "" = move to top level). A rename also updates the participants that use it.',
		{ projectId: PROJECT, category: str('Category name or id'), name: str('New name'), parent: str('New parent name or id; empty string for top level') },
		['projectId', 'category'],
		(args) =>
			mutateProject(args.projectId, (s) => {
				const c = findCategory(s.categories, args.category);
				const oldName = c.name;
				const name = args.name !== undefined ? cleanName(args.name, 'Category', { maxLength: MAX_NAME_LENGTH }) : c.name;
				let parentId = c.parentCategoryId || null;
				if (args.parent !== undefined) parentId = args.parent === '' ? null : findCategory(s.categories, args.parent, 'Parent category').id;
				assertCategoryPlacement(c.id, parentId, s.categories);
				assertUniqueCategoryName(name, parentId, s.categories, c.id);
				c.name = name;
				c.parentCategoryId = parentId;
				c.modifiedAt = nowIso();
				let moved = 0;
				if (name !== oldName) {
					for (const p of s.participants) {
						if (p.categoryId === c.id || (!p.categoryId && p.category === oldName)) {
							p.category = name;
							moved += 1;
						}
					}
				}
				return { name, parentCategoryId: parentId, participantsUpdated: moved };
			})
	),

	defineTool(
		'delete_category',
		'Delete a category. Refused while it has child categories or participants; move or delete those first.',
		{ projectId: PROJECT, category: str('Category name or id') },
		['projectId', 'category'],
		(args) =>
			mutateProject(args.projectId, (s) => {
				const c = findCategory(s.categories, args.category);
				assertUnreferenced(s, 'categories', c);
				s.categories = s.categories.filter((x) => x.id !== c.id);
				return { deleted: c.name };
			})
	),
];
