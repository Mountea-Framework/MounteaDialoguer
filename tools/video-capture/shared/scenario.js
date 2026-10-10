import { EASES } from './ease.js';

export const BEAT_KINDS = ['preview', 'graph', 'stills'];
const THEMES = ['dark', 'light'];
const SAFE_ID = /^[a-z0-9][a-z0-9_-]*$/i;

export function frameCount(beat, fps) {
	return Math.max(1, Math.round(beat.duration * fps));
}

export function validateScenario(scenario) {
	const problems = [];
	if (!scenario?.id) problems.push('scenario.id is required');
	else if (!SAFE_ID.test(scenario.id)) problems.push(`scenario.id "${scenario.id}" must match ${SAFE_ID} (it becomes a directory name)`);
	if (!Number.isInteger(scenario?.fps) || scenario.fps < 1 || scenario.fps > 120) problems.push('scenario.fps must be an integer from 1 to 120');
	const size = scenario?.size;
	if (!Array.isArray(size) || size.length !== 2 || size.some((n) => !Number.isInteger(n) || n < 1)) problems.push('scenario.size must be [width, height] integers');
	if (!scenario?.fixture) problems.push('scenario.fixture is required');
	if (!Array.isArray(scenario?.beats) || scenario.beats.length === 0) problems.push('scenario.beats must be a non-empty array');

	const seen = new Set();
	(scenario?.beats || []).forEach((beat, index) => {
		const at = `beats[${index}] (${beat?.id ?? 'no id'})`;
		if (!beat?.id) problems.push(`${at}: id is required`);
		else if (!SAFE_ID.test(beat.id)) problems.push(`${at}: id must match ${SAFE_ID} (it becomes a directory name)`);
		else if (seen.has(beat.id)) problems.push(`${at}: duplicate id`);
		else seen.add(beat.id);

		if (!BEAT_KINDS.includes(beat?.kind)) problems.push(`${at}: kind must be one of ${BEAT_KINDS.join(', ')}`);

		if (beat?.kind === 'stills') {
			const earlier = scenario.beats.slice(0, index);
			if (!beat.of || !earlier.some((b) => b.id === beat.of && b.kind === 'graph')) problems.push(`${at}: "of" must name an earlier graph beat`);
			if (!THEMES.includes(beat.from) || !THEMES.includes(beat.to)) problems.push(`${at}: stills needs from and to themes (${THEMES.join('/')})`);
			else if (beat.from === beat.to) problems.push(`${at}: stills from and to themes must differ`);
		} else if (!(beat?.duration > 0)) {
			problems.push(`${at}: duration must be > 0`);
		}
		if (beat?.kind === 'preview' && beat.actions !== undefined) {
			if (!Array.isArray(beat.actions) || beat.actions.some((a) => !(a?.at >= 0) || typeof a?.click !== 'string' || !a.click)) problems.push(`${at}: actions must be [{ at: seconds >= 0, click: button name }]`);
		}
		if (beat?.ease && !EASES.includes(beat.ease)) problems.push(`${at}: unknown ease "${beat.ease}"`);
		if (beat?.theme && !THEMES.includes(beat.theme)) problems.push(`${at}: theme must be ${THEMES.join('/')}`);
	});

	if (problems.length) throw new Error(`Invalid scenario:\n - ${problems.join('\n - ')}`);
	return scenario;
}
