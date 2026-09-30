# Electron desktop and Steam integration

Sources: [main process](../../electron/main.cjs), [preload](../../electron/preload.cjs), [Steamworks adapter](../../electron/steam.cjs), [desktop telemetry](../../electron/sentry.cjs), [renderer runtime](../../src/lib/electronRuntime.js), [renderer Steam client](../../src/lib/steam/steamClient.js), [Steam store](../../src/stores/steamStore.js).

## Startup and lifecycle

The main process sets the product name, initializes telemetry/error handlers, ensures a writable user-data location, acquires the single-instance lock, initializes Steam when appropriate, registers IPC/menu handlers, and creates the main window. A second launch focuses the existing window. Closing all windows exits on non-macOS platforms; macOS activation can recreate a window.

Linux defaults to safe rendering flags including disabled GPU/software rasterization and an X11 backend preference. The development launcher retains GPU stability flags but never adds no-sandbox. These behaviors are platform workarounds, not browser-renderer defaults for every OS.

User-data setup probes writability with `.mountea_write_probe`. Fallback candidates include a configured `MOUNTEA_USER_DATA_DIR`, platform local-data paths, and temporary storage. The environment override is a fallback, not necessarily an unconditional override of an already writable default. `--user-data-dir` is also supported. Relaunch/setPath decisions must happen before user data is opened. A temporary fallback can change durability expectations.

## Window boundary

The main window is 1440×920 with minimum 1240×720, initially hidden until ready. It loads `VITE_DEV_SERVER_URL` in development or packaged `dist/index.html`. Renderer configuration sets context isolation on, Node integration off, sandbox on, and a preload script. These flags define a privileged bridge boundary; they do not make arbitrary renderer content trustworthy.

New-window requests are denied after allowed external HTTPS/mail links are handed to the system shell. Navigation/redirect handling permits only the exact packaged entry file or configured development origin, entry path and query. All other destinations are cancelled. Every IPC capability validates the exact main webContents and main frame, renderer URL, bounded arguments and applicable active Steam profile/capability. Null rich-presence values remain supported for clearing entries.

Browser-style reload/back/address/devtools shortcuts are intercepted (including F5, Alt+arrows, Ctrl+R/L, F12, and Ctrl+Shift+I). Application commands are routed through native menus and renderer subscriptions instead.

## Preload contract

| Capability | Renderer-facing methods | Main-process work |
| --- | --- | --- |
| Authentication | `startGoogleOAuth` | Loopback listener, browser launch, token exchange |
| External navigation | `openExternal` | Validate/open external URL |
| Local navigation | `openPath`, `openContainingFolder` | Shell integration with a supplied path |
| Export | `saveFileDialog` | Native dialog, filename/filter normalization, byte write |
| Diagnostics | `traceSyncEvent` | Append sync diagnostic event |
| Logical cloud files | Six methods under `steamSync` | Find/list/read/create/update/delete bundle entries |
| Steam integration | `getSteamStatus`, `openSteamOverlay`, `setSteamRichPresence`, `unlockSteamAchievement` | Native Steamworks calls |
| Menus | `setMenuContext`, `onMenuCommand` | Contextual labels/enabled state and command delivery |

`onMenuCommand` returns an unsubscribe function. Components/root effects must release subscriptions. The bridge is a capability list, not unrestricted Node access. There is no general renderer file-read API, but shell/path and write-dialog operations still require clear trust boundaries.

Native export converts the renderer Blob to base64, crosses IPC, displays a save dialog, and writes decoded bytes only to the selected path. This duplicates payload memory. Cancellation is returned explicitly. `lastExportPath` supports revealing a previous export and remains local-only in snapshots.

## Menus and desktop OAuth

Menu context distinguishes dashboard, project, dialogue, settings, and legal screens. It includes UI language and content locale choices from the shared language catalogue, plus availability/state flags. A native command is delivered to the renderer, which dispatches the corresponding application action; root and route listeners are therefore part of the desktop implementation.

Desktop Google authentication uses a dynamic loopback server at `/oauth/callback`, state, PKCE SHA-256, and a bounded timeout (`MOUNTEA_OAUTH_TIMEOUT_MS`). Failure/close cleanup must release the server and reject/resolve the outstanding request. Optional implicit fallback and client-secret lookup are configuration branches. No live identity provider was used in this investigation.

## Steam channel selection and native API

Native channel selection considers `VITE_DIST_CHANNEL`, `MOUNTEA_DIST_CHANNEL`, package `mounteaDistChannel`, then `desktop`. App ID comes from Steam environment variables, build metadata, or `steam_appid.txt`. Current Steam scripts use app ID `4509320`. Steam launch indicators include Steam-related process environment values. Initialization is restricted to the Steam channel and tolerates missing/unavailable native bindings by returning status rather than treating every desktop build as Steam.

`steam.cjs` wraps account/cloud availability, remote storage, overlay destinations, rich presence, and achievement unlocks. Availability of the Steam client, cloud for the account, and cloud for the app are separate checks. Native module files are unpacked from ASAR by electron-builder. UI state derives from the bridge status; the browser cannot use these native capabilities directly.

## Cloud file contract

New v2 Steam objects are immutable, independently named account-scoped native RemoteStorage files. Content hashes detect corruption and deterministic name/content identities make retries idempotent. New content uses Steam account access control rather than encryption derived from a predictable identity. The legacy v1 bundle is available only for read migration.

Mutations cache pending evidence atomically, then write and read-verify native cloud before returning success. Failed native writes throw and leave the pending cache intact. Listing is read-only and reads native state, never treating local evidence as a remote acknowledgement. Updates publish a new immutable object; deletion publishes protocol history rather than deleting remote evidence. Live Steam persistence remains a release gate.

## Diagnostics and platform limits

Sync diagnostics use an explicit metadata allowlist, discard arbitrary error/provider prose and secret/title fields, rotate at 5 MiB and retain three archives. Main-process Sentry is optional and separately configured from renderer Sentry. A successful browser build does not validate native bindings, signing, Linux sandbox behavior, macOS notarization, Steam launch, or real remote persistence. Those were not exercised here.

## Phase 7 local evidence

Fourteen auth/native regressions pass using actual modules and disposable contexts. `scripts/check-electron-startup.mjs` also passed on Windows against the built renderer and actual Electron main/preload with a hidden window, isolated user data and blocked provider network. It verifies sandbox/context isolation, usable preload IPC, ready renderer and denied unexpected navigation. This is not a packaged binary, signing, cross-OS or live-provider pass.

Desktop OAuth owns a single abortable session through callback and token exchange. Cancellation rejects late tokens, aborts exchange and retains the session lock through cleanup. Browser OAuth checks source/origin/state and settles on popup blocking, close, 60-second timeout, abort and success.
