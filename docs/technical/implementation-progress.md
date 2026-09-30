# Implementation progress: ISS-001–ISS-043

This is the durable implementation ledger for the approved nine-phase repair plan. The [issue register](issues.md) preserves original evidence; this file records implementation work without rewriting historical findings as resolved prematurely. A phase or issue is complete only when its acceptance checks have run successfully. No blanket closure follows from lint, build, or smoke results.

## Accepted behavior

- Preserve existing databases through a validated, resumable copy into a new generation; retain originals for recovery.
- Preserve both competing sync revisions and require explicit conflict resolution.
- Export complete authoring backups, including unused definitions, translations, metadata, and media.
- Block deletion of referenced entities until references are removed or reassigned.
- Treat localization as always on and remove the misleading disable setting.
- Keep Steam setup automatic and describe its protection as Steam account/cloud access control, not application encryption.
- Report unrecoverable historic loss; never manufacture missing content.

## Phases and acceptance gates

| Phase | State | Acceptance evidence / remaining external gate |
| --- | --- | --- |
| 1. Executable regressions | Locally verified | All 132 focused regressions and 3 smoke flows pass; CI wiring updated, remote CI execution remains external |
| 2. Preview/editor state | Verified | 7 editor + 4 library cases; exact archive/snapshot bytes, repository cross-tab commits and production desktop/mobile flows pass |
| 3. Persistence/domain integrity | Verified | 15 persistence + 14 domain + 7 repository cases, mounted recovery and durable mutation integration pass |
| 4. Localization | Verified | 10 focused cases plus archive/sync/domain integration and six-language product checks pass |
| 5. Archives/snapshots | Verified | 12 archive cases plus repository/localization/sync exact-byte round trips and production artifact integration pass |
| 6. Durable sync | Locally verified | 21 sync cases and native immutable Steam failure tests pass; live Google/Steam accounts remain external |
| 7. Auth/native boundaries | Locally verified | 10 auth + 5 native cases pass; live providers, signing and non-Windows startup remain external |
| 8. Product/observability | Locally verified | 17 product cases plus production desktop/mobile/offline tests pass; real Sentry delivery and Steam achievements remain external |
| 9. Release/documentation | Locally verified | 6 release cases, maintained lint, one build, 7 exact-artifact production tests, attestation and actual Windows unpacked-package startup pass; signing/non-Windows/remote CI remain external |

## Issue ledger

Status meanings: **Verified** = focused regression plus relevant local integration gate recorded; **Locally verified** = local implementation and regression gates pass but the named external service/platform/release gate remains unpassed. Neither status certifies unexecuted external gates. Earlier dated sections below are historical checkpoints superseded by the final integrated gate.

