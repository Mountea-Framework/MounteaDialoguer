# Complete baseline source map

Historical inventory preserved for the investigation. Use the [current source map](source-map-current.md) for repaired and newly added files.

Baseline `00bcc915a7a3a55bd4ebf61bab2d0ba4f2c48068`: 279 tracked paths; 180 JavaScript-family files. Every baseline path appears exactly once below. New documentation is indexed in [README](README.md).

Code exports/actions were extracted from syntax trees. Renderer reachability starts at the main entry and every route and follows literal local imports/re-exports. “No renderer path” means no path found in that analysis, not dead-code proof. Native modules, scripts, config, and tests have their own entry mechanisms. See the [logic index](logic-index.md) for callable locations.

Review depth: domain/editor/persistence/archive/localization/sync/native/auth flows were traced; selected persistence defects were executed in isolated Chromium. UI primitives and helper declarations were inventoried and inspected by family. Translation catalogues and node configuration were parsed as data; artwork/editable image sources were inventoried without visual review. The sample ZIP structure was inspected, not every audio/image rendered. `.env` values and personal feedback contents were excluded. None of these depth labels is a claim of exhaustive execution.

## build-release-testing

[Area guide](build-release-testing.md). 22 baseline files.

| File | Role / exports / store actions | Entry analysis |
| --- | --- | --- |
| `.env` | Tracked environment file; values excluded | Not JavaScript import analysis |
| [.eslintrc.cjs](../../.eslintrc.cjs) | 22 lines. No extracted ESM export; inspect script/CommonJS/side-effect entry. | Separate entry/config/test |
| [.github/workflows/ci.yml](../../.github/workflows/ci.yml) | Build/repository/static support | Not JavaScript import analysis |
| [.github/workflows/create-issue.yml](../../.github/workflows/create-issue.yml) | Build/repository/static support | Not JavaScript import analysis |
| [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml) | Build/repository/static support | Not JavaScript import analysis |
| [.gitignore](../../.gitignore) | Build/repository/static support | Not JavaScript import analysis |
| [index.html](../../index.html) | HTML entry/static page | Not JavaScript import analysis |
| [package-lock.json](../../package-lock.json) | Data/configuration catalogue | Not JavaScript import analysis |
| [package.json](../../package.json) | Data/configuration catalogue | Not JavaScript import analysis |
| [playwright.config.js](../../playwright.config.js) | 38 lines. Exports: `default`. | Separate entry/config/test |
| [postcss.config.js](../../postcss.config.js) | 7 lines. Exports: `default`. | Separate entry/config/test |
| [scripts/dev-electron.mjs](../../scripts/dev-electron.mjs) | 294 lines. No extracted ESM export; inspect script/CommonJS/side-effect entry. | Separate entry/config/test |
| [scripts/run-electron-builder.mjs](../../scripts/run-electron-builder.mjs) | 67 lines. No extracted ESM export; inspect script/CommonJS/side-effect entry. | Separate entry/config/test |
| [src/App.test.js](../../src/App.test.js) | 10 lines. No extracted ESM export; inspect script/CommonJS/side-effect entry. | No renderer path |
| [steam_build_upload.bat](../../steam_build_upload.bat) | Build/repository/static support | Not JavaScript import analysis |
| [steam_build_upload_linux.sh](../../steam_build_upload_linux.sh) | Build/repository/static support | Not JavaScript import analysis |
| [steam_build_upload_mac.sh](../../steam_build_upload_mac.sh) | Build/repository/static support | Not JavaScript import analysis |
| [tailwind.config.js](../../tailwind.config.js) | 57 lines. Exports: `default`. | Separate entry/config/test |
| [tests/e2e/evidence.spec.js](../../tests/e2e/evidence.spec.js) | 58 lines. No extracted ESM export; inspect script/CommonJS/side-effect entry. | Separate entry/config/test |
| [tests/e2e/helpers/appHarness.js](../../tests/e2e/helpers/appHarness.js) | 67 lines. Exports: `uniqueToken`, `seedLocalState`, `openDashboard`, `createProject`, `openDialoguesSection`, `createDialogue`, `openDialogueSettings`. | Separate entry/config/test |
| [tests/e2e/smoke.spec.js](../../tests/e2e/smoke.spec.js) | 47 lines. No extracted ESM export; inspect script/CommonJS/side-effect entry. | Separate entry/config/test |
| [vite.config.js](../../vite.config.js) | 40 lines. Exports: `default`. | Separate entry/config/test |

## legacy-and-assets

[Area guide](legacy-and-assets.md). 92 baseline files.

