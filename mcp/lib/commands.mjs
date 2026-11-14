import { TOOL_MAP } from '../tools/index.mjs';
import { commandError, createCommandExecutor } from './dispatch.mjs';

export { commandError };

/** Transport-independent validation and dispatch. No writes occur outside the tool handlers. */
export const executeCommand = createCommandExecutor(TOOL_MAP);
