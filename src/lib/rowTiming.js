// Per-row execution behaviour and duration mode. Mirrors Unreal ERowExecutionMode / ERowDurationMode.
// Absent fields mean the default, and defaults are not written, so existing exports stay unchanged.
export const ROW_EXECUTION_BEHAVIOURS = ['automatic', 'awaitInput', 'stopping'];
export const ROW_DURATION_MODES = ['duration', 'override', 'add', 'calculate'];
export const DEFAULT_ROW_EXECUTION_BEHAVIOUR = 'automatic';
export const DEFAULT_ROW_DURATION_MODE = 'duration';

// Unreal default: 100 characters per 8 seconds.
const CALCULATE_SECONDS_PER_100_CHARS = 8;
const MIN_ROW_SECONDS = 0.01;

export const getRowExecutionBehaviour = (row) =>
	ROW_EXECUTION_BEHAVIOURS.includes(row?.executionBehaviour) ? row.executionBehaviour : DEFAULT_ROW_EXECUTION_BEHAVIOUR;

export const getRowDurationMode = (row) =>
	ROW_DURATION_MODES.includes(row?.durationMode) ? row.durationMode : DEFAULT_ROW_DURATION_MODE;

const seconds = (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0);

// Mirrors UMounteaDialogueTraversalStatics::GetRowDuration; `text` is the active-locale row text.
export function resolveRowDuration(row, text = row?.text) {
	const base = seconds(row?.duration);
	const extra = seconds(row?.durationOverride);
	let result;
	switch (getRowDurationMode(row)) {
		case 'override': result = extra; break;
		case 'add': result = (row?.audioFile ? base : 0) + extra; break;
		case 'calculate': result = (String(text ?? '').length * CALCULATE_SECONDS_PER_100_CHARS) / 100; break;
		default: result = base;
	}
	return Math.max(result, MIN_ROW_SECONDS);
}

// Absent is valid; present values must be known ids / a non-negative number.
export function isValidRowTiming(row) {
	if (row?.executionBehaviour !== undefined && !ROW_EXECUTION_BEHAVIOURS.includes(row.executionBehaviour)) return false;
	if (row?.durationMode !== undefined && !ROW_DURATION_MODES.includes(row.durationMode)) return false;
	return row?.durationOverride === undefined || (typeof row.durationOverride === 'number' && Number.isFinite(row.durationOverride) && row.durationOverride >= 0);
}
