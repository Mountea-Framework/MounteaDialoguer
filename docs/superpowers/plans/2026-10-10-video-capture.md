# Video Capture Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `tools/video-capture/`, a reusable pipeline that renders the real Mountea Dialoguer components in a sandbox page, steps time frame by frame with Playwright, and writes transparent PNG layers plus a `manifest.json` that a generated HyperFrames project turns into a video.

**Architecture:** A Vite sandbox page (never shipped) imports the app through the `@` alias and renders real node/edge/preview components with fixed providers. A Playwright runner installs `page.clock`, calls `window.__capture.setState(...)` per frame, screenshots with a transparent background, and writes `out/<scenario>/<beat>/frame-NNNN.png`. Pure modules in `shared/` (easing, scenario validation, graph state, manifest) are unit-tested with `node --test`. A generator turns the manifest into a HyperFrames `compose/index.html`.

**Tech Stack:** Vite 6, React 18, `@xyflow/react` 12, `dagre`, Tailwind 3, `@playwright/test` 1.58 (`page.clock`), Node 24 `node:test`, ffmpeg, HyperFrames CLI (`npx hyperframes`).

**Spec:** `docs/superpowers/specs/2026-10-10-video-capture-design.md`

## Global Constraints

- Package lives at `tools/video-capture/`; it must not be added to Electron `build.files` and must not change app lint/CI scripts.
- Real components come in through the `@` alias (`@` → `<repo>/src`); no component is re-implemented in the sandbox. Only providers/stubs may differ.
- The only change inside `src/` is extracting `getLayoutedElements` (and its helpers) from the dialogue editor route into `src/lib/graphLayout.js`, with a regression test.
- Determinism: fake clock via `page.clock`; frames advance by exactly `1000 / fps` ms; no real-time recording.
- Default capture: 1920x1080, 30 fps, language `en`, transparent PNG (`screenshot({ omitBackground: true })`) except beats marked `opaque: true`.
- Output goes to git-ignored `tools/video-capture/out/`; a beat is written only if every frame succeeds (write to a temp dir, then rename).
- Hermetic capture: the runner blocks all network requests except the local Vite origin. Fonts come from local files.
- Easing names allowed in scenarios: `none`, `linear`, `power2.out`, `power2.inOut`, `power3.out`, `power3.inOut`, `sine.inOut`.
- Supported languages: `en`, `cs`, `de`, `es`, `fr`, `pl` (the real locale files).
- Tabs for indentation in `src/`, `tests/` and `tools/` (the repo uses tabs).

## Review Focus

The spec implies these inputs/conditions that no happy-path task exercises; each is pinned by a test in the task that owns the code.

1. **Missing or corrupt fixture archive** → runner exits non-zero with the fixture path in the message, and `out/` contains no partial beat directories (Task 3, Task 4).
2. **`move.node` names a node that does not exist or matches two nodes** → clear error listing the available labels (Task 4).
3. **Locale missing a translation key** (e.g. `--lang cs` while a key exists only in `en`) → capture fails and lists the key (Task 8).
4. **Graph with no start node, an empty graph, or an edge to an unknown node** → layout still returns, start-anchoring is skipped (Task 1).
5. **Beat whose duration × fps is fractional, zero, or negative** → rounded frame count ≥ 1, or a validation error naming the beat (Task 2).
6. **A moving beat that renders identical consecutive frames** ("stuck frame", e.g. the fake clock never advanced) → capture fails (Task 3).

---

## File Structure

```
src/lib/graphLayout.js                         NEW   dagre layout + node sizing extracted from the route
src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx   MODIFY  import from graphLayout
tests/e2e/graph-layout-regressions.spec.js     NEW   regression test for graphLayout

tools/video-capture/
  package.json                                 scripts only (deps resolve from the repo root node_modules)
  vite.config.js  tailwind.config.js  index.html
  shared/                                      pure modules, importable by Node and the browser
    ease.js  scenario.js  graphState.js  manifest.js
  sandbox/
    main.jsx  Stage.jsx  captureStore.js  driver.js  nodeTypes.js  Toolbar.jsx  capture.css
    fonts/inter-*.woff2
  runner/
    session.mjs  digest.mjs  capture.mjs  cli.mjs
  scenarios/
    brag.js  smoke.js
  compose/
    build.mjs  template.html  video-design.json
  test/                                        node:test files for shared/ and runner pieces
  README.md
  out/                                         git-ignored
```

Responsibilities: `shared/*` = math and data only, no DOM, no React. `sandbox/*` = browser-only rendering. `runner/*` = Node orchestration. `compose/*` = HyperFrames generation.

---

### Task 1: Extract `graphLayout.js` with a regression test

**Files:**
- Create: `src/lib/graphLayout.js`
- Create: `tests/e2e/graph-layout-regressions.spec.js`
- Modify: `src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx` (constants/functions around lines 228-331, `dagre` import at line 18)

**Interfaces:**
- Produces (from `src/lib/graphLayout.js`):
  - `START_NODE_ID: string` (`'00000000-0000-0000-0000-000000000001'`)
  - `START_NODE_ANCHOR_POSITION: { x: number, y: number }`
  - `DEFAULT_NODE_SIZE_BY_TYPE: Record<string, { width: number, height: number }>`
  - `getNodeSize(node): { width: number, height: number }`
  - `getLayoutedElements(nodes, edges, direction = 'TB'): { nodes, edges }`

- [ ] **Step 1: Write the failing test**

Create `tests/e2e/graph-layout-regressions.spec.js`:

```js
import { test, expect } from '@playwright/test';
import { openModuleHarness } from './helpers/moduleHarness.js';

const loadLayout = (page, fn, arg) =>
	page.evaluate(async ({ source, arg }) => {
		const mod = await import('/src/lib/graphLayout.js');
		return new Function('mod', 'arg', `return (${source})(mod, arg)`)(mod, arg);
	}, { source: fn.toString(), arg });

test('graph layout anchors the start node at the origin and ranks children below it', async ({ page }) => {
	await openModuleHarness(page);
	const out = await loadLayout(page, ({ getLayoutedElements, START_NODE_ID }) => {
		const nodes = [
			{ id: START_NODE_ID, type: 'startNode', position: { x: 500, y: 500 } },
			{ id: 'a', type: 'leadNode', position: { x: 0, y: 0 } },
			{ id: 'b', type: 'answerNode', position: { x: 0, y: 0 } },
			{ id: 'c', type: 'answerNode', position: { x: 0, y: 0 } },
		];
		const edges = [
			{ id: 'e1', source: START_NODE_ID, target: 'a' },
			{ id: 'e2', source: 'a', target: 'b' },
			{ id: 'e3', source: 'a', target: 'c' },
		];
		const first = getLayoutedElements(nodes, edges, 'TB');
		const second = getLayoutedElements(nodes, edges, 'TB');
		const pos = (result) => Object.fromEntries(result.nodes.map((n) => [n.id, n.position]));
		return { first: pos(first), second: pos(second), start: START_NODE_ID };
	});
	// Start node (200x88) anchored at (0,0); rank separation 100; nodesep 50.
	expect(out.first[out.start]).toEqual({ x: 0, y: 0 });
	expect(out.first.a.x).toBeCloseTo(-25, 3);
	expect(out.first.a.y).toBeCloseTo(188, 3);
	expect(out.first.b.x).toBeCloseTo(-175, 3);
	expect(out.first.c.x).toBeCloseTo(125, 3);
	expect(out.first.b.y).toBeCloseTo(412, 3);
	expect(out.first.c.y).toBeCloseTo(412, 3);
	// Deterministic: same input, same output.
	expect(out.second).toEqual(out.first);
});

test('graph layout tolerates an empty graph, a missing start node and edges to unknown nodes', async ({ page }) => {
	await openModuleHarness(page);
	const out = await loadLayout(page, ({ getLayoutedElements }) => {
		const empty = getLayoutedElements([], [], 'TB');
		const noStart = getLayoutedElements(
			[{ id: 'x', type: 'leadNode', position: { x: 7, y: 9 } }],
			[{ id: 'e', source: 'x', target: 'ghost' }],
			'TB'
		);
		return { empty: empty.nodes.length, noStart: noStart.nodes.map((n) => [n.id, n.position.x, n.position.y]) };
	});
	expect(out.empty).toBe(0);
	expect(out.noStart).toHaveLength(1);
	expect(out.noStart[0][0]).toBe('x');
	expect(Number.isFinite(out.noStart[0][1])).toBe(true);
	expect(Number.isFinite(out.noStart[0][2])).toBe(true);
});

test('getNodeSize prefers measured, then width/height, then style, then the type default', async ({ page }) => {
	await openModuleHarness(page);
	const out = await loadLayout(page, ({ getNodeSize }) => ({
		measured: getNodeSize({ type: 'leadNode', measured: { width: 11, height: 12 }, width: 1, height: 2 }),
		explicit: getNodeSize({ type: 'leadNode', width: 21, height: 22 }),
		style: getNodeSize({ type: 'leadNode', style: { width: '31px', height: '32px' } }),
		byType: getNodeSize({ type: 'startNode' }),
		fallback: getNodeSize({ type: 'mystery' }),
	}));
	expect(out.measured).toEqual({ width: 11, height: 12 });
	expect(out.explicit).toEqual({ width: 21, height: 22 });
	expect(out.style).toEqual({ width: 31, height: 32 });
	expect(out.byType).toEqual({ width: 200, height: 88 });
	expect(out.fallback).toEqual({ width: 250, height: 120 });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/graph-layout-regressions.spec.js --workers=1`
Expected: FAIL; the dynamic import of `/src/lib/graphLayout.js` returns a 404 / "Failed to fetch dynamically imported module".

- [ ] **Step 3: Create `src/lib/graphLayout.js`**

```js
import dagre from 'dagre';

export const START_NODE_ID = '00000000-0000-0000-0000-000000000001';
export const START_NODE_ANCHOR_POSITION = { x: 0, y: 0 };

export const DEFAULT_NODE_SIZE_BY_TYPE = {
	startNode: { width: 200, height: 88 },
	leadNode: { width: 250, height: 124 },
	answerNode: { width: 250, height: 124 },
	returnNode: { width: 250, height: 110 },
	openChildGraphNode: { width: 250, height: 110 },
	completeNode: { width: 250, height: 124 },
	delayNode: { width: 250, height: 100 },
	placeholderNode: { width: 160, height: 72 },
};

const parseSize = (value) => {
	if (typeof value === 'number') return value;
	if (typeof value === 'string') {
		const parsed = parseFloat(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
};

export const getNodeSize = (node) => {
	const measuredWidth = parseSize(node?.measured?.width);
	const measuredHeight = parseSize(node?.measured?.height);
	const nodeWidth = parseSize(node?.width);
	const nodeHeight = parseSize(node?.height);
	const styleWidth = parseSize(node?.style?.width);
	const styleHeight = parseSize(node?.style?.height);
	const fallback = DEFAULT_NODE_SIZE_BY_TYPE[node?.type] || { width: 250, height: 120 };

	return {
		width: measuredWidth || nodeWidth || styleWidth || fallback.width,
		height: measuredHeight || nodeHeight || styleHeight || fallback.height,
	};
};

// Auto-layout function using dagre
export const getLayoutedElements = (nodes, edges, direction = 'TB') => {
	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));

	dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

	nodes.forEach((node) => {
		const { width, height } = getNodeSize(node);
		dagreGraph.setNode(node.id, { width, height });
	});

	edges.forEach((edge) => {
		dagreGraph.setEdge(edge.source, edge.target);
	});

	dagre.layout(dagreGraph);

	const rawLayoutedNodes = nodes.map((node) => {
		const nodeWithPosition = dagreGraph.node(node.id);
		const { width, height } = getNodeSize(node);

		if (!nodeWithPosition) {
			return node;
		}

		return {
			...node,
			position: {
				x: nodeWithPosition.x - width / 2,
				y: nodeWithPosition.y - height / 2,
			},
		};
	});

	const layoutedStartNode = rawLayoutedNodes.find((node) => node.id === START_NODE_ID);
	const anchorDelta = layoutedStartNode
		? {
				x: START_NODE_ANCHOR_POSITION.x - layoutedStartNode.position.x,
				y: START_NODE_ANCHOR_POSITION.y - layoutedStartNode.position.y,
		}
		: { x: 0, y: 0 };

	const layoutedNodes = rawLayoutedNodes.map((node) => ({
		...node,
		position: {
			x: node.position.x + anchorDelta.x,
			y: node.position.y + anchorDelta.y,
		},
	}));

	return { nodes: layoutedNodes, edges };
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test tests/e2e/graph-layout-regressions.spec.js --workers=1`
Expected: 3 passed. (If the exact numbers in the first test are off by a rounding, the contract is: start at origin, `a` centred under start, `b`/`c` symmetric about `a` 300px apart; correct the pinned numbers from real output, do not loosen the structure.)

