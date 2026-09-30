# Issues, bugs, flaws, and unresolved risks

Current implementation and per-finding acceptance evidence are maintained in [implementation progress](implementation-progress.md). The register below preserves original reproductions and must not be read as a claim that all remain unfixed or that all release gates have passed.

Baseline: `00bcc915a7a3a55bd4ebf61bab2d0ba4f2c48068`, investigated 2026-09-19. Findings describe the investigation baseline unless an explicit implementation update appears below. Repairs are now underway; focused verification does not imply every migration, provider or release gate has passed.

Evidence labels: **R** = reproduced against actual local modules or commands; **S** = source-confirmed behavior/control gap; **V** = plausible consequence requiring a focused runtime/concurrency/platform test; **U** = user-reported behavior, not independently reproduced during this audit. Priority: **P1** = data loss, blocked persistence, or boundary requiring early attention; **P2** = functional defect/meaningful reliability issue; **P3** = maintenance, clarity, or limited-impact gap. These are engineering triage judgments, not CVSS scores or claims of exploitation.

Reproduction environment, outputs, and limitations: [verification](verification.md). The [logic index](logic-index.md) locates individual functions. Fix directions remain proposed work except where explicit implementation evidence is recorded.

## Register

| ID | Priority | Evidence | Finding |
| --- | --- | --- | --- |
| [001](#iss-001) | P1 | R | Dialogue import removes edge conditions and ignores condition definitions |
| [002](#iss-002) | P1 | R | Reimport leaves obsolete nodes |
| [003](#iss-003) | P1 | R | Dialogue import can move another project's dialogue |
| [004](#iss-004) | P1 | R/S | Decorator schemas are lost during import |
| [005](#iss-005) | P1 | R | Project export overwrites colliding dialogue filenames |
| [006](#iss-006) | P1 | R | Replacement import deletes existing data before failing and reports success |
| [007](#iss-007) | P1 | R | Snapshot JSON drops Blob audio |
| [008](#iss-008) | P1 | R | Old database primary-key upgrades fail |
| [009](#iss-009) | P1 | R/S | Category reparenting permits cycles; traversal can hang |
| [010](#iss-010) | P2 | R | Category import rejects a valid existing path prefix |
| [011](#iss-011) | P2 | R/S | Renames/deletions leave dangling domain references |
| [012](#iss-012) | P2 | S | Name-based references cannot represent supported duplicate names |
| [013](#iss-013) | P1 | R | Snapshot clone leaves old references and loses displayed text |
| [014](#iss-014) | P1 | R | Snapshot apply overwrites conflicting dialogue ownership |
| [015](#iss-015) | P1 | S/V | Sync overwrite has no concurrency precondition or atomic catalog commit |
| [016](#iss-016) | P1 | R | Localization keys can collide across dialogues |
| [017](#iss-017) | P2 | R | Localization migration/default-locale seeding ordering is inconsistent |
| [018](#iss-018) | P2 | R | Localization validation accepts absent refs; enabled flag is ineffective |
| [019](#iss-019) | P1 | S | Corrupt catalog can be treated as readable empty state |
| [020](#iss-020) | P1 | S/V | Pull can resurrect tombstoned data; expired pending tombstones can stall |
| [021](#iss-021) | P1 | S/V | Offline/busy edits can miss later sync |
| [022](#iss-022) | P1 | S/V | Steam whole-bundle writes can lose concurrent/offline changes |
| [023](#iss-023) | P2 | S | Browser OAuth can remain pending indefinitely |
| [024](#iss-024) | P1 | S/V | Crash window between local deletion and tombstone creation |
| [025](#iss-025) | P2 | S/V | Snapshot/profile operations are not pinned to a consistent read state |
| [026](#iss-026) | P2 | S/V | UI preferences are not rehydrated with startup profile switch |
| [027](#iss-027) | P2 | S | Bundled onboarding fallback asset is missing |
| [028](#iss-028) | P2 | S | Decorator defaults discard false and zero |
| [029](#iss-029) | P2 | S/V | Shared history references allow checkpoint mutation |
| [030](#iss-030) | P2 | S/V | Dirty flag depends on state-updater timing |
| [031](#iss-031) | P2 | S/V | Archive size guards do not bound decompression/atomic validation |
| [032](#iss-032) | P1 | S/V | Electron navigation and IPC trust checks are incomplete |
| [033](#iss-033) | P2 | S | Local remembered secrets and deterministic Steam encryption boundary |
| [034](#iss-034) | P2 | S | Achievement failure is acknowledged locally without retry |
| [035](#iss-035) | P2 | R/S | Dormant unit tests and narrow CI leave major contracts untested |
| [036](#iss-036) | P2 | S | Deployment/native release/docs have disconnected guarantees |
| [037](#iss-037) | P2 | S | ZIP export is not a complete metadata/definition backup |
| [038](#iss-038) | P2 | S/V | Forward return-target normalization uses an incomplete ID map |
| [039](#iss-039) | P3 | S/V | Restored audio object URLs lack clear cleanup ownership |
| [040](#iss-040) | P3 | R | Extensionless audio receives a synthetic `.asset` suffix |
| [041](#iss-041) | P3 | S/V | Telemetry, activity persistence, translation, and accessibility gaps |
| [042](#iss-042) | P3 | S | Display storage estimates omit real payload sizes |
| [043](#iss-043) | P2 | U/S | Changing volume during playback breaks the running preview |

## Data integrity and archives

### ISS-001

**Dialogue import drops conditional logic — P1, R.** [Source](../../src/stores/dialogueStore.js): `importDialogue` reconstructs edges without `type` or `data` and does not restore `conditions.json`.

Trigger: import an edge with `data.conditions.rules` and a matching condition definition. Observed: the stored edge retained endpoints but no rules/type; the conditions table remained empty. A conditional branch becomes unconditional after a round trip. Restore definitions and remap instances explicitly; regression must compare rule IDs, values, negation, mode, and edge type in standalone and nested imports.

### ISS-002

**Reimport retains removed nodes — P1, R.** [Source](../../src/stores/dialogueStore.js): graph import bulk-puts nodes but deletes/replaces edges and strings.

Trigger: import nodes Start/A/obsolete, then reimport the same dialogue GUID with Start/A. Observed: `obsolete` still exists. This creates ghost nodes and stale references. Choose explicit replacement versus merge semantics and apply them consistently in one transaction. Test removed nodes, rows, strings, edges, and audio together.

### ISS-003

**Cross-project import steals an existing dialogue — P1, R.** [Source](../../src/stores/dialogueStore.js): imported GUID is written to globally keyed `dialogues.id` without an ownership conflict check.

Trigger: import GUID `d1` into p1, then import `d1` into p2. Observed: owner became p2 and p1's dialogue count became zero. Allocate/remap copy IDs or explicitly reject cross-project collisions before mutation. Include child-graph, localization, and graph keys in the regression.

### ISS-004

**Decorator import loses property schemas — P1, R/S.** Sources: [dialogue importer](../../src/stores/dialogueStore.js), [project importer](../../src/stores/projectStore.js).

Standalone import reproduced a typed definition with a numeric property becoming `type: ''`, `properties: []`. Project import separately reconstructs decorators from `values` instead of restoring `properties` (source-confirmed). Instances then refer to definitions that cannot faithfully edit/interpret their values. Preserve schemas, make name/ID conflict policy explicit, and compare typed/defaulted properties after both import paths.

### ISS-005

**ZIP filename collision silently drops a dialogue — P1, R.** [Source](../../src/stores/projectStore.js): `exportProject` uses sanitized names as JSZip entry keys.

Trigger: export dialogues named `A B` and `A_B`. Observed: only `dialogues/A_B.mnteadlg` exists. Include stable identity or a collision-safe suffix and record any mapping needed by consumers. Test same names, punctuation, Unicode, and empty-after-sanitization names; exported archive count must equal intended dialogue count.

### ISS-006

**Replacement import can destroy data and still succeed — P1, R.** Sources: [project](../../src/stores/projectStore.js), [dialogue](../../src/stores/dialogueStore.js) import methods.

Trigger: an existing project plus replacement ZIP containing a corrupt nested dialogue. Observed: old dialogues were deleted, the nested importer swallowed its failure, and the project importer returned the project ID with zero dialogues. Some supporting records can be written before other validation fails. Parse/preflight all nested payloads before replacing data, stage a complete transaction, and propagate structured errors. Inject a failure at each phase and assert the original project survives unchanged.

### ISS-007

**Snapshot encryption drops Blob bytes — P1, R.** Sources: [snapshot](../../src/lib/sync/snapshot.js), [crypto](../../src/lib/sync/crypto.js), [audio import](../../src/stores/dialogueStore.js).

ZIP import can persist row audio as a Blob. Building a snapshot and encrypting/decrypting it reproduced `audioFile: {blob: {}}`. Encryption succeeds over already-lost content. Normalize binaries before JSON serialization or define a separate binary attachment protocol. Round-trip decoded bytes through import → snapshot → encrypt/decrypt → apply without requiring an intervening editor save.

### ISS-008

**Old Dexie database upgrades fail — P1, R.** [Source](../../src/lib/db.js): v2 changes auto-increment primary keys; v4 changes node/edge primary keys to compound identities.

Opening representative old v1 and v3 databases with the current class reproduced `UpgradeError: Not yet support for changing primary key`. A data-copy callback cannot run past an unsupported schema alteration. Plan a supported temporary-table/new-database migration with recovery/export options. Validate with actual old schema/data fixtures and interrupted migration, rather than only a fresh v9 database.

### ISS-009

**Category cycles can enter persistent data — P1, R/S.** Sources: [store](../../src/stores/categoryStore.js), [edit dialog](../../src/components/dialogs/EditCategoryDialog.jsx).

Create Root → Child, then reparent Root under Child. The operation succeeded in the isolated test. Parent-picker exclusion covers self, not descendants; store depth validation is not a cycle check. Path traversal lacks a visited set and can loop after this mutation. Reject descendant/self parents, verify project ownership, validate the proposed entire subtree depth, and bound traversal even for already-corrupt/imported data.

### ISS-010

**Import rejects an existing category prefix — P2, R.** [Source](../../src/stores/categoryStore.js): `importCategories` tests uniqueness of path segments before recognizing already-existing paths.

With Root.Child present, importing Root.Child.Grandchild reproduced “Category name must be unique within its tree.” Resolve/reuse existing path segments before validating new siblings/names. Test shared prefixes, duplicate paths within one file, and names repeated in different allowed trees.

### ISS-011

**Entity changes leave dangling references — P2, R/S.** Sources: [participant](../../src/stores/participantStore.js), [category](../../src/stores/categoryStore.js), [decorator](../../src/stores/decoratorStore.js), [condition](../../src/stores/conditionStore.js) stores.

Reproduced: renaming Speaker leaves a node's participant as Speaker; deleting Root leaves Child's parent ID pointing at the deleted record. Source also shows missing graph-instance reconciliation when definitions change/delete. Store-level schema checks do not comprehensively reject duplicate property names or nonexistent participant categories. Decide restrict/cascade/rewrite behavior for each relationship and make related writes atomic. Test referenced and unreferenced entities, nested descendants, invalid definitions/categories, property removal, and affected export/preview behavior.

### ISS-012

**Name-based references conflict with scoped uniqueness — P2, S.** Sources: [domain stores](domain-model.md), [project export](../../src/stores/projectStore.js), [preview](../../src/components/dialogue/DialoguePreviewOverlay.jsx).

Names can repeat across root category trees, but participant category fields and node participant references use names, and consumers use name-keyed maps/finds. Distinct records can resolve to the same category, participant, or thumbnail. Move durable references to IDs with presentation labels, or consistently use a qualified unique path. Test two roots with the same category leaf and participant name before changing compatibility behavior.

### ISS-013

**Snapshot clone fails complete remapping — P1, R.** [Source](../../src/lib/sync/snapshot.js): `applyProjectSnapshotAsNew`.

The clone received new dialogue/definition IDs while a node still referenced `snap-b` and `snap-dec`; loading its localized display name returned an empty string. Entries were rewritten to different key forms without matching node refs. No current UI call site was discovered for this exported API, limiting ordinary-user exposure. Build all ID/key maps first, rewrite every reference, and assert the clone contains no old owned IDs while preserving all locales/media.

### ISS-014

**Snapshot apply crosses project ownership — P1, R.** [Source](../../src/lib/sync/snapshot.js): `applyProjectSnapshot` deletes conflicting dialogue graph rows and puts incoming records.

Applying a snapshot for p-other containing existing `d1` changed `d1`'s owner to p-other. The transaction makes this overwrite atomic, not correct. Validate all nested ownership and reject/remap foreign ID collisions before deleting anything. Test malformed/overlapping snapshots and ensure unrelated projects remain byte-for-byte unchanged.

## Sync and localization

### ISS-015

**Remote overwrite and catalog commit are not coordinated — P1, S/V.** Sources: [actions](../../src/lib/sync/core/syncActions.js), [Drive](../../src/lib/sync/googleDriveClient.js).

Push derives revision from local metadata, overwrites without a remote revision/ETag precondition, then updates local state and catalog separately. Concurrent devices can lose changes; upload success plus catalog failure leaves divergent views. Full sync also pulls before executing a precomputed push plan. Introduce explicit conflict policy and conditional writes/commit recovery. Reproduce with two clients and injected failures after every phase; no live-provider concurrency test was run here.

### ISS-016

**Readable localization keys are not project-unique — P1, R.** Sources: [key generation](../../src/lib/localization/stringTable.js), [dialogue creation/save](../../src/stores/dialogueStore.js).

Dialogue slugs derive from names without project-wide uniqueness; node tokens are unique only inside a dialogue. The database key is project plus string key. Two dialogues with slug `same_name` and stable node token `same_start` reproduced one surviving entry owned by the second dialogue and blank display text in the first. Fixed Start identity increases the chance of equal tokens. Preserve a unique immutable dialogue namespace and validate collisions before writes. Test duplicate names, clone/import, and renames with differing translations.

### ISS-017

**Localization migration and default-locale seeding can skip durable work — P2, R.** Sources: [load/migration](../../src/stores/dialogueStore.js), [project locale update](../../src/stores/projectStore.js).

The loader upgrades the metadata version before testing the old version, then materializes refs before checking missing refs. Reproduced: a legacy graph loaded with metadata version 2 but no stored display-name key and zero string entries. Changing a saved graph's default from en to cs retained only en values; saving in en then failed with `missing_default_locale_value`. Seeding reads stored nodes whose inline text is stripped. Validate migration using original persisted state and commit marker/data together; seed from an explicit fallback locale. Test reopen/crash/default-locale changes and all translations.

### ISS-018

**Validation and localization flags promise more than they enforce — P2, R.** [Source](../../src/lib/localization/stringTable.js).

Raw localizable nodes/rows without refs and an empty entry list reproduced `{valid:true, errors:[]}`. Validation only inspects existing refs, so it does not prove required keys exist. Separately, normalizing `{enabled:false}` produced enabled true. Always-on localization may be intentional, but the flag cannot represent an off mode. Define the contract, validate required fields independently, and either remove the misleading flag or implement/test its semantics.

### ISS-019

**Malformed catalog becomes readable empty state — P1, S.** [Source](../../src/lib/sync/core/providerCatalog.js).

JSON parse failure can return null and then an empty normalized catalog without marking the read unavailable/corrupt. Later merging/writing can discard remote knowledge, including deletions. Distinguish not-found, valid-empty, malformed, transport-error, and unauthorized responses. Preserve the previous catalog and block destructive reconciliation on corruption; test invalid JSON and wrong schema separately.

### ISS-020

**Tombstones do not reliably dominate later pulls — P1, S/V.** Sources: [actions](../../src/lib/sync/core/syncActions.js), [planner](../../src/lib/sync/core/syncPlanner.js), [storage](../../src/lib/sync/syncStorage.js).

Deletion is applied before whole-project pulls; incoming snapshot records are not consistently filtered/rechecked against tombstones. A stale snapshot can restore a deleted dialogue. Remote-only project planning also needs tombstone coverage. Pending expired records are excluded from ordinary pending selection but protected from nonpending GC, allowing stranded intent. Apply deletion precedence throughout merge/apply and define expired-pending recovery. Exercise stale catalogs/snapshots and 30-day boundary cases.

### ISS-021

**Edits can disappear from sync scheduling — P1, S/V.** Sources: [sync store](../../src/stores/syncStore.js), [full-sync actions](../../src/lib/sync/core/syncActions.js), entity stores.

Scheduling while unavailable/busy can return without retaining durable work. Child changes do not consistently advance parent project `modifiedAt`, while reconnection planning relies on parent time/revision. The separate `updateEdges` operation does not itself update dialogue time or schedule a push. Equal revisions can also hide divergent content. A later successful sync can leave local edits unpushed. Persist an outbox/dirty revision in the same transaction as mutations and acknowledge only the uploaded revision. Test offline edits and edits made during an in-flight upload.

### ISS-022

**Steam bundle update/fallback can lose changes — P1, S/V.** [Source](../../electron/main.cjs): bundle read/write and logical file operations.

Every logical mutation rewrites the whole bundle with no per-profile queue or conditional remote write. Local write precedes cloud write; cloud failure can still produce a successful logical call. A later preferred cloud read can overwrite newer local state. Direct local writes are also interruption-sensitive. Serialize local operations, use atomic cache replacement, and retain upload intent/version comparison. Native failure and concurrent-operation scenarios were not executed.

### ISS-023

**Browser OAuth has no complete cancellation lifecycle — P2, S.** [Source](../../src/lib/sync/googleDriveAuth.js).

The implicit popup flow waits for a matching message without a timeout or popup-close check. Block/close the popup and the login promise can remain pending. Origin/state are checked, but source-window identity is not. Add timeout, blocked-popup detection, cancellation, source validation, and listener cleanup. Test denial, closure, expired callback, and a second login attempt without contacting a real account.

### ISS-024

**Local deletion and propagation intent are separate commits — P1, S/V.** Sources: [project deletion](../../src/stores/projectStore.js), [dialogue deletion](../../src/stores/dialogueStore.js), [tombstones](../../src/lib/sync/syncStorage.js).

Domain records are deleted before propagation is scheduled/persisted. A crash between those operations leaves remote data with no durable deletion intent and permits later restoration. Include the outbox/tombstone in the local deletion transaction, then publish asynchronously. Fault-inject process termination after each local write and reopen the profile.

### ISS-025

**Snapshots and operations can observe mixed state — P2, S/V.** Sources: [snapshot](../../src/lib/sync/snapshot.js), [DB proxy](../../src/lib/db.js), [Steam profile resolution](../../src/lib/sync/steamCloudClient.js).

Snapshot tables are read separately, while the proxy chooses a database from the active profile on access. Concurrent edits or a profile change can cross logical read boundaries. Store collections are also shared per entity, so late async loads can replace another route's view. Pin the database/profile for an operation, use a consistent read transaction, and discard stale loads by request/profile identity. Test controlled interleavings rather than relying on single-device smoke success.

### ISS-026

**Profile startup does not rehydrate UI preferences — P2, S/V.** Sources: [root](../../src/routes/__root.jsx), [UI store](../../src/stores/uiStore.js), [profile helpers](../../src/lib/profile/activeProfile.js).

Startup resolves Steam profile and explicitly rehydrates sync persistence, but not the already-created UI store. Memory may contain the previous namespace's view/locale settings while subsequent writes use the new namespace. Rehydrate/reset every profile-owned store after profile resolution and before rendering data. Verify two profiles with deliberately different settings and delayed Steam status.

## Editor, desktop, and lifecycle

### ISS-027

**Desktop onboarding fallback is not packaged — P2, S.** Sources: [loader](../../src/lib/onboarding/templateLoader.js), [path configuration](../../src/lib/runtimeConfig.js), [build files](../../package.json).

Fallback fetch expects `onboarding-example.mnteadlgproj`, but the tracked asset is only under `ExampleProject`, and no copy step/public counterpart was found. The observed `dist` lacks that fallback file. Offline/failed-network onboarding therefore cannot rely on it. Include it deterministically and test a packaged build with remote fetch blocked. Also bound remote fetch duration.

### ISS-028

**Decorator false/zero defaults become empty strings — P2, S.** [Source](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx): decorator instance creation uses `prop.defaultValue || ''`.

Boolean false and numeric zero are valid schema defaults but are replaced with `''`; condition creation correctly uses nullish fallback. Preserve false/zero with an explicit/nullish check and validate property types. Test string empty, boolean false, number zero, null, and missing defaults through create/edit/export.

**Implementation update:** the route uses `createDecoratorInstance` with nullish fallback. Executable regression preserves false, zero and missing defaults. Definition validation and archive round-trip acceptance belong to later phases.

### ISS-029

**History snapshots were not isolated — P2, S/V; initial evidence corrected.** At the baseline, [the route](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx) appended `{ nodes: newNodes, edges: newEdges }` directly. The initial claim of JSON cloning and consequent Blob loss was incorrect. Shared references could allow later in-place edits to change a checkpoint; there was no immutable snapshot contract.

**Implementation update:** [draft utilities](../../src/lib/editorDraft.js) sanitize runtime callbacks/object URLs and structured-clone snapshots, preserving unknown authored fields and Blob bytes. Undo/redo restore fresh clones. Regression checks snapshot isolation, exact bytes, a 50-entry cap and redo invalidation. Full save/export/sync byte-equality acceptance depends on archive/sync phases.

### ISS-030

**Dirty tracking relies on immediate updater execution — P2, S/V.** [Source](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx): `updateNodeData` mutates a local `didChange` inside the functional state updater, then checks it synchronously outside.

If React defers the updater, the outer check sees false and can miss dirty/history behavior. This is a scheduling-dependent risk, not a reproduced lost edit in this audit. Compute next state/change deterministically or put transition bookkeeping in a consistent reducer. Exercise batched/concurrent updates, row edits, navigation guard, and save indicator.

**Implementation update:** `useEditorDraft` applies reducer transitions outside React updater scheduling. Mounted StrictMode regression verifies one callback invocation, newer edits surviving an old save acknowledgement, and generation isolation. Save and save-before-export share a per-editor queue. Queue regression verifies order and recovery after rejection. Cross-tab/provider arbitration remains a repository-layer requirement.

### ISS-031

**Archive guards do not fully bound resource use or preflight — P2, S/V.** Sources: [project](../../src/stores/projectStore.js), [dialogue](../../src/stores/dialogueStore.js) importers.

JSON limits are checked after extraction, no aggregate expanded-byte ceiling is enforced, nested dialogue import has weaker limits, and some validation follows deletion/writes. Compressed-small archives can allocate large memory or fail after mutation. Validate declared/actual cumulative payloads, nesting/counts, IDs, and references before commit, with cancellation where practical. Resource-exhaustion behavior was not stress-tested.

### ISS-032

**Electron navigation/IPC checks are incomplete — P1, S/V.** [Source](../../electron/main.cjs): navigation policy, BrowserWindow setup, IPC handlers.

The navigation handler prevents only allowed external destinations; rejected external URLs are not uniformly cancelled. Internal file/dev-prefix handling is broad, sandbox is disabled, and IPC handlers do not independently verify the sender. These controls should be reviewed together because preload exposes native capabilities. Deny unintended navigation first and verify IPC origin/frame/capability. No exploitability or malicious-content execution was demonstrated.

### ISS-033

**Credential/encryption boundaries need explicit treatment — P2, S.** Sources: [sync store](../../src/stores/syncStore.js), [crypto](../../src/lib/sync/crypto.js), [Google auth](../../src/lib/sync/googleDriveAuth.js).

Remembered passphrases are stored in localStorage by default; account tokens reside in IndexedDB. Steam uses a deterministic profile-derived encryption passphrase. A distributed optional OAuth client secret cannot be treated as server-confidential. These are design exposure boundaries, not evidence of credential leakage. Use platform credential storage where applicable, deliberate retention choices, and truthful encryption claims; verify envelope version and credential-clearing behavior.

### ISS-034

**Achievement failure is not retried — P2, S.** [Source](../../src/lib/achievements/achievementTracker.js).

Local unlocked state is recorded before the native request. If Steam rejects/unavailable, a later call sees the local flag and skips retry. Separate earned/pending/acknowledged state and retry when native status becomes available. Test earning offline and subsequent restart/login without double-awarding local UI effects.

## Coverage, release, and remaining limitations

### ISS-035

**Tests do not cover core persistence contracts — P2, R/S.** Sources: [package scripts](../../package.json), [unit files](legacy-and-assets.md), [Playwright config](../../playwright.config.js).

The two library test files could not run under Node due to module resolution; they also assume a missing Jest-style runner. `App.test.js` is stale. CI lints a fixed allowlist and runs three smoke flows against the development server, not the production build. All those checks can pass with the reproduced data-loss defects. Configure a real unit/integration harness and prioritize migrations, archives, localization, media, and sync races. See exact results in [verification](verification.md).

### ISS-036

**Release/documentation guarantees are disconnected — P2, S.** Sources: [deployment](../../.github/workflows/deploy.yml), [packaging](../../package.json), [upload scripts](build-release-testing.md), [historical cloud guide](../../DocumentationSource/SteamAutoCloudSetup.md).

Pages deployment is independent of successful CI and uses a different install command. Native packaging/signing/cloud behavior lacks a CI matrix; macOS notarization is disabled. Upload scripts contain machine/account-specific assumptions, and Windows mirrors an external directory. README references a missing contribution guide; the old Steam cloud guide described obsolete layout and is now labeled historical. Gate deployment on validated artifacts and document/test platform-specific release prerequisites.

### ISS-037

**ZIP is not a complete project backup — P2, S.** Sources: [project export](../../src/stores/projectStore.js), [dialogue metadata](../../src/stores/dialogueStore.js).

Only used definitions are included, dialogue description/viewport are omitted, and imports regenerate timestamps/IDs for some records. These may be interchange choices, but exporting/reimporting cannot reconstruct all authoring state. Define interchange versus backup contracts explicitly and version any additions. Compare every persisted field and unused definition in a complete round-trip fixture.

### ISS-038

**Forward return targets may escape normalization — P2, S/V.** [Source](../../src/stores/dialogueStore.js): node import/remapping loop.

Node IDs are added to a map while each node's return target is rewritten. A target later in the array is absent from the map at that point; if its imported spelling/case needs normalization, the earlier return can remain stale. Build the full map first, then transform nodes/edges/rows/references. Test forward/backward references with normalized/case-variant IDs and special Start identity.

### ISS-039

**Object URL ownership is incomplete — P3, S/V.** Sources: [restore helper](../../src/lib/audioUtils.js), [loader](../../src/stores/dialogueStore.js), [row panel](../../src/components/dialogue/DialogueRowsPanel.jsx), [preview](../../src/components/dialogue/DialoguePreviewOverlay.jsx).

Restoration can allocate URLs before components create/track their own. Component cleanup only revokes URLs it owns. Repeated loads can therefore retain unowned Blob URLs. Establish a single allocation owner or return a disposer, then measure create/revoke counts across load/edit/preview/unmount. No long-session memory profile was performed.

**Implementation update:** restoration allocates no URLs. Row playback reuses stable sources and owns replacement/removal/unmount cleanup; preview owns per-row URLs. Chromium regressions measure live URL counts through StrictMode, edits, replacement, removal, preview completion, close/reopen and unmount. No long-session heap profile has been performed.

### ISS-040

**Extensionless audio naming contradicts intended behavior — P3, R.** [Source](../../src/lib/assetNaming.js), [executable regression](../../tests/e2e/library-regressions.spec.js).

An empty extension is sanitized with empty fallback, but the identifier helper changes falsy fallback to `Asset`; `sanitizeAudioFileName('voice')` reproduced `voice.asset`. Preserve an absent extension explicitly, or choose/document an intentional audio default. Test extensionless, leading/trailing dots, multiple dots, Unicode, and punctuation.

**Implementation update:** extension sanitization is conditional on an existing extension. The library regression failed before this change and passes after it; extensionless names no longer acquire `.asset`.

### ISS-041

**Observability and UI coverage have gaps — P3, S/V.** Sources: [telemetry/tours/activity](onboarding-observability.md), [interaction](ui-interaction.md).

Sentry's enabled accessor means initialized rather than actively reporting; numeric sample rates are not range-clamped, packaged release may be empty, and no source-map upload is configured. Sync logs have no rotation. Frequent activity writes can affect responsiveness. Hardcoded English remains in fallbacks/errors; canvas accessibility and mobile/native interaction are not comprehensively tested. Address each with a focused behavior/measurement check rather than equating component-library use or a smoke pass with coverage.

### ISS-042

**Storage display estimates omit actual media and newer tables — P3, S.** [Source](../../src/lib/storageUtils.js).

Fallback/project/dialogue estimates multiply counts by fixed weights and omit actual audio, thumbnails, localization, conditions, and sync metadata. Browser estimate is origin-wide, not necessarily current profile/project usage. These numbers can substantially understate real payloads. Label them approximate or measure encoded data, and keep them separate from the sync serializer's budget. Test a small graph with a large audio attachment.

## Subsequent user reports

### ISS-043

**Changing volume during playback breaks the running preview — P2, U/S.** Reported by the user after the initial investigation. Source: [DialoguePreviewOverlay.jsx](../../src/components/dialogue/DialoguePreviewOverlay.jsx), specifically `goToNode`, the preview initialization effect, and the volume-update effect.

**Reproduction:** start a dialogue preview, then change the volume slider while playback is running. **Actual, user-reported:** preview breaks and no longer works. **Expected:** only audio loudness changes; the current row, progress, timers, and subsequent graph traversal continue. The exact platform, audio fixture, and recovery behavior have not been established; no independent runtime reproduction was performed for this addition.

**Source-supported explanation:** `goToNode` depends on `volume`, so changing volume recreates that callback. The preview initialization effect depends on `goToNode`; its cleanup calls `clearTimer()` and `stopAudio()`. When the effect runs again, `wasOpenRef.current` is still true, so it returns without restarting playback. A separate volume effect updates an existing audio element, but cleanup has already cleared it. This dependency chain explains how a volume-only change can stop both audio and timed progression.

**Relationship to existing findings:** tracked separately from [ISS-039](#iss-039), which concerns ownership of restored audio object URLs. Both involve preview/media cleanup, but no shared underlying defect has been established. There is also no evidence that this symptom depends on imported audio, snapshot serialization, or undo history.

**Implementation update — reproduced and repaired:** mounted-overlay tests failed before the fix in normal and StrictMode rendering: muting cleared playback before the volume effect could update the active player, leaving the first row stalled. Volume now lives in a ref read by future audio creation and a separate live-player effect. Session lifecycle depends only on open state/root dialogue. Generation checks cancel stale child loads; cleanup owns timers, animation frames, audio and close timers. Chromium regressions pass mute/unmute, row completion, branch/child continuation, inherited child volume and close/reopen. Audio hardware output is stubbed; component timers/traversal and URL allocation are real. See [editor regressions](../../tests/e2e/editor-regressions.spec.js).

## Suggested repair order

First protect existing data: migrations, import staging/ownership, archive collisions, conditional logic, binary snapshots, and clone/reference integrity. Next make sync durable and conflict-aware, including tombstone precedence and Steam bundle writes. Then resolve domain/localization invariants, editor timing/media ownership, authentication lifecycle, and coverage/release gaps. A green lint/build/smoke run alone is insufficient to close any data-integrity finding.