| File | Role / exports / store actions | Entry analysis |
| --- | --- | --- |
| [DocumentationSource/ACH_EXAMPLE_PROJECT.png](../../DocumentationSource/ACH_EXAMPLE_PROJECT.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/ACH_EXAMPLE_PROJECT_Locked.png](../../DocumentationSource/ACH_EXAMPLE_PROJECT_Locked.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/ACH_FIRST_CATEGORY.png](../../DocumentationSource/ACH_FIRST_CATEGORY.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/ACH_FIRST_CATEGORY_Locked.png](../../DocumentationSource/ACH_FIRST_CATEGORY_Locked.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/ACH_FIRST_CONDITION.png](../../DocumentationSource/ACH_FIRST_CONDITION.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/ACH_FIRST_CONDITION_Locked.png](../../DocumentationSource/ACH_FIRST_CONDITION_Locked.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/ACH_FIRST_DECORATOR.png](../../DocumentationSource/ACH_FIRST_DECORATOR.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/ACH_FIRST_DECORATOR_Locked.png](../../DocumentationSource/ACH_FIRST_DECORATOR_Locked.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/ACH_FIRST_PARTICIPANT.png](../../DocumentationSource/ACH_FIRST_PARTICIPANT.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/ACH_FIRST_PARTICIPANT_Locked.png](../../DocumentationSource/ACH_FIRST_PARTICIPANT_Locked.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/ACH_FIRST_PROJECT.png](../../DocumentationSource/ACH_FIRST_PROJECT.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/ACH_FIRST_PROJECT_Locked.png](../../DocumentationSource/ACH_FIRST_PROJECT_Locked.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/ACH_POWER_USER_10H.png](../../DocumentationSource/ACH_POWER_USER_10H.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/ACH_POWER_USER_10_LockedH.png](../../DocumentationSource/ACH_POWER_USER_10_LockedH.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/HeaderCapsule.kra](../../DocumentationSource/HeaderCapsule.kra) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/HeaderCapsule.png](../../DocumentationSource/HeaderCapsule.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/HeaderCapsule.psd](../../DocumentationSource/HeaderCapsule.psd) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/LargeCapuse_Library.png](../../DocumentationSource/LargeCapuse_Library.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/LibraryHero.png](../../DocumentationSource/LibraryHero.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/LibraryHero_Library.png](../../DocumentationSource/LibraryHero_Library.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/LibraryLogo.png](../../DocumentationSource/LibraryLogo.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/MainCapsule.png](../../DocumentationSource/MainCapsule.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/SmallCapsule.png](../../DocumentationSource/SmallCapsule.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/SteamAutoCloudSetup.md](../../DocumentationSource/SteamAutoCloudSetup.md) | Human documentation | Not JavaScript import analysis |
| [DocumentationSource/VerticalCapsule.png](../../DocumentationSource/VerticalCapsule.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/conditionDetails.png](../../DocumentationSource/conditionDetails.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/conditionDetails_light.png](../../DocumentationSource/conditionDetails_light.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/dektop_mainPage.webp](../../DocumentationSource/dektop_mainPage.webp) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/desktop_Categories.webp](../../DocumentationSource/desktop_Categories.webp) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/desktop_graph.webp](../../DocumentationSource/desktop_graph.webp) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/desktop_projectDetails.webp](../../DocumentationSource/desktop_projectDetails.webp) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/dialogConditions.png](../../DocumentationSource/dialogConditions.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/dialogConditions_light.png](../../DocumentationSource/dialogConditions_light.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/dialogue.png](../../DocumentationSource/dialogue.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/dialogueNodeDetails.png](../../DocumentationSource/dialogueNodeDetails.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/dialogueNodeDetails_light.png](../../DocumentationSource/dialogueNodeDetails_light.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/dialogue_light.png](../../DocumentationSource/dialogue_light.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/mobile_categories.webp](../../DocumentationSource/mobile_categories.webp) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/mobile_graph.webp](../../DocumentationSource/mobile_graph.webp) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/mobile_mainPage.webp](../../DocumentationSource/mobile_mainPage.webp) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/mobile_projectDetails.webp](../../DocumentationSource/mobile_projectDetails.webp) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/projectDetails.png](../../DocumentationSource/projectDetails.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/projectDetails_light.png](../../DocumentationSource/projectDetails_light.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/welcomePage.png](../../DocumentationSource/welcomePage.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/welcomePage_light.png](../../DocumentationSource/welcomePage_light.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [Feedback/conditions.md](../../Feedback/conditions.md) | Design feedback; text not reproduced | Not JavaScript import analysis |
| [LICENSE](../../LICENSE) | License text | Not JavaScript import analysis |
| [README.md](../../README.md) | Human documentation | Not JavaScript import analysis |
| [mounteaDialoguerIcon.ico](../../mounteaDialoguerIcon.ico) | Visual asset; no executable logic | Not JavaScript import analysis |
| [mounteaDialoguerIcon.png](../../mounteaDialoguerIcon.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [public/google-drive-icon.svg](../../public/google-drive-icon.svg) | Visual asset; no executable logic | Not JavaScript import analysis |
| [public/index.html](../../public/index.html) | HTML entry/static page | Not JavaScript import analysis |
| [public/manifest.json](../../public/manifest.json) | Data/configuration catalogue | Not JavaScript import analysis |
| [public/mounteaDialoguerIcon.ico](../../public/mounteaDialoguerIcon.ico) | Visual asset; no executable logic | Not JavaScript import analysis |
| [public/mounteaDialoguerIcon.png](../../public/mounteaDialoguerIcon.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [public/oauth-callback.html](../../public/oauth-callback.html) | HTML entry/static page | Not JavaScript import analysis |
| [public/robots.txt](../../public/robots.txt) | Build/repository/static support | Not JavaScript import analysis |
| [public/steam-logo-official-black-small.png](../../public/steam-logo-official-black-small.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [public/steam-logo-official-white-small.png](../../public/steam-logo-official-white-small.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/config/nodeForm.json](../../src/config/nodeForm.json) | Data/configuration catalogue | Not JavaScript import analysis |
| [src/config/projectDetails.json](../../src/config/projectDetails.json) | Data/configuration catalogue | Not JavaScript import analysis |
| [src/helpers/autoSaveHelpers.js](../../src/helpers/autoSaveHelpers.js) | 29 lines. Exports: `default (mergeWithExistingData)`. | No renderer path |
| [src/helpers/debounce.js](../../src/helpers/debounce.js) | 9 lines. Exports: `default (debounce)`. | No renderer path |
| [src/helpers/exportCategoriesHelper.js](../../src/helpers/exportCategoriesHelper.js) | 40 lines. Exports: `exportCategories`. | No renderer path |
| [src/helpers/exportDialogueRowsHelper.js](../../src/helpers/exportDialogueRowsHelper.js) | 149 lines. Exports: `exportDialogueRows`, `fetchAudioFile`. | No renderer path |
| [src/helpers/exportParticipantsHelper.js](../../src/helpers/exportParticipantsHelper.js) | 44 lines. Exports: `exportParticipants`. | No renderer path |
| [src/helpers/exportProjectHelper.js](../../src/helpers/exportProjectHelper.js) | 109 lines. Exports: `exportProject`. | No renderer path |
| [src/helpers/importCategoriesHelper.js](../../src/helpers/importCategoriesHelper.js) | 208 lines. Exports: `processImportedCategories`, `importCategories`. | No renderer path |
| [src/helpers/importParticipantsHelper.js](../../src/helpers/importParticipantsHelper.js) | 218 lines. Exports: `processImportedParticipants`, `importParticipants`. | No renderer path |
| [src/helpers/projectManager.js](../../src/helpers/projectManager.js) | 53 lines. Exports: `useProject`, `ProjectProvider`. | No renderer path |
| [src/helpers/validationHelpers.js](../../src/helpers/validationHelpers.js) | 353 lines. Exports: `convertToStandardGuid`, `validateCategories`, `validateParticipants`, `validateNodes`, `validateDialogueRows`, `validateEdges`, `validateAudioFolder`. | No renderer path |
| [src/hooks/useAutoSave.js](../../src/hooks/useAutoSave.js) | 241 lines. Exports: `useAutoSave`, `saveProjectToIndexedDB`, `saveFileToIndexedDB`, `deleteFileFromIndexedDB`. | No renderer path |
| [src/hooks/useAutoSaveNodesAndEdges.js](../../src/hooks/useAutoSaveNodesAndEdges.js) | 54 lines. Exports: `useAutoSaveNodesAndEdges`, `saveNodesAndEdgesToIndexedDB`. | No renderer path |
| [src/icons/addIcon.svg](../../src/icons/addIcon.svg) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/icons/bugReportIcon.svg](../../src/icons/bugReportIcon.svg) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/icons/deleteIcon.svg](../../src/icons/deleteIcon.svg) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/icons/discordIcon.svg](../../src/icons/discordIcon.svg) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/icons/downloadIcon.svg](../../src/icons/downloadIcon.svg) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/icons/editoIcon.svg](../../src/icons/editoIcon.svg) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/icons/favoriteIcon.svg](../../src/icons/favoriteIcon.svg) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/icons/helpIcon.svg](../../src/icons/helpIcon.svg) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/icons/redoIcon.svg](../../src/icons/redoIcon.svg) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/icons/removeIcon.svg](../../src/icons/removeIcon.svg) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/icons/searchIcon.svg](../../src/icons/searchIcon.svg) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/icons/settingsIcon.svg](../../src/icons/settingsIcon.svg) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/icons/undoIcon.svg](../../src/icons/undoIcon.svg) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/icons/uploadIcon.svg](../../src/icons/uploadIcon.svg) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/indexedDB.js](../../src/indexedDB.js) | 25 lines. Exports: `getDB`. | No renderer path |
| [src/lib/confetti.js](../../src/lib/confetti.js) | 164 lines. Exports: `celebrate`, `celebrateFirstDialogue`, `celebrateSuccess`, `celebrateMilestone`, `celebrateFireworks`, `celebrateSmallWin`. | Renderer reachable |
| [src/logo.svg](../../src/logo.svg) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/stores/commandPaletteStore.js](../../src/stores/commandPaletteStore.js) | 26 lines. Exports: `useCommandPaletteStore`. Actions: `openWithActions`, `setOpen`. | Renderer reachable |
| [src/stores/settingsCommandStore.js](../../src/stores/settingsCommandStore.js) | 32 lines. Exports: `useSettingsCommandStore`. Actions: `openWithContext`, `setMode`, `setOpen`, `close`. | Renderer reachable |

