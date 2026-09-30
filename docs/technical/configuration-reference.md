# Node configuration reference

Generated from the baseline [dialogueNodes.json](../../src/config/dialogueNodes.json). This is the complete configured field/default catalogue, not a database schema validator. The route still registers renderers and implements selection sources and special field types separately. See [graph editing](graph-editor.md), [domain model](domain-model.md), and [preview](dialogue-preview.md).

Accessor behavior: `getNodeDefinition` returns the matching definition; the list accessor returns all values; the creatable accessor filters `creatable`; default-data access returns the stored object or `{}` without deep cloning. Consumers must not mutate shared defaults.

Other configuration: [edgeConditions.js](../../src/config/edgeConditions.js) builds condition instances using nullish defaults; [steamAchievements.js](../../src/config/steamAchievements.js) holds achievement IDs; [app-languages.json](../../electron/shared/app-languages.json) is the UI-language catalogue. [nodeForm.json](../../src/config/nodeForm.json) is legacy and [projectDetails.json](../../src/config/projectDetails.json) contains about/author content. Runtime/build settings are in [build configuration](build-release-testing.md).

## startNode

Definition metadata: `{"type":"startNode","label":"Start","description":"Dialogue entry point","section":"system","creatable":false,"canHaveOutputs":true,"minimapColor":"#22c55e"}`.

Default data:

```json
{
  "label": "Dialogue entry point",
  "displayName": "Start",
  "text": "",
  "participant": "",
  "decorators": [],
  "dialogueRows": [],
  "selectionTitle": "",
  "hasAudio": false
}
```

### nodeData

Section metadata: `{"id":"nodeData","titleKey":"editor.sections.nodeData","defaultOpen":true}`.

| Field | Type | Complete configured attributes |
| --- | --- | --- |
| `displayName` | `text` | `{"labelKey":"editor.sections.displayName","placeholderKey":"editor.sections.displayNamePlaceholder","required":true,"maxLength":64,"localizable":true}` |
| `nodeId` | `nodeId` | `{"labelKey":"editor.sections.nodeId"}` |

## leadNode

Definition metadata: `{"type":"leadNode","label":"NPC","description":"Add an NPC dialogue node","section":"dialogue","creatable":true,"canHaveOutputs":true,"icon":"messageCircle","colorClass":"text-blue-500","minimapColor":"#3b82f6"}`.

Default data:

```json
{
  "label": "New NPC",
  "displayName": "NPC",
  "text": "",
  "participant": "",
  "decorators": [],
  "dialogueRows": [],
  "selectionTitle": "",
  "hasAudio": false
}
```

### nodeData

Section metadata: `{"id":"nodeData","titleKey":"editor.sections.nodeData","defaultOpen":true}`.

| Field | Type | Complete configured attributes |
| --- | --- | --- |
| `displayName` | `text` | `{"labelKey":"editor.sections.displayName","placeholderKey":"editor.sections.displayNamePlaceholder","required":true,"maxLength":64,"localizable":true}` |
| `participant` | `select` | `{"labelKey":"editor.sections.participant","placeholderKey":"editor.sections.participantPlaceholder","required":true,"options":"participants"}` |
| `nodeId` | `nodeId` | `{"labelKey":"editor.sections.nodeId"}` |

### dialogueDetails

Section metadata: `{"id":"dialogueDetails","titleKey":"editor.sections.dialogueDetails","defaultOpen":true}`.

| Field | Type | Complete configured attributes |
| --- | --- | --- |
| `selectionTitle` | `text` | `{"labelKey":"editor.sections.selectionTitle","placeholderKey":"editor.sections.selectionTitlePlaceholder","localizable":true}` |
| `dialogueRows` | `dialogueRows` | `{"labelKey":"editor.sections.dialogueRows","localizable":true}` |

### nodeDecorators

Section metadata: `{"id":"nodeDecorators","titleKey":"editor.sections.nodeDecorators","defaultOpen":false}`.

| Field | Type | Complete configured attributes |
| --- | --- | --- |
| `decorators` | `decorators` | `{}` |

## answerNode

Definition metadata: `{"type":"answerNode","label":"Player","description":"Add a player response node","section":"dialogue","creatable":true,"canHaveOutputs":true,"icon":"user","colorClass":"text-purple-500","minimapColor":"#8b5cf6"}`.

Default data:

```json
{
  "label": "New Player",
  "displayName": "Player",
  "text": "",
  "participant": "",
  "decorators": [],
  "dialogueRows": [],
  "selectionTitle": "",
  "hasAudio": false
}
```

### nodeData

Section metadata: `{"id":"nodeData","titleKey":"editor.sections.nodeData","defaultOpen":true}`.

| Field | Type | Complete configured attributes |
| --- | --- | --- |
| `displayName` | `text` | `{"labelKey":"editor.sections.displayName","placeholderKey":"editor.sections.displayNamePlaceholder","required":true,"maxLength":64,"localizable":true}` |
| `participant` | `select` | `{"labelKey":"editor.sections.participant","placeholderKey":"editor.sections.participantPlaceholder","required":true,"options":"participants"}` |
| `nodeId` | `nodeId` | `{"labelKey":"editor.sections.nodeId"}` |

### dialogueDetails

Section metadata: `{"id":"dialogueDetails","titleKey":"editor.sections.dialogueDetails","defaultOpen":true}`.

| Field | Type | Complete configured attributes |
| --- | --- | --- |
| `selectionTitle` | `text` | `{"labelKey":"editor.sections.selectionTitle","placeholderKey":"editor.sections.selectionTitlePlaceholder","localizable":true}` |
| `dialogueRows` | `dialogueRows` | `{"labelKey":"editor.sections.dialogueRows","localizable":true}` |