| Issue | Phase | Status | Evidence / next gate |
| --- | --- | --- | --- |
| ISS-001 | 5 | Verified | Preserve imported edge rules and condition definitions |
| ISS-002 | 5 | Verified | Replacement removes obsolete nodes/rows/strings |
| ISS-003 | 5 | Verified | Cross-project identity isolation |
| ISS-004 | 5 | Verified | Definition schema fidelity |
| ISS-005 | 5 | Verified | Collision-safe archive entries |
| ISS-006 | 5 | Verified | Failed nested import leaves destination unchanged |
| ISS-007 | 5 | Verified | Exact media bytes through snapshot/encryption/application |
| ISS-008 | 3 | Verified | Historical versions 1–9, source preservation, quota rollback/interrupted activation and mounted repair pass (15 persistence + 14 domain cases). |
| ISS-009 | 3 | Verified | Cycle/ownership/subtree-depth and bounded traversal pass in 14 domain cases; archive/sync integration passes. |
| ISS-010 | 3 | Verified | Shared category path prefix reuse and atomic import pass in domain and archive suites. |
| ISS-011 | 3 | Verified | Protected references, typed schema compatibility and canonical archive/repository validation pass. |
| ISS-012 | 3 | Verified | Stable category/participant identity, mounted repair and exact binary/orphan recovery pass. |
| ISS-013 | 5 | Verified | Complete clone remapping and localized text |
| ISS-014 | 5 | Verified | Reject foreign ownership before mutation |
| ISS-015 | 6 | Locally verified | 21 sync cases cover independent clients, all-parent/three-head conflicts, explicit choices and stale resolution; live providers remain external. |
| ISS-016 | 4 | Verified | Project-wide key ownership and namespace remapping pass in 10 localization cases and archive/sync round trips. |
| ISS-017 | 4 | Verified | Atomic localization migration, fallback seeding and injected write rollback pass; repository integration passes. |
| ISS-018 | 4 | Verified | Required key ownership/reference validation and always-on config pass; product/production flows pass. |
| ISS-019 | 6 | Locally verified | Corrupt catalogue rejects without authored writes; real store list/pull/full modes pass with deterministic transport; live providers external. |
| ISS-020 | 6 | Locally verified | Delete/edit conflicts, dialogue deletion, stale snapshot prevention and indefinite historical retry pass; live providers external. |
| ISS-021 | 6 | Locally verified | Offline restart, in-flight edits, revision/provider acknowledgement, lost reply/quota retry and bounded worker pass; live providers external. |
| ISS-022 | 6 | Locally verified | Immutable Steam files, two-client lost-reply retries and atomic cache/failure tests pass in native/sync suites; live Steam external. |
| ISS-023 | 7 | Locally verified | 10 auth cases include browser popup settlement/source, native cancellation and delayed real Drive refresh cancellation across profiles; live Google external. |
| ISS-024 | 6 | Verified | Authoring/revision/outbox atomic commits and deletion quota rollback pass in repository/domain/sync suites. |
| ISS-025 | 3 | Verified | Consistent project reads, captured contexts, cross-tab arbitration and stale/hung provider profile cancellation pass. |
| ISS-026 | 3 | Verified | Delayed Steam profile initialization, UI/sync rehydration and stale entity-store load rejection pass. |
| ISS-027 | 8 | Verified | Byte-identical bundled offline template, production offline onboarding and exact packaged renderer inventory pass. |
| ISS-028 | 2 | Verified | Nullish instance defaults preserve false/zero; editor regression. Definition schema/archive validation remains ISS-011/004 |
| ISS-029 | 2 | Verified | Structured-clone history cap/redo and Blob/unknown fields pass; archive/encrypted snapshot/application exact bytes pass. |
| ISS-030 | 2 | Verified | StrictMode draft/save-N acknowledgements, ordered save/export queue and repository cross-tab/stale-prepared commit arbitration pass. |
| ISS-031 | 5 | Verified | Streaming 128 MiB aggregate extraction ceiling and preflight |
| ISS-032 | 7 | Locally verified | Exact IPC/frame/entry/capability tests pass; actual Windows packaged startup recorded below; macOS/Linux startup external. |
| ISS-033 | 7 | Locally verified | Memory-only browser secrets, failure-preserving migration, native vault/basic_text checks and encryption envelope pass; live providers external. |
| ISS-034 | 8 | Locally verified | Earned/pending/acknowledged retry and profile isolation pass in product cases; live Steam achievement acknowledgement external. |
| ISS-035 | 1, 9 | Locally verified | All 132 focused regressions + 3 smoke and 7 production cases pass; maintained lint and CI/package matrix wired; remote CI execution external. |
| ISS-036 | 9 | Locally verified | Single-build fingerprint/attestation and packaging consume exact tested bytes; final local native result below; signing/non-Windows/deployment gates external. |
| ISS-037 | 5 | Verified | Every authored field and unused definition backed up |
| ISS-038 | 5 | Verified | Two-pass forward/backward reference remapping |
| ISS-039 | 2 | Verified | Restoration allocates zero URLs; StrictMode row edit/replacement/removal/unmount and preview completion/close resource counts pass |
| ISS-040 | 2 | Verified | Library regression observed red before fix and green after preserving absent extension |
| ISS-041 | 8 | Locally verified | 17 product cases cover bounded activity/log writes, release telemetry identity, six-language failures and keyboard/axe flows; production checks pass; real Sentry external. |
| ISS-042 | 8 | Verified | Canonical serialized payload estimates include binary media, unused definitions and localized records; origin quota remains separately reported. |
| ISS-043 | 2 | Verified | Mounted normal/StrictMode mute/unmute, row/branch/child continuation, volume inheritance and close/reopen tests; red before fix, green after |

