# Synchronization, snapshots, and deletion propagation

The active writer is [revisionProtocol](../../src/lib/sync/core/revisionProtocol.js), called by [syncStore](../../src/stores/syncStore.js). `syncEngine.js` remains a barrel and old sync actions are compatibility wrappers. Historical investigation findings remain in [issues](issues.md); this page describes the implemented protocol.

## Local commit and delivery

Canonical project mutations commit authoring records, an immutable project revision, its parent identities, and durable provider-independent outbox intent in one Dexie transaction. A failed transaction preserves the previous project. Revisions hold a consistent canonical snapshot with explicit binary media encoding; local editing can retain drafts, but remote head application validates the full project contract. Project ownership and graph/localization references are checked before replacement. Pull-as-new uses the shared identity remapper.

The provider worker records a separate delivery for each provider/revision. Its phases are queued, uploaded, and verified. Upload is acknowledged locally only after downloading and comparing the exact revision. A lost reply, failed local acknowledgement, restart, or concurrent authoring edit leaves durable work available for another attempt. An older successful delivery cannot acknowledge a newer edit. Queue diagnostics expose counts, oldest pending age, conflict count and error codes, without payloads or secrets.

Each cloud revision has an immutable filename derived from SHA-256 of the project/revision identity tuple. Names remain bounded for native providers. Existing matching objects are verified and reused; unequal content under one revision identity fails closed. There is no shared mutable catalogue in the new writer, and the legacy catalogue writer rejects mutations. Existing historical snapshots/catalogues remain readable and unchanged.

## Modes and retry

`list` inspects remote state without publishing or applying authored data. `pull` can apply safe remote heads but never publishes. `push` publishes eligible local revisions; `full` reconciles both directions. Local scheduling debounces for 1500 ms and only invokes publishing for push/full mode. Durable outbox intent exists independently of that timer.

After profile hydration, the root mounts one retry worker. It attempts the selected mode every 30 seconds and on the browser online event, skipping list-only mode and disconnected, offline and busy states. Cleanup removes both the interval and event listener. Repository contexts pin a profile/database and cancellation signal throughout transport and acknowledgement; a profile change settles pending provider waits and prevents stale UI/database updates. Providers receive that captured context. A provider may still finish an already submitted native write, but the old operation cannot acknowledge work in another profile.

## Conflicts and deletion

Parent revision identities form a DAG. Iterative ancestry traversal supports deep history and treats missing or cyclic history as incomplete. Concurrent heads remain preserved and produce a durable conflict instead of overwriting one another. A globally mounted conflict panel remains reachable when a project was deleted locally. Users explicitly keep local, remote, or both; resolution includes all competing parents, and keep-both creates independent remapped copies for every retained competing version. A choice based on stale local state is rejected.

Project deletion is an immutable revision committed with local deletion intent. Dialogue deletion is represented in its parent project's revision. Older snapshots cannot override a descendant deletion. Concurrent deletion/edit creates a conflict; listing absence alone never deletes local data. Historical tombstones are retained without the former 30-day expiry gap, including pending deletions whose local project no longer exists. Corrupt legacy catalogues fail closed.

## Encryption and providers

Google revisions use the supplied passphrase and authenticated AES-GCM envelope. The envelope validates its supported version and KDF parameters before decrypting; canonical media keeps exact bytes across encryption. The payload ceiling remains 20 MiB, with preflight and final serialized checks. New Steam revisions rely on Steam account/cloud access control, not a passphrase derived from public profile identity. Historical automatic Steam keys are used only to read older encrypted snapshots. Provider acknowledgements are independent: verification of one provider never marks another provider delivered.

Local credential protection is separate from cloud encryption. See [providers/authentication](cloud-providers.md) for memory-only browser secrets and desktop secure storage. New Steam objects use independently named native RemoteStorage files and atomic local cache replacement; the old bundle is read only for migration. Local protocol verification does not itself prove live-account upload behavior.

## Recovery and verification boundaries

Unresolved migration diagnostics block unsafe project export/sync. The root-level recovery report shows evidence even when zero projects exist. Diagnostics with an available owner open that project's recovery settings; orphan/global diagnostics retain originals, provide downloadable binary-safe JSON, and explain manual recovery from backups without fabricating ownership. Project settings support explicit reference reassignment and reviewed quarantined-node restoration.

Deterministic browser tests cover independent clients, conflicts and all-parent resolutions, deletion/edit races, historical tombstones, corrupt catalogues, missing/deep/cyclic ancestry, exact retry after interruptions, local acknowledgement quota failure, in-flight edits, profile cancellation, real store modes, retry cleanup and exact encrypted media. Focused results and remaining live-provider/native gates are recorded in [implementation progress](implementation-progress.md). Local provider fakes do not constitute live Google/Steam, signing, notarization or publishing verification.

