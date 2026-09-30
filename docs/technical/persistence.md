# Persistence, migrations, and profiles

Primary source: [db.js](../../src/lib/db.js). Related: [domain model](domain-model.md), [localization](localization.md), [synchronization](synchronization.md).

## Database selection and generation migration

The application writes to **generation 2 databases**. Local data uses `MounteaDialoguerDB__generation2`; another profile uses `MounteaDialoguerDB__<profileId>__generation2`. The original names remain untouched migration sources. Profile IDs accept only ASCII letters, numbers, underscores, and hyphens; invalid IDs are rejected instead of being silently aliased to another account.

`MounteaDialoguerDB` declares only the final primary keys, at generation-local Dexie version 1. On first open, [migration.js](../../src/lib/persistence/migration.js) opens an existing source dynamically without declaring an upgrade. It reads every source table in one read transaction, converts numeric entity/graph identities in two passes, resolves unique participant/category names to stable IDs, and preserves Blob audio and unknown record fields. It then writes the transformed tables, recovery diagnostics, and a completion marker in one target transaction. Only after that transaction does it activate `mountea-database-manifest::<sourceName>` in localStorage. A failed copy rolls back; an interrupted activation retries from the committed marker without overwriting later target edits. The manifest alone never proves completion. Source versions above 9 are rejected for forward compatibility.

Malformed references remain repair diagnostics; they are not replaced with fabricated text or arbitrary candidates. Multiple historical Start nodes retain one active identity and quarantine conflicting originals in `recoveryRecords`. The preserved source database remains the complete recovery source. Existing localized key strings are retained; the localization migration owns their content/key repair.

`getRepositoryContext()` asynchronously returns `{db, profileId, generation, signal, assertCurrent}`. New multi-step operations must use that captured `db` and call `assertCurrent()` before committing and before publishing results to UI state. Profile changes abort prior contexts; the compatibility `db` proxy remains for single-step callers and is not sufficient to protect a multi-step operation. `readProjectRecords(projectId, context)` reads all nine authoring tables in one consistent transaction.

Startup resolves Steam first, clears profile-owned entity stores, opens/migrates the selected database, rehydrates UI and sync preferences from defaults, and loads the account before mounting route content. Storage failures show a retry screen instead of allowing authoring against an uninitialized database. UI settings absent in a new profile revert to defaults. Global historical settings are inherited only by the local profile.

Recovery APIs in [db.js](../../src/lib/db.js): `getRecoveryDiagnostics(projectId?, context?)`, `assertProjectReady(projectId, context?)`, `revalidateProjectRecovery(projectId, context?)`, `repairIdentityReference`, and `restoreQuarantinedNode(diagnosticId, restoredNode, context?)`. Export/sync callers must invoke `assertProjectReady`. Revalidation marks repaired diagnostics resolved while retaining their originals/history. Quarantined nodes require explicit restoration under a distinct identity. Project settings expose assignment/restoration; the root recovery summary exposes global/orphan diagnostics even with no projects. Downloads preserve original identities and binary evidence; mapped location fields separately identify current records.

## Generation 2 schema

Dexie `stores()` describes primary keys and indexes, not a strict object-field schema. Unindexed fields are still stored.

| Table | Primary key | Additional indexes |
| --- | --- | --- |
| `projects` | `id` | `name`, `createdAt`, `modifiedAt` |
| `dialogues` | `id` | `projectId`, `name`, `createdAt`, `modifiedAt` |
| `participants` | `id` | `projectId`, `name`, `category` |
| `categories` | `id` | `projectId`, `name`, `parentCategoryId` |
| `decorators` | `id` | `projectId`, `name`, `type` |
| `conditions` | `id` | `projectId`, `name`, `type` |
| `nodes` | `[dialogueId+id]` | `dialogueId`, `type` |
| `edges` | `[dialogueId+id]` | `dialogueId`, `source`, `target` |
| `localizedStrings` | `[projectId+key]` | `projectId`, `dialogueId`, `nodeId`, `rowId`, `field`, `modifiedAt` |
| `syncAccounts` | `provider` | `accountId`, `email`, `expiresAt` |
| `syncProjects` | `[projectId+provider]` | `projectId`, `provider`, `revision`, `remoteFileId`, `lastSyncedAt` |
| `syncDeletions` | `[projectId+provider]` | `projectId`, `provider`, `deletedAt` |
| `syncCatalogState` | `[provider+profileId]` | `provider`, `profileId`, `catalogRevision`, `fetchedAt`, `status` |
| `syncTombstones` | `[provider+entityType+entityId]` | `provider`, `entityType`, `entityId`, `projectId`, `deletedAt`, `expiresAt`, `pending`, `acknowledgedAt` |

Additional generation 2 tables:

| Table | Primary key | Purpose |
| --- | --- | --- |
| `projectState` | `projectId` | Current local revision ID, sequence, modification time |
| `projectRevisions` | `id` | Immutable project revisions with parents and authored payload |
| `syncOutbox` | `id` | Durable provider upload intent; includes `[provider+projectId]` lookup |
| `syncConflicts` | `id` | Competing revisions, indexed by project/provider/status |
| `recoveryRecords` | `id` | Unresolved/resolved diagnostic, affected path, preserved original |
| `migrationState` | `key` | Transactional generation completion marker |

