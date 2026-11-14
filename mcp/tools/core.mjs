// Tools that only need a project backend (backend.mjs), so they run in Node and in the desktop renderer alike.
import { projectTools } from './projects.mjs';
import { graphTools } from './graph.mjs';
import { peopleTools } from './people.mjs';
import { defTools } from './defs.mjs';

export const CORE_TOOLS = [...projectTools, ...graphTools, ...peopleTools, ...defTools];
