# Import, export, and interchange formats

Current implementation: [canonical project](../../src/lib/persistence/canonicalProject.js), [archive parser/writer](../../src/lib/persistence/projectArchive.js), [identity remapping](../../src/lib/persistence/projectRemap.js), [atomic repository](../../src/lib/persistence/projectRepository.js), [snapshot adapter](../../src/lib/sync/snapshot.js). Original archive findings remain in the [issue register](issues.md); the previous destructive incremental import is replaced.

## Formats and completeness

`.mnteadlgproj` and `.mnteadlg` are ZIP archives with a `mountea.archive.v3` manifest, one project record, individually named records for every authoring table, and raw media entries. Project backups contain every dialogue, unused category/participant/condition/decorator definition, every locale, saved viewport/descriptions/timestamps and unknown JSON-compatible authored record fields. Audio Blobs become canonical base64 for snapshots/revision hashing and raw byte entries in ZIP. Thumbnails accept stored base64 or historical dataUrl and normalize to durable base64; missing bytes, ephemeral URL-only records, malformed base64 and inconsistent lengths require repair. Local export paths, provider bookkeeping, account secrets and React Flow transient selection/measurement state are excluded.

Dialogue export includes its child-graph dependencies transitively and complete project definitions; it records the selected root dialogue explicitly. Record paths combine display names and stable identities, so repeated names cannot overwrite another entry. The standalone importer resolves root and dependencies together.

Historic project archives containing projectData.json and nested dialogues/*.mnteadlg remain readable. Historic dialogue archives contain dialogueData.json, nodes.json, edges.json, dialogueRows.json, stringTable.json, supporting definitions and audio/<rowId>/<filename>. The compatibility adapter stages the whole project, resolves name references only when unique, preserves supplied rule/schema data and normalizes forward node references in two passes. Missing original media or ambiguous references are reported; data absent from old exports cannot be reconstructed.

## Import choices and atomicity

Dashboard, project and dialogue sections present an explicit import choice. Copy is the default and generates fresh entity identities. Replacement requires a selected existing project or dialogue. Dialogue replacement retains the selected root identity, replaces its graph/rows/strings, imports dependent dialogues with fresh identities, and preserves unrelated destination dialogues. There is no implicit merge by name or supplied GUID.

Parsing, extraction, canonicalization, reference validation and import preparation perform no authoring writes. Preparation captures a repository context and project sequence. Commit rechecks profile, sequence and every globally keyed entity's project ownership before replacing authoring data in the same IndexedDB transaction as immutable revision and durable outbox intent. Any graph, revision or outbox failure rolls the entire operation back. An intervening edit rejects the prepared import with STALE_PROJECT; it does not overwrite that edit. Failed imports reject their promises and keep the import choice open.

## Extraction and integrity limits

Reader and writer share limits: 25 MiB compressed input/output, 5 MiB per JSON entry, 1,000 cumulative entries, 250 dialogues and 128 MiB cumulative actual expanded bytes. Nested ZIP container bytes and their extracted contents share the same budget. Extraction uses incremental streams and stops at the limit; declared sizes do not bypass it. CRC32 is checked incrementally after the budget guard, without JSZip's eager CRC decompression path.

Original central and local-header names are checked before JSZip can normalize paths or discard duplicate entries. Traversal, absolute/drive/backslash paths, aliases, normalized duplicates, mismatched local/central names and Unicode path overrides are rejected. ZIP64 and multipart ZIPs are unsupported. The v3 manifest rejects unsupported kinds, absent root dialogues, undeclared entries, duplicate records and multiple media entries claiming one binding.

## Snapshots and revisions

Canonical snapshots use the same authoring/media representation as backups. `buildProjectSnapshot` reads a consistent pinned repository state. `prepareProjectCommit` converts media and hashes outside IndexedDB; `commitPreparedProject` atomically records state, immutable revision and outbox. Local project/dialogue authoring mutations use `mutateProject`, serialized within and across browser tabs. Remote application validates payload hash and preserves sender revision ID, parents, device, operation and timestamp with no echo intent. Strict export/remote application rejects incomplete graphs; local draft editing remains available with explicit repair diagnostics.

## Delivery and smaller exports

Electron delivery uses the native save bridge; cancellation is not reported as a successful save. Browser delivery downloads the Blob. Saved filesystem paths remain local metadata. Category/participant/definition standalone exports use their domain stores and do not replace the complete project-backup contract.

Focused verification is recorded in [implementation progress](implementation-progress.md). Tests cover full canonical equality, binary payloads, multilingual strings, child/return/definition remapping, obsolete record removal, foreign ownership, revision rollback, stale sequences, legacy assets, original path/Unicode attacks, corruption, actual nested expansion and mounted import choices. Live cloud transport and native package release are separate gates.