`participants.categoryId` is indexed in addition to the legacy name projection. `syncAccounts` is a legacy credential migration source. Browser secrets now live in memory; desktop persistence requires OS-protected storage. Successful secure migration or reauthentication removes active-generation plaintext credentials; the original historical database remains untouched. Legacy sync tables remain for compatibility reads. Active synchronization uses `projectRevisions`, `projectState`, `syncOutbox` and `syncConflicts`; pending old tombstones remain retryable regardless of age.

## Migration history

| Version | Change |
| --- | --- |
| 1 | Auto-increment primary keys for initial seven entity/graph tables |
| 2 | Switch primary key declarations to UUID-style `id` |
| 3 | Index `parentCategoryId` on categories |
| 4 | Compound node/edge keys; upgrade callback attempts clear/re-add |
| 5 | Accounts and project sync metadata |
| 6 | Condition definitions |
| 7 | Localized string table |
| 8 | Legacy sync deletion table |
| 9 | Catalog state and generic tombstone ledger |

**Historical failure, replaced:** the former in-place v1/v3 upgrade failed before its repair callback. Generation 2 reads those schemas without upgrading them. Executable fixtures now verify every historical version 1–9, rollback on injected quota failure, interruption after copy, forged/incomplete manifests, ambiguous references, retained media, delayed Steam profile initialization, and profile isolation. See `tests/e2e/persistence-regressions.spec.js`.

## Transaction boundaries

| Operation | Atomic scope | Work outside transaction |
| --- | --- | --- |
| Graph save / edge update / domain mutation | All affected authoring records, project sequence, immutable revision and outbox intent | Consistent read, transformation, localization and media normalization; UI refresh and retry notification |
| Project delete | Authoring removal, deletion revision, project state and durable intent | Preparation, UI refresh and provider delivery |
| Dialogue delete | Resulting project snapshot without dialogue/graph/strings, revision and intent | Protected-reference checks and preparation |
| Project/dialogue import | Complete prepared replacement/copy, project state, revision and intent | Bounded extraction, validation, full identity remapping and media preparation |
| Remote snapshot application | Authoring, project state and exact remote revision metadata; no local echo intent | Decode, hash/ancestry validation and later provider delivery bookkeeping |
| Snapshot cloning | Remapped authoring, new project state, revision and intent | Two-pass identity/reference transformation |
| Recovery restoration | Authoring, resolved diagnostic, revision and intent | User review, media preparation and validation |

A transaction makes enclosed writes atomic, not remote upload or the entire UI operation. Reads capture a consistent project sequence; commit rechecks that sequence and rejects stale preparation. `mutateProject` serializes changes per database/project and uses browser locks across tabs. Provider-specific delivery records acknowledge the exact immutable revision; a late upload cannot mark a newer edit synchronized. These boundaries replace the historical deletion crash window and partial import behavior.

## localStorage and sessionStorage

| Key/family | Scope and use |
| --- | --- |
| `mountea-active-profile-id` | Global active profile selector |
| `mountea-dialoguer-ui::<profile>` | Zustand UI preferences, including content locale map |
| `mountea-dialoguer-sync::<profile>` | Provider, nonsecret preferences, last sync time, client ID and login prompt preference; no new plaintext passphrases |
| `mountea-achievements-*::<profile>` | Unlock ledger, playtime minutes, last activity |
| `mountea-google-client-id` | Global override, not profile-scoped |
| `mountea-dialoguer-theme` | Global light/dark/system choice |
| i18next detector key | Global UI language preference |
| `onboarding-dashboard`, `onboarding-dialogue-editor` | Global completion flags |
| `mountea-dialoguer-auth-state` | sessionStorage OAuth state during web auth |
| `project-guid` | Legacy sessionStorage identity used only by old helpers/hooks |

`readProfileScopedItem` copies a legacy unscoped value only for the local profile and leaves the original key. Other profiles start with defaults. UI/sync Zustand adapters use their explicit profile-aware rehydration. Storage access can fail; initialization must surface migration/storage failures rather than mount unready authoring routes.

## Capacity and diagnostics

[storageUtils](../../src/lib/storageUtils.js) reports `navigator.storage.estimate()` separately as origin-wide usage/quota. Project/dialogue payload estimates measure canonical UTF-8 JSON including encoded media, localized strings and definitions. A dialogue estimate includes project-level supporting definitions, so summing dialogue estimates double-counts shared data. These are payload estimates, not ZIP sizes or allocated IndexedDB bytes. Provider payload limits remain separate from local storage estimates.

To investigate safely, inspect database names/profile first, download original recovery evidence, then compare dialogue records, compound graph keys and string references. A missing project after Steam login may be in `local`, not deleted. Retained source databases and revision history preserve available evidence; they cannot reconstruct strings or media destroyed before migration. Complete project backups remain the portable recovery mechanism.