- [ ] **Step 5: Switch the route to the shared module**

In `src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx`:

1. Delete `import dagre from 'dagre';` (line 18).
2. Delete the local definitions of `DEFAULT_NODE_SIZE_BY_TYPE`, `START_NODE_ID`, `START_NODE_ANCHOR_POSITION`, `parseSize`, `getNodeSize` and `getLayoutedElements`.
3. Add, next to the other `@/lib` imports:

```js
import {
	START_NODE_ID,
	getNodeSize,
	getLayoutedElements,
} from '@/lib/graphLayout';
```

4. Verify nothing else used the removed names:

Run: `rg -n "DEFAULT_NODE_SIZE_BY_TYPE|START_NODE_ANCHOR_POSITION|parseSize|dagre" "src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx"`
Expected: no matches (if `parseSize`, `DEFAULT_NODE_SIZE_BY_TYPE` or `START_NODE_ANCHOR_POSITION` are still referenced, add them to the import and keep them exported).

- [ ] **Step 6: Lint and run editor regressions**

Run: `npm run lint && npx playwright test editor-regressions graph-layout-regressions --workers=1`
Expected: lint clean; all listed specs pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/graphLayout.js tests/e2e/graph-layout-regressions.spec.js "src/routes/projects/\$projectId/dialogue/\$dialogueId/index.jsx"
git commit -m "refactor: extract graph layout into src/lib/graphLayout"
```

---

### Task 2: Package scaffold and pure shared modules (`ease`, `scenario`)

**Files:**
- Create: `tools/video-capture/package.json`, `tools/video-capture/shared/ease.js`, `tools/video-capture/shared/scenario.js`
- Create: `tools/video-capture/test/ease.test.mjs`, `tools/video-capture/test/scenario.test.mjs`
- Modify: `.gitignore` (add `tools/video-capture/out/`)

**Interfaces:**
- Produces:
  - `ease(name: string, t: number): number` (clamps `t` to 0..1; throws on unknown name)
  - `clamp01(v: number): number`
  - `EASES: string[]`
  - `frameCount(beat: { duration: number }, fps: number): number` (≥ 1)
  - `validateScenario(scenario): scenario` (throws `Error('Invalid scenario:\n - …')` listing every problem)
  - `BEAT_KINDS: ['preview', 'graph', 'stills']`

- [ ] **Step 1: Create `tools/video-capture/package.json`**

```json
{
	"name": "mountea-video-capture",
	"private": true,
	"type": "module",
	"description": "Captures the real Mountea Dialoguer components as video layers for HyperFrames.",
	"scripts": {
		"test": "node --test test/",
		"capture": "node runner/cli.mjs",
		"build": "node compose/build.mjs",
		"preview": "npx --yes hyperframes@0.8.145 preview compose",
		"render": "npx --yes hyperframes@0.8.145 render compose"
	}
}
```

- [ ] **Step 2: Write the failing tests**

`tools/video-capture/test/ease.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ease, EASES, clamp01 } from '../shared/ease.js';

test('every ease maps 0 to 0 and 1 to 1', () => {
	for (const name of EASES) {
		assert.equal(ease(name, 0), 0, name);
		assert.ok(Math.abs(ease(name, 1) - 1) < 1e-12, name);
	}
});

test('inOut eases are symmetric at 0.5 and monotonic', () => {
	for (const name of ['power2.inOut', 'power3.inOut', 'sine.inOut']) {
		assert.ok(Math.abs(ease(name, 0.5) - 0.5) < 1e-12, name);
		let prev = -1;
		for (let i = 0; i <= 20; i++) {
			const v = ease(name, i / 20);
			assert.ok(v >= prev, `${name} not monotonic at ${i}`);
			prev = v;
		}
	}
});

test('input is clamped and unknown eases throw with the known list', () => {
	assert.equal(ease('linear', -3), 0);
	assert.equal(ease('linear', 9), 1);
	assert.equal(clamp01(2), 1);
	assert.throws(() => ease('bounce.out', 0.5), /Unknown ease "bounce.out"/);
});
```

`tools/video-capture/test/scenario.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateScenario, frameCount } from '../shared/scenario.js';

const base = () => ({
	id: 's', fps: 30, size: [1920, 1080], fixture: 'ExampleProject/x.mnteadlgproj',
	beats: [
		{ id: 'g1', kind: 'graph', theme: 'dark', duration: 1 },
		{ id: 'st', kind: 'stills', of: 'g1', from: 'dark', to: 'light' },
	],
});

test('a valid scenario passes through unchanged', () => {
	const s = base();
	assert.equal(validateScenario(s), s);
});

test('frameCount rounds and never returns less than 1', () => {
	assert.equal(frameCount({ duration: 1 }, 30), 30);
	assert.equal(frameCount({ duration: 0.8 }, 30), 24);
	assert.equal(frameCount({ duration: 0.01 }, 30), 1);
	assert.equal(frameCount({ duration: 1.016 }, 30), 30);
});

test('every problem is reported, naming the beat', () => {
	const s = base();
	s.fps = 0;
	s.beats[0].duration = 0;
	s.beats[0].ease = 'wobble';
	s.beats[1].of = 'missing';
	s.beats.push({ id: 'g1', kind: 'nope', duration: 1 });
	assert.throws(() => validateScenario(s), (error) => {
		for (const needle of ['fps', 'beats[0] (g1): duration', 'unknown ease "wobble"', '"of" must name an earlier graph beat', 'duplicate id', 'kind must be one of']) {
			assert.ok(error.message.includes(needle), `missing: ${needle}\n${error.message}`);
		}
		return true;
	});
});

