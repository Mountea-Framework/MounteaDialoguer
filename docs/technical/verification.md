# Investigation, verification, and coverage limits

Baseline: `00bcc915a7a3a55bd4ebf61bab2d0ba4f2c48068`, branch `dev`, package 0.2.0. Date: 2026-09-19. Host: Windows/PowerShell. This task changes documentation only. `CLAUDE.md` already existed as an untracked guidance file; its useful commands/architecture/branch guidance were retained and corrected while adding documentation navigation.

## Inspection coverage

The baseline contains 279 tracked paths and 180 JS/JSX/CJS/MJS files, totaling 37,179 physical lines using newline splitting. All code files were parsed with Babel for imports/exports/functions. The logic index contains 2,554 callable syntax nodes, including anonymous callbacks and class/object methods. The source map includes every baseline path exactly once. The configuration reference records all seven configured node types and their complete form attributes/defaults.

Source tracing followed startup/profile selection, entity stores, graph editing/saving, localization, preview, ZIP/media interchange, snapshot/catalog/tombstone synchronization, provider authentication/transport, Electron IPC/native storage, onboarding, achievements, commands/UI families, and build/release scripts. Static reachability identified disconnected helpers/components and old persistence. Detailed flow review plus full-file/callable indexing does not imply every input or scheduling order was executed.

## Executed checks

| Check | Actual result | Scope |
| --- | --- | --- |
| `npm run lint:ci` | Passed | Fixed manifest allowlist |
| `npx eslint src --ext js,jsx --format json --output-file tmp/documentation-eslint.json` | 166 files, 0 errors, 12 warnings | Eight React-refresh/export and four hook-dependency warnings |
| `npm run build` | Passed; Vite 6.4.1, 2,718 modules | Renderer compilation, approximately 11 seconds |
| `npm run test:e2e:smoke` | 3 passed, approximately 18.8 seconds | Chromium project creation, dialogue/editor opening, settings language selection |
| `node --test src/lib/assetNaming.test.js src/lib/dialogueImportAudio.test.js` | Both failed before assertions | Unresolved alias/extensionless imports; also assume an unconfigured Jest-style environment |
| Main isolated browser audit | Completed, outputs captured | Actual stores/Dexie/JSZip/snapshot/crypto modules |
| Additional localization/naming audit | Completed, outputs captured | Collision, migration, default-locale seeding, extensionless naming |

Build warnings: stale Browserslist data, roughly 580.49 kB minified vendor chunk, and `dialogueStore` imported both statically/dynamically. Smoke starts Vite development; it does not validate the production bundle merely because build ran first.

## Reproduction design

[Audit recipes](audit-recipes.md) preserves the executed scripts and full captured results. They launch Vite on `127.0.0.1:4189` and a fresh headless Chromium context. A routed empty HTML page avoids application startup side effects; external requests are aborted. A React refresh preamble allows importing actual JSX-dependent stores through Vite.

Dedicated active-profile keys are set before store imports. All data is synthetic and confined to disposable IndexedDB contexts. Migration fixtures use separate databases with representative old primary-key schemas; they demonstrate upgrade failure, not compatibility with every historical backup. Scripts close/delete test databases and close browser/server. No personal browser profile or production DB was used.

Native export is replaced by an in-memory preload stub that captures base64 and returns cancellation. No save dialog/external file write occurs. Sync remains disconnected and external requests blocked. Blob probes use synthetic bytes because JSON serialization loss is independent of audio decoding.

## Observed failures

| Probe | Observed result | Issue |
| --- | --- | --- |
| Import edge rules and condition definition | Rules/type lost; definitions empty | 001 |
| Import decorator schema | Empty type/properties stub | 004 |
| Reimport fewer nodes | Obsolete node remains | 002 |
| Import GUID into another project | Owner moved; original project count zero | 003 |
| Import without Start | Returns undefined, does not reject | 006 |
| Reparent Root below Child | Cycle persisted | 009 |
| Extend existing category path | Uniqueness error | 010 |
| Rename referenced participant | Node retains old name | 011 |
| Delete parent category | Child retains deleted parent ID | 011 |
| Clone snapshot | Old references and blank displayed text | 013 |
| Encrypt/decrypt Blob snapshot | Blob becomes `{}` | 007 |
| Apply snapshot with foreign dialogue ID | Existing ownership changes | 014 |
| Replace project with corrupt nested archive | Success ID, old dialogues gone | 006 |
| Export `A B` and `A_B` | One dialogue ZIP entry | 005 |
| Normalize disabled localization | Enabled true | 018 |
| Validate raw fields without refs | Valid, zero errors | 018 |
| Open old v1/v3 DBs | Unsupported primary-key-change error | 008 |
| Same slug/stable node token in two dialogues | One entry; first dialogue blank | 016 |
| Load legacy localization | Version 2, no persisted ref, zero strings | 017 |
| Default en → cs, save in en | `missing_default_locale_value` | 017 |
| Sanitize extensionless `voice` | `voice.asset` | 040 |

The first collision probe used an unrecognized token field and generated different tokens, so it did not prove a collision. Correcting it to `localizationNodeToken` reproduced the failure; the recipe preserves the corrected fixture/output. Matching dialogue names alone does not guarantee every field collides.

## Limits

- Native Electron launch, packaging/signing/notarization, Steam upload, and live Google/Steam operations were not exercised.
- Concurrency, crash recovery, React scheduling, long-session memory/performance, malicious archives, and Electron exploitability remain source-reviewed risks unless explicitly reproduced above.
- Mobile/tablet, other browsers, accessibility, and every translation were not comprehensively tested.
- Dependency internals/advisories, external game-engine consumers, artwork/source images, and every sample media payload were not audited. The sample ZIP structure was inspected.
- `.env`/`.env.local` values and personal feedback text were not read/copied. Tracking an environment file is not itself evidence of leaked secrets.
- The initial 42 issue entries are not proof that no other bugs exist. Some entries group closely related failures and distinguish reproduced, source-confirmed, and runtime-risk evidence. Subsequent user reports are recorded separately below.

## Maintaining evidence

Initial documentation validation completed with 22 area/reference Markdown files plus `CLAUDE.md`, 3,549 relative links checked, all 2,554 source-line links in bounds, all 279 baseline paths present exactly once, 42 unique issue entries, balanced code fences, and no trailing whitespace errors. `git diff --check` passed for tracked edits. At that check, Git status contained only the two existing documentation updates, `CLAUDE.md`, and the new `docs` tree; no application source changed.

After a fix, preserve its failing fixture, add a regression that runs in CI, and update issue status and area documentation together. Refresh file/function/configuration indexes when contracts change. Documentation validation checks relative links/anchors, source-line bounds, baseline inventory coverage, code fences, and whitespace. A passing compilation or smoke check is not sufficient evidence to close a data-integrity finding.

## Subsequent user report: preview volume

[ISS-043](issues.md#iss-043) records the user's report that changing volume during playback breaks preview, bringing the register to 43 entries. Source inspection traced `volume` → recreated `goToNode` → initialization-effect cleanup → cleared timers/audio, followed by the already-open guard skipping initialization. The symptom is user-reported and the dependency chain is source-confirmed; this addition did not independently reproduce playback, change application code, or rerun application tests. The existing isolated audit scripts do not cover this report.
