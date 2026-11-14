import { CORE_TOOLS } from './core.mjs';
import { exportTools } from './export.mjs';

export const TOOLS = [...CORE_TOOLS, ...exportTools];

export const TOOL_MAP = new Map(TOOLS.map((tool) => [tool.name, tool]));