## dialogue-preview

[Area guide](dialogue-preview.md). 4 baseline files.

| File | Role / exports / store actions | Entry analysis |
| --- | --- | --- |
| [DocumentationSource/dialogPreview.png](../../DocumentationSource/dialogPreview.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [DocumentationSource/dialogPreview_light.png](../../DocumentationSource/dialogPreview_light.png) | Visual asset; no executable logic | Not JavaScript import analysis |
| [src/components/dialogue/DialoguePreviewOverlay.jsx](../../src/components/dialogue/DialoguePreviewOverlay.jsx) | 1149 lines. Exports: `DialoguePreviewOverlay`. | Renderer reachable |
| [src/lib/dialoguePreviewEngine.js](../../src/lib/dialoguePreviewEngine.js) | 248 lines. Exports: `PREVIEW_START_NODE_ID`, `getPreviewNodesAndEdges`, `validatePreviewGraph`, `buildOutgoingMap`, `getReachablePreviewNodeIds`, `getDialogueRowsForPreview`, `getSpeakerForPreview`, `isTerminalPreviewNode`, `createPreviewNodeRefKey`, `parsePreviewNodeRefKey`, `getPreviewConditionRuleKey`, `collectPreviewScenarioRules`, `evaluatePreviewEdgeConditions`, `resolvePreviewAudioSource`. | Renderer reachable |

## import-export

[Area guide](import-export.md). 2 baseline files.

| File | Role / exports / store actions | Entry analysis |
| --- | --- | --- |
| [ExampleProject/OnboardingExample.mnteadlgproj](../../ExampleProject/OnboardingExample.mnteadlgproj) | ZIP example project; structure inspected | Not JavaScript import analysis |
| [src/lib/export/exportFile.js](../../src/lib/export/exportFile.js) | 61 lines. Exports: `saveExportBlob`, `openContainingFolder`. | Renderer reachable |

## electron-steam

[Area guide](electron-steam.md). 8 baseline files.

| File | Role / exports / store actions | Entry analysis |
| --- | --- | --- |
| [electron/main.cjs](../../electron/main.cjs) | 2100 lines. No extracted ESM export; inspect script/CommonJS/side-effect entry. | Separate entry/config/test |
| [electron/preload.cjs](../../electron/preload.cjs) | 31 lines. No extracted ESM export; inspect script/CommonJS/side-effect entry. | Separate entry/config/test |
| [electron/sentry.cjs](../../electron/sentry.cjs) | 64 lines. No extracted ESM export; inspect script/CommonJS/side-effect entry. | Separate entry/config/test |
| [electron/shared/app-languages.json](../../electron/shared/app-languages.json) | Data/configuration catalogue | Not JavaScript import analysis |
| [electron/steam.cjs](../../electron/steam.cjs) | 453 lines. No extracted ESM export; inspect script/CommonJS/side-effect entry. | Separate entry/config/test |
| [src/lib/electronRuntime.js](../../src/lib/electronRuntime.js) | 16 lines. Exports: `isElectronRuntime`, `isDesktopElectronRuntime`, `hasSteamBridge`. | Renderer reachable |
| [src/lib/steam/steamClient.js](../../src/lib/steam/steamClient.js) | 102 lines. Exports: `getSteamStatus`, `openSteamOverlay`, `setSteamRichPresence`, `unlockSteamAchievement`. | Renderer reachable |
| [src/stores/steamStore.js](../../src/stores/steamStore.js) | 70 lines. Exports: `useSteamStore`. Actions: `loadStatus`, `openOverlay`, `setRichPresence`, `unlockAchievement`, `isSteamAvailable`. | Renderer reachable |

## ui-interaction

[Area guide](ui-interaction.md). 70 baseline files.

| File | Role / exports / store actions | Entry analysis |
| --- | --- | --- |
| [src/components/dialogs/CreateCategoryDialog.jsx](../../src/components/dialogs/CreateCategoryDialog.jsx) | 266 lines. Exports: `CreateCategoryDialog`. | Renderer reachable |
| [src/components/dialogs/CreateConditionDialog.jsx](../../src/components/dialogs/CreateConditionDialog.jsx) | 263 lines. Exports: `CreateConditionDialog`. | Renderer reachable |
| [src/components/dialogs/CreateDecoratorDialog.jsx](../../src/components/dialogs/CreateDecoratorDialog.jsx) | 281 lines. Exports: `CreateDecoratorDialog`. | Renderer reachable |
| [src/components/dialogs/CreateParticipantDialog.jsx](../../src/components/dialogs/CreateParticipantDialog.jsx) | 302 lines. Exports: `CreateParticipantDialog`. | Renderer reachable |
| [src/components/dialogs/EditCategoryDialog.jsx](../../src/components/dialogs/EditCategoryDialog.jsx) | 304 lines. Exports: `EditCategoryDialog`. | Renderer reachable |
| [src/components/dialogs/EditConditionDialog.jsx](../../src/components/dialogs/EditConditionDialog.jsx) | 280 lines. Exports: `EditConditionDialog`. | Renderer reachable |
| [src/components/dialogs/EditDecoratorDialog.jsx](../../src/components/dialogs/EditDecoratorDialog.jsx) | 288 lines. Exports: `EditDecoratorDialog`. | Renderer reachable |
| [src/components/dialogs/EditParticipantDialog.jsx](../../src/components/dialogs/EditParticipantDialog.jsx) | 314 lines. Exports: `EditParticipantDialog`. | Renderer reachable |
| [src/components/dialogues/CreateDialogueDialog.jsx](../../src/components/dialogues/CreateDialogueDialog.jsx) | 174 lines. Exports: `CreateDialogueDialog`. | Renderer reachable |
| [src/components/projects/CategoryCard.jsx](../../src/components/projects/CategoryCard.jsx) | 124 lines. Exports: `CategoryCard`. | Renderer reachable |
| [src/components/projects/ConditionCard.jsx](../../src/components/projects/ConditionCard.jsx) | 115 lines. Exports: `ConditionCard`. | Renderer reachable |
| [src/components/projects/CreateProjectDialog.jsx](../../src/components/projects/CreateProjectDialog.jsx) | 166 lines. Exports: `CreateProjectDialog`. | Renderer reachable |
| [src/components/projects/DecoratorCard.jsx](../../src/components/projects/DecoratorCard.jsx) | 115 lines. Exports: `DecoratorCard`. | Renderer reachable |
| [src/components/projects/DialogueCard.jsx](../../src/components/projects/DialogueCard.jsx) | 145 lines. Exports: `DialogueCard`. | Renderer reachable |
| [src/components/projects/ParticipantCard.jsx](../../src/components/projects/ParticipantCard.jsx) | 127 lines. Exports: `ParticipantCard`. | Renderer reachable |
| [src/components/projects/ProjectHeader.jsx](../../src/components/projects/ProjectHeader.jsx) | 85 lines. Exports: `ProjectHeader`. | No renderer path |
| [src/components/projects/ProjectSidebar.jsx](../../src/components/projects/ProjectSidebar.jsx) | 159 lines. Exports: `ProjectSidebar`. | Renderer reachable |
| [src/components/projects/sections/CategoriesSection.jsx](../../src/components/projects/sections/CategoriesSection.jsx) | 256 lines. Exports: `CategoriesSection`. | Renderer reachable |
| [src/components/projects/sections/ConditionsSection.jsx](../../src/components/projects/sections/ConditionsSection.jsx) | 182 lines. Exports: `ConditionsSection`. | Renderer reachable |
| [src/components/projects/sections/DecoratorsSection.jsx](../../src/components/projects/sections/DecoratorsSection.jsx) | 193 lines. Exports: `DecoratorsSection`. | Renderer reachable |
| [src/components/projects/sections/DialoguesSection.jsx](../../src/components/projects/sections/DialoguesSection.jsx) | 140 lines. Exports: `DialoguesSection`. | Renderer reachable |
| [src/components/projects/sections/OverviewSection.jsx](../../src/components/projects/sections/OverviewSection.jsx) | 508 lines. Exports: `OverviewSection`. | Renderer reachable |
| [src/components/projects/sections/ParticipantsSection.jsx](../../src/components/projects/sections/ParticipantsSection.jsx) | 323 lines. Exports: `ParticipantsSection`. | Renderer reachable |
| [src/components/projects/sections/ProjectSettingsSection.jsx](../../src/components/projects/sections/ProjectSettingsSection.jsx) | 583 lines. Exports: `ProjectSettingsSection`. | Renderer reachable |
| [src/components/ui/KeyboardShortcutsDialog.jsx](../../src/components/ui/KeyboardShortcutsDialog.jsx) | 128 lines. Exports: `KeyboardShortcutsDialog`. | No renderer path |
| [src/components/ui/LanguageSelector.jsx](../../src/components/ui/LanguageSelector.jsx) | 55 lines. Exports: `LanguageSelector`. | Renderer reachable |
| [src/components/ui/LoadingScreen.jsx](../../src/components/ui/LoadingScreen.jsx) | 160 lines. Exports: `LoadingScreen`. | Renderer reachable |
| [src/components/ui/SettingsCommandDialog.jsx](../../src/components/ui/SettingsCommandDialog.jsx) | 353 lines. Exports: `SettingsCommandDialog`. | Renderer reachable |
| [src/components/ui/accordion.jsx](../../src/components/ui/accordion.jsx) | 42 lines. Exports: `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`. | Renderer reachable |
| [src/components/ui/alert-dialog.jsx](../../src/components/ui/alert-dialog.jsx) | 150 lines. Exports: `AlertDialog`, `AlertDialogPortal`, `AlertDialogOverlay`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogMedia`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`. | Renderer reachable |
| [src/components/ui/app-header.jsx](../../src/components/ui/app-header.jsx) | 127 lines. Exports: `AppHeader`. | Renderer reachable |
| [src/components/ui/avatar.jsx](../../src/components/ui/avatar.jsx) | 38 lines. Exports: `Avatar`, `AvatarImage`, `AvatarFallback`. | Renderer reachable |
| [src/components/ui/badge.jsx](../../src/components/ui/badge.jsx) | 30 lines. Exports: `Badge`, `badgeVariants`. | Renderer reachable |
| [src/components/ui/button-group.jsx](../../src/components/ui/button-group.jsx) | 37 lines. Exports: `ButtonGroup`, `ButtonGroupSeparator`, `ButtonGroupText`. | Renderer reachable |
| [src/components/ui/button.jsx](../../src/components/ui/button.jsx) | 45 lines. Exports: `Button`, `buttonVariants`. | Renderer reachable |
| [src/components/ui/card.jsx](../../src/components/ui/card.jsx) | 61 lines. Exports: `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardDescription`, `CardContent`. | Renderer reachable |
| [src/components/ui/carousel.jsx](../../src/components/ui/carousel.jsx) | 220 lines. Exports: `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`, `useCarousel`. | Renderer reachable |
| [src/components/ui/command-palette.jsx](../../src/components/ui/command-palette.jsx) | 564 lines. Exports: `CommandPalette`. | Renderer reachable |
| [src/components/ui/command.jsx](../../src/components/ui/command.jsx) | 117 lines. Exports: `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandSeparator`, `CommandShortcut`. | Renderer reachable |
| [src/components/ui/context-menu.jsx](../../src/components/ui/context-menu.jsx) | 177 lines. Exports: `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuCheckboxItem`, `ContextMenuRadioItem`, `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuShortcut`, `ContextMenuGroup`, `ContextMenuPortal`, `ContextMenuSub`, `ContextMenuSubContent`, `ContextMenuSubTrigger`, `ContextMenuRadioGroup`. | Renderer reachable |
| [src/components/ui/dialog.jsx](../../src/components/ui/dialog.jsx) | 104 lines. Exports: `Dialog`, `DialogPortal`, `DialogOverlay`, `DialogClose`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`. | Renderer reachable |
| [src/components/ui/drawer.jsx](../../src/components/ui/drawer.jsx) | 98 lines. Exports: `Drawer`, `DrawerPortal`, `DrawerOverlay`, `DrawerTrigger`, `DrawerClose`, `DrawerContent`, `DrawerHeader`, `DrawerFooter`, `DrawerTitle`, `DrawerDescription`. | Renderer reachable |
| [src/components/ui/dropdown-menu.jsx](../../src/components/ui/dropdown-menu.jsx) | 83 lines. Exports: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuLabel`, `DropdownMenuGroup`, `DropdownMenuPortal`, `DropdownMenuSub`, `DropdownMenuRadioGroup`. | Renderer reachable |
| [src/components/ui/empty-state.jsx](../../src/components/ui/empty-state.jsx) | 78 lines. Exports: `EmptyState`, `CompactEmptyState`. | Renderer reachable |
| [src/components/ui/input.jsx](../../src/components/ui/input.jsx) | 20 lines. Exports: `Input`. | Renderer reachable |
| [src/components/ui/kbd.jsx](../../src/components/ui/kbd.jsx) | 14 lines. Exports: `Kbd`. | Renderer reachable |
| [src/components/ui/label.jsx](../../src/components/ui/label.jsx) | 17 lines. Exports: `Label`. | Renderer reachable |
| [src/components/ui/native-select.jsx](../../src/components/ui/native-select.jsx) | 24 lines. Exports: `NativeSelect`. | Renderer reachable |
| [src/components/ui/progress.jsx](../../src/components/ui/progress.jsx) | 30 lines. Exports: `Progress`. | Renderer reachable |
| [src/components/ui/save-indicator.jsx](../../src/components/ui/save-indicator.jsx) | 109 lines. Exports: `SaveIndicator`, `SaveDot`. | Renderer reachable |
| [src/components/ui/select.jsx](../../src/components/ui/select.jsx) | 136 lines. Exports: `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`. | No renderer path |
| [src/components/ui/separator.jsx](../../src/components/ui/separator.jsx) | 22 lines. Exports: `Separator`. | Renderer reachable |
| [src/components/ui/skeleton.jsx](../../src/components/ui/skeleton.jsx) | 109 lines. Exports: `Skeleton`, `CardSkeleton`, `ListItemSkeleton`, `TableRowSkeleton`, `FormSkeleton`, `NodeSkeleton`, `TextSkeleton`. | No renderer path |
| [src/components/ui/slider.jsx](../../src/components/ui/slider.jsx) | 56 lines. Exports: `Slider`. | Renderer reachable |
| [src/components/ui/switch.jsx](../../src/components/ui/switch.jsx) | 37 lines. Exports: `Switch`. | Renderer reachable |
| [src/components/ui/table.jsx](../../src/components/ui/table.jsx) | 94 lines. Exports: `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`. | Renderer reachable |
| [src/components/ui/textarea.jsx](../../src/components/ui/textarea.jsx) | 19 lines. Exports: `Textarea`. | Renderer reachable |
| [src/components/ui/toaster.jsx](../../src/components/ui/toaster.jsx) | 212 lines. Exports: `toast`, `clearToasts`, `useToast`, `Toaster`. | Renderer reachable |
| [src/components/ui/tooltip.jsx](../../src/components/ui/tooltip.jsx) | 46 lines. Exports: `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`, `SimpleTooltip`. | Renderer reachable |
| [src/contexts/ThemeProvider.jsx](../../src/contexts/ThemeProvider.jsx) | 95 lines. Exports: `ThemeProvider`, `useTheme`. | Renderer reachable |
| [src/index.css](../../src/index.css) | Styles/theme definitions | Not JavaScript import analysis |
| [src/lib/clipboard.js](../../src/lib/clipboard.js) | 57 lines. Exports: `copyToClipboard`, `copyToClipboardWithToast`. | Renderer reachable |
| [src/lib/dateUtils.js](../../src/lib/dateUtils.js) | 75 lines. Exports: `formatDistanceToNow`, `formatDate`, `formatFileSize`. | Renderer reachable |
| [src/lib/deviceDetection.js](../../src/lib/deviceDetection.js) | 167 lines. Exports: `getDeviceType`, `isMobileDevice`, `isTabletDevice`, `isDesktopDevice`, `isMobileOrTablet`, `isTouchDevice`, `isAppleDevice`, `startDeviceOverrideListener`. | Renderer reachable |
| [src/lib/keyboardShortcuts.js](../../src/lib/keyboardShortcuts.js) | 24 lines. Exports: `getPrimaryModifierKey`, `formatShortcut`, `formatShortcutKeys`. | Renderer reachable |
| [src/lib/utils.js](../../src/lib/utils.js) | 12 lines. Exports: `cn`. | Renderer reachable |
| [src/routes/data-policy.jsx](../../src/routes/data-policy.jsx) | 29 lines. Exports: `Route`. | Renderer reachable |
| [src/routes/index.jsx](../../src/routes/index.jsx) | 845 lines. Exports: `Route`. | Renderer reachable |
| [src/routes/projects/$projectId/index.jsx](../../src/routes/projects/$projectId/index.jsx) | 471 lines. Exports: `Route`. | Renderer reachable |
| [src/routes/terms-of-service.jsx](../../src/routes/terms-of-service.jsx) | 42 lines. Exports: `Route`. | Renderer reachable |

## graph-editor

[Area guide](graph-editor.md). 21 baseline files.

| File | Role / exports / store actions | Entry analysis |
| --- | --- | --- |
| [src/components/dialogue/CollapsibleSection.jsx](../../src/components/dialogue/CollapsibleSection.jsx) | 28 lines. Exports: `CollapsibleSection`. | Renderer reachable |
| [src/components/dialogue/DecoratorsPanel.jsx](../../src/components/dialogue/DecoratorsPanel.jsx) | 225 lines. Exports: `DecoratorsPanel`. | Renderer reachable |
| [src/components/dialogue/DialogueSettingsPanel.jsx](../../src/components/dialogue/DialogueSettingsPanel.jsx) | 242 lines. Exports: `DialogueSettingsPanel`. | Renderer reachable |
| [src/components/dialogue/EdgeConditionsPanel.jsx](../../src/components/dialogue/EdgeConditionsPanel.jsx) | 237 lines. Exports: `EdgeConditionsPanel`. | Renderer reachable |
| [src/components/dialogue/NodeConnectionModal.jsx](../../src/components/dialogue/NodeConnectionModal.jsx) | 82 lines. Exports: `NodeConnectionModal`. | Renderer reachable |
| [src/components/dialogue/NodeTypeSelectionModal.jsx](../../src/components/dialogue/NodeTypeSelectionModal.jsx) | 104 lines. Exports: `NodeTypeSelectionModal`. | Renderer reachable |
| [src/components/dialogue/ZoomSlider.jsx](../../src/components/dialogue/ZoomSlider.jsx) | 69 lines. Exports: `ZoomSlider`. | Renderer reachable |
| [src/components/dialogue/edges/ConditionEdge.jsx](../../src/components/dialogue/edges/ConditionEdge.jsx) | 103 lines. Exports: `default (ConditionEdge)`. | Renderer reachable |
| [src/components/dialogue/nodes/AnswerNode.jsx](../../src/components/dialogue/nodes/AnswerNode.jsx) | 122 lines. Exports: `default (AnswerNode)`. | Renderer reachable |
| [src/components/dialogue/nodes/CompleteNode.jsx](../../src/components/dialogue/nodes/CompleteNode.jsx) | 133 lines. Exports: `default (CompleteNode)`. | Renderer reachable |
| [src/components/dialogue/nodes/DelayNode.jsx](../../src/components/dialogue/nodes/DelayNode.jsx) | 71 lines. Exports: `default (DelayNode)`. | Renderer reachable |
| [src/components/dialogue/nodes/LeadNode.jsx](../../src/components/dialogue/nodes/LeadNode.jsx) | 122 lines. Exports: `default (LeadNode)`. | Renderer reachable |
| [src/components/dialogue/nodes/OpenChildGraphNode.jsx](../../src/components/dialogue/nodes/OpenChildGraphNode.jsx) | 60 lines. Exports: `default (OpenChildGraphNode)`. | Renderer reachable |
| [src/components/dialogue/nodes/PlaceholderNode.jsx](../../src/components/dialogue/nodes/PlaceholderNode.jsx) | 56 lines. Exports: `default`. | Renderer reachable |
| [src/components/dialogue/nodes/ReturnNode.jsx](../../src/components/dialogue/nodes/ReturnNode.jsx) | 69 lines. Exports: `default (ReturnNode)`. | Renderer reachable |
| [src/components/dialogue/nodes/StartNode.jsx](../../src/components/dialogue/nodes/StartNode.jsx) | 51 lines. Exports: `default (StartNode)`. | Renderer reachable |
| [src/config/dialogueNodes.js](../../src/config/dialogueNodes.js) | 14 lines. Exports: `NODE_DEFINITIONS`, `getNodeDefinition`, `getNodeDefinitionsList`, `getCreatableNodeDefinitions`, `getNodeDefaultData`. | Renderer reachable |
| [src/config/dialogueNodes.json](../../src/config/dialogueNodes.json) | Data/configuration catalogue | Not JavaScript import analysis |
| [src/config/edgeConditions.js](../../src/config/edgeConditions.js) | 18 lines. Exports: `getConditionDefaultValues`, `createConditionInstance`. | Renderer reachable |
| [src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx) | 3121 lines. Exports: `Route`. | Renderer reachable |
| [src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx) | 619 lines. Exports: `Route`. | Renderer reachable |

## media

[Area guide](media.md). 8 baseline files.

| File | Role / exports / store actions | Entry analysis |
| --- | --- | --- |
| [src/components/dialogue/DialogueRowsPanel.jsx](../../src/components/dialogue/DialogueRowsPanel.jsx) | 648 lines. Exports: `DialogueRowsPanel`. | Renderer reachable |
| [src/lib/assetNaming.js](../../src/lib/assetNaming.js) | 33 lines. Exports: `sanitizeUnrealIdentifier`, `sanitizeAudioFileName`, `sanitizeAttachmentIdSegment`. | Renderer reachable |
| [src/lib/assetNaming.test.js](../../src/lib/assetNaming.test.js) | 37 lines. No extracted ESM export; inspect script/CommonJS/side-effect entry. | No renderer path |
| [src/lib/audioStorage.js](../../src/lib/audioStorage.js) | 125 lines. Exports: `storeAudioFile`, `dataUrlToBlob`, `createAudioUrl`, `getAudioDuration`, `validateAudioFile`. | Renderer reachable |
| [src/lib/audioUtils.js](../../src/lib/audioUtils.js) | 61 lines. Exports: `blobToBase64`, `base64ToBlob`, `prepareAudioForStorage`, `restoreAudioFromStorage`. | Renderer reachable |
| [src/lib/dialogueImportAudio.js](../../src/lib/dialogueImportAudio.js) | 37 lines. Exports: `getScopedRowAudioFilePaths`, `resolveRowAudioImportSelection`. | Renderer reachable |
| [src/lib/dialogueImportAudio.test.js](../../src/lib/dialogueImportAudio.test.js) | 64 lines. No extracted ESM export; inspect script/CommonJS/side-effect entry. | No renderer path |
| [src/lib/participantThumbnails.js](../../src/lib/participantThumbnails.js) | 178 lines. Exports: `buildParticipantImageId`, `resolveParticipantThumbnailDataUrl`, `storedParticipantThumbnailToBlob`, `blobToStoredParticipantThumbnail`, `processParticipantThumbnailFile`. | Renderer reachable |

## synchronization

[Area guide](synchronization.md). 16 baseline files.

| File | Role / exports / store actions | Entry analysis |
| --- | --- | --- |
| [src/components/sync/GoogleDriveIcon.jsx](../../src/components/sync/GoogleDriveIcon.jsx) | 7 lines. Exports: `GoogleDriveIcon`. | Renderer reachable |
| [src/components/sync/SteamIcon.jsx](../../src/components/sync/SteamIcon.jsx) | 12 lines. Exports: `SteamIcon`. | Renderer reachable |
| [src/components/sync/SyncLoginDialog.jsx](../../src/components/sync/SyncLoginDialog.jsx) | 493 lines. Exports: `SyncLoginDialog`. | Renderer reachable |
| [src/components/sync/SyncPullDialog.jsx](../../src/components/sync/SyncPullDialog.jsx) | 116 lines. Exports: `SyncPullDialog`. | Renderer reachable |
| [src/components/sync/SyncStatusBadge.jsx](../../src/components/sync/SyncStatusBadge.jsx) | 87 lines. Exports: `SyncStatusBadge`. | No renderer path |
| [src/lib/sync/core/constants.js](../../src/lib/sync/core/constants.js) | 32 lines. Exports: `FILE_PREFIX`, `FILE_SUFFIX`, `LEGACY_FILE_SUFFIXES`, `MIME_TYPE`, `MAX_SYNC_PAYLOAD_MIB`, `MAX_SYNC_PAYLOAD_BYTES`, `SYNC_CATALOG_FILE_NAME`, `SYNC_CATALOG_SCHEMA_VERSION`, `SYNC_TOMBSTONE_TTL_DAYS`, `SYNC_TOMBSTONE_TTL_MS`, `STEAM_REMOTE_LIST_RETRY_COUNT`, `STEAM_REMOTE_LIST_RETRY_DELAY_MS`, `PARTICIPANT_THUMBNAIL_MAX_INPUT_BYTES`, `PARTICIPANT_THUMBNAIL_MAX_DIMENSION`, `PARTICIPANT_THUMBNAIL_MIN_DIMENSION`, `PARTICIPANT_THUMBNAIL_MAX_BYTES`, `PARTICIPANT_THUMBNAIL_ALLOWED_TYPES`, `PARTICIPANT_THUMBNAIL_INPUT_ACCEPT`, `wait`. | Renderer reachable |
| [src/lib/sync/core/providerCatalog.js](../../src/lib/sync/core/providerCatalog.js) | 335 lines. Exports: `createDefaultProviderCatalog`, `normalizeProviderCatalog`, `stripCatalogTransientFields`, `readProviderCatalog`, `writeProviderCatalog`, `mergeProviderCatalogs`. | Renderer reachable |
| [src/lib/sync/core/remoteCatalog.js](../../src/lib/sync/core/remoteCatalog.js) | 121 lines. Exports: `buildFileName`, `extractProjectId`, `getRevisionFromFile`, `checkRemoteDiff`, `findRemoteProjectById`, `listRemoteProjects`, `listRemoteProjectsWithSteamRetry`. | Renderer reachable |
| [src/lib/sync/core/syncActions.js](../../src/lib/sync/core/syncActions.js) | 776 lines. Exports: `previewPullFromFile`, `previewPushProject`, `pullProjectFromFile`, `pullProject`, `pullProjectAsNew`, `pushProject`, `publishTombstone`, `applyMergedTombstones`, `gcExpiredTombstones`, `deleteRemoteProject`, `deleteLocalProject`, `syncAllProjects`. | Renderer reachable |
| [src/lib/sync/core/syncPlanner.js](../../src/lib/sync/core/syncPlanner.js) | 170 lines. Exports: `dedupeRemoteProjects`, `diffRemoteLocal`. | Renderer reachable |
| [src/lib/sync/crypto.js](../../src/lib/sync/crypto.js) | 85 lines. Exports: `encryptPayload`, `decryptPayload`. | Renderer reachable |
| [src/lib/sync/payloadBudget.js](../../src/lib/sync/payloadBudget.js) | 37 lines. Exports: `getUtf8ByteLength`, `estimateEncryptedPayloadBytesForPlaintextBytes`, `estimateEncryptedPayloadBytesFromData`, `formatBytesToMib`, `assertEstimatedSyncPayloadWithinBudget`. | Renderer reachable |
| [src/lib/sync/snapshot.js](../../src/lib/sync/snapshot.js) | 334 lines. Exports: `buildProjectSnapshot`, `applyProjectSnapshot`, `applyProjectSnapshotAsNew`. | Renderer reachable |
| [src/lib/sync/syncEngine.js](../../src/lib/sync/syncEngine.js) | 31 lines. Exports: `buildFileName`, `checkRemoteDiff`, `extractProjectId`, `getRevisionFromFile`, `listRemoteProjects`, `dedupeRemoteProjects`, `diffRemoteLocal`, `previewPullFromFile`, `previewPushProject`, `pullProject`, `pullProjectAsNew`, `pullProjectFromFile`, `pushProject`, `publishTombstone`, `applyMergedTombstones`, `gcExpiredTombstones`, `deleteRemoteProject`, `deleteLocalProject`, `syncAllProjects`, `readProviderCatalog`, `writeProviderCatalog`, `mergeProviderCatalogs`. | Renderer reachable |
| [src/lib/sync/syncStorage.js](../../src/lib/sync/syncStorage.js) | 281 lines. Exports: `getSyncAccount`, `upsertSyncAccount`, `clearSyncAccount`, `getSyncProject`, `upsertSyncProject`, `clearSyncProject`, `getSyncCatalogState`, `upsertSyncCatalogState`, `listSyncCatalogStates`, `getSyncTombstone`, `upsertSyncTombstone`, `acknowledgeSyncTombstone`, `listSyncTombstones`, `clearSyncTombstone`, `clearSyncTombstonesByEntity`, `hasActiveTombstone`, `listPendingSyncTombstones`, `getSyncDeletion`, `upsertSyncDeletion`, `listSyncDeletions`, `clearSyncDeletion`. | Renderer reachable |
| [src/stores/syncStore.js](../../src/stores/syncStore.js) | 1354 lines. Exports: `useSyncStore`. Actions: `getItem`, `setItem`, `removeItem`, `getItem`, `setItem`, `removeItem`, `getProviderInput`, `getProviderPassphrase`, `setProviderInput`, `setProviderPassphrase`, `setProviderAccountLabel`, `setProviderRememberPassphrase`, `setPassphrase`, `setAccountLabel`, `setRememberPassphrase`, `setClientId`, `clearError`, `setHasHydrated`, `setHideLoginPrompt`, `setLoginDialogOpen`, `setSyncMode`, `loadAccount`, `connectSteamProvider`, `connectGoogleDrive`, `disconnect`, `processPendingTombstones`, `scheduleProjectDeletion`, `scheduleDialogueDeletion`, `syncAllProjects`, `onProgress`, `schedulePush`, `checkRemoteDiff`, `startPull`, `onProgress`, `pushProject`, `partialize`, `onRehydrateStorage`. | Renderer reachable |

## onboarding-observability

[Area guide](onboarding-observability.md). 6 baseline files.

| File | Role / exports / store actions | Entry analysis |
| --- | --- | --- |
| [src/components/ui/AppErrorBoundary.jsx](../../src/components/ui/AppErrorBoundary.jsx) | 19 lines. Exports: `AppErrorBoundary`. | Renderer reachable |
| [src/components/ui/onboarding-tour.jsx](../../src/components/ui/onboarding-tour.jsx) | 566 lines. Exports: `OnboardingTour`, `useOnboarding`. | Renderer reachable |
| [src/config/steamAchievements.js](../../src/config/steamAchievements.js) | 70 lines. Exports: `STEAM_ACHIEVEMENT_IDS`, `STEAM_ACHIEVEMENTS`. | Renderer reachable |
| [src/lib/achievements/achievementTracker.js](../../src/lib/achievements/achievementTracker.js) | 152 lines. Exports: `trackExampleProjectCreated`, `trackFirstNonExampleProjectCreated`, `trackFirstCategoryCreated`, `trackFirstDecoratorCreated`, `trackFirstParticipantCreated`, `trackFirstConditionCreated`, `markUserActivity`, `getTrackedPlaytimeMinutes`, `trackActiveMinute`. | Renderer reachable |
| [src/lib/monitoring/sentry.js](../../src/lib/monitoring/sentry.js) | 33 lines. Exports: `initRendererSentry`, `isRendererSentryEnabled`. | Renderer reachable |
| [src/lib/onboarding/templateLoader.js](../../src/lib/onboarding/templateLoader.js) | 147 lines. Exports: `ONBOARDING_TEMPLATE_ERROR_CODES`, `OnboardingTemplateError`, `resolveOnboardingExampleTemplateFile`. | Renderer reachable |

## localization

[Area guide](localization.md). 10 baseline files.

| File | Role / exports / store actions | Entry analysis |
| --- | --- | --- |
| [src/i18n/index.js](../../src/i18n/index.js) | 41 lines. Exports: `default (i18n)`. | Renderer reachable |
| [src/i18n/locales/cs.json](../../src/i18n/locales/cs.json) | Data/configuration catalogue | Not JavaScript import analysis |
| [src/i18n/locales/de.json](../../src/i18n/locales/de.json) | Data/configuration catalogue | Not JavaScript import analysis |
| [src/i18n/locales/en.json](../../src/i18n/locales/en.json) | Data/configuration catalogue | Not JavaScript import analysis |
| [src/i18n/locales/es.json](../../src/i18n/locales/es.json) | Data/configuration catalogue | Not JavaScript import analysis |
| [src/i18n/locales/fr.json](../../src/i18n/locales/fr.json) | Data/configuration catalogue | Not JavaScript import analysis |
| [src/i18n/locales/pl.json](../../src/i18n/locales/pl.json) | Data/configuration catalogue | Not JavaScript import analysis |
| [src/lib/localization/appLanguages.js](../../src/lib/localization/appLanguages.js) | 26 lines. Exports: `APP_LANGUAGE_OPTIONS`, `APP_LANGUAGE_CODES`, `getAppLanguageLabel`. | Renderer reachable |
| [src/lib/localization/localeCatalog.js](../../src/lib/localization/localeCatalog.js) | 47 lines. Exports: `getLocalizationLocaleLabel`, `LOCALIZATION_LOCALE_OPTIONS`. | Renderer reachable |
| [src/lib/localization/stringTable.js](../../src/lib/localization/stringTable.js) | 973 lines. Exports: `LOCALIZED_STRING_FIELDS`, `slugifyForKeySegment`, `isValidLocaleTag`, `normalizeLocaleTag`, `normalizeProjectLocalizationConfig`, `isProjectLocalizationEnabled`, `ensureDialogueLocalizationSlug`, `ensureNodeLocalizationToken`, `ensureRowLocalizationToken`, `buildReadableLocalizedStringKey`, `buildLocalizedStringKey`, `parseLocalizedStringKey`, `normalizeLocalizedStringEntry`, `prepareLocalizedNodesAndEntries`, `materializeLocalizedNodes`, `buildLocalizedEntriesFromNodes`, `validateLocalizedEntriesForDialogue`, `buildStringTableV2Payload`, `parseImportedStringTableData`, `remapLocalizedEntriesForImportedDialogue`, `filterLocalizedEntriesByDialogue`, `DEFAULT_LOCALE`. | Renderer reachable |

## persistence

[Area guide](persistence.md). 4 baseline files.

| File | Role / exports / store actions | Entry analysis |
| --- | --- | --- |
| [src/lib/db.js](../../src/lib/db.js) | 235 lines. Exports: `MounteaDialoguerDB`, `db`, `getProfileScopedDbName`. | Renderer reachable |
| [src/lib/profile/activeProfile.js](../../src/lib/profile/activeProfile.js) | 64 lines. Exports: `getActiveProfileId`, `setActiveProfileId`, `resolveProfileIdFromSteamStatus`, `initializeActiveProfileFromSteamStatus`, `buildProfileScopedKey`, `readProfileScopedItem`, `writeProfileScopedItem`. | Renderer reachable |
| [src/lib/storageUtils.js](../../src/lib/storageUtils.js) | 148 lines. Exports: `calculateDiskUsage`, `calculateProjectSize`, `calculateDialogueSize`, `getStorageQuota`. | Renderer reachable |
| [src/stores/uiStore.js](../../src/stores/uiStore.js) | 86 lines. Exports: `useUIStore`. Actions: `getItem`, `setItem`, `removeItem`, `getItem`, `setItem`, `removeItem`, `toggleSidebar`, `setSidebarOpen`, `setViewMode`, `setSortBy`, `setSortOrder`, `setProjectContentLocale`, `clearProjectContentLocale`. | Renderer reachable |

## architecture

[Area guide](architecture.md). 3 baseline files.

| File | Role / exports / store actions | Entry analysis |
| --- | --- | --- |
| [src/lib/runtimeConfig.js](../../src/lib/runtimeConfig.js) | 33 lines. Exports: `getDistributionChannel`, `isSteamChannel`, `isGoogleSyncEnabled`, `getOnboardingExampleProjectRemoteUrl`, `getOnboardingExampleBundledPath`. | Renderer reachable |
| [src/main.jsx](../../src/main.jsx) | 29 lines. No extracted ESM export; inspect script/CommonJS/side-effect entry. | Renderer reachable |
| [src/routes/__root.jsx](../../src/routes/__root.jsx) | 955 lines. Exports: `Route`. | Renderer reachable |

## cloud-providers

[Area guide](cloud-providers.md). 7 baseline files.

| File | Role / exports / store actions | Entry analysis |
| --- | --- | --- |
| [src/lib/sync/core/providerGateway.js](../../src/lib/sync/core/providerGateway.js) | 12 lines. Exports: `getSyncContext`. | Renderer reachable |
| [src/lib/sync/googleDriveAuth.js](../../src/lib/sync/googleDriveAuth.js) | 256 lines. Exports: `getStoredClientId`, `setStoredClientId`, `getConfiguredClientId`, `startGoogleDriveAuth`, `exchangeCodeForToken`, `refreshAccessToken`, `fetchUserInfo`, `getGoogleClientId`. | Renderer reachable |
| [src/lib/sync/googleDriveClient.js](../../src/lib/sync/googleDriveClient.js) | 244 lines. Exports: `findAppDataFile`, `listAppDataFiles`, `downloadAppDataFile`, `createAppDataFile`, `updateAppDataFile`, `deleteAppDataFile`. | Renderer reachable |
| [src/lib/sync/googleDriveConfig.js](../../src/lib/sync/googleDriveConfig.js) | 52 lines. Exports: `getGoogleTeamFolderId`, `getGoogleDriveSyncRoot`, `isGoogleTeamSyncEnabled`, `getGoogleDriveScopes`. | Renderer reachable |
| [src/lib/sync/providers/providerRegistry.js](../../src/lib/sync/providers/providerRegistry.js) | 35 lines. Exports: `DEFAULT_SYNC_PROVIDER_ID`, `SYNC_PROVIDER_CONFIGS`, `SYNC_PROVIDER_IDS`, `normalizeSyncProviderId`, `getSyncProviderConfig`, `supportsCloudSync`. | Renderer reachable |
| [src/lib/sync/providers/storageProviders.js](../../src/lib/sync/providers/storageProviders.js) | 75 lines. Exports: `resolveSyncProviderId`, `getSyncStorageProvider`, `assertCloudSyncStorageProvider`. | Renderer reachable |
| [src/lib/sync/steamCloudClient.js](../../src/lib/sync/steamCloudClient.js) | 125 lines. Exports: `findSteamCloudFile`, `listSteamCloudFiles`, `downloadSteamCloudFile`, `createSteamCloudFile`, `updateSteamCloudFile`, `deleteSteamCloudFile`. | Renderer reachable |

## domain-model

[Area guide](domain-model.md). 6 baseline files.

| File | Role / exports / store actions | Entry analysis |
| --- | --- | --- |
| [src/stores/categoryStore.js](../../src/stores/categoryStore.js) | 454 lines. Exports: `useCategoryStore`. Actions: `isCategoryNameValid`, `getRootCategoryId`, `isNameUniqueInTree`, `getCategoryDepth`, `getMaxSubtreeDepth`, `loadCategories`, `createCategory`, `updateCategory`, `deleteCategory`, `importCategories`, `buildCategoryPath`, `exportCategories`. | Renderer reachable |
| [src/stores/conditionStore.js](../../src/stores/conditionStore.js) | 176 lines. Exports: `useConditionStore`. Actions: `loadConditions`, `createCondition`, `updateCondition`, `deleteCondition`, `importConditions`, `exportConditions`. | Renderer reachable |
| [src/stores/decoratorStore.js](../../src/stores/decoratorStore.js) | 190 lines. Exports: `useDecoratorStore`. Actions: `loadDecorators`, `createDecorator`, `updateDecorator`, `deleteDecorator`, `importDecorators`, `exportDecorators`. | Renderer reachable |
| [src/stores/dialogueStore.js](../../src/stores/dialogueStore.js) | 1591 lines. Exports: `useDialogueStore`. Actions: `loadDialogues`, `createDialogue`, `updateDialogue`, `deleteDialogue`, `setCurrentDialogue`, `updateNodes`, `updateEdges`, `saveDialogueGraph`, `loadDialogueGraph`, `loadDialogueGraphForPreview`, `clearCurrentDialogue`, `exportDialogue`, `onClick`, `exportDialogueAsBlob`, `importDialogue`. | Renderer reachable |
| [src/stores/participantStore.js](../../src/stores/participantStore.js) | 528 lines. Exports: `useParticipantStore`. Actions: `loadParticipants`, `createParticipant`, `updateParticipant`, `deleteParticipant`, `importParticipantsFromFile`, `importParticipants`, `exportParticipants`, `exportParticipantsArchive`. | Renderer reachable |
| [src/stores/projectStore.js](../../src/stores/projectStore.js) | 940 lines. Exports: `useProjectStore`. Actions: `loadProjects`, `createProject`, `createOnboardingExampleProject`, `onImported`, `updateProject`, `updateProjectLocalization`, `deleteProject`, `setCurrentProject`, `clearCurrentProject`, `exportProject`, `onClick`, `importProject`. | Renderer reachable |