### nodeDecorators

Section metadata: `{"id":"nodeDecorators","titleKey":"editor.sections.nodeDecorators","defaultOpen":false}`.

| Field | Type | Complete configured attributes |
| --- | --- | --- |
| `decorators` | `decorators` | `{}` |

## returnNode

Definition metadata: `{"type":"returnNode","label":"Return","description":"Return to a previous node","section":"flow","creatable":true,"canHaveOutputs":false,"icon":"cornerUpLeft","colorClass":"text-orange-500","minimapColor":"#f97316"}`.

Default data:

```json
{
  "label": "New Return",
  "displayName": "Return",
  "targetNode": ""
}
```

### nodeData

Section metadata: `{"id":"nodeData","titleKey":"editor.sections.nodeData","defaultOpen":true}`.

| Field | Type | Complete configured attributes |
| --- | --- | --- |
| `displayName` | `text` | `{"labelKey":"editor.sections.displayName","placeholderKey":"editor.sections.displayNamePlaceholder","required":true,"maxLength":64,"localizable":true}` |
| `nodeId` | `nodeId` | `{"labelKey":"editor.sections.nodeId"}` |

### returnTarget

Section metadata: `{"id":"returnTarget","titleKey":"editor.sections.dialogueDetails","defaultOpen":true}`.

| Field | Type | Complete configured attributes |
| --- | --- | --- |
| `targetNode` | `select` | `{"labelKey":"editor.sections.targetNode","placeholderKey":"editor.sections.targetNodePlaceholder","options":"nodes"}` |

## openChildGraphNode

Definition metadata: `{"type":"openChildGraphNode","label":"Open Child Graph","description":"Open another dialogue in this project","section":"flow","creatable":true,"canHaveOutputs":false,"icon":"externalLink","colorClass":"text-cyan-500","minimapColor":"#06b6d4"}`.

Default data:

```json
{
  "label": "Open Child Graph",
  "displayName": "Open Child Graph",
  "targetDialogue": ""
}
```

### nodeData

Section metadata: `{"id":"nodeData","titleKey":"editor.sections.nodeData","defaultOpen":true}`.

| Field | Type | Complete configured attributes |
| --- | --- | --- |
| `displayName` | `text` | `{"labelKey":"editor.sections.displayName","placeholderKey":"editor.sections.displayNamePlaceholder","required":true,"maxLength":64,"localizable":true}` |
| `nodeId` | `nodeId` | `{"labelKey":"editor.sections.nodeId"}` |

### childGraphTarget

Section metadata: `{"id":"childGraphTarget","titleKey":"editor.sections.dialogueDetails","defaultOpen":true}`.

| Field | Type | Complete configured attributes |
| --- | --- | --- |
| `targetDialogue` | `select` | `{"labelKey":"editor.sections.targetDialogue","placeholderKey":"editor.sections.targetDialoguePlaceholder","options":"dialogues","required":true}` |

## completeNode

Definition metadata: `{"type":"completeNode","label":"Complete","description":"Mark dialogue as complete","section":"flow","creatable":true,"canHaveOutputs":false,"icon":"checkCircle2","colorClass":"text-[#CC2100]","minimapColor":"#CC2100"}`.

Default data:

```json
{
  "label": "New Complete",
  "displayName": "Complete",
  "text": "",
  "participant": "",
  "decorators": [],
  "dialogueRows": [],
  "selectionTitle": "",
  "hasAudio": false
}
```

### nodeData

Section metadata: `{"id":"nodeData","titleKey":"editor.sections.nodeData","defaultOpen":true}`.

| Field | Type | Complete configured attributes |
| --- | --- | --- |
| `displayName` | `text` | `{"labelKey":"editor.sections.displayName","placeholderKey":"editor.sections.displayNamePlaceholder","required":true,"maxLength":64,"localizable":true}` |
| `participant` | `select` | `{"labelKey":"editor.sections.participant","placeholderKey":"editor.sections.participantPlaceholder","required":true,"options":"participants"}` |
| `nodeId` | `nodeId` | `{"labelKey":"editor.sections.nodeId"}` |

### dialogueDetails

Section metadata: `{"id":"dialogueDetails","titleKey":"editor.sections.dialogueDetails","defaultOpen":true}`.

| Field | Type | Complete configured attributes |
| --- | --- | --- |
| `selectionTitle` | `text` | `{"labelKey":"editor.sections.selectionTitle","placeholderKey":"editor.sections.selectionTitlePlaceholder","localizable":true}` |
| `dialogueRows` | `dialogueRows` | `{"labelKey":"editor.sections.dialogueRows","localizable":true}` |

### nodeDecorators

Section metadata: `{"id":"nodeDecorators","titleKey":"editor.sections.nodeDecorators","defaultOpen":false}`.

| Field | Type | Complete configured attributes |
| --- | --- | --- |
| `decorators` | `decorators` | `{}` |

## delayNode

Definition metadata: `{"type":"delayNode","label":"Delay","description":"Pause the dialogue for a set duration","section":"flow","creatable":true,"canHaveOutputs":true,"icon":"clock","colorClass":"text-sky-400","minimapColor":"#7dd3fc"}`.

Default data:

```json
{
  "label": "New Delay",
  "displayName": "Delay",
  "duration": 1
}
```

### delaySettings

Section metadata: `{"id":"delaySettings","titleKey":"editor.sections.nodeData","defaultOpen":true}`.

| Field | Type | Complete configured attributes |
| --- | --- | --- |
| `duration` | `slider` | `{"label":"Duration (seconds)","min":0.1,"max":30,"step":0.1,"unit":"s"}` |
| `nodeId` | `nodeId` | `{"labelKey":"editor.sections.nodeId"}` |

