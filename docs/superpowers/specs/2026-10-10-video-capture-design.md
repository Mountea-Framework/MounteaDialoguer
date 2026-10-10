# Video Capture Pipeline: Design

Date: 2026-10-10
Status: Implemented (see notes)
Branch context: `dev`

## 1. Purpose

A reusable pipeline that produces launch and feature videos of Mountea Dialoguer from the **real UI components**, so videos stay in sync with the app instead of being hand-recreated.

It replaces the hand-built `brag-output/composition` (a HyperFrames project that re-draws the nodes, preview card and toolbar by hand). The video is still assembled in HyperFrames; this tool supplies the UI footage.

### Agreed decisions

| Question | Decision |
|---|---|
| Primary use | Reusable pipeline: many videos over time (release trailers, feature clips, store assets, other languages). |
| Output handed to HyperFrames | **Captured layers**: transparent PNG sequences and stills, plus a manifest. No React runs inside the video. |
| Location | `tools/video-capture/`, its own package, importing the app via the `@` alias. |
| Capture approach | **Deterministic frame stepper**: a sandbox page renders real components; a Playwright runner steps time frame by frame. |
| Theme morph | Capture identical state in dark and light as two stills; morph between them in HyperFrames. |
| Easing and effects | Hardcoded and video-friendly, defined in the scenario / HyperFrames layer, not taken from React Flow's own animation. |

### Goals

- Footage is pixel-faithful to the real components (`AnswerNode`, `StartNode`, `ConditionEdge`, `DialoguePreviewOverlay`, toolbar).
- Frame-exact and repeatable: same scenario, same frames.
- Cursor, captions, glow, ripple, end card, music and SFX remain editable in HyperFrames.
- Localised videos from the real locale files via a `--lang` flag.

### Non-goals (v1)

- Recording the real routed app, Dexie persistence, or Electron.
- Audio generation, a GUI, cloud rendering.
- Shipping any of this inside the Electron build.

## 2. Architecture

```
tools/video-capture/
  package.json            own deps (playwright, hyperframes); scripts: capture, build, render
  vite.config.js          alias '@' -> ../../src
  sandbox/                page that renders real components (never shipped)
    main.jsx              fixed providers: i18n (language from scenario), theme class on <html>, no router, no Dexie
    Stage.jsx             real ReactFlow with the app's node/edge types + DialoguePreviewOverlay
    driver.js             window.__capture.setScenario(...) / setState(t): the single entry point for the runner
  scenarios/              one file per video: ordered beats + fixture
  runner/                 Playwright: steps frames, writes PNG sequences + manifest.json
  compose/                HyperFrames project generated from the manifest + video-design.json
src/lib/graphLayout.js    extracted from the route; used by the app and the sandbox
```

Key points:

- **Real components.** Node components use `@xyflow/react` `Handle` and `react-i18next`, so the stage wraps them in a real `ReactFlow` using the app's `nodeTypes` / `edgeTypes`. Nothing is re-implemented.
- **Determinism via `page.clock`.** The preview overlay uses timers (`CLOSE_ANIMATION_MS`, `NODE_TRANSITION_DELAY_MS`, `ROW_COMPLETION_HOLD_MS`) and React Flow uses rAF-based viewport easing. A fake clock advanced by exactly one frame per step makes them repeatable.
- **One refactor inside `src/`.** `getLayoutedElements` (dagre, with `getNodeSize` and start-node anchoring) is inline in `src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx`. It moves to `src/lib/graphLayout.js`; the route imports it. This is the only app change and is covered by a regression test.
- **Isolation.** The tool is excluded from the Electron `build.files` and from app lint/CI unless opted in.

## 3. Scenario format and capture runner

A scenario is declarative data: it never touches the DOM.

```js
// scenarios/brag.js
export default {
  id: 'brag', fps: 30, size: [1920, 1080], language: 'en',
  fixture: 'ExampleProject/OnboardingExample.mnteadlgproj',
  beats: [
    { id: 'preview-type',    kind: 'preview', theme: 'dark',  duration: 3.4 },
    { id: 'preview-answers', kind: 'preview', theme: 'dark',  duration: 4.2 },
    { id: 'graph-reveal',    kind: 'graph',   theme: 'dark',  reveal: 'tiers', duration: 3.0 },
    { id: 'theme-switch',    kind: 'stills',  from: 'dark', to: 'light' },
    { id: 'drag',            kind: 'graph',   theme: 'light', move: { node: 'sell', to: [1400, 370] }, ease: 'power3.inOut', duration: 0.8 },
    { id: 'auto-layout',     kind: 'graph',   theme: 'light', layout: 'auto', ease: 'power3.inOut', duration: 1.3, stagger: 'tier' },
  ],
}
```

Beat kinds:

