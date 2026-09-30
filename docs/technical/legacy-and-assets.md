# Legacy code, utilities, samples, and repository assets

The [source map](source-map.md) assigns every baseline tracked file to an area. Static renderer reachability was computed from `src/main.jsx` and all route files using relative/alias imports, literal dynamic imports, `require`, and re-exports. It is a navigation aid, not proof that a file has no outside consumer or future use.

## Disconnected persistence and helpers

[src/indexedDB.js](../../src/indexedDB.js) opens a separate `projectDB` database through `idb`, with project records keyed by `guid`. The active application instead uses profile-scoped Dexie databases and normalized tables. `idb` is not a declared direct dependency. This module is still in the CI lint allowlist, but is not connected to the current renderer graph.

The disconnected `src/helpers` family reflects that older aggregate-project model:

| Files | Responsibility and mismatch |
| --- | --- |
| `projectManager.js` | Context provider reads old `projectDB`, uses session `project-guid`, exposes old project names/IDs |
| `autoSaveHelpers.js` | Merges aggregate arrays by concatenation, which is not current graph replacement/upsert logic |
| `debounce.js` | Generic delayed callback utility used by older flows |
| `exportProjectHelper.js` | Older aggregate ZIP export orchestration |
| `exportCategoriesHelper.js`, `exportParticipantsHelper.js`, `exportDialogueRowsHelper.js` | Older path/entity/row export transforms |
| `importCategoriesHelper.js`, `importParticipantsHelper.js` | Older import shapes, distinct from current stores |
| `validationHelpers.js` | GUID normalization and older category/participant validation |

`useAutoSave.js` and `useAutoSaveNodesAndEdges.js` are also disconnected. Their existence must not be used to describe the graph editor as autosaving. Current editing uses explicit save/export and navigation guards. Reconnecting an old helper would require deliberate migration of its data contract and dependencies.

## Configuration and dormant components

`dialogueNodes.json` and its JavaScript accessors define current type metadata, default values, fields, sections, validation hints, and minimap colors. `edgeConditions.js` initializes condition instances and correctly preserves false/zero defaults with `??`. `nodeForm.json` is older form configuration with obsolete node concepts; it is not the authoritative schema. `projectDetails.json` is static about/author HTML content, not domain persistence configuration. `steamAchievements.js` contains native achievement identifiers.

No current renderer import path was found for `ProjectHeader.jsx`, `SyncStatusBadge.jsx`, `KeyboardShortcutsDialog.jsx`, UI `select.jsx`, or `skeleton.jsx`. These are not inherently broken; the important limitation is that editing them may not affect the running UI. Current headers/status/shortcuts have other owners.

`src/App.test.js` is a stale Create React App-style test. The two library test files are also disconnected from a configured unit runner. Their assertions can still communicate intended behavior, but do not establish tested behavior; see [testing](build-release-testing.md).

## Shared utilities

`storageUtils.js` reports origin-wide browser storage usage when `navigator.storage.estimate` is available. Its fallback and per-project/dialogue estimates use fixed byte weights per record. They omit actual audio/base64 size and several newer tables, so they are display approximations, not sync payload budgets ([ISS-042](issues.md#iss-042)). `payloadBudget.js` is the separate serializer-based sync estimator.

`clipboard.js` tries the modern Clipboard API in a secure context, otherwise a temporary textarea plus `execCommand('copy')`; its toast wrapper reports the Boolean result. `dateUtils.js` supplies display-oriented date helpers. `confetti.js` wraps celebration effects. `utils.js` combines class names with Tailwind conflict resolution. `keyboardShortcuts.js` formats platform-specific modifier labels; it does not register handlers.

`ThemeProvider` stores light/dark/system selection in a global key, applies a root CSS class, listens for system preference changes, and accepts `app:set-theme`. Device classification/override has its own [interaction contract](ui-interaction.md). These global preferences are distinct from the profile-scoped entity database.

## Static files and visual resources

Root `index.html` is the Vite entry. `public/index.html` is an old template containing `%PUBLIC_URL%` and `npm start` instructions; do not use it as the current build specification. `public/oauth-callback.html` is an active authentication endpoint. `manifest.json` and `robots.txt` are static metadata. No service-worker registration was found, so the manifest does not establish an offline application-shell caching guarantee.

Public/renderer icons include product branding, provider logos, SVG UI artwork, and legacy logo assets. `DocumentationSource` contains README screenshots, Steam capsules/heroes/logos, achievement art, and editable Krita/Photoshop source files. Their visual contents were not individually reviewed for design or licensing correctness. The license file is tracked; this document does not reinterpret its legal terms.

`DocumentationSource/SteamAutoCloudSetup.md` describes an earlier storage design and is marked historical. The actual bundle implementation is documented in [Electron and Steam](electron-steam.md).

## Sample and feedback material

`ExampleProject/OnboardingExample.mnteadlgproj` is a real ZIP sample. Its directory structure was inspected: it includes two nested dialogue archives, supporting project JSON, a thumbnail, and an additional expanded dialogue subtree containing JSON/audio. Current project import consumes the nested `.mnteadlg` entries; do not assume the expanded duplicate subtree is the authoritative source of those nested payloads. The sample can exercise branching, child-dialogue relationships, conditions, localization, and media, but a sample's presence does not prove round-trip fidelity.

`Feedback/conditions.md` is tracked design feedback. Treat it as requirements/history to compare with implementation, not executable behavior. Personal feedback text was not reproduced in this documentation. Local `exampleImport` or other ignored scratch material is not part of the 279-file tracked baseline inventory.

## Configuration boundaries

The baseline tracks `.env`. Its contents and local `.env.local` values were deliberately not read or copied during this audit; tracked status alone does not prove it contains secrets. Document configuration names from source, and review repository policy separately if credentials are ever added. Generated builds, node_modules, browser reports, local profiles, scratch scripts, and the generated route tree are excluded from source inventory.

Windows `steam_build_upload.bat` builds the Steam package, mirrors `release/win-unpacked` to a hardcoded SDK content directory with `robocopy /MIR`, then invokes SteamCMD with an external VDF. It changes external filesystem state and can publish a build. Linux/macOS scripts implement analogous SDK staging/upload with differing configuration support. None was executed for documentation verification.