## Phase 1 implementation evidence

- `tests/e2e/helpers/moduleHarness.js` serves an empty document, selects an isolated test profile before importing stores, installs the Vite React refresh preamble, and blocks off-origin requests. Playwright contexts isolate tests; pages in one context intentionally share browser storage.
- `library-regressions.spec.js` ports every assertion from the two formerly dormant library suites into the real application modules. Row audio tests now exercise real JSZip folder objects. The obsolete `App.test.js` is removed; actual application startup remains covered by `smoke.spec.js`.
- `projectFixtures.js` supplies complete authored data with binary audio, multiple locales, unused definitions, metadata, colliding display names, child references, and divergent revisions. Its historical database factory reproduces versions 1–9 without invoking current migration code.
- `providerFake.js` supplies independent clients sharing remote state, deterministic call gates, duplicate listings, faults before mutation, and lost replies after successful mutation. These controls support later sync contract tests; testing the fake itself does not establish sync correctness.
- `npm run test:regressions` selects all files matching `regressions`, including subsequent area suites. `npm run lint:ci` now invokes the maintained-source lint command covering renderer, Electron, scripts, tests, and configuration. Explicit disconnected legacy exclusions are documented in `.eslintrc.cjs`.

First focused run: `PLAYWRIGHT_PORT=4192 npx playwright test tests/e2e/library-regressions.spec.js tests/e2e/foundation-regressions.spec.js --workers=1 --output=tmp/harness-results` produced **7 passed, 1 failed**. The failure reproduces ISS-040: `name with no ext` becomes `name_with_no_ext.asset`. No expected-failure annotation or skip masks this defect.

Expanded lint initially found four errors outside the harness ownership: `electron/main.cjs:383` (`no-control-regex`) and lines 1298, 1307, 1356 (`no-mixed-spaces-and-tabs`). These are assigned to native work; lint rules were not disabled to hide them. Existing React refresh/hooks warnings remain visible.

## Phase 2 implementation evidence

`PLAYWRIGHT_PORT=4191 npx playwright test tests/e2e/editor-regressions.spec.js tests/e2e/library-regressions.spec.js tests/e2e/smoke.spec.js --workers=1 --output=tmp/editor-green-results`: **13 passed**. After adding shared save/export serialization and its regression, a final editor-only run passed **7/7**. Targeted lint of all edited editor/media modules and tests reports zero errors/warnings. Preview tests mount actual components and exercise real timers, graph traversal and URL ownership; audio hardware output is stubbed. Draft tests mount the actual hook under StrictMode. These are local browser gates, not native/cloud release verification.

## External release gates

Live Google/Steam testing requires suitable test accounts and credentials. Public native release requires the relevant signing/notarization credentials. Windows/macOS/Linux package startup must run on the applicable platform. Missing access is an explicit unpassed release gate; provider fakes, browser smoke, or documentation are not substitutes. Do not publish credentials or user-authored data in test artifacts or logs.

## Continuation and closure

Implement incremental reviewable changes, update this ledger with the exact relevant test result, and update area documentation as behavior changes. Preserve the source-map/logic-index baseline as historical navigation until a deliberate documentation refresh. Final closure requires all 43 findings to have focused evidence, the complete backup round trip to pass, and all required production/native/provider gates to pass.

## Phase 4 implementation evidence

The five initial localization regressions failed against actual modules, then passed after repair. The final focused run passed **10 localization tests plus 3 application smoke tests** on port 4192. Owned localization/store/settings/test files pass ESLint.