test('negative duration and empty beats are rejected', () => {
	const s = base();
	s.beats = [];
	assert.throws(() => validateScenario(s), /non-empty array/);
	const t = base();
	t.beats[0].duration = -1;
	assert.throws(() => validateScenario(t), /duration must be > 0/);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd tools/video-capture && node --test test/`
Expected: FAIL (cannot find `../shared/ease.js`).

- [ ] **Step 4: Implement `shared/ease.js`**

```js
export const clamp01 = (value) => Math.min(1, Math.max(0, value));

const power = (n) => ({
	out: (t) => 1 - (1 - t) ** n,
	inOut: (t) => (t < 0.5 ? 0.5 * (2 * t) ** n : 1 - 0.5 * (2 * (1 - t)) ** n),
});

const TABLE = {
	none: (t) => t,
	linear: (t) => t,
	'power2.out': power(2).out,
	'power2.inOut': power(2).inOut,
	'power3.out': power(3).out,
	'power3.inOut': power(3).inOut,
	'sine.inOut': (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

export const EASES = Object.keys(TABLE);

export function ease(name, t) {
	const fn = TABLE[name];
	if (!fn) throw new Error(`Unknown ease "${name}". Known: ${EASES.join(', ')}`);
	return fn(clamp01(t));
}
```

- [ ] **Step 5: Implement `shared/scenario.js`**

```js
import { EASES } from './ease.js';

export const BEAT_KINDS = ['preview', 'graph', 'stills'];
const THEMES = ['dark', 'light'];

export function frameCount(beat, fps) {
	return Math.max(1, Math.round(beat.duration * fps));
}

export function validateScenario(scenario) {
	const problems = [];
	if (!scenario?.id) problems.push('scenario.id is required');
	if (!Number.isInteger(scenario?.fps) || scenario.fps < 1 || scenario.fps > 120) problems.push('scenario.fps must be an integer from 1 to 120');
	const size = scenario?.size;
	if (!Array.isArray(size) || size.length !== 2 || size.some((n) => !Number.isInteger(n) || n < 1)) problems.push('scenario.size must be [width, height] integers');
	if (!scenario?.fixture) problems.push('scenario.fixture is required');
	if (!Array.isArray(scenario?.beats) || scenario.beats.length === 0) problems.push('scenario.beats must be a non-empty array');

	const seen = new Set();
	(scenario?.beats || []).forEach((beat, index) => {
		const at = `beats[${index}] (${beat?.id ?? 'no id'})`;
		if (!beat?.id) problems.push(`${at}: id is required`);
		else if (seen.has(beat.id)) problems.push(`${at}: duplicate id`);
		else seen.add(beat.id);

		if (!BEAT_KINDS.includes(beat?.kind)) problems.push(`${at}: kind must be one of ${BEAT_KINDS.join(', ')}`);

		if (beat?.kind === 'stills') {
			const earlier = scenario.beats.slice(0, index);
			if (!beat.of || !earlier.some((b) => b.id === beat.of && b.kind === 'graph')) problems.push(`${at}: "of" must name an earlier graph beat`);
			if (!THEMES.includes(beat.from) || !THEMES.includes(beat.to)) problems.push(`${at}: stills needs from and to themes (${THEMES.join('/')})`);
		} else if (!(beat?.duration > 0)) {
			problems.push(`${at}: duration must be > 0`);
		}
		if (beat?.ease && !EASES.includes(beat.ease)) problems.push(`${at}: unknown ease "${beat.ease}"`);
		if (beat?.theme && !THEMES.includes(beat.theme)) problems.push(`${at}: theme must be ${THEMES.join('/')}`);
	});

	if (problems.length) throw new Error(`Invalid scenario:\n - ${problems.join('\n - ')}`);
	return scenario;
}
```

- [ ] **Step 6: Ignore output and run the tests**

Append to `.gitignore`:

```
# Video capture output
tools/video-capture/out/
```

Run: `cd tools/video-capture && node --test test/`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add .gitignore tools/video-capture/package.json tools/video-capture/shared tools/video-capture/test
git commit -m "feat(video-capture): package scaffold, easing and scenario validation"
```

---

### Task 3: Sandbox renders a real node; runner captures one transparent still on a fake clock

**Files:**
- Create: `tools/video-capture/vite.config.js`, `tailwind.config.js`, `index.html`
- Create: `tools/video-capture/sandbox/main.jsx`, `Stage.jsx`, `captureStore.js`, `driver.js`, `nodeTypes.js`, `capture.css`
- Copy: `brag-output/composition/assets/fonts/inter-latin-{400,600,700}-normal.woff2` → `tools/video-capture/sandbox/fonts/`
- Create: `tools/video-capture/runner/session.mjs`, `cli.mjs`, `scenarios/smoke.js`
- Create: `tools/video-capture/test/sandbox-smoke.test.mjs`

**Interfaces:**
- Consumes: Task 2 `validateScenario`.
- Produces:
  - `openSession({ size, scale = 1, port = 5199 }): Promise<{ page, baseUrl, close(): Promise<void> }>` (starts Vite, launches Chromium, installs `page.clock`, blocks non-local network)
  - `window.__capture` (browser): `setState(partial): void`, `isIdle(): boolean`, `missingKeys: string[]`, `rectOf(nodeId): {x,y,width,height}|null`
  - `captureStore`: `getState()`, `setState(partial)`, `subscribe(fn)`; state shape `{ language: string, theme: 'dark'|'light', scene: {nodes, edges, participants}|null, view: object|null, ready: boolean }`
  - `idle(page, { timeoutMs = 5000 })`: runner helper waiting until `__capture.isIdle()`.

- [ ] **Step 1: Write the failing smoke test**

`tools/video-capture/test/sandbox-smoke.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { openSession, idle } from '../runner/session.mjs';

test('sandbox renders a real StartNode to a transparent RGBA PNG', { timeout: 120000 }, async () => {
	const session = await openSession({ size: [640, 360], port: 5198 });
	try {
		await session.page.evaluate(() => window.__capture.setState({
			language: 'en', theme: 'dark',
			scene: {
				nodes: [{ id: 'n1', type: 'startNode', position: { x: 40, y: 40 }, data: { label: 'Dialogue entry point' }, width: 200, height: 88 }],
				edges: [], participants: [],
			},
			view: { x: 0, y: 0, zoom: 1 },
		}));
		await idle(session.page);
		const file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'cap-')), 'node.png');
		await session.page.screenshot({ path: file, omitBackground: true });
		const bytes = await fs.readFile(file);
		assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG');
		assert.equal(bytes[25], 6, 'PNG colour type must be 6 (RGBA)');
		assert.ok(bytes.length > 1500, 'PNG should contain the rendered node');
		assert.deepEqual(await session.page.evaluate(() => window.__capture.missingKeys), []);
	} finally {
		await session.close();
	}
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd tools/video-capture && node --test test/sandbox-smoke.test.mjs`
Expected: FAIL (`Cannot find module '../runner/session.mjs'`).

- [ ] **Step 3: Vite, Tailwind and HTML entry**

`tools/video-capture/vite.config.js`:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');

export default defineConfig({
	root: here,
	plugins: [react()],
	define: { __APP_RELEASE__: JSON.stringify({ version: 'video-capture', channel: 'sandbox' }) },
	resolve: { alias: { '@': path.resolve(repo, 'src'), '@repo': repo } },
	css: { postcss: { plugins: [tailwindcss({ config: path.resolve(here, 'tailwind.config.js') }), autoprefixer] } },
	server: { host: '127.0.0.1', fs: { allow: [repo] } },
	logLevel: 'warn',
});
```

`tools/video-capture/tailwind.config.js`:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import base from '../../tailwind.config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');

export default {
	...base,
	content: [
		path.join(repo, 'src/**/*.{js,jsx}'),
		path.join(here, 'sandbox/**/*.{js,jsx}'),
		path.join(here, 'index.html'),
	],
};
```

`tools/video-capture/index.html`:

```html
<!doctype html>
<html lang="en" class="dark">
	<head>
		<meta charset="UTF-8" />
		<title>video-capture sandbox</title>
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="/sandbox/main.jsx"></script>
	</body>
</html>
```

- [ ] **Step 4: Fonts and capture CSS**

Run: `mkdir -p tools/video-capture/sandbox/fonts && cp brag-output/composition/assets/fonts/inter-latin-*-normal.woff2 tools/video-capture/sandbox/fonts/`

`tools/video-capture/sandbox/capture.css`:

```css
@font-face { font-family: "Inter"; font-weight: 400; src: url("./fonts/inter-latin-400-normal.woff2") format("woff2"); }
@font-face { font-family: "Inter"; font-weight: 600; src: url("./fonts/inter-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "Inter"; font-weight: 700; src: url("./fonts/inter-latin-700-normal.woff2") format("woff2"); }

/* Layers are exported transparent; the video supplies background and grid. */
html, body, #root, .react-flow, .react-flow__renderer, .react-flow__pane { background: transparent !important; }
body.opaque, body.opaque #root { background: hsl(var(--background)) !important; }
.react-flow__attribution { display: none; }
```

- [ ] **Step 5: Store, driver, node types, Stage, main**

`tools/video-capture/sandbox/captureStore.js`:

```js
const listeners = new Set();
let state = { language: 'en', theme: 'dark', scene: null, view: null, ready: false };

export const getState = () => state;
export const subscribe = (listener) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};
export const setState = (partial) => {
	state = { ...state, ...partial };
	listeners.forEach((listener) => listener());
};
```

`tools/video-capture/sandbox/nodeTypes.js`:

```js
import StartNode from '@/components/dialogue/nodes/StartNode';
import LeadNode from '@/components/dialogue/nodes/LeadNode';
import AnswerNode from '@/components/dialogue/nodes/AnswerNode';
import ReturnNode from '@/components/dialogue/nodes/ReturnNode';
import OpenChildGraphNode from '@/components/dialogue/nodes/OpenChildGraphNode';
import CompleteNode from '@/components/dialogue/nodes/CompleteNode';
import PlaceholderNode from '@/components/dialogue/nodes/PlaceholderNode';
import DelayNode from '@/components/dialogue/nodes/DelayNode';
import ConditionEdge from '@/components/dialogue/edges/ConditionEdge';

// Same keys as the editor route, without the context-menu wrappers.
export const nodeTypes = {
	startNode: StartNode,
	leadNode: LeadNode,
	answerNode: AnswerNode,
	returnNode: ReturnNode,
	openChildGraphNode: OpenChildGraphNode,
	completeNode: CompleteNode,
	delayNode: DelayNode,
	placeholderNode: PlaceholderNode,
};
export const edgeTypes = { conditionEdge: ConditionEdge };
```

`tools/video-capture/sandbox/Stage.jsx`:

```jsx
import { useEffect, useSyncExternalStore } from 'react';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getState, subscribe } from './captureStore.js';
import { nodeTypes, edgeTypes } from './nodeTypes.js';

function Canvas({ scene, view }) {
	return (
		<ReactFlow
			nodes={scene.nodes}
			edges={scene.edges}
			nodeTypes={nodeTypes}
			edgeTypes={edgeTypes}
			viewport={view}
			onViewportChange={() => {}}
			nodesDraggable={false}
			nodesConnectable={false}
			elementsSelectable={false}
			panOnDrag={false}
			zoomOnScroll={false}
			zoomOnDoubleClick={false}
			minZoom={0.05}
			maxZoom={2}
			proOptions={{ hideAttribution: true }}
		/>
	);
}

export default function Stage() {
	const state = useSyncExternalStore(subscribe, getState);
	useEffect(() => {
		const root = document.documentElement;
		root.classList.remove('light', 'dark');
		root.classList.add(state.theme);
	}, [state.theme]);

	if (!state.scene || !state.view) return null;
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<ReactFlowProvider>
				<Canvas scene={state.scene} view={state.view} />
			</ReactFlowProvider>
		</div>
	);
}
```

`tools/video-capture/sandbox/driver.js`:

```js
import { flushSync } from 'react-dom';
import i18n from '@/i18n';
import { getState, setState as storeSetState } from './captureStore.js';

const missingKeys = [];
i18n.options.saveMissing = true;
i18n.on('missingKey', (_languages, _namespace, key) => {
	if (!missingKeys.includes(key)) missingKeys.push(key);
});

export function installDriver() {
	window.__capture = {
		missingKeys,
		setState(partial) {
			if (partial.language && partial.language !== i18n.language) {
				i18n.changeLanguage(partial.language);
			}
			flushSync(() => storeSetState(partial));
		},
		isIdle() {
			const { scene } = getState();
			if (!scene) return false;
			if (document.fonts.status !== 'loaded') return false;
			const renderedNodes = document.querySelectorAll('.react-flow__node').length;
			const renderedEdges = document.querySelectorAll('.react-flow__edge').length;
			return renderedNodes === scene.nodes.length && renderedEdges === scene.edges.length;
		},
		rectOf(nodeId) {
			const el = document.querySelector(`.react-flow__node[data-id="${CSS.escape(nodeId)}"]`);
			if (!el) return null;
			const { x, y, width, height } = el.getBoundingClientRect();
			return { x, y, width, height };
		},
	};
	window.__captureReady = true;
}
```

`tools/video-capture/sandbox/main.jsx`:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/i18n';
import '@/index.css';
import './capture.css';
import Stage from './Stage.jsx';
import { installDriver } from './driver.js';

installDriver();
ReactDOM.createRoot(document.getElementById('root')).render(<Stage />);
```

- [ ] **Step 6: Runner session**

`tools/video-capture/runner/session.mjs`:

```js
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

export async function openSession({ size = [1920, 1080], scale = 1, port = 5199 } = {}) {
	const server = await createServer({ configFile: path.join(root, 'vite.config.js'), server: { port, strictPort: true, host: '127.0.0.1' } });
	await server.listen();
	const baseUrl = `http://127.0.0.1:${port}`;
	const browser = await chromium.launch();
	const context = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: scale });
	// Hermetic: only the local Vite origin may be reached (fonts.googleapis.com etc. are blocked).
	await context.route('**/*', (route) => (route.request().url().startsWith(baseUrl) ? route.continue() : route.abort()));
	const page = await context.newPage();
	await page.clock.install({ time: 0 });
	page.on('pageerror', (error) => { throw error; });
	await page.goto(baseUrl);
	await page.waitForFunction(() => window.__captureReady === true);
	return {
		page, baseUrl,
		async close() { await browser.close(); await server.close(); },
	};
}

export async function idle(page, { timeoutMs = 5000 } = {}) {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		if (await page.evaluate(() => window.__capture.isIdle())) return;
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	throw new Error(`Sandbox did not become idle within ${timeoutMs} ms`);
}
```

- [ ] **Step 7: Run the smoke test**

Run: `cd tools/video-capture && node --test test/sandbox-smoke.test.mjs`
Expected: PASS. If Vite reports it cannot resolve `@/…` or Tailwind classes are missing from the screenshot, check the aliases in `vite.config.js` and the `content` globs in `tailwind.config.js` before continuing.

- [ ] **Step 8: Spike: confirm `page.clock` does not freeze Playwright's own polling**

Add to the same test file a second test:

```js
test('fake clock: page timers only advance when the runner advances the clock', { timeout: 120000 }, async () => {
	const session = await openSession({ size: [320, 180], port: 5197 });
	try {
		const { page } = session;
		await page.evaluate(() => { window.__ticks = 0; setInterval(() => { window.__ticks += 1; }, 100); });
		await new Promise((resolve) => setTimeout(resolve, 400));
		assert.equal(await page.evaluate(() => window.__ticks), 0, 'timers must not run on their own');
		await page.clock.runFor(1000);
		assert.equal(await page.evaluate(() => window.__ticks), 10);
		await page.waitForFunction(() => window.__ticks === 10);
	} finally {
		await session.close();
	}
});
```

Run: `cd tools/video-capture && node --test test/sandbox-smoke.test.mjs`
Expected: PASS. If `waitForFunction` hangs, replace its use everywhere with the Node-side polling loop already used by `idle()` (no code in this plan uses `waitForFunction` after this point except for `__captureReady` before the clock is paused; if that hangs too, install the clock after `goto` instead of before).

- [ ] **Step 9: Create `scenarios/smoke.js` and CLI shell**

`tools/video-capture/scenarios/smoke.js`:

```js
export default {
	id: 'smoke', fps: 30, size: [640, 360], language: 'en',
	fixture: 'ExampleProject/OnboardingExample.mnteadlgproj',
	beats: [{ id: 'one-frame', kind: 'graph', theme: 'dark', duration: 0.034 }],
};
```

`tools/video-capture/runner/cli.mjs`:

```js
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateScenario } from '../shared/scenario.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export function parseArgs(argv) {
	const args = { scenario: null, lang: null, beat: null, force: false, scale: 1 };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--scenario') args.scenario = argv[++i];
		else if (arg === '--lang') args.lang = argv[++i];
		else if (arg === '--beat') args.beat = argv[++i];
		else if (arg === '--scale') args.scale = Number(argv[++i]);
		else if (arg === '--force') args.force = true;
		else throw new Error(`Unknown argument "${arg}"`);
	}
	if (!args.scenario) throw new Error('Usage: node runner/cli.mjs --scenario <name> [--lang xx] [--beat id] [--scale n] [--force]');
	return args;
}

