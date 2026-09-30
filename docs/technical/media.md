# Audio, thumbnails, and asset names

Sources: [audio intake](../../src/lib/audioStorage.js), [audio persistence transforms](../../src/lib/audioUtils.js), [row panel](../../src/components/dialogue/DialogueRowsPanel.jsx), [thumbnail processing](../../src/lib/participantThumbnails.js), [asset naming](../../src/lib/assetNaming.js), [import audio](../../src/lib/dialogueImportAudio.js), [sync budget](../../src/lib/sync/payloadBudget.js).

## Audio representations

| Stage | Typical representation | Lifetime/consumer |
| --- | --- | --- |
| File input | Browser `File` | MIME/size validation and metadata extraction |
| Editor attachment | ID, name, type, size, Blob, data URL | Row editing and playback |
| Ordinary graph save | Name, size, `base64` data URL, `mimeType` | JSON-safe persisted payload |
| Restored audio | Name, size, Blob; no object URL | Playback and ZIP export |
| Dialogue ZIP import | Blob attached directly to row audio object | Valid in IndexedDB, unsafe in plain JSON snapshot |

Accepted audio MIME types are WAV/MPEG/MP3 variants listed by the validator, with a 10 MiB per-file limit. An extension alone is not the validator's source of truth. Metadata loading uses an `Audio` element and an object URL to determine duration; that temporary metadata URL is cleaned up. The row panel can set duration from the selected audio.

IndexedDB structured cloning can preserve Blob values. `JSON.stringify` cannot: a Blob becomes `{}`. Normal saving converts audio to a base64 representation, but the ZIP-import path can leave Blobs in the database. Snapshot encryption serializes those records without a binary conversion, so syncing immediately after import loses the audio bytes ([ISS-007](issues.md#iss-007)). Saving through the editor first can alter which representation the snapshot encounters; that is not an acceptable correctness dependency.

Base64 expansion, encrypted-envelope overhead, ZIP contents, and local Blob size are different budgets. A file below the 10 MiB intake limit may still make a multi-row project exceed the 20 MiB encrypted snapshot limit. Participant mutations also estimate the entire project snapshot even without an active cloud connection.

## Playback ownership

The restoration helper returns bytes without allocating object URLs. The row panel prefers a Blob, then stored data URL/URL as available, and owns URLs it creates. Stable audio sources reuse their existing URL through text edits. Replacement, removal, StrictMode cleanup and unmount pause the player and revoke owned URLs. Preview owns and revokes each row's playback URL. Chromium regressions check create/revoke balance across these lifecycles ([ISS-039](issues.md#iss-039)). A persisted `blob:` URL is only a session-local handle and must never be the durable audio representation.

Preview advancement is based on row duration, independently of audio completion. Failed playback does not stop the graph. History uses sanitized structured clones that retain Blob bytes ([ISS-029](issues.md#iss-029)).

## Participant thumbnails

Input supports PNG, JPEG, and WebP up to 10 MiB. Processing decodes an image, center-crops it to a square, draws through canvas, and encodes PNG. The target edge starts at the smaller of 512 and the source's larger dimension. Up to ten attempts shrink the edge by about 0.82, bounded at 64 pixels, until the encoded result fits 1 MiB.

Stored thumbnail data contains a base64 data URL, MIME type, byte count, width, height, and update timestamp. Some normalization accepts an existing positive `sizeBytes` rather than recomputing it, so imported metadata is not independently measured in every path. Export writes PNG into `Thumbnails/` and references it from participant data.

Thumbnail identity uses a generated name of the form `T_<sanitized-category>_<sanitized-participant>_Thumbnail`. This depends on names/category paths, not participant ID. Repeated category leaf names and ambiguous participant lookup can select the wrong image even when entity IDs differ.

## Naming

The naming utilities apply NFKD normalization and retain ASCII letters, digits, and underscores to produce engine-friendly identifiers and file stems. Empty names receive a fallback. Audio extension handling is separate from its sanitized stem.

Audio extensions are sanitized separately only when an actual extension exists; extensionless names stay extensionless ([ISS-040](issues.md#iss-040)). Sanitization is many-to-one; archive callers must add identity or detect collisions rather than assume sanitized names are unique.

## Engineering boundaries

Keep binary encoding explicit at every transition: File → editor → IndexedDB → snapshot JSON → ZIP → imported graph. Test actual decoded bytes, not just `name`/`size` metadata. Release ownership for every object URL and separate duration metadata from playback timing. Archive names are integration contracts for external engines; changing sanitization requires coordinated fixture and consumer updates.
