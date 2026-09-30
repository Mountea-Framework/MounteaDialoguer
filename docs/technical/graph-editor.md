# Graph authoring, saving, and history

Primary implementation: [graph route](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx), [node definitions](../../src/config/dialogueNodes.json), [dialogue store](../../src/stores/dialogueStore.js). See [preview](dialogue-preview.md) for execution semantics.

## Node types and data-driven forms

`dialogueNodes.js` exposes the JSON definition map, creatable list, and default data. The route separately registers React Flow components. A definition supplies label, section, creatability, output capability, minimap color, defaults, and property-panel sections. Field types include text, select, node ID, slider, dialogue rows, and decorators. `required` drives missing-field reporting, not a global DB validator.

| Type | Creation/output | Data and behavior |
| --- | --- | --- |
| `startNode` | System-created; one real output | Fixed ID, protected from deletion/movement; entry point |
| `leadNode` | Creatable; outputs | NPC-style dialogue, participant, display name, selection title, rows, decorators |
| `answerNode` | Creatable; outputs | Player response with the same main dialogue fields |
| `completeNode` | Creatable; no output | Can contain rows/participant/decorators; terminates after rows in preview |
| `returnNode` | Creatable; no output | `targetNode` refers to a node in the current dialogue |
| `openChildGraphNode` | Creatable; no output | Required `targetDialogue` in the project's dialogue list |
| `delayNode` | Creatable; outputs | `duration`; form range 0.1–30 seconds in 0.1 increments |
| `placeholderNode` | UI-generated only | Touch add/connect affordance; carries `parentNodeId` and callback, never persisted by route save |

Start's position is anchored at `{x:0,y:0}`. Viewport defaults to `{x:0,y:0,zoom:1}`; flow zoom limits are 0.1–2. Definitions with no outputs normally omit source handles. The connection callback itself only explicitly enforces nonempty IDs and Start's one-real-child restriction; it is not a complete graph integrity validator.

## Loading and state changes

The route loads project/dialogue metadata and participant/category/decorator/condition collections, then calls `loadDialogueGraph(dialogueId,{activeLocale})`. The graph store restores durable audio and materializes strings. A `dialogueId:contentLocale` key coordinates graph reloads. The route owns its live graph through `useEditorDraft`, rather than using the store's node array as the live React Flow draft.

Graph loading can write localization metadata and, if migration conditions are met, replace nodes/strings. `loadDialogueGraphForPreview` is the read-only loader. Store load effects, route state, and unsaved guards must be considered together when pulling remote data or switching locale.

Selection opens a node property panel or `EdgeConditionsPanel`. Node data edits merge into `data`; selected-node changes consolidate pending edits into history instead of recording every keystroke. Drag/change handlers protect the start anchor. `useEditorDraft` applies pure reducer transitions synchronously against a current draft reference before requesting a render. Functional graph update callbacks run once outside React's deferred/replayable updater machinery. Authored node/edge changes and user viewport changes increment a revision; selection/measurement alone do not. See [ISS-030](issues.md#iss-030).

## Creating, connecting, deleting

Desktop node creation uses a toolbar and React Flow drag/drop positions. Creation combines definition defaults with a UUID. Shallow default objects are spread; new mutation code must not mutate shared definition arrays directly.

Normal connections use `conditionEdge`, arrow markers, and `{mode:'all',rules:[]}`. `isConnectionAllowed` refuses a second real Start child unless reconnecting to the same target; React Flow `addEdge` handles duplicate endpoints. The rendered edge layer adds edit/delete callbacks and condition badges; callbacks belong to the UI, not stored graph data.

Node deletion removes incident edges and owned placeholder nodes/edges. Cascade delete traverses descendants through edges with a visited set while protecting Start. Shared downstream nodes can therefore be removed with a branch: cascade is reachability-based, not reference-count-based ownership. Surviving return-node references block deletion of their targets and report affected references; references wholly within the deletion set do not block it. Deleting a child dialogue similarly requires removing or reassigning surviving child-graph references through the repository's domain checks.

