# Routes, UI composition, and interaction

Sources: [routes](../../src/routes), [components](../../src/components), [UI store](../../src/stores/uiStore.js), [command palette](../../src/components/ui/command-palette.jsx), [device detection](../../src/lib/deviceDetection.js), [shortcut formatting](../../src/lib/keyboardShortcuts.js). Detailed graph behavior is in [graph editor](graph-editor.md).

## Route surface

TanStack Router uses hash history. URLs are therefore shaped like `/#/projects/<id>`; the host need not rewrite every application path. Vite generates the route tree from files.

| Route | Responsibilities |
| --- | --- |
| `/` | Dashboard, project list/search/sort, creation/import/deletion, onboarding |
| `/projects/$projectId` | Project header/sidebar, selected section, entity collections |
| `/projects/$projectId/dialogue/$dialogueId/` | React Flow canvas, editor panels, save/export, preview |
| `/projects/$projectId/dialogue/$dialogueId/settings` | Dialogue metadata/settings and save/export command handling |
| `/terms-of-service` | Translated static terms content |
| `/data-policy` | Translated static data-policy content |

The root route installs shared header/dialogs/toaster/loading state and native-menu handling around its outlet. Application settings use the command-oriented settings dialog; there is no standalone `/settings` route file. Project settings are a project section, while dialogue settings have the route shown above. Legal text is read from translations and should be reviewed when actual telemetry/storage behavior changes.

## Project workspace

The sidebar selects overview, dialogues, participants, categories, decorators, conditions, or project settings. This is UI section state rather than one independently addressable router page per entity collection. Overview derives counts/summary information from loaded project data. Collection sections combine filtering/sorting, grid/list cards, empty states, CRUD dialogs, and import/export actions.

Dialogs own form drafts, then call an entity store. The store remains responsible for durable validation; UI constraints alone are insufficient for archives, sync, or programmatic calls. Category parent pickers exclude the category itself but do not exclude every descendant, which allows the store's missing cycle check to be reached through normal editing. Definition dialogs edit property schemas, while graph panels edit instance values.

Project settings include authored metadata and localization settings. Dialogue settings and the graph's settings panel overlap in responsibility; route transitions and current-dialogue state must remain synchronized. Category/participant cards use names and paths for presentation; do not assume those display labels are globally unique identifiers.

## Component families

| Family | Implementation role |
| --- | --- |
| `components/ui` | Tailwind-styled controls, Radix-backed overlays/menus, layout primitives, notifications |
| `components/dialogs` | Category/participant/definition create/edit forms |
| `components/projects` | Project navigation and entity cards/sections |
| `components/dialogues` | Dialogue creation |
| `components/dialogue` | Node/edge property editors, rows/audio, preview, canvas controls and connection pickers |
| `components/sync` | Login, provider selection/pull progress, provider icons |

`NativeSelect` uses the browser's native grouped selection behavior. The alternate Radix `select.jsx` and `skeleton.jsx` currently have no discovered renderer import path. Dialog, alert-dialog, context/dropdown-menu, accordion, and tooltip wrappers preserve underlying component behavior and add project styling. Vaul provides drawers, Embla the carousel, and cmdk the command UI. `cn` combines class-name concatenation with Tailwind class merging.

Notifications use the toaster module's shared listener/state mechanism. Save indicator state belongs to the graph workflow and includes transient success/error display. Error toasts do not mean a transaction was rolled back; each store's write order determines that.

## Commands and event dispatch

The command palette derives available actions from current route/context. Native menus and palette actions converge through `command:menu-command`; the root translates the command into navigation or a route-specific custom event. Dashboard listens for `menu:new-project`, search focus, and tour commands. Project listeners handle export/import/new-dialogue/section actions. Dialogue listeners handle save/export/settings/undo/redo/preview/recenter/focus-Start/tour and locale-related actions. Legal/support events are handled globally.

Events are transient. A route that is not mounted cannot consume its event later. Listener closures must see current graph/selection/locale state and must be removed on effect cleanup. Command availability in the native menu, command palette, toolbar, and keyboard path should agree, but they are maintained across several files.

Shortcut labels substitute Command on Apple devices and Ctrl elsewhere. Actual key handlers are in the root/routes/palette, not in the formatting utility. Handlers should distinguish editable inputs from canvas intent; changing a displayed shortcut alone does not implement behavior. The unused `KeyboardShortcutsDialog` is not evidence that all of its listed commands are currently registered.

## Device adaptation

Device classification combines user agent, iPad touch detection, coarse-pointer/touch capabilities, effective viewport, and iframe dimensions. Tablet heuristics precede phone heuristics. In iframes, widths below 768/1024 can select mobile/tablet; outside iframes, a narrow non-touch desktop window can still be classified desktop. Classification is therefore not identical to Tailwind breakpoints.

A `mountea:device` postMessage override accepts mobile/tablet/desktop or auto/default/none. Its listener checks the configured origin set plus the current origin and emits `device-override`. Root/dashboard/settings subscribe to device changes; individual components also listen to resize/orientation. The module prevents attaching duplicate override listeners.

Desktop editing uses side panels and richer pointer controls. Mobile/tablet paths use drawers, node/connection modals, automatic layout, and denser toolbars. Preview is desktop-only. Test route/device transitions, not only CSS resizing, when changing those paths.

## Themes and preferences

Root applies the persisted theme and device-specific scrollbar behavior. UI store preferences include view modes, sort choices, sidebar/section state, and per-project content locale. Profile-aware storage is discussed in [persistence](persistence.md); the missing startup UI-store rehydrate can display/persist the previous profile's preferences.

Accessibility is partly inherited from Radix/native controls, but that is not a full accessibility audit. Canvas-only actions, icon buttons, modal focus return, keyboard-only graph editing, and touch controls need interaction tests. The existing smoke suite proves only a few desktop workflows, and several visible fallback/error strings remain English ([ISS-041](issues.md#iss-041)).