export async function loadScenario(name) {
	const mod = await import(pathToFileURL(path.join(here, '..', 'scenarios', `${name}.js`)).href);
	return validateScenario(mod.default);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const args = parseArgs(process.argv.slice(2));
	const scenario = await loadScenario(args.scenario);
	const { captureScenario } = await import('./capture.mjs');
	await captureScenario(scenario, args);
}
```

(`capture.mjs` is created in Task 4; the CLI is not run until then.)

- [ ] **Step 10: Commit**

```bash
git add tools/video-capture
git commit -m "feat(video-capture): sandbox renders real nodes; runner session with fake clock"
```

---

### Task 4: Graph state, frame stepping, manifest and the determinism test

**Files:**
- Create: `tools/video-capture/shared/graphState.js`, `tools/video-capture/shared/manifest.js`
- Create: `tools/video-capture/runner/digest.mjs`, `tools/video-capture/runner/capture.mjs`
- Create: `tools/video-capture/test/graphState.test.mjs`, `tools/video-capture/test/manifest.test.mjs`, `tools/video-capture/test/determinism.test.mjs`
- Modify: `tools/video-capture/sandbox/driver.js` (add `loadFixture`)
- Create: `tools/video-capture/scenarios/brag.js`

**Interfaces:**
- Consumes: `ease`, `clamp01` (Task 2); `getLayoutedElements`, `START_NODE_ID` (Task 1); `validateScenario`, `frameCount` (Task 2); `openSession`, `idle` (Task 3).
- Produces (`shared/graphState.js`):
  - `buildScene(snapshot, dialogueId): { nodes, edges, participants, depth: Record<string, number>, maxDepth: number }`
  - `resolveNodeId(scene, ref: string): string` (matches id, else unique case-insensitive `data.label`; throws listing labels)
  - `initialPositions(scene): Record<string, {x:number,y:number}>`
  - `endPositions(scene, beats, index): Record<string, {x,y}>`
  - `graphFrame(scene, beats, index, tSec): { positions: Record<string,{x,y}>, nodeOpacity: Record<string, number> }`
  - `sceneBounds(scene, beats): { x, y, width, height }`
- Produces (`shared/manifest.js`):
  - `MANIFEST_VERSION = 1`
  - `beatHash(scenario, index, sourceDigest): string` (sha1 hex)
  - `buildManifest(scenario, beatEntries, extra): object`
- Produces (`runner/capture.mjs`): `captureScenario(scenario, { lang, beat, force, scale }): Promise<void>`; writes `out/<scenario.id>/manifest.json` and `out/<scenario.id>/<beat.id>/frame-NNNN.png`.
- Produces (driver): `window.__capture.loadFixture(buffer: number[]): Promise<{ dialogueId, scene }>` (parses the archive with the app's `parseProjectArchive`).

- [ ] **Step 1: Write failing tests for `graphState`**

`tools/video-capture/test/graphState.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScene, resolveNodeId, initialPositions, endPositions, graphFrame, sceneBounds } from '../shared/graphState.js';

const START = '00000000-0000-0000-0000-000000000001';
const snapshot = {
	nodes: [
		{ id: START, dialogueId: 'd', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Start' }, measured: { width: 200, height: 88 } },
		{ id: 'a', dialogueId: 'd', type: 'leadNode', position: { x: 300, y: 300 }, data: { label: 'Greeting' }, measured: { width: 250, height: 124 } },
		{ id: 'b', dialogueId: 'd', type: 'answerNode', position: { x: 100, y: 700 }, data: { label: 'Sell Goods' }, measured: { width: 250, height: 124 } },
		{ id: 'c', dialogueId: 'd', type: 'answerNode', position: { x: 600, y: 700 }, data: { label: 'Leave' }, measured: { width: 250, height: 124 } },
		{ id: 'z', dialogueId: 'other', type: 'leadNode', position: { x: 0, y: 0 }, data: { label: 'Other graph' } },
	],
	edges: [
		{ id: 'e1', dialogueId: 'd', source: START, target: 'a' },
		{ id: 'e2', dialogueId: 'd', source: 'a', target: 'b' },
		{ id: 'e3', dialogueId: 'd', source: 'a', target: 'c' },
	],
	participants: [{ id: 'p', name: 'Waldermar' }],
};
const scene = () => buildScene(snapshot, 'd');

test('buildScene keeps only the dialogue and computes tier depth from the start node', () => {
	const s = scene();
	assert.equal(s.nodes.length, 4);
	assert.equal(s.edges.length, 3);
	assert.deepEqual(s.depth, { [START]: 0, a: 1, b: 2, c: 2 });
	assert.equal(s.maxDepth, 2);
	assert.equal(s.nodes[1].width, 250);
});

test('resolveNodeId matches ids and unique labels and explains failures', () => {
	const s = scene();
	assert.equal(resolveNodeId(s, 'b'), 'b');
	assert.equal(resolveNodeId(s, 'sell goods'), 'b');
	assert.throws(() => resolveNodeId(s, 'nope'), /No node "nope".*Greeting.*Sell Goods/s);
	const dup = buildScene({ ...snapshot, nodes: [...snapshot.nodes, { id: 'b2', dialogueId: 'd', type: 'answerNode', position: { x: 0, y: 0 }, data: { label: 'Sell Goods' } }] }, 'd');
	assert.throws(() => resolveNodeId(dup, 'Sell Goods'), /ambiguous/i);
});

test('move then auto layout: end positions fold across beats', () => {
	const s = scene();
	const beats = [
		{ id: 'm', kind: 'graph', duration: 1, move: { node: 'Sell Goods', to: [900, 120] } },
		{ id: 'l', kind: 'graph', duration: 1, layout: 'auto' },
	];
	assert.deepEqual(initialPositions(s).b, { x: 100, y: 700 });
	assert.deepEqual(endPositions(s, beats, 0).b, { x: 900, y: 120 });
	assert.deepEqual(endPositions(s, beats, 0).c, { x: 600, y: 700 });
	const laidOut = endPositions(s, beats, 1);
	assert.deepEqual(laidOut[START], { x: 0, y: 0 });
	assert.ok(laidOut.b.y > laidOut.a.y, 'children sit below their parent after auto layout');
});

test('graphFrame interpolates from start to end and is exact at both ends', () => {
	const s = scene();
	const beats = [{ id: 'm', kind: 'graph', duration: 2, ease: 'linear', move: { node: 'b', to: [900, 120] } }];
	assert.deepEqual(graphFrame(s, beats, 0, 0).positions.b, { x: 100, y: 700 });
	assert.deepEqual(graphFrame(s, beats, 0, 2).positions.b, { x: 900, y: 120 });
	const mid = graphFrame(s, beats, 0, 1).positions.b;
	assert.ok(Math.abs(mid.x - 500) < 1e-9 && Math.abs(mid.y - 410) < 1e-9);
});

test('tier-staggered auto layout moves shallow tiers before deep ones', () => {
	const s = scene();
	const beats = [{ id: 'l', kind: 'graph', duration: 1, ease: 'linear', layout: 'auto', stagger: 'tier' }];
	const end = endPositions(s, beats, 0);
	const early = graphFrame(s, beats, 0, 0.15).positions;
	const progress = (id) => {
		const from = initialPositions(s)[id];
		const to = end[id];
		const dx = to.x - from.x, dy = to.y - from.y;
		return Math.hypot(early[id].x - from.x, early[id].y - from.y) / (Math.hypot(dx, dy) || 1);
	};
	assert.ok(progress('a') > progress('b'), 'tier 1 leads tier 2');
});

test('reveal fades nodes in by tier and every node is fully visible without reveal', () => {
	const s = scene();
	const reveal = [{ id: 'r', kind: 'graph', duration: 3, reveal: 'tiers', tierStagger: 1, fade: 1 }];
	assert.equal(graphFrame(s, reveal, 0, 0).nodeOpacity[START], 0);
	assert.equal(graphFrame(s, reveal, 0, 1).nodeOpacity[START], 1);
	assert.equal(graphFrame(s, reveal, 0, 1).nodeOpacity.b, 0);
	assert.equal(graphFrame(s, reveal, 0, 3).nodeOpacity.b, 1);
	const plain = [{ id: 'p', kind: 'graph', duration: 1 }];
	assert.ok(Object.values(graphFrame(s, plain, 0, 0).nodeOpacity).every((v) => v === 1));
});

test('sceneBounds covers every position the graph will visit', () => {
	const s = scene();
	const beats = [{ id: 'm', kind: 'graph', duration: 1, move: { node: 'b', to: [2000, 900] } }];
	const bounds = sceneBounds(s, beats);
	assert.ok(bounds.x <= 0 && bounds.x + bounds.width >= 2000 + 250);
	assert.ok(bounds.y + bounds.height >= 900 + 124);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd tools/video-capture && node --test test/graphState.test.mjs`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `shared/graphState.js`**

```js
import { getLayoutedElements, START_NODE_ID, getNodeSize } from '../../../src/lib/graphLayout.js';
import { ease, clamp01 } from './ease.js';

const TIER_SPREAD = 0.3; // fraction of a staggered layout beat spent offsetting tiers

export function buildScene(snapshot, dialogueId) {
	const nodes = snapshot.nodes
		.filter((n) => n.dialogueId === dialogueId)
		.map((n) => ({
			id: n.id, type: n.type, data: n.data, position: { x: n.position.x, y: n.position.y },
			measured: n.measured, width: n.measured?.width, height: n.measured?.height,
		}));
	const ids = new Set(nodes.map((n) => n.id));
	const edges = snapshot.edges
		.filter((e) => e.dialogueId === dialogueId && ids.has(e.source) && ids.has(e.target))
		.map((e) => ({ id: e.id, source: e.source, target: e.target, type: e.type, data: e.data, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle }));

	const depth = {};
	const queue = [];
	if (ids.has(START_NODE_ID)) { depth[START_NODE_ID] = 0; queue.push(START_NODE_ID); }
	while (queue.length) {
		const current = queue.shift();
		for (const edge of edges) {
			if (edge.source === current && depth[edge.target] === undefined) {
				depth[edge.target] = depth[current] + 1;
				queue.push(edge.target);
			}
		}
	}
	const reached = Object.values(depth);
	const maxDepth = reached.length ? Math.max(...reached) : 0;
	for (const node of nodes) if (depth[node.id] === undefined) depth[node.id] = maxDepth;
	return { nodes, edges, participants: snapshot.participants || [], depth, maxDepth };
}

export function resolveNodeId(scene, ref) {
	if (scene.nodes.some((n) => n.id === ref)) return ref;
	const wanted = String(ref).trim().toLowerCase();
	const matches = scene.nodes.filter((n) => String(n.data?.label || '').trim().toLowerCase() === wanted);
	if (matches.length === 1) return matches[0].id;
	const labels = scene.nodes.map((n) => n.data?.label).filter(Boolean).join(', ');
	if (matches.length > 1) throw new Error(`Node reference "${ref}" is ambiguous (${matches.length} matches). Use an id.`);
	throw new Error(`No node "${ref}" in this graph. Labels: ${labels}`);
}

export function initialPositions(scene) {
	return Object.fromEntries(scene.nodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }]));
}

function autoPositions(scene) {
	const { nodes } = getLayoutedElements(scene.nodes, scene.edges, 'TB');
	return Object.fromEntries(nodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }]));
}

export function endPositions(scene, beats, index) {
	let positions = initialPositions(scene);
	for (let i = 0; i <= index; i++) {
		const beat = beats[i];
		if (beat.kind !== 'graph') continue;
		if (beat.move) positions = { ...positions, [resolveNodeId(scene, beat.move.node)]: { x: beat.move.to[0], y: beat.move.to[1] } };
		if (beat.layout === 'auto') positions = autoPositions(scene);
	}
	return positions;
}

