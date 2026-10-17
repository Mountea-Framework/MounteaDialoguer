---
name: mountea-dialoguer
description: Author and edit dialogue content through the Mountea Dialoguer MCP server - projects, dialogues and node graphs (NPC lines, player options, return/complete/delay/child-graph nodes), participants, categories, decorators, conditions, translations, validation and .mnteadlg export. Use whenever the user wants to write, restructure, translate, review or export game dialogue, NPC conversations, player choices, speakers or localization in Dialoguer, even if they do not say "MCP".
---

# Mountea Dialoguer (MCP)

Mountea Dialoguer is a dialogue graph editor. The MCP server edits the same projects the web app shows. Everything the UI can do is available as a tool, except deleting whole projects or dialogues (there is deliberately no tool for that; ask the user to do it in the app).

## Connecting

Tools are named `list_projects`, `create_dialogue`, `set_graph`, ... If they are not available, the server is not connected. Tell the user how:

- Claude Code: `claude mcp add --transport http mountea-dialoguer https://<mcp-host>/mcp --header "Authorization: Bearer <MCP_TOKEN>"`
- claude.ai custom connector (cannot send headers): URL `https://<mcp-host>/mcp/<MCP_TOKEN>`, no other auth.
- Local: `MCP_TOKEN=<24+ chars> npm run mcp` (port 8081, same `DATA_DIR` as the app server).

The token is a secret. Never print it into dialogue content, commits or chat.

## How the data works

- A project holds dialogues, participants (speakers), categories (a tree the participants live in), decorators and conditions (definitions), and translations.
- A dialogue is a graph. Every dialogue has exactly one Start node (`start`); it has one outgoing connection.
- Text is localized. Tools write and read the project's **default locale** unless you pass `locale`. Other languages go through `set_text` after `update_project addLocales`.
- Names (project, dialogue, participant, category, decorator, condition) are converted to PascalCase: spaces are removed, only letters, numbers, `_` and `-` survive. Participants and categories are max 16 characters; category depth max 5; names are unique inside their category tree.
- **Names:** participant and category names are 1-16 letters or digits only (the Unreal importer enforces the same limit). The tools reject anything else.
- The app and the MCP share the project as a chain of revisions. Every MCP call adds a revision; open tabs pick it up on their next sync (focus, or within 30 s). An open editor with nothing unsaved reloads by itself; one with unsaved edits asks. If the user saved at the same moment, the app shows a "Synchronization conflicts" panel and keeps both versions. Never claim the user "already sees" a change before the sync has run.

## Node types

| type | use | notes |
|---|---|---|
| `leadNode` | NPC speaks | needs `participant`; `rows` are the spoken lines |
| `answerNode` | player option | `selectionTitle` = the clickable option label; `rows` = what the player then says (first row is shown next to the label in preview) |
| `returnNode` | jump back to an earlier node | `targetNode`; no outgoing connections |
| `openChildGraphNode` | continue in another dialogue | `targetDialogue` (name or id); no outgoing |
| `completeNode` | ends the conversation | needs `participant`; no outgoing |
| `delayNode` | pause | `duration` 0.1-30 s |

Rows can carry optional timing: `executionBehaviour` (`automatic` default, `awaitInput` = click to continue, `stopping`), `durationMode` (`duration` default, `override`, `add`, `calculate`) and `durationOverride` (seconds). Omit them for normal rows.

Required fields: `displayName` (max 64) on all but delay; `participant` on lead/answer/complete. A player node without `selectionTitle` has no option label - always set it.

**Option labels.** The Unreal plugin shows `selectionTitle` as the clickable choice (falling back to the display name when it is empty). Write the real label in `selectionTitle` and a short internal name in `displayName`; the two are exported as separate strings.

**Known plugin limits.** The Return node's "Auto Complete Selected Node" option exists only in Unreal (it cannot be authored or imported from here); set it in the Unreal graph after import if a design needs it. Decorator and condition properties can only be `string`, `number` or `boolean` (`int`, `float`, `bool` are accepted as aliases); the importer rejects anything else. Mention these when a design depends on them.

