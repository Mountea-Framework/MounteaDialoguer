# Video capture

Captures the **real** Mountea Dialoguer components (node types, edges, the Dialogue Preview overlay) as frame-exact video layers, then builds an editable [HyperFrames](https://hyperframes.heygen.com) composition around them. The app itself is not modified beyond one `data-testid` and the shared `graphLayout.js`; the tool lives entirely in `tools/video-capture/` and is excluded from the packaged app (`package.json` `build.files` lists only `dist`, `electron`, ...).

Nothing renders automatically. Capturing and building produce files; turning them into an MP4 is a separate, explicit step you run after reviewing the result.

## Quick start

From the repository root:

```bash
npm run video:capture -- --scenario brag          # capture beats into tools/video-capture/out/brag/
npm run build --prefix tools/video-capture        # generate compose/index.html from the manifest
npm run preview --prefix tools/video-capture      # open HyperFrames Studio to review
```

Render only after review:

```bash
npm run render --prefix tools/video-capture
```

HyperFrames is pinned to `0.8.145` in `package.json` (`preview` and `render` use `npx hyperframes@0.8.145`). Captures are cached per beat by a content hash (scenario, source files, fixture, scale); `--force` re-renders everything.

CLI flags: `--scenario <name>` (file in `scenarios/`), `--lang <code>`, `--beat <id>` (re-render one beat, the others must already be cached), `--scale <n>` (device scale factor), `--force`, `--update-goldens`.

## Scenario format

A scenario is a JS module in `scenarios/` with a default export (see `scenarios/brag.js`):

```js
export default {
	id: 'brag', fps: 30, size: [1920, 1080], language: 'en',
	fixture: 'ExampleProject/OnboardingExample.mnteadlgproj',   // real project archive, repo-relative
	beats: [
		{ id: 'preview', kind: 'preview', theme: 'dark', opaque: true, duration: 3.0,
		  actions: [{ at: 1.5, click: 'Next' }] },
		{ id: 'graph-reveal', kind: 'graph', theme: 'dark', reveal: 'tiers', tierStagger: 0.35, fade: 0.4, duration: 4.5 },
		{ id: 'theme-switch', kind: 'stills', of: 'graph-reveal', from: 'dark', to: 'light', duration: 1.2 },
		{ id: 'drag', kind: 'graph', theme: 'light', move: { node: 'Sell Apples', to: [1500, 700] },
		  ease: 'power3.inOut', duration: 0.8, track: ['Sell Apples'] },
		{ id: 'auto-layout', kind: 'graph', theme: 'light', layout: 'auto', stagger: 'tier', ease: 'power3.inOut', duration: 1.3 },
	],
};
```

Beat kinds:

- `preview`: the real Dialogue Preview overlay over the graph. `actions` click buttons by accessible name at a time (seconds).
- `graph`: the real nodes and edges, animated frame by frame.
- `stills`: the final layout of an earlier graph beat (`of`) rendered once per theme (`from`, `to`); the composition plays the theme morph over them.

Beat fields (graph unless noted):

| Field | Meaning |
| --- | --- |
| `reveal` | `'tiers'`: nodes fade in tier by tier. |
| `tierStagger` | Seconds between tiers during a reveal. |
| `fade` | Fade duration of each node. |
| `move` | `{ node, to: [x, y] }`: move one node (by label or id) to a point. |
| `layout` | `'auto'`: animate to the app's real Auto Layout result. |
| `stagger` | `'tier'`: stagger the layout move by tier. |
| `ease` | Easing name (see `shared/ease.js`). |
| `theme` | `'dark'` or `'light'`. |
| `opaque` | Capture with the page background instead of transparency. |
| `track` | Node labels/ids whose rectangles are recorded per frame (the cursor follows them). |
| `actions` | (`preview`) `[{ at, click }]`. |
| `duration` | Seconds (graph and preview, optional for stills). |

## Output and manifest

Output goes to `tools/video-capture/out/<scenario>/` (git-ignored, never committed): one directory of `frame-NNNN.png` per beat plus `manifest.json`. Manifest fields: `version`, `scenario`, `fps`, `size`, `scale`, `language`, and `beats[]` with `id`, `kind`, `theme`, `frames`, `startFrame`, `duration`, `hash`, `dir`, `pattern`, and where applicable `tracks` (per tracked node: `[cx, cy, w, h]` per frame), `trackLabels`, `text` (preview line per frame), `stills` (theme to file). The composition generator (`compose/build.mjs`) reads only the manifest and `compose/video-design.json`.

## Languages

`--lang <code>` renders the UI with the app's real locale, for example `npm run video:capture -- --scenario brag --lang cs`. Supported codes come from `electron/shared/app-languages.json` (en, cs, de, fr, es, pl); anything else fails before rendering with the supported list.

Every translation key the rendered components request must exist in the requested language itself. The sandbox disables i18next's `en` fallback so a key missing from, say, `cs.json` is reported instead of silently rendering English, and the capture fails with `Missing translation keys for "cs": ...`. The check also runs when every beat is served from cache (one throwaway probe frame is rendered). To add a language, add its locale file and entry to the app's language list, then make the capture pass.

Known gap at the time of writing: `editor.preview.*` exists only in `en.json`, so the `preview` beat fails for every other language until those keys are translated.

## Goldens

`goldens/brag/<beat>.png` holds one mid frame per beat of the brag scenario. `test/goldens.test.mjs` captures the scenario into a temporary id and fails if more than 0.5% of pixels differ (per-channel tolerance 8). After an intended UI change, regenerate them with:

```bash
UPDATE_GOLDENS=1 node --test test/goldens.test.mjs     # from tools/video-capture
# or: npm run video:capture -- --update-goldens
```

Review the PNGs before committing. The golden test takes about 80 seconds.

## Tests

```bash
npm run video:test          # every test file (runs `npm test --prefix tools/video-capture`)
```

Single file: `cd tools/video-capture && node --test test/<file>.test.mjs`. Tests run with `--test-concurrency=1` (they share one local Vite port).

## HyperFrames composition

`compose/build.mjs` writes `compose/index.html` from the manifest and `compose/video-design.json` (cues, captions, cursor path, SFX, end card, music). Layer modes:

- `webm` (default): each beat is one transparent VP9 WebM with alpha. The Task 7 spike showed HyperFrames 0.8.145 keeps the alpha channel in both `snapshot` and `render`.
- `images`: one `<img>` per beat swapped from a GSAP update. Experimental fallback only.

`compose/hyperframes.json` sets `media.autoProxy` to `false` on purpose: the preview proxy would transcode the WebMs to H.264 without alpha and Studio would no longer match the render.

Music is user-supplied and not committed: `compose/assets/music/` is git-ignored. Point `video-design.json` `music.src` at a file you may use there. If it is missing the build prints a warning and omits the music track.

## Known limits

- The theme toggle is drawn by the composition, not captured (the app's theme switch is not on the editor canvas). Its position lives in `video-design.json`; the Auto Layout button rectangle comes from the captured UI.
- The real preview overlay has no typewriter, so the `preview` beat shows each line as the app renders it.
- The brag scenario renders the real 38-node onboarding dialogue, so nodes are small at 1920x1080. Visual tuning (camera focus or zoom, or a smaller dialogue) is a known follow-up.
- Sandbox is hermetic: no network, no Electron or Dexie; fonts are bundled from `sandbox/fonts/`.
