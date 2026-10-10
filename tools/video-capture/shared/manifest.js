import { createHash } from 'node:crypto';

export const MANIFEST_VERSION = 1;

export function beatHash(scenario, index, sourceDigest) {
	const { beats, ...settings } = scenario;
	const payload = JSON.stringify({ settings, beats: beats.slice(0, index + 1), sourceDigest });
	return createHash('sha1').update(payload).digest('hex');
}

export function buildManifest(scenario, entries, { scale = 1 } = {}) {
	let cursor = 0;
	const beats = entries.map((entry) => {
		const startFrame = cursor;
		cursor += entry.frames;
		return { ...entry, startFrame, duration: entry.frames / scenario.fps };
	});
	return {
		version: MANIFEST_VERSION, scenario: scenario.id, fps: scenario.fps,
		size: scenario.size, scale, language: scenario.language || 'en',
		totalFrames: cursor, beats,
	};
}
