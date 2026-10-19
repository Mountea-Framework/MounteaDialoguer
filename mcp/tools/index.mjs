import { projectTools } from './projects.mjs';
import { graphTools } from './graph.mjs';
import { peopleTools } from './people.mjs';
import { defTools } from './defs.mjs';
import { exportTools } from './export.mjs';

export const TOOLS = [...projectTools, ...graphTools, ...peopleTools, ...defTools, ...exportTools];

export const TOOL_MAP = new Map(TOOLS.map((tool) => [tool.name, tool]));
