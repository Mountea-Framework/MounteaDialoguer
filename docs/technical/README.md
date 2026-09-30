# Mountea Dialoguer technical documentation

Investigation baseline: `00bcc915a7a3a55bd4ebf61bab2d0ba4f2c48068` (`dev`, version `0.2.0`), 2026-09-19. Repair evidence and remaining gates are recorded in [implementation progress](implementation-progress.md); baseline findings are historical unless an explicit update says otherwise. Start with [contribution guidance](../../CONTRIBUTING.md), [current source map](source-map-current.md) and [current callable index](logic-index-current.md) for the repaired implementation.

## Start here

For a new contributor, read [architecture](architecture.md), [domain model](domain-model.md), and [persistence](persistence.md), then the area you will change. For an AI agent, also read [issues](issues.md) before proposing changes. It contains observed failures, evidence, and regression scenarios; the current behavior is not automatically the intended behavior.

| Area | Contents |
| --- | --- |
| [Architecture](architecture.md) | Runtime boundaries, initialization, state ownership, dependencies, end-to-end flows |
| [Domain model](domain-model.md) | Projects, dialogues, categories, participants, definitions, instances, references, invariants |
| [Persistence and profiles](persistence.md) | All 14 Dexie tables, schema versions, transactions, profile switching, storage scopes |
| [Graph editor](graph-editor.md) | Nodes, edges, selection, layout, placeholders, history, saving, validation, navigation |
| [Node configuration reference](configuration-reference.md) | Every configured node field, default, section, and validation hint |
| [Dialogue preview](dialogue-preview.md) | Traversal, branches, conditions, child graphs, audio/timing, limits |
| [Localization](localization.md) | UI languages, content locales, key algorithms, string-table contracts, migration |
| [Import and export](import-export.md) | ZIP formats, identity policy, write order, reference remapping, loss of information |
| [Media](media.md) | Audio representations, row binding, thumbnails, naming, payload budgets, URL lifetimes |
| [Synchronization](synchronization.md) | Scheduling, snapshots, revisions, catalog merge, tombstones, conflict behavior |
| [Cloud providers and authentication](cloud-providers.md) | Google OAuth/Drive, Steam adapter, credentials, provider extension contract |
| [Electron and Steam](electron-steam.md) | Main/preload/renderer IPC, menus, desktop OAuth, cloud bundle, Steamworks lifecycle |
| [UI and interaction](ui-interaction.md) | Routes, project sections, dialogs, primitives, commands, device detection, themes |
| [Onboarding and observability](onboarding-observability.md) | Tours, example template, achievements, activity, telemetry, error handling |
| [Build, release, and testing](build-release-testing.md) | Commands, environment variables, packaging, CI, deployment, test coverage |
| [Legacy and assets](legacy-and-assets.md) | Disconnected code, old schema/helpers, samples, static files, repository boundaries |
| [Current source map](source-map-current.md) | Maintained source, tests, release scripts and documentation paths |
| [Current callable index](logic-index-current.md) | Current parsed functions, methods and callbacks with source locations |
| [Baseline source map](source-map.md) | Historical tracked inventory and exports |
| [Baseline logic index](logic-index.md) | Historical 2,554 parsed callables |
| [Issues, bugs, and flaws](issues.md) | Prioritized findings with confidence, triggers, effects, and repair/test directions |
| [Verification](verification.md) | Actual commands/results, isolated reproductions, coverage limits |
| [Audit recipes](audit-recipes.md) | Executed disposable-browser reproduction scripts and captured outputs |

## Concepts and terminology

**Definition** means a project-level condition or decorator schema. **Instance** means the node/edge reference plus its chosen property values. **Materialization** resolves localized key references into editable text. A **snapshot** is a whole-project JSON object for cloud synchronization; it is different from a `.mnteadlgproj` ZIP export. A **catalog** lists remote snapshot objects and deletions. A **tombstone** is a retained record saying a project/dialogue was deleted. A **profile** chooses a local database and preferences namespace, usually `local` or `steam-<SteamID>`.

## How to use and maintain this set

- Follow source links and named symbols when changing behavior. Regenerate current indexes with `node scripts/update-technical-indexes.mjs` after source changes; baseline indexes remain historical.
- Update the relevant area, affected cross-references, and issue status together with an implementation change. Do not silently turn an observed flaw into a documented guarantee.
- Preserve identity, localization, binary media, and deletion semantics in any new import, duplication, migration, or sync path. Each crosses several areas.
- Check consumers before deleting seemingly unused code. The source map identifies static reachability, not proof that outside consumers do not exist.
- Keep credentials, private environment values, user databases, generated builds, and personal feedback out of documentation.

## Coverage and evidence

The baseline inventory covers 279 tracked files, including 180 JavaScript/JSX/CommonJS/ESM code files (37,179 physical lines as counted by the inventory). All tracked paths are mapped; high-risk data and runtime flows were traced in source, and selected defects were reproduced against actual modules in an isolated Chromium database. UI wrappers, translations, artwork, and sample archives have different review depth, described in the source map and verification record.

This is a comprehensive implementation guide and a bounded audit, not a proof that every possible bug has been found. Installed dependencies, generated/ignored artifacts, live Google/Steam services, production user data, and native releases on every OS were not exhaustively tested. Findings distinguish **reproduced**, **source-confirmed**, and **risk / needs runtime validation**.
