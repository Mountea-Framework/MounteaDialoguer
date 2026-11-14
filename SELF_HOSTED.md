# Self-hosted web edition and MCP server

An optional way to run Mountea Dialoguer as a web app on your own machine (a server, a Raspberry Pi, a NAS) and use it from every device. It adds three things and changes nothing for the desktop app or the Google Drive and Steam providers:

- **`server/`**: a dependency-free Node server. It serves the built web app and is the file store behind a new `server` sync provider (`src/lib/sync/providers/`). The provider speaks the same immutable-revision protocol as the other providers, in plain text, behind a sync password.
- **`mcp/`**: a dependency-free MCP server (Streamable HTTP) that lets an LLM author projects through the same revision store. A Claude skill that teaches the workflow is in `.claude/skills/mountea-dialoguer/`.
- **`Dockerfile` and `docker-compose.yml`** to run both.

Nothing here is active unless the app is built with `VITE_SYNC_SERVER=true` (the Dockerfile does that). Access control is deliberately left to whatever sits in front of the server (a reverse proxy, Cloudflare Access, a VPN).

## Run it

```
docker compose up -d --build
```

Open http://localhost:8080. The app stores one file per revision in `./data/sync/`. Without Docker:

```
VITE_SYNC_SERVER=true npm run build
npm start                         # PORT (default 8080), DATA_DIR (default ./data), DIST_DIR
```

How the app behaves in this edition: it connects to the server at start (after the first-start setup, it asks for your sync password), pulls what other devices or the MCP server added before the first paint, pushes every change a moment after it is committed, and polls every 30 seconds. Competing edits of one project end up in the existing conflict panel.

## First start

1. Start the app: `docker compose up -d`.
2. Find the setup code: `docker compose logs dialoguer`. Read the line that starts with "Sync setup code".
3. Open http://localhost:8080, enter the setup code, and choose a sync password (at least 8 characters).
4. On later visits, enter your sync password to log in.
5. Forgot the password? Run `docker compose stop`, delete `sync-auth.json` in the `data` folder next to `docker-compose.yml`, and start again to get a new setup code.
6. Logins end when the server restarts, so you may need to log in again.

- The server binds `127.0.0.1` by default; the Docker image sets `HOST=0.0.0.0`.

## MCP server

Create a `.env` next to `docker-compose.yml`:

```
MCP_TOKEN=<output of: openssl rand -hex 24>
```

Without a token (at least 24 characters) the `mcp` container refuses to start; the app is not affected. Locally: `MCP_TOKEN=<token> npm run mcp` (`MCP_PORT`, default 8081; `DATA_DIR` must be the server's).

- It reads a project's head revision, changes a copy, validates it with the app's own `canonicalProject` code (`mcp/register.mjs` lets Node load those modules) and writes a new revision. The revision history is the backup.
- 41 tools: projects, dialogues, nodes and connections, participants, categories, decorators, conditions, row timing, translations, validation and `.mnteadlg` / `.mnteadlgproj` export. `delete_project` and `delete_dialogue` add a deletion revision, so the history stays on the server; records that are still referenced must be reassigned before they can be deleted.
- Auth: `Authorization: Bearer <token>`, or `https://host/mcp/<token>` for clients that cannot send headers. Failed attempts are rate limited and every write is logged to `data/mcp-audit.log`.
- It is a separate process on its own port so that it can be published on its own hostname when the app itself is behind an access proxy.
- Claude Code: `claude mcp add --transport http mountea-dialoguer https://<host>/mcp --header "Authorization: Bearer <token>"`.

## Tests

```
npm run test:mcp                  # 20 tests: protocol, auth, authoring rules, export, revision history
PORT=8088 DATA_DIR=/tmp/td node server/index.mjs          # then, for the specs that need a running server:
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8088 npx playwright test autosave
```

`tests/e2e/mcp.spec.js` additionally needs `MCP_URL` and `MCP_TOKEN` (see the comment at the top of the file).

## Known limits

- Every save adds a revision file and each page load downloads every revision once. A cleanup or compaction step would be a natural next addition.
- The plain-text store is only as private as the network in front of it.
