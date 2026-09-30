# Repository guidance for AI assistants

Mountea Dialoguer is a React 18/Vite visual dialogue editor with browser and Electron/Steam distributions. It stores authored data in profile-scoped Dexie databases and optionally synchronizes immutable whole-project revisions. Google snapshots are encrypted; new Steam revisions rely on Steam account/cloud access control. There is no backend in this repository. Source is JavaScript/JSX; Electron modules are CommonJS.

## Read the technical documentation first

Start at [docs/technical/README.md](docs/technical/README.md). Read [architecture](docs/technical/architecture.md), [domain model](docs/technical/domain-model.md), and the relevant area before editing. Check the [issue register](docs/technical/issues.md) and [implementation progress](docs/technical/implementation-progress.md): original findings remain historical evidence; current repair status and verification live in the ledger.

| Work area | Reference |
| --- | --- |
| Database, profiles, migrations | [Persistence](docs/technical/persistence.md) |
| Nodes, canvas, history, save | [Graph editor](docs/technical/graph-editor.md), [configured fields/defaults](docs/technical/configuration-reference.md) |
| Preview/traversal | [Dialogue preview](docs/technical/dialogue-preview.md) |
| Strings, locales, key migration | [Localization](docs/technical/localization.md) |
| ZIP formats, import/export | [Import/export](docs/technical/import-export.md), [media](docs/technical/media.md) |
| Cloud, conflicts, deletion | [Synchronization](docs/technical/synchronization.md), [providers/authentication](docs/technical/cloud-providers.md) |
| Native IPC, menus, Steam | [Electron and Steam](docs/technical/electron-steam.md) |
| Routes, dialogs, commands, devices | [UI interaction](docs/technical/ui-interaction.md) |
| Tours, achievements, errors | [Onboarding/observability](docs/technical/onboarding-observability.md) |
| Tooling, packaging, release | [Build/release/testing](docs/technical/build-release-testing.md) |
| Old helpers, static/sample data | [Legacy/assets](docs/technical/legacy-and-assets.md) |

Use the [current source map](docs/technical/source-map-current.md) and [current callable index](docs/technical/logic-index-current.md) for navigation; regenerate them with `node scripts/update-technical-indexes.mjs`. Baseline indexes remain historical evidence. [Implementation progress](docs/technical/implementation-progress.md) distinguishes current checks from unpassed native/live-provider gates; [verification](docs/technical/verification.md) preserves the original investigation.

## Invariants and working guidance

- `@` resolves to `src`. TanStack uses file routes and hash history. Do not edit generated `src/routeTree.gen.ts`. Application settings are a dialog; dialogue settings have a route.
- Entity Zustand stores call Dexie explicitly. The active graph is local React Flow state and requires explicit save/export; disconnected autosave hooks are not active behavior.
- Nodes/edges use `[dialogueId, id]`. Every dialogue reuses Start ID `00000000-0000-0000-0000-000000000001`. Scope graph queries/mutations accordingly.
- Localization is always on; normalized config has no `enabled` flag. Text lives in `localizedStrings`; materialize for editing and preserve all locales on save. Slugs, `localizationNodeToken`, `localizationRowToken`, and key references must stay consistent.
- Preserve audio across JSON boundaries. IndexedDB supports Blob; ordinary JSON does not. History, ZIP import, snapshots, and save use different transforms.
- Import/clone changes must map child/return targets, decorator/condition instances, localized keys, row IDs, and audio bindings. Preflight foreign-project ID collisions before writes.
- Legacy schema versions 1–9 migrate by validated copy into a new generation. Preserve original databases and use the generation migration APIs for primary-key changes.
- `syncEngine.js` is a barrel; behavior lives in `src/lib/sync/core`. Local save, upload, catalog commit, and native cloud acknowledgement are distinct outcomes.
- Distribution channel defaults to `desktop`, even in a browser. Detect Electron capability separately through the preload bridge. Steam variants use channel/app metadata.
- Treat `src/helpers`, `src/indexedDB.js`, autosave hooks, and `nodeForm.json` as legacy until reachability/compatibility are checked. The current DB is `src/lib/db.js`.
- Update area documentation, indexes, and issue status with implementation changes. Close a finding only with evidence covering its failure mode; a smoke pass does not close persistence defects.
- Keep private environment values, tokens, user databases, local profiles, and generated artifacts out of patches/docs. Use disposable profiles for destructive import/migration reproductions.

## Commands and validation

- `npm run dev` — Vite renderer.
- `npm run dev:electron` / `dev:electron:steam` — coordinated desktop development.
- `npm run build` / `build:steam` — renderer build into `dist`.
- `npm run lint` / `npm run lint:ci` — maintained renderer, Electron, scripts, tests, and config; disconnected legacy exclusions are explicit in `.eslintrc.cjs`.
- `npm run test:e2e:smoke` — three Chromium smoke tests. Single case: `npx playwright test tests/e2e/smoke.spec.js -g "<name>"`.
- `npm run test:e2e:evidence` — richer evidence suite, one worker.
- `npm run test:regressions` — all `*regressions.spec.js` suites against real modules in isolated Playwright browser contexts.
- `npm run validate:skills` — maintained lint, all module regressions, one build and production artifact validation.
- `npm run validate:artifact` — exact-release Sentry upload when enabled, strip private maps, fingerprint, production preview tests and attestation.
- `npm run electron:pack` / `electron:dist` and `:steam` variants — consume the existing validated artifact; never rebuild. Public distribution requires signing/notarization credentials; no command publishes automatically.

Dormant library assertions were ported to `tests/e2e/library-regressions.spec.js`; obsolete Jest-style files were removed. Use the browser module harness for code importing Vite aliases or browser APIs. Historical database fixtures and deterministic provider fakes are available under `tests/e2e/helpers`. Choose checks for the changed contract, especially migrations, archive round trips, locales, media bytes, and sync interleaving. Deployment/Steam upload are not routine tests: they publish or modify external staging directories.

Work normally happens on `dev`; `master` is the main/release branch. CI runs maintained lint, all regressions, production validation and native package startup. Pages deploys only the exact artifact from successful trusted master-push CI. Live providers, signing/notarization and real Sentry require external credentials; local mocks cannot close those gates. See [contribution guidance](CONTRIBUTING.md).