- `preview`: the real `DialoguePreviewOverlay` against the fixture; answer reveal and row progress come from the app's own timers on the fake clock. The real overlay has no typewriter, so the beat shows each line as the app renders it.
- `graph`: the real React Flow canvas. Node positions come from the scenario (drag target, or `graphLayout` output for Auto Layout). Easing is applied by the driver, not by React Flow.
- `stills`: one capture per theme with identical layout, for the dark-to-light morph built in HyperFrames.

Runner steps:

1. Launch the Vite sandbox at the scenario viewport and device scale factor.
2. Install `page.clock`, call `__capture.setScenario(...)`.
3. Per frame: advance the clock by `1000 / fps` ms, call `setState(t)`, wait for render idle, `screenshot({ omitBackground: true })`.
4. Write `out/<scenario>/<beat>/frame-0001.png …`, one PNG per theme for stills, and `manifest.json`. A beat is written only if every frame succeeds.

`manifest.json` is the contract with HyperFrames: per beat, the file pattern, fps, frame count, duration, theme, plus per-frame node centres and viewport (`positions[]`) so the video layer can place the cursor exactly (drag grab point, Auto Layout chip rectangle). Output lives in git-ignored `out/`. Per-beat caching is keyed by a hash of scenario and source files.

## 4. HyperFrames hand-off

`compose/` is generated: `npm run build` writes `compose/index.html` from `manifest.json` and `video-design.json` (captions, SFX cues, music, timings).

- Frame sequences become image-sequence clips (exact representation, one pre-composed WebM or scrubbed image sequence, to be confirmed in the first spike).
- **Theme morph:** two stacked stills with a morph effect (circular reveal from the toggle, using the toggle coordinates in the manifest; registry transition or GSAP clip-path).
- **Cursor** is drawn in HyperFrames from manifest coordinates with hardcoded easing and a press state.
- **Captions, end card, logo, halo, music, SFX** are HyperFrames-side. SFX cues derive from beat timestamps, so they always match the captured UI.
- Re-timing a beat means re-capturing that beat only.
- `--lang <code>` re-captures with the real locale files (en, cs, de, es, fr, pl).

## 5. Errors, testing, maintenance

- **Fail loudly** on a missing fixture, i18n key, or unloaded font, and on a stuck frame (identical consecutive frames where motion is expected). No partial output.
- **Determinism test:** capture a short beat twice, assert byte-equal frames (runs for the tool only).
- **Layout regression test:** `src/lib/graphLayout.js` returns the same positions as the current inline code for a known graph; sandbox and app route agree.
- **Visual goldens:** one golden frame per beat of the brag scenario with tolerance; UI changes require an explicit `--update-goldens`.

## 6. Delivery order (for the implementation plan)

1. Extract `graphLayout.js` and add its regression test.
2. Sandbox renders one node, one theme, one still.
3. Runner and manifest with frame stepping and the determinism test.
4. Graph beats: reveal, drag, Auto Layout.
5. Preview card beat (typing, answers) on the fake clock.
6. Theme stills and the morph.
7. HyperFrames generator from the manifest; full brag scenario.
8. Language flag, goldens, README.

## 7. Risks and open items

- **Fake-clock coverage (first spike, steps 2-3).** If `page.clock` does not fully tame React Flow's viewport animation or the preview timers, fall back to setting the viewport directly from the scenario and driving the preview with explicit state. More work, same determinism.
- **Frame volume.** About 700 frames at 1080p/30 fps for the brag scenario; 60 fps or 2x scale multiplies this. Mitigated by git-ignored `out/` and per-beat caching.
- **Image-sequence clip format.** Whether HyperFrames is best fed PNG sequences, a pre-encoded transparent WebM, or scrubbed `<img>` is confirmed in step 7's spike.
- **Provider surface.** Components may depend on more context (zustand stores, tooltips, context menus) than the sandbox's fixed providers; any such dependency is stubbed in `sandbox/main.jsx`, not changed in the app.

## 8. Implementation notes and deviations

- The Auto Layout button rectangle is a hand-measured constant in `compose/video-design.json` (`ui.autoLayout`), not taken from the captured UI.
- The toolbar and chips in the composition are drawn by `build.mjs` and `video-design.json`, not captured from the real toolbar.
- Cursor, SFX and caption cue times are absolute seconds in `video-design.json`; changing a beat duration desynchronises them (beat-relative cues are a follow-up).
- The manifest records track positions only for tracked nodes; it has no viewport and no positions for all nodes.
- The theme toggle is drawn by the composition (the app's theme switch is not on the editor canvas).
- Music is user-supplied and untracked (`compose/assets/music/` is git-ignored); the build warns and omits music if absent.
- A `stills` beat may carry a `duration`: how long the composition holds the stills while it plays the theme morph.
- Translation keys are checked against the requested language itself (the `en` fallback is disabled during capture), per beat and before a beat is stored.