export function graphFrame(scene, beats, index, tSec) {
	const beat = beats[index];
	const from = index > 0 ? endPositions(scene, beats, index - 1) : initialPositions(scene);
	const to = endPositions(scene, beats, index);
	const u = clamp01(tSec / beat.duration);
	const easeName = beat.ease || 'power3.inOut';
	const staggered = beat.layout === 'auto' && beat.stagger === 'tier' && scene.maxDepth > 0;

	const positions = {};
	for (const node of scene.nodes) {
		let local = u;
		if (staggered) {
			const delay = TIER_SPREAD * (scene.depth[node.id] / scene.maxDepth);
			local = clamp01((u - delay) / (1 - TIER_SPREAD));
		}
		const p = ease(easeName, local);
		const a = from[node.id], b = to[node.id];
		positions[node.id] = { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
	}

	const nodeOpacity = {};
	const tierStagger = beat.tierStagger ?? 0.35;
	const fade = beat.fade ?? 0.4;
	for (const node of scene.nodes) {
		nodeOpacity[node.id] = beat.reveal === 'tiers'
			? ease('power2.out', (tSec - scene.depth[node.id] * tierStagger) / fade)
			: 1;
	}
	return { positions, nodeOpacity };
}

export function sceneBounds(scene, beats) {
	const stages = [initialPositions(scene), ...beats.map((_, i) => endPositions(scene, beats, i))];
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (const stage of stages) {
		for (const node of scene.nodes) {
			const { width, height } = getNodeSize(node);
			const p = stage[node.id];
			minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
			maxX = Math.max(maxX, p.x + width); maxY = Math.max(maxY, p.y + height);
		}
	}
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
```

- [ ] **Step 4: Run to verify the graph state tests pass**

Run: `cd tools/video-capture && node --test test/graphState.test.mjs`
Expected: all pass. (This runs `src/lib/graphLayout.js` directly in Node; `dagre` resolves from the root `node_modules`.)

- [ ] **Step 5: Write failing manifest tests, then implement `shared/manifest.js`**

`tools/video-capture/test/manifest.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { beatHash, buildManifest, MANIFEST_VERSION } from '../shared/manifest.js';

const scenario = () => ({
	id: 's', fps: 30, size: [1920, 1080], language: 'en', fixture: 'f',
	beats: [
		{ id: 'a', kind: 'graph', theme: 'dark', duration: 1 },
		{ id: 'b', kind: 'graph', theme: 'dark', duration: 1, move: { node: 'x', to: [1, 2] } },
	],
});

test('beatHash is stable and changes with the beat, earlier beats, source digest and language', () => {
	const s = scenario();
	const base = beatHash(s, 1, 'src1');
	assert.equal(beatHash(s, 1, 'src1'), base);
	assert.notEqual(beatHash(s, 1, 'src2'), base);
	const moved = scenario(); moved.beats[1].move.to = [9, 9];
	assert.notEqual(beatHash(moved, 1, 'src1'), base);
	const earlier = scenario(); earlier.beats[0].duration = 2;
	assert.notEqual(beatHash(earlier, 1, 'src1'), base, 'positions carry over, so earlier beats matter');
	const cs = scenario(); cs.language = 'cs';
	assert.notEqual(beatHash(cs, 1, 'src1'), base);
});

test('buildManifest lists beats in order with start frames', () => {
	const s = scenario();
	const manifest = buildManifest(s, [
		{ id: 'a', kind: 'graph', theme: 'dark', frames: 30, hash: 'h1', dir: 'a', pattern: 'a/frame-%04d.png' },
		{ id: 'b', kind: 'graph', theme: 'dark', frames: 24, hash: 'h2', dir: 'b', pattern: 'b/frame-%04d.png' },
	], { scale: 1 });
	assert.equal(manifest.version, MANIFEST_VERSION);
	assert.deepEqual(manifest.beats.map((b) => [b.id, b.startFrame, b.frames, b.duration]), [['a', 0, 30, 1], ['b', 30, 24, 0.8]]);
	assert.equal(manifest.totalFrames, 54);
	assert.deepEqual(manifest.size, [1920, 1080]);
});
```

`tools/video-capture/shared/manifest.js`:

```js
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
```

Run: `cd tools/video-capture && node --test test/manifest.test.mjs`
Expected: pass.

- [ ] **Step 6: Driver `loadFixture` and `runner/digest.mjs`**

Append to `installDriver()` in `sandbox/driver.js` (inside the `window.__capture = { … }` object):

```js
		async loadFixture(bytes) {
			const { parseProjectArchive } = await import('@/lib/persistence/projectArchive.js');
			const { buildScene } = await import('../shared/graphState.js');
			const parsed = await parseProjectArchive(new Uint8Array(bytes));
			const { snapshot } = parsed;
			const dialogueId = parsed.dialogueId || snapshot.dialogues[0]?.id;
			if (!dialogueId) throw new Error('Fixture contains no dialogue');
			window.__fixture = { snapshot, dialogueId };
			return { dialogueId, scene: buildScene(snapshot, dialogueId), dialogues: snapshot.dialogues.map((d) => ({ id: d.id, name: d.name })) };
		},
```

`tools/video-capture/runner/digest.mjs`:

```js
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

async function* walk(dir) {
	for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(full);
		else yield full;
	}
}

/** One digest of every file that can change what a captured frame looks like. */
export async function sourceDigest(repoRoot) {
	const roots = [
		'src/components/dialogue', 'src/components/ui', 'src/lib/graphLayout.js', 'src/lib/dialoguePreviewEngine.js',
		'src/index.css', 'src/i18n', 'tailwind.config.js', 'tools/video-capture/sandbox', 'tools/video-capture/shared',
	];
	const hash = createHash('sha1');
	for (const rel of roots) {
		const abs = path.join(repoRoot, rel);
		const stat = await fs.stat(abs).catch(() => null);
		if (!stat) continue;
		const files = stat.isDirectory() ? [] : [abs];
		if (stat.isDirectory()) for await (const file of walk(abs)) files.push(file);
		files.sort();
		for (const file of files) { hash.update(path.relative(repoRoot, file)); hash.update(await fs.readFile(file)); }
	}
	return hash.digest('hex');
}
```

- [ ] **Step 7: The runner (`capture.mjs`) with frame stepping, stuck-frame check, atomic beats, caching**

`tools/video-capture/runner/capture.mjs`:

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openSession, idle } from './session.mjs';
import { sourceDigest } from './digest.mjs';
import { frameCount } from '../shared/scenario.js';
import { sceneBounds, graphFrame } from '../shared/graphState.js';
import { beatHash, buildManifest } from '../shared/manifest.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const toolRoot = path.resolve(here, '..');
export const repoRoot = path.resolve(toolRoot, '../..');

const padded = (n) => String(n + 1).padStart(4, '0');
const digestOf = (bytes) => crypto.createHash('sha1').update(bytes).digest('hex');

async function readFixture(scenario) {
	const file = path.resolve(repoRoot, scenario.fixture);
	try {
		return [...await fs.readFile(file)];
	} catch (error) {
		throw new Error(`Cannot read fixture "${scenario.fixture}" (${file}): ${error.message}`);
	}
}

async function loadScene(session, scenario) {
	const bytes = await readFixture(scenario);
	try {
		return await session.page.evaluate((b) => window.__capture.loadFixture(b), bytes);
	} catch (error) {
		throw new Error(`Fixture "${scenario.fixture}" could not be parsed: ${error.message}`);
	}
}

/** Viewport that frames every position the graph visits, computed once so layers align. */
async function viewportFor(session, scenario, scene) {
	const bounds = sceneBounds(scene, scenario.beats);
	return session.page.evaluate(async ({ bounds, size }) => {
		const { getViewportForBounds } = await import('@xyflow/react');
		return getViewportForBounds(bounds, size[0], size[1], 0.05, 2, 0.08);
	}, { bounds, size: scenario.size });
}

function reactNodes(scene, frame) {
	return scene.nodes.map((n) => ({
		...n,
		position: frame.positions[n.id],
		style: { opacity: frame.nodeOpacity[n.id] },
	}));
}

function reactEdges(scene, frame) {
	return scene.edges.map((e) => ({ ...e, style: { opacity: Math.min(frame.nodeOpacity[e.source], frame.nodeOpacity[e.target]) } }));
}

async function pushFrame(session, scenario, scene, view, beat, index, frame, theme) {
	await session.page.evaluate(({ scene, view, theme, language }) => {
		window.__capture.setState({ language, theme, scene, view });
	}, {
		scene: { nodes: reactNodes(scene, frame), edges: reactEdges(scene, frame), participants: scene.participants },
		view, theme, language: scenario.language || 'en',
	});
	await idle(session.page);
}

async function captureGraphBeat(session, scenario, scene, view, beat, index, tmpDir) {
	const frames = frameCount(beat, scenario.fps);
	const tracks = Object.fromEntries((beat.track || []).map((id) => [id, []]));
	let previous = null;
	for (let i = 0; i < frames; i++) {
		const t = i / scenario.fps;
		const frame = graphFrame(scene, scenario.beats, index, t);
		await pushFrame(session, scenario, scene, view, beat, index, frame, beat.theme || 'dark');
		await session.page.clock.runFor(1000 / scenario.fps);
		await idle(session.page);
		const file = path.join(tmpDir, `frame-${padded(i)}.png`);
		const bytes = await session.page.screenshot({ path: file, omitBackground: !beat.opaque });
		const digest = digestOf(bytes);
		const moving = scene.nodes.some((n) => {
			const a = graphFrame(scene, scenario.beats, index, Math.max(0, t - 1 / scenario.fps)).positions[n.id];
			return Math.abs(a.x - frame.positions[n.id].x) + Math.abs(a.y - frame.positions[n.id].y) > 0.5;
		});
		if (previous && moving && digest === previous) throw new Error(`Beat "${beat.id}": stuck frame at frame ${i + 1} (identical to the previous frame while nodes move)`);
		previous = digest;
		for (const id of Object.keys(tracks)) {
			const rect = await session.page.evaluate((nodeId) => window.__capture.rectOf(nodeId), id);
			tracks[id].push(rect && [rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height]);
		}
	}
	return { frames, tracks };
}

export async function captureScenario(scenario, { lang = null, beat: onlyBeat = null, force = false, scale = 1 } = {}) {
	const effective = { ...scenario, language: lang || scenario.language || 'en' };
	const outDir = path.join(toolRoot, 'out', effective.id);
	await fs.mkdir(outDir, { recursive: true });
	const digest = await sourceDigest(repoRoot);
	const previous = await fs.readFile(path.join(outDir, 'manifest.json'), 'utf8').then(JSON.parse).catch(() => null);

	const session = await openSession({ size: effective.size, scale });
	const entries = [];
	try {
		const { scene } = await loadScene(session, effective);
		const view = await viewportFor(session, effective, scene);
		for (let index = 0; index < effective.beats.length; index++) {
			const beat = effective.beats[index];
			const hash = beatHash(effective, index, digest);
			const cached = previous?.beats.find((b) => b.id === beat.id);
			const finalDir = path.join(outDir, beat.id);
			const skip = !force && cached?.hash === hash && await fs.stat(finalDir).then(() => true).catch(() => false);
			if (skip || (onlyBeat && onlyBeat !== beat.id)) {
				if (cached) entries.push(cached);
				continue;
			}
			if (beat.kind !== 'graph') throw new Error(`Beat kind "${beat.kind}" is not implemented yet (beat "${beat.id}")`);
			const tmpDir = path.join(outDir, `.tmp-${beat.id}-${process.pid}`);
			await fs.rm(tmpDir, { recursive: true, force: true });
			await fs.mkdir(tmpDir, { recursive: true });
			try {
				const { frames, tracks } = await captureGraphBeat(session, effective, scene, view, beat, index, tmpDir);
				await fs.rm(finalDir, { recursive: true, force: true });
				await fs.rename(tmpDir, finalDir);
				entries.push({ id: beat.id, kind: beat.kind, theme: beat.theme || 'dark', frames, hash, dir: beat.id, pattern: `${beat.id}/frame-%04d.png`, tracks });
			} catch (error) {
				await fs.rm(tmpDir, { recursive: true, force: true });
				throw error;
			}
		}
		const missing = await session.page.evaluate(() => window.__capture.missingKeys);
		if (missing.length) throw new Error(`Missing translation keys for "${effective.language}": ${missing.join(', ')}`);
	} finally {
		await session.close();
	}
	const manifest = buildManifest(effective, entries, { scale });
	await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
	return manifest;
}
```

- [ ] **Step 8: Write the determinism and failure tests**

`tools/video-capture/test/determinism.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { captureScenario, toolRoot } from '../runner/capture.mjs';

const scenario = (id, fixture = 'ExampleProject/OnboardingExample.mnteadlgproj') => ({
	id, fps: 10, size: [640, 360], language: 'en', fixture,
	beats: [{ id: 'move', kind: 'graph', theme: 'dark', duration: 0.5, ease: 'power3.inOut', move: { node: 'Start Node', to: [200, 120] }, track: ['00000000-0000-0000-0000-000000000001'] }],
});

const hashDir = async (dir) => {
	const hash = crypto.createHash('sha1');
	for (const name of (await fs.readdir(dir)).sort()) hash.update(await fs.readFile(path.join(dir, name)));
	return hash.digest('hex');
};

test('capturing the same beat twice yields byte-identical frames', { timeout: 240000 }, async () => {
	const a = await captureScenario(scenario('det-a'), { force: true });
	const b = await captureScenario(scenario('det-b'), { force: true });
	assert.equal(a.beats[0].frames, 5);
	assert.equal(await hashDir(path.join(toolRoot, 'out/det-a/move')), await hashDir(path.join(toolRoot, 'out/det-b/move')));
	assert.equal(a.beats[0].tracks['00000000-0000-0000-0000-000000000001'].length, 5);
});

test('a missing fixture fails with its path and leaves no partial beat directory', { timeout: 120000 }, async () => {
	await assert.rejects(() => captureScenario(scenario('det-missing', 'ExampleProject/does-not-exist.mnteadlgproj'), { force: true }), /Cannot read fixture "ExampleProject\/does-not-exist\.mnteadlgproj"/);
	const entries = await fs.readdir(path.join(toolRoot, 'out/det-missing')).catch(() => []);
	assert.deepEqual(entries.filter((name) => !name.endsWith('.json')), []);
});

test('an unknown node reference names the available labels', { timeout: 120000 }, async () => {
	const s = scenario('det-bad-node');
	s.beats[0].move.node = 'Nonexistent Node';
	await assert.rejects(() => captureScenario(s, { force: true }), /No node "Nonexistent Node".*Labels:/s);
});
```

- [ ] **Step 9: Run and iterate until they pass**

Run: `cd tools/video-capture && node --test test/determinism.test.mjs`
Expected: PASS. Typical fixes if it does not:
- Frames differ between runs → something time-dependent is rendering (a CSS animation, `Date.now()`); find it by diffing `det-a/move/frame-0001.png` against `det-b/…`, then disable that animation in `sandbox/capture.css` (`*, *::before, *::after { animation: none !important; transition: none !important; }`).
- "stuck frame" error → the clock or `setState` did not take effect; confirm `flushSync` in the driver and that `pushFrame` runs before `runFor`.
- Fixture parse error → run `node -e "..."` is not possible (archive code uses browser APIs); read the thrown message from the page, and make sure `loadFixture` imports `@/lib/persistence/projectArchive.js` with the `@` alias resolved by Vite.

- [ ] **Step 10: Add the brag scenario skeleton for the graph beats and commit**

`tools/video-capture/scenarios/brag.js`:

```js
export default {
	id: 'brag', fps: 30, size: [1920, 1080], language: 'en',
	fixture: 'ExampleProject/OnboardingExample.mnteadlgproj',
	beats: [
		{ id: 'graph-reveal', kind: 'graph', theme: 'dark', reveal: 'tiers', tierStagger: 0.35, fade: 0.4, duration: 3.0 },
		{ id: 'drag', kind: 'graph', theme: 'light', move: { node: 'Sell Goods', to: [1400, 370] }, ease: 'power3.inOut', duration: 0.8, track: ['Sell Goods'] },
		{ id: 'auto-layout', kind: 'graph', theme: 'light', layout: 'auto', stagger: 'tier', ease: 'power3.inOut', duration: 1.3 },
	],
};
```

(Beat `track` entries here are labels; Step 11 resolves them to ids.)

- [ ] **Step 11: Resolve labels in `track` and verify the brag graph beats**

In `captureGraphBeat`, resolve tracked labels before the frame loop. Replace the `tracks` initialiser with:

```js
	const { resolveNodeId } = await import('../shared/graphState.js');
	const trackIds = (beat.track || []).map((ref) => resolveNodeId(scene, ref));
	const tracks = Object.fromEntries(trackIds.map((id) => [id, []]));
```

Run: `cd tools/video-capture && node runner/cli.mjs --scenario brag`
Expected: writes `out/brag/{graph-reveal,drag,auto-layout}/frame-*.png` and `out/brag/manifest.json`. Open one frame from each beat and confirm the real node components (coloured headers, handles, edges) are visible on a transparent background.

- [ ] **Step 12: Commit**

```bash
git add tools/video-capture
git commit -m "feat(video-capture): graph beats, frame stepper, manifest, determinism test"
```

---

### Task 5: Preview beat (real `DialoguePreviewOverlay` on the fake clock)

**Files:**
- Modify: `tools/video-capture/sandbox/Stage.jsx`, `tools/video-capture/sandbox/driver.js`, `tools/video-capture/runner/capture.mjs`, `tools/video-capture/shared/scenario.js`
- Create: `tools/video-capture/test/preview-beat.test.mjs`

**Interfaces:**
- Consumes: `captureScenario`, `loadFixture` (Task 4); `DialoguePreviewOverlay` props `{ open, nodes, edges, participants, rootDialogueId, loadDialogueGraphForPreview, onStop, onNodeFocus, onNodeChange }`.
- Produces: beat kind `preview` with fields `{ id, kind: 'preview', theme, duration, opaque?: true, actions?: [{ at: number, click: string }] }` where `click` is a case-insensitive button name; manifest entries for `preview` beats have `frames`, `pattern`, no `tracks`.
- Produces (driver): `window.__capture.setState({ preview: true })` shows the overlay above the graph; `window.__capture.previewText()` returns the current visible line text.

- [ ] **Step 1: Confirm the shape the overlay expects from `loadDialogueGraphForPreview`**

Run: `rg -n "loadDialogueGraphForPreview" src/stores/dialogueStore.js -A 30 | head -60`
Expected: shows the function and what it returns (nodes/edges and possibly metadata). Mirror exactly that shape in Step 3. Record the return keys in a comment above the sandbox implementation.

- [ ] **Step 2: Write the failing test**

`tools/video-capture/test/preview-beat.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { captureScenario, toolRoot } from '../runner/capture.mjs';

test('preview beat types the NPC line on the fake clock, then shows answers', { timeout: 240000 }, async () => {
	const manifest = await captureScenario({
		id: 'prev', fps: 10, size: [960, 540], language: 'en',
		fixture: 'ExampleProject/OnboardingExample.mnteadlgproj',
		beats: [{ id: 'preview', kind: 'preview', theme: 'dark', duration: 3, opaque: true }],
	}, { force: true });
	assert.equal(manifest.beats[0].frames, 30);
	assert.deepEqual(manifest.beats[0].text.slice(0, 1), ['']);
	const lengths = manifest.beats[0].text.map((s) => s.length);
	assert.ok(lengths[lengths.length - 1] > 0, 'some dialogue text must be visible by the end');
	assert.ok(lengths.every((n, i) => i === 0 || n >= lengths[i - 1] || n === 0), 'text only grows within a line');
	const files = await fs.readdir(path.join(toolRoot, 'out/prev/preview'));
	assert.equal(files.length, 30);
});
```

- [ ] **Step 3: Implement the overlay in the Stage and driver**

In `sandbox/Stage.jsx`, import and render the overlay when `state.preview` is true (above the canvas):

```jsx
import { DialoguePreviewOverlay } from '@/components/dialogue/DialoguePreviewOverlay';
// ...inside the returned <div>, after <ReactFlowProvider>…</ReactFlowProvider>:
{state.preview && (
	<DialoguePreviewOverlay
		open
		nodes={state.scene.nodes}
		edges={state.scene.edges}
		participants={state.scene.participants}
		rootDialogueId={state.dialogueId || ''}
		loadDialogueGraphForPreview={async (id) => window.__capture.graphForPreview(id)}
		onStop={() => {}}
		onNodeFocus={() => {}}
		onNodeChange={() => {}}
	/>
)}
```

In `sandbox/driver.js` add to the `window.__capture` object:

```js
		// Mirror the return shape recorded in Step 1.
		async graphForPreview(dialogueId) {
			const { snapshot } = window.__fixture;
			const { buildScene } = await import('../shared/graphState.js');
			const scene = buildScene(snapshot, dialogueId);
			return { nodes: scene.nodes, edges: scene.edges };
		},
		previewText() {
			const el = document.querySelector('[data-capture-line], .line-text');
			return el ? el.textContent : '';
		},
```

Then add a stable hook to the real component: in `src/components/dialogue/DialoguePreviewOverlay.jsx`, add `data-testid="preview-line"` to the element that renders `lineText` (find it with `rg -n "lineText" src/components/dialogue/DialoguePreviewOverlay.jsx`), and change `previewText()` to query `[data-testid="preview-line"]`. This is the only edit to a real component, and it adds an attribute without changing rendering.

Set `dialogueId` into the store state in `loadFixture` by returning it (already returned) and having the runner pass it with `setState({ dialogueId })`.

- [ ] **Step 4: Runner support for `preview` beats**

In `captureScenario`, replace the "not implemented" guard with a dispatch:

```js
			const capture = beat.kind === 'preview' ? capturePreviewBeat : captureGraphBeat;
			const { frames, tracks, text } = await capture(session, effective, scene, view, beat, index, tmpDir, dialogueId);
```

(destructure `dialogueId` from `loadScene`'s result: `const { scene, dialogueId } = await loadScene(...)`), include `text` in the manifest entry (`text` is undefined for graph beats), and add:

```js
async function capturePreviewBeat(session, scenario, scene, view, beat, index, tmpDir, dialogueId) {
	const frames = frameCount(beat, scenario.fps);
	// Show the graph as the previous graph beat left it (initial layout if there is none).
	const gi = lastGraphIndex(scenario, index);
	const positions = scenario.beats[gi]?.kind === 'graph' && gi < index ? endPositions(scene, scenario.beats, gi) : initialPositions(scene);
	const frame = { positions, nodeOpacity: Object.fromEntries(scene.nodes.map((n) => [n.id, 1])) };
	await session.page.evaluate((opaque) => document.body.classList.toggle('opaque', Boolean(opaque)), beat.opaque);
	await session.page.evaluate(({ scene, view, theme, language, dialogueId }) => {
		window.__capture.setState({ language, theme, scene, view, dialogueId, preview: true });
	}, { scene: { nodes: reactNodes(scene, frame), edges: reactEdges(scene, frame), participants: scene.participants }, view, theme: beat.theme || 'dark', language: scenario.language || 'en', dialogueId });
	const actions = [...(beat.actions || [])].sort((a, b) => a.at - b.at);
	const text = [];
	for (let i = 0; i < frames; i++) {
		const t = i / scenario.fps;
		while (actions.length && actions[0].at <= t) {
			const { click } = actions.shift();
			await session.page.getByRole('button', { name: new RegExp(click, 'i') }).first().click();
		}
		await session.page.clock.runFor(1000 / scenario.fps);
		await session.page.screenshot({ path: path.join(tmpDir, `frame-${padded(i)}.png`), omitBackground: !beat.opaque });
		text.push(await session.page.evaluate(() => window.__capture.previewText()));
	}
	await session.page.evaluate(() => window.__capture.setState({ preview: false }));
	return { frames, text };
}

function lastGraphIndex(scenario, before) {
	for (let i = before - 1; i >= 0; i--) if (scenario.beats[i].kind === 'graph') return i;
	return 0;
}
```

Import `endPositions` and `initialPositions` from `../shared/graphState.js` at the top of `capture.mjs`.

- [ ] **Step 5: Run the test**

Run: `cd tools/video-capture && node --test test/preview-beat.test.mjs`
Expected: PASS. If the overlay waits on a real timer that never fires, print `previewText()` per frame; the overlay's timers (`NODE_TRANSITION_DELAY_MS`, `ROW_COMPLETION_HOLD_MS`) are driven by `page.clock.runFor`, so the text should start empty and grow. If it stays empty, the overlay needs `open` to flip from false to true after mount: render it with `open={state.preview}` and set `preview: true` after the scene is set (already the case).

- [ ] **Step 6: Commit**

```bash
git add tools/video-capture src/components/dialogue/DialoguePreviewOverlay.jsx
git commit -m "feat(video-capture): preview beat driven by the fake clock"
```

---

### Task 6: Theme stills (`stills` beat kind)

**Files:**
- Modify: `tools/video-capture/runner/capture.mjs`
- Create: `tools/video-capture/test/stills-beat.test.mjs`

**Interfaces:**
- Consumes: `graphFrame`, `endPositions` (Task 4); `idle` (Task 3).
- Produces: beat kind `stills` with `{ id, kind: 'stills', of: <graph beat id>, from: theme, to: theme }`; writes `out/<scenario>/<beat.id>/<theme>.png` for the two themes (identical layout and viewport) and a manifest entry `{ id, kind: 'stills', stills: { dark: 'id/dark.png', light: 'id/light.png' } }` with `frames: 1`.

- [ ] **Step 1: Write the failing test**

`tools/video-capture/test/stills-beat.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { captureScenario, toolRoot } from '../runner/capture.mjs';

test('theme stills share identical geometry but differ in colour', { timeout: 240000 }, async () => {
	const manifest = await captureScenario({
		id: 'stills', fps: 10, size: [960, 540], language: 'en',
		fixture: 'ExampleProject/OnboardingExample.mnteadlgproj',
		beats: [
			{ id: 'g', kind: 'graph', theme: 'dark', duration: 0.2 },
			{ id: 'theme', kind: 'stills', of: 'g', from: 'dark', to: 'light' },
		],
	}, { force: true });
	const entry = manifest.beats.find((b) => b.id === 'theme');
	assert.deepEqual(Object.keys(entry.stills).sort(), ['dark', 'light']);
	const dir = path.join(toolRoot, 'out/stills/theme');
	const [dark, light] = await Promise.all([fs.readFile(path.join(dir, 'dark.png')), fs.readFile(path.join(dir, 'light.png'))]);
	assert.notDeepEqual(dark, light);
	const size = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
	assert.deepEqual(size(dark), size(light));
	assert.deepEqual(size(dark), [960, 540]);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd tools/video-capture && node --test test/stills-beat.test.mjs`
Expected: FAIL (`Beat kind "stills" is not implemented`).

- [ ] **Step 3: Implement the stills beat**

Add to `capture.mjs`:

```js
async function captureStillsBeat(session, scenario, scene, view, beat, index, tmpDir) {
	const sourceIndex = scenario.beats.findIndex((b) => b.id === beat.of);
	const positions = endPositions(scene, scenario.beats, sourceIndex);
	const frame = { positions, nodeOpacity: Object.fromEntries(scene.nodes.map((n) => [n.id, 1])) };
	const stills = {};
	for (const theme of [beat.from, beat.to]) {
		await pushFrame(session, scenario, scene, view, beat, index, frame, theme);
		await session.page.clock.runFor(1000 / scenario.fps);
		await idle(session.page);
		await session.page.screenshot({ path: path.join(tmpDir, `${theme}.png`), omitBackground: !beat.opaque });
		stills[theme] = `${beat.id}/${theme}.png`;
	}
	return { frames: 1, stills };
}
```

Wire it into the dispatch: `const capture = { graph: captureGraphBeat, preview: capturePreviewBeat, stills: captureStillsBeat }[beat.kind];` and include `stills` in the manifest entry (`...(stills ? { stills } : {})`). Import `endPositions` from `../shared/graphState.js`.

- [ ] **Step 4: Run to verify it passes, then commit**

Run: `cd tools/video-capture && node --test test/stills-beat.test.mjs`
Expected: PASS.

```bash
git add tools/video-capture
git commit -m "feat(video-capture): dark/light theme stills with identical geometry"
```

---

### Task 7: Brag scenario end to end and the HyperFrames generator

**Files:**
- Modify: `tools/video-capture/scenarios/brag.js`
- Create: `tools/video-capture/compose/build.mjs`, `compose/template.html`, `compose/video-design.json`, `compose/hyperframes.json`
- Create: `tools/video-capture/test/compose.test.mjs`
- Move: `brag-output/composition/assets/{fonts,music,sfx,img}` and `relentless-iros-young-main-version-47984-01-42.mp3` → `tools/video-capture/compose/assets/` (copy, do not delete the originals)

**Interfaces:**
- Consumes: `out/<scenario>/manifest.json` (Task 4-6), `compose/video-design.json`.
- Produces:
  - `buildComposition({ manifest, design }): string` (pure; returns the full `index.html`).
  - `compose/build.mjs` CLI: reads `out/brag/manifest.json`, encodes each frame-sequence beat to a transparent VP9 WebM with ffmpeg into `compose/assets/beats/<id>.webm`, copies stills to `compose/assets/beats/`, writes `compose/index.html`.
  - `video-design.json` shape: `{ background, music: {src, volume, fadeIn, fadeOut}, captions: [{text, at, until}], themeToggle: {x, y, w, h}, cursor: [{at, to:[x,y], duration, press?: bool}], sfx: [{src, at, duration, volume}], endCard: {at, duration, title, tagline, logo} }` where cursor targets may be `{ track: "<node label or id>", offset:[dx,dy] }` or `{ ui: "autoLayout" }`.

- [ ] **Step 1: Spike: transparent WebM from a PNG sequence plays in a HyperFrames `<video>`**

Run, using the beat captured in Task 4:

```bash
ffmpeg -y -framerate 30 -i tools/video-capture/out/brag/drag/frame-%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 24 tools/video-capture/out/brag/drag.webm
```

Create a throwaway project (`npx hyperframes init spike --non-interactive` in the scratchpad directory), place `drag.webm` as `<video class="clip" data-start="0" data-duration="0.8" data-track-index="1" muted playsinline src="drag.webm">` over a coloured background, run `npx hyperframes snapshot --at 0.4` and read the PNG.
Expected: the node UI is visible over the coloured background (alpha preserved). Record the result in the README (Task 8). **If alpha is lost or the clip does not seek**, use the fallback: one `<img>` per beat whose `src` is updated from a GSAP `onUpdate` using `Math.round(frameIndex)` and a `Image()` preload loop before registering the timeline; implement that variant in `buildComposition` instead (the `mode: "webm" | "images"` switch below selects it).

- [ ] **Step 2: Write the failing generator test**

`tools/video-capture/test/compose.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildComposition } from '../compose/build.mjs';

const manifest = {
	version: 1, scenario: 's', fps: 30, size: [1920, 1080], totalFrames: 54, language: 'en',
	beats: [
		{ id: 'graph-reveal', kind: 'graph', theme: 'dark', frames: 30, startFrame: 0, duration: 1, pattern: 'graph-reveal/frame-%04d.png', tracks: {} },
		{ id: 'theme', kind: 'stills', theme: 'dark', frames: 1, startFrame: 30, duration: 1 / 30, stills: { dark: 'theme/dark.png', light: 'theme/light.png' } },
		{ id: 'drag', kind: 'graph', theme: 'light', frames: 24, startFrame: 31, duration: 0.8, pattern: 'drag/frame-%04d.png', tracks: { sell: [[100, 200, 250, 124], [110, 190, 250, 124]] } },
	],
};
const design = {
	background: { dark: '#0d0d0d', light: '#f5f4f0' },
	music: { src: 'assets/music/bed.mp3', volume: 0.3, fadeIn: 0.6, fadeOut: 1 },
	captions: [{ text: 'Branch. Loop. Return. Done.', at: 0.2, until: 0.9 }],
	themeToggle: { x: 1802, y: 84, w: 132, h: 64 },
	cursor: [{ at: 0.1, to: { track: 'drag:sell', offset: [-40, -18] }, duration: 0.3 }],
	sfx: [{ src: 'assets/sfx/click_002.ogg', at: 1.0, duration: 0.2, volume: 0.12 }],
	endCard: { at: 1.5, duration: 1, title: 'Mountea Dialoguer', tagline: 'Dialogue manager made easy.', logo: 'assets/img/logo.png' },
};

test('buildComposition emits a standalone HyperFrames root sized to the manifest', () => {
	const html = buildComposition({ manifest, design, mode: 'webm' });
	assert.match(html, /data-composition-id="brag"/);
	assert.match(html, /data-width="1920"/);
	assert.match(html, /data-height="1080"/);
	assert.match(html, /window\.__timelines\["brag"\]/);
	assert.doesNotMatch(html, /<template/);
});

test('every beat becomes a timed clip at its start frame; stills become two stacked images', () => {
	const html = buildComposition({ manifest, design, mode: 'webm' });
	assert.match(html, /id="beat-graph-reveal"[^>]*data-start="0"[^>]*data-duration="1"/);
	assert.match(html, /id="beat-drag"[^>]*data-start="1.0333/);
	assert.match(html, /id="still-theme-dark"/);
	assert.match(html, /id="still-theme-light"/);
});

test('the root duration covers the end card and music fades are carried over', () => {
	const html = buildComposition({ manifest, design, mode: 'webm' });
	assert.match(html, /data-composition-id="brag"[^>]*data-duration="2.5"/);
	assert.match(html, /data-fade-in="0.6"/);
	assert.match(html, /data-fade-out="1"/);
});

test('cursor waypoints resolve manifest tracks to screen coordinates', () => {
	// Rule: x = track centre x + offset[0], y = track centre y + offset[1], using the first sample of the beat.
	// Track "drag:sell" starts at [100, 200]; offset [-40, -18] gives (60, 182).
	const html = buildComposition({ manifest, design, mode: 'webm' });
	assert.match(html, /x: 60/);
	assert.match(html, /y: 182/);
});

test('an unknown cursor track fails with the available tracks', () => {
	const bad = { ...design, cursor: [{ at: 0, to: { track: 'drag:ghost' }, duration: 0.2 }] };
	assert.throws(() => buildComposition({ manifest, design: bad, mode: 'webm' }), /Unknown track "drag:ghost".*drag:sell/s);
});
```

- [ ] **Step 3: Run to verify failure**

Run: `cd tools/video-capture && node --test test/compose.test.mjs`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `compose/build.mjs` (pure builder plus CLI)**

Implement `buildComposition({ manifest, design, mode })` so that it:

1. Emits `<div id="root" data-composition-id="brag" data-start="0" data-duration="{total}" data-width="{w}" data-height="{h}">` with `total = max(manifest.totalFrames / fps, design.endCard.at + design.endCard.duration)`.
2. For each beat: `graph`/`preview` → `<video id="beat-{id}" class="clip" data-start="{startFrame/fps}" data-duration="{duration}" data-track-index="{n}" muted playsinline src="assets/beats/{id}.webm">` (mode `webm`) or the `<img>` fallback (mode `images`); `stills` → two stacked `<img id="still-{id}-{theme}" class="clip">` inside one `.clip` wrapper timed to the beat, plus a GSAP clip-path circle reveal from `design.themeToggle` centre at the beat's start (`clipPath: "circle(0px at Xpx Ypx)"` → `circle(2400px at Xpx Ypx)` over 1s, `power2.inOut`) on the light still.
3. Background: a full-bleed `div` whose colour tweens from `design.background.dark` to `.light` at the stills beat time.
4. Captions: one `<div class="caption">` per entry, fade in at `at`, out at `until`.
5. Cursor: one `.cursor` element with waypoints; for `to: { track: "<beatId>:<ref>", offset }` look up `manifest.beats[beatId].tracks[ref]` (key is the resolved node id; also accept the label used in the scenario by storing `trackLabels` in the manifest entry in Task 4 Step 11) and use the sample at the frame matching the waypoint time, `x = cx + offset[0]`, `y = cy + offset[1]`; for `to: { ui: "autoLayout" }` use `design.ui.autoLayout`. Unknown track → `Error('Unknown track "<ref>". Available: <list>')`.
6. SFX: one `<audio id="sfx-{i}" data-start data-duration data-volume src>` per entry; music: `<audio id="music" … data-fade-in data-fade-out>`.
7. End card: logo, title, tagline timed from `design.endCard`.
8. A single `gsap.timeline({ paused: true })` registered at `window.__timelines["brag"]`; no `<template>` wrapper.

Add `trackLabels` (`{ [resolvedId]: label }`) to graph beat manifest entries in `captureGraphBeat` so the generator can resolve `"drag:sell"` by label; extend the Task 4 determinism test with one assertion on `trackLabels`.

The CLI part (`if (import.meta.url === …)`) loads `out/<scenario>/manifest.json` and `video-design.json`, runs ffmpeg once per frame-sequence beat:

```js
execFileSync('ffmpeg', ['-y', '-framerate', String(manifest.fps), '-i', path.join(out, beat.dir, 'frame-%04d.png'), '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-b:v', '0', '-crf', '24', path.join(composeDir, 'assets/beats', `${beat.id}.webm`)]);
```

copies stills to `compose/assets/beats/`, and writes `compose/index.html`.

- [ ] **Step 5: Author `video-design.json` for the brag video**

Create `tools/video-capture/compose/video-design.json` mirroring the existing hand-built video: dark `#0d0d0d` / light `#f5f4f0` background with the 40px dot grid, captions `That was one branch.` / `Branch. Loop. Return. Done.`, the theme toggle at `{ "x": 1802, "y": 84, "w": 132, "h": 64 }` (drawn by the composition; it is not part of the captured canvas), cursor waypoints (toggle → `drag:Sell Goods` grab → drop → `{ ui: autoLayout }`), SFX cues taken from the current `brag-output/composition/index.html` timeline, music `assets/music/bed.mp3`, and the end card (`Mountea Dialoguer`, `Dialogue manager made easy.`, `assets/img/logo.png`, logo `data-duration` equal to the end card duration so it does not expire before the card ends).

Set the brag scenario beat durations to match the cues, and add the `stills` beat between `graph-reveal` and `drag`:

```js
{ id: 'theme-switch', kind: 'stills', of: 'graph-reveal', from: 'dark', to: 'light' },
```

- [ ] **Step 6: Run the tests, build the real composition and check it**

Run:

```bash
cd tools/video-capture
node --test test/compose.test.mjs
node runner/cli.mjs --scenario brag
node compose/build.mjs
cd compose && npx hyperframes check && npx hyperframes snapshot --at 1,4,6,9
```

Expected: tests pass; `check` reports 0 errors; snapshots show the real node UI over the background, the circular light reveal mid-transition at the stills beat, and the end card with the logo above the title.

- [ ] **Step 7: Commit**

```bash
git add tools/video-capture
git commit -m "feat(video-capture): HyperFrames generator and brag scenario"
```

---

### Task 8: Language flag, translation-key check, goldens, README and wiring

**Files:**
- Modify: `tools/video-capture/runner/cli.mjs` (already parses `--lang`; add `--update-goldens`), `tools/video-capture/runner/capture.mjs`
- Create: `tools/video-capture/test/lang.test.mjs`, `tools/video-capture/goldens/` (one PNG per beat of the brag scenario), `tools/video-capture/test/goldens.test.mjs`, `tools/video-capture/README.md`
- Modify: root `package.json` (add `video:capture` and `video:test` convenience scripts)

**Interfaces:**
- Consumes: `captureScenario({ lang })`, `window.__capture.missingKeys`.
- Produces: `npm run video:capture -- --scenario brag [--lang cs]`, `npm run video:test`; golden frames at `goldens/<scenario>/<beat>.png` (the middle frame of each beat).

- [ ] **Step 1: Write the failing language tests**

`tools/video-capture/test/lang.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { captureScenario } from '../runner/capture.mjs';

const scenario = (id) => ({
	id, fps: 10, size: [640, 360], language: 'en',
	fixture: 'ExampleProject/OnboardingExample.mnteadlgproj',
	beats: [{ id: 'g', kind: 'graph', theme: 'dark', duration: 0.1 }],
});

test('--lang renders with the real locale and records it in the manifest', { timeout: 240000 }, async () => {
	const manifest = await captureScenario(scenario('lang-cs'), { lang: 'cs', force: true });
	assert.equal(manifest.language, 'cs');
});

test('a locale that lacks a key used by the rendered components fails and names the key', { timeout: 240000 }, async () => {
	await assert.rejects(
		() => captureScenario(scenario('lang-bad'), { lang: 'xx', force: true }),
		/Missing translation keys for "xx": .+/
	);
});
```

(`xx` is not a supported locale; i18next falls back to `en` for rendering but fires `missingKey` for every key not found in `xx`, which is exactly the failure the pipeline must surface.)

- [ ] **Step 2: Run to verify behaviour, fix gaps**

Run: `cd tools/video-capture && node --test test/lang.test.mjs`
Expected: the `cs` test passes only if `cs.json` has every key those components use. If it reports missing keys for `cs`, that is a real finding: report the keys to the user; do not silence the check. The `xx` test must fail with the message above (the pipeline already collects keys in the driver; make sure `captureScenario` reads `missingKeys` after the last beat even when beats were served from cache, by running one probe frame when every beat is cached).

- [ ] **Step 3: Golden frames**

`tools/video-capture/test/goldens.test.mjs` captures the brag scenario at `--scale 1` into a temp scenario id, takes the middle frame of each beat, and compares it with `goldens/brag/<beat>.png` using a pixel tolerance (decode PNGs with Playwright's own `page.evaluate` canvas diff: load both images into a canvas in a blank page, count pixels whose channel difference exceeds 8, fail if more than 0.5% differ). When `UPDATE_GOLDENS=1` is set, the test writes the files instead of comparing.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { captureScenario, toolRoot } from '../runner/capture.mjs';
import brag from '../scenarios/brag.js';

const goldens = path.join(toolRoot, 'goldens/brag');

async function diffRatio(aBytes, bBytes) {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		return await page.evaluate(async ([a, b]) => {
			const load = (bytes) => new Promise((resolve, reject) => {
				const img = new Image();
				img.onload = () => resolve(img);
				img.onerror = reject;
				img.src = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
			});
			const [ia, ib] = await Promise.all([load(a), load(b)]);
			if (ia.width !== ib.width || ia.height !== ib.height) return 1;
			const draw = (img) => {
				const c = document.createElement('canvas');
				c.width = img.width; c.height = img.height;
				const ctx = c.getContext('2d');
				ctx.drawImage(img, 0, 0);
				return ctx.getImageData(0, 0, c.width, c.height).data;
			};
			const da = draw(ia), db = draw(ib);
			let bad = 0;
			for (let i = 0; i < da.length; i += 4) {
				if (Math.abs(da[i] - db[i]) > 8 || Math.abs(da[i + 1] - db[i + 1]) > 8 || Math.abs(da[i + 2] - db[i + 2]) > 8 || Math.abs(da[i + 3] - db[i + 3]) > 8) bad++;
			}
			return bad / (da.length / 4);
		}, [[...aBytes], [...bBytes]]);
	} finally { await browser.close(); }
}

test('brag beats match their golden frames', { timeout: 600000 }, async () => {
	const manifest = await captureScenario({ ...brag, id: 'brag-golden' }, { force: true });
	await fs.mkdir(goldens, { recursive: true });
	for (const beat of manifest.beats) {
		const file = beat.kind === 'stills'
			? path.join(toolRoot, 'out/brag-golden', beat.stills.light)
			: path.join(toolRoot, 'out/brag-golden', beat.dir, `frame-${String(Math.ceil(beat.frames / 2)).padStart(4, '0')}.png`);
		const actual = await fs.readFile(file);
		const goldenFile = path.join(goldens, `${beat.id}.png`);
		if (process.env.UPDATE_GOLDENS === '1') { await fs.writeFile(goldenFile, actual); continue; }
		const expected = await fs.readFile(goldenFile).catch(() => { throw new Error(`Missing golden ${goldenFile}. Run with UPDATE_GOLDENS=1.`); });
		const ratio = await diffRatio(actual, expected);
		assert.ok(ratio <= 0.005, `Beat "${beat.id}" differs from its golden by ${(ratio * 100).toFixed(2)}% of pixels. If the UI change is intended, rerun with UPDATE_GOLDENS=1.`);
	}
});
```

Run once to create goldens: `cd tools/video-capture && UPDATE_GOLDENS=1 node --test test/goldens.test.mjs`, inspect the PNGs, then run `node --test test/goldens.test.mjs` and expect PASS.

- [ ] **Step 4: README**

Create `tools/video-capture/README.md` covering: what the tool is; one-command quick start (`npm run video:capture -- --scenario brag`, then `npm run build --prefix tools/video-capture`, then `npm run preview --prefix tools/video-capture`); the scenario format (copy the example from the spec §3 with the real field list: `reveal`, `tierStagger`, `fade`, `move`, `layout`, `stagger`, `ease`, `theme`, `opaque`, `track`, `actions`); manifest fields; how to add a language (`--lang`); how goldens work (`UPDATE_GOLDENS=1`); the spike result from Task 7 Step 1 (WebM alpha or `<img>` fallback); the known limits (theme toggle drawn in the composition, preview beat sits over the real graph with the app's own blur); and where the output lives.

- [ ] **Step 5: Root convenience scripts**

In the root `package.json` `scripts`, add:

```json
"video:capture": "node tools/video-capture/runner/cli.mjs",
"video:test": "node --test tools/video-capture/test/"
```

Run: `npm run video:test`
Expected: every test file passes (pure tests are fast; the browser tests take a few minutes).

- [ ] **Step 6: Final verification of the whole branch**

Run:

```bash
npm run lint
npx playwright test graph-layout-regressions editor-regressions --workers=1
npm run video:test
npm run video:capture -- --scenario brag --force
npm run build --prefix tools/video-capture
cd tools/video-capture/compose && npx hyperframes check
```

Expected: all green. Confirm `git status` shows no files under `tools/video-capture/out/` and that `package.json`'s `build.files` still excludes `tools/`.

- [ ] **Step 7: Commit**

```bash
git add tools/video-capture package.json
git commit -m "feat(video-capture): language flag, translation-key check, goldens, README"
```

---

## Self-Review

**Spec coverage**
- §1 goals: real components (Tasks 3-5), frame-exact (Task 4 determinism test), editable HyperFrames layers (Task 7), `--lang` (Task 8). Non-goals respected: no Electron or Dexie in the sandbox; the only `src/` edits are `graphLayout.js` (Task 1) and one `data-testid` attribute on `DialoguePreviewOverlay` (Task 5).
- §2 architecture: layout of directories matches the File Structure; `page.clock` is verified by the Task 3 spike; the single refactor is Task 1.
- §3 scenario/runner: beats `preview`/`graph`/`stills` (Tasks 4, 5, 6), manifest with `tracks`, caching by hash, atomic beat writes (Task 4 Step 7).
- §4 hand-off: generator, theme morph from stills, cursor from tracks, SFX/captions/end card, logo duration (Task 7).
- §5 errors/testing: stuck frame (Task 4), determinism (Task 4), layout regression (Task 1), goldens (Task 8), missing fixture/keys/nodes (Tasks 4, 8).
- §6 delivery order and §7 risks: the fake-clock spike is Task 3 Step 8; the image-sequence format spike is Task 7 Step 1.

**One deliberate deviation from the spec:** the spec says the theme toggle coordinates come from the manifest. The real app's theme switch is not on the editor canvas, so the toggle is drawn by the composition and its coordinates live in `video-design.json` (Task 7 Step 5). The Auto Layout button rectangle still comes from the captured UI via `ui.autoLayout`.

**Placeholder scan:** every code step contains code. Two steps intentionally ask the engineer to read real code first because the answer determines the code: Task 5 Step 1 (the return shape of `loadDialogueGraphForPreview`) and Task 7 Step 1 (alpha WebM vs `<img>` playback), each with a stated fallback.

**Type consistency:** `graphFrame` returns `{ positions, nodeOpacity }` in Tasks 4, 5, 6; `buildScene` returns `{ nodes, edges, participants, depth, maxDepth }`; manifest beat entries are `{ id, kind, theme, frames, hash, dir, pattern, tracks?, trackLabels?, text?, stills? }` throughout; `captureScenario(scenario, { lang, beat, force, scale })` is the same everywhere.
