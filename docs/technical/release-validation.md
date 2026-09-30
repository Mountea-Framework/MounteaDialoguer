# Release validation across operating systems

Use this procedure with [build/release/testing](build-release-testing.md). The [implementation ledger](implementation-progress.md) records executed results; a workflow definition is not evidence that its platforms passed.

CI and artifact deployment use Node 24 LTS. Node 20 is end-of-life according to the [official Node.js release table](https://nodejs.org/en/about/previous-releases), checked 2026-09-30. Electron embeds its own Node runtime; the build-tool version does not change that runtime.

## Automated unsigned gate

[CI](../../.github/workflows/ci.yml) validates the renderer once and downloads those exact bytes into each native job. Its explicit target matrix is:

| Runner image | Runtime | Package architecture |
| --- | --- | --- |
| `windows-2022` | Windows | x64 |
| `macos-15-intel` | macOS Intel | x64 |
| `macos-15` | macOS Apple Silicon | arm64 |
| `ubuntu-22.04` | Linux | x64 |

These versioned labels avoid implicit OS/architecture migration through `latest`; runner image patch versions still change and are captured in evidence. Both Mac architectures are exercised separately, not inferred from cross-compilation. The labels and architectures follow the [GitHub hosted runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners). This matrix establishes neither compatibility with every OS version nor a universal Mac package.

The quality job runs maintained lint, module regressions, one renderer build, and production validation. Every native job asserts host identity, installs locked dependencies and Chromium, runs the full module regressions, verifies the downloaded attestation, packages explicitly for its architecture, runs `npm run validate:native-package`, and runs the production browser suite against the shared renderer before reverifying the artifact. No native job rebuilds the renderer. `MOUNTEA_EXPECTED_PLATFORM` and `MOUNTEA_EXPECTED_ARCH` also guard the Electron runtime against an unintended target.

Linux installs Playwright Chromium system dependencies plus GTK, NSS, ALSA, GBM, Xvfb and xauth. The packaged `chrome-sandbox` is root-owned with mode `4755` on the disposable runner, and the application runs as the ordinary runner user under Xvfb. Do not pass `--no-sandbox` or globally disable host sandbox policies to make this gate pass. Electron documents the display requirement in [headless CI testing](https://www.electronjs.org/docs/latest/tutorial/testing-on-headless-ci); Chromium describes the helper permissions in [Linux SUID sandbox setup](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/linux/suid_sandbox_development.md). A different Linux distribution may need different package names and sandbox policy configuration; prove startup there separately.

The validator resolves the platform package or accepts `MOUNTEA_PACKAGED_EXECUTABLE`, uses disposable application data, and preserves startup results at `MOUNTEA_NATIVE_EVIDENCE_PATH`. It validates package fidelity, preload/runtime isolation and blocked unexpected navigation. Steam and live provider traffic are disabled for this gate. This cannot establish live-provider acceptance.

Each native job uploads `native-evidence-<target>-<commit>` even after failure: host identity, package/startup logs where those steps ran, structured startup evidence, job outcome, and renderer identity/integrity/validation records. Quality uploads browser traces/reports where generated and renderer records. Evidence retention is 14 days; retain the required release evidence separately before expiration. Never upload disposable user profiles, credentials or private source maps. A missing startup result after an earlier failure means startup did not run, not that it passed.

PRs, `master` pushes, `validation/**` pushes and manual dispatch run CI. Validation branches and manual dispatch cannot trigger Pages deployment; deployment still requires a successful trusted `master` push. Do not push to `master` merely to exercise native gates. Remote execution requires the tested changes to exist on the remote and Actions to be enabled; local Windows commands cannot execute a macOS runtime. WSL can provide additional Linux evidence when a distribution and display/runtime dependencies are available, but does not replace the specified CI runner or Mac gates.

## Local reproduction with an existing validated renderer

On each target host, use Node 24 LTS, `npm ci`, and the same validated `dist` from the release candidate. Keep its source revision and package lock paired with the artifact. Then run:

```sh
node scripts/release-artifact.mjs verify
npm run electron:pack -- --x64
npm run validate:native-package
node scripts/release-artifact.mjs verify
```

Use `--arm64` on Apple Silicon. On Linux install the libraries/display and configure the packaged sandbox as above, then use `xvfb-run --auto-servernum npm run validate:native-package`. Set `MOUNTEA_NATIVE_EVIDENCE_PATH` to a disposable evidence JSON path to preserve results. To check another package, explicitly set `MOUNTEA_PACKAGED_EXECUTABLE` to its executable. Running the lower-level helper without a packaged executable only checks development Electron and cannot close the packaged gate.

## Public release acceptance

A passing unsigned unpacked job closes only its startup/package-fidelity gate. Release acceptance additionally requires:

| Gate | Evidence required |
| --- | --- |
| Windows public distribution | Credential-gated `electron:dist`, valid publisher signature, installed NSIS and portable launch on the target OS |
| macOS public distribution | Credential-gated `electron:dist`, Developer ID signature, successful notarization and Gatekeeper acceptance; installed DMG/ZIP launch for each shipped architecture |
| Linux public distribution | Production Ed25519 manifest signature verified against an independently trusted key, package hashes matched, installed DEB and AppImage startup with sandbox enabled |
| Live Google and Steam | Authorized test accounts, actual authentication/cloud acknowledgement, conflict/recovery checks and Steam achievements where shipped |
| Sentry when enabled | Exact-release private map upload and actual event delivery verified with production configuration |
| Product acceptance | Human keyboard/device and assistive-technology checks in addition to automated accessibility coverage |

Signing credentials and Linux key variables are documented in [native signing](build-release-testing.md#native-signing-and-startup). CI deliberately does not supply release signing credentials to the unsigned matrix. Mac ad-hoc signing, where required for local ARM execution, does not establish publisher identity or notarization. Public packaging does not publish automatically; distribution, Steam upload and deployment remain separate actions. Record unmet gates explicitly instead of treating mock-provider tests or cross-platform package generation as substitutes for native execution.
