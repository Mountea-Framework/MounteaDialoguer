# Build, release and testing

Current operational contract after ISS-035/036 repairs. Executed gates are in [implementation progress](implementation-progress.md); the original investigation remains in [verification](verification.md). See [contribution guidance](../../CONTRIBUTING.md) and the [cross-platform release validation procedure](release-validation.md).

## Development and checks

Use Node 24 LTS and `npm ci`. `npm run dev` starts Vite; `dev:electron` and `dev:electron:steam` coordinate desktop development. Vite uses relative asset URLs, the `@` source alias and generated TanStack routes; do not edit `src/routeTree.gen.ts`.

| Command | Contract |
| --- | --- |
| `npm run lint:ci` | Maintained renderer, Electron, scripts, tests and config; legacy exclusions are explicit in `.eslintrc.cjs` |
| `npm run test:regressions` | All regression suites against real modules, isolated profiles and deterministic provider failures |
| `npm run build` / `build:steam` | Build once into `dist`, including offline template, release identity and hidden private maps |
| `npm run validate:artifact` | Upload maps if reporting enabled, strip maps, fingerprint, production preview tests, then attest |
| `npm run test:e2e:production` | Smoke and production artifact/product tests through Vite preview; does not build |
| `npm run electron:pack` / `electron:pack:steam` | Verify attestation and package existing `dist`; does not rebuild or publish |
| `npm run validate:native-package` | Resolve and launch the actual host package, verify runtime architecture and embedded renderer, preserve optional structured evidence |
| `npm run electron:dist` / `electron:dist:steam` | Credential-gated public distribution files; does not publish |
| `npm run validate:skills` | Maintained lint, all regressions, one build, artifact validation |

The production gate verifies bundled template bytes, release identity, absent public maps/development modules and actual UI behavior. `artifact-integrity.json` records SHA-256 for every renderer file; `artifact-validation.json` binds production validation to that inventory. Later changes require new finalization and production tests. These are local build attestations, not cryptographic supply-chain signatures.

## CI and Pages

[CI](../../.github/workflows/ci.yml) runs on PRs, master and `validation/**` pushes and manual dispatch: `npm ci`, maintained lint, all module regressions, one build and the production gate. Windows x64, macOS Intel/ARM64 and Linux x64 jobs download the same artifact, package without rebuilding, and run actual packaged startup on versioned runner images. Startup uses a hidden window, disposable user data, disabled Steam, blocked external HTTP(S), sandbox/preload checks and denied unexpected navigation. Every file inside packaged `dist`, including validation records, must match the expected SHA-256; copying only the inventory cannot pass. Browser and per-platform evidence uploads run even after failures; see [release validation](release-validation.md) for targets, Linux sandbox/display setup, artifact retention and separate public-release gates.

[Pages deployment](../../.github/workflows/deploy.yml) consumes successful CI output only for a trusted master push from this repository. Fork PRs and manual CI cannot enter this deployment path. It checks out the exact tested commit, verifies and publishes the downloaded bytes without rebuilding. A failed native job prevents the workflow-success deployment trigger.

## Release identity and Sentry

`MOUNTEA_RELEASE` explicitly sets identity; CI otherwise uses package version plus `GITHUB_SHA`. Local identity includes revision and dirty state. `release.json` carries `{release, reportingEnabled}`; renderer/native reporting use it. Hidden maps contain no public source-map comments.

When `VITE_SENTRY_DSN` enables reporting, finalization requires `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, uploads under the exact release, then removes maps. Failure blocks validation and retains maps. The installed native CLI avoids Windows `.cmd` launch problems; `SENTRY_CLI` can name a native executable. CI uses repository variables for DSN/org/project and secrets for the token. Never publish maps or credentials. Real delivery/upload requires real-credential verification; mocked command tests prove ordering and failure handling only.

## Native signing and startup

Local `electron:pack` is an unsigned unpacked gate. Set `MOUNTEA_PACKAGED_EXECUTABLE` to the built executable and run `node scripts/check-electron-startup.mjs`. Windows uses `release/win-unpacked/Mountea Dialoguer.exe`; macOS uses `Contents/MacOS/Mountea Dialoguer`; Linux uses `release/linux-unpacked/mountea-dialoguer` under a display or `xvfb-run`. Without that variable, the helper launches Electron against local built files, which does not establish package fidelity.

Public Windows builds require `CSC_LINK` and `CSC_KEY_PASSWORD` and force signing. macOS additionally requires `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`; notarization is enabled. Builder output remains visible and publication is disabled.

Public Linux builds require matching Ed25519 PEM files: `MOUNTEA_LINUX_SIGNING_KEY_FILE` and `MOUNTEA_LINUX_PUBLIC_KEY_FILE`. They produce AppImage/DEB files in a fresh `release/linux-public-*` directory and emit `release-manifest.json`, detached binary `release-manifest.sig`, and public key. The signed manifest binds package SHA-256 hashes and the validated renderer inventory hash. Keep the private key outside the repository. Publish a trusted key fingerprint independently; a key shipped beside an artifact alone does not establish publisher identity. Verify using `openssl pkeyutl -verify -pubin -inkey release-public-key.pem -rawin -in release-manifest.json -sigfile release-manifest.sig`, then compare package hashes with the signed manifest. Ephemeral test keys do not establish production publisher signing.

## Steam staging

Platform wrappers delegate to [steam-upload.mjs](../../scripts/steam-upload.mjs). All require explicit source, an existing separate staging root, account, positive app/depot IDs and platform. Plain invocation is a dry run and writes nothing:

```sh
npm run steam:upload -- --platform linux --source /build/linux-unpacked --staging-root /staging --username build_account --app-id 123 --depot-id 456
```

`--execute --steamcmd /sdk/steamcmd.sh` creates a fresh owned stage and invokes SteamCMD preview. `--execute --upload` additionally authorizes real upload. There is no default account, rebuild, mirror-delete or live-branch assignment. Failed uploads retain staging. Validate/sign the source before an authorized upload; planner tests do not establish Steam service behavior.

## Configuration and external gates

Renderer `VITE_*` inputs compile into output; native runtime `MOUNTEA_*`/`STEAM_APP_ID` are separate. Channel defaults to desktop; bridge capability identifies native execution independently. Google OAuth selects configured web/desktop client variants; distributed desktop client configuration is not a server secret. `PLAYWRIGHT_PORT` selects the module harness; `PLAYWRIGHT_PRODUCTION_PORT` selects production preview.

Live Google/Steam require test accounts. Startup must pass on each target OS. Public signing/notarization, real Sentry delivery/upload and actual Steam upload remain external gates without credentials/platforms. Consult the ledger for exact evidence. Existing hook/refresh, Browserslist and bundle warnings remain visible.

## Latest local integrated result

On 2026-09-30, maintained lint passed with 0 errors/12 existing warnings; all 132 focused regressions plus 3 smoke flows passed. A single renderer build then passed 7 production tests and attestation, followed by Windows unpacked packaging without rebuild and actual packaged startup with every embedded renderer byte compared. Reporting was disabled; real Sentry upload was not exercised. Current exact commands, inventory digest, helper integration repair and external gates are recorded in [implementation progress](implementation-progress.md#final-integrated-local-gate-2026-09-30). This does not establish signed installers, non-Windows startup, live provider behavior or remote CI success.
