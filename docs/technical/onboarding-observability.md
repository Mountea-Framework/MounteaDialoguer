# Onboarding, achievements, activity, and observability

Sources: [tour component](../../src/components/ui/onboarding-tour.jsx), [template loader](../../src/lib/onboarding/templateLoader.js), [achievement tracker](../../src/lib/achievements/achievementTracker.js), [achievement IDs](../../src/config/steamAchievements.js), [root effects](../../src/routes/__root.jsx), [renderer Sentry](../../src/lib/monitoring/sentry.js), [main Sentry](../../electron/sentry.cjs).

## Onboarding

React Joyride steps target `data-tour` selectors in dashboard/editor UI. Tour configuration has device-specific placements/steps and local completion flags. Finishing emits `onboarding:completed`; the root uses completion to coordinate later prompts such as cloud login. Renaming/removing a tour target can break onboarding without affecting ordinary rendering.

Example-project loading obtains the configured GitHub URL, builds a `raw.githubusercontent.com` candidate when possible, and fetches candidates with `cache: no-store`. It wraps the resulting Blob in a project archive `File` and uses the ordinary importer. Remote fetch has no explicit timeout.

Electron has an intended bundled fallback at `onboarding-example.mnteadlgproj`; browser failure produces `ONBOARDING_TEMPLATE_WEB_FALLBACK_REQUIRED`, directing the manual-import flow. The baseline tracks the template in `ExampleProject/OnboardingExample.mnteadlgproj`, but neither a matching `public` asset nor a build-copy step was found. The packaged fallback path is therefore absent in the observed build ([ISS-027](issues.md#iss-027)).

An existing example can be recognized by `isExample` or the special name `OnboardingExample`. This is a heuristic, so a user-renamed/copied project can interact with onboarding differently from a record with an explicit flag. Importer partial-success behavior also affects template loading: a resolved import promise is not sufficient proof of a usable example graph.

## Achievements and active time

Seven configured achievements cover example use, first ordinary project, first category/decorator/participant/condition, and ten hours of active use. The tracker excludes example projects for the ordinary first-record achievements. Its local ledger is scoped by active profile.

Unlock records the local flag before attempting Steam. If the native call fails/unavailability intervenes, that flag suppresses later attempts; there is no persistent retry queue ([ISS-034](issues.md#iss-034)). Local completion and native Steam completion can therefore diverge.

The root records activity events and increments eligible active minutes on a one-minute tick when the document is visible and activity occurred within the previous two minutes. The ten-hour threshold is 600 minutes. This is an activity estimate, not wall-clock time or a precise idle detector. Frequent events such as mouse movement write activity state synchronously to localStorage, with a potential performance cost on busy pages.

## Renderer telemetry

Sentry initializes only if `VITE_SENTRY_DSN` exists and is guarded against repeated initialization. Development reporting requires `VITE_SENTRY_ENABLE_IN_DEV=1`; production is enabled when configured. Trace sampling defaults to 0.1. Numeric parsing accepts finite values without clamping to the expected probability range.

`isRendererSentryEnabled()` actually reports that initialization was performed, including a development configuration whose SDK `enabled` flag is false. It is not a reliable consent/reporting-status indicator. There is no source-map upload workflow in the inspected build/CI configuration. An error stack from a production minified bundle can therefore have limited source fidelity.

`AppErrorBoundary` is Sentry's React boundary around the routed app with an English restart instruction. It covers render/lifecycle failures in the component tree, not every rejected promise or event-handler exception. Store catches, root initialization catches, browser console logs, and native exception handlers are separate error paths. Swallowing a failure before it reaches those handlers can make telemetry quieter while leaving invalid local state.

## Native telemetry and logs

Main-process Sentry is required defensively; a missing module does not block startup. It uses `MOUNTEA_SENTRY_DSN` or `VITE_SENTRY_DSN`, its own sample-rate configuration, `NODE_ENV`, and `npm_package_version` for release. Packaged launches may not populate npm's release variable. Captured context is added as Sentry extras with the `electron-main` runtime tag.

Steam synchronization also writes a synchronous append-only diagnostic file in user data. No rotation or size ceiling is visible. Diagnostic payloads can include titles and operation metadata. The main error hooks and renderer SDK have different initialization/configuration lifetimes and should be validated separately.

## Maintenance implications

Keep tour selectors stable, package the example as part of a deterministic build, distinguish local/native achievement acknowledgement, and make activity persistence less frequent if profiling shows jank. Telemetry flags and legal-policy translations need to match actual reporting behavior; this investigation records implementation, not a legal-compliance assessment. Observability and translation gaps are collected in [ISS-041](issues.md#iss-041).

Product reliability validation now covers the tracked byte-identical onboarding fallback, bounded remote fetch timeout, retryable earned achievement acknowledgements, profile-isolated late replies and bounded activity persistence. Development reporting is disabled unless explicitly enabled; native telemetry uses the renderer release manifest and clamped sample rates. Browser module/keyboard/axe evidence is recorded in the Phase 8 ledger; it does not substitute for real Steam/live Sentry verification.
