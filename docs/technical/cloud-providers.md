# Cloud providers and authentication

Sources: [provider registry](../../src/lib/sync/providers/providerRegistry.js), [storage adapters](../../src/lib/sync/providers/storageProviders.js), [gateway](../../src/lib/sync/core/providerGateway.js), [Google configuration](../../src/lib/sync/googleDriveConfig.js), [Google authentication](../../src/lib/sync/googleDriveAuth.js), [Drive client](../../src/lib/sync/googleDriveClient.js), [Steam renderer client](../../src/lib/sync/steamCloudClient.js), [callback page](../../public/oauth-callback.html).

## Storage interface

Both configured providers support cloud sync. Google requires a user passphrase; Steam does not expose a passphrase requirement to the user. The common contract is:

| Method | Meaning |
| --- | --- |
| `findFileByName(name)` | Find a logical remote file |
| `listFiles({namePrefix})` | Enumerate matching files and metadata |
| `downloadFile(id)` | Retrieve serialized content |
| `createFile(payload)` | Create content with name/MIME/app properties |
| `updateFile(payload)` | Replace content/metadata by ID |
| `deleteFile(id)` | Remove the remote file |

Metadata includes ID, name, modified time, and app properties used for project/profile/revision association. Unknown provider IDs resolve to the default Google provider rather than always causing a configuration error. A new adapter must also be integrated into registry configuration, account handling, UI selection, catalog processing, and profile semantics; adding six functions alone is insufficient.

Operations accept a second `{context}` argument from the revision worker. Carry that captured profile/database/cancellation context through token refresh, pagination, HTTP requests and credential writes; never recapture the active profile halfway through an operation.

## Google configuration and account lifecycle

Runtime configuration chooses web/desktop-specific client IDs with a shared fallback. Desktop prioritizes environment configuration over saved custom IDs, while web prioritizes the saved setting. Custom client ID storage is global rather than profile-scoped. Optional team-folder configuration changes both parent-folder behavior and requested permissions.

The appData configuration requests `drive.appdata` with OpenID/email/profile identity scopes. A configured Drive folder uses the broader Drive scope and shared-drive request flags. This is a substantial difference in access scope; describe the actual selected mode when documenting an installation.

Browser account tokens and passphrases are memory-only. Native remembered secrets use Electron safeStorage; remembering is disabled when encryption is unavailable or Linux selects basic_text. Legacy active-generation plaintext account records are removed only after successful secure migration or explicit reauthentication, and original source databases remain untouched. Vault failure preserves migration evidence. The client treats the token as expiring 60 seconds early. Where possible it refreshes; otherwise the caller must authenticate again. The renderer refresh request supplies client ID/token without the optional desktop client secret; compatibility with every configured OAuth client type was not live-tested.

## Browser OAuth

The web flow opens Google's authorization URL for an implicit access token, uses a cryptographically random state value, and receives the result through `postMessage` from the callback page. The receiver checks origin, state and the exact popup source. The callback posts to its opener on the same origin, then closes after a short delay.

Popup blocking, closure, 60-second timeout, cancellation and success settle the promise and release listeners/timers/session state. Actual browser module regressions cover these paths.

The redirect page must be served at the configured callback URL; hash routing does not replace that real static file. Deployments using a repository subpath must preserve the configured callback origin/path relationship.

## Desktop OAuth

Electron opens the system browser and listens on a loopback HTTP callback at `127.0.0.1` with a dynamically allocated port. The main process generates state and a PKCE verifier/challenge, validates the response, and exchanges the code. A timeout defaults to 60 seconds and is configurable. An explicitly configured implicit fallback exists.

The preload bridge carries the configuration/result across the process boundary. Optional client-secret configuration is part of a distributed desktop build and is not a confidential server secret. Do not paste those values into logs or documentation. See [Electron](electron-steam.md) for IPC and lifecycle boundaries.

## Drive transport

Requests are restricted by the client to its expected Google API endpoint prefixes. The adapter uses Drive file metadata and multipart uploads, app properties for revision/project/profile/schema timestamps, and either `appDataFolder` or the configured parent. Shared-drive mode supplies the relevant all-drives flags.

`listFiles` handles pagination. Generic name lookup takes a matching result; update/delete target file IDs. The immutable revision protocol validates/deduplicates listings and verifies exact identity/content rather than treating a newest-name match as a concurrency precondition. The adapter itself has no generic exponential retry or optimistic overwrite guard; durable intent, bounded retry and ancestry reconciliation belong to the revision worker. Requests and refreshes share the captured abort signal and reject stale-profile results before credential persistence or subsequent transport.

## Steam transport

The renderer checks that the preload's Steam sync methods exist. It resolves a Steam profile from active profile identity or native Steam status and passes that profile ID with every operation. Resolution captures a repository context and rejects if active/native profile identity changes; it never switches the profile.

The main process publishes immutable independent v2 native-cloud files and returns success only after native read verification. Failed writes remain pending local evidence. Legacy bundle reads support migration only. [Electron and Steam](electron-steam.md) describes normalization, migration, and lost-update risks.

## Verification boundary

Focused regressions cover OAuth settlement, credential storage, delayed refresh/profile cancellation and two-client immutable provider behavior using controlled transports. The [implementation ledger](implementation-progress.md) records current execution results; [verification](verification.md) preserves the original investigation. Live Google consent/refresh/shared-drive upload and Steam account operations remain unpassed external release gates. Controlled transports do not establish live-provider success.