Mobile/tablet uses placeholder nodes with dashed edges. Start gets a placeholder only without a real child; other output-capable nodes retain an add affordance for branches. Selecting a type replaces/extends the placeholder flow, and a connection modal can connect an existing node. These paths have their own edge construction and history behavior. Placeholder creation uses `default` edges, while the rendered graph normalizes real edges for condition interaction.

## Layout and viewport

Dagre computes directed graph positions, usually top-to-bottom. Size selection prefers measured dimensions, then explicit width/height/style, then per-type defaults. Layout shifts every node by the start node's resulting offset so Start remains at the origin. Mobile/tablet performs automatic layout and queued focus; desktop exposes layout/recenter/start-focus controls. Desktop restores a meaningful saved viewport; mobile favors computed layout/focus.

Recenter, zoom, and move handlers update local viewport state. Resize observers adjust header/toolbar density. Loading overlays include deliberate minimum timing on mobile; a visible loader is not itself proof that a DB operation is still running.

## History and saving

`saveToHistory` discards redo states after a new branch and caps history at 50 entries. `cloneGraphDraft` removes placeholder UI records, functions, object URLs and React Flow interaction metadata, then uses `structuredClone`; unknown authored fields and Blob bytes survive. Undo/redo restores a fresh clone and increments the dirty revision. Pending field edits are checkpointed before undo. History is component memory and is not persisted across reloads. Correction to the initial investigation: the original route stored graph arrays by reference; the earlier claim that it JSON-cloned them was incorrect. [ISS-029](issues.md#iss-029) now records the actual snapshot-isolation risk and regression.

`handleSave` captures an isolated graph and revision/generation ticket, reports required-field warnings, then **still saves** through `saveDialogueGraph`. The store prepares localization keys/entries, validates key integrity, converts row audio blobs to base64, and replaces graph+strings transactionally. Acknowledgement clears dirty state only when the captured generation and current revision match; edits made during a pending write remain dirty. Save and save-before-export operations share one per-editor promise queue, so an earlier pending save cannot overwrite a newer export draft. Failed operations do not poison the queue. Preview has stricter required-field blocking than save. This queue protects one mounted editor; cross-tab/provider write arbitration belongs to the repository transaction layer.

The active editor does **not** use `useAutoSave` or `useAutoSaveNodesAndEdges`; those hooks target the legacy database. Persisted changes atomically create outbox intent; scheduling and bounded retries drive delivery afterward. Unsaved graph edits cannot be recovered from a cloud push.

Export from the editor saves the draft first and then exports persisted data. Export from dashboard/cards operates on stored data. Save status, local mutation completion, ZIP download completion, and cloud upload completion are separate states.

`beforeunload` and TanStack `useBlocker` warn when leaving an unsaved draft. Content-locale changes are rejected while dirty and ask the user to save. Native menu and command-palette actions dispatch scoped events which the route filters by dialogue ID. See [UI interaction](ui-interaction.md).

## Validation limits and extension checklist

Required fields are checked from JSON configuration. Preview checks Start, node count, broken edges, and at least one reachable non-Start node. Repository validation additionally checks scoped endpoints, return/child targets, definition identities, project ownership and localized field references. Draft authoring permits designated incomplete states; strict import/export and remote application reject invalid complete payloads. These checks are not a comprehensive semantic graph proof: arbitrary cycles, downstream engine semantics and dead ends still require author review. UI connection rules are separate from archive structural validation.

For a new node/field: update JSON definitions and defaults, register/render its component, define preview handling, verify layout/handles and touch placeholders, decide localization fields, preserve it in archives/snapshots, and add a graph round-trip test. For graph mutation changes: verify dirty status, undo/redo, protected Start behavior, placeholder filtering, and audio/text survival. The [issue register](issues.md) identifies existing failures that should not be copied into new paths.