Implemented project-wide namespace reservation/rekeying with all surviving locale values preserved; original-state migration with atomic graph/string/version writes; repair diagnostics for missing content; previous-default seeding with explicit blank preservation; configured-reference/ownership/token/default validation; always-on normalized config and UI guards. Load/save/create/default updates capture repository contexts; read-only preview reads a consistent pinned snapshot. Tests include injected write failure and failed locale-change rollback.

Remaining integration: Phase 5 archive/snapshot preparation must call the shared namespace/remapping and validation helpers. Phase 6 must replace store-local transactions plus `schedulePush` with the durable project mutation API so authoring data and revision/outbox intent commit together. Other top-level store loaders still require complete stale-profile review. Existing issue entries remain historical and are not globally closed by this focused result.

## Phase 3 foundation evidence

`PLAYWRIGHT_PORT=4193 npx playwright test tests/e2e/persistence-regressions.spec.js tests/e2e/smoke.spec.js --workers=1 --output=tmp/persistence-results`: **18 passed** (15 focused persistence regressions plus 3 application smoke flows). Targeted lint passes. Coverage includes historical schemas 1–9, numerical forward references, Blob retention, transaction quota rollback, interrupted manifest activation, forged incomplete activation, ambiguous name preservation and export gate, duplicate Start quarantine/explicit restoration, repair revalidation history, invalid profile collision rejection, context abortion, UI defaults, and delayed Steam selection before route rendering.

Repository repair/context APIs are implemented in `src/lib/db.js`; generation schema and pure migration are in `src/lib/persistence/`. No user database was used in tests. Original source databases remain untouched. Legacy plaintext account records are preserved pending the separate secure credential migration; repository APIs alone do not claim every store has been migrated to captured contexts.

## Phase 3 domain evidence

Domain regression suite on port 4191 (`tmp/domain-results`): **11 passed**. Cycle/ownership/depth rejection, shared import prefixes, protected category/participant/definition/dialogue/return references, stable identity with duplicate display names, typed schema compatibility, stale profile loads, mounted repair selection, exact binary quarantine restoration, absent-orphan retention and injected outbox quota rollback pass. Recovery restore and domain mutations use canonical authoring/revision/outbox transactions. ISS-009–012 remain integration-scoped until archive/sync callers and production checks finish; no blanket issue closure.

## Phase 7 native/auth checkpoint

`PLAYWRIGHT_PORT=4192 npx playwright test tests/e2e/auth-regressions.spec.js tests/e2e/native-regressions.spec.js --workers=1 --output=tmp/native-results`: **14 passed**. Owned native/auth modules and tests pass ESLint. Browser OAuth settlement/source checks, encryption envelope validation, memory-only browser secrets, failure-preserving secure migration, stale-profile account rejection, exact IPC/frame/entry guards, bounded capability payloads, secure vault replacement/basic_text rejection, immutable two-client Steam retries and bounded redacted logs are covered against actual modules.

`npm run build` passed. `node scripts/check-electron-startup.mjs` passed on Windows with real Electron and the built renderer, hidden window, disposable preconfigured user data, disabled Steam channel and blocked external HTTP(S). Sandbox, preload IPC, ready renderer and navigation denial were asserted. The initial launcher attempt exposed inherited ELECTRON_RUN_AS_NODE; the helper now removes it. No live accounts, signing, packaged installation or non-Windows startup was validated.

## Phase 5 canonical archives and repository evidence

Final focused run on port 4193, `tmp/archive-final-results`: **29 passed** (12 archive, 7 repository, 10 localization). Three application smoke tests passed in the immediately preceding integration run. Owned module/store/UI/test lint passed. Canonical records now sort by table identity so full archive and encrypted-snapshot application comparisons survive IndexedDB ordering; embedded authoring order is preserved. Tests cover exact audio/thumbnail bytes and unknown metadata, unused definitions, legacy bundled imports, child/forward-return remapping, explicit replacement and obsolete record removal, atomic storage rollback, foreign ownership, cross-tab serialization, stale prepared commits, exact remote metadata/no echo, malformed records, original ZIP local/central/Unicode paths, streamed CRC corruption rejection, nested actual 128 MiB limits and mounted copy/replace choices. Initial cross-tab and mounted-component harness failures were corrected, and the binary integration regression exposed and drove the canonical table-order repair. These are local data-contract gates; live provider and signed package gates remain separate.

