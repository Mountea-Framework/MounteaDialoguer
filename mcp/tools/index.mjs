import { projectTools } from './projects.mjs';
import { graphTools } from './graph.mjs';
import { peopleTools } from './people.mjs';
import { defTools } from './defs.mjs';
import { exportTools } from './export.mjs';

export const TOOLS = [...projectTools, ...graphTools, ...peopleTools, ...defTools, ...exportTools];

// Deleting whole projects or dialogues is deliberately not available through MCP.
const FORBIDDEN = ['delete_project', 'delete_dialogue', 'remove_project', 'remove_dialogue'];
for (const tool of TOOLS) {
	if (FORBIDDEN.includes(tool.name)) throw new Error(`Tool ${tool.name} must not exist`);
}
export const TOOL_MAP = new Map(TOOLS.map((tool) => [tool.name, tool]));
