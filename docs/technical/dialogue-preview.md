# Dialogue preview

Sources: [pure graph helpers](../../src/lib/dialoguePreviewEngine.js), [preview overlay](../../src/components/dialogue/DialoguePreviewOverlay.jsx), [editor](../../src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx). See also [graph editing](graph-editor.md) and [definitions](domain-model.md).

## Purpose and ownership

Preview interprets the current editable graph, including unsaved changes supplied by the editor. It is an authoring simulation, not an implementation of a consuming game's dialogue runtime. The overlay owns timers, current node/row, choices, condition scenario, audio, progress, and close animation. Pure helpers normalize the graph, inspect connectivity, evaluate configured Boolean scenario values, and derive rows and labels. The editor exposes preview on desktop; the mobile editor does not offer the same preview workflow.

## Admission and graph preparation

Placeholder nodes and their edges are excluded. Validation requires the fixed Start ID `00000000-0000-0000-0000-000000000001`, no more than 100 regular nodes in the validated graph, valid edge endpoints, and at least two nodes reachable from Start. Presence of that ID is tested; its node type is not the equivalent of a schema validation. The missing-Start check makes the later empty-graph case effectively redundant.

Edges are indexed by source in array order. Breadth-first reachability prevents traversal from repeatedly enqueuing visited nodes. Validation does not prove that all nodes are reachable, a terminal is reachable, all paths terminate, return targets exist, or every child graph is valid. The 100-node gate is an entry check, not a global budget over every recursively loaded child.

The overlay resolves referenced child dialogues ahead of playback. A visited-dialogue set bounds recursive loading, so cycles between child references do not cause infinite preloading. Runtime references use `dialogueId::nodeId`; this is important because all dialogues share the fixed Start ID.

## Runtime transitions

| Type | Preview behavior |
| --- | --- |
| Start | Follow the first outgoing edge that passes the scenario |
| Lead | Display rows, then continue or present outgoing branch choices |
| Answer | Display its content and follow the first traversable outgoing edge |
| Complete | Play its rows and finish |
| Return | Transfer to `targetNode` in the same dialogue |
| Open child graph | Transfer to the selected child dialogue's first playable node |
| Delay | Wait for its configured duration, then continue |

Child transfer has no call stack: reaching the child's end does not resume the parent after its child node. Missing runtime targets cause preview to stop/close rather than repair the graph. Decorator instances are not executed. Branches can include unavailable choices to show the effect of failing conditions.

`dialogueRows` is the primary sequence. A legacy node with inline text can produce a fallback row with a three-second duration. Speaker display prefers node participant, then display name, then label, then translated node type. A row's own participant is not the speaker override in this path.

The runtime bounds execution to 600 steps. Transition animation is 220 ms, close animation 260 ms, and the small row hold is 48 ms. Timed row/delay progression has a 200 ms floor, so the editor's 0.1-second delay setting is not reproduced exactly. Looping graphs therefore terminate through the safety cap rather than through semantic cycle rejection.

## Conditions

An instance supplies a definition ID, values, optional negation, and an edge mode of `all` or `any`. The scenario key is based on the ID and JSON of shallow key-sorted property values. Equal IDs and values share a scenario control. Nested objects are not recursively canonicalized.

The author chooses Boolean outcomes before playback. An absent scenario value defaults to true; `negate` is then applied and rules are combined with the edge mode. An empty condition set is traversable. The engine does not evaluate a game variable, call a condition implementation, or interpret the definition's `type` as executable code. This distinction should remain visible in documentation for engine integrators.

## Media, progress, and cleanup

Audio playback is best effort: a rejected `audio.play()` promise does not block traversal. Row advancement follows its configured duration, not the audio element's `ended` event, so long audio can be cut off and short audio can leave silence. Progress is estimated from the chosen route and visited playable nodes; it is not a proof of completion for arbitrary cyclic or branching graphs.

On changes and unmount, the overlay clears its timers, stops audio, and revokes object URLs that it created. URLs created earlier by persistence restoration are a separate ownership issue; see [media](media.md).

**Volume and session lifecycle:** volume updates the current audio independently and is read from a ref for later row audio. The session effect depends only on open state/root dialogue, so loudness or callback identity changes cannot trigger timer cleanup. Cleanup invalidates the session generation, cancels timers/animation frames and revokes owned URLs; generation checks discard stale child-load completions. [ISS-043](issues.md#iss-043) was reproduced before repair. Mounted Chromium regressions cover normal/StrictMode mute/unmute, subsequent rows, branch/child traversal and close/reopen; audio hardware output is stubbed.

## Change and regression boundaries

When changing traversal, exercise missing Start, one-node graphs, dangling endpoints, false/negated rules, all/any groups, multiple answers, a return loop, a child cycle, missing children, and audio rejection. Keep the 600-step safety bound independent of visual animation. Compare preview semantics explicitly with the target engine before relying on it as an integration oracle. Import currently loses edge rules ([ISS-001](issues.md#iss-001)); a successful preview after importing an archive can therefore conceal altered branching.