## Phase 6 immutable protocol integration checkpoint

`PLAYWRIGHT_PORT=4191 npx playwright test tests/e2e/sync-regressions.spec.js --workers=1 --output=tmp/sync-results`: initial **12/12 passed**, then expanded **16/16 sync cases passed** alongside 12/13 domain (translated recovery panel lacked harness i18n initialization; corrected). Next expanded run: **29/31 passed** (18 sync + 13 domain); two new fixture setup failures corrected and targeted rerun passed both. Full final expanded gate remains pending.

New store writer and compatibility sync actions use immutable revision objects, exact provider/revision acknowledgements, parent DAG conflict detection and global explicit local/remote/both controls. Legacy catalogue writer disabled; legacy encrypted Steam reads use its historical key while new Steam records rely on account/cloud protection. List transport is read-only; pull does not publish; legacy tombstones persist indefinitely. Tests cover independent client conflicts, old deletion resurrection, queue failures, mounted deleted-project conflict UI, stale resolution, 20k history/cycles/missing ancestors, exact Google encrypted media, three competing heads and stale-profile upload. Detailed pending work is in handoff-domain-sync.md; no live-provider release gate is inferred.

## Phase 8 product evidence

Product suite on port 4192, `tmp/product-final-results`: **17/17 passed**. Auth/native suite in the preceding combined run: **15/15 passed** (`tmp/product-resume-results`), including delayed real Drive refresh cancellation across profiles. Targeted ESLint of owned product/store/native/auth modules and tests passed with no diagnostics. A subsequent focused archive dialog check passed with actionable 128 MiB limit and original entry path assertions (`tmp/product-limit-results`).

Coverage includes byte-identical offline onboarding fallback and stalled fetch cancellation; release identity/native renderer manifest parity; development telemetry disablement and sample clamps; achievement retry/acknowledgement/profile isolation; bounded captured-profile activity writes; canonical media payload estimates; six-language real project/dialogue archive failures and protected domain deletion references; keyboard archive selection/focus return; desktop graph undo/redo/save; mobile drawer focus return/node creation/no horizontal overflow; and axe checks of these controls. Mobile verification exposed a missing graph subscription to device override events; the route now updates the graph mode when the supported override changes.

Shared error presentation translates action/reason independently of internal English exceptions, retaining structured codes, record identities and paths. Archive size limits, corrupt/unsupported archives, quota, repair and domain reference failures have actionable localized reasons. Project recovery and import panels use this same presentation; downloaded original evidence remains unchanged. Global recovery report strings exist in all six locales. Production artifact/native package integration remains owned by the release gate; these checks do not certify live provider accounts, Steam achievements, signing or non-Windows startup.

## Final local domain and immutable synchronization gate (2026-09-28)

Focused run on port 4191, `tmp/sync-final-results`: **50 passed** (14 domain, 15 persistence, 21 sync). Owned ESLint passed. This supersedes the earlier expanded-gate pending notes above. The prior 34/35 result was a stale text selector after localized recovery presentation; corrected structural selection passed in the complete run.

Root-mounted recovery now exposes orphan/global evidence with zero projects, points owned diagnostics to project settings, and preserves original IDs and binary evidence through downloadable reports. A historical numeric v1 missing-owner fixture checks exact Blob bytes, original media metadata, typed arrays, ArrayBuffer and Date encoding; unresolved state stays intact. Existing historical v1/v3 repairs remain independent by mapped node/row identity. Migration diagnostics retain pre-remap originals across all transformed record tables.

Immutable synchronization passes independent-client conflicts, all-parent and three-head keep-both resolution, delete/edit races, dialogue deletion, old snapshot prevention, expired historical tombstones, corrupt catalogue rejection, absent/cyclic/deep history, exact provider/revision retry after lost reply and quota failure, in-flight edits, real store list/pull/full modes, bounded retry/cleanup, metadata-only queue counts, encrypted Google media and stale/hung-profile cancellation. The root owns a single retry worker; the conflict panel no longer creates a second timer.

