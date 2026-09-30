# Logic and callable index

Historical line locations preserved for the investigation. Use the [current callable index](logic-index-current.md) for repaired and newly added functions.

Total: **2554 callable syntax nodes** across **180 code files**.

This baseline navigation index includes every parsed function declaration, function expression, arrow callback, object method, and class method in the 180 JavaScript-family files. Anonymous callbacks are identified by enclosing syntax and line; repeated names at different lines are distinct functions. Import/export bindings, store actions, and file ownership are in the [source map](source-map.md). Behavioral contracts and limitations live in the area guides, not in the symbol name.

Source links use GitHub line anchors. Locations describe the documented baseline and can drift after edits. JSX markup, expressions, configuration data, and imported library internals are not separate function entries. No runtime coverage is implied by inclusion.

## .eslintrc.cjs

[.eslintrc.cjs](../../.eslintrc.cjs) · [build-release-testing guide](build-release-testing.md)

No locally declared callable; configuration, exports, or side effects only.

## electron/main.cjs

[electron/main.cjs](../../electron/main.cjs) · [electron-steam guide](electron-steam.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `configureLinuxRuntimeStability` | [57](../../electron/main.cjs#L57) | sync |
| `canUseUserDataPath` | [74](../../electron/main.cjs#L74) | sync |
| `getUserDataFallbackCandidates` | [92](../../electron/main.cjs#L92) | sync |
| `getUserDataDirFromProcessArgs` | [113](../../electron/main.cjs#L113) | sync |
| `ensureWritableUserDataPath` | [122](../../electron/main.cjs#L122) | sync |
| `anonymous arrow (CallExpression)` | [146](../../electron/main.cjs#L146) | sync |
| `reportMainProcessError` | [178](../../electron/main.cjs#L178) | sync |
| `readDotEnvValueFromFile` | [205](../../electron/main.cjs#L205) | sync |
| `readDotEnvValue` | [238](../../electron/main.cjs#L238) | sync |
| `resolveDesktopOAuthClientId` | [256](../../electron/main.cjs#L256) | sync |
| `resolveDesktopOAuthClientSecret` | [265](../../electron/main.cjs#L265) | sync |
| `toBase64Url` | [283](../../electron/main.cjs#L283) | sync |
| `createPkcePair` | [291](../../electron/main.cjs#L291) | sync |
| `getIconPath` | [299](../../electron/main.cjs#L299) | sync |
| `anonymous arrow (CallExpression)` | [306](../../electron/main.cjs#L306) | sync |
| `getDistIndexPath` | [309](../../electron/main.cjs#L309) | sync |
| `isAllowedExternalUrl` | [313](../../electron/main.cjs#L313) | sync |
| `isInternalNavigation` | [348](../../electron/main.cjs#L348) | sync |
| `shouldBlockNativeShortcut` | [356](../../electron/main.cjs#L356) | sync |
| `sanitizeFileNameForSaveDialog` | [380](../../electron/main.cjs#L380) | sync |
| `normalizeSaveDialogFilters` | [387](../../electron/main.cjs#L387) | sync |
| `anonymous arrow (CallExpression)` | [390](../../electron/main.cjs#L390) | sync |
| `anonymous arrow (CallExpression)` | [394](../../electron/main.cjs#L394) | sync |
| `openPathInShell` | [403](../../electron/main.cjs#L403) | async |
| `openContainingFolderInShell` | [410](../../electron/main.cjs#L410) | async |
| `saveFileFromRenderer` | [439](../../electron/main.cjs#L439) | async |
| `sanitizeSteamSyncSegment` | [469](../../electron/main.cjs#L469) | sync |
| `getSteamSyncRootDirectory` | [474](../../electron/main.cjs#L474) | sync |
| `getSteamSyncProfileDirectory` | [478](../../electron/main.cjs#L478) | sync |
| `logSteamSyncEvent` | [483](../../electron/main.cjs#L483) | sync |
| `ensureSteamSyncRootDirectory` | [499](../../electron/main.cjs#L499) | async |
| `ensureSteamSyncProfileDirectory` | [505](../../electron/main.cjs#L505) | async |
| `ensureSteamSyncDirectoriesForRuntime` | [512](../../electron/main.cjs#L512) | async |
| `getSteamSyncBundleCachePath` | [546](../../electron/main.cjs#L546) | sync |
| `getSteamSyncBundleCloudFileName` | [553](../../electron/main.cjs#L553) | sync |
| `getSteamCloudRuntimeStatus` | [558](../../electron/main.cjs#L558) | sync |
| `normalizeSteamSyncAppProperties` | [572](../../electron/main.cjs#L572) | sync |
| `normalizeSteamSyncEntry` | [583](../../electron/main.cjs#L583) | sync |
| `createEmptySteamSyncBundle` | [601](../../electron/main.cjs#L601) | sync |
| `normalizeSteamSyncBundle` | [610](../../electron/main.cjs#L610) | sync |
| `anonymous arrow (CallExpression)` | [631](../../electron/main.cjs#L631) | sync |
| `readLegacySteamSyncEntriesFromLocal` | [641](../../electron/main.cjs#L641) | async |
| `cleanupLegacySteamSyncFiles` | [667](../../electron/main.cjs#L667) | async |
| `readSteamSyncBundleFromLocal` | [683](../../electron/main.cjs#L683) | async |
| `readSteamSyncBundleFromCloud` | [725](../../electron/main.cjs#L725) | sync |
| `writeSteamSyncBundleToLocal` | [741](../../electron/main.cjs#L741) | async |
| `writeSteamSyncBundleToCloud` | [752](../../electron/main.cjs#L752) | sync |
| `readSteamSyncBundle` | [760](../../electron/main.cjs#L760) | async |
| `writeSteamSyncBundle` | [771](../../electron/main.cjs#L771) | async |
| `toSteamSyncFileMetadata` | [777](../../electron/main.cjs#L777) | sync |
| `listSteamSyncEntries` | [786](../../electron/main.cjs#L786) | async |
| `steamSyncFindFile` | [797](../../electron/main.cjs#L797) | async |
| `anonymous arrow (CallExpression)` | [803](../../electron/main.cjs#L803) | sync |
| `steamSyncListFiles` | [809](../../electron/main.cjs#L809) | async |
| `anonymous arrow (CallExpression)` | [814](../../electron/main.cjs#L814) | sync |
| `anonymous arrow (CallExpression)` | [815](../../electron/main.cjs#L815) | sync |
| `steamSyncDownloadFile` | [825](../../electron/main.cjs#L825) | async |
| `anonymous arrow (CallExpression)` | [833](../../electron/main.cjs#L833) | sync |
| `steamSyncCreateFile` | [846](../../electron/main.cjs#L846) | async |
| `steamSyncUpdateFile` | [904](../../electron/main.cjs#L904) | async |
| `anonymous arrow (CallExpression)` | [912](../../electron/main.cjs#L912) | sync |
| `anonymous arrow (CallExpression)` | [927](../../electron/main.cjs#L927) | sync |
| `steamSyncDeleteFile` | [966](../../electron/main.cjs#L966) | async |
| `anonymous arrow (CallExpression)` | [974](../../electron/main.cjs#L974) | sync |
| `anonymous arrow (CallExpression)` | [979](../../electron/main.cjs#L979) | sync |
| `sendMenuCommand` | [1013](../../electron/main.cjs#L1013) | sync |
| `normalizeLocaleCode` | [1019](../../electron/main.cjs#L1019) | sync |
| `getLocaleMenuLabel` | [1023](../../electron/main.cjs#L1023) | sync |
| `anonymous arrow (CallExpression)` | [1027](../../electron/main.cjs#L1027) | sync |
| `anonymous arrow (CallExpression)` | [1033](../../electron/main.cjs#L1033) | sync |
| `normalizeMenuContext` | [1047](../../electron/main.cjs#L1047) | sync |
| `anonymous arrow (CallExpression)` | [1056](../../electron/main.cjs#L1056) | sync |
| `updateMenuContext` | [1073](../../electron/main.cjs#L1073) | sync |
| `createAppMenu` | [1078](../../electron/main.cjs#L1078) | sync |
| `anonymous arrow (CallExpression)` | [1097](../../electron/main.cjs#L1097) | sync |
| `click` | [1101](../../electron/main.cjs#L1101) | sync |
| `anonymous arrow (CallExpression)` | [1103](../../electron/main.cjs#L1103) | sync |
| `click` | [1107](../../electron/main.cjs#L1107) | sync |
| `appendMenuSection` | [1120](../../electron/main.cjs#L1120) | sync |
| `click` | [1133](../../electron/main.cjs#L1133) | sync |
| `click` | [1140](../../electron/main.cjs#L1140) | sync |
| `click` | [1146](../../electron/main.cjs#L1146) | sync |
| `click` | [1153](../../electron/main.cjs#L1153) | sync |
| `click` | [1166](../../electron/main.cjs#L1166) | sync |
| `click` | [1172](../../electron/main.cjs#L1172) | sync |
| `click` | [1177](../../electron/main.cjs#L1177) | sync |
| `click` | [1191](../../electron/main.cjs#L1191) | sync |
| `click` | [1199](../../electron/main.cjs#L1199) | sync |
| `click` | [1206](../../electron/main.cjs#L1206) | sync |
| `click` | [1221](../../electron/main.cjs#L1221) | sync |
| `click` | [1226](../../electron/main.cjs#L1226) | sync |
| `click` | [1235](../../electron/main.cjs#L1235) | sync |
| `click` | [1242](../../electron/main.cjs#L1242) | sync |
| `click` | [1249](../../electron/main.cjs#L1249) | sync |
| `click` | [1253](../../electron/main.cjs#L1253) | sync |
| `click` | [1271](../../electron/main.cjs#L1271) | sync |
| `click` | [1275](../../electron/main.cjs#L1275) | sync |
| `click` | [1296](../../electron/main.cjs#L1296) | sync |
| `click` | [1305](../../electron/main.cjs#L1305) | sync |
| `click` | [1315](../../electron/main.cjs#L1315) | sync |
| `click` | [1321](../../electron/main.cjs#L1321) | sync |
| `click` | [1325](../../electron/main.cjs#L1325) | sync |
| `click` | [1331](../../electron/main.cjs#L1331) | sync |
| `click` | [1335](../../electron/main.cjs#L1335) | sync |
| `renderOAuthResultPage` | [1380](../../electron/main.cjs#L1380) | sync |
| `renderOAuthTokenRelayPage` | [1428](../../electron/main.cjs#L1428) | sync |
| `exchangeCodeForToken` | [1474](../../electron/main.cjs#L1474) | async |
| `executeOAuthAttempt` | [1524](../../electron/main.cjs#L1524) | async |
| `anonymous arrow (NewExpression)` | [1549](../../electron/main.cjs#L1549) | sync |
| `settle` | [1551](../../electron/main.cjs#L1551) | sync |
| `anonymous arrow (AssignmentExpression)` | [1556](../../electron/main.cjs#L1556) | sync |
| `anonymous arrow (CallExpression)` | [1558](../../electron/main.cjs#L1558) | sync |
| `anonymous arrow (CallExpression)` | [1660](../../electron/main.cjs#L1660) | sync |
| `anonymous arrow (CallExpression)` | [1663](../../electron/main.cjs#L1663) | sync |
| `anonymous arrow (CallExpression)` | [1665](../../electron/main.cjs#L1665) | sync |
| `anonymous arrow (NewExpression)` | [1672](../../electron/main.cjs#L1672) | sync |
| `anonymous arrow (CallExpression)` | [1705](../../electron/main.cjs#L1705) | sync |
| `anonymous arrow (CallExpression)` | [1711](../../electron/main.cjs#L1711) | sync |
| `anonymous arrow (CallExpression)` | [1714](../../electron/main.cjs#L1714) | sync |
| `anonymous arrow (NewExpression)` | [1774](../../electron/main.cjs#L1774) | sync |
| `settle` | [1776](../../electron/main.cjs#L1776) | sync |
| `startGoogleOAuth` | [1802](../../electron/main.cjs#L1802) | async |
| `createMainWindow` | [1846](../../electron/main.cjs#L1846) | sync |
| `anonymous arrow (CallExpression)` | [1868](../../electron/main.cjs#L1868) | sync |
| `anonymous arrow (CallExpression)` | [1875](../../electron/main.cjs#L1875) | sync |
| `anonymous arrow (CallExpression)` | [1885](../../electron/main.cjs#L1885) | sync |
| `anonymous arrow (CallExpression)` | [1891](../../electron/main.cjs#L1891) | sync |
| `anonymous arrow (CallExpression)` | [1899](../../electron/main.cjs#L1899) | sync |
| `anonymous arrow (CallExpression)` | [1905](../../electron/main.cjs#L1905) | sync |
| `registerIpcHandlers` | [1922](../../electron/main.cjs#L1922) | sync |
| `anonymous arrow (CallExpression)` | [1941](../../electron/main.cjs#L1941) | async |
| `anonymous arrow (CallExpression)` | [1949](../../electron/main.cjs#L1949) | async |
| `anonymous arrow (CallExpression)` | [1953](../../electron/main.cjs#L1953) | async |
| `anonymous arrow (CallExpression)` | [1957](../../electron/main.cjs#L1957) | async |
| `anonymous arrow (CallExpression)` | [1961](../../electron/main.cjs#L1961) | async |
| `anonymous arrow (CallExpression)` | [1965](../../electron/main.cjs#L1965) | async |
| `anonymous arrow (CallExpression)` | [1969](../../electron/main.cjs#L1969) | async |
| `anonymous arrow (CallExpression)` | [1975](../../electron/main.cjs#L1975) | async |
| `anonymous arrow (CallExpression)` | [1980](../../electron/main.cjs#L1980) | async |
| `anonymous arrow (CallExpression)` | [1985](../../electron/main.cjs#L1985) | async |
| `anonymous arrow (CallExpression)` | [1989](../../electron/main.cjs#L1989) | async |
| `anonymous arrow (CallExpression)` | [1993](../../electron/main.cjs#L1993) | async |
| `anonymous arrow (CallExpression)` | [1997](../../electron/main.cjs#L1997) | async |
| `anonymous arrow (CallExpression)` | [2001](../../electron/main.cjs#L2001) | async |
| `anonymous arrow (CallExpression)` | [2005](../../electron/main.cjs#L2005) | async |
| `anonymous arrow (CallExpression)` | [2009](../../electron/main.cjs#L2009) | sync |
| `anonymous arrow (CallExpression)` | [2013](../../electron/main.cjs#L2013) | sync |
| `anonymous arrow (CallExpression)` | [2034](../../electron/main.cjs#L2034) | sync |
| `anonymous arrow (CallExpression)` | [2038](../../electron/main.cjs#L2038) | sync |
| `anonymous arrow (CallExpression)` | [2045](../../electron/main.cjs#L2045) | sync |
| `anonymous arrow (CallExpression)` | [2053](../../electron/main.cjs#L2053) | async |
| `anonymous arrow (CallExpression)` | [2074](../../electron/main.cjs#L2074) | sync |
| `anonymous arrow (CallExpression)` | [2082](../../electron/main.cjs#L2082) | sync |
| `anonymous arrow (CallExpression)` | [2093](../../electron/main.cjs#L2093) | sync |

## electron/preload.cjs

[electron/preload.cjs](../../electron/preload.cjs) · [electron-steam guide](electron-steam.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `startGoogleOAuth` | [5](../../electron/preload.cjs#L5) | sync |
| `openExternal` | [6](../../electron/preload.cjs#L6) | sync |
| `openPath` | [7](../../electron/preload.cjs#L7) | sync |
| `openContainingFolder` | [8](../../electron/preload.cjs#L8) | sync |
| `saveFileDialog` | [10](../../electron/preload.cjs#L10) | sync |
| `traceSyncEvent` | [11](../../electron/preload.cjs#L11) | sync |
| `steamSyncFindFile` | [12](../../electron/preload.cjs#L12) | sync |
| `steamSyncListFiles` | [13](../../electron/preload.cjs#L13) | sync |
| `steamSyncDownloadFile` | [14](../../electron/preload.cjs#L14) | sync |
| `steamSyncCreateFile` | [15](../../electron/preload.cjs#L15) | sync |
| `steamSyncUpdateFile` | [16](../../electron/preload.cjs#L16) | sync |
| `steamSyncDeleteFile` | [17](../../electron/preload.cjs#L17) | sync |
| `getSteamStatus` | [18](../../electron/preload.cjs#L18) | sync |
| `openSteamOverlay` | [19](../../electron/preload.cjs#L19) | sync |
| `setSteamRichPresence` | [20](../../electron/preload.cjs#L20) | sync |
| `unlockSteamAchievement` | [21](../../electron/preload.cjs#L21) | sync |
| `setMenuContext` | [23](../../electron/preload.cjs#L23) | sync |
| `onMenuCommand` | [24](../../electron/preload.cjs#L24) | sync |
| `anonymous arrow (ReturnStatement)` | [25](../../electron/preload.cjs#L25) | sync |
| `handler` | [26](../../electron/preload.cjs#L26) | sync |
| `anonymous arrow (ReturnStatement)` | [28](../../electron/preload.cjs#L28) | sync |

## electron/sentry.cjs

[electron/sentry.cjs](../../electron/sentry.cjs) · [electron-steam guide](electron-steam.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `toNumberOrFallback` | [11](../../electron/sentry.cjs#L11) | sync |
| `resolveMainProcessDsn` | [16](../../electron/sentry.cjs#L16) | sync |
| `initMainProcessSentry` | [23](../../electron/sentry.cjs#L23) | sync |
| `captureMainProcessException` | [44](../../electron/sentry.cjs#L44) | sync |
| `anonymous arrow (CallExpression)` | [49](../../electron/sentry.cjs#L49) | sync |
| `isMainProcessSentryEnabled` | [62](../../electron/sentry.cjs#L62) | sync |

## electron/steam.cjs

[electron/steam.cjs](../../electron/steam.cjs) · [electron-steam guide](electron-steam.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `toPositiveInt` | [40](../../electron/steam.cjs#L40) | sync |
| `readPackageMetadata` | [47](../../electron/steam.cjs#L47) | sync |
| `resolveDistributionChannel` | [71](../../electron/steam.cjs#L71) | sync |
| `detectSteamLaunchContext` | [81](../../electron/steam.cjs#L81) | sync |
| `resolveSteamAppId` | [97](../../electron/steam.cjs#L97) | sync |
| `safeCall` | [114](../../electron/steam.cjs#L114) | sync |
| `normalizeSteamId` | [123](../../electron/steam.cjs#L123) | sync |
| `prepareSteamOverlayForElectron` | [146](../../electron/steam.cjs#L146) | sync |
| `initializeSteamRuntime` | [168](../../electron/steam.cjs#L168) | sync |
| `anonymous arrow (CallExpression)` | [200](../../electron/steam.cjs#L200) | sync |
| `anonymous arrow (CallExpression)` | [202](../../electron/steam.cjs#L202) | sync |
| `getSteamStatus` | [219](../../electron/steam.cjs#L219) | sync |
| `openOverlay` | [226](../../electron/steam.cjs#L226) | sync |
| `setRichPresence` | [263](../../electron/steam.cjs#L263) | sync |
| `getSteamCloudApi` | [302](../../electron/steam.cjs#L302) | sync |
| `getSteamCloudStatus` | [307](../../electron/steam.cjs#L307) | sync |
| `listSteamCloudFileNames` | [330](../../electron/steam.cjs#L330) | sync |
| `anonymous arrow (CallExpression)` | [340](../../electron/steam.cjs#L340) | sync |
| `steamCloudFileExists` | [347](../../electron/steam.cjs#L347) | sync |
| `readSteamCloudFile` | [363](../../electron/steam.cjs#L363) | sync |
| `writeSteamCloudFile` | [378](../../electron/steam.cjs#L378) | sync |
| `deleteSteamCloudFile` | [394](../../electron/steam.cjs#L394) | sync |
| `unlockAchievement` | [410](../../electron/steam.cjs#L410) | sync |
| `anonymous arrow (CallExpression)` | [417](../../electron/steam.cjs#L417) | sync |
| `shutdownSteamRuntime` | [424](../../electron/steam.cjs#L424) | sync |

## playwright.config.js

[playwright.config.js](../../playwright.config.js) · [build-release-testing guide](build-release-testing.md)

No locally declared callable; configuration, exports, or side effects only.

## postcss.config.js

[postcss.config.js](../../postcss.config.js) · [build-release-testing guide](build-release-testing.md)

No locally declared callable; configuration, exports, or side effects only.

## scripts/dev-electron.mjs

[scripts/dev-electron.mjs](../../scripts/dev-electron.mjs) · [build-release-testing guide](build-release-testing.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `spawnTool` | [24](../../scripts/dev-electron.mjs#L24) | sync |
| `getFreePort` | [53](../../scripts/dev-electron.mjs#L53) | sync |
| `anonymous arrow (NewExpression)` | [54](../../scripts/dev-electron.mjs#L54) | sync |
| `tryPort` | [58](../../scripts/dev-electron.mjs#L58) | sync |
| `anonymous arrow (CallExpression)` | [71](../../scripts/dev-electron.mjs#L71) | sync |
| `anonymous arrow (CallExpression)` | [77](../../scripts/dev-electron.mjs#L77) | sync |
| `anonymous arrow (CallExpression)` | [79](../../scripts/dev-electron.mjs#L79) | sync |
| `waitForPort` | [87](../../scripts/dev-electron.mjs#L87) | sync |
| `anonymous arrow (NewExpression)` | [88](../../scripts/dev-electron.mjs#L88) | sync |
| `checkPort` | [91](../../scripts/dev-electron.mjs#L91) | sync |
| `finish` | [95](../../scripts/dev-electron.mjs#L95) | sync |
| `anonymous arrow (CallExpression)` | [103](../../scripts/dev-electron.mjs#L103) | sync |
| `anonymous arrow (CallExpression)` | [104](../../scripts/dev-electron.mjs#L104) | sync |
| `anonymous arrow (CallExpression)` | [105](../../scripts/dev-electron.mjs#L105) | sync |
| `retryOrFail` | [110](../../scripts/dev-electron.mjs#L110) | sync |
| `terminateProcess` | [122](../../scripts/dev-electron.mjs#L122) | sync |
| `anonymous arrow (CallExpression)` | [130](../../scripts/dev-electron.mjs#L130) | sync |
| `resolveSteamAppIdFromEnv` | [138](../../scripts/dev-electron.mjs#L138) | sync |
| `prepareSteamAppIdFile` | [145](../../scripts/dev-electron.mjs#L145) | sync |
| `anonymous arrow (ReturnStatement)` | [147](../../scripts/dev-electron.mjs#L147) | sync |
| `anonymous arrow (ReturnStatement)` | [150](../../scripts/dev-electron.mjs#L150) | sync |
| `anonymous arrow (ReturnStatement)` | [159](../../scripts/dev-electron.mjs#L159) | sync |
| `main` | [171](../../scripts/dev-electron.mjs#L171) | async |
| `shutdown` | [201](../../scripts/dev-electron.mjs#L201) | sync |
| `anonymous arrow (CallExpression)` | [209](../../scripts/dev-electron.mjs#L209) | sync |
| `anonymous arrow (CallExpression)` | [212](../../scripts/dev-electron.mjs#L212) | sync |
| `anonymous arrow (CallExpression)` | [213](../../scripts/dev-electron.mjs#L213) | sync |
| `anonymous arrow (CallExpression)` | [215](../../scripts/dev-electron.mjs#L215) | sync |
| `launchElectron` | [245](../../scripts/dev-electron.mjs#L245) | sync |
| `bindElectronExit` | [254](../../scripts/dev-electron.mjs#L254) | sync |
| `anonymous arrow (CallExpression)` | [256](../../scripts/dev-electron.mjs#L256) | sync |
| `anonymous arrow (CallExpression)` | [290](../../scripts/dev-electron.mjs#L290) | sync |

## scripts/run-electron-builder.mjs

[scripts/run-electron-builder.mjs](../../scripts/run-electron-builder.mjs) · [build-release-testing guide](build-release-testing.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `commandForCurrentPlatform` | [9](../../scripts/run-electron-builder.mjs#L9) | sync |
| `shouldFilterLine` | [13](../../scripts/run-electron-builder.mjs#L13) | sync |
| `anonymous arrow (CallExpression)` | [14](../../scripts/run-electron-builder.mjs#L14) | sync |
| `forwardStream` | [17](../../scripts/run-electron-builder.mjs#L17) | sync |
| `anonymous arrow (CallExpression)` | [20](../../scripts/run-electron-builder.mjs#L20) | sync |
| `anonymous arrow (CallExpression)` | [32](../../scripts/run-electron-builder.mjs#L32) | sync |
| `main` | [40](../../scripts/run-electron-builder.mjs#L40) | sync |
| `anonymous arrow (CallExpression)` | [57](../../scripts/run-electron-builder.mjs#L57) | sync |

## src/App.test.js

[src/App.test.js](../../src/App.test.js) · [build-release-testing guide](build-release-testing.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [5](../../src/App.test.js#L5) | sync |

## src/components/dialogs/CreateCategoryDialog.jsx

[src/components/dialogs/CreateCategoryDialog.jsx](../../src/components/dialogs/CreateCategoryDialog.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `CreateCategoryDialog` | [17](../../src/components/dialogs/CreateCategoryDialog.jsx#L17) | sync |
| `anonymous arrow (CallExpression)` | [28](../../src/components/dialogs/CreateCategoryDialog.jsx#L28) | sync |
| `anonymous arrow (CallExpression)` | [35](../../src/components/dialogs/CreateCategoryDialog.jsx#L35) | sync |
| `validate` | [42](../../src/components/dialogs/CreateCategoryDialog.jsx#L42) | sync |
| `anonymous arrow (CallExpression)` | [65](../../src/components/dialogs/CreateCategoryDialog.jsx#L65) | sync |
| `getRootId` | [78](../../src/components/dialogs/CreateCategoryDialog.jsx#L78) | sync |
| `anonymous arrow (CallExpression)` | [84](../../src/components/dialogs/CreateCategoryDialog.jsx#L84) | sync |
| `isNameInTree` | [94](../../src/components/dialogs/CreateCategoryDialog.jsx#L94) | sync |
| `anonymous arrow (CallExpression)` | [101](../../src/components/dialogs/CreateCategoryDialog.jsx#L101) | sync |
| `anonymous arrow (CallExpression)` | [105](../../src/components/dialogs/CreateCategoryDialog.jsx#L105) | sync |
| `anonymous arrow (CallExpression)` | [106](../../src/components/dialogs/CreateCategoryDialog.jsx#L106) | sync |
| `anonymous arrow (CallExpression)` | [112](../../src/components/dialogs/CreateCategoryDialog.jsx#L112) | sync |
| `handleSubmit` | [122](../../src/components/dialogs/CreateCategoryDialog.jsx#L122) | async |
| `getCategoryPath` | [144](../../src/components/dialogs/CreateCategoryDialog.jsx#L144) | sync |
| `anonymous arrow (CallExpression)` | [146](../../src/components/dialogs/CreateCategoryDialog.jsx#L146) | sync |
| `anonymous arrow (CallExpression)` | [149](../../src/components/dialogs/CreateCategoryDialog.jsx#L149) | sync |
| `anonymous arrow (CallExpression)` | [154](../../src/components/dialogs/CreateCategoryDialog.jsx#L154) | sync |
| `anonymous arrow (CallExpression)` | [156](../../src/components/dialogs/CreateCategoryDialog.jsx#L156) | sync |
| `anonymous arrow (CallExpression)` | [170](../../src/components/dialogs/CreateCategoryDialog.jsx#L170) | sync |
| `anonymous arrow (CallExpression)` | [172](../../src/components/dialogs/CreateCategoryDialog.jsx#L172) | sync |
| `anonymous arrow (CallExpression)` | [174](../../src/components/dialogs/CreateCategoryDialog.jsx#L174) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [195](../../src/components/dialogs/CreateCategoryDialog.jsx#L195) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [214](../../src/components/dialogs/CreateCategoryDialog.jsx#L214) | sync |
| `anonymous arrow (CallExpression)` | [230](../../src/components/dialogs/CreateCategoryDialog.jsx#L230) | sync |
| `anonymous arrow (CallExpression)` | [232](../../src/components/dialogs/CreateCategoryDialog.jsx#L232) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [252](../../src/components/dialogs/CreateCategoryDialog.jsx#L252) | sync |

## src/components/dialogs/CreateConditionDialog.jsx

[src/components/dialogs/CreateConditionDialog.jsx](../../src/components/dialogs/CreateConditionDialog.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `CreateConditionDialog` | [19](../../src/components/dialogs/CreateConditionDialog.jsx#L19) | sync |
| `addProperty` | [30](../../src/components/dialogs/CreateConditionDialog.jsx#L30) | sync |
| `updateProperty` | [37](../../src/components/dialogs/CreateConditionDialog.jsx#L37) | sync |
| `removeProperty` | [46](../../src/components/dialogs/CreateConditionDialog.jsx#L46) | sync |
| `anonymous arrow (CallExpression)` | [49](../../src/components/dialogs/CreateConditionDialog.jsx#L49) | sync |
| `asBoolean` | [53](../../src/components/dialogs/CreateConditionDialog.jsx#L53) | sync |
| `validate` | [59](../../src/components/dialogs/CreateConditionDialog.jsx#L59) | sync |
| `handleSubmit` | [72](../../src/components/dialogs/CreateConditionDialog.jsx#L72) | async |
| `anonymous arrow (JSXExpressionContainer)` | [109](../../src/components/dialogs/CreateConditionDialog.jsx#L109) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [124](../../src/components/dialogs/CreateConditionDialog.jsx#L124) | sync |
| `anonymous arrow (CallExpression)` | [152](../../src/components/dialogs/CreateConditionDialog.jsx#L152) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [162](../../src/components/dialogs/CreateConditionDialog.jsx#L162) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [171](../../src/components/dialogs/CreateConditionDialog.jsx#L171) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [184](../../src/components/dialogs/CreateConditionDialog.jsx#L184) | sync |
| `anonymous arrow (CallExpression)` | [193](../../src/components/dialogs/CreateConditionDialog.jsx#L193) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [214](../../src/components/dialogs/CreateConditionDialog.jsx#L214) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [222](../../src/components/dialogs/CreateConditionDialog.jsx#L222) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [236](../../src/components/dialogs/CreateConditionDialog.jsx#L236) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [249](../../src/components/dialogs/CreateConditionDialog.jsx#L249) | sync |

## src/components/dialogs/CreateDecoratorDialog.jsx

[src/components/dialogs/CreateDecoratorDialog.jsx](../../src/components/dialogs/CreateDecoratorDialog.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `CreateDecoratorDialog` | [19](../../src/components/dialogs/CreateDecoratorDialog.jsx#L19) | sync |
| `addProperty` | [30](../../src/components/dialogs/CreateDecoratorDialog.jsx#L30) | sync |
| `updateProperty` | [40](../../src/components/dialogs/CreateDecoratorDialog.jsx#L40) | sync |
| `removeProperty` | [49](../../src/components/dialogs/CreateDecoratorDialog.jsx#L49) | sync |
| `anonymous arrow (CallExpression)` | [52](../../src/components/dialogs/CreateDecoratorDialog.jsx#L52) | sync |
| `asBoolean` | [56](../../src/components/dialogs/CreateDecoratorDialog.jsx#L56) | sync |
| `validate` | [62](../../src/components/dialogs/CreateDecoratorDialog.jsx#L62) | sync |
| `handleSubmit` | [75](../../src/components/dialogs/CreateDecoratorDialog.jsx#L75) | async |
| `anonymous arrow (JSXExpressionContainer)` | [114](../../src/components/dialogs/CreateDecoratorDialog.jsx#L114) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [131](../../src/components/dialogs/CreateDecoratorDialog.jsx#L131) | sync |
| `anonymous arrow (CallExpression)` | [160](../../src/components/dialogs/CreateDecoratorDialog.jsx#L160) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [170](../../src/components/dialogs/CreateDecoratorDialog.jsx#L170) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [181](../../src/components/dialogs/CreateDecoratorDialog.jsx#L181) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [196](../../src/components/dialogs/CreateDecoratorDialog.jsx#L196) | sync |
| `anonymous arrow (CallExpression)` | [205](../../src/components/dialogs/CreateDecoratorDialog.jsx#L205) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [226](../../src/components/dialogs/CreateDecoratorDialog.jsx#L226) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [234](../../src/components/dialogs/CreateDecoratorDialog.jsx#L234) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [254](../../src/components/dialogs/CreateDecoratorDialog.jsx#L254) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [267](../../src/components/dialogs/CreateDecoratorDialog.jsx#L267) | sync |

## src/components/dialogs/CreateParticipantDialog.jsx

[src/components/dialogs/CreateParticipantDialog.jsx](../../src/components/dialogs/CreateParticipantDialog.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `CreateParticipantDialog` | [23](../../src/components/dialogs/CreateParticipantDialog.jsx#L23) | sync |
| `anonymous arrow (CallExpression)` | [37](../../src/components/dialogs/CreateParticipantDialog.jsx#L37) | sync |
| `getCategoryPath` | [44](../../src/components/dialogs/CreateParticipantDialog.jsx#L44) | sync |
| `anonymous arrow (CallExpression)` | [46](../../src/components/dialogs/CreateParticipantDialog.jsx#L46) | sync |
| `anonymous arrow (CallExpression)` | [49](../../src/components/dialogs/CreateParticipantDialog.jsx#L49) | sync |
| `anonymous arrow (CallExpression)` | [54](../../src/components/dialogs/CreateParticipantDialog.jsx#L54) | sync |
| `anonymous arrow (CallExpression)` | [56](../../src/components/dialogs/CreateParticipantDialog.jsx#L56) | sync |
| `anonymous arrow (CallExpression)` | [71](../../src/components/dialogs/CreateParticipantDialog.jsx#L71) | sync |
| `anonymous arrow (CallExpression)` | [73](../../src/components/dialogs/CreateParticipantDialog.jsx#L73) | sync |
| `anonymous arrow (CallExpression)` | [75](../../src/components/dialogs/CreateParticipantDialog.jsx#L75) | sync |
| `validate` | [78](../../src/components/dialogs/CreateParticipantDialog.jsx#L78) | sync |
| `anonymous arrow (CallExpression)` | [95](../../src/components/dialogs/CreateParticipantDialog.jsx#L95) | sync |
| `getRootId` | [96](../../src/components/dialogs/CreateParticipantDialog.jsx#L96) | sync |
| `anonymous arrow (CallExpression)` | [102](../../src/components/dialogs/CreateParticipantDialog.jsx#L102) | sync |
| `anonymous arrow (CallExpression)` | [110](../../src/components/dialogs/CreateParticipantDialog.jsx#L110) | sync |
| `anonymous arrow (CallExpression)` | [112](../../src/components/dialogs/CreateParticipantDialog.jsx#L112) | sync |
| `anonymous arrow (CallExpression)` | [113](../../src/components/dialogs/CreateParticipantDialog.jsx#L113) | sync |
| `anonymous arrow (CallExpression)` | [115](../../src/components/dialogs/CreateParticipantDialog.jsx#L115) | sync |
| `handleThumbnailChange` | [130](../../src/components/dialogs/CreateParticipantDialog.jsx#L130) | async |
| `anonymous arrow (CallExpression)` | [138](../../src/components/dialogs/CreateParticipantDialog.jsx#L138) | sync |
| `anonymous arrow (CallExpression)` | [139](../../src/components/dialogs/CreateParticipantDialog.jsx#L139) | sync |
| `anonymous arrow (CallExpression)` | [141](../../src/components/dialogs/CreateParticipantDialog.jsx#L141) | sync |
| `handleSubmit` | [150](../../src/components/dialogs/CreateParticipantDialog.jsx#L150) | async |
| `anonymous arrow (JSXExpressionContainer)` | [188](../../src/components/dialogs/CreateParticipantDialog.jsx#L188) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [228](../../src/components/dialogs/CreateParticipantDialog.jsx#L228) | sync |
| `anonymous arrow (CallExpression)` | [228](../../src/components/dialogs/CreateParticipantDialog.jsx#L228) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [247](../../src/components/dialogs/CreateParticipantDialog.jsx#L247) | sync |
| `anonymous arrow (CallExpression)` | [262](../../src/components/dialogs/CreateParticipantDialog.jsx#L262) | sync |
| `anonymous arrow (CallExpression)` | [264](../../src/components/dialogs/CreateParticipantDialog.jsx#L264) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [280](../../src/components/dialogs/CreateParticipantDialog.jsx#L280) | sync |

## src/components/dialogs/EditCategoryDialog.jsx

[src/components/dialogs/EditCategoryDialog.jsx](../../src/components/dialogs/EditCategoryDialog.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `EditCategoryDialog` | [17](../../src/components/dialogs/EditCategoryDialog.jsx#L17) | sync |
| `anonymous arrow (CallExpression)` | [28](../../src/components/dialogs/EditCategoryDialog.jsx#L28) | sync |
| `anonymous arrow (CallExpression)` | [41](../../src/components/dialogs/EditCategoryDialog.jsx#L41) | sync |
| `validate` | [47](../../src/components/dialogs/EditCategoryDialog.jsx#L47) | sync |
| `anonymous arrow (CallExpression)` | [60](../../src/components/dialogs/EditCategoryDialog.jsx#L60) | sync |
| `getMaxSubtreeDepth` | [68](../../src/components/dialogs/EditCategoryDialog.jsx#L68) | sync |
| `dfs` | [70](../../src/components/dialogs/EditCategoryDialog.jsx#L70) | sync |
| `anonymous arrow (CallExpression)` | [76](../../src/components/dialogs/EditCategoryDialog.jsx#L76) | sync |
| `getDepthToRoot` | [84](../../src/components/dialogs/EditCategoryDialog.jsx#L84) | sync |
| `anonymous arrow (CallExpression)` | [93](../../src/components/dialogs/EditCategoryDialog.jsx#L93) | sync |
| `getRootId` | [115](../../src/components/dialogs/EditCategoryDialog.jsx#L115) | sync |
| `anonymous arrow (CallExpression)` | [121](../../src/components/dialogs/EditCategoryDialog.jsx#L121) | sync |
| `isNameInTree` | [131](../../src/components/dialogs/EditCategoryDialog.jsx#L131) | sync |
| `anonymous arrow (CallExpression)` | [138](../../src/components/dialogs/EditCategoryDialog.jsx#L138) | sync |
| `anonymous arrow (CallExpression)` | [142](../../src/components/dialogs/EditCategoryDialog.jsx#L142) | sync |
| `anonymous arrow (CallExpression)` | [143](../../src/components/dialogs/EditCategoryDialog.jsx#L143) | sync |
| `anonymous arrow (CallExpression)` | [150](../../src/components/dialogs/EditCategoryDialog.jsx#L150) | sync |
| `handleSubmit` | [161](../../src/components/dialogs/EditCategoryDialog.jsx#L161) | async |
| `getCategoryPath` | [180](../../src/components/dialogs/EditCategoryDialog.jsx#L180) | sync |
| `anonymous arrow (CallExpression)` | [182](../../src/components/dialogs/EditCategoryDialog.jsx#L182) | sync |
| `anonymous arrow (CallExpression)` | [185](../../src/components/dialogs/EditCategoryDialog.jsx#L185) | sync |
| `anonymous arrow (CallExpression)` | [190](../../src/components/dialogs/EditCategoryDialog.jsx#L190) | sync |
| `anonymous arrow (CallExpression)` | [193](../../src/components/dialogs/EditCategoryDialog.jsx#L193) | sync |
| `anonymous arrow (CallExpression)` | [194](../../src/components/dialogs/EditCategoryDialog.jsx#L194) | sync |
| `anonymous arrow (CallExpression)` | [208](../../src/components/dialogs/EditCategoryDialog.jsx#L208) | sync |
| `anonymous arrow (CallExpression)` | [210](../../src/components/dialogs/EditCategoryDialog.jsx#L210) | sync |
| `anonymous arrow (CallExpression)` | [212](../../src/components/dialogs/EditCategoryDialog.jsx#L212) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [233](../../src/components/dialogs/EditCategoryDialog.jsx#L233) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [252](../../src/components/dialogs/EditCategoryDialog.jsx#L252) | sync |
| `anonymous arrow (CallExpression)` | [268](../../src/components/dialogs/EditCategoryDialog.jsx#L268) | sync |
| `anonymous arrow (CallExpression)` | [270](../../src/components/dialogs/EditCategoryDialog.jsx#L270) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [290](../../src/components/dialogs/EditCategoryDialog.jsx#L290) | sync |

## src/components/dialogs/EditConditionDialog.jsx

[src/components/dialogs/EditConditionDialog.jsx](../../src/components/dialogs/EditConditionDialog.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `EditConditionDialog` | [19](../../src/components/dialogs/EditConditionDialog.jsx#L19) | sync |
| `anonymous arrow (CallExpression)` | [30](../../src/components/dialogs/EditConditionDialog.jsx#L30) | sync |
| `anonymous arrow (CallExpression)` | [40](../../src/components/dialogs/EditConditionDialog.jsx#L40) | sync |
| `addProperty` | [46](../../src/components/dialogs/EditConditionDialog.jsx#L46) | sync |
| `anonymous arrow (CallExpression)` | [47](../../src/components/dialogs/EditConditionDialog.jsx#L47) | sync |
| `updateProperty` | [53](../../src/components/dialogs/EditConditionDialog.jsx#L53) | sync |
| `removeProperty` | [62](../../src/components/dialogs/EditConditionDialog.jsx#L62) | sync |
| `anonymous arrow (CallExpression)` | [63](../../src/components/dialogs/EditConditionDialog.jsx#L63) | sync |
| `anonymous arrow (CallExpression)` | [65](../../src/components/dialogs/EditConditionDialog.jsx#L65) | sync |
| `asBoolean` | [69](../../src/components/dialogs/EditConditionDialog.jsx#L69) | sync |
| `validate` | [75](../../src/components/dialogs/EditConditionDialog.jsx#L75) | sync |
| `handleSubmit` | [88](../../src/components/dialogs/EditConditionDialog.jsx#L88) | async |
| `anonymous arrow (JSXExpressionContainer)` | [125](../../src/components/dialogs/EditConditionDialog.jsx#L125) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [141](../../src/components/dialogs/EditConditionDialog.jsx#L141) | sync |
| `anonymous arrow (CallExpression)` | [169](../../src/components/dialogs/EditConditionDialog.jsx#L169) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [179](../../src/components/dialogs/EditConditionDialog.jsx#L179) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [188](../../src/components/dialogs/EditConditionDialog.jsx#L188) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [201](../../src/components/dialogs/EditConditionDialog.jsx#L201) | sync |
| `anonymous arrow (CallExpression)` | [210](../../src/components/dialogs/EditConditionDialog.jsx#L210) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [231](../../src/components/dialogs/EditConditionDialog.jsx#L231) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [239](../../src/components/dialogs/EditConditionDialog.jsx#L239) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [253](../../src/components/dialogs/EditConditionDialog.jsx#L253) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [266](../../src/components/dialogs/EditConditionDialog.jsx#L266) | sync |

## src/components/dialogs/EditDecoratorDialog.jsx

[src/components/dialogs/EditDecoratorDialog.jsx](../../src/components/dialogs/EditDecoratorDialog.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `EditDecoratorDialog` | [19](../../src/components/dialogs/EditDecoratorDialog.jsx#L19) | sync |
| `anonymous arrow (CallExpression)` | [30](../../src/components/dialogs/EditDecoratorDialog.jsx#L30) | sync |
| `anonymous arrow (CallExpression)` | [40](../../src/components/dialogs/EditDecoratorDialog.jsx#L40) | sync |
| `addProperty` | [46](../../src/components/dialogs/EditDecoratorDialog.jsx#L46) | sync |
| `anonymous arrow (CallExpression)` | [47](../../src/components/dialogs/EditDecoratorDialog.jsx#L47) | sync |
| `updateProperty` | [56](../../src/components/dialogs/EditDecoratorDialog.jsx#L56) | sync |
| `removeProperty` | [65](../../src/components/dialogs/EditDecoratorDialog.jsx#L65) | sync |
| `anonymous arrow (CallExpression)` | [66](../../src/components/dialogs/EditDecoratorDialog.jsx#L66) | sync |
| `anonymous arrow (CallExpression)` | [68](../../src/components/dialogs/EditDecoratorDialog.jsx#L68) | sync |
| `asBoolean` | [72](../../src/components/dialogs/EditDecoratorDialog.jsx#L72) | sync |
| `validate` | [78](../../src/components/dialogs/EditDecoratorDialog.jsx#L78) | sync |
| `handleSubmit` | [91](../../src/components/dialogs/EditDecoratorDialog.jsx#L91) | async |
| `anonymous arrow (JSXExpressionContainer)` | [130](../../src/components/dialogs/EditDecoratorDialog.jsx#L130) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [147](../../src/components/dialogs/EditDecoratorDialog.jsx#L147) | sync |
| `anonymous arrow (CallExpression)` | [175](../../src/components/dialogs/EditDecoratorDialog.jsx#L175) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [185](../../src/components/dialogs/EditDecoratorDialog.jsx#L185) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [195](../../src/components/dialogs/EditDecoratorDialog.jsx#L195) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [210](../../src/components/dialogs/EditDecoratorDialog.jsx#L210) | sync |
| `anonymous arrow (CallExpression)` | [219](../../src/components/dialogs/EditDecoratorDialog.jsx#L219) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [240](../../src/components/dialogs/EditDecoratorDialog.jsx#L240) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [248](../../src/components/dialogs/EditDecoratorDialog.jsx#L248) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [261](../../src/components/dialogs/EditDecoratorDialog.jsx#L261) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [274](../../src/components/dialogs/EditDecoratorDialog.jsx#L274) | sync |

## src/components/dialogs/EditParticipantDialog.jsx

[src/components/dialogs/EditParticipantDialog.jsx](../../src/components/dialogs/EditParticipantDialog.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `EditParticipantDialog` | [23](../../src/components/dialogs/EditParticipantDialog.jsx#L23) | sync |
| `anonymous arrow (CallExpression)` | [37](../../src/components/dialogs/EditParticipantDialog.jsx#L37) | sync |
| `getCategoryPath` | [51](../../src/components/dialogs/EditParticipantDialog.jsx#L51) | sync |
| `anonymous arrow (CallExpression)` | [53](../../src/components/dialogs/EditParticipantDialog.jsx#L53) | sync |
| `anonymous arrow (CallExpression)` | [56](../../src/components/dialogs/EditParticipantDialog.jsx#L56) | sync |
| `anonymous arrow (CallExpression)` | [61](../../src/components/dialogs/EditParticipantDialog.jsx#L61) | sync |
| `anonymous arrow (CallExpression)` | [63](../../src/components/dialogs/EditParticipantDialog.jsx#L63) | sync |
| `anonymous arrow (CallExpression)` | [78](../../src/components/dialogs/EditParticipantDialog.jsx#L78) | sync |
| `anonymous arrow (CallExpression)` | [80](../../src/components/dialogs/EditParticipantDialog.jsx#L80) | sync |
| `anonymous arrow (CallExpression)` | [82](../../src/components/dialogs/EditParticipantDialog.jsx#L82) | sync |
| `anonymous arrow (CallExpression)` | [86](../../src/components/dialogs/EditParticipantDialog.jsx#L86) | sync |
| `validate` | [92](../../src/components/dialogs/EditParticipantDialog.jsx#L92) | sync |
| `anonymous arrow (CallExpression)` | [109](../../src/components/dialogs/EditParticipantDialog.jsx#L109) | sync |
| `getRootId` | [110](../../src/components/dialogs/EditParticipantDialog.jsx#L110) | sync |
| `anonymous arrow (CallExpression)` | [116](../../src/components/dialogs/EditParticipantDialog.jsx#L116) | sync |
| `anonymous arrow (CallExpression)` | [124](../../src/components/dialogs/EditParticipantDialog.jsx#L124) | sync |
| `anonymous arrow (CallExpression)` | [126](../../src/components/dialogs/EditParticipantDialog.jsx#L126) | sync |
| `anonymous arrow (CallExpression)` | [127](../../src/components/dialogs/EditParticipantDialog.jsx#L127) | sync |
| `anonymous arrow (CallExpression)` | [130](../../src/components/dialogs/EditParticipantDialog.jsx#L130) | sync |
| `handleThumbnailChange` | [145](../../src/components/dialogs/EditParticipantDialog.jsx#L145) | async |
| `anonymous arrow (CallExpression)` | [153](../../src/components/dialogs/EditParticipantDialog.jsx#L153) | sync |
| `anonymous arrow (CallExpression)` | [154](../../src/components/dialogs/EditParticipantDialog.jsx#L154) | sync |
| `anonymous arrow (CallExpression)` | [156](../../src/components/dialogs/EditParticipantDialog.jsx#L156) | sync |
| `handleSubmit` | [165](../../src/components/dialogs/EditParticipantDialog.jsx#L165) | async |
| `anonymous arrow (JSXExpressionContainer)` | [200](../../src/components/dialogs/EditParticipantDialog.jsx#L200) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [240](../../src/components/dialogs/EditParticipantDialog.jsx#L240) | sync |
| `anonymous arrow (CallExpression)` | [240](../../src/components/dialogs/EditParticipantDialog.jsx#L240) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [259](../../src/components/dialogs/EditParticipantDialog.jsx#L259) | sync |
| `anonymous arrow (CallExpression)` | [274](../../src/components/dialogs/EditParticipantDialog.jsx#L274) | sync |
| `anonymous arrow (CallExpression)` | [276](../../src/components/dialogs/EditParticipantDialog.jsx#L276) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [292](../../src/components/dialogs/EditParticipantDialog.jsx#L292) | sync |

## src/components/dialogue/CollapsibleSection.jsx

[src/components/dialogue/CollapsibleSection.jsx](../../src/components/dialogue/CollapsibleSection.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `CollapsibleSection` | [4](../../src/components/dialogue/CollapsibleSection.jsx#L4) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [10](../../src/components/dialogue/CollapsibleSection.jsx#L10) | sync |

## src/components/dialogue/DecoratorsPanel.jsx

[src/components/dialogue/DecoratorsPanel.jsx](../../src/components/dialogue/DecoratorsPanel.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `DecoratorsPanel` | [14](../../src/components/dialogue/DecoratorsPanel.jsx#L14) | sync |
| `toggleDecorator` | [25](../../src/components/dialogue/DecoratorsPanel.jsx#L25) | sync |
| `handleAddDecorator` | [35](../../src/components/dialogue/DecoratorsPanel.jsx#L35) | sync |
| `anonymous arrow (CallExpression)` | [38](../../src/components/dialogue/DecoratorsPanel.jsx#L38) | sync |
| `updateDecoratorValue` | [47](../../src/components/dialogue/DecoratorsPanel.jsx#L47) | sync |
| `asBoolean` | [53](../../src/components/dialogue/DecoratorsPanel.jsx#L53) | sync |
| `anonymous arrow (CallExpression)` | [76](../../src/components/dialogue/DecoratorsPanel.jsx#L76) | sync |
| `anonymous arrow (CallExpression)` | [78](../../src/components/dialogue/DecoratorsPanel.jsx#L78) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [90](../../src/components/dialogue/DecoratorsPanel.jsx#L90) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [112](../../src/components/dialogue/DecoratorsPanel.jsx#L112) | sync |
| `anonymous arrow (CallExpression)` | [124](../../src/components/dialogue/DecoratorsPanel.jsx#L124) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [137](../../src/components/dialogue/DecoratorsPanel.jsx#L137) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [155](../../src/components/dialogue/DecoratorsPanel.jsx#L155) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [181](../../src/components/dialogue/DecoratorsPanel.jsx#L181) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [201](../../src/components/dialogue/DecoratorsPanel.jsx#L201) | sync |
| `anonymous arrow (CallExpression)` | [205](../../src/components/dialogue/DecoratorsPanel.jsx#L205) | sync |

## src/components/dialogue/DialoguePreviewOverlay.jsx

[src/components/dialogue/DialoguePreviewOverlay.jsx](../../src/components/dialogue/DialoguePreviewOverlay.jsx) · [dialogue-preview guide](dialogue-preview.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `buildPreviewGraphRuntime` | [27](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L27) | sync |
| `anonymous arrow (CallExpression)` | [29](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L29) | sync |
| `anonymous arrow (CallExpression)` | [32](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L32) | sync |
| `mergeScenarioRulesFromGraphCache` | [49](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L49) | sync |
| `anonymous arrow (CallExpression)` | [53](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L53) | sync |
| `anonymous arrow (CallExpression)` | [55](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L55) | sync |
| `buildNodeRef` | [65](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L65) | sync |
| `getNodeRefKey` | [70](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L70) | sync |
| `DialoguePreviewOverlay` | [72](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L72) | sync |
| `anonymous arrow (CallExpression)` | [120](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L120) | sync |
| `anonymous arrow (CallExpression)` | [123](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L123) | sync |
| `anonymous arrow (CallExpression)` | [130](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L130) | sync |
| `anonymous arrow (CallExpression)` | [140](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L140) | sync |
| `anonymous arrow (CallExpression)` | [141](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L141) | sync |
| `anonymous arrow (CallExpression)` | [151](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L151) | sync |
| `anonymous arrow (CallExpression)` | [157](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L157) | sync |
| `anonymous arrow (CallExpression)` | [169](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L169) | sync |
| `anonymous arrow (CallExpression)` | [209](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L209) | sync |
| `anonymous arrow (CallExpression)` | [228](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L228) | sync |
| `anonymous arrow (CallExpression)` | [230](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L230) | sync |
| `anonymous arrow (CallExpression)` | [233](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L233) | sync |
| `anonymous arrow (CallExpression)` | [238](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L238) | sync |
| `anonymous arrow (CallExpression)` | [240](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L240) | sync |
| `anonymous arrow (CallExpression)` | [251](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L251) | sync |
| `anonymous arrow (CallExpression)` | [257](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L257) | sync |
| `anonymous arrow (CallExpression)` | [269](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L269) | sync |
| `anonymous arrow (CallExpression)` | [280](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L280) | sync |
| `anonymous arrow (CallExpression)` | [294](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L294) | sync |
| `anonymous arrow (CallExpression)` | [303](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L303) | sync |
| `anonymous arrow (CallExpression)` | [316](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L316) | sync |
| `anonymous arrow (CallExpression)` | [347](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L347) | sync |
| `anonymous arrow (CallExpression)` | [359](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L359) | sync |
| `anonymous arrow (CallExpression)` | [411](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L411) | sync |
| `anonymous arrow (CallExpression)` | [419](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L419) | sync |
| `anonymous arrow (CallExpression)` | [441](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L441) | async |
| `anonymous arrow (CallExpression)` | [456](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L456) | sync |
| `anonymous arrow (CallExpression)` | [463](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L463) | sync |
| `anonymous arrow (CallExpression)` | [465](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L465) | sync |
| `anonymous arrow (CallExpression)` | [484](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L484) | sync |
| `anonymous arrow (CallExpression)` | [511](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L511) | sync |
| `anonymous arrow (CallExpression)` | [520](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L520) | sync |
| `anonymous arrow (CallExpression)` | [533](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L533) | async |
| `anonymous arrow (CallExpression)` | [567](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L567) | sync |
| `anonymous arrow (CallExpression)` | [569](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L569) | sync |
| `anonymous arrow (CallExpression)` | [579](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L579) | sync |
| `finalizeNode` | [590](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L590) | sync |
| `anonymous arrow (CallExpression)` | [609](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L609) | sync |
| `renderNextRow` | [629](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L629) | sync |
| `anonymous arrow (CallExpression)` | [651](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L651) | sync |
| `anonymous arrow (CallExpression)` | [658](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L658) | sync |
| `anonymous arrow (CallExpression)` | [660](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L660) | sync |
| `anonymous arrow (CallExpression)` | [685](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L685) | sync |
| `anonymous arrow (CallExpression)` | [697](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L697) | async |
| `anonymous arrow (CallExpression)` | [713](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L713) | sync |
| `anonymous arrow (CallExpression)` | [714](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L714) | sync |
| `anonymous arrow (CallExpression)` | [741](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L741) | sync |
| `initializePreview` | [776](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L776) | async |
| `anonymous arrow (CallExpression)` | [785](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L785) | sync |
| `anonymous arrow (CallExpression)` | [814](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L814) | sync |
| `anonymous arrow (CallExpression)` | [818](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L818) | sync |
| `anonymous arrow (CallExpression)` | [820](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L820) | sync |
| `anonymous arrow (ReturnStatement)` | [831](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L831) | sync |
| `anonymous arrow (CallExpression)` | [847](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L847) | sync |
| `anonymous arrow (CallExpression)` | [852](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L852) | sync |
| `anonymous arrow (CallExpression)` | [856](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L856) | sync |
| `handleKeyDown` | [859](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L859) | sync |
| `anonymous arrow (ReturnStatement)` | [878](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L878) | sync |
| `anonymous arrow (CallExpression)` | [881](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L881) | sync |
| `anonymous arrow (CallExpression)` | [888](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L888) | sync |
| `anonymous arrow (CallExpression)` | [891](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L891) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [936](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L936) | sync |
| `anonymous arrow (CallExpression)` | [953](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L953) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [977](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L977) | sync |
| `anonymous arrow (CallExpression)` | [979](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L979) | sync |
| `anonymous arrow (CallExpression)` | [1031](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L1031) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [1050](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L1050) | sync |
| `anonymous arrow (CallExpression)` | [1056](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L1056) | sync |
| `anonymous arrow (CallExpression)` | [1063](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L1063) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [1129](../../src/components/dialogue/DialoguePreviewOverlay.jsx#L1129) | sync |

## src/components/dialogue/DialogueRowsPanel.jsx

[src/components/dialogue/DialogueRowsPanel.jsx](../../src/components/dialogue/DialogueRowsPanel.jsx) · [media guide](media.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `DialogueRowsPanel` | [23](../../src/components/dialogue/DialogueRowsPanel.jsx#L23) | sync |
| `anonymous arrow (CallExpression)` | [38](../../src/components/dialogue/DialogueRowsPanel.jsx#L38) | sync |
| `anonymous arrow (CallExpression)` | [39](../../src/components/dialogue/DialogueRowsPanel.jsx#L39) | sync |
| `anonymous arrow (CallExpression)` | [42](../../src/components/dialogue/DialogueRowsPanel.jsx#L42) | sync |
| `anonymous arrow (CallExpression)` | [54](../../src/components/dialogue/DialogueRowsPanel.jsx#L54) | sync |
| `anonymous arrow (CallExpression)` | [59](../../src/components/dialogue/DialogueRowsPanel.jsx#L59) | sync |
| `anonymous arrow (CallExpression)` | [110](../../src/components/dialogue/DialogueRowsPanel.jsx#L110) | sync |
| `anonymous arrow (CallExpression)` | [125](../../src/components/dialogue/DialogueRowsPanel.jsx#L125) | sync |
| `anonymous arrow (CallExpression)` | [135](../../src/components/dialogue/DialogueRowsPanel.jsx#L135) | sync |
| `anonymous arrow (ReturnStatement)` | [138](../../src/components/dialogue/DialogueRowsPanel.jsx#L138) | sync |
| `anonymous arrow (CallExpression)` | [139](../../src/components/dialogue/DialogueRowsPanel.jsx#L139) | sync |
| `toggleRow` | [148](../../src/components/dialogue/DialogueRowsPanel.jsx#L148) | sync |
| `addRow` | [158](../../src/components/dialogue/DialogueRowsPanel.jsx#L158) | sync |
| `removeRow` | [171](../../src/components/dialogue/DialogueRowsPanel.jsx#L171) | sync |
| `anonymous arrow (CallExpression)` | [172](../../src/components/dialogue/DialogueRowsPanel.jsx#L172) | sync |
| `updateRow` | [180](../../src/components/dialogue/DialogueRowsPanel.jsx#L180) | sync |
| `anonymous arrow (CallExpression)` | [185](../../src/components/dialogue/DialogueRowsPanel.jsx#L185) | sync |
| `anonymous arrow (CallExpression)` | [189](../../src/components/dialogue/DialogueRowsPanel.jsx#L189) | sync |
| `closeParticipantPicker` | [203](../../src/components/dialogue/DialogueRowsPanel.jsx#L203) | sync |
| `handleTextChange` | [211](../../src/components/dialogue/DialogueRowsPanel.jsx#L211) | sync |
| `insertParticipant` | [238](../../src/components/dialogue/DialogueRowsPanel.jsx#L238) | sync |
| `anonymous arrow (CallExpression)` | [256](../../src/components/dialogue/DialogueRowsPanel.jsx#L256) | sync |
| `buildParticipantGroups` | [263](../../src/components/dialogue/DialogueRowsPanel.jsx#L263) | sync |
| `anonymous arrow (CallExpression)` | [265](../../src/components/dialogue/DialogueRowsPanel.jsx#L265) | sync |
| `anonymous arrow (CallExpression)` | [271](../../src/components/dialogue/DialogueRowsPanel.jsx#L271) | sync |
| `anonymous arrow (CallExpression)` | [285](../../src/components/dialogue/DialogueRowsPanel.jsx#L285) | sync |
| `anonymous arrow (CallExpression)` | [287](../../src/components/dialogue/DialogueRowsPanel.jsx#L287) | sync |
| `anonymous arrow (CallExpression)` | [289](../../src/components/dialogue/DialogueRowsPanel.jsx#L289) | sync |
| `handleAudioUpload` | [293](../../src/components/dialogue/DialogueRowsPanel.jsx#L293) | async |
| `toggleAudioPlayback` | [336](../../src/components/dialogue/DialogueRowsPanel.jsx#L336) | sync |
| `anonymous arrow (CallExpression)` | [364](../../src/components/dialogue/DialogueRowsPanel.jsx#L364) | sync |
| `anonymous arrow (CallExpression)` | [367](../../src/components/dialogue/DialogueRowsPanel.jsx#L367) | sync |
| `handleAudioEnded` | [380](../../src/components/dialogue/DialogueRowsPanel.jsx#L380) | sync |
| `removeAudioFile` | [387](../../src/components/dialogue/DialogueRowsPanel.jsx#L387) | sync |
| `anonymous arrow (CallExpression)` | [400](../../src/components/dialogue/DialogueRowsPanel.jsx#L400) | sync |
| `anonymous arrow (CallExpression)` | [444](../../src/components/dialogue/DialogueRowsPanel.jsx#L444) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [460](../../src/components/dialogue/DialogueRowsPanel.jsx#L460) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [479](../../src/components/dialogue/DialogueRowsPanel.jsx#L479) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [501](../../src/components/dialogue/DialogueRowsPanel.jsx#L501) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [503](../../src/components/dialogue/DialogueRowsPanel.jsx#L503) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [515](../../src/components/dialogue/DialogueRowsPanel.jsx#L515) | sync |
| `anonymous arrow (CallExpression)` | [526](../../src/components/dialogue/DialogueRowsPanel.jsx#L526) | sync |
| `anonymous arrow (CallExpression)` | [528](../../src/components/dialogue/DialogueRowsPanel.jsx#L528) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [548](../../src/components/dialogue/DialogueRowsPanel.jsx#L548) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [564](../../src/components/dialogue/DialogueRowsPanel.jsx#L564) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [587](../../src/components/dialogue/DialogueRowsPanel.jsx#L587) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [593](../../src/components/dialogue/DialogueRowsPanel.jsx#L593) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [595](../../src/components/dialogue/DialogueRowsPanel.jsx#L595) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [615](../../src/components/dialogue/DialogueRowsPanel.jsx#L615) | sync |

## src/components/dialogue/DialogueSettingsPanel.jsx

[src/components/dialogue/DialogueSettingsPanel.jsx](../../src/components/dialogue/DialogueSettingsPanel.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `DialogueSettingsPanel` | [17](../../src/components/dialogue/DialogueSettingsPanel.jsx#L17) | sync |
| `anonymous arrow (CallExpression)` | [32](../../src/components/dialogue/DialogueSettingsPanel.jsx#L32) | sync |
| `handleSave` | [49](../../src/components/dialogue/DialogueSettingsPanel.jsx#L49) | async |
| `handleCancel` | [66](../../src/components/dialogue/DialogueSettingsPanel.jsx#L66) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [98](../../src/components/dialogue/DialogueSettingsPanel.jsx#L98) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [111](../../src/components/dialogue/DialogueSettingsPanel.jsx#L111) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [124](../../src/components/dialogue/DialogueSettingsPanel.jsx#L124) | sync |

## src/components/dialogue/EdgeConditionsPanel.jsx

[src/components/dialogue/EdgeConditionsPanel.jsx](../../src/components/dialogue/EdgeConditionsPanel.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `asBoolean` | [14](../../src/components/dialogue/EdgeConditionsPanel.jsx#L14) | sync |
| `EdgeConditionsPanel` | [20](../../src/components/dialogue/EdgeConditionsPanel.jsx#L20) | sync |
| `anonymous arrow (CallExpression)` | [29](../../src/components/dialogue/EdgeConditionsPanel.jsx#L29) | sync |
| `updateGroup` | [36](../../src/components/dialogue/EdgeConditionsPanel.jsx#L36) | sync |
| `updateRuleValue` | [43](../../src/components/dialogue/EdgeConditionsPanel.jsx#L43) | sync |
| `addRule` | [58](../../src/components/dialogue/EdgeConditionsPanel.jsx#L58) | sync |
| `anonymous arrow (CallExpression)` | [60](../../src/components/dialogue/EdgeConditionsPanel.jsx#L60) | sync |
| `removeRule` | [70](../../src/components/dialogue/EdgeConditionsPanel.jsx#L70) | sync |
| `anonymous arrow (CallExpression)` | [73](../../src/components/dialogue/EdgeConditionsPanel.jsx#L73) | sync |
| `toggleNegate` | [77](../../src/components/dialogue/EdgeConditionsPanel.jsx#L77) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [94](../../src/components/dialogue/EdgeConditionsPanel.jsx#L94) | sync |
| `anonymous arrow (CallExpression)` | [109](../../src/components/dialogue/EdgeConditionsPanel.jsx#L109) | sync |
| `anonymous arrow (CallExpression)` | [110](../../src/components/dialogue/EdgeConditionsPanel.jsx#L110) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [135](../../src/components/dialogue/EdgeConditionsPanel.jsx#L135) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [145](../../src/components/dialogue/EdgeConditionsPanel.jsx#L145) | sync |
| `anonymous arrow (CallExpression)` | [149](../../src/components/dialogue/EdgeConditionsPanel.jsx#L149) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [161](../../src/components/dialogue/EdgeConditionsPanel.jsx#L161) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [172](../../src/components/dialogue/EdgeConditionsPanel.jsx#L172) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [196](../../src/components/dialogue/EdgeConditionsPanel.jsx#L196) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [213](../../src/components/dialogue/EdgeConditionsPanel.jsx#L213) | sync |
| `anonymous arrow (CallExpression)` | [217](../../src/components/dialogue/EdgeConditionsPanel.jsx#L217) | sync |

## src/components/dialogue/NodeConnectionModal.jsx

[src/components/dialogue/NodeConnectionModal.jsx](../../src/components/dialogue/NodeConnectionModal.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `NodeConnectionModal` | [19](../../src/components/dialogue/NodeConnectionModal.jsx#L19) | sync |
| `handleOpenChange` | [22](../../src/components/dialogue/NodeConnectionModal.jsx#L22) | sync |
| `handleConnect` | [27](../../src/components/dialogue/NodeConnectionModal.jsx#L27) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [51](../../src/components/dialogue/NodeConnectionModal.jsx#L51) | sync |
| `anonymous arrow (CallExpression)` | [56](../../src/components/dialogue/NodeConnectionModal.jsx#L56) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [74](../../src/components/dialogue/NodeConnectionModal.jsx#L74) | sync |

## src/components/dialogue/NodeTypeSelectionModal.jsx

[src/components/dialogue/NodeTypeSelectionModal.jsx](../../src/components/dialogue/NodeTypeSelectionModal.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `NodeTypeSelectionModal` | [18](../../src/components/dialogue/NodeTypeSelectionModal.jsx#L18) | sync |
| `handleSelect` | [30](../../src/components/dialogue/NodeTypeSelectionModal.jsx#L30) | sync |
| `anonymous arrow (CallExpression)` | [49](../../src/components/dialogue/NodeTypeSelectionModal.jsx#L49) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [56](../../src/components/dialogue/NodeTypeSelectionModal.jsx#L56) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [76](../../src/components/dialogue/NodeTypeSelectionModal.jsx#L76) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [96](../../src/components/dialogue/NodeTypeSelectionModal.jsx#L96) | sync |

## src/components/dialogue/ZoomSlider.jsx

[src/components/dialogue/ZoomSlider.jsx](../../src/components/dialogue/ZoomSlider.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `ZoomSlider` | [8](../../src/components/dialogue/ZoomSlider.jsx#L8) | sync |
| `clampZoom` | [22](../../src/components/dialogue/ZoomSlider.jsx#L22) | sync |
| `setZoom` | [23](../../src/components/dialogue/ZoomSlider.jsx#L23) | sync |
| `handleSliderChange` | [28](../../src/components/dialogue/ZoomSlider.jsx#L28) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [38](../../src/components/dialogue/ZoomSlider.jsx#L38) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [60](../../src/components/dialogue/ZoomSlider.jsx#L60) | sync |

## src/components/dialogue/edges/ConditionEdge.jsx

[src/components/dialogue/edges/ConditionEdge.jsx](../../src/components/dialogue/edges/ConditionEdge.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [12](../../src/components/dialogue/edges/ConditionEdge.jsx#L12) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [64](../../src/components/dialogue/edges/ConditionEdge.jsx#L64) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [79](../../src/components/dialogue/edges/ConditionEdge.jsx#L79) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [83](../../src/components/dialogue/edges/ConditionEdge.jsx#L83) | sync |

## src/components/dialogue/nodes/AnswerNode.jsx

[src/components/dialogue/nodes/AnswerNode.jsx](../../src/components/dialogue/nodes/AnswerNode.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [11](../../src/components/dialogue/nodes/AnswerNode.jsx#L11) | sync |
| `anonymous arrow (CallExpression)` | [89](../../src/components/dialogue/nodes/AnswerNode.jsx#L89) | sync |
| `anonymous arrow (CallExpression)` | [96](../../src/components/dialogue/nodes/AnswerNode.jsx#L96) | sync |

## src/components/dialogue/nodes/CompleteNode.jsx

[src/components/dialogue/nodes/CompleteNode.jsx](../../src/components/dialogue/nodes/CompleteNode.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [12](../../src/components/dialogue/nodes/CompleteNode.jsx#L12) | sync |
| `anonymous arrow (CallExpression)` | [103](../../src/components/dialogue/nodes/CompleteNode.jsx#L103) | sync |
| `anonymous arrow (CallExpression)` | [114](../../src/components/dialogue/nodes/CompleteNode.jsx#L114) | sync |

## src/components/dialogue/nodes/DelayNode.jsx

[src/components/dialogue/nodes/DelayNode.jsx](../../src/components/dialogue/nodes/DelayNode.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [10](../../src/components/dialogue/nodes/DelayNode.jsx#L10) | sync |

## src/components/dialogue/nodes/LeadNode.jsx

[src/components/dialogue/nodes/LeadNode.jsx](../../src/components/dialogue/nodes/LeadNode.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [11](../../src/components/dialogue/nodes/LeadNode.jsx#L11) | sync |
| `anonymous arrow (CallExpression)` | [89](../../src/components/dialogue/nodes/LeadNode.jsx#L89) | sync |
| `anonymous arrow (CallExpression)` | [96](../../src/components/dialogue/nodes/LeadNode.jsx#L96) | sync |

## src/components/dialogue/nodes/OpenChildGraphNode.jsx

[src/components/dialogue/nodes/OpenChildGraphNode.jsx](../../src/components/dialogue/nodes/OpenChildGraphNode.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [12](../../src/components/dialogue/nodes/OpenChildGraphNode.jsx#L12) | sync |
| `anonymous arrow (CallExpression)` | [15](../../src/components/dialogue/nodes/OpenChildGraphNode.jsx#L15) | sync |
| `anonymous arrow (CallExpression)` | [17](../../src/components/dialogue/nodes/OpenChildGraphNode.jsx#L17) | sync |

## src/components/dialogue/nodes/PlaceholderNode.jsx

[src/components/dialogue/nodes/PlaceholderNode.jsx](../../src/components/dialogue/nodes/PlaceholderNode.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `PlaceholderNode` | [10](../../src/components/dialogue/nodes/PlaceholderNode.jsx#L10) | sync |
| `handleClick` | [13](../../src/components/dialogue/nodes/PlaceholderNode.jsx#L13) | sync |

## src/components/dialogue/nodes/ReturnNode.jsx

[src/components/dialogue/nodes/ReturnNode.jsx](../../src/components/dialogue/nodes/ReturnNode.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [13](../../src/components/dialogue/nodes/ReturnNode.jsx#L13) | sync |
| `anonymous arrow (CallExpression)` | [20](../../src/components/dialogue/nodes/ReturnNode.jsx#L20) | sync |

## src/components/dialogue/nodes/StartNode.jsx

[src/components/dialogue/nodes/StartNode.jsx](../../src/components/dialogue/nodes/StartNode.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [12](../../src/components/dialogue/nodes/StartNode.jsx#L12) | sync |

## src/components/dialogues/CreateDialogueDialog.jsx

[src/components/dialogues/CreateDialogueDialog.jsx](../../src/components/dialogues/CreateDialogueDialog.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `CreateDialogueDialog` | [23](../../src/components/dialogues/CreateDialogueDialog.jsx#L23) | sync |
| `handleChange` | [34](../../src/components/dialogues/CreateDialogueDialog.jsx#L34) | sync |
| `anonymous arrow (CallExpression)` | [35](../../src/components/dialogues/CreateDialogueDialog.jsx#L35) | sync |
| `anonymous arrow (CallExpression)` | [37](../../src/components/dialogues/CreateDialogueDialog.jsx#L37) | sync |
| `validate` | [41](../../src/components/dialogues/CreateDialogueDialog.jsx#L41) | sync |
| `handleSubmit` | [54](../../src/components/dialogues/CreateDialogueDialog.jsx#L54) | async |
| `anonymous arrow (CallExpression)` | [65](../../src/components/dialogues/CreateDialogueDialog.jsx#L65) | sync |
| `anonymous arrow (CallExpression)` | [87](../../src/components/dialogues/CreateDialogueDialog.jsx#L87) | sync |
| `handleCancel` | [101](../../src/components/dialogues/CreateDialogueDialog.jsx#L101) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [128](../../src/components/dialogues/CreateDialogueDialog.jsx#L128) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [145](../../src/components/dialogues/CreateDialogueDialog.jsx#L145) | sync |

## src/components/projects/CategoryCard.jsx

[src/components/projects/CategoryCard.jsx](../../src/components/projects/CategoryCard.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `CategoryCard` | [20](../../src/components/projects/CategoryCard.jsx#L20) | sync |
| `handleDelete` | [27](../../src/components/projects/CategoryCard.jsx#L27) | async |
| `getCategoryPath` | [40](../../src/components/projects/CategoryCard.jsx#L40) | sync |
| `anonymous arrow (CallExpression)` | [43](../../src/components/projects/CategoryCard.jsx#L43) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [72](../../src/components/projects/CategoryCard.jsx#L72) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [80](../../src/components/projects/CategoryCard.jsx#L80) | sync |

## src/components/projects/ConditionCard.jsx

[src/components/projects/ConditionCard.jsx](../../src/components/projects/ConditionCard.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `ConditionCard` | [21](../../src/components/projects/ConditionCard.jsx#L21) | sync |
| `handleDelete` | [28](../../src/components/projects/ConditionCard.jsx#L28) | async |
| `anonymous arrow (JSXExpressionContainer)` | [63](../../src/components/projects/ConditionCard.jsx#L63) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [71](../../src/components/projects/ConditionCard.jsx#L71) | sync |

## src/components/projects/CreateProjectDialog.jsx

[src/components/projects/CreateProjectDialog.jsx](../../src/components/projects/CreateProjectDialog.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `CreateProjectDialog` | [22](../../src/components/projects/CreateProjectDialog.jsx#L22) | sync |
| `handleChange` | [34](../../src/components/projects/CreateProjectDialog.jsx#L34) | sync |
| `anonymous arrow (CallExpression)` | [35](../../src/components/projects/CreateProjectDialog.jsx#L35) | sync |
| `anonymous arrow (CallExpression)` | [37](../../src/components/projects/CreateProjectDialog.jsx#L37) | sync |
| `validate` | [41](../../src/components/projects/CreateProjectDialog.jsx#L41) | sync |
| `handleSubmit` | [54](../../src/components/projects/CreateProjectDialog.jsx#L54) | async |
| `handleCancel` | [85](../../src/components/projects/CreateProjectDialog.jsx#L85) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [112](../../src/components/projects/CreateProjectDialog.jsx#L112) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [127](../../src/components/projects/CreateProjectDialog.jsx#L127) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [138](../../src/components/projects/CreateProjectDialog.jsx#L138) | sync |

## src/components/projects/DecoratorCard.jsx

[src/components/projects/DecoratorCard.jsx](../../src/components/projects/DecoratorCard.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `DecoratorCard` | [21](../../src/components/projects/DecoratorCard.jsx#L21) | sync |
| `handleDelete` | [28](../../src/components/projects/DecoratorCard.jsx#L28) | async |
| `anonymous arrow (JSXExpressionContainer)` | [63](../../src/components/projects/DecoratorCard.jsx#L63) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [71](../../src/components/projects/DecoratorCard.jsx#L71) | sync |

## src/components/projects/DialogueCard.jsx

[src/components/projects/DialogueCard.jsx](../../src/components/projects/DialogueCard.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `DialogueCard` | [21](../../src/components/projects/DialogueCard.jsx#L21) | sync |
| `anonymous arrow (CallExpression)` | [24](../../src/components/projects/DialogueCard.jsx#L24) | sync |
| `handleExport` | [29](../../src/components/projects/DialogueCard.jsx#L29) | async |
| `handleDelete` | [37](../../src/components/projects/DialogueCard.jsx#L37) | async |
| `anonymous arrow (JSXExpressionContainer)` | [69](../../src/components/projects/DialogueCard.jsx#L69) | sync |
| `onOpenSettings` | [79](../../src/components/projects/DialogueCard.jsx#L79) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [120](../../src/components/projects/DialogueCard.jsx#L120) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [132](../../src/components/projects/DialogueCard.jsx#L132) | sync |

## src/components/projects/ParticipantCard.jsx

[src/components/projects/ParticipantCard.jsx](../../src/components/projects/ParticipantCard.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `ParticipantCard` | [23](../../src/components/projects/ParticipantCard.jsx#L23) | sync |
| `anonymous arrow (CallExpression)` | [30](../../src/components/projects/ParticipantCard.jsx#L30) | sync |
| `handleDelete` | [34](../../src/components/projects/ParticipantCard.jsx#L34) | async |
| `anonymous arrow (JSXExpressionContainer)` | [75](../../src/components/projects/ParticipantCard.jsx#L75) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [83](../../src/components/projects/ParticipantCard.jsx#L83) | sync |

## src/components/projects/ProjectHeader.jsx

[src/components/projects/ProjectHeader.jsx](../../src/components/projects/ProjectHeader.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `ProjectHeader` | [12](../../src/components/projects/ProjectHeader.jsx#L12) | sync |

## src/components/projects/ProjectSidebar.jsx

[src/components/projects/ProjectSidebar.jsx](../../src/components/projects/ProjectSidebar.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `ProjectSidebar` | [12](../../src/components/projects/ProjectSidebar.jsx#L12) | sync |
| `anonymous arrow (CallExpression)` | [23](../../src/components/projects/ProjectSidebar.jsx#L23) | sync |
| `anonymous arrow (CallExpression)` | [92](../../src/components/projects/ProjectSidebar.jsx#L92) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [99](../../src/components/projects/ProjectSidebar.jsx#L99) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [122](../../src/components/projects/ProjectSidebar.jsx#L122) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [136](../../src/components/projects/ProjectSidebar.jsx#L136) | sync |
| `anonymous arrow (ConditionalExpression)` | [140](../../src/components/projects/ProjectSidebar.jsx#L140) | sync |

## src/components/projects/sections/CategoriesSection.jsx

[src/components/projects/sections/CategoriesSection.jsx](../../src/components/projects/sections/CategoriesSection.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `CategoriesSection` | [21](../../src/components/projects/sections/CategoriesSection.jsx#L21) | sync |
| `anonymous arrow (CallExpression)` | [31](../../src/components/projects/sections/CategoriesSection.jsx#L31) | sync |
| `anonymous arrow (CallExpression)` | [39](../../src/components/projects/sections/CategoriesSection.jsx#L39) | sync |
| `toggleCategory` | [43](../../src/components/projects/sections/CategoriesSection.jsx#L43) | sync |
| `anonymous arrow (CallExpression)` | [44](../../src/components/projects/sections/CategoriesSection.jsx#L44) | sync |
| `renderCategoryNode` | [55](../../src/components/projects/sections/CategoriesSection.jsx#L55) | sync |
| `anonymous arrow (CallExpression)` | [58](../../src/components/projects/sections/CategoriesSection.jsx#L58) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [65](../../src/components/projects/sections/CategoriesSection.jsx#L65) | sync |
| `anonymous arrow (CallExpression)` | [85](../../src/components/projects/sections/CategoriesSection.jsx#L85) | sync |
| `handleExport` | [94](../../src/components/projects/sections/CategoriesSection.jsx#L94) | async |
| `handleImport` | [113](../../src/components/projects/sections/CategoriesSection.jsx#L113) | async |
| `anonymous arrow (JSXExpressionContainer)` | [162](../../src/components/projects/sections/CategoriesSection.jsx#L162) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [179](../../src/components/projects/sections/CategoriesSection.jsx#L179) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [191](../../src/components/projects/sections/CategoriesSection.jsx#L191) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [210](../../src/components/projects/sections/CategoriesSection.jsx#L210) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [234](../../src/components/projects/sections/CategoriesSection.jsx#L234) | sync |
| `anonymous arrow (CallExpression)` | [243](../../src/components/projects/sections/CategoriesSection.jsx#L243) | sync |

## src/components/projects/sections/ConditionsSection.jsx

[src/components/projects/sections/ConditionsSection.jsx](../../src/components/projects/sections/ConditionsSection.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `ConditionsSection` | [17](../../src/components/projects/sections/ConditionsSection.jsx#L17) | sync |
| `handleExport` | [25](../../src/components/projects/sections/ConditionsSection.jsx#L25) | async |
| `handleImport` | [44](../../src/components/projects/sections/ConditionsSection.jsx#L44) | async |
| `anonymous arrow (JSXExpressionContainer)` | [91](../../src/components/projects/sections/ConditionsSection.jsx#L91) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [108](../../src/components/projects/sections/ConditionsSection.jsx#L108) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [119](../../src/components/projects/sections/ConditionsSection.jsx#L119) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [138](../../src/components/projects/sections/ConditionsSection.jsx#L138) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [159](../../src/components/projects/sections/ConditionsSection.jsx#L159) | sync |
| `anonymous arrow (CallExpression)` | [168](../../src/components/projects/sections/ConditionsSection.jsx#L168) | sync |

## src/components/projects/sections/DecoratorsSection.jsx

[src/components/projects/sections/DecoratorsSection.jsx](../../src/components/projects/sections/DecoratorsSection.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `DecoratorsSection` | [21](../../src/components/projects/sections/DecoratorsSection.jsx#L21) | sync |
| `handleExport` | [29](../../src/components/projects/sections/DecoratorsSection.jsx#L29) | async |
| `handleImport` | [48](../../src/components/projects/sections/DecoratorsSection.jsx#L48) | async |
| `anonymous arrow (JSXExpressionContainer)` | [97](../../src/components/projects/sections/DecoratorsSection.jsx#L97) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [114](../../src/components/projects/sections/DecoratorsSection.jsx#L114) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [126](../../src/components/projects/sections/DecoratorsSection.jsx#L126) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [145](../../src/components/projects/sections/DecoratorsSection.jsx#L145) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [169](../../src/components/projects/sections/DecoratorsSection.jsx#L169) | sync |
| `anonymous arrow (CallExpression)` | [178](../../src/components/projects/sections/DecoratorsSection.jsx#L178) | sync |

## src/components/projects/sections/DialoguesSection.jsx

[src/components/projects/sections/DialoguesSection.jsx](../../src/components/projects/sections/DialoguesSection.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `DialoguesSection` | [20](../../src/components/projects/sections/DialoguesSection.jsx#L20) | sync |
| `handleImport` | [27](../../src/components/projects/sections/DialoguesSection.jsx#L27) | async |
| `anonymous arrow (JSXExpressionContainer)` | [68](../../src/components/projects/sections/DialoguesSection.jsx#L68) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [78](../../src/components/projects/sections/DialoguesSection.jsx#L78) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [90](../../src/components/projects/sections/DialoguesSection.jsx#L90) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [99](../../src/components/projects/sections/DialoguesSection.jsx#L99) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [115](../../src/components/projects/sections/DialoguesSection.jsx#L115) | sync |
| `anonymous arrow (CallExpression)` | [128](../../src/components/projects/sections/DialoguesSection.jsx#L128) | sync |

## src/components/projects/sections/OverviewSection.jsx

[src/components/projects/sections/OverviewSection.jsx](../../src/components/projects/sections/OverviewSection.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `OverviewSection` | [28](../../src/components/projects/sections/OverviewSection.jsx#L28) | sync |
| `anonymous arrow (CallExpression)` | [47](../../src/components/projects/sections/OverviewSection.jsx#L47) | sync |
| `anonymous arrow (CallExpression)` | [55](../../src/components/projects/sections/OverviewSection.jsx#L55) | sync |
| `updateViewportType` | [56](../../src/components/projects/sections/OverviewSection.jsx#L56) | sync |
| `anonymous arrow (ReturnStatement)` | [61](../../src/components/projects/sections/OverviewSection.jsx#L61) | sync |
| `anonymous arrow (CallExpression)` | [71](../../src/components/projects/sections/OverviewSection.jsx#L71) | sync |
| `anonymous arrow (CallExpression)` | [73](../../src/components/projects/sections/OverviewSection.jsx#L73) | sync |
| `anonymous arrow (CallExpression)` | [81](../../src/components/projects/sections/OverviewSection.jsx#L81) | sync |
| `anonymous arrow (CallExpression)` | [87](../../src/components/projects/sections/OverviewSection.jsx#L87) | sync |
| `handleSelect` | [90](../../src/components/projects/sections/OverviewSection.jsx#L90) | sync |
| `anonymous arrow (ReturnStatement)` | [98](../../src/components/projects/sections/OverviewSection.jsx#L98) | sync |
| `anonymous arrow (CallExpression)` | [104](../../src/components/projects/sections/OverviewSection.jsx#L104) | sync |
| `loadProjectSize` | [106](../../src/components/projects/sections/OverviewSection.jsx#L106) | async |
| `anonymous arrow (ReturnStatement)` | [113](../../src/components/projects/sections/OverviewSection.jsx#L113) | sync |
| `renderMetricCard` | [152](../../src/components/projects/sections/OverviewSection.jsx#L152) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [193](../../src/components/projects/sections/OverviewSection.jsx#L193) | sync |
| `anonymous arrow (ConditionalExpression)` | [197](../../src/components/projects/sections/OverviewSection.jsx#L197) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [225](../../src/components/projects/sections/OverviewSection.jsx#L225) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [251](../../src/components/projects/sections/OverviewSection.jsx#L251) | sync |
| `anonymous arrow (CallExpression)` | [284](../../src/components/projects/sections/OverviewSection.jsx#L284) | sync |
| `anonymous arrow (CallExpression)` | [293](../../src/components/projects/sections/OverviewSection.jsx#L293) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [297](../../src/components/projects/sections/OverviewSection.jsx#L297) | sync |
| `anonymous arrow (CallExpression)` | [310](../../src/components/projects/sections/OverviewSection.jsx#L310) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [321](../../src/components/projects/sections/OverviewSection.jsx#L321) | sync |
| `anonymous arrow (CallExpression)` | [338](../../src/components/projects/sections/OverviewSection.jsx#L338) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [365](../../src/components/projects/sections/OverviewSection.jsx#L365) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [390](../../src/components/projects/sections/OverviewSection.jsx#L390) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [436](../../src/components/projects/sections/OverviewSection.jsx#L436) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [449](../../src/components/projects/sections/OverviewSection.jsx#L449) | sync |

## src/components/projects/sections/ParticipantsSection.jsx

[src/components/projects/sections/ParticipantsSection.jsx](../../src/components/projects/sections/ParticipantsSection.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `ParticipantsSection` | [22](../../src/components/projects/sections/ParticipantsSection.jsx#L22) | sync |
| `anonymous arrow (CallExpression)` | [32](../../src/components/projects/sections/ParticipantsSection.jsx#L32) | sync |
| `anonymous arrow (CallExpression)` | [38](../../src/components/projects/sections/ParticipantsSection.jsx#L38) | sync |
| `anonymous arrow (CallExpression)` | [40](../../src/components/projects/sections/ParticipantsSection.jsx#L40) | sync |
| `anonymous arrow (CallExpression)` | [47](../../src/components/projects/sections/ParticipantsSection.jsx#L47) | sync |
| `anonymous arrow (CallExpression)` | [48](../../src/components/projects/sections/ParticipantsSection.jsx#L48) | sync |
| `anonymous arrow (CallExpression)` | [52](../../src/components/projects/sections/ParticipantsSection.jsx#L52) | sync |
| `anonymous arrow (CallExpression)` | [61](../../src/components/projects/sections/ParticipantsSection.jsx#L61) | sync |
| `anonymous arrow (CallExpression)` | [73](../../src/components/projects/sections/ParticipantsSection.jsx#L73) | sync |
| `anonymous arrow (CallExpression)` | [74](../../src/components/projects/sections/ParticipantsSection.jsx#L74) | sync |
| `anonymous arrow (CallExpression)` | [78](../../src/components/projects/sections/ParticipantsSection.jsx#L78) | sync |
| `anonymous arrow (CallExpression)` | [81](../../src/components/projects/sections/ParticipantsSection.jsx#L81) | sync |
| `toggleCategory` | [85](../../src/components/projects/sections/ParticipantsSection.jsx#L85) | sync |
| `anonymous arrow (CallExpression)` | [86](../../src/components/projects/sections/ParticipantsSection.jsx#L86) | sync |
| `hasParticipantsInSubtree` | [97](../../src/components/projects/sections/ParticipantsSection.jsx#L97) | sync |
| `anonymous arrow (CallExpression)` | [100](../../src/components/projects/sections/ParticipantsSection.jsx#L100) | sync |
| `renderCategoryNode` | [103](../../src/components/projects/sections/ParticipantsSection.jsx#L103) | sync |
| `anonymous arrow (CallExpression)` | [104](../../src/components/projects/sections/ParticipantsSection.jsx#L104) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [116](../../src/components/projects/sections/ParticipantsSection.jsx#L116) | sync |
| `anonymous arrow (CallExpression)` | [132](../../src/components/projects/sections/ParticipantsSection.jsx#L132) | sync |
| `anonymous arrow (CallExpression)` | [140](../../src/components/projects/sections/ParticipantsSection.jsx#L140) | sync |
| `handleExport` | [149](../../src/components/projects/sections/ParticipantsSection.jsx#L149) | async |
| `handleImport` | [165](../../src/components/projects/sections/ParticipantsSection.jsx#L165) | async |
| `anonymous arrow (JSXExpressionContainer)` | [212](../../src/components/projects/sections/ParticipantsSection.jsx#L212) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [229](../../src/components/projects/sections/ParticipantsSection.jsx#L229) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [241](../../src/components/projects/sections/ParticipantsSection.jsx#L241) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [260](../../src/components/projects/sections/ParticipantsSection.jsx#L260) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [285](../../src/components/projects/sections/ParticipantsSection.jsx#L285) | sync |
| `anonymous arrow (CallExpression)` | [296](../../src/components/projects/sections/ParticipantsSection.jsx#L296) | sync |
| `anonymous arrow (CallExpression)` | [304](../../src/components/projects/sections/ParticipantsSection.jsx#L304) | sync |

## src/components/projects/sections/ProjectSettingsSection.jsx

[src/components/projects/sections/ProjectSettingsSection.jsx](../../src/components/projects/sections/ProjectSettingsSection.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `ProjectSettingsSection` | [32](../../src/components/projects/sections/ProjectSettingsSection.jsx#L32) | sync |
| `anonymous arrow (CallExpression)` | [48](../../src/components/projects/sections/ProjectSettingsSection.jsx#L48) | sync |
| `anonymous arrow (CallExpression)` | [56](../../src/components/projects/sections/ProjectSettingsSection.jsx#L56) | sync |
| `anonymous arrow (CallExpression)` | [58](../../src/components/projects/sections/ProjectSettingsSection.jsx#L58) | sync |
| `anonymous arrow (CallExpression)` | [62](../../src/components/projects/sections/ProjectSettingsSection.jsx#L62) | sync |
| `anonymous arrow (CallExpression)` | [65](../../src/components/projects/sections/ProjectSettingsSection.jsx#L65) | sync |
| `anonymous arrow (CallExpression)` | [77](../../src/components/projects/sections/ProjectSettingsSection.jsx#L77) | sync |
| `updateLocalizationDraft` | [90](../../src/components/projects/sections/ProjectSettingsSection.jsx#L90) | sync |
| `handleSave` | [96](../../src/components/projects/sections/ProjectSettingsSection.jsx#L96) | async |
| `handleCancel` | [114](../../src/components/projects/sections/ProjectSettingsSection.jsx#L114) | sync |
| `handleAddLocale` | [123](../../src/components/projects/sections/ProjectSettingsSection.jsx#L123) | sync |
| `handleRemoveLocale` | [159](../../src/components/projects/sections/ProjectSettingsSection.jsx#L159) | sync |
| `anonymous arrow (CallExpression)` | [169](../../src/components/projects/sections/ProjectSettingsSection.jsx#L169) | sync |
| `handleLocalizationSave` | [181](../../src/components/projects/sections/ProjectSettingsSection.jsx#L181) | async |
| `anonymous arrow (CallExpression)` | [185](../../src/components/projects/sections/ProjectSettingsSection.jsx#L185) | sync |
| `handleDelete` | [219](../../src/components/projects/sections/ProjectSettingsSection.jsx#L219) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [248](../../src/components/projects/sections/ProjectSettingsSection.jsx#L248) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [261](../../src/components/projects/sections/ProjectSettingsSection.jsx#L261) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [274](../../src/components/projects/sections/ProjectSettingsSection.jsx#L274) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [288](../../src/components/projects/sections/ProjectSettingsSection.jsx#L288) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [354](../../src/components/projects/sections/ProjectSettingsSection.jsx#L354) | sync |
| `anonymous arrow (CallExpression)` | [364](../../src/components/projects/sections/ProjectSettingsSection.jsx#L364) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [382](../../src/components/projects/sections/ProjectSettingsSection.jsx#L382) | sync |
| `anonymous arrow (CallExpression)` | [393](../../src/components/projects/sections/ProjectSettingsSection.jsx#L393) | sync |
| `anonymous arrow (CallExpression)` | [411](../../src/components/projects/sections/ProjectSettingsSection.jsx#L411) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [427](../../src/components/projects/sections/ProjectSettingsSection.jsx#L427) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [497](../../src/components/projects/sections/ProjectSettingsSection.jsx#L497) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [510](../../src/components/projects/sections/ProjectSettingsSection.jsx#L510) | sync |

## src/components/sync/GoogleDriveIcon.jsx

[src/components/sync/GoogleDriveIcon.jsx](../../src/components/sync/GoogleDriveIcon.jsx) · [synchronization guide](synchronization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `GoogleDriveIcon` | [1](../../src/components/sync/GoogleDriveIcon.jsx#L1) | sync |

## src/components/sync/SteamIcon.jsx

[src/components/sync/SteamIcon.jsx](../../src/components/sync/SteamIcon.jsx) · [synchronization guide](synchronization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `SteamIcon` | [3](../../src/components/sync/SteamIcon.jsx#L3) | sync |

## src/components/sync/SyncLoginDialog.jsx

[src/components/sync/SyncLoginDialog.jsx](../../src/components/sync/SyncLoginDialog.jsx) · [synchronization guide](synchronization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `SyncLoginDialog` | [25](../../src/components/sync/SyncLoginDialog.jsx#L25) | sync |
| `anonymous arrow (CallExpression)` | [47](../../src/components/sync/SyncLoginDialog.jsx#L47) | sync |
| `anonymous arrow (CallExpression)` | [48](../../src/components/sync/SyncLoginDialog.jsx#L48) | sync |
| `anonymous arrow (CallExpression)` | [76](../../src/components/sync/SyncLoginDialog.jsx#L76) | sync |
| `anonymous arrow (CallExpression)` | [78](../../src/components/sync/SyncLoginDialog.jsx#L78) | sync |
| `anonymous arrow (CallExpression)` | [92](../../src/components/sync/SyncLoginDialog.jsx#L92) | sync |
| `anonymous arrow (CallExpression)` | [97](../../src/components/sync/SyncLoginDialog.jsx#L97) | sync |
| `anonymous arrow (CallExpression)` | [107](../../src/components/sync/SyncLoginDialog.jsx#L107) | sync |
| `updateViewportType` | [108](../../src/components/sync/SyncLoginDialog.jsx#L108) | sync |
| `anonymous arrow (ReturnStatement)` | [113](../../src/components/sync/SyncLoginDialog.jsx#L113) | sync |
| `anonymous arrow (CallExpression)` | [120](../../src/components/sync/SyncLoginDialog.jsx#L120) | sync |
| `anonymous arrow (CallExpression)` | [130](../../src/components/sync/SyncLoginDialog.jsx#L130) | sync |
| `handleConnectGoogle` | [143](../../src/components/sync/SyncLoginDialog.jsx#L143) | async |
| `handleManualSyncGoogle` | [151](../../src/components/sync/SyncLoginDialog.jsx#L151) | async |
| `handleManualSyncSteam` | [155](../../src/components/sync/SyncLoginDialog.jsx#L155) | async |
| `anonymous arrow (CallExpression)` | [159](../../src/components/sync/SyncLoginDialog.jsx#L159) | sync |
| `anonymous arrow (CallExpression)` | [167](../../src/components/sync/SyncLoginDialog.jsx#L167) | sync |
| `anonymous arrow (CallExpression)` | [174](../../src/components/sync/SyncLoginDialog.jsx#L174) | sync |
| `anonymous arrow (CallExpression)` | [183](../../src/components/sync/SyncLoginDialog.jsx#L183) | sync |
| `anonymous arrow (CallExpression)` | [208](../../src/components/sync/SyncLoginDialog.jsx#L208) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [267](../../src/components/sync/SyncLoginDialog.jsx#L267) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [281](../../src/components/sync/SyncLoginDialog.jsx#L281) | sync |
| `anonymous arrow (CallExpression)` | [305](../../src/components/sync/SyncLoginDialog.jsx#L305) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [351](../../src/components/sync/SyncLoginDialog.jsx#L351) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [370](../../src/components/sync/SyncLoginDialog.jsx#L370) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [388](../../src/components/sync/SyncLoginDialog.jsx#L388) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [457](../../src/components/sync/SyncLoginDialog.jsx#L457) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [463](../../src/components/sync/SyncLoginDialog.jsx#L463) | sync |

## src/components/sync/SyncPullDialog.jsx

[src/components/sync/SyncPullDialog.jsx](../../src/components/sync/SyncPullDialog.jsx) · [synchronization guide](synchronization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `SyncPullDialog` | [17](../../src/components/sync/SyncPullDialog.jsx#L17) | sync |
| `anonymous arrow (CallExpression)` | [22](../../src/components/sync/SyncPullDialog.jsx#L22) | sync |
| `updateViewportType` | [23](../../src/components/sync/SyncPullDialog.jsx#L23) | sync |
| `anonymous arrow (ReturnStatement)` | [28](../../src/components/sync/SyncPullDialog.jsx#L28) | sync |
| `anonymous arrow (CallExpression)` | [37](../../src/components/sync/SyncPullDialog.jsx#L37) | sync |
| `anonymous arrow (CallExpression)` | [60](../../src/components/sync/SyncPullDialog.jsx#L60) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [89](../../src/components/sync/SyncPullDialog.jsx#L89) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [103](../../src/components/sync/SyncPullDialog.jsx#L103) | sync |

## src/components/sync/SyncStatusBadge.jsx

[src/components/sync/SyncStatusBadge.jsx](../../src/components/sync/SyncStatusBadge.jsx) · [synchronization guide](synchronization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `ProviderAvatar` | [33](../../src/components/sync/SyncStatusBadge.jsx#L33) | sync |
| `SyncStatusBadge` | [50](../../src/components/sync/SyncStatusBadge.jsx#L50) | sync |

## src/components/ui/AppErrorBoundary.jsx

[src/components/ui/AppErrorBoundary.jsx](../../src/components/ui/AppErrorBoundary.jsx) · [onboarding-observability guide](onboarding-observability.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `FallbackScreen` | [3](../../src/components/ui/AppErrorBoundary.jsx#L3) | sync |
| `AppErrorBoundary` | [16](../../src/components/ui/AppErrorBoundary.jsx#L16) | sync |

## src/components/ui/KeyboardShortcutsDialog.jsx

[src/components/ui/KeyboardShortcutsDialog.jsx](../../src/components/ui/KeyboardShortcutsDialog.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `KeyboardShortcutsDialog` | [45](../../src/components/ui/KeyboardShortcutsDialog.jsx#L45) | sync |
| `anonymous arrow (CallExpression)` | [72](../../src/components/ui/KeyboardShortcutsDialog.jsx#L72) | sync |
| `anonymous arrow (CallExpression)` | [78](../../src/components/ui/KeyboardShortcutsDialog.jsx#L78) | sync |
| `anonymous arrow (CallExpression)` | [87](../../src/components/ui/KeyboardShortcutsDialog.jsx#L87) | sync |

## src/components/ui/LanguageSelector.jsx

[src/components/ui/LanguageSelector.jsx](../../src/components/ui/LanguageSelector.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `LanguageSelector` | [10](../../src/components/ui/LanguageSelector.jsx#L10) | sync |
| `handleLanguageChange` | [13](../../src/components/ui/LanguageSelector.jsx#L13) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [27](../../src/components/ui/LanguageSelector.jsx#L27) | sync |
| `anonymous arrow (CallExpression)` | [30](../../src/components/ui/LanguageSelector.jsx#L30) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [44](../../src/components/ui/LanguageSelector.jsx#L44) | sync |
| `anonymous arrow (CallExpression)` | [47](../../src/components/ui/LanguageSelector.jsx#L47) | sync |

## src/components/ui/LoadingScreen.jsx

[src/components/ui/LoadingScreen.jsx](../../src/components/ui/LoadingScreen.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `LoadingScreen` | [23](../../src/components/ui/LoadingScreen.jsx#L23) | sync |
| `anonymous arrow (CallExpression)` | [29](../../src/components/ui/LoadingScreen.jsx#L29) | sync |
| `anonymous arrow (CallExpression)` | [32](../../src/components/ui/LoadingScreen.jsx#L32) | sync |
| `anonymous arrow (CallExpression)` | [33](../../src/components/ui/LoadingScreen.jsx#L33) | sync |
| `anonymous arrow (ReturnStatement)` | [36](../../src/components/ui/LoadingScreen.jsx#L36) | sync |
| `anonymous arrow (CallExpression)` | [40](../../src/components/ui/LoadingScreen.jsx#L40) | sync |
| `anonymous arrow (CallExpression)` | [43](../../src/components/ui/LoadingScreen.jsx#L43) | sync |
| `anonymous arrow (ReturnStatement)` | [46](../../src/components/ui/LoadingScreen.jsx#L46) | sync |
| `anonymous arrow (CallExpression)` | [117](../../src/components/ui/LoadingScreen.jsx#L117) | sync |

## src/components/ui/SettingsCommandDialog.jsx

[src/components/ui/SettingsCommandDialog.jsx](../../src/components/ui/SettingsCommandDialog.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `ShortcutKeys` | [46](../../src/components/ui/SettingsCommandDialog.jsx#L46) | sync |
| `anonymous arrow (CallExpression)` | [53](../../src/components/ui/SettingsCommandDialog.jsx#L53) | sync |
| `SettingsCommandDialog` | [66](../../src/components/ui/SettingsCommandDialog.jsx#L66) | sync |
| `anonymous arrow (CallExpression)` | [76](../../src/components/ui/SettingsCommandDialog.jsx#L76) | sync |
| `anonymous arrow (CallExpression)` | [84](../../src/components/ui/SettingsCommandDialog.jsx#L84) | sync |
| `updateViewportType` | [85](../../src/components/ui/SettingsCommandDialog.jsx#L85) | sync |
| `anonymous arrow (ReturnStatement)` | [90](../../src/components/ui/SettingsCommandDialog.jsx#L90) | sync |
| `anonymous arrow (CallExpression)` | [99](../../src/components/ui/SettingsCommandDialog.jsx#L99) | sync |
| `anonymous arrow (CallExpression)` | [103](../../src/components/ui/SettingsCommandDialog.jsx#L103) | sync |
| `anonymous arrow (CallExpression)` | [106](../../src/components/ui/SettingsCommandDialog.jsx#L106) | sync |
| `anonymous arrow (CallExpression)` | [117](../../src/components/ui/SettingsCommandDialog.jsx#L117) | sync |
| `onSelect` | [131](../../src/components/ui/SettingsCommandDialog.jsx#L131) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [197](../../src/components/ui/SettingsCommandDialog.jsx#L197) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [198](../../src/components/ui/SettingsCommandDialog.jsx#L198) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [204](../../src/components/ui/SettingsCommandDialog.jsx#L204) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [205](../../src/components/ui/SettingsCommandDialog.jsx#L205) | sync |
| `anonymous arrow (CallExpression)` | [258](../../src/components/ui/SettingsCommandDialog.jsx#L258) | sync |
| `anonymous arrow (CallExpression)` | [260](../../src/components/ui/SettingsCommandDialog.jsx#L260) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [264](../../src/components/ui/SettingsCommandDialog.jsx#L264) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [329](../../src/components/ui/SettingsCommandDialog.jsx#L329) | async |

## src/components/ui/accordion.jsx

[src/components/ui/accordion.jsx](../../src/components/ui/accordion.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [8](../../src/components/ui/accordion.jsx#L8) | sync |
| `anonymous arrow (CallExpression)` | [13](../../src/components/ui/accordion.jsx#L13) | sync |
| `anonymous arrow (CallExpression)` | [30](../../src/components/ui/accordion.jsx#L30) | sync |

## src/components/ui/alert-dialog.jsx

[src/components/ui/alert-dialog.jsx](../../src/components/ui/alert-dialog.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [10](../../src/components/ui/alert-dialog.jsx#L10) | sync |
| `anonymous arrow (CallExpression)` | [29](../../src/components/ui/alert-dialog.jsx#L29) | sync |
| `AlertDialogHeader` | [47](../../src/components/ui/alert-dialog.jsx#L47) | sync |
| `AlertDialogFooter` | [58](../../src/components/ui/alert-dialog.jsx#L58) | sync |
| `anonymous arrow (CallExpression)` | [69](../../src/components/ui/alert-dialog.jsx#L69) | sync |
| `anonymous arrow (CallExpression)` | [79](../../src/components/ui/alert-dialog.jsx#L79) | sync |
| `anonymous arrow (CallExpression)` | [90](../../src/components/ui/alert-dialog.jsx#L90) | sync |
| `anonymous arrow (CallExpression)` | [103](../../src/components/ui/alert-dialog.jsx#L103) | sync |
| `anonymous arrow (CallExpression)` | [120](../../src/components/ui/alert-dialog.jsx#L120) | sync |

## src/components/ui/app-header.jsx

[src/components/ui/app-header.jsx](../../src/components/ui/app-header.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `AppHeader` | [12](../../src/components/ui/app-header.jsx#L12) | sync |
| `anonymous arrow (CallExpression)` | [29](../../src/components/ui/app-header.jsx#L29) | sync |
| `anonymous arrow (CallExpression)` | [48](../../src/components/ui/app-header.jsx#L48) | sync |
| `anonymous arrow (CallExpression)` | [94](../../src/components/ui/app-header.jsx#L94) | sync |

## src/components/ui/avatar.jsx

[src/components/ui/avatar.jsx](../../src/components/ui/avatar.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [4](../../src/components/ui/avatar.jsx#L4) | sync |
| `anonymous arrow (CallExpression)` | [16](../../src/components/ui/avatar.jsx#L16) | sync |
| `anonymous arrow (CallExpression)` | [25](../../src/components/ui/avatar.jsx#L25) | sync |

## src/components/ui/badge.jsx

[src/components/ui/badge.jsx](../../src/components/ui/badge.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `Badge` | [16](../../src/components/ui/badge.jsx#L16) | sync |

## src/components/ui/button-group.jsx

[src/components/ui/button-group.jsx](../../src/components/ui/button-group.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [4](../../src/components/ui/button-group.jsx#L4) | sync |
| `anonymous arrow (CallExpression)` | [15](../../src/components/ui/button-group.jsx#L15) | sync |
| `anonymous arrow (CallExpression)` | [26](../../src/components/ui/button-group.jsx#L26) | sync |

## src/components/ui/button.jsx

[src/components/ui/button.jsx](../../src/components/ui/button.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [25](../../src/components/ui/button.jsx#L25) | sync |

## src/components/ui/card.jsx

[src/components/ui/card.jsx](../../src/components/ui/card.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [4](../../src/components/ui/card.jsx#L4) | sync |
| `anonymous arrow (CallExpression)` | [16](../../src/components/ui/card.jsx#L16) | sync |
| `anonymous arrow (CallExpression)` | [25](../../src/components/ui/card.jsx#L25) | sync |
| `anonymous arrow (CallExpression)` | [37](../../src/components/ui/card.jsx#L37) | sync |
| `anonymous arrow (CallExpression)` | [46](../../src/components/ui/card.jsx#L46) | sync |
| `anonymous arrow (CallExpression)` | [51](../../src/components/ui/card.jsx#L51) | sync |

## src/components/ui/carousel.jsx

[src/components/ui/carousel.jsx](../../src/components/ui/carousel.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `useCarousel` | [10](../../src/components/ui/carousel.jsx#L10) | sync |
| `anonymous arrow (CallExpression)` | [21](../../src/components/ui/carousel.jsx#L21) | sync |
| `anonymous arrow (CallExpression)` | [43](../../src/components/ui/carousel.jsx#L43) | sync |
| `anonymous arrow (CallExpression)` | [49](../../src/components/ui/carousel.jsx#L49) | sync |
| `anonymous arrow (CallExpression)` | [53](../../src/components/ui/carousel.jsx#L53) | sync |
| `anonymous arrow (CallExpression)` | [58](../../src/components/ui/carousel.jsx#L58) | sync |
| `anonymous arrow (CallExpression)` | [70](../../src/components/ui/carousel.jsx#L70) | sync |
| `anonymous arrow (CallExpression)` | [75](../../src/components/ui/carousel.jsx#L75) | sync |
| `anonymous arrow (ReturnStatement)` | [82](../../src/components/ui/carousel.jsx#L82) | sync |
| `anonymous arrow (CallExpression)` | [118](../../src/components/ui/carousel.jsx#L118) | sync |
| `anonymous arrow (CallExpression)` | [137](../../src/components/ui/carousel.jsx#L137) | sync |
| `anonymous arrow (CallExpression)` | [157](../../src/components/ui/carousel.jsx#L157) | sync |
| `anonymous arrow (CallExpression)` | [185](../../src/components/ui/carousel.jsx#L185) | sync |

## src/components/ui/command-palette.jsx

[src/components/ui/command-palette.jsx](../../src/components/ui/command-palette.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getLocaleMenuLabel` | [40](../../src/components/ui/command-palette.jsx#L40) | sync |
| `resolveRouteContext` | [64](../../src/components/ui/command-palette.jsx#L64) | sync |
| `CommandPalette` | [107](../../src/components/ui/command-palette.jsx#L107) | sync |
| `anonymous arrow (CallExpression)` | [112](../../src/components/ui/command-palette.jsx#L112) | sync |
| `anonymous arrow (CallExpression)` | [113](../../src/components/ui/command-palette.jsx#L113) | sync |
| `anonymous arrow (CallExpression)` | [121](../../src/components/ui/command-palette.jsx#L121) | sync |
| `down` | [122](../../src/components/ui/command-palette.jsx#L122) | sync |
| `anonymous arrow (ReturnStatement)` | [135](../../src/components/ui/command-palette.jsx#L135) | sync |
| `anonymous arrow (CallExpression)` | [139](../../src/components/ui/command-palette.jsx#L139) | sync |
| `anonymous arrow (CallExpression)` | [146](../../src/components/ui/command-palette.jsx#L146) | sync |
| `anonymous arrow (CallExpression)` | [151](../../src/components/ui/command-palette.jsx#L151) | sync |
| `anonymous arrow (CallExpression)` | [163](../../src/components/ui/command-palette.jsx#L163) | sync |
| `anonymous arrow (CallExpression)` | [170](../../src/components/ui/command-palette.jsx#L170) | async |
| `anonymous arrow (CallExpression)` | [180](../../src/components/ui/command-palette.jsx#L180) | sync |
| `onSelect` | [205](../../src/components/ui/command-palette.jsx#L205) | sync |
| `onSelect` | [213](../../src/components/ui/command-palette.jsx#L213) | sync |
| `onSelect` | [220](../../src/components/ui/command-palette.jsx#L220) | sync |
| `onSelect` | [228](../../src/components/ui/command-palette.jsx#L228) | sync |
| `onSelect` | [237](../../src/components/ui/command-palette.jsx#L237) | sync |
| `onSelect` | [243](../../src/components/ui/command-palette.jsx#L243) | sync |
| `onSelect` | [249](../../src/components/ui/command-palette.jsx#L249) | sync |
| `onSelect` | [258](../../src/components/ui/command-palette.jsx#L258) | sync |
| `onSelect` | [266](../../src/components/ui/command-palette.jsx#L266) | sync |
| `onSelect` | [274](../../src/components/ui/command-palette.jsx#L274) | sync |
| `onSelect` | [288](../../src/components/ui/command-palette.jsx#L288) | sync |
| `onSelect` | [294](../../src/components/ui/command-palette.jsx#L294) | sync |
| `onSelect` | [308](../../src/components/ui/command-palette.jsx#L308) | sync |
| `onSelect` | [317](../../src/components/ui/command-palette.jsx#L317) | sync |
| `onSelect` | [323](../../src/components/ui/command-palette.jsx#L323) | sync |
| `render` | [334](../../src/components/ui/command-palette.jsx#L334) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [341](../../src/components/ui/command-palette.jsx#L341) | sync |
| `render` | [354](../../src/components/ui/command-palette.jsx#L354) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [361](../../src/components/ui/command-palette.jsx#L361) | sync |
| `anonymous arrow (CallExpression)` | [365](../../src/components/ui/command-palette.jsx#L365) | sync |
| `render` | [377](../../src/components/ui/command-palette.jsx#L377) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [384](../../src/components/ui/command-palette.jsx#L384) | sync |
| `anonymous arrow (CallExpression)` | [388](../../src/components/ui/command-palette.jsx#L388) | sync |
| `onSelect` | [403](../../src/components/ui/command-palette.jsx#L403) | sync |
| `onSelect` | [411](../../src/components/ui/command-palette.jsx#L411) | sync |
| `onSelect` | [422](../../src/components/ui/command-palette.jsx#L422) | sync |
| `onSelect` | [430](../../src/components/ui/command-palette.jsx#L430) | sync |
| `onSelect` | [436](../../src/components/ui/command-palette.jsx#L436) | sync |
| `onSelect` | [442](../../src/components/ui/command-palette.jsx#L442) | sync |
| `onSelect` | [450](../../src/components/ui/command-palette.jsx#L450) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [480](../../src/components/ui/command-palette.jsx#L480) | sync |
| `anonymous arrow (CallExpression)` | [507](../../src/components/ui/command-palette.jsx#L507) | sync |
| `anonymous arrow (CallExpression)` | [513](../../src/components/ui/command-palette.jsx#L513) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [525](../../src/components/ui/command-palette.jsx#L525) | sync |

## src/components/ui/command.jsx

[src/components/ui/command.jsx](../../src/components/ui/command.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [7](../../src/components/ui/command.jsx#L7) | sync |
| `CommandDialog` | [19](../../src/components/ui/command.jsx#L19) | sync |
| `anonymous arrow (CallExpression)` | [27](../../src/components/ui/command.jsx#L27) | sync |
| `anonymous arrow (CallExpression)` | [42](../../src/components/ui/command.jsx#L42) | sync |
| `anonymous arrow (CallExpression)` | [51](../../src/components/ui/command.jsx#L51) | sync |
| `anonymous arrow (CallExpression)` | [60](../../src/components/ui/command.jsx#L60) | sync |
| `anonymous arrow (CallExpression)` | [72](../../src/components/ui/command.jsx#L72) | sync |
| `anonymous arrow (CallExpression)` | [81](../../src/components/ui/command.jsx#L81) | sync |
| `CommandShortcut` | [93](../../src/components/ui/command.jsx#L93) | sync |

## src/components/ui/context-menu.jsx

[src/components/ui/context-menu.jsx](../../src/components/ui/context-menu.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [13](../../src/components/ui/context-menu.jsx#L13) | sync |
| `anonymous arrow (CallExpression)` | [30](../../src/components/ui/context-menu.jsx#L30) | sync |
| `anonymous arrow (CallExpression)` | [49](../../src/components/ui/context-menu.jsx#L49) | sync |
| `getItemVariantClass` | [69](../../src/components/ui/context-menu.jsx#L69) | sync |
| `anonymous arrow (CallExpression)` | [77](../../src/components/ui/context-menu.jsx#L77) | sync |
| `anonymous arrow (CallExpression)` | [94](../../src/components/ui/context-menu.jsx#L94) | sync |
| `anonymous arrow (CallExpression)` | [112](../../src/components/ui/context-menu.jsx#L112) | sync |
| `anonymous arrow (CallExpression)` | [129](../../src/components/ui/context-menu.jsx#L129) | sync |
| `anonymous arrow (CallExpression)` | [140](../../src/components/ui/context-menu.jsx#L140) | sync |
| `ContextMenuShortcut` | [150](../../src/components/ui/context-menu.jsx#L150) | sync |

## src/components/ui/dialog.jsx

[src/components/ui/dialog.jsx](../../src/components/ui/dialog.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [11](../../src/components/ui/dialog.jsx#L11) | sync |
| `anonymous arrow (CallExpression)` | [24](../../src/components/ui/dialog.jsx#L24) | sync |
| `DialogHeader` | [49](../../src/components/ui/dialog.jsx#L49) | sync |
| `DialogFooter` | [60](../../src/components/ui/dialog.jsx#L60) | sync |
| `anonymous arrow (CallExpression)` | [71](../../src/components/ui/dialog.jsx#L71) | sync |
| `anonymous arrow (CallExpression)` | [83](../../src/components/ui/dialog.jsx#L83) | sync |

## src/components/ui/drawer.jsx

[src/components/ui/drawer.jsx](../../src/components/ui/drawer.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `Drawer` | [5](../../src/components/ui/drawer.jsx#L5) | sync |
| `anonymous arrow (CallExpression)` | [14](../../src/components/ui/drawer.jsx#L14) | sync |
| `anonymous arrow (CallExpression)` | [37](../../src/components/ui/drawer.jsx#L37) | sync |
| `DrawerHeader` | [58](../../src/components/ui/drawer.jsx#L58) | sync |
| `DrawerFooter` | [63](../../src/components/ui/drawer.jsx#L63) | sync |
| `anonymous arrow (CallExpression)` | [68](../../src/components/ui/drawer.jsx#L68) | sync |
| `anonymous arrow (CallExpression)` | [77](../../src/components/ui/drawer.jsx#L77) | sync |

## src/components/ui/dropdown-menu.jsx

[src/components/ui/dropdown-menu.jsx](../../src/components/ui/dropdown-menu.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [13](../../src/components/ui/dropdown-menu.jsx#L13) | sync |
| `anonymous arrow (CallExpression)` | [31](../../src/components/ui/dropdown-menu.jsx#L31) | sync |
| `anonymous arrow (CallExpression)` | [46](../../src/components/ui/dropdown-menu.jsx#L46) | sync |
| `anonymous arrow (CallExpression)` | [57](../../src/components/ui/dropdown-menu.jsx#L57) | sync |

## src/components/ui/empty-state.jsx

[src/components/ui/empty-state.jsx](../../src/components/ui/empty-state.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `EmptyState` | [7](../../src/components/ui/empty-state.jsx#L7) | sync |
| `anonymous arrow (CallExpression)` | [44](../../src/components/ui/empty-state.jsx#L44) | sync |
| `CompactEmptyState` | [60](../../src/components/ui/empty-state.jsx#L60) | sync |

## src/components/ui/input.jsx

[src/components/ui/input.jsx](../../src/components/ui/input.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [4](../../src/components/ui/input.jsx#L4) | sync |

## src/components/ui/kbd.jsx

[src/components/ui/kbd.jsx](../../src/components/ui/kbd.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `Kbd` | [3](../../src/components/ui/kbd.jsx#L3) | sync |

## src/components/ui/label.jsx

[src/components/ui/label.jsx](../../src/components/ui/label.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [4](../../src/components/ui/label.jsx#L4) | sync |

## src/components/ui/native-select.jsx

[src/components/ui/native-select.jsx](../../src/components/ui/native-select.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [5](../../src/components/ui/native-select.jsx#L5) | sync |

## src/components/ui/onboarding-tour.jsx

[src/components/ui/onboarding-tour.jsx](../../src/components/ui/onboarding-tour.jsx) · [onboarding-observability guide](onboarding-observability.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `emitOnboardingCompleted` | [8](../../src/components/ui/onboarding-tour.jsx#L8) | sync |
| `OnboardingTour` | [16](../../src/components/ui/onboarding-tour.jsx#L16) | sync |
| `getVisibleTarget` | [28](../../src/components/ui/onboarding-tour.jsx#L28) | sync |
| `anonymous arrow (CallExpression)` | [32](../../src/components/ui/onboarding-tour.jsx#L32) | sync |
| `resolveTarget` | [41](../../src/components/ui/onboarding-tour.jsx#L41) | sync |
| `renderStepContent` | [50](../../src/components/ui/onboarding-tour.jsx#L50) | sync |
| `anonymous arrow (CallExpression)` | [61](../../src/components/ui/onboarding-tour.jsx#L61) | sync |
| `handleJoyrideCallback` | [401](../../src/components/ui/onboarding-tour.jsx#L401) | sync |
| `anonymous arrow (CallExpression)` | [417](../../src/components/ui/onboarding-tour.jsx#L417) | sync |
| `useOnboarding` | [496](../../src/components/ui/onboarding-tour.jsx#L496) | sync |
| `anonymous arrow (CallExpression)` | [503](../../src/components/ui/onboarding-tour.jsx#L503) | sync |
| `checkAndShowTour` | [507](../../src/components/ui/onboarding-tour.jsx#L507) | async |
| `anonymous arrow (CallExpression)` | [537](../../src/components/ui/onboarding-tour.jsx#L537) | sync |
| `anonymous arrow (ReturnStatement)` | [545](../../src/components/ui/onboarding-tour.jsx#L545) | sync |
| `finishTour` | [553](../../src/components/ui/onboarding-tour.jsx#L553) | sync |
| `resetTour` | [559](../../src/components/ui/onboarding-tour.jsx#L559) | sync |

## src/components/ui/progress.jsx

[src/components/ui/progress.jsx](../../src/components/ui/progress.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [5](../../src/components/ui/progress.jsx#L5) | sync |

## src/components/ui/save-indicator.jsx

[src/components/ui/save-indicator.jsx](../../src/components/ui/save-indicator.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `SaveIndicator` | [9](../../src/components/ui/save-indicator.jsx#L9) | sync |
| `formatTime` | [42](../../src/components/ui/save-indicator.jsx#L42) | sync |
| `SaveDot` | [88](../../src/components/ui/save-indicator.jsx#L88) | sync |

## src/components/ui/select.jsx

[src/components/ui/select.jsx](../../src/components/ui/select.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [10](../../src/components/ui/select.jsx#L10) | sync |
| `anonymous arrow (CallExpression)` | [27](../../src/components/ui/select.jsx#L27) | sync |
| `anonymous arrow (CallExpression)` | [41](../../src/components/ui/select.jsx#L41) | sync |
| `anonymous arrow (CallExpression)` | [56](../../src/components/ui/select.jsx#L56) | sync |
| `anonymous arrow (CallExpression)` | [86](../../src/components/ui/select.jsx#L86) | sync |
| `anonymous arrow (CallExpression)` | [95](../../src/components/ui/select.jsx#L95) | sync |
| `anonymous arrow (CallExpression)` | [115](../../src/components/ui/select.jsx#L115) | sync |

## src/components/ui/separator.jsx

[src/components/ui/separator.jsx](../../src/components/ui/separator.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [5](../../src/components/ui/separator.jsx#L5) | sync |

## src/components/ui/skeleton.jsx

[src/components/ui/skeleton.jsx](../../src/components/ui/skeleton.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `Skeleton` | [7](../../src/components/ui/skeleton.jsx#L7) | sync |
| `CardSkeleton` | [21](../../src/components/ui/skeleton.jsx#L21) | sync |
| `ListItemSkeleton` | [41](../../src/components/ui/skeleton.jsx#L41) | sync |
| `TableRowSkeleton` | [55](../../src/components/ui/skeleton.jsx#L55) | sync |
| `anonymous arrow (CallExpression)` | [58](../../src/components/ui/skeleton.jsx#L58) | sync |
| `FormSkeleton` | [66](../../src/components/ui/skeleton.jsx#L66) | sync |
| `anonymous arrow (CallExpression)` | [69](../../src/components/ui/skeleton.jsx#L69) | sync |
| `NodeSkeleton` | [84](../../src/components/ui/skeleton.jsx#L84) | sync |
| `TextSkeleton` | [97](../../src/components/ui/skeleton.jsx#L97) | sync |
| `anonymous arrow (CallExpression)` | [100](../../src/components/ui/skeleton.jsx#L100) | sync |

## src/components/ui/slider.jsx

[src/components/ui/slider.jsx](../../src/components/ui/slider.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [9](../../src/components/ui/slider.jsx#L9) | sync |
| `handleChange` | [10](../../src/components/ui/slider.jsx#L10) | sync |

## src/components/ui/switch.jsx

[src/components/ui/switch.jsx](../../src/components/ui/switch.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [4](../../src/components/ui/switch.jsx#L4) | sync |
| `handleClick` | [5](../../src/components/ui/switch.jsx#L5) | sync |

## src/components/ui/table.jsx

[src/components/ui/table.jsx](../../src/components/ui/table.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [5](../../src/components/ui/table.jsx#L5) | sync |
| `anonymous arrow (CallExpression)` | [16](../../src/components/ui/table.jsx#L16) | sync |
| `anonymous arrow (CallExpression)` | [21](../../src/components/ui/table.jsx#L21) | sync |
| `anonymous arrow (CallExpression)` | [30](../../src/components/ui/table.jsx#L30) | sync |
| `anonymous arrow (CallExpression)` | [42](../../src/components/ui/table.jsx#L42) | sync |
| `anonymous arrow (CallExpression)` | [54](../../src/components/ui/table.jsx#L54) | sync |
| `anonymous arrow (CallExpression)` | [66](../../src/components/ui/table.jsx#L66) | sync |
| `anonymous arrow (CallExpression)` | [75](../../src/components/ui/table.jsx#L75) | sync |

## src/components/ui/textarea.jsx

[src/components/ui/textarea.jsx](../../src/components/ui/textarea.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [4](../../src/components/ui/textarea.jsx#L4) | sync |

## src/components/ui/toaster.jsx

[src/components/ui/toaster.jsx](../../src/components/ui/toaster.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `subscribe` | [10](../../src/components/ui/toaster.jsx#L10) | sync |
| `anonymous arrow (ReturnStatement)` | [12](../../src/components/ui/toaster.jsx#L12) | sync |
| `anonymous arrow (CallExpression)` | [13](../../src/components/ui/toaster.jsx#L13) | sync |
| `notify` | [16](../../src/components/ui/toaster.jsx#L16) | sync |
| `anonymous arrow (CallExpression)` | [18](../../src/components/ui/toaster.jsx#L18) | sync |
| `addToast` | [20](../../src/components/ui/toaster.jsx#L20) | sync |
| `removeToast` | [27](../../src/components/ui/toaster.jsx#L27) | sync |
| `anonymous arrow (CallExpression)` | [28](../../src/components/ui/toaster.jsx#L28) | sync |
| `toast` | [36](../../src/components/ui/toaster.jsx#L36) | sync |
| `clearToasts` | [43](../../src/components/ui/toaster.jsx#L43) | sync |
| `anonymous arrow (CallExpression)` | [44](../../src/components/ui/toaster.jsx#L44) | sync |
| `anonymous arrow (CallExpression)` | [46](../../src/components/ui/toaster.jsx#L46) | sync |
| `useToast` | [50](../../src/components/ui/toaster.jsx#L50) | sync |
| `anonymous arrow (CallExpression)` | [53](../../src/components/ui/toaster.jsx#L53) | sync |
| `dismiss` | [59](../../src/components/ui/toaster.jsx#L59) | sync |
| `Toaster` | [71](../../src/components/ui/toaster.jsx#L71) | sync |
| `anonymous arrow (CallExpression)` | [74](../../src/components/ui/toaster.jsx#L74) | sync |
| `anonymous arrow (CallExpression)` | [82](../../src/components/ui/toaster.jsx#L82) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [83](../../src/components/ui/toaster.jsx#L83) | sync |
| `Toast` | [90](../../src/components/ui/toaster.jsx#L90) | sync |
| `anonymous arrow (CallExpression)` | [93](../../src/components/ui/toaster.jsx#L93) | sync |
| `anonymous arrow (CallExpression)` | [99](../../src/components/ui/toaster.jsx#L99) | sync |
| `anonymous arrow (ReturnStatement)` | [109](../../src/components/ui/toaster.jsx#L109) | sync |
| `handleAction` | [143](../../src/components/ui/toaster.jsx#L143) | sync |

## src/components/ui/tooltip.jsx

[src/components/ui/tooltip.jsx](../../src/components/ui/tooltip.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [12](../../src/components/ui/tooltip.jsx#L12) | sync |
| `SimpleTooltip` | [34](../../src/components/ui/tooltip.jsx#L34) | sync |

## src/config/dialogueNodes.js

[src/config/dialogueNodes.js](../../src/config/dialogueNodes.js) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getNodeDefinition` | [5](../../src/config/dialogueNodes.js#L5) | sync |
| `getNodeDefinitionsList` | [7](../../src/config/dialogueNodes.js#L7) | sync |
| `getCreatableNodeDefinitions` | [9](../../src/config/dialogueNodes.js#L9) | sync |
| `anonymous arrow (CallExpression)` | [10](../../src/config/dialogueNodes.js#L10) | sync |
| `getNodeDefaultData` | [12](../../src/config/dialogueNodes.js#L12) | sync |

## src/config/edgeConditions.js

[src/config/edgeConditions.js](../../src/config/edgeConditions.js) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getConditionDefaultValues` | [1](../../src/config/edgeConditions.js#L1) | sync |
| `anonymous arrow (CallExpression)` | [5](../../src/config/edgeConditions.js#L5) | sync |
| `createConditionInstance` | [12](../../src/config/edgeConditions.js#L12) | sync |

## src/config/steamAchievements.js

[src/config/steamAchievements.js](../../src/config/steamAchievements.js) · [onboarding-observability guide](onboarding-observability.md)

No locally declared callable; configuration, exports, or side effects only.

## src/contexts/ThemeProvider.jsx

[src/contexts/ThemeProvider.jsx](../../src/contexts/ThemeProvider.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `setTheme` | [6](../../src/contexts/ThemeProvider.jsx#L6) | sync |
| `ThemeProvider` | [9](../../src/contexts/ThemeProvider.jsx#L9) | sync |
| `anonymous arrow (CallExpression)` | [16](../../src/contexts/ThemeProvider.jsx#L16) | sync |
| `anonymous arrow (CallExpression)` | [20](../../src/contexts/ThemeProvider.jsx#L20) | sync |
| `anonymous arrow (CallExpression)` | [41](../../src/contexts/ThemeProvider.jsx#L41) | sync |
| `handleChange` | [45](../../src/contexts/ThemeProvider.jsx#L45) | sync |
| `anonymous arrow (ReturnStatement)` | [54](../../src/contexts/ThemeProvider.jsx#L54) | sync |
| `anonymous arrow (CallExpression)` | [57](../../src/contexts/ThemeProvider.jsx#L57) | sync |
| `handleThemeCommand` | [58](../../src/contexts/ThemeProvider.jsx#L58) | sync |
| `anonymous arrow (ReturnStatement)` | [66](../../src/contexts/ThemeProvider.jsx#L66) | sync |
| `setTheme` | [74](../../src/contexts/ThemeProvider.jsx#L74) | sync |
| `useTheme` | [87](../../src/contexts/ThemeProvider.jsx#L87) | sync |

## src/helpers/autoSaveHelpers.js

[src/helpers/autoSaveHelpers.js](../../src/helpers/autoSaveHelpers.js) · [legacy-and-assets guide](legacy-and-assets.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `mergeWithExistingData` | [3](../../src/helpers/autoSaveHelpers.js#L3) | async |

## src/helpers/debounce.js

[src/helpers/debounce.js](../../src/helpers/debounce.js) · [legacy-and-assets guide](legacy-and-assets.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `debounce` | [1](../../src/helpers/debounce.js#L1) | sync |
| `anonymous arrow (ReturnStatement)` | [3](../../src/helpers/debounce.js#L3) | sync |
| `anonymous arrow (CallExpression)` | [5](../../src/helpers/debounce.js#L5) | sync |

## src/helpers/exportCategoriesHelper.js

[src/helpers/exportCategoriesHelper.js](../../src/helpers/exportCategoriesHelper.js) · [legacy-and-assets guide](legacy-and-assets.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `exportCategories` | [4](../../src/helpers/exportCategoriesHelper.js#L4) | async |
| `anonymous arrow (CallExpression)` | [15](../../src/helpers/exportCategoriesHelper.js#L15) | sync |
| `downloadFile` | [29](../../src/helpers/exportCategoriesHelper.js#L29) | sync |

## src/helpers/exportDialogueRowsHelper.js

[src/helpers/exportDialogueRowsHelper.js](../../src/helpers/exportDialogueRowsHelper.js) · [legacy-and-assets guide](legacy-and-assets.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `exportDialogueRows` | [5](../../src/helpers/exportDialogueRowsHelper.js#L5) | async |
| `fetchAudioFile` | [86](../../src/helpers/exportDialogueRowsHelper.js#L86) | async |
| `anonymous arrow (CallExpression)` | [100](../../src/helpers/exportDialogueRowsHelper.js#L100) | sync |
| `downloadFile` | [139](../../src/helpers/exportDialogueRowsHelper.js#L139) | sync |

## src/helpers/exportParticipantsHelper.js

[src/helpers/exportParticipantsHelper.js](../../src/helpers/exportParticipantsHelper.js) · [legacy-and-assets guide](legacy-and-assets.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `exportParticipants` | [4](../../src/helpers/exportParticipantsHelper.js#L4) | async |
| `anonymous arrow (CallExpression)` | [15](../../src/helpers/exportParticipantsHelper.js#L15) | sync |
| `downloadFile` | [33](../../src/helpers/exportParticipantsHelper.js#L33) | sync |

## src/helpers/exportProjectHelper.js

[src/helpers/exportProjectHelper.js](../../src/helpers/exportProjectHelper.js) · [legacy-and-assets guide](legacy-and-assets.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `exportProject` | [8](../../src/helpers/exportProjectHelper.js#L8) | async |
| `downloadFile` | [99](../../src/helpers/exportProjectHelper.js#L99) | sync |

## src/helpers/importCategoriesHelper.js

[src/helpers/importCategoriesHelper.js](../../src/helpers/importCategoriesHelper.js) · [legacy-and-assets guide](legacy-and-assets.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `processImportedCategories` | [5](../../src/helpers/importCategoriesHelper.js#L5) | sync |
| `getDataFromIndexedDB` | [10](../../src/helpers/importCategoriesHelper.js#L10) | async |
| `anonymous arrow (CallExpression)` | [28](../../src/helpers/importCategoriesHelper.js#L28) | sync |
| `anonymous arrow (CallExpression)` | [29](../../src/helpers/importCategoriesHelper.js#L29) | sync |
| `importCategories` | [52](../../src/helpers/importCategoriesHelper.js#L52) | async |
| `anonymous arrow (CallExpression)` | [94](../../src/helpers/importCategoriesHelper.js#L94) | sync |
| `anonymous arrow (CallExpression)` | [129](../../src/helpers/importCategoriesHelper.js#L129) | sync |
| `anonymous arrow (CallExpression)` | [130](../../src/helpers/importCategoriesHelper.js#L130) | sync |
| `anonymous arrow (CallExpression)` | [137](../../src/helpers/importCategoriesHelper.js#L137) | sync |
| `anonymous arrow (CallExpression)` | [153](../../src/helpers/importCategoriesHelper.js#L153) | sync |
| `anonymous arrow (CallExpression)` | [158](../../src/helpers/importCategoriesHelper.js#L158) | sync |
| `anonymous arrow (CallExpression)` | [160](../../src/helpers/importCategoriesHelper.js#L160) | sync |
| `anonymous arrow (CallExpression)` | [170](../../src/helpers/importCategoriesHelper.js#L170) | sync |
| `anonymous arrow (CallExpression)` | [176](../../src/helpers/importCategoriesHelper.js#L176) | sync |

## src/helpers/importParticipantsHelper.js

[src/helpers/importParticipantsHelper.js](../../src/helpers/importParticipantsHelper.js) · [legacy-and-assets guide](legacy-and-assets.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `processImportedParticipants` | [5](../../src/helpers/importParticipantsHelper.js#L5) | sync |
| `getDataFromIndexedDB` | [10](../../src/helpers/importParticipantsHelper.js#L10) | async |
| `anonymous arrow (CallExpression)` | [28](../../src/helpers/importParticipantsHelper.js#L28) | sync |
| `anonymous arrow (CallExpression)` | [29](../../src/helpers/importParticipantsHelper.js#L29) | sync |
| `importParticipants` | [52](../../src/helpers/importParticipantsHelper.js#L52) | async |
| `anonymous arrow (CallExpression)` | [94](../../src/helpers/importParticipantsHelper.js#L94) | sync |
| `anonymous arrow (CallExpression)` | [129](../../src/helpers/importParticipantsHelper.js#L129) | sync |
| `anonymous arrow (CallExpression)` | [130](../../src/helpers/importParticipantsHelper.js#L130) | sync |
| `anonymous arrow (CallExpression)` | [137](../../src/helpers/importParticipantsHelper.js#L137) | sync |
| `anonymous arrow (CallExpression)` | [153](../../src/helpers/importParticipantsHelper.js#L153) | sync |
| `getDataFromIndexedDB` | [158](../../src/helpers/importParticipantsHelper.js#L158) | async |
| `anonymous arrow (CallExpression)` | [165](../../src/helpers/importParticipantsHelper.js#L165) | sync |
| `anonymous arrow (CallExpression)` | [168](../../src/helpers/importParticipantsHelper.js#L168) | sync |
| `anonymous arrow (CallExpression)` | [187](../../src/helpers/importParticipantsHelper.js#L187) | sync |

## src/helpers/projectManager.js

[src/helpers/projectManager.js](../../src/helpers/projectManager.js) · [legacy-and-assets guide](legacy-and-assets.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `useProject` | [6](../../src/helpers/projectManager.js#L6) | sync |
| `ProjectProvider` | [8](../../src/helpers/projectManager.js#L8) | sync |
| `anonymous arrow (CallExpression)` | [11](../../src/helpers/projectManager.js#L11) | sync |
| `fetchProjects` | [12](../../src/helpers/projectManager.js#L12) | async |
| `anonymous arrow (CallExpression)` | [20](../../src/helpers/projectManager.js#L20) | sync |
| `anonymous arrow (CallExpression)` | [24](../../src/helpers/projectManager.js#L24) | sync |
| `deleteProject` | [34](../../src/helpers/projectManager.js#L34) | async |
| `anonymous arrow (CallExpression)` | [42](../../src/helpers/projectManager.js#L42) | sync |
| `anonymous arrow (CallExpression)` | [43](../../src/helpers/projectManager.js#L43) | sync |

## src/helpers/validationHelpers.js

[src/helpers/validationHelpers.js](../../src/helpers/validationHelpers.js) · [legacy-and-assets guide](legacy-and-assets.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `convertToStandardGuid` | [3](../../src/helpers/validationHelpers.js#L3) | sync |
| `validateCategories` | [33](../../src/helpers/validationHelpers.js#L33) | sync |
| `anonymous arrow (CallExpression)` | [41](../../src/helpers/validationHelpers.js#L41) | sync |
| `anonymous arrow (CallExpression)` | [46](../../src/helpers/validationHelpers.js#L46) | sync |
| `anonymous arrow (CallExpression)` | [55](../../src/helpers/validationHelpers.js#L55) | sync |
| `anonymous arrow (CallExpression)` | [70](../../src/helpers/validationHelpers.js#L70) | sync |
| `anonymous arrow (CallExpression)` | [85](../../src/helpers/validationHelpers.js#L85) | sync |
| `validateParticipants` | [91](../../src/helpers/validationHelpers.js#L91) | sync |
| `anonymous arrow (CallExpression)` | [99](../../src/helpers/validationHelpers.js#L99) | sync |
| `anonymous arrow (CallExpression)` | [101](../../src/helpers/validationHelpers.js#L101) | sync |
| `validateNodes` | [139](../../src/helpers/validationHelpers.js#L139) | sync |
| `anonymous arrow (CallExpression)` | [148](../../src/helpers/validationHelpers.js#L148) | sync |
| `validateDialogueRows` | [191](../../src/helpers/validationHelpers.js#L191) | sync |
| `anonymous arrow (CallExpression)` | [206](../../src/helpers/validationHelpers.js#L206) | sync |
| `anonymous arrow (CallExpression)` | [213](../../src/helpers/validationHelpers.js#L213) | sync |
| `validateEdges` | [257](../../src/helpers/validationHelpers.js#L257) | sync |
| `anonymous arrow (CallExpression)` | [268](../../src/helpers/validationHelpers.js#L268) | sync |
| `anonymous arrow (CallExpression)` | [271](../../src/helpers/validationHelpers.js#L271) | sync |
| `validateAudioFolder` | [332](../../src/helpers/validationHelpers.js#L332) | async |
| `anonymous arrow (CallExpression)` | [340](../../src/helpers/validationHelpers.js#L340) | sync |

## src/hooks/useAutoSave.js

[src/hooks/useAutoSave.js](../../src/hooks/useAutoSave.js) · [legacy-and-assets guide](legacy-and-assets.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `saveProjectToIndexedDB` | [5](../../src/hooks/useAutoSave.js#L5) | async |
| `mergeArrays` | [14](../../src/hooks/useAutoSave.js#L14) | sync |
| `anonymous arrow (CallExpression)` | [17](../../src/hooks/useAutoSave.js#L17) | sync |
| `anonymous arrow (CallExpression)` | [18](../../src/hooks/useAutoSave.js#L18) | sync |
| `removeNonSerializable` | [29](../../src/hooks/useAutoSave.js#L29) | sync |
| `anonymous arrow (CallExpression)` | [35](../../src/hooks/useAutoSave.js#L35) | sync |
| `anonymous arrow (CallExpression)` | [64](../../src/hooks/useAutoSave.js#L64) | sync |
| `saveFileToIndexedDB` | [100](../../src/hooks/useAutoSave.js#L100) | async |
| `anonymous arrow (CallExpression)` | [137](../../src/hooks/useAutoSave.js#L137) | sync |
| `anonymous arrow (CallExpression)` | [168](../../src/hooks/useAutoSave.js#L168) | sync |
| `deleteFileFromIndexedDB` | [181](../../src/hooks/useAutoSave.js#L181) | async |
| `anonymous arrow (CallExpression)` | [191](../../src/hooks/useAutoSave.js#L191) | sync |
| `useAutoSave` | [201](../../src/hooks/useAutoSave.js#L201) | sync |
| `anonymous arrow (CallExpression)` | [209](../../src/hooks/useAutoSave.js#L209) | sync |

## src/hooks/useAutoSaveNodesAndEdges.js

[src/hooks/useAutoSaveNodesAndEdges.js](../../src/hooks/useAutoSaveNodesAndEdges.js) · [legacy-and-assets guide](legacy-and-assets.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `saveNodesAndEdgesToIndexedDB` | [4](../../src/hooks/useAutoSaveNodesAndEdges.js#L4) | async |
| `anonymous arrow (CallExpression)` | [14](../../src/hooks/useAutoSaveNodesAndEdges.js#L14) | sync |
| `anonymous arrow (CallExpression)` | [29](../../src/hooks/useAutoSaveNodesAndEdges.js#L29) | sync |
| `useAutoSaveNodesAndEdges` | [43](../../src/hooks/useAutoSaveNodesAndEdges.js#L43) | sync |
| `anonymous arrow (CallExpression)` | [44](../../src/hooks/useAutoSaveNodesAndEdges.js#L44) | sync |

## src/i18n/index.js

[src/i18n/index.js](../../src/i18n/index.js) · [localization guide](localization.md)

No locally declared callable; configuration, exports, or side effects only.

## src/indexedDB.js

[src/indexedDB.js](../../src/indexedDB.js) · [legacy-and-assets guide](legacy-and-assets.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `openDatabase` | [5](../../src/indexedDB.js#L5) | async |
| `upgrade` | [9](../../src/indexedDB.js#L9) | sync |
| `getDB` | [22](../../src/indexedDB.js#L22) | async |

## src/lib/achievements/achievementTracker.js

[src/lib/achievements/achievementTracker.js](../../src/lib/achievements/achievementTracker.js) · [onboarding-observability guide](onboarding-observability.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `readLocalStorage` | [14](../../src/lib/achievements/achievementTracker.js#L14) | sync |
| `writeLocalStorage` | [18](../../src/lib/achievements/achievementTracker.js#L18) | sync |
| `loadAchievementState` | [22](../../src/lib/achievements/achievementTracker.js#L22) | sync |
| `saveAchievementState` | [32](../../src/lib/achievements/achievementTracker.js#L32) | sync |
| `isAchievementUnlocked` | [36](../../src/lib/achievements/achievementTracker.js#L36) | sync |
| `unlockAchievement` | [41](../../src/lib/achievements/achievementTracker.js#L41) | async |
| `isExampleProject` | [61](../../src/lib/achievements/achievementTracker.js#L61) | sync |
| `trackFirstRecordInProject` | [66](../../src/lib/achievements/achievementTracker.js#L66) | async |
| `trackExampleProjectCreated` | [78](../../src/lib/achievements/achievementTracker.js#L78) | async |
| `trackFirstNonExampleProjectCreated` | [82](../../src/lib/achievements/achievementTracker.js#L82) | async |
| `anonymous arrow (CallExpression)` | [84](../../src/lib/achievements/achievementTracker.js#L84) | sync |
| `trackFirstCategoryCreated` | [89](../../src/lib/achievements/achievementTracker.js#L89) | async |
| `trackFirstDecoratorCreated` | [97](../../src/lib/achievements/achievementTracker.js#L97) | async |
| `trackFirstParticipantCreated` | [105](../../src/lib/achievements/achievementTracker.js#L105) | async |
| `trackFirstConditionCreated` | [113](../../src/lib/achievements/achievementTracker.js#L113) | async |
| `markUserActivity` | [121](../../src/lib/achievements/achievementTracker.js#L121) | sync |
| `getTrackedPlaytimeMinutes` | [125](../../src/lib/achievements/achievementTracker.js#L125) | sync |
| `setTrackedPlaytimeMinutes` | [132](../../src/lib/achievements/achievementTracker.js#L132) | sync |
| `trackActiveMinute` | [136](../../src/lib/achievements/achievementTracker.js#L136) | async |

## src/lib/assetNaming.js

[src/lib/assetNaming.js](../../src/lib/assetNaming.js) · [media guide](media.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `toAscii` | [1](../../src/lib/assetNaming.js#L1) | sync |
| `sanitizeUnrealIdentifier` | [7](../../src/lib/assetNaming.js#L7) | sync |
| `sanitizeAudioFileName` | [16](../../src/lib/assetNaming.js#L16) | sync |
| `sanitizeAttachmentIdSegment` | [30](../../src/lib/assetNaming.js#L30) | sync |

## src/lib/assetNaming.test.js

[src/lib/assetNaming.test.js](../../src/lib/assetNaming.test.js) · [media guide](media.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [9](../../src/lib/assetNaming.test.js#L9) | sync |
| `anonymous arrow (CallExpression)` | [10](../../src/lib/assetNaming.test.js#L10) | sync |
| `anonymous arrow (CallExpression)` | [16](../../src/lib/assetNaming.test.js#L16) | sync |
| `anonymous arrow (CallExpression)` | [21](../../src/lib/assetNaming.test.js#L21) | sync |
| `anonymous arrow (CallExpression)` | [28](../../src/lib/assetNaming.test.js#L28) | sync |

## src/lib/audioStorage.js

[src/lib/audioStorage.js](../../src/lib/audioStorage.js) · [media guide](media.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `storeAudioFile` | [11](../../src/lib/audioStorage.js#L11) | async |
| `fileToDataUrl` | [47](../../src/lib/audioStorage.js#L47) | sync |
| `anonymous arrow (NewExpression)` | [48](../../src/lib/audioStorage.js#L48) | sync |
| `onload` | [50](../../src/lib/audioStorage.js#L50) | sync |
| `dataUrlToBlob` | [59](../../src/lib/audioStorage.js#L59) | sync |
| `createAudioUrl` | [74](../../src/lib/audioStorage.js#L74) | sync |
| `getAudioDuration` | [89](../../src/lib/audioStorage.js#L89) | sync |
| `anonymous arrow (NewExpression)` | [90](../../src/lib/audioStorage.js#L90) | sync |
| `anonymous arrow (CallExpression)` | [94](../../src/lib/audioStorage.js#L94) | sync |
| `anonymous arrow (CallExpression)` | [99](../../src/lib/audioStorage.js#L99) | sync |
| `validateAudioFile` | [111](../../src/lib/audioStorage.js#L111) | sync |

## src/lib/audioUtils.js

[src/lib/audioUtils.js](../../src/lib/audioUtils.js) · [media guide](media.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `blobToBase64` | [10](../../src/lib/audioUtils.js#L10) | async |
| `anonymous arrow (NewExpression)` | [11](../../src/lib/audioUtils.js#L11) | sync |
| `onloadend` | [13](../../src/lib/audioUtils.js#L13) | sync |
| `base64ToBlob` | [22](../../src/lib/audioUtils.js#L22) | sync |
| `prepareAudioForStorage` | [35](../../src/lib/audioUtils.js#L35) | async |
| `restoreAudioFromStorage` | [50](../../src/lib/audioUtils.js#L50) | sync |

## src/lib/clipboard.js

[src/lib/clipboard.js](../../src/lib/clipboard.js) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `copyToClipboard` | [5](../../src/lib/clipboard.js#L5) | async |
| `copyToClipboardWithToast` | [37](../../src/lib/clipboard.js#L37) | async |

## src/lib/confetti.js

[src/lib/confetti.js](../../src/lib/confetti.js) · [legacy-and-assets guide](legacy-and-assets.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `celebrate` | [12](../../src/lib/confetti.js#L12) | sync |
| `celebrateFirstDialogue` | [24](../../src/lib/confetti.js#L24) | sync |
| `randomInRange` | [29](../../src/lib/confetti.js#L29) | sync |
| `anonymous function (CallExpression)` | [33](../../src/lib/confetti.js#L33) | sync |
| `celebrateSuccess` | [58](../../src/lib/confetti.js#L58) | sync |
| `celebrateMilestone` | [79](../../src/lib/confetti.js#L79) | sync |
| `fire` | [85](../../src/lib/confetti.js#L85) | sync |
| `celebrateFireworks` | [124](../../src/lib/confetti.js#L124) | sync |
| `randomInRange` | [129](../../src/lib/confetti.js#L129) | sync |
| `anonymous function (CallExpression)` | [133](../../src/lib/confetti.js#L133) | sync |
| `celebrateSmallWin` | [154](../../src/lib/confetti.js#L154) | sync |

## src/lib/dateUtils.js

[src/lib/dateUtils.js](../../src/lib/dateUtils.js) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `formatDistanceToNow` | [10](../../src/lib/dateUtils.js#L10) | sync |
| `formatDate` | [53](../../src/lib/dateUtils.js#L53) | sync |
| `formatFileSize` | [66](../../src/lib/dateUtils.js#L66) | sync |

## src/lib/db.js

[src/lib/db.js](../../src/lib/db.js) · [persistence guide](persistence.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `constructor` | [9](../../src/lib/db.js#L9) | sync |
| `anonymous arrow (CallExpression)` | [54](../../src/lib/db.js#L54) | async |
| `sanitizeProfileIdForDb` | [171](../../src/lib/db.js#L171) | sync |
| `getDatabaseNameForProfile` | [177](../../src/lib/db.js#L177) | sync |
| `resolveActiveProfileId` | [185](../../src/lib/db.js#L185) | sync |
| `ensureDbInstance` | [196](../../src/lib/db.js#L196) | sync |
| `get` | [215](../../src/lib/db.js#L215) | sync |
| `set` | [223](../../src/lib/db.js#L223) | sync |
| `getProfileScopedDbName` | [231](../../src/lib/db.js#L231) | sync |

## src/lib/deviceDetection.js

[src/lib/deviceDetection.js](../../src/lib/deviceDetection.js) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `normalizeDeviceType` | [10](../../src/lib/deviceDetection.js#L10) | sync |
| `setDeviceOverride` | [22](../../src/lib/deviceDetection.js#L22) | sync |
| `getDeviceType` | [31](../../src/lib/deviceDetection.js#L31) | sync |
| `anonymous arrow (CallExpression)` | [36](../../src/lib/deviceDetection.js#L36) | sync |
| `anonymous arrow (CallExpression)` | [44](../../src/lib/deviceDetection.js#L44) | sync |
| `isMobileDevice` | [114](../../src/lib/deviceDetection.js#L114) | sync |
| `isTabletDevice` | [115](../../src/lib/deviceDetection.js#L115) | sync |
| `isDesktopDevice` | [116](../../src/lib/deviceDetection.js#L116) | sync |
| `isMobileOrTablet` | [117](../../src/lib/deviceDetection.js#L117) | sync |
| `isTouchDevice` | [118](../../src/lib/deviceDetection.js#L118) | sync |
| `isAppleDevice` | [123](../../src/lib/deviceDetection.js#L123) | sync |
| `startDeviceOverrideListener` | [135](../../src/lib/deviceDetection.js#L135) | sync |
| `anonymous arrow (ReturnStatement)` | [136](../../src/lib/deviceDetection.js#L136) | sync |
| `anonymous arrow (ReturnStatement)` | [137](../../src/lib/deviceDetection.js#L137) | sync |
| `anonymous arrow (CallExpression)` | [142](../../src/lib/deviceDetection.js#L142) | sync |
| `handler` | [147](../../src/lib/deviceDetection.js#L147) | sync |
| `anonymous arrow (ReturnStatement)` | [162](../../src/lib/deviceDetection.js#L162) | sync |

## src/lib/dialogueImportAudio.js

[src/lib/dialogueImportAudio.js](../../src/lib/dialogueImportAudio.js) · [media guide](media.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getScopedRowAudioFilePaths` | [1](../../src/lib/dialogueImportAudio.js#L1) | sync |
| `anonymous arrow (CallExpression)` | [3](../../src/lib/dialogueImportAudio.js#L3) | sync |
| `anonymous arrow (CallExpression)` | [10](../../src/lib/dialogueImportAudio.js#L10) | sync |
| `anonymous arrow (CallExpression)` | [12](../../src/lib/dialogueImportAudio.js#L12) | sync |
| `resolveRowAudioImportSelection` | [15](../../src/lib/dialogueImportAudio.js#L15) | sync |

## src/lib/dialogueImportAudio.test.js

[src/lib/dialogueImportAudio.test.js](../../src/lib/dialogueImportAudio.test.js) · [media guide](media.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `createMockRowFolder` | [7](../../src/lib/dialogueImportAudio.test.js#L7) | sync |
| `filter` | [10](../../src/lib/dialogueImportAudio.test.js#L10) | sync |
| `anonymous arrow (CallExpression)` | [12](../../src/lib/dialogueImportAudio.test.js#L12) | sync |
| `anonymous arrow (CallExpression)` | [13](../../src/lib/dialogueImportAudio.test.js#L13) | sync |
| `anonymous arrow (CallExpression)` | [19](../../src/lib/dialogueImportAudio.test.js#L19) | sync |
| `anonymous arrow (CallExpression)` | [23](../../src/lib/dialogueImportAudio.test.js#L23) | sync |
| `anonymous arrow (CallExpression)` | [24](../../src/lib/dialogueImportAudio.test.js#L24) | sync |
| `anonymous arrow (CallExpression)` | [37](../../src/lib/dialogueImportAudio.test.js#L37) | sync |
| `anonymous arrow (CallExpression)` | [55](../../src/lib/dialogueImportAudio.test.js#L55) | sync |

## src/lib/dialoguePreviewEngine.js

[src/lib/dialoguePreviewEngine.js](../../src/lib/dialoguePreviewEngine.js) · [dialogue-preview guide](dialogue-preview.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getPreviewNodesAndEdges` | [6](../../src/lib/dialoguePreviewEngine.js#L6) | sync |
| `anonymous arrow (CallExpression)` | [8](../../src/lib/dialoguePreviewEngine.js#L8) | sync |
| `anonymous arrow (CallExpression)` | [11](../../src/lib/dialoguePreviewEngine.js#L11) | sync |
| `validatePreviewGraph` | [17](../../src/lib/dialoguePreviewEngine.js#L17) | sync |
| `anonymous arrow (CallExpression)` | [19](../../src/lib/dialoguePreviewEngine.js#L19) | sync |
| `anonymous arrow (CallExpression)` | [39](../../src/lib/dialoguePreviewEngine.js#L39) | sync |
| `anonymous arrow (CallExpression)` | [53](../../src/lib/dialoguePreviewEngine.js#L53) | sync |
| `buildOutgoingMap` | [73](../../src/lib/dialoguePreviewEngine.js#L73) | sync |
| `anonymous arrow (CallExpression)` | [75](../../src/lib/dialoguePreviewEngine.js#L75) | sync |
| `getReachablePreviewNodeIds` | [83](../../src/lib/dialoguePreviewEngine.js#L83) | sync |
| `anonymous arrow (CallExpression)` | [85](../../src/lib/dialoguePreviewEngine.js#L85) | sync |
| `anonymous arrow (CallExpression)` | [98](../../src/lib/dialoguePreviewEngine.js#L98) | sync |
| `getDialogueRowsForPreview` | [106](../../src/lib/dialoguePreviewEngine.js#L106) | sync |
| `getSpeakerForPreview` | [119](../../src/lib/dialoguePreviewEngine.js#L119) | sync |
| `isTerminalPreviewNode` | [143](../../src/lib/dialoguePreviewEngine.js#L143) | sync |
| `createPreviewNodeRefKey` | [145](../../src/lib/dialoguePreviewEngine.js#L145) | sync |
| `parsePreviewNodeRefKey` | [152](../../src/lib/dialoguePreviewEngine.js#L152) | sync |
| `stableStringifyObject` | [167](../../src/lib/dialoguePreviewEngine.js#L167) | sync |
| `anonymous arrow (CallExpression)` | [171](../../src/lib/dialoguePreviewEngine.js#L171) | sync |
| `getPreviewConditionRuleKey` | [178](../../src/lib/dialoguePreviewEngine.js#L178) | sync |
| `collectPreviewScenarioRules` | [184](../../src/lib/dialoguePreviewEngine.js#L184) | sync |
| `anonymous arrow (CallExpression)` | [188](../../src/lib/dialoguePreviewEngine.js#L188) | sync |
| `anonymous arrow (CallExpression)` | [192](../../src/lib/dialoguePreviewEngine.js#L192) | sync |
| `evaluatePreviewEdgeConditions` | [208](../../src/lib/dialoguePreviewEngine.js#L208) | sync |
| `anonymous arrow (CallExpression)` | [214](../../src/lib/dialoguePreviewEngine.js#L214) | sync |
| `resolvePreviewAudioSource` | [227](../../src/lib/dialoguePreviewEngine.js#L227) | sync |

## src/lib/electronRuntime.js

[src/lib/electronRuntime.js](../../src/lib/electronRuntime.js) · [electron-steam guide](electron-steam.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `isElectronRuntime` | [3](../../src/lib/electronRuntime.js#L3) | sync |
| `isDesktopElectronRuntime` | [8](../../src/lib/electronRuntime.js#L8) | sync |
| `hasSteamBridge` | [12](../../src/lib/electronRuntime.js#L12) | sync |

## src/lib/export/exportFile.js

[src/lib/export/exportFile.js](../../src/lib/export/exportFile.js) · [import-export guide](import-export.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getElectronApi` | [3](../../src/lib/export/exportFile.js#L3) | sync |
| `bytesToBase64` | [8](../../src/lib/export/exportFile.js#L8) | sync |
| `saveExportBlob` | [18](../../src/lib/export/exportFile.js#L18) | async |
| `openContainingFolder` | [52](../../src/lib/export/exportFile.js#L52) | async |

## src/lib/keyboardShortcuts.js

[src/lib/keyboardShortcuts.js](../../src/lib/keyboardShortcuts.js) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getPrimaryModifierKey` | [3](../../src/lib/keyboardShortcuts.js#L3) | sync |
| `formatShortcut` | [5](../../src/lib/keyboardShortcuts.js#L5) | sync |
| `formatShortcutKeys` | [14](../../src/lib/keyboardShortcuts.js#L14) | sync |
| `anonymous arrow (CallExpression)` | [17](../../src/lib/keyboardShortcuts.js#L17) | sync |

## src/lib/localization/appLanguages.js

[src/lib/localization/appLanguages.js](../../src/lib/localization/appLanguages.js) · [localization guide](localization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [3](../../src/lib/localization/appLanguages.js#L3) | sync |
| `getAppLanguageLabel` | [7](../../src/lib/localization/appLanguages.js#L7) | sync |
| `anonymous arrow (CallExpression)` | [11](../../src/lib/localization/appLanguages.js#L11) | sync |
| `anonymous arrow (CallExpression)` | [17](../../src/lib/localization/appLanguages.js#L17) | sync |

## src/lib/localization/localeCatalog.js

[src/lib/localization/localeCatalog.js](../../src/lib/localization/localeCatalog.js) · [localization guide](localization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [37](../../src/lib/localization/localeCatalog.js#L37) | sync |
| `getLocalizationLocaleLabel` | [40](../../src/lib/localization/localeCatalog.js#L40) | sync |

## src/lib/localization/stringTable.js

[src/lib/localization/stringTable.js](../../src/lib/localization/stringTable.js) · [localization guide](localization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [20](../../src/lib/localization/stringTable.js#L20) | sync |
| `toStringSafe` | [28](../../src/lib/localization/stringTable.js#L28) | sync |
| `shortHash` | [33](../../src/lib/localization/stringTable.js#L33) | sync |
| `ensureUniqueToken` | [42](../../src/lib/localization/stringTable.js#L42) | sync |
| `reserve` | [54](../../src/lib/localization/stringTable.js#L54) | sync |
| `slugifyForKeySegment` | [79](../../src/lib/localization/stringTable.js#L79) | sync |
| `isValidLocaleTag` | [100](../../src/lib/localization/stringTable.js#L100) | sync |
| `normalizeLocaleTag` | [111](../../src/lib/localization/stringTable.js#L111) | sync |
| `normalizeProjectLocalizationConfig` | [121](../../src/lib/localization/stringTable.js#L121) | sync |
| `isProjectLocalizationEnabled` | [147](../../src/lib/localization/stringTable.js#L147) | sync |
| `ensureDialogueLocalizationSlug` | [151](../../src/lib/localization/stringTable.js#L151) | sync |
| `ensureNodeLocalizationToken` | [157](../../src/lib/localization/stringTable.js#L157) | sync |
| `ensureRowLocalizationToken` | [167](../../src/lib/localization/stringTable.js#L167) | sync |
| `buildReadableLocalizedStringKey` | [174](../../src/lib/localization/stringTable.js#L174) | sync |
| `buildLocalizedStringKey` | [197](../../src/lib/localization/stringTable.js#L197) | sync |
| `parseLocalizedStringKey` | [225](../../src/lib/localization/stringTable.js#L225) | sync |
| `normalizeLocalizedValues` | [266](../../src/lib/localization/stringTable.js#L266) | sync |
| `normalizeLocalizedStringEntry` | [277](../../src/lib/localization/stringTable.js#L277) | sync |
| `resolveLocalizedValueInternal` | [325](../../src/lib/localization/stringTable.js#L325) | sync |
| `buildLegacyOrReadableKey` | [344](../../src/lib/localization/stringTable.js#L344) | sync |
| `resolveReusableLocalizedKey` | [365](../../src/lib/localization/stringTable.js#L365) | sync |
| `prepareLocalizedNodesAndEntries` | [413](../../src/lib/localization/stringTable.js#L413) | sync |
| `anonymous arrow (CallExpression)` | [430](../../src/lib/localization/stringTable.js#L430) | sync |
| `anonymous arrow (CallExpression)` | [431](../../src/lib/localization/stringTable.js#L431) | sync |
| `anonymous arrow (CallExpression)` | [432](../../src/lib/localization/stringTable.js#L432) | sync |
| `upsertFieldEntry` | [458](../../src/lib/localization/stringTable.js#L458) | sync |
| `anonymous arrow (CallExpression)` | [549](../../src/lib/localization/stringTable.js#L549) | sync |
| `materializeLocalizedNodes` | [643](../../src/lib/localization/stringTable.js#L643) | sync |
| `anonymous arrow (CallExpression)` | [653](../../src/lib/localization/stringTable.js#L653) | sync |
| `anonymous arrow (CallExpression)` | [654](../../src/lib/localization/stringTable.js#L654) | sync |
| `anonymous arrow (CallExpression)` | [655](../../src/lib/localization/stringTable.js#L655) | sync |
| `anonymous arrow (CallExpression)` | [661](../../src/lib/localization/stringTable.js#L661) | sync |
| `anonymous arrow (CallExpression)` | [719](../../src/lib/localization/stringTable.js#L719) | sync |
| `buildLocalizedEntriesFromNodes` | [752](../../src/lib/localization/stringTable.js#L752) | sync |
| `validateLocalizedEntriesForDialogue` | [770](../../src/lib/localization/stringTable.js#L770) | sync |
| `anonymous arrow (CallExpression)` | [778](../../src/lib/localization/stringTable.js#L778) | sync |
| `anonymous arrow (CallExpression)` | [779](../../src/lib/localization/stringTable.js#L779) | sync |
| `anonymous arrow (CallExpression)` | [780](../../src/lib/localization/stringTable.js#L780) | sync |
| `buildStringTableV2Payload` | [826](../../src/lib/localization/stringTable.js#L826) | sync |
| `parseImportedStringTableData` | [860](../../src/lib/localization/stringTable.js#L860) | sync |
| `remapLocalizedEntriesForImportedDialogue` | [881](../../src/lib/localization/stringTable.js#L881) | sync |
| `filterLocalizedEntriesByDialogue` | [964](../../src/lib/localization/stringTable.js#L964) | sync |
| `anonymous arrow (CallExpression)` | [968](../../src/lib/localization/stringTable.js#L968) | sync |

## src/lib/monitoring/sentry.js

[src/lib/monitoring/sentry.js](../../src/lib/monitoring/sentry.js) · [onboarding-observability guide](onboarding-observability.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `parseSampleRate` | [5](../../src/lib/monitoring/sentry.js#L5) | sync |
| `initRendererSentry` | [10](../../src/lib/monitoring/sentry.js#L10) | sync |
| `isRendererSentryEnabled` | [30](../../src/lib/monitoring/sentry.js#L30) | sync |

## src/lib/onboarding/templateLoader.js

[src/lib/onboarding/templateLoader.js](../../src/lib/onboarding/templateLoader.js) · [onboarding-observability guide](onboarding-observability.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `constructor` | [14](../../src/lib/onboarding/templateLoader.js#L14) | sync |
| `toTemplateFile` | [22](../../src/lib/onboarding/templateLoader.js#L22) | sync |
| `fetchBlob` | [28](../../src/lib/onboarding/templateLoader.js#L28) | async |
| `tryBuildGithubRawUrl` | [36](../../src/lib/onboarding/templateLoader.js#L36) | sync |
| `buildRemoteTemplateCandidates` | [71](../../src/lib/onboarding/templateLoader.js#L71) | sync |
| `resolveOnboardingExampleTemplateFile` | [84](../../src/lib/onboarding/templateLoader.js#L84) | async |

## src/lib/participantThumbnails.js

[src/lib/participantThumbnails.js](../../src/lib/participantThumbnails.js) · [media guide](media.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `sanitizeImageIdSegment` | [11](../../src/lib/participantThumbnails.js#L11) | sync |
| `base64ToBlob` | [15](../../src/lib/participantThumbnails.js#L15) | sync |
| `blobToDataUrl` | [37](../../src/lib/participantThumbnails.js#L37) | sync |
| `anonymous arrow (NewExpression)` | [38](../../src/lib/participantThumbnails.js#L38) | sync |
| `onload` | [40](../../src/lib/participantThumbnails.js#L40) | sync |
| `onerror` | [41](../../src/lib/participantThumbnails.js#L41) | sync |
| `loadImageFromBlob` | [46](../../src/lib/participantThumbnails.js#L46) | sync |
| `anonymous arrow (NewExpression)` | [48](../../src/lib/participantThumbnails.js#L48) | sync |
| `onload` | [50](../../src/lib/participantThumbnails.js#L50) | sync |
| `onerror` | [54](../../src/lib/participantThumbnails.js#L54) | sync |
| `renderSquarePngBlob` | [62](../../src/lib/participantThumbnails.js#L62) | sync |
| `anonymous arrow (NewExpression)` | [81](../../src/lib/participantThumbnails.js#L81) | sync |
| `anonymous arrow (CallExpression)` | [83](../../src/lib/participantThumbnails.js#L83) | sync |
| `normalizeImageBlobToStoredThumbnail` | [96](../../src/lib/participantThumbnails.js#L96) | async |
| `buildParticipantImageId` | [136](../../src/lib/participantThumbnails.js#L136) | sync |
| `resolveParticipantThumbnailDataUrl` | [142](../../src/lib/participantThumbnails.js#L142) | sync |
| `storedParticipantThumbnailToBlob` | [149](../../src/lib/participantThumbnails.js#L149) | sync |
| `blobToStoredParticipantThumbnail` | [155](../../src/lib/participantThumbnails.js#L155) | async |
| `processParticipantThumbnailFile` | [165](../../src/lib/participantThumbnails.js#L165) | async |

## src/lib/profile/activeProfile.js

[src/lib/profile/activeProfile.js](../../src/lib/profile/activeProfile.js) · [persistence guide](persistence.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `sanitizeProfileId` | [4](../../src/lib/profile/activeProfile.js#L4) | sync |
| `canUseStorage` | [10](../../src/lib/profile/activeProfile.js#L10) | sync |
| `getActiveProfileId` | [14](../../src/lib/profile/activeProfile.js#L14) | sync |
| `setActiveProfileId` | [20](../../src/lib/profile/activeProfile.js#L20) | sync |
| `resolveProfileIdFromSteamStatus` | [27](../../src/lib/profile/activeProfile.js#L27) | sync |
| `initializeActiveProfileFromSteamStatus` | [36](../../src/lib/profile/activeProfile.js#L36) | sync |
| `buildProfileScopedKey` | [41](../../src/lib/profile/activeProfile.js#L41) | sync |
| `readProfileScopedItem` | [45](../../src/lib/profile/activeProfile.js#L45) | sync |
| `writeProfileScopedItem` | [59](../../src/lib/profile/activeProfile.js#L59) | sync |

## src/lib/runtimeConfig.js

[src/lib/runtimeConfig.js](../../src/lib/runtimeConfig.js) · [architecture guide](architecture.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `readFlag` | [1](../../src/lib/runtimeConfig.js#L1) | sync |
| `getDistributionChannel` | [9](../../src/lib/runtimeConfig.js#L9) | sync |
| `isSteamChannel` | [14](../../src/lib/runtimeConfig.js#L14) | sync |
| `isGoogleSyncEnabled` | [18](../../src/lib/runtimeConfig.js#L18) | sync |
| `getOnboardingExampleProjectRemoteUrl` | [26](../../src/lib/runtimeConfig.js#L26) | sync |
| `getOnboardingExampleBundledPath` | [30](../../src/lib/runtimeConfig.js#L30) | sync |

## src/lib/steam/steamClient.js

[src/lib/steam/steamClient.js](../../src/lib/steam/steamClient.js) · [electron-steam guide](electron-steam.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getElectronApi` | [1](../../src/lib/steam/steamClient.js#L1) | sync |
| `getSteamStatus` | [6](../../src/lib/steam/steamClient.js#L6) | async |
| `openSteamOverlay` | [57](../../src/lib/steam/steamClient.js#L57) | async |
| `setSteamRichPresence` | [71](../../src/lib/steam/steamClient.js#L71) | async |
| `unlockSteamAchievement` | [87](../../src/lib/steam/steamClient.js#L87) | async |

## src/lib/storageUtils.js

[src/lib/storageUtils.js](../../src/lib/storageUtils.js) · [persistence guide](persistence.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `calculateDiskUsage` | [7](../../src/lib/storageUtils.js#L7) | async |
| `estimateDataSize` | [26](../../src/lib/storageUtils.js#L26) | async |
| `calculateProjectSize` | [70](../../src/lib/storageUtils.js#L70) | async |
| `anonymous arrow (CallExpression)` | [74](../../src/lib/storageUtils.js#L74) | sync |
| `calculateDialogueSize` | [113](../../src/lib/storageUtils.js#L113) | async |
| `getStorageQuota` | [131](../../src/lib/storageUtils.js#L131) | async |

## src/lib/sync/core/constants.js

[src/lib/sync/core/constants.js](../../src/lib/sync/core/constants.js) · [synchronization guide](synchronization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `wait` | [29](../../src/lib/sync/core/constants.js#L29) | sync |
| `anonymous arrow (NewExpression)` | [30](../../src/lib/sync/core/constants.js#L30) | sync |

## src/lib/sync/core/providerCatalog.js

[src/lib/sync/core/providerCatalog.js](../../src/lib/sync/core/providerCatalog.js) · [synchronization guide](synchronization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `toIsoOrFallback` | [9](../../src/lib/sync/core/providerCatalog.js#L9) | sync |
| `toRevision` | [16](../../src/lib/sync/core/providerCatalog.js#L16) | sync |
| `normalizeProjectObject` | [22](../../src/lib/sync/core/providerCatalog.js#L22) | sync |
| `normalizeDialogueObject` | [34](../../src/lib/sync/core/providerCatalog.js#L34) | sync |
| `normalizeTombstone` | [45](../../src/lib/sync/core/providerCatalog.js#L45) | sync |
| `createDefaultProviderCatalog` | [62](../../src/lib/sync/core/providerCatalog.js#L62) | sync |
| `normalizeProviderCatalog` | [75](../../src/lib/sync/core/providerCatalog.js#L75) | sync |
| `anonymous arrow (CallExpression)` | [84](../../src/lib/sync/core/providerCatalog.js#L84) | sync |
| `anonymous arrow (CallExpression)` | [89](../../src/lib/sync/core/providerCatalog.js#L89) | sync |
| `anonymous arrow (CallExpression)` | [93](../../src/lib/sync/core/providerCatalog.js#L93) | sync |
| `stripCatalogTransientFields` | [108](../../src/lib/sync/core/providerCatalog.js#L108) | sync |
| `readProviderCatalog` | [112](../../src/lib/sync/core/providerCatalog.js#L112) | async |
| `writeProviderCatalog` | [153](../../src/lib/sync/core/providerCatalog.js#L153) | async |
| `compareByUpdatedAtThenRevision` | [208](../../src/lib/sync/core/providerCatalog.js#L208) | sync |
| `compareByDeletedAtThenExpiry` | [224](../../src/lib/sync/core/providerCatalog.js#L224) | sync |
| `mergeProviderCatalogs` | [240](../../src/lib/sync/core/providerCatalog.js#L240) | sync |
| `anonymous arrow (CallExpression)` | [292](../../src/lib/sync/core/providerCatalog.js#L292) | sync |
| `anonymous arrow (CallExpression)` | [299](../../src/lib/sync/core/providerCatalog.js#L299) | sync |
| `anonymous arrow (CallExpression)` | [300](../../src/lib/sync/core/providerCatalog.js#L300) | sync |
| `anonymous arrow (CallExpression)` | [305](../../src/lib/sync/core/providerCatalog.js#L305) | sync |
| `anonymous arrow (CallExpression)` | [306](../../src/lib/sync/core/providerCatalog.js#L306) | sync |

## src/lib/sync/core/providerGateway.js

[src/lib/sync/core/providerGateway.js](../../src/lib/sync/core/providerGateway.js) · [cloud-providers guide](cloud-providers.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getSyncContext` | [7](../../src/lib/sync/core/providerGateway.js#L7) | sync |

## src/lib/sync/core/remoteCatalog.js

[src/lib/sync/core/remoteCatalog.js](../../src/lib/sync/core/remoteCatalog.js) · [synchronization guide](synchronization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `buildFileName` | [13](../../src/lib/sync/core/remoteCatalog.js#L13) | sync |
| `extractProjectId` | [17](../../src/lib/sync/core/remoteCatalog.js#L17) | sync |
| `anonymous arrow (CallExpression)` | [24](../../src/lib/sync/core/remoteCatalog.js#L24) | sync |
| `getRevisionFromFile` | [29](../../src/lib/sync/core/remoteCatalog.js#L29) | sync |
| `checkRemoteDiff` | [35](../../src/lib/sync/core/remoteCatalog.js#L35) | async |
| `anonymous arrow (CallExpression)` | [44](../../src/lib/sync/core/remoteCatalog.js#L44) | sync |
| `anonymous arrow (CallExpression)` | [46](../../src/lib/sync/core/remoteCatalog.js#L46) | sync |
| `findRemoteProjectById` | [64](../../src/lib/sync/core/remoteCatalog.js#L64) | async |
| `anonymous arrow (CallExpression)` | [70](../../src/lib/sync/core/remoteCatalog.js#L70) | sync |
| `anonymous arrow (CallExpression)` | [73](../../src/lib/sync/core/remoteCatalog.js#L73) | sync |
| `listRemoteProjects` | [84](../../src/lib/sync/core/remoteCatalog.js#L84) | async |
| `anonymous arrow (CallExpression)` | [88](../../src/lib/sync/core/remoteCatalog.js#L88) | sync |
| `anonymous arrow (CallExpression)` | [94](../../src/lib/sync/core/remoteCatalog.js#L94) | sync |
| `listRemoteProjectsWithSteamRetry` | [97](../../src/lib/sync/core/remoteCatalog.js#L97) | async |

## src/lib/sync/core/syncActions.js

[src/lib/sync/core/syncActions.js](../../src/lib/sync/core/syncActions.js) · [synchronization guide](synchronization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `parseEncryptedPayloadJson` | [38](../../src/lib/sync/core/syncActions.js#L38) | sync |
| `summarizeSnapshot` | [62](../../src/lib/sync/core/syncActions.js#L62) | sync |
| `anonymous arrow (CallExpression)` | [78](../../src/lib/sync/core/syncActions.js#L78) | sync |
| `toRevision` | [82](../../src/lib/sync/core/syncActions.js#L82) | sync |
| `toTimeMs` | [88](../../src/lib/sync/core/syncActions.js#L88) | sync |
| `resolvePassphraseForProvider` | [93](../../src/lib/sync/core/syncActions.js#L93) | sync |
| `normalizeProviders` | [101](../../src/lib/sync/core/syncActions.js#L101) | sync |
| `markProjectSyncTimestamp` | [112](../../src/lib/sync/core/syncActions.js#L112) | async |
| `anonymous arrow (CallExpression)` | [120](../../src/lib/sync/core/syncActions.js#L120) | sync |
| `deleteLocalDialogueRecords` | [127](../../src/lib/sync/core/syncActions.js#L127) | async |
| `anonymous arrow (CallExpression)` | [131](../../src/lib/sync/core/syncActions.js#L131) | async |
| `deleteLocalProjectRecords` | [143](../../src/lib/sync/core/syncActions.js#L143) | async |
| `anonymous arrow (CallExpression)` | [162](../../src/lib/sync/core/syncActions.js#L162) | async |
| `anonymous arrow (CallExpression)` | [166](../../src/lib/sync/core/syncActions.js#L166) | sync |
| `buildTombstonePayload` | [191](../../src/lib/sync/core/syncActions.js#L191) | sync |
| `upsertCatalogTombstone` | [215](../../src/lib/sync/core/syncActions.js#L215) | sync |
| `anonymous arrow (CallExpression)` | [218](../../src/lib/sync/core/syncActions.js#L218) | sync |
| `setProjectInCatalog` | [229](../../src/lib/sync/core/syncActions.js#L229) | sync |
| `anonymous arrow (CallExpression)` | [232](../../src/lib/sync/core/syncActions.js#L232) | sync |
| `anonymous arrow (CallExpression)` | [236](../../src/lib/sync/core/syncActions.js#L236) | sync |
| `refreshCatalogState` | [250](../../src/lib/sync/core/syncActions.js#L250) | async |
| `previewPullFromFile` | [259](../../src/lib/sync/core/syncActions.js#L259) | async |
| `previewPushProject` | [272](../../src/lib/sync/core/syncActions.js#L272) | async |
| `pullProjectFromFile` | [280](../../src/lib/sync/core/syncActions.js#L280) | async |
| `pullProject` | [296](../../src/lib/sync/core/syncActions.js#L296) | async |
| `pullProjectAsNew` | [321](../../src/lib/sync/core/syncActions.js#L321) | async |
| `pushProject` | [336](../../src/lib/sync/core/syncActions.js#L336) | async |
| `anonymous arrow (CallExpression)` | [344](../../src/lib/sync/core/syncActions.js#L344) | sync |
| `anonymous arrow (CallExpression)` | [363](../../src/lib/sync/core/syncActions.js#L363) | sync |
| `publishTombstone` | [437](../../src/lib/sync/core/syncActions.js#L437) | async |
| `anonymous arrow (CallExpression)` | [447](../../src/lib/sync/core/syncActions.js#L447) | sync |
| `anonymous arrow (CallExpression)` | [455](../../src/lib/sync/core/syncActions.js#L455) | sync |
| `anonymous arrow (CallExpression)` | [458](../../src/lib/sync/core/syncActions.js#L458) | sync |
| `anonymous arrow (CallExpression)` | [469](../../src/lib/sync/core/syncActions.js#L469) | sync |
| `applyMergedTombstones` | [511](../../src/lib/sync/core/syncActions.js#L511) | async |
| `gcExpiredTombstones` | [554](../../src/lib/sync/core/syncActions.js#L554) | async |
| `anonymous arrow (CallExpression)` | [558](../../src/lib/sync/core/syncActions.js#L558) | sync |
| `anonymous arrow (CallExpression)` | [561](../../src/lib/sync/core/syncActions.js#L561) | sync |
| `anonymous arrow (CallExpression)` | [570](../../src/lib/sync/core/syncActions.js#L570) | sync |
| `deleteRemoteProject` | [584](../../src/lib/sync/core/syncActions.js#L584) | async |
| `deleteLocalProject` | [601](../../src/lib/sync/core/syncActions.js#L601) | async |
| `syncAllProjects` | [606](../../src/lib/sync/core/syncActions.js#L606) | async |
| `anonymous arrow (CallExpression)` | [619](../../src/lib/sync/core/syncActions.js#L619) | async |
| `anonymous arrow (CallExpression)` | [627](../../src/lib/sync/core/syncActions.js#L627) | sync |
| `anonymous arrow (CallExpression)` | [640](../../src/lib/sync/core/syncActions.js#L640) | sync |
| `anonymous arrow (CallExpression)` | [647](../../src/lib/sync/core/syncActions.js#L647) | sync |
| `anonymous arrow (CallExpression)` | [649](../../src/lib/sync/core/syncActions.js#L649) | sync |
| `anonymous arrow (CallExpression)` | [651](../../src/lib/sync/core/syncActions.js#L651) | sync |
| `anonymous arrow (CallExpression)` | [697](../../src/lib/sync/core/syncActions.js#L697) | sync |

## src/lib/sync/core/syncPlanner.js

[src/lib/sync/core/syncPlanner.js](../../src/lib/sync/core/syncPlanner.js) · [synchronization guide](synchronization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `compareRemoteEntries` | [6](../../src/lib/sync/core/syncPlanner.js#L6) | sync |
| `dedupeRemoteProjects` | [18](../../src/lib/sync/core/syncPlanner.js#L18) | sync |
| `diffRemoteLocal` | [41](../../src/lib/sync/core/syncPlanner.js#L41) | async |
| `anonymous arrow (CallExpression)` | [47](../../src/lib/sync/core/syncPlanner.js#L47) | sync |
| `anonymous arrow (CallExpression)` | [53](../../src/lib/sync/core/syncPlanner.js#L53) | sync |
| `anonymous arrow (CallExpression)` | [58](../../src/lib/sync/core/syncPlanner.js#L58) | sync |
| `anonymous arrow (CallExpression)` | [63](../../src/lib/sync/core/syncPlanner.js#L63) | sync |
| `anonymous arrow (CallExpression)` | [68](../../src/lib/sync/core/syncPlanner.js#L68) | sync |
| `anonymous arrow (CallExpression)` | [85](../../src/lib/sync/core/syncPlanner.js#L85) | sync |
| `anonymous arrow (CallExpression)` | [88](../../src/lib/sync/core/syncPlanner.js#L88) | sync |

## src/lib/sync/crypto.js

[src/lib/sync/crypto.js](../../src/lib/sync/crypto.js) · [synchronization guide](synchronization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `toBase64Url` | [4](../../src/lib/sync/crypto.js#L4) | sync |
| `fromBase64Url` | [13](../../src/lib/sync/crypto.js#L13) | sync |
| `deriveKey` | [23](../../src/lib/sync/crypto.js#L23) | async |
| `encryptPayload` | [46](../../src/lib/sync/crypto.js#L46) | async |
| `decryptPayload` | [66](../../src/lib/sync/crypto.js#L66) | async |

## src/lib/sync/googleDriveAuth.js

[src/lib/sync/googleDriveAuth.js](../../src/lib/sync/googleDriveAuth.js) · [cloud-providers guide](cloud-providers.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getStoredClientId` | [10](../../src/lib/sync/googleDriveAuth.js#L10) | sync |
| `setStoredClientId` | [15](../../src/lib/sync/googleDriveAuth.js#L15) | sync |
| `getElectronApi` | [25](../../src/lib/sync/googleDriveAuth.js#L25) | sync |
| `resolveEnvClientId` | [31](../../src/lib/sync/googleDriveAuth.js#L31) | sync |
| `getConfiguredClientId` | [39](../../src/lib/sync/googleDriveAuth.js#L39) | sync |
| `getClientId` | [52](../../src/lib/sync/googleDriveAuth.js#L52) | sync |
| `getRedirectUri` | [60](../../src/lib/sync/googleDriveAuth.js#L60) | sync |
| `randomString` | [64](../../src/lib/sync/googleDriveAuth.js#L64) | sync |
| `anonymous arrow (CallExpression)` | [67](../../src/lib/sync/googleDriveAuth.js#L67) | sync |
| `storeAuthState` | [70](../../src/lib/sync/googleDriveAuth.js#L70) | sync |
| `clearAuthState` | [74](../../src/lib/sync/googleDriveAuth.js#L74) | sync |
| `openPopup` | [78](../../src/lib/sync/googleDriveAuth.js#L78) | sync |
| `waitForAuthResult` | [90](../../src/lib/sync/googleDriveAuth.js#L90) | sync |
| `anonymous arrow (NewExpression)` | [91](../../src/lib/sync/googleDriveAuth.js#L91) | sync |
| `handler` | [92](../../src/lib/sync/googleDriveAuth.js#L92) | sync |
| `startGoogleDriveAuth` | [108](../../src/lib/sync/googleDriveAuth.js#L108) | async |
| `exchangeCodeForToken` | [179](../../src/lib/sync/googleDriveAuth.js#L179) | async |
| `refreshAccessToken` | [209](../../src/lib/sync/googleDriveAuth.js#L209) | async |
| `fetchUserInfo` | [239](../../src/lib/sync/googleDriveAuth.js#L239) | async |
| `getGoogleClientId` | [253](../../src/lib/sync/googleDriveAuth.js#L253) | sync |

## src/lib/sync/googleDriveClient.js

[src/lib/sync/googleDriveClient.js](../../src/lib/sync/googleDriveClient.js) · [cloud-providers guide](cloud-providers.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getValidAccessToken` | [9](../../src/lib/sync/googleDriveClient.js#L9) | async |
| `buildDriveUrl` | [36](../../src/lib/sync/googleDriveClient.js#L36) | sync |
| `driveRequest` | [47](../../src/lib/sync/googleDriveClient.js#L47) | async |
| `anonymous arrow (CallExpression)` | [49](../../src/lib/sync/googleDriveClient.js#L49) | sync |
| `buildMultipartBody` | [68](../../src/lib/sync/googleDriveClient.js#L68) | sync |
| `buildFindFileQuery` | [85](../../src/lib/sync/googleDriveClient.js#L85) | sync |
| `buildListFilesQuery` | [96](../../src/lib/sync/googleDriveClient.js#L96) | sync |
| `appendScopeParams` | [113](../../src/lib/sync/googleDriveClient.js#L113) | sync |
| `appendFileAccessParams` | [123](../../src/lib/sync/googleDriveClient.js#L123) | sync |
| `findAppDataFile` | [129](../../src/lib/sync/googleDriveClient.js#L129) | async |
| `listAppDataFiles` | [145](../../src/lib/sync/googleDriveClient.js#L145) | async |
| `downloadAppDataFile` | [175](../../src/lib/sync/googleDriveClient.js#L175) | async |
| `createAppDataFile` | [184](../../src/lib/sync/googleDriveClient.js#L184) | async |
| `updateAppDataFile` | [210](../../src/lib/sync/googleDriveClient.js#L210) | async |
| `deleteAppDataFile` | [234](../../src/lib/sync/googleDriveClient.js#L234) | async |

## src/lib/sync/googleDriveConfig.js

[src/lib/sync/googleDriveConfig.js](../../src/lib/sync/googleDriveConfig.js) · [cloud-providers guide](cloud-providers.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `isElectronRuntime` | [5](../../src/lib/sync/googleDriveConfig.js#L5) | sync |
| `normalizeEnvValue` | [10](../../src/lib/sync/googleDriveConfig.js#L10) | sync |
| `getGoogleTeamFolderId` | [14](../../src/lib/sync/googleDriveConfig.js#L14) | sync |
| `getGoogleDriveSyncRoot` | [26](../../src/lib/sync/googleDriveConfig.js#L26) | sync |
| `isGoogleTeamSyncEnabled` | [41](../../src/lib/sync/googleDriveConfig.js#L41) | sync |
| `getGoogleDriveScopes` | [45](../../src/lib/sync/googleDriveConfig.js#L45) | sync |

## src/lib/sync/payloadBudget.js

[src/lib/sync/payloadBudget.js](../../src/lib/sync/payloadBudget.js) · [synchronization guide](synchronization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getUtf8ByteLength` | [6](../../src/lib/sync/payloadBudget.js#L6) | sync |
| `estimateEncryptedPayloadBytesForPlaintextBytes` | [10](../../src/lib/sync/payloadBudget.js#L10) | sync |
| `estimateEncryptedPayloadBytesFromData` | [17](../../src/lib/sync/payloadBudget.js#L17) | sync |
| `formatBytesToMib` | [22](../../src/lib/sync/payloadBudget.js#L22) | sync |
| `assertEstimatedSyncPayloadWithinBudget` | [26](../../src/lib/sync/payloadBudget.js#L26) | sync |

## src/lib/sync/providers/providerRegistry.js

[src/lib/sync/providers/providerRegistry.js](../../src/lib/sync/providers/providerRegistry.js) · [cloud-providers guide](cloud-providers.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `normalizeSyncProviderId` | [18](../../src/lib/sync/providers/providerRegistry.js#L18) | sync |
| `getSyncProviderConfig` | [25](../../src/lib/sync/providers/providerRegistry.js#L25) | sync |
| `supportsCloudSync` | [31](../../src/lib/sync/providers/providerRegistry.js#L31) | sync |

## src/lib/sync/providers/storageProviders.js

[src/lib/sync/providers/storageProviders.js](../../src/lib/sync/providers/storageProviders.js) · [cloud-providers guide](cloud-providers.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `createUnsupportedProviderError` | [23](../../src/lib/sync/providers/storageProviders.js#L23) | sync |
| `findFileByName` | [30](../../src/lib/sync/providers/storageProviders.js#L30) | async |
| `listFiles` | [31](../../src/lib/sync/providers/storageProviders.js#L31) | async |
| `downloadFile` | [32](../../src/lib/sync/providers/storageProviders.js#L32) | async |
| `createFile` | [33](../../src/lib/sync/providers/storageProviders.js#L33) | async |
| `updateFile` | [34](../../src/lib/sync/providers/storageProviders.js#L34) | async |
| `deleteFile` | [35](../../src/lib/sync/providers/storageProviders.js#L35) | async |
| `findFileByName` | [41](../../src/lib/sync/providers/storageProviders.js#L41) | async |
| `listFiles` | [42](../../src/lib/sync/providers/storageProviders.js#L42) | async |
| `downloadFile` | [43](../../src/lib/sync/providers/storageProviders.js#L43) | async |
| `createFile` | [44](../../src/lib/sync/providers/storageProviders.js#L44) | async |
| `updateFile` | [45](../../src/lib/sync/providers/storageProviders.js#L45) | async |
| `deleteFile` | [46](../../src/lib/sync/providers/storageProviders.js#L46) | async |
| `resolveSyncProviderId` | [54](../../src/lib/sync/providers/storageProviders.js#L54) | sync |
| `getSyncStorageProvider` | [58](../../src/lib/sync/providers/storageProviders.js#L58) | sync |
| `assertCloudSyncStorageProvider` | [63](../../src/lib/sync/providers/storageProviders.js#L63) | sync |

## src/lib/sync/snapshot.js

[src/lib/sync/snapshot.js](../../src/lib/sync/snapshot.js) · [synchronization guide](synchronization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `stripLocalOnlyProjectFields` | [5](../../src/lib/sync/snapshot.js#L5) | sync |
| `stripLocalOnlyDialogueFields` | [12](../../src/lib/sync/snapshot.js#L12) | sync |
| `dedupeBy` | [19](../../src/lib/sync/snapshot.js#L19) | sync |
| `buildProjectSnapshot` | [29](../../src/lib/sync/snapshot.js#L29) | async |
| `anonymous arrow (CallExpression)` | [45](../../src/lib/sync/snapshot.js#L45) | sync |
| `anonymous arrow (CallExpression)` | [56](../../src/lib/sync/snapshot.js#L56) | sync |
| `applyProjectSnapshot` | [67](../../src/lib/sync/snapshot.js#L67) | async |
| `anonymous arrow (CallExpression)` | [81](../../src/lib/sync/snapshot.js#L81) | sync |
| `anonymous arrow (CallExpression)` | [82](../../src/lib/sync/snapshot.js#L82) | sync |
| `anonymous arrow (CallExpression)` | [84](../../src/lib/sync/snapshot.js#L84) | sync |
| `anonymous arrow (CallExpression)` | [85](../../src/lib/sync/snapshot.js#L85) | sync |
| `anonymous arrow (CallExpression)` | [86](../../src/lib/sync/snapshot.js#L86) | sync |
| `anonymous arrow (CallExpression)` | [87](../../src/lib/sync/snapshot.js#L87) | sync |
| `anonymous arrow (CallExpression)` | [88](../../src/lib/sync/snapshot.js#L88) | sync |
| `anonymous arrow (CallExpression)` | [105](../../src/lib/sync/snapshot.js#L105) | sync |
| `anonymous arrow (CallExpression)` | [109](../../src/lib/sync/snapshot.js#L109) | sync |
| `anonymous arrow (CallExpression)` | [113](../../src/lib/sync/snapshot.js#L113) | sync |
| `anonymous arrow (CallExpression)` | [122](../../src/lib/sync/snapshot.js#L122) | sync |
| `anonymous arrow (CallExpression)` | [127](../../src/lib/sync/snapshot.js#L127) | sync |
| `anonymous arrow (CallExpression)` | [143](../../src/lib/sync/snapshot.js#L143) | async |
| `anonymous arrow (CallExpression)` | [150](../../src/lib/sync/snapshot.js#L150) | sync |
| `anonymous arrow (CallExpression)` | [161](../../src/lib/sync/snapshot.js#L161) | sync |
| `applyProjectSnapshotAsNew` | [190](../../src/lib/sync/snapshot.js#L190) | async |
| `anonymous arrow (CallExpression)` | [203](../../src/lib/sync/snapshot.js#L203) | sync |
| `anonymous arrow (CallExpression)` | [220](../../src/lib/sync/snapshot.js#L220) | sync |
| `anonymous arrow (CallExpression)` | [233](../../src/lib/sync/snapshot.js#L233) | sync |
| `anonymous arrow (CallExpression)` | [245](../../src/lib/sync/snapshot.js#L245) | sync |
| `anonymous arrow (CallExpression)` | [252](../../src/lib/sync/snapshot.js#L252) | sync |
| `anonymous arrow (CallExpression)` | [260](../../src/lib/sync/snapshot.js#L260) | sync |
| `anonymous arrow (CallExpression)` | [267](../../src/lib/sync/snapshot.js#L267) | sync |
| `anonymous arrow (CallExpression)` | [275](../../src/lib/sync/snapshot.js#L275) | sync |
| `anonymous arrow (CallExpression)` | [280](../../src/lib/sync/snapshot.js#L280) | sync |
| `anonymous arrow (CallExpression)` | [285](../../src/lib/sync/snapshot.js#L285) | sync |
| `anonymous arrow (CallExpression)` | [316](../../src/lib/sync/snapshot.js#L316) | async |

## src/lib/sync/steamCloudClient.js

[src/lib/sync/steamCloudClient.js](../../src/lib/sync/steamCloudClient.js) · [cloud-providers guide](cloud-providers.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getElectronApi` | [3](../../src/lib/sync/steamCloudClient.js#L3) | sync |
| `assertSteamSyncApi` | [9](../../src/lib/sync/steamCloudClient.js#L9) | sync |
| `sanitizeProfileId` | [32](../../src/lib/sync/steamCloudClient.js#L32) | sync |
| `buildSteamProfileId` | [38](../../src/lib/sync/steamCloudClient.js#L38) | sync |
| `resolveSteamSyncProfileId` | [44](../../src/lib/sync/steamCloudClient.js#L44) | async |
| `findSteamCloudFile` | [72](../../src/lib/sync/steamCloudClient.js#L72) | async |
| `listSteamCloudFiles` | [81](../../src/lib/sync/steamCloudClient.js#L81) | async |
| `downloadSteamCloudFile` | [90](../../src/lib/sync/steamCloudClient.js#L90) | async |
| `createSteamCloudFile` | [99](../../src/lib/sync/steamCloudClient.js#L99) | async |
| `updateSteamCloudFile` | [108](../../src/lib/sync/steamCloudClient.js#L108) | async |
| `deleteSteamCloudFile` | [117](../../src/lib/sync/steamCloudClient.js#L117) | async |

## src/lib/sync/syncEngine.js

[src/lib/sync/syncEngine.js](../../src/lib/sync/syncEngine.js) · [synchronization guide](synchronization.md)

No locally declared callable; configuration, exports, or side effects only.

## src/lib/sync/syncStorage.js

[src/lib/sync/syncStorage.js](../../src/lib/sync/syncStorage.js) · [synchronization guide](synchronization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getSyncAccount` | [5](../../src/lib/sync/syncStorage.js#L5) | async |
| `upsertSyncAccount` | [10](../../src/lib/sync/syncStorage.js#L10) | async |
| `clearSyncAccount` | [20](../../src/lib/sync/syncStorage.js#L20) | async |
| `getSyncProject` | [25](../../src/lib/sync/syncStorage.js#L25) | async |
| `upsertSyncProject` | [30](../../src/lib/sync/syncStorage.js#L30) | async |
| `clearSyncProject` | [41](../../src/lib/sync/syncStorage.js#L41) | async |
| `sanitizeProfileId` | [46](../../src/lib/sync/syncStorage.js#L46) | sync |
| `resolveProfileId` | [52](../../src/lib/sync/syncStorage.js#L52) | sync |
| `normalizeEntityType` | [57](../../src/lib/sync/syncStorage.js#L57) | sync |
| `normalizeIsoDate` | [65](../../src/lib/sync/syncStorage.js#L65) | sync |
| `isExpiredTombstone` | [72](../../src/lib/sync/syncStorage.js#L72) | sync |
| `getSyncCatalogState` | [77](../../src/lib/sync/syncStorage.js#L77) | async |
| `upsertSyncCatalogState` | [83](../../src/lib/sync/syncStorage.js#L83) | async |
| `listSyncCatalogStates` | [95](../../src/lib/sync/syncStorage.js#L95) | async |
| `getSyncTombstone` | [103](../../src/lib/sync/syncStorage.js#L103) | async |
| `upsertSyncTombstone` | [111](../../src/lib/sync/syncStorage.js#L111) | async |
| `acknowledgeSyncTombstone` | [142](../../src/lib/sync/syncStorage.js#L142) | async |
| `listSyncTombstones` | [162](../../src/lib/sync/syncStorage.js#L162) | async |
| `anonymous arrow (CallExpression)` | [182](../../src/lib/sync/syncStorage.js#L182) | sync |
| `clearSyncTombstone` | [192](../../src/lib/sync/syncStorage.js#L192) | async |
| `clearSyncTombstonesByEntity` | [200](../../src/lib/sync/syncStorage.js#L200) | async |
| `anonymous arrow (CallExpression)` | [210](../../src/lib/sync/syncStorage.js#L210) | sync |
| `hasActiveTombstone` | [214](../../src/lib/sync/syncStorage.js#L214) | async |
| `anonymous arrow (CallExpression)` | [220](../../src/lib/sync/syncStorage.js#L220) | sync |
| `anonymous arrow (CallExpression)` | [230](../../src/lib/sync/syncStorage.js#L230) | sync |
| `listPendingSyncTombstones` | [233](../../src/lib/sync/syncStorage.js#L233) | async |
| `getSyncDeletion` | [242](../../src/lib/sync/syncStorage.js#L242) | async |
| `upsertSyncDeletion` | [250](../../src/lib/sync/syncStorage.js#L250) | async |
| `listSyncDeletions` | [263](../../src/lib/sync/syncStorage.js#L263) | async |
| `anonymous arrow (CallExpression)` | [268](../../src/lib/sync/syncStorage.js#L268) | sync |
| `clearSyncDeletion` | [274](../../src/lib/sync/syncStorage.js#L274) | async |

## src/lib/utils.js

[src/lib/utils.js](../../src/lib/utils.js) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `cn` | [9](../../src/lib/utils.js#L9) | sync |

## src/main.jsx

[src/main.jsx](../../src/main.jsx) · [architecture guide](architecture.md)

No locally declared callable; configuration, exports, or side effects only.

## src/routes/__root.jsx

[src/routes/__root.jsx](../../src/routes/__root.jsx) · [architecture guide](architecture.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `RootComponent` | [59](../../src/routes/__root.jsx#L59) | sync |
| `anonymous arrow (CallExpression)` | [70](../../src/routes/__root.jsx#L70) | sync |
| `anonymous arrow (CallExpression)` | [71](../../src/routes/__root.jsx#L71) | sync |
| `anonymous arrow (CallExpression)` | [72](../../src/routes/__root.jsx#L72) | sync |
| `anonymous arrow (CallExpression)` | [73](../../src/routes/__root.jsx#L73) | sync |
| `anonymous arrow (CallExpression)` | [74](../../src/routes/__root.jsx#L74) | sync |
| `anonymous arrow (CallExpression)` | [75](../../src/routes/__root.jsx#L75) | sync |
| `anonymous arrow (CallExpression)` | [76](../../src/routes/__root.jsx#L76) | sync |
| `select` | [99](../../src/routes/__root.jsx#L99) | sync |
| `anonymous arrow (CallExpression)` | [101](../../src/routes/__root.jsx#L101) | sync |
| `anonymous arrow (CallExpression)` | [138](../../src/routes/__root.jsx#L138) | sync |
| `anonymous arrow (CallExpression)` | [144](../../src/routes/__root.jsx#L144) | sync |
| `anonymous arrow (CallExpression)` | [149](../../src/routes/__root.jsx#L149) | sync |
| `anonymous arrow (CallExpression)` | [162](../../src/routes/__root.jsx#L162) | sync |
| `anonymous arrow (CallExpression)` | [165](../../src/routes/__root.jsx#L165) | sync |
| `handleOverride` | [173](../../src/routes/__root.jsx#L173) | sync |
| `anonymous arrow (CallExpression)` | [174](../../src/routes/__root.jsx#L174) | sync |
| `anonymous arrow (ReturnStatement)` | [179](../../src/routes/__root.jsx#L179) | sync |
| `anonymous arrow (CallExpression)` | [185](../../src/routes/__root.jsx#L185) | sync |
| `initializeApp` | [186](../../src/routes/__root.jsx#L186) | async |
| `anonymous arrow (NewExpression)` | [199](../../src/routes/__root.jsx#L199) | sync |
| `anonymous arrow (CallExpression)` | [213](../../src/routes/__root.jsx#L213) | sync |
| `handleActivity` | [223](../../src/routes/__root.jsx#L223) | sync |
| `anonymous arrow (CallExpression)` | [228](../../src/routes/__root.jsx#L228) | sync |
| `anonymous arrow (CallExpression)` | [232](../../src/routes/__root.jsx#L232) | sync |
| `anonymous arrow (CallExpression)` | [233](../../src/routes/__root.jsx#L233) | sync |
| `anonymous arrow (ReturnStatement)` | [238](../../src/routes/__root.jsx#L238) | sync |
| `anonymous arrow (CallExpression)` | [240](../../src/routes/__root.jsx#L240) | sync |
| `anonymous arrow (CallExpression)` | [246](../../src/routes/__root.jsx#L246) | sync |
| `applyScrollbarVisibility` | [247](../../src/routes/__root.jsx#L247) | sync |
| `anonymous arrow (ReturnStatement)` | [258](../../src/routes/__root.jsx#L258) | sync |
| `anonymous arrow (CallExpression)` | [268](../../src/routes/__root.jsx#L268) | sync |
| `anonymous arrow (CallExpression)` | [289](../../src/routes/__root.jsx#L289) | sync |
| `anonymous arrow (CallExpression)` | [301](../../src/routes/__root.jsx#L301) | sync |
| `anonymous arrow (CallExpression)` | [327](../../src/routes/__root.jsx#L327) | sync |
| `anonymous arrow (CallExpression)` | [333](../../src/routes/__root.jsx#L333) | sync |
| `handleOnboardingComplete` | [334](../../src/routes/__root.jsx#L334) | sync |
| `anonymous arrow (CallExpression)` | [336](../../src/routes/__root.jsx#L336) | sync |
| `anonymous arrow (ReturnStatement)` | [341](../../src/routes/__root.jsx#L341) | sync |
| `anonymous arrow (CallExpression)` | [346](../../src/routes/__root.jsx#L346) | sync |
| `anonymous arrow (CallExpression)` | [352](../../src/routes/__root.jsx#L352) | sync |
| `anonymous arrow (CallExpression)` | [384](../../src/routes/__root.jsx#L384) | async |
| `emit` | [385](../../src/routes/__root.jsx#L385) | sync |
| `openLastExportPath` | [388](../../src/routes/__root.jsx#L388) | async |
| `anonymous arrow (CallExpression)` | [413](../../src/routes/__root.jsx#L413) | sync |
| `anonymous arrow (CallExpression)` | [473](../../src/routes/__root.jsx#L473) | sync |
| `anonymous arrow (CallExpression)` | [664](../../src/routes/__root.jsx#L664) | sync |
| `anonymous arrow (CallExpression)` | [670](../../src/routes/__root.jsx#L670) | sync |
| `anonymous arrow (ReturnStatement)` | [674](../../src/routes/__root.jsx#L674) | sync |
| `anonymous arrow (CallExpression)` | [681](../../src/routes/__root.jsx#L681) | sync |
| `handleCommandMenuCommand` | [682](../../src/routes/__root.jsx#L682) | sync |
| `anonymous arrow (ReturnStatement)` | [689](../../src/routes/__root.jsx#L689) | sync |
| `anonymous arrow (CallExpression)` | [694](../../src/routes/__root.jsx#L694) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [721](../../src/routes/__root.jsx#L721) | sync |
| `PolicyQuickLinks` | [753](../../src/routes/__root.jsx#L753) | sync |
| `anonymous arrow (CallExpression)` | [757](../../src/routes/__root.jsx#L757) | sync |
| `select` | [759](../../src/routes/__root.jsx#L759) | sync |
| `anonymous arrow (CallExpression)` | [763](../../src/routes/__root.jsx#L763) | sync |
| `openTerms` | [764](../../src/routes/__root.jsx#L764) | sync |
| `openData` | [765](../../src/routes/__root.jsx#L765) | sync |
| `openSupport` | [766](../../src/routes/__root.jsx#L766) | sync |
| `anonymous arrow (ReturnStatement)` | [772](../../src/routes/__root.jsx#L772) | sync |
| `anonymous arrow (CallExpression)` | [779](../../src/routes/__root.jsx#L779) | sync |
| `anonymous arrow (CallExpression)` | [784](../../src/routes/__root.jsx#L784) | sync |
| `onSelect` | [791](../../src/routes/__root.jsx#L791) | sync |
| `onSelect` | [796](../../src/routes/__root.jsx#L796) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [823](../../src/routes/__root.jsx#L823) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [835](../../src/routes/__root.jsx#L835) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [863](../../src/routes/__root.jsx#L863) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [880](../../src/routes/__root.jsx#L880) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [912](../../src/routes/__root.jsx#L912) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [943](../../src/routes/__root.jsx#L943) | sync |

## src/routes/data-policy.jsx

[src/routes/data-policy.jsx](../../src/routes/data-policy.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `DataPolicyPage` | [8](../../src/routes/data-policy.jsx#L8) | sync |

## src/routes/index.jsx

[src/routes/index.jsx](../../src/routes/index.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `DashboardHeader` | [63](../../src/routes/index.jsx#L63) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [118](../../src/routes/index.jsx#L118) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [127](../../src/routes/index.jsx#L127) | sync |
| `MetricsCards` | [163](../../src/routes/index.jsx#L163) | sync |
| `anonymous arrow (CallExpression)` | [175](../../src/routes/index.jsx#L175) | sync |
| `updateViewportType` | [176](../../src/routes/index.jsx#L176) | sync |
| `anonymous arrow (ReturnStatement)` | [181](../../src/routes/index.jsx#L181) | sync |
| `anonymous arrow (CallExpression)` | [190](../../src/routes/index.jsx#L190) | sync |
| `anonymous arrow (CallExpression)` | [196](../../src/routes/index.jsx#L196) | sync |
| `handleSelect` | [199](../../src/routes/index.jsx#L199) | sync |
| `anonymous arrow (ReturnStatement)` | [207](../../src/routes/index.jsx#L207) | sync |
| `renderMetricCard` | [239](../../src/routes/index.jsx#L239) | sync |
| `anonymous arrow (CallExpression)` | [269](../../src/routes/index.jsx#L269) | sync |
| `anonymous arrow (CallExpression)` | [278](../../src/routes/index.jsx#L278) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [282](../../src/routes/index.jsx#L282) | sync |
| `anonymous arrow (CallExpression)` | [298](../../src/routes/index.jsx#L298) | sync |
| `ProjectCard` | [304](../../src/routes/index.jsx#L304) | sync |
| `anonymous arrow (CallExpression)` | [308](../../src/routes/index.jsx#L308) | sync |
| `handleExport` | [329](../../src/routes/index.jsx#L329) | async |
| `handleDelete` | [337](../../src/routes/index.jsx#L337) | async |
| `anonymous arrow (JSXExpressionContainer)` | [406](../../src/routes/index.jsx#L406) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [418](../../src/routes/index.jsx#L418) | sync |
| `MobileProjectsTable` | [432](../../src/routes/index.jsx#L432) | sync |
| `anonymous arrow (CallExpression)` | [466](../../src/routes/index.jsx#L466) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [470](../../src/routes/index.jsx#L470) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [471](../../src/routes/index.jsx#L471) | sync |
| `ProjectsDashboard` | [497](../../src/routes/index.jsx#L497) | sync |
| `anonymous arrow (CallExpression)` | [515](../../src/routes/index.jsx#L515) | sync |
| `anonymous arrow (CallExpression)` | [520](../../src/routes/index.jsx#L520) | sync |
| `handleDesktopNewProject` | [521](../../src/routes/index.jsx#L521) | sync |
| `handleFocusSearch` | [524](../../src/routes/index.jsx#L524) | sync |
| `handleShowTour` | [528](../../src/routes/index.jsx#L528) | sync |
| `anonymous arrow (ReturnStatement)` | [535](../../src/routes/index.jsx#L535) | sync |
| `anonymous arrow (CallExpression)` | [542](../../src/routes/index.jsx#L542) | sync |
| `anonymous arrow (CallExpression)` | [548](../../src/routes/index.jsx#L548) | sync |
| `loadDiskUsage` | [549](../../src/routes/index.jsx#L549) | async |
| `handleNewProject` | [556](../../src/routes/index.jsx#L556) | sync |
| `handleOpenProject` | [560](../../src/routes/index.jsx#L560) | sync |
| `handleCreateExampleProject` | [564](../../src/routes/index.jsx#L564) | async |
| `onClick` | [588](../../src/routes/index.jsx#L588) | sync |
| `handleImportFileChange` | [600](../../src/routes/index.jsx#L600) | async |
| `handleImport` | [617](../../src/routes/index.jsx#L617) | sync |
| `handleImportDrop` | [621](../../src/routes/index.jsx#L621) | async |
| `anonymous arrow (CallExpression)` | [624](../../src/routes/index.jsx#L624) | sync |
| `anonymous arrow (CallExpression)` | [641](../../src/routes/index.jsx#L641) | sync |
| `anonymous arrow (CallExpression)` | [644](../../src/routes/index.jsx#L644) | sync |
| `anonymous arrow (CallExpression)` | [645](../../src/routes/index.jsx#L645) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [694](../../src/routes/index.jsx#L694) | sync |
| `anonymous arrow (CallExpression)` | [795](../../src/routes/index.jsx#L795) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [817](../../src/routes/index.jsx#L817) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [818](../../src/routes/index.jsx#L818) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [819](../../src/routes/index.jsx#L819) | sync |

## src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx

[src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getInitialNodes` | [118](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L118) | sync |
| `noop` | [140](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L140) | sync |
| `useNodeContextMenu` | [147](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L147) | sync |
| `NodeContextMenuProvider` | [149](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L149) | sync |
| `withNodeContextMenu` | [157](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L157) | sync |
| `WrappedNode` | [158](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L158) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [177](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L177) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [182](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L182) | sync |
| `parseSize` | [241](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L241) | sync |
| `getNodeSize` | [250](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L250) | sync |
| `hasMeaningfulSavedViewport` | [265](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L265) | sync |
| `getLayoutedElements` | [281](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L281) | sync |
| `anonymous arrow (CallExpression)` | [283](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L283) | sync |
| `anonymous arrow (CallExpression)` | [287](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L287) | sync |
| `anonymous arrow (CallExpression)` | [292](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L292) | sync |
| `anonymous arrow (CallExpression)` | [298](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L298) | sync |
| `anonymous arrow (CallExpression)` | [315](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L315) | sync |
| `anonymous arrow (CallExpression)` | [323](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L323) | sync |
| `DialogueEditorPage` | [334](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L334) | sync |
| `anonymous arrow (CallExpression)` | [347](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L347) | sync |
| `anonymous arrow (CallExpression)` | [348](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L348) | sync |
| `anonymous arrow (CallExpression)` | [353](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L353) | sync |
| `anonymous arrow (CallExpression)` | [353](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L353) | sync |
| `anonymous arrow (CallExpression)` | [354](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L354) | sync |
| `anonymous arrow (CallExpression)` | [354](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L354) | sync |
| `anonymous arrow (CallExpression)` | [356](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L356) | sync |
| `anonymous arrow (CallExpression)` | [360](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L360) | sync |
| `anonymous arrow (CallExpression)` | [372](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L372) | sync |
| `anonymous arrow (CallExpression)` | [383](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L383) | sync |
| `anonymous arrow (CallExpression)` | [384](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L384) | sync |
| `anonymous arrow (CallExpression)` | [394](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L394) | sync |
| `anonymous arrow (CallExpression)` | [394](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L394) | sync |
| `anonymous arrow (CallExpression)` | [404](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L404) | sync |
| `anonymous arrow (CallExpression)` | [406](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L406) | sync |
| `anonymous arrow (CallExpression)` | [411](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L411) | sync |
| `anonymous arrow (CallExpression)` | [436](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L436) | sync |
| `updateDeviceType` | [437](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L437) | sync |
| `anonymous arrow (ReturnStatement)` | [442](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L442) | sync |
| `anonymous arrow (CallExpression)` | [445](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L445) | sync |
| `updateHeaderHeight` | [448](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L448) | sync |
| `anonymous arrow (ReturnStatement)` | [458](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L458) | sync |
| `anonymous arrow (CallExpression)` | [464](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L464) | sync |
| `updateBottomToolbarDensity` | [471](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L471) | sync |
| `anonymous arrow (ReturnStatement)` | [481](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L481) | sync |
| `anonymous arrow (CallExpression)` | [487](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L487) | sync |
| `anonymous arrow (ReturnStatement)` | [502](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L502) | sync |
| `anonymous arrow (CallExpression)` | [517](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L517) | sync |
| `anonymous arrow (CallExpression)` | [546](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L546) | sync |
| `loadGraph` | [547](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L547) | async |
| `anonymous arrow (CallExpression)` | [601](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L601) | sync |
| `anonymous arrow (CallExpression)` | [607](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L607) | sync |
| `anonymous arrow (CallExpression)` | [623](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L623) | sync |
| `anonymous arrow (CallExpression)` | [631](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L631) | sync |
| `anonymous arrow (CallExpression)` | [634](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L634) | sync |
| `anonymous arrow (CallExpression)` | [642](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L642) | sync |
| `anonymous arrow (ReturnStatement)` | [646](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L646) | sync |
| `anonymous arrow (CallExpression)` | [649](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L649) | sync |
| `anonymous arrow (CallExpression)` | [650](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L650) | sync |
| `anonymous arrow (ReturnStatement)` | [652](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L652) | sync |
| `anonymous arrow (CallExpression)` | [655](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L655) | sync |
| `anonymous arrow (CallExpression)` | [668](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L668) | sync |
| `anonymous arrow (ReturnStatement)` | [669](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L669) | sync |
| `anonymous arrow (CallExpression)` | [676](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L676) | sync |
| `anonymous arrow (CallExpression)` | [678](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L678) | sync |
| `anonymous arrow (CallExpression)` | [686](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L686) | sync |
| `anonymous arrow (CallExpression)` | [694](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L694) | sync |
| `anonymous arrow (CallExpression)` | [697](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L697) | sync |
| `anonymous arrow (CallExpression)` | [709](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L709) | sync |
| `anonymous arrow (CallExpression)` | [713](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L713) | sync |
| `anonymous arrow (CallExpression)` | [717](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L717) | sync |
| `anonymous arrow (CallExpression)` | [718](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L718) | sync |
| `anonymous arrow (CallExpression)` | [740](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L740) | sync |
| `anonymous arrow (CallExpression)` | [745](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L745) | sync |
| `anonymous arrow (ReturnStatement)` | [748](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L748) | sync |
| `anonymous arrow (CallExpression)` | [763](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L763) | sync |
| `anonymous arrow (CallExpression)` | [764](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L764) | sync |
| `anonymous arrow (CallExpression)` | [782](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L782) | sync |
| `anonymous arrow (CallExpression)` | [799](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L799) | sync |
| `handleBeforeUnload` | [800](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L800) | sync |
| `anonymous arrow (ReturnStatement)` | [809](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L809) | sync |
| `shouldBlockFn` | [813](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L813) | sync |
| `anonymous arrow (CallExpression)` | [818](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L818) | sync |
| `anonymous arrow (CallExpression)` | [833](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L833) | sync |
| `anonymous arrow (ReturnStatement)` | [834](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L834) | sync |
| `anonymous arrow (CallExpression)` | [839](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L839) | sync |
| `anonymous arrow (CallExpression)` | [843](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L843) | sync |
| `renderNodeField` | [845](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L845) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [869](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L869) | sync |
| `getCategoryPath` | [882](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L882) | sync |
| `anonymous arrow (CallExpression)` | [883](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L883) | sync |
| `anonymous arrow (CallExpression)` | [890](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L890) | sync |
| `anonymous arrow (CallExpression)` | [895](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L895) | sync |
| `anonymous arrow (CallExpression)` | [909](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L909) | sync |
| `anonymous arrow (CallExpression)` | [911](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L911) | sync |
| `anonymous arrow (CallExpression)` | [913](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L913) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [921](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L921) | sync |
| `anonymous arrow (CallExpression)` | [928](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L928) | sync |
| `anonymous arrow (CallExpression)` | [930](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L930) | sync |
| `anonymous arrow (CallExpression)` | [944](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L944) | sync |
| `anonymous arrow (CallExpression)` | [945](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L945) | sync |
| `anonymous arrow (CallExpression)` | [957](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L957) | sync |
| `anonymous arrow (CallExpression)` | [959](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L959) | sync |
| `anonymous arrow (CallExpression)` | [961](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L961) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [969](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L969) | sync |
| `anonymous arrow (CallExpression)` | [976](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L976) | sync |
| `anonymous arrow (CallExpression)` | [978](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L978) | sync |
| `anonymous arrow (CallExpression)` | [991](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L991) | sync |
| `anonymous arrow (CallExpression)` | [992](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L992) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [1000](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1000) | sync |
| `anonymous arrow (CallExpression)` | [1007](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1007) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [1022](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1022) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [1036](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1036) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [1039](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1039) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [1042](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1042) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [1071](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1071) | sync |
| `anonymous arrow (CallExpression)` | [1096](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1096) | sync |
| `anonymous arrow (CallExpression)` | [1097](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1097) | sync |
| `anonymous arrow (CallExpression)` | [1109](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1109) | sync |
| `anonymous arrow (CallExpression)` | [1110](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1110) | sync |
| `anonymous arrow (CallExpression)` | [1111](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1111) | sync |
| `anonymous arrow (CallExpression)` | [1131](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1131) | sync |
| `anonymous arrow (CallExpression)` | [1140](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1140) | sync |
| `anonymous arrow (CallExpression)` | [1146](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1146) | sync |
| `anonymous arrow (CallExpression)` | [1154](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1154) | sync |
| `anonymous arrow (CallExpression)` | [1170](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1170) | sync |
| `anonymous arrow (CallExpression)` | [1182](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1182) | sync |
| `anonymous arrow (CallExpression)` | [1193](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1193) | sync |
| `anonymous arrow (CallExpression)` | [1202](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1202) | sync |
| `anonymous arrow (CallExpression)` | [1207](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1207) | sync |
| `anonymous arrow (CallExpression)` | [1210](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1210) | sync |
| `anonymous arrow (CallExpression)` | [1213](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1213) | sync |
| `anonymous arrow (CallExpression)` | [1217](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1217) | sync |
| `anonymous arrow (CallExpression)` | [1220](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1220) | sync |
| `anonymous arrow (CallExpression)` | [1224](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1224) | sync |
| `anonymous arrow (CallExpression)` | [1226](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1226) | sync |
| `anonymous arrow (CallExpression)` | [1239](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1239) | sync |
| `anonymous arrow (CallExpression)` | [1242](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1242) | sync |
| `anonymous arrow (CallExpression)` | [1244](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1244) | sync |
| `anonymous arrow (CallExpression)` | [1245](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1245) | sync |
| `anonymous arrow (CallExpression)` | [1250](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1250) | sync |
| `anonymous arrow (CallExpression)` | [1254](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1254) | sync |
| `anonymous arrow (CallExpression)` | [1259](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1259) | sync |
| `anonymous arrow (CallExpression)` | [1269](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1269) | sync |
| `anonymous arrow (CallExpression)` | [1277](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1277) | sync |
| `anonymous arrow (CallExpression)` | [1280](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1280) | sync |
| `anonymous arrow (CallExpression)` | [1284](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1284) | sync |
| `anonymous arrow (CallExpression)` | [1286](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1286) | sync |
| `anonymous arrow (CallExpression)` | [1288](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1288) | sync |
| `anonymous arrow (CallExpression)` | [1290](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1290) | sync |
| `anonymous arrow (CallExpression)` | [1292](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1292) | sync |
| `anonymous arrow (CallExpression)` | [1308](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1308) | sync |
| `anonymous arrow (CallExpression)` | [1311](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1311) | sync |
| `anonymous arrow (CallExpression)` | [1316](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1316) | sync |
| `anonymous arrow (CallExpression)` | [1317](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1317) | sync |
| `anonymous arrow (CallExpression)` | [1327](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1327) | sync |
| `anonymous arrow (CallExpression)` | [1335](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1335) | sync |
| `anonymous arrow (CallExpression)` | [1343](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1343) | sync |
| `anonymous arrow (CallExpression)` | [1346](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1346) | sync |
| `anonymous arrow (CallExpression)` | [1350](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1350) | sync |
| `anonymous arrow (CallExpression)` | [1352](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1352) | sync |
| `anonymous arrow (CallExpression)` | [1354](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1354) | sync |
| `anonymous arrow (CallExpression)` | [1356](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1356) | sync |
| `anonymous arrow (CallExpression)` | [1358](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1358) | sync |
| `anonymous arrow (CallExpression)` | [1374](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1374) | sync |
| `anonymous arrow (CallExpression)` | [1377](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1377) | sync |
| `anonymous arrow (CallExpression)` | [1384](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1384) | sync |
| `anonymous arrow (OptionalCallExpression)` | [1385](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1385) | sync |
| `anonymous arrow (CallExpression)` | [1410](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1410) | sync |
| `anonymous arrow (CallExpression)` | [1429](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1429) | sync |
| `onClick` | [1448](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1448) | sync |
| `anonymous arrow (CallExpression)` | [1461](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1461) | sync |
| `anonymous arrow (CallExpression)` | [1466](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1466) | sync |
| `anonymous arrow (CallExpression)` | [1472](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1472) | sync |
| `anonymous arrow (CallExpression)` | [1490](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1490) | sync |
| `anonymous arrow (CallExpression)` | [1501](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1501) | sync |
| `anonymous arrow (CallExpression)` | [1510](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1510) | sync |
| `anonymous arrow (CallExpression)` | [1569](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1569) | async |
| `anonymous arrow (CallExpression)` | [1575](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1575) | sync |
| `anonymous arrow (CallExpression)` | [1576](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1576) | sync |
| `anonymous arrow (CallExpression)` | [1594](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1594) | sync |
| `anonymous arrow (CallExpression)` | [1616](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1616) | sync |
| `anonymous arrow (CallExpression)` | [1618](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1618) | sync |
| `anonymous arrow (CallExpression)` | [1619](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1619) | sync |
| `anonymous arrow (CallExpression)` | [1621](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1621) | sync |
| `anonymous arrow (CallExpression)` | [1624](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1624) | sync |
| `anonymous arrow (CallExpression)` | [1645](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1645) | sync |
| `anonymous arrow (CallExpression)` | [1646](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1646) | sync |
| `anonymous arrow (CallExpression)` | [1647](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1647) | sync |
| `anonymous arrow (CallExpression)` | [1658](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1658) | sync |
| `anonymous arrow (CallExpression)` | [1683](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1683) | sync |
| `anonymous arrow (CallExpression)` | [1684](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1684) | sync |
| `anonymous arrow (CallExpression)` | [1685](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1685) | sync |
| `anonymous arrow (CallExpression)` | [1692](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1692) | sync |
| `anonymous arrow (CallExpression)` | [1708](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1708) | sync |
| `anonymous arrow (CallExpression)` | [1728](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1728) | sync |
| `anonymous arrow (CallExpression)` | [1751](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1751) | sync |
| `anonymous arrow (CallExpression)` | [1757](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1757) | sync |
| `anonymous arrow (CallExpression)` | [1763](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1763) | sync |
| `anonymous arrow (CallExpression)` | [1764](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1764) | sync |
| `reachableFrom` | [1770](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1770) | sync |
| `anonymous arrow (CallExpression)` | [1778](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1778) | sync |
| `anonymous arrow (CallExpression)` | [1779](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1779) | sync |
| `anonymous arrow (CallExpression)` | [1784](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1784) | sync |
| `anonymous arrow (CallExpression)` | [1802](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1802) | sync |
| `anonymous arrow (CallExpression)` | [1806](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1806) | sync |
| `anonymous arrow (CallExpression)` | [1806](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1806) | sync |
| `anonymous arrow (CallExpression)` | [1807](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1807) | sync |
| `anonymous arrow (CallExpression)` | [1808](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1808) | sync |
| `anonymous arrow (CallExpression)` | [1827](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1827) | sync |
| `anonymous arrow (CallExpression)` | [1856](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1856) | sync |
| `anonymous arrow (CallExpression)` | [1861](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1861) | sync |
| `anonymous arrow (CallExpression)` | [1893](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1893) | sync |
| `anonymous arrow (CallExpression)` | [1898](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1898) | sync |
| `anonymous arrow (CallExpression)` | [1947](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1947) | sync |
| `anonymous arrow (CallExpression)` | [1950](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1950) | sync |
| `anonymous arrow (CallExpression)` | [1951](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1951) | sync |
| `anonymous arrow (CallExpression)` | [1955](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1955) | sync |
| `anonymous arrow (CallExpression)` | [1963](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1963) | sync |
| `anonymous arrow (CallExpression)` | [1970](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L1970) | sync |
| `anonymous arrow (CallExpression)` | [2034](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2034) | sync |
| `anonymous arrow (CallExpression)` | [2035](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2035) | sync |
| `anonymous arrow (CallExpression)` | [2040](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2040) | sync |
| `anonymous arrow (CallExpression)` | [2052](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2052) | sync |
| `anonymous arrow (CallExpression)` | [2054](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2054) | sync |
| `anonymous arrow (CallExpression)` | [2059](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2059) | sync |
| `anonymous arrow (CallExpression)` | [2068](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2068) | sync |
| `anonymous arrow (CallExpression)` | [2073](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2073) | sync |
| `anonymous arrow (CallExpression)` | [2076](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2076) | sync |
| `anonymous arrow (CallExpression)` | [2132](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2132) | sync |
| `anonymous arrow (CallExpression)` | [2143](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2143) | sync |
| `anonymous arrow (CallExpression)` | [2154](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2154) | sync |
| `handleKeyDown` | [2155](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2155) | sync |
| `anonymous arrow (CallExpression)` | [2197](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2197) | sync |
| `anonymous arrow (CallExpression)` | [2198](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2198) | sync |
| `anonymous arrow (ReturnStatement)` | [2209](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2209) | sync |
| `anonymous arrow (CallExpression)` | [2226](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2226) | sync |
| `anonymous arrow (CallExpression)` | [2230](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2230) | sync |
| `anonymous arrow (CallExpression)` | [2233](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2233) | sync |
| `anonymous arrow (CallExpression)` | [2243](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2243) | sync |
| `anonymous arrow (CallExpression)` | [2244](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2244) | sync |
| `anonymous arrow (CallExpression)` | [2255](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2255) | sync |
| `anonymous arrow (CallExpression)` | [2256](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2256) | sync |
| `onDeleteEdge` | [2262](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2262) | sync |
| `anonymous arrow (CallExpression)` | [2275](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2275) | sync |
| `anonymous arrow (CallExpression)` | [2282](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2282) | sync |
| `anonymous arrow (CallExpression)` | [2301](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2301) | sync |
| `anonymous arrow (CallExpression)` | [2307](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2307) | async |
| `anonymous arrow (CallExpression)` | [2310](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2310) | sync |
| `anonymous arrow (CallExpression)` | [2311](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2311) | sync |
| `anonymous arrow (CallExpression)` | [2324](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2324) | async |
| `anonymous arrow (CallExpression)` | [2348](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2348) | sync |
| `anonymous arrow (CallExpression)` | [2384](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2384) | sync |
| `matchesDialogue` | [2385](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2385) | sync |
| `handleCommandSave` | [2390](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2390) | sync |
| `handleCommandExport` | [2395](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2395) | sync |
| `handleCommandOpenLastExport` | [2400](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2400) | sync |
| `handleCommandUndo` | [2405](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2405) | sync |
| `handleCommandRedo` | [2410](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2410) | sync |
| `handleCommandStartPreview` | [2415](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2415) | sync |
| `handleCommandRecenter` | [2420](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2420) | sync |
| `handleCommandFocusStart` | [2425](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2425) | sync |
| `handleCommandShowTour` | [2430](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2430) | sync |
| `handleCommandSetContentLocale` | [2434](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2434) | sync |
| `anonymous arrow (ReturnStatement)` | [2458](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2458) | sync |
| `anonymous arrow (CallExpression)` | [2491](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2491) | sync |
| `onContextMenuAction` | [2493](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2493) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2549](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2549) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2667](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2667) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2676](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2676) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2685](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2685) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2711](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2711) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2736](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2736) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2752](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2752) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2778](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2778) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2797](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2797) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2829](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2829) | sync |
| `anonymous arrow (OptionalCallExpression)` | [2843](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2843) | sync |
| `anonymous arrow (CallExpression)` | [2850](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2850) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2866](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2866) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2888](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2888) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2950](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2950) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2951](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2951) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2963](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2963) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2964](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2964) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2976](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2976) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2977](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2977) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2992](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2992) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [2993](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L2993) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [3005](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L3005) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [3006](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L3006) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [3018](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L3018) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [3019](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx#L3019) | sync |

## src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx

[src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx) · [graph-editor guide](graph-editor.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `DialogueSettingsPage` | [63](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L63) | sync |
| `anonymous arrow (CallExpression)` | [72](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L72) | sync |
| `anonymous arrow (CallExpression)` | [73](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L73) | sync |
| `anonymous arrow (CallExpression)` | [84](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L84) | sync |
| `anonymous arrow (CallExpression)` | [89](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L89) | sync |
| `anonymous arrow (CallExpression)` | [90](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L90) | sync |
| `anonymous arrow (CallExpression)` | [97](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L97) | sync |
| `anonymous arrow (CallExpression)` | [100](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L100) | sync |
| `anonymous arrow (CallExpression)` | [108](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L108) | sync |
| `anonymous arrow (CallExpression)` | [120](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L120) | sync |
| `handleSave` | [129](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L129) | async |
| `handleCancel` | [146](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L146) | sync |
| `handleExport` | [154](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L154) | async |
| `anonymous arrow (CallExpression)` | [162](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L162) | async |
| `handleDelete` | [184](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L184) | async |
| `anonymous arrow (CallExpression)` | [194](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L194) | sync |
| `handleCommandExport` | [195](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L195) | sync |
| `handleCommandSave` | [201](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L201) | sync |
| `handleCommandOpenLastExport` | [207](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L207) | sync |
| `anonymous arrow (ReturnStatement)` | [220](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L220) | sync |
| `anonymous arrow (CallExpression)` | [275](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L275) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [286](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L286) | sync |
| `anonymous arrow (CallExpression)` | [343](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L343) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [366](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L366) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [379](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L379) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [392](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L392) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [479](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L479) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [492](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L492) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [555](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L555) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [581](../../src/routes/projects/$projectId/dialogue/$dialogueId/settings.jsx#L581) | sync |

## src/routes/projects/$projectId/index.jsx

[src/routes/projects/$projectId/index.jsx](../../src/routes/projects/$projectId/index.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `ProjectDetailsPage` | [50](../../src/routes/projects/$projectId/index.jsx#L50) | sync |
| `anonymous arrow (CallExpression)` | [75](../../src/routes/projects/$projectId/index.jsx#L75) | async |
| `anonymous arrow (CallExpression)` | [88](../../src/routes/projects/$projectId/index.jsx#L88) | sync |
| `anonymous arrow (CallExpression)` | [92](../../src/routes/projects/$projectId/index.jsx#L92) | sync |
| `anonymous arrow (CallExpression)` | [97](../../src/routes/projects/$projectId/index.jsx#L97) | sync |
| `runSyncCheck` | [98](../../src/routes/projects/$projectId/index.jsx#L98) | async |
| `anonymous arrow (CallExpression)` | [112](../../src/routes/projects/$projectId/index.jsx#L112) | sync |
| `anonymous arrow (CallExpression)` | [113](../../src/routes/projects/$projectId/index.jsx#L113) | sync |
| `anonymous arrow (CallExpression)` | [114](../../src/routes/projects/$projectId/index.jsx#L114) | sync |
| `anonymous arrow (CallExpression)` | [115](../../src/routes/projects/$projectId/index.jsx#L115) | sync |
| `anonymous arrow (CallExpression)` | [116](../../src/routes/projects/$projectId/index.jsx#L116) | sync |
| `anonymous arrow (CallExpression)` | [117](../../src/routes/projects/$projectId/index.jsx#L117) | sync |
| `handleExport` | [119](../../src/routes/projects/$projectId/index.jsx#L119) | async |
| `anonymous arrow (CallExpression)` | [127](../../src/routes/projects/$projectId/index.jsx#L127) | async |
| `anonymous arrow (CallExpression)` | [150](../../src/routes/projects/$projectId/index.jsx#L150) | sync |
| `anonymous arrow (CallExpression)` | [155](../../src/routes/projects/$projectId/index.jsx#L155) | sync |
| `handleCommandExport` | [156](../../src/routes/projects/$projectId/index.jsx#L156) | sync |
| `handleCommandImport` | [162](../../src/routes/projects/$projectId/index.jsx#L162) | sync |
| `handleCommandOpenLastExport` | [170](../../src/routes/projects/$projectId/index.jsx#L170) | sync |
| `handleCommandNewDialogue` | [176](../../src/routes/projects/$projectId/index.jsx#L176) | sync |
| `anonymous arrow (ReturnStatement)` | [190](../../src/routes/projects/$projectId/index.jsx#L190) | sync |
| `anonymous arrow (CallExpression)` | [201](../../src/routes/projects/$projectId/index.jsx#L201) | sync |
| `handleKeyDown` | [204](../../src/routes/projects/$projectId/index.jsx#L204) | sync |
| `anonymous arrow (ReturnStatement)` | [235](../../src/routes/projects/$projectId/index.jsx#L235) | sync |
| `handleImport` | [238](../../src/routes/projects/$projectId/index.jsx#L238) | async |
| `handleDelete` | [257](../../src/routes/projects/$projectId/index.jsx#L257) | async |
| `handleDeleteRequest` | [262](../../src/routes/projects/$projectId/index.jsx#L262) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [294](../../src/routes/projects/$projectId/index.jsx#L294) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [323](../../src/routes/projects/$projectId/index.jsx#L323) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [347](../../src/routes/projects/$projectId/index.jsx#L347) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [368](../../src/routes/projects/$projectId/index.jsx#L368) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [376](../../src/routes/projects/$projectId/index.jsx#L376) | sync |
| `anonymous arrow (JSXExpressionContainer)` | [458](../../src/routes/projects/$projectId/index.jsx#L458) | sync |

## src/routes/terms-of-service.jsx

[src/routes/terms-of-service.jsx](../../src/routes/terms-of-service.jsx) · [ui-interaction guide](ui-interaction.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `TermsOfServicePage` | [8](../../src/routes/terms-of-service.jsx#L8) | sync |

## src/stores/categoryStore.js

[src/stores/categoryStore.js](../../src/stores/categoryStore.js) · [domain-model guide](domain-model.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [8](../../src/stores/categoryStore.js#L8) | sync |
| `isCategoryNameValid` | [14](../../src/stores/categoryStore.js#L14) | sync |
| `getRootCategoryId` | [21](../../src/stores/categoryStore.js#L21) | sync |
| `anonymous arrow (CallExpression)` | [27](../../src/stores/categoryStore.js#L27) | sync |
| `isNameUniqueInTree` | [35](../../src/stores/categoryStore.js#L35) | sync |
| `anonymous arrow (CallExpression)` | [44](../../src/stores/categoryStore.js#L44) | sync |
| `anonymous arrow (CallExpression)` | [50](../../src/stores/categoryStore.js#L50) | sync |
| `anonymous arrow (CallExpression)` | [51](../../src/stores/categoryStore.js#L51) | sync |
| `getCategoryDepth` | [57](../../src/stores/categoryStore.js#L57) | sync |
| `anonymous arrow (CallExpression)` | [67](../../src/stores/categoryStore.js#L67) | sync |
| `getMaxSubtreeDepth` | [76](../../src/stores/categoryStore.js#L76) | sync |
| `anonymous arrow (CallExpression)` | [78](../../src/stores/categoryStore.js#L78) | sync |
| `dfs` | [88](../../src/stores/categoryStore.js#L88) | sync |
| `anonymous arrow (CallExpression)` | [94](../../src/stores/categoryStore.js#L94) | sync |
| `loadCategories` | [104](../../src/stores/categoryStore.js#L104) | async |
| `createCategory` | [124](../../src/stores/categoryStore.js#L124) | async |
| `anonymous arrow (CallExpression)` | [155](../../src/stores/categoryStore.js#L155) | sync |
| `updateCategory` | [196](../../src/stores/categoryStore.js#L196) | async |
| `anonymous arrow (CallExpression)` | [242](../../src/stores/categoryStore.js#L242) | sync |
| `deleteCategory` | [276](../../src/stores/categoryStore.js#L276) | async |
| `importCategories` | [303](../../src/stores/categoryStore.js#L303) | async |
| `getRootNameSet` | [312](../../src/stores/categoryStore.js#L312) | sync |
| `anonymous arrow (CallExpression)` | [319](../../src/stores/categoryStore.js#L319) | sync |
| `anonymous arrow (CallExpression)` | [320](../../src/stores/categoryStore.js#L320) | sync |
| `anonymous arrow (CallExpression)` | [323](../../src/stores/categoryStore.js#L323) | sync |
| `anonymous arrow (CallExpression)` | [334](../../src/stores/categoryStore.js#L334) | sync |
| `buildCategoryPath` | [420](../../src/stores/categoryStore.js#L420) | sync |
| `anonymous arrow (CallExpression)` | [422](../../src/stores/categoryStore.js#L422) | sync |
| `anonymous arrow (CallExpression)` | [425](../../src/stores/categoryStore.js#L425) | sync |
| `exportCategories` | [431](../../src/stores/categoryStore.js#L431) | async |
| `anonymous arrow (CallExpression)` | [439](../../src/stores/categoryStore.js#L439) | sync |

## src/stores/commandPaletteStore.js

[src/stores/commandPaletteStore.js](../../src/stores/commandPaletteStore.js) · [legacy-and-assets guide](legacy-and-assets.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [7](../../src/stores/commandPaletteStore.js#L7) | sync |
| `openWithActions` | [12](../../src/stores/commandPaletteStore.js#L12) | sync |
| `setOpen` | [19](../../src/stores/commandPaletteStore.js#L19) | sync |
| `anonymous arrow (CallExpression)` | [20](../../src/stores/commandPaletteStore.js#L20) | sync |

## src/stores/conditionStore.js

[src/stores/conditionStore.js](../../src/stores/conditionStore.js) · [domain-model guide](domain-model.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [8](../../src/stores/conditionStore.js#L8) | sync |
| `loadConditions` | [12](../../src/stores/conditionStore.js#L12) | async |
| `createCondition` | [28](../../src/stores/conditionStore.js#L28) | async |
| `updateCondition` | [64](../../src/stores/conditionStore.js#L64) | async |
| `deleteCondition` | [97](../../src/stores/conditionStore.js#L97) | async |
| `importConditions` | [123](../../src/stores/conditionStore.js#L123) | async |
| `anonymous arrow (CallExpression)` | [126](../../src/stores/conditionStore.js#L126) | sync |
| `exportConditions` | [154](../../src/stores/conditionStore.js#L154) | async |
| `anonymous arrow (CallExpression)` | [157](../../src/stores/conditionStore.js#L157) | sync |

## src/stores/decoratorStore.js

[src/stores/decoratorStore.js](../../src/stores/decoratorStore.js) · [domain-model guide](domain-model.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [8](../../src/stores/decoratorStore.js#L8) | sync |
| `loadDecorators` | [13](../../src/stores/decoratorStore.js#L13) | async |
| `createDecorator` | [33](../../src/stores/decoratorStore.js#L33) | async |
| `updateDecorator` | [70](../../src/stores/decoratorStore.js#L70) | async |
| `deleteDecorator` | [104](../../src/stores/decoratorStore.js#L104) | async |
| `importDecorators` | [131](../../src/stores/decoratorStore.js#L131) | async |
| `anonymous arrow (CallExpression)` | [134](../../src/stores/decoratorStore.js#L134) | sync |
| `exportDecorators` | [163](../../src/stores/decoratorStore.js#L163) | async |
| `anonymous arrow (CallExpression)` | [171](../../src/stores/decoratorStore.js#L171) | sync |

## src/stores/dialogueStore.js

[src/stores/dialogueStore.js](../../src/stores/dialogueStore.js) · [domain-model guide](domain-model.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `normalizeDialogueRow` | [28](../../src/stores/dialogueStore.js#L28) | sync |
| `normalizeDialogueRows` | [36](../../src/stores/dialogueStore.js#L36) | sync |
| `anonymous arrow (CallExpression)` | [36](../../src/stores/dialogueStore.js#L36) | sync |
| `stripLocalizedTextFromNodeData` | [38](../../src/stores/dialogueStore.js#L38) | sync |
| `anonymous arrow (CallExpression)` | [47](../../src/stores/dialogueStore.js#L47) | sync |
| `getProjectLocalizationState` | [58](../../src/stores/dialogueStore.js#L58) | sync |
| `loadDialogueLocalizedEntries` | [66](../../src/stores/dialogueStore.js#L66) | async |
| `stripLocalizedTextFromRows` | [71](../../src/stores/dialogueStore.js#L71) | sync |
| `anonymous arrow (CallExpression)` | [72](../../src/stores/dialogueStore.js#L72) | sync |
| `buildPersistedNodesWithoutLocalizedText` | [79](../../src/stores/dialogueStore.js#L79) | sync |
| `anonymous arrow (CallExpression)` | [80](../../src/stores/dialogueStore.js#L80) | sync |
| `summarizeLocalizationValidationErrors` | [87](../../src/stores/dialogueStore.js#L87) | sync |
| `anonymous arrow (CallExpression)` | [91](../../src/stores/dialogueStore.js#L91) | sync |
| `ensureDialogueLocalizationMetadata` | [100](../../src/stores/dialogueStore.js#L100) | async |
| `anonymous arrow (CallExpression)` | [124](../../src/stores/dialogueStore.js#L124) | sync |
| `loadDialogues` | [135](../../src/stores/dialogueStore.js#L135) | async |
| `anonymous arrow (CallExpression)` | [144](../../src/stores/dialogueStore.js#L144) | async |
| `createDialogue` | [168](../../src/stores/dialogueStore.js#L168) | async |
| `updateDialogue` | [209](../../src/stores/dialogueStore.js#L209) | async |
| `deleteDialogue` | [239](../../src/stores/dialogueStore.js#L239) | async |
| `anonymous arrow (CallExpression)` | [249](../../src/stores/dialogueStore.js#L249) | sync |
| `anonymous arrow (CallExpression)` | [253](../../src/stores/dialogueStore.js#L253) | async |
| `setCurrentDialogue` | [284](../../src/stores/dialogueStore.js#L284) | async |
| `updateNodes` | [311](../../src/stores/dialogueStore.js#L311) | async |
| `updateEdges` | [326](../../src/stores/dialogueStore.js#L326) | async |
| `anonymous arrow (CallExpression)` | [329](../../src/stores/dialogueStore.js#L329) | async |
| `anonymous arrow (CallExpression)` | [332](../../src/stores/dialogueStore.js#L332) | sync |
| `saveDialogueGraph` | [351](../../src/stores/dialogueStore.js#L351) | async |
| `anonymous arrow (CallExpression)` | [379](../../src/stores/dialogueStore.js#L379) | sync |
| `anonymous arrow (CallExpression)` | [398](../../src/stores/dialogueStore.js#L398) | async |
| `anonymous arrow (CallExpression)` | [401](../../src/stores/dialogueStore.js#L401) | async |
| `anonymous arrow (CallExpression)` | [421](../../src/stores/dialogueStore.js#L421) | async |
| `anonymous arrow (CallExpression)` | [441](../../src/stores/dialogueStore.js#L441) | sync |
| `loadDialogueGraph` | [472](../../src/stores/dialogueStore.js#L472) | async |
| `anonymous arrow (CallExpression)` | [494](../../src/stores/dialogueStore.js#L494) | sync |
| `anonymous arrow (CallExpression)` | [496](../../src/stores/dialogueStore.js#L496) | sync |
| `anonymous arrow (CallExpression)` | [517](../../src/stores/dialogueStore.js#L517) | sync |
| `anonymous arrow (CallExpression)` | [529](../../src/stores/dialogueStore.js#L529) | sync |
| `anonymous arrow (CallExpression)` | [549](../../src/stores/dialogueStore.js#L549) | async |
| `loadDialogueGraphForPreview` | [603](../../src/stores/dialogueStore.js#L603) | async |
| `anonymous arrow (CallExpression)` | [625](../../src/stores/dialogueStore.js#L625) | sync |
| `anonymous arrow (CallExpression)` | [627](../../src/stores/dialogueStore.js#L627) | sync |
| `clearCurrentDialogue` | [668](../../src/stores/dialogueStore.js#L668) | sync |
| `exportDialogue` | [675](../../src/stores/dialogueStore.js#L675) | async |
| `anonymous arrow (CallExpression)` | [700](../../src/stores/dialogueStore.js#L700) | sync |
| `anonymous arrow (CallExpression)` | [701](../../src/stores/dialogueStore.js#L701) | sync |
| `onClick` | [720](../../src/stores/dialogueStore.js#L720) | sync |
| `exportDialogueAsBlob` | [739](../../src/stores/dialogueStore.js#L739) | async |
| `anonymous arrow (CallExpression)` | [760](../../src/stores/dialogueStore.js#L760) | sync |
| `anonymous arrow (CallExpression)` | [762](../../src/stores/dialogueStore.js#L762) | sync |
| `anonymous arrow (CallExpression)` | [810](../../src/stores/dialogueStore.js#L810) | async |
| `anonymous arrow (CallExpression)` | [850](../../src/stores/dialogueStore.js#L850) | sync |
| `anonymous arrow (CallExpression)` | [863](../../src/stores/dialogueStore.js#L863) | sync |
| `anonymous arrow (CallExpression)` | [871](../../src/stores/dialogueStore.js#L871) | sync |
| `anonymous arrow (CallExpression)` | [884](../../src/stores/dialogueStore.js#L884) | sync |
| `anonymous arrow (CallExpression)` | [894](../../src/stores/dialogueStore.js#L894) | sync |
| `anonymous arrow (CallExpression)` | [896](../../src/stores/dialogueStore.js#L896) | sync |
| `anonymous arrow (CallExpression)` | [918](../../src/stores/dialogueStore.js#L918) | sync |
| `anonymous arrow (CallExpression)` | [923](../../src/stores/dialogueStore.js#L923) | sync |
| `anonymous arrow (CallExpression)` | [924](../../src/stores/dialogueStore.js#L924) | sync |
| `anonymous arrow (CallExpression)` | [931](../../src/stores/dialogueStore.js#L931) | sync |
| `anonymous arrow (CallExpression)` | [946](../../src/stores/dialogueStore.js#L946) | sync |
| `anonymous arrow (CallExpression)` | [951](../../src/stores/dialogueStore.js#L951) | sync |
| `exportDefinition` | [962](../../src/stores/dialogueStore.js#L962) | sync |
| `anonymous arrow (CallExpression)` | [970](../../src/stores/dialogueStore.js#L970) | sync |
| `anonymous arrow (CallExpression)` | [977](../../src/stores/dialogueStore.js#L977) | sync |
| `anonymous arrow (CallExpression)` | [989](../../src/stores/dialogueStore.js#L989) | sync |
| `anonymous arrow (CallExpression)` | [993](../../src/stores/dialogueStore.js#L993) | sync |
| `anonymous arrow (CallExpression)` | [1030](../../src/stores/dialogueStore.js#L1030) | sync |
| `anonymous arrow (OptionalCallExpression)` | [1031](../../src/stores/dialogueStore.js#L1031) | sync |
| `anonymous arrow (CallExpression)` | [1034](../../src/stores/dialogueStore.js#L1034) | sync |
| `anonymous arrow (CallExpression)` | [1048](../../src/stores/dialogueStore.js#L1048) | sync |
| `importDialogue` | [1074](../../src/stores/dialogueStore.js#L1074) | async |
| `anonymous arrow (CallExpression)` | [1108](../../src/stores/dialogueStore.js#L1108) | sync |
| `anonymous arrow (CallExpression)` | [1123](../../src/stores/dialogueStore.js#L1123) | sync |
| `anonymous arrow (CallExpression)` | [1189](../../src/stores/dialogueStore.js#L1189) | sync |
| `anonymous arrow (CallExpression)` | [1191](../../src/stores/dialogueStore.js#L1191) | sync |
| `anonymous arrow (CallExpression)` | [1247](../../src/stores/dialogueStore.js#L1247) | sync |
| `anonymous arrow (CallExpression)` | [1253](../../src/stores/dialogueStore.js#L1253) | sync |
| `anonymous arrow (CallExpression)` | [1301](../../src/stores/dialogueStore.js#L1301) | sync |
| `anonymous arrow (CallExpression)` | [1302](../../src/stores/dialogueStore.js#L1302) | sync |
| `mapNodeReference` | [1331](../../src/stores/dialogueStore.js#L1331) | sync |
| `mapRowReference` | [1341](../../src/stores/dialogueStore.js#L1341) | sync |
| `anonymous arrow (CallExpression)` | [1380](../../src/stores/dialogueStore.js#L1380) | sync |
| `anonymous arrow (CallExpression)` | [1401](../../src/stores/dialogueStore.js#L1401) | sync |
| `anonymous arrow (CallExpression)` | [1481](../../src/stores/dialogueStore.js#L1481) | async |
| `anonymous arrow (CallExpression)` | [1512](../../src/stores/dialogueStore.js#L1512) | sync |
| `anonymous arrow (CallExpression)` | [1539](../../src/stores/dialogueStore.js#L1539) | sync |
| `anonymous arrow (CallExpression)` | [1542](../../src/stores/dialogueStore.js#L1542) | sync |

## src/stores/participantStore.js

[src/stores/participantStore.js](../../src/stores/participantStore.js) · [domain-model guide](domain-model.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getRootIdByCategoryName` | [18](../../src/stores/participantStore.js#L18) | sync |
| `anonymous arrow (CallExpression)` | [19](../../src/stores/participantStore.js#L19) | sync |
| `getImportedThumbnailById` | [24](../../src/stores/participantStore.js#L24) | sync |
| `normalizeStoredThumbnail` | [35](../../src/stores/participantStore.js#L35) | sync |
| `assertParticipantMutationSyncBudget` | [59](../../src/stores/participantStore.js#L59) | async |
| `anonymous arrow (CallExpression)` | [65](../../src/stores/participantStore.js#L65) | sync |
| `loadParticipants` | [71](../../src/stores/participantStore.js#L71) | async |
| `createParticipant` | [88](../../src/stores/participantStore.js#L88) | async |
| `anonymous arrow (CallExpression)` | [117](../../src/stores/participantStore.js#L117) | sync |
| `updateParticipant` | [170](../../src/stores/participantStore.js#L170) | async |
| `anonymous arrow (CallExpression)` | [205](../../src/stores/participantStore.js#L205) | sync |
| `anonymous arrow (CallExpression)` | [229](../../src/stores/participantStore.js#L229) | sync |
| `deleteParticipant` | [255](../../src/stores/participantStore.js#L255) | async |
| `importParticipantsFromFile` | [281](../../src/stores/participantStore.js#L281) | async |
| `importParticipants` | [325](../../src/stores/participantStore.js#L325) | async |
| `anonymous arrow (CallExpression)` | [331](../../src/stores/participantStore.js#L331) | sync |
| `anonymous arrow (CallExpression)` | [339](../../src/stores/participantStore.js#L339) | sync |
| `anonymous arrow (CallExpression)` | [351](../../src/stores/participantStore.js#L351) | sync |
| `getCategoryNameForImport` | [361](../../src/stores/participantStore.js#L361) | sync |
| `anonymous arrow (CallExpression)` | [375](../../src/stores/participantStore.js#L375) | sync |
| `anonymous arrow (CallExpression)` | [393](../../src/stores/participantStore.js#L393) | sync |
| `anonymous arrow (CallExpression)` | [402](../../src/stores/participantStore.js#L402) | sync |
| `exportParticipants` | [454](../../src/stores/participantStore.js#L454) | async |
| `anonymous arrow (CallExpression)` | [461](../../src/stores/participantStore.js#L461) | sync |
| `anonymous arrow (CallExpression)` | [467](../../src/stores/participantStore.js#L467) | sync |
| `exportParticipantsArchive` | [492](../../src/stores/participantStore.js#L492) | async |
| `anonymous arrow (CallExpression)` | [501](../../src/stores/participantStore.js#L501) | sync |

## src/stores/projectStore.js

[src/stores/projectStore.js](../../src/stores/projectStore.js) · [domain-model guide](domain-model.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `parseImportedJsonText` | [31](../../src/stores/projectStore.js#L31) | sync |
| `seedProjectLocalizationDefaultLocale` | [44](../../src/stores/projectStore.js#L44) | async |
| `isOnboardingExampleProject` | [77](../../src/stores/projectStore.js#L77) | sync |
| `anonymous arrow (CallExpression)` | [86](../../src/stores/projectStore.js#L86) | sync |
| `loadProjects` | [95](../../src/stores/projectStore.js#L95) | async |
| `anonymous arrow (CallExpression)` | [102](../../src/stores/projectStore.js#L102) | async |
| `createProject` | [130](../../src/stores/projectStore.js#L130) | async |
| `createOnboardingExampleProject` | [178](../../src/stores/projectStore.js#L178) | async |
| `onImported` | [192](../../src/stores/projectStore.js#L192) | sync |
| `updateProject` | [217](../../src/stores/projectStore.js#L217) | async |
| `updateProjectLocalization` | [266](../../src/stores/projectStore.js#L266) | async |
| `anonymous arrow (CallExpression)` | [277](../../src/stores/projectStore.js#L277) | sync |
| `deleteProject` | [312](../../src/stores/projectStore.js#L312) | async |
| `anonymous arrow (CallExpression)` | [318](../../src/stores/projectStore.js#L318) | sync |
| `anonymous arrow (CallExpression)` | [322](../../src/stores/projectStore.js#L322) | async |
| `anonymous arrow (CallExpression)` | [324](../../src/stores/projectStore.js#L324) | sync |
| `setCurrentProject` | [364](../../src/stores/projectStore.js#L364) | async |
| `clearCurrentProject` | [392](../../src/stores/projectStore.js#L392) | sync |
| `exportProject` | [399](../../src/stores/projectStore.js#L399) | async |
| `anonymous arrow (CallExpression)` | [435](../../src/stores/projectStore.js#L435) | sync |
| `anonymous arrow (CallExpression)` | [446](../../src/stores/projectStore.js#L446) | sync |
| `anonymous arrow (CallExpression)` | [463](../../src/stores/projectStore.js#L463) | sync |
| `anonymous arrow (CallExpression)` | [469](../../src/stores/projectStore.js#L469) | sync |
| `anonymous arrow (CallExpression)` | [485](../../src/stores/projectStore.js#L485) | sync |
| `anonymous arrow (CallExpression)` | [487](../../src/stores/projectStore.js#L487) | sync |
| `anonymous arrow (CallExpression)` | [495](../../src/stores/projectStore.js#L495) | sync |
| `anonymous arrow (CallExpression)` | [497](../../src/stores/projectStore.js#L497) | sync |
| `exportWithoutMeta` | [506](../../src/stores/projectStore.js#L506) | sync |
| `anonymous arrow (CallExpression)` | [514](../../src/stores/projectStore.js#L514) | sync |
| `anonymous arrow (CallExpression)` | [521](../../src/stores/projectStore.js#L521) | sync |
| `anonymous arrow (CallExpression)` | [538](../../src/stores/projectStore.js#L538) | sync |
| `anonymous arrow (CallExpression)` | [598](../../src/stores/projectStore.js#L598) | sync |
| `anonymous arrow (CallExpression)` | [599](../../src/stores/projectStore.js#L599) | sync |
| `onClick` | [618](../../src/stores/projectStore.js#L618) | sync |
| `importProject` | [636](../../src/stores/projectStore.js#L636) | async |
| `anonymous arrow (CallExpression)` | [653](../../src/stores/projectStore.js#L653) | sync |
| `anonymous arrow (CallExpression)` | [729](../../src/stores/projectStore.js#L729) | async |
| `anonymous arrow (CallExpression)` | [732](../../src/stores/projectStore.js#L732) | sync |
| `anonymous arrow (CallExpression)` | [870](../../src/stores/projectStore.js#L870) | sync |

## src/stores/settingsCommandStore.js

[src/stores/settingsCommandStore.js](../../src/stores/settingsCommandStore.js) · [legacy-and-assets guide](legacy-and-assets.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [7](../../src/stores/settingsCommandStore.js#L7) | sync |
| `openWithContext` | [13](../../src/stores/settingsCommandStore.js#L13) | sync |
| `setMode` | [21](../../src/stores/settingsCommandStore.js#L21) | sync |
| `setOpen` | [23](../../src/stores/settingsCommandStore.js#L23) | sync |
| `anonymous arrow (CallExpression)` | [24](../../src/stores/settingsCommandStore.js#L24) | sync |
| `close` | [30](../../src/stores/settingsCommandStore.js#L30) | sync |

## src/stores/steamStore.js

[src/stores/steamStore.js](../../src/stores/steamStore.js) · [electron-steam guide](electron-steam.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [30](../../src/stores/steamStore.js#L30) | sync |
| `loadStatus` | [35](../../src/stores/steamStore.js#L35) | async |
| `openOverlay` | [52](../../src/stores/steamStore.js#L52) | async |
| `setRichPresence` | [56](../../src/stores/steamStore.js#L56) | async |
| `unlockAchievement` | [64](../../src/stores/steamStore.js#L64) | async |
| `isSteamAvailable` | [68](../../src/stores/steamStore.js#L68) | sync |

## src/stores/syncStore.js

[src/stores/syncStore.js](../../src/stores/syncStore.js) · [synchronization guide](synchronization.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `delay` | [54](../../src/stores/syncStore.js#L54) | sync |
| `anonymous arrow (NewExpression)` | [54](../../src/stores/syncStore.js#L54) | sync |
| `getItem` | [61](../../src/stores/syncStore.js#L61) | sync |
| `setItem` | [62](../../src/stores/syncStore.js#L62) | sync |
| `removeItem` | [63](../../src/stores/syncStore.js#L63) | sync |
| `anonymous arrow (CallExpression)` | [66](../../src/stores/syncStore.js#L66) | sync |
| `getItem` | [72](../../src/stores/syncStore.js#L72) | sync |
| `setItem` | [76](../../src/stores/syncStore.js#L76) | sync |
| `removeItem` | [80](../../src/stores/syncStore.js#L80) | sync |
| `traceSyncEvent` | [87](../../src/stores/syncStore.js#L87) | sync |
| `normalizeProviderId` | [105](../../src/stores/syncStore.js#L105) | sync |
| `createProviderInput` | [109](../../src/stores/syncStore.js#L109) | sync |
| `createProviderInputs` | [118](../../src/stores/syncStore.js#L118) | sync |
| `withProviderInput` | [126](../../src/stores/syncStore.js#L126) | sync |
| `getProviderInputFromState` | [140](../../src/stores/syncStore.js#L140) | sync |
| `getProviderPassphraseFromState` | [147](../../src/stores/syncStore.js#L147) | sync |
| `resolveSyncPassphrase` | [152](../../src/stores/syncStore.js#L152) | sync |
| `createResetPullState` | [167](../../src/stores/syncStore.js#L167) | sync |
| `createPersistedProviderInputs` | [174](../../src/stores/syncStore.js#L174) | sync |
| `resolveCloudProviderId` | [187](../../src/stores/syncStore.js#L187) | sync |
| `canUseCloudSyncProvider` | [194](../../src/stores/syncStore.js#L194) | sync |
| `canRunSyncForStatus` | [198](../../src/stores/syncStore.js#L198) | sync |
| `anonymous arrow (CallExpression)` | [209](../../src/stores/syncStore.js#L209) | sync |
| `getProviderInput` | [222](../../src/stores/syncStore.js#L222) | sync |
| `getProviderPassphrase` | [225](../../src/stores/syncStore.js#L225) | sync |
| `setProviderInput` | [230](../../src/stores/syncStore.js#L230) | sync |
| `anonymous arrow (CallExpression)` | [231](../../src/stores/syncStore.js#L231) | sync |
| `setProviderPassphrase` | [235](../../src/stores/syncStore.js#L235) | sync |
| `setProviderAccountLabel` | [238](../../src/stores/syncStore.js#L238) | sync |
| `setProviderRememberPassphrase` | [241](../../src/stores/syncStore.js#L241) | sync |
| `setPassphrase` | [246](../../src/stores/syncStore.js#L246) | sync |
| `setAccountLabel` | [249](../../src/stores/syncStore.js#L249) | sync |
| `setRememberPassphrase` | [252](../../src/stores/syncStore.js#L252) | sync |
| `setClientId` | [256](../../src/stores/syncStore.js#L256) | sync |
| `clearError` | [260](../../src/stores/syncStore.js#L260) | sync |
| `setHasHydrated` | [261](../../src/stores/syncStore.js#L261) | sync |
| `setHideLoginPrompt` | [262](../../src/stores/syncStore.js#L262) | sync |
| `setLoginDialogOpen` | [263](../../src/stores/syncStore.js#L263) | sync |
| `setSyncMode` | [264](../../src/stores/syncStore.js#L264) | sync |
| `loadAccount` | [266](../../src/stores/syncStore.js#L266) | async |
| `anonymous arrow (CallExpression)` | [280](../../src/stores/syncStore.js#L280) | sync |
| `anonymous arrow (CallExpression)` | [299](../../src/stores/syncStore.js#L299) | sync |
| `anonymous arrow (CallExpression)` | [311](../../src/stores/syncStore.js#L311) | sync |
| `connectSteamProvider` | [325](../../src/stores/syncStore.js#L325) | async |
| `anonymous arrow (CallExpression)` | [335](../../src/stores/syncStore.js#L335) | sync |
| `anonymous arrow (CallExpression)` | [344](../../src/stores/syncStore.js#L344) | sync |
| `connectGoogleDrive` | [386](../../src/stores/syncStore.js#L386) | async |
| `anonymous arrow (CallExpression)` | [392](../../src/stores/syncStore.js#L392) | sync |
| `anonymous arrow (CallExpression)` | [428](../../src/stores/syncStore.js#L428) | sync |
| `anonymous arrow (CallExpression)` | [449](../../src/stores/syncStore.js#L449) | sync |
| `disconnect` | [463](../../src/stores/syncStore.js#L463) | async |
| `anonymous arrow (CallExpression)` | [468](../../src/stores/syncStore.js#L468) | sync |
| `processPendingTombstones` | [481](../../src/stores/syncStore.js#L481) | async |
| `scheduleProjectDeletion` | [538](../../src/stores/syncStore.js#L538) | async |
| `anonymous arrow (CallExpression)` | [544](../../src/stores/syncStore.js#L544) | sync |
| `anonymous arrow (CallExpression)` | [552](../../src/stores/syncStore.js#L552) | sync |
| `scheduleDialogueDeletion` | [604](../../src/stores/syncStore.js#L604) | async |
| `anonymous arrow (CallExpression)` | [611](../../src/stores/syncStore.js#L611) | sync |
| `anonymous arrow (CallExpression)` | [619](../../src/stores/syncStore.js#L619) | sync |
| `syncAllProjects` | [672](../../src/stores/syncStore.js#L672) | async |
| `anonymous arrow (CallExpression)` | [743](../../src/stores/syncStore.js#L743) | sync |
| `anonymous arrow (CallExpression)` | [811](../../src/stores/syncStore.js#L811) | sync |
| `anonymous arrow (CallExpression)` | [881](../../src/stores/syncStore.js#L881) | sync |
| `anonymous arrow (CallExpression)` | [902](../../src/stores/syncStore.js#L902) | sync |
| `onProgress` | [1045](../../src/stores/syncStore.js#L1045) | sync |
| `schedulePush` | [1119](../../src/stores/syncStore.js#L1119) | sync |
| `anonymous arrow (CallExpression)` | [1137](../../src/stores/syncStore.js#L1137) | sync |
| `checkRemoteDiff` | [1145](../../src/stores/syncStore.js#L1145) | async |
| `startPull` | [1166](../../src/stores/syncStore.js#L1166) | async |
| `onProgress` | [1228](../../src/stores/syncStore.js#L1228) | sync |
| `pushProject` | [1265](../../src/stores/syncStore.js#L1265) | async |
| `partialize` | [1292](../../src/stores/syncStore.js#L1292) | sync |
| `onRehydrateStorage` | [1299](../../src/stores/syncStore.js#L1299) | sync |
| `anonymous arrow (ArrowFunctionExpression)` | [1299](../../src/stores/syncStore.js#L1299) | sync |

## src/stores/uiStore.js

[src/stores/uiStore.js](../../src/stores/uiStore.js) · [persistence guide](persistence.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `getItem` | [6](../../src/stores/uiStore.js#L6) | sync |
| `setItem` | [7](../../src/stores/uiStore.js#L7) | sync |
| `removeItem` | [8](../../src/stores/uiStore.js#L8) | sync |
| `anonymous arrow (CallExpression)` | [11](../../src/stores/uiStore.js#L11) | sync |
| `getItem` | [17](../../src/stores/uiStore.js#L17) | sync |
| `setItem` | [21](../../src/stores/uiStore.js#L21) | sync |
| `removeItem` | [25](../../src/stores/uiStore.js#L25) | sync |
| `anonymous arrow (CallExpression)` | [38](../../src/stores/uiStore.js#L38) | sync |
| `toggleSidebar` | [48](../../src/stores/uiStore.js#L48) | sync |
| `anonymous arrow (CallExpression)` | [49](../../src/stores/uiStore.js#L49) | sync |
| `setSidebarOpen` | [54](../../src/stores/uiStore.js#L54) | sync |
| `setViewMode` | [59](../../src/stores/uiStore.js#L59) | sync |
| `setSortBy` | [64](../../src/stores/uiStore.js#L64) | sync |
| `setSortOrder` | [65](../../src/stores/uiStore.js#L65) | sync |
| `setProjectContentLocale` | [66](../../src/stores/uiStore.js#L66) | sync |
| `anonymous arrow (CallExpression)` | [67](../../src/stores/uiStore.js#L67) | sync |
| `clearProjectContentLocale` | [73](../../src/stores/uiStore.js#L73) | sync |
| `anonymous arrow (CallExpression)` | [74](../../src/stores/uiStore.js#L74) | sync |

## tailwind.config.js

[tailwind.config.js](../../tailwind.config.js) · [build-release-testing guide](build-release-testing.md)

No locally declared callable; configuration, exports, or side effects only.

## tests/e2e/evidence.spec.js

[tests/e2e/evidence.spec.js](../../tests/e2e/evidence.spec.js) · [build-release-testing guide](build-release-testing.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `ensureCleanEvidenceDirectory` | [16](../../tests/e2e/evidence.spec.js#L16) | sync |
| `shotPath` | [21](../../tests/e2e/evidence.spec.js#L21) | sync |
| `anonymous arrow (CallExpression)` | [25](../../tests/e2e/evidence.spec.js#L25) | sync |
| `anonymous arrow (CallExpression)` | [26](../../tests/e2e/evidence.spec.js#L26) | async |
| `anonymous arrow (CallExpression)` | [30](../../tests/e2e/evidence.spec.js#L30) | async |

## tests/e2e/helpers/appHarness.js

[tests/e2e/helpers/appHarness.js](../../tests/e2e/helpers/appHarness.js) · [build-release-testing guide](build-release-testing.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `uniqueToken` | [3](../../tests/e2e/helpers/appHarness.js#L3) | sync |
| `seedLocalState` | [9](../../tests/e2e/helpers/appHarness.js#L9) | async |
| `anonymous arrow (CallExpression)` | [10](../../tests/e2e/helpers/appHarness.js#L10) | sync |
| `openDashboard` | [27](../../tests/e2e/helpers/appHarness.js#L27) | async |
| `createProject` | [32](../../tests/e2e/helpers/appHarness.js#L32) | async |
| `openDialoguesSection` | [42](../../tests/e2e/helpers/appHarness.js#L42) | async |
| `createDialogue` | [47](../../tests/e2e/helpers/appHarness.js#L47) | async |
| `openDialogueSettings` | [57](../../tests/e2e/helpers/appHarness.js#L57) | async |

## tests/e2e/smoke.spec.js

[tests/e2e/smoke.spec.js](../../tests/e2e/smoke.spec.js) · [build-release-testing guide](build-release-testing.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `anonymous arrow (CallExpression)` | [12](../../tests/e2e/smoke.spec.js#L12) | sync |
| `anonymous arrow (CallExpression)` | [13](../../tests/e2e/smoke.spec.js#L13) | async |
| `anonymous arrow (CallExpression)` | [17](../../tests/e2e/smoke.spec.js#L17) | async |
| `anonymous arrow (CallExpression)` | [24](../../tests/e2e/smoke.spec.js#L24) | async |
| `anonymous arrow (CallExpression)` | [34](../../tests/e2e/smoke.spec.js#L34) | async |

## vite.config.js

[vite.config.js](../../vite.config.js) · [build-release-testing guide](build-release-testing.md)

| Callable / callback | Source line | Kind |
| --- | --- | --- |
| `manualChunks` | [23](../../vite.config.js#L23) | sync |