## Workflow

1. `list_projects` -> `get_project` (shows participants, categories, decorators, conditions, locales, dialogues). Reuse what exists.
2. Create missing building blocks first: `create_category`, `create_participant`, `create_decorator`, `create_condition`. Participants must exist before a node can use them.
3. `create_dialogue`, then build the graph with **one `set_graph` call** (`mode: "replace"`). Give every node a short `ref`; use refs in `edges` and `targetNode`; `"start"` is the Start node. Layout is automatic.
4. `validate_dialogue`. Fix every error; read the warnings (unreachable nodes, missing option labels, unknown participants).
5. Iterate with `get_dialogue` (ids come from here) and `update_node`, `add_node`, `connect_nodes`, `delete_edge`, `update_edge`, `delete_node`.
6. Translate: `update_project addLocales ["de"]`, `list_missing_translations`, `set_text`.
7. `export_dialogue` (or `export_project`) gives the archive for the Unreal plugin (format `mountea.archive.v3`, link valid 24 h). Older plugin builds cannot read it.

Typical conversation shape: Start -> NPC greeting -> several player options (each an `answerNode`) -> NPC reply -> back to the options with a `returnNode`, plus one option leading to a `completeNode`. Options that end the conversation are shown last in preview.

## Writing rules

- Keep lines short and speakable; one idea per row. Use several rows instead of one long block (each row has its own `duration`, default 3 s; set longer for long lines).
- Option labels are actions or intents ("Ask about the curse"), spoken lines are what the character actually says.
- Stay in the project's existing voice: read a couple of existing nodes with `get_dialogue` before adding to a dialogue.
- Do not invent participants, categories or decorators silently; say what you created.

## Safety

- Anything *inside* a dialogue can be deleted: nodes (`delete_node`, `cascade`), connections (`delete_edge`), rows (`update_node` with `rows`), translations, or the whole content (`clear_dialogue`). Only the dialogue itself and the project cannot be deleted.
- Destructive tools exist for nodes, edges, participants, categories, decorators and conditions. `delete_node` with `cascade: true` removes everything below the node: say what will go before doing it. `delete_participant`/`delete_category`/`delete_*` of definitions refuse while in use; do not reach for `force` without telling the user.
- Every write makes a server-side backup (last 10 per project). If something goes wrong, tell the user; do not try to repair data by rewriting a whole graph blindly.
- If a tool errors, read the message: it names the rule that failed (name pattern, uniqueness, depth, missing participant, structural rule). Fix the input and retry once; do not loop.
- `set_graph` with `mode: "replace"` replaces every node of that dialogue except Start. Use `merge` to add to an existing graph.

## Tool reference

Projects: `list_projects`, `get_project`, `create_project`, `update_project` (name, description, version, default/added/removed locales).
Dialogues: `list_dialogues`, `create_dialogue`, `update_dialogue`, `get_dialogue`, `validate_dialogue`.
Graph: `add_node`, `update_node`, `delete_node`, `connect_nodes`, `update_edge` (conditions), `delete_edge`, `set_graph`, `auto_layout`, `clear_dialogue` (empties a dialogue, keeps it).
Text: `set_text`, `list_missing_translations`.
People: `list_participants`, `create_participant`, `update_participant` (renames cascade to nodes), `delete_participant`, `set_participant_thumbnail`, `list_categories`, `create_category`, `update_category`, `delete_category`.
Definitions: `list/create/update/delete_decorator` and `_condition`. Decorators go on nodes (`decorators: [{name, values}]`), conditions on connections (`conditions: {mode: "all"|"any", rules: [{name, values, negate}]}`).
Export: `export_dialogue`, `export_project`.

Row input: a string or `{text, duration}`. `rows` always replaces all rows of the node.