ISS-009–012, ISS-015, ISS-019–021, ISS-024 and the domain/sync portions of ISS-025–026 have focused local contract evidence. Complete integrated release validation is recorded separately by the release worker; live Google/Steam, production signing/notarization, real Sentry and non-Windows native gates remain external. No blanket closure or live-provider success is inferred.

## Final integrated local gate (2026-09-30)

All source owners reached codefreeze before the final build. `npm run lint:ci` passed with **0 errors, 12 existing hook/refresh warnings** (`tmp/integrated-lint.log`). `PLAYWRIGHT_PORT=4193 npx playwright test regressions tests/e2e/smoke.spec.js --workers=1 --output=tmp/integrated-final-results` passed **135/135** in 1.5 minutes (`tmp/integrated-final-tests.log`): 12 archive, 10 auth, 14 domain, 7 editor, 4 foundation, 4 library, 10 localization, 5 native, 15 persistence, 17 product, 6 release, 7 repository, 21 sync and 3 smoke. No skips or expected failures hide defects.

`npm run build` ran once and passed (`tmp/integrated-build.log`); visible Browserslist age and bundle-size warnings remain nonblocking. `PLAYWRIGHT_PRODUCTION_PORT=4195 npm run validate:artifact` then passed **7/7 production tests** in 30.3 seconds and wrote the attestation (`tmp/integrated-artifact.log`, `tmp/production-results`). Coverage includes desktop undo/redo/save and axe, mobile keyboard drawer/focus/node creation/overflow and axe, actual offline template import with external HTTP blocked, served artifact identity/template bytes/absence of development modules and maps, and all three smoke flows.

The validated release is `mountea-dialoguer@0.2.0+local.997a40319ba6f23db44b5b0f51294e8e74a564aa.dirty`; renderer inventory SHA-256 is `524e1b58f623c45d6fed05d77ad47563b8efdc25f13d6bc4722e6ca3994e75c2`. `reportingEnabled` is **false**: private maps were stripped, and no actual Sentry upload/delivery was performed. The inventory/attestation bind these local bytes; the dirty release name is not a source-control commit or a signed provenance claim.

`npm run electron:pack` consumed this artifact without rebuilding and passed on Windows (`tmp/integrated-package.log`). `MOUNTEA_PACKAGED_EXECUTABLE=release/win-unpacked/Mountea Dialoguer.exe node scripts/check-electron-startup.mjs` passed (`tmp/integrated-packaged-startup.log`): real packaged hidden renderer, disposable profile, blocked provider HTTP(S), sandbox/context isolation, no Node integration, preload calls, denied unexpected navigation, and byte-for-byte equality of every embedded renderer file including validation records. The first attempt exposed that Playwright main-process evaluation has no global CommonJS `require`; the helper now constructs `require` from Node builtins. Targeted lint and the actual packaged rerun passed. This helper-only repair did not rebuild or modify the validated renderer/package. Builder emitted a dependency deprecation warning; no public signing or installer claim follows from this local unpacked gate.

Current documentation/indexes were refreshed after codefreeze. Current source index: **359 files / 3,562 callables**. `git diff --check` passed; current documentation links resolve, with removed historical test paths intentionally retained only in baseline indexes. Earlier pending notes above record intermediate checkpoints, not remaining local implementation tasks.

**External gates remain unpassed:** live Google and Steam accounts, real Steam achievements/cloud acknowledgement, actual Sentry upload/delivery, production signing/notarization, macOS/Linux packaged startup, remote CI execution and publishing/deployment. Local provider fakes and unsigned Windows startup do not close them. No commit, publication, Steam staging/upload or deployment was performed.

Accessibility evidence is scripted real-browser desktop/mobile keyboard, focus and axe coverage. Human manual keyboard/device and assistive-technology review has not been performed; automated results do not constitute comprehensive accessibility sign-off.
