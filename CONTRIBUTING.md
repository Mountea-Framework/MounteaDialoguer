# Contributing

Use Node 20 and install the locked dependencies with `npm ci`. Start the renderer with `npm run dev`, or desktop with `npm run dev:electron`. Work normally targets `dev`; `master` is the release branch. Read [architecture](docs/technical/architecture.md), the relevant [area guide](docs/technical/README.md), and the [implementation ledger](docs/technical/implementation-progress.md) before changing storage or sync behavior.

Preserve original databases during migration and use disposable profiles for reproductions. Authoring writes must commit data and revision/outbox intent together through the repository mutation APIs. Capture the repository context before asynchronous work. Never discard competing sync revisions automatically. Archives must retain every authored field, unused definitions, translations and exact media bytes. Localization is always on. Validate ownership and references before mutation.

Add regressions for observable contracts using real modules and `tests/e2e/helpers/moduleHarness.js`; use historical database fixtures and deterministic provider faults for persistence/sync changes. Keep test data and credentials separate from user profiles. Choose checks covering the failure mode, then run the maintained gates:

```sh
npm run lint:ci
npm run test:regressions
npm run build
npm run validate:artifact
```

The final command uploads private maps when reporting is enabled, strips them, fingerprints output, runs production browser tests and records validation. Reporting-enabled releases require Sentry credentials; a local reporting-disabled build does not establish real Sentry delivery. Package this exact validated output with `npm run electron:pack`; it never rebuilds. See [release operations](docs/technical/build-release-testing.md) for packaged startup, signing and external account gates. Do not use upload/publication commands as tests.

Describe the concrete failure, resulting behavior and exact verification in a PR. Update the area guide and ledger without rewriting historical issue evidence. Refresh current navigation with `node scripts/update-technical-indexes.mjs`. Preserve baseline source/logic indexes as audit evidence. Never commit private environment values, tokens, user databases, generated packages or test artifacts.
