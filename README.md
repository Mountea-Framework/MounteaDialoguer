[![Documentation](https://img.shields.io/badge/documentation-github?style=flat&logo=GitHub&labelColor=5a5a5a&color=98c510)](https://github.com/Mountea-Framework/MounteaDialoguer/wiki)
[![license](https://img.shields.io/badge/license-MPL%202.0-98c510?style=flat&labelColor=5a5a5a)](https://github.com/Mountea-Framework/MounteaDialoguer/blob/master/LICENSE)
[![YouTube](https://img.shields.io/badge/YouTube-Subscribe-red?style=flat&logo=youtube)](https://www.youtube.com/@mounteaframework)
[![Discord](https://badgen.net/discord/online-members/2vXWEEN?label=&logoColor=ffffff&color=7389D8&icon=discord)](https://discord.com/invite/2vXWEEN)
[![Discord](https://badgen.net/discord/members/2vXWEEN?label=&logo=discord&logoColor=ffffff&color=7389D8&icon=discord)](https://discord.com/invite/2vXWEEN)

# Mountea Dialoguer

> Mountea Dialoguer is a visual dialogue design platform for teams building narrative-driven games and interactive experiences.
> It helps writers, narrative designers, and technical designers collaborate on branching conversations that are structured, testable, and production-ready.

> **Try it out!**
> Feel free to test out the released version of our Dialoguer Tool!
> <p align="center" width="100%">
>     <a href="https://mountea-framework.github.io/MounteaDialoguer/">
>         <img width="90%" src="https://raw.githubusercontent.com/Mountea-Framework/MounteaDialoguer/refs/heads/master/DocumentationSource/desktop_graph.webp">
>     </a>
> </p>

## Who Is It For
> Mountea Dialoguer is built to solve one core problem:
> turning dialogue ideas into scalable, maintainable conversation systems.
>
> It is intentionally **game-engine agnostic**.
> It can be used with Unreal Engine, Unity, and any other runtime/toolchain that can consume structured dialogue data.
>
> It is made for **lightweight narrative and content design workflows**,
> especially for non-technical users who should not need heavy engine setups just to design and iterate dialogue.
>
> Use it to design branching NPC conversations and quest interactions,
> organize dialogue logic and reusable metadata,
> and prepare clean dialogue packages for production pipelines.
## How It Works
> Mountea Dialoguer is project-based.
>
> A project is your narrative workspace.
> Each project contains dialogues.
> Each dialogue is authored as a visual graph.
>
> Teams can build flow logic with nodes, conditions, decorators, categories, and participants,
> then preview behavior and validate paths before implementation.
>
> This creates a single, shared source of truth for narrative content,
> easier to review and maintain than disconnected spreadsheets or docs.

## The Dialoguer
> The tool comes rich in features, free and available on desktop, tablet and mobile!
> And it provides nice dark/light modes to please as many users as we can.

> **Desktop application preview**
> <p align="center" width="100%">
>     <img width="45%" src="https://raw.githubusercontent.com/Mountea-Framework/MounteaDialoguer/refs/heads/master/DocumentationSource/dektop_mainPage.webp">
>     <img width="45%" src="https://raw.githubusercontent.com/Mountea-Framework/MounteaDialoguer/refs/heads/master/DocumentationSource/desktop_projectDetails.webp">
> </p>
> <p align="center" width="100%">
>     <img width="45%" src="https://raw.githubusercontent.com/Mountea-Framework/MounteaDialoguer/refs/heads/master/DocumentationSource/desktop_Categories.webp">
>     <img width="45%" src="https://raw.githubusercontent.com/Mountea-Framework/MounteaDialoguer/refs/heads/master/DocumentationSource/desktop_graph.webp">
> </p>

## Features
> - Visual node-based dialogue authoring
> - Branching logic with condition-based transitions
> - Reusable dialogue metadata (participants, categories, decorators)
> - Dialogue preview and validation of playable flows
> - Import/export workflows for dialogue and project handoff
> - Optional encrypted cloud sync for distributed teams
> - Multi-language UI and responsive desktop/mobile support

## Electron Desktop Wrapper
> The repository now includes an Electron wrapper for desktop releases.
>
> - Run web + Electron in development: `npm run dev:electron`
> - Run Electron against the built app: `npm run electron:start`
> - Build distributables for your current platform: `npm run electron:dist`
> - Build unpacked output (no installer): `npm run electron:pack`
>
> Supported desktop targets are configured for:
> - Windows (`NSIS installer .exe`, `portable .exe`)
> - macOS (`dmg`, `zip`)
> - Linux (`AppImage`, `deb`)
>
> OAuth client ID env vars:
> - `VITE_GOOGLE_CLIENT_ID_WEB`: used by browser/web builds
> - `VITE_GOOGLE_CLIENT_ID_DESKTOP`: used by Electron builds
> - `VITE_GOOGLE_CLIENT_ID`: fallback if the runtime-specific key is not set
> - `VITE_GOOGLE_CLIENT_SECRET_DESKTOP`: optional compatibility value if Google returns `client_secret is missing` during Electron token exchange
> - `VITE_GOOGLE_TEAM_FOLDER_ID_DESKTOP`: optional shared Google Drive folder ID for team sync in Electron
> - `VITE_GOOGLE_TEAM_FOLDER_ID_WEB`: optional shared folder ID for web builds
> - `VITE_GOOGLE_TEAM_FOLDER_ID`: fallback shared folder ID for all runtimes
>
> If no team folder ID is configured, Google sync uses private `appDataFolder` storage per user.

## Desktop CLI
> The desktop app can be driven from a terminal or an MCP client. Changes are made in the desktop app's own database, so they show in the open app straight away and sync like any edit made in the app.
>
> - Installed app: run `dialoguer.cmd` (Windows) or `dialoguer` (macOS/Linux) from the app's `resources/cli` folder; add that folder to `PATH` to type `dialoguer` anywhere. It uses the app's own runtime, so Node.js is not needed. From the repository: `npm run cli -- <command>` (needs `npm run build`).
> - If the app is not running, the CLI starts it hidden (`--headless`, quits after 15 idle minutes or on `dialoguer stop`). Opening the app normally while it runs hidden shows its window.
> - If the app is already open, turn on **CLI access** in its command palette (`Ctrl+K`, Settings). It is off by default.
>
> Common commands:
> - `dialoguer projects`, `dialoguer dialogues <projectId>`, `dialoguer dialogue <projectId> <dialogueId>`
> - `dialoguer import <file.mnteadlgproj>`, `dialoguer export project <projectId> -o <file>`
> - `dialoguer tools`, then `dialoguer call <tool> key=value ...` for any of the MCP tools
> - `dialoguer mcp` serves MCP over stdio: `claude mcp add dialoguer-desktop -- <path>/dialoguer mcp`
> - `dialoguer help` lists everything, including `--user-data-dir` and `--url`/`--token` for a self-hosted MCP endpoint.
>
> Security: the app listens on `127.0.0.1` only, refuses browser requests, and requires a token that is regenerated on each start and stored in the app's profile folder (`automation.json`), so only your OS account can use it. The CLI acts on the app's active profile. The bundled launcher relies on Electron's `RunAsNode` fuse staying enabled.

## How To Support
> If **Mountea Dialoguer** is valuable to your team, you can support it by:
>
> - Starring the repository and sharing it
> - Reporting issues and suggesting features
> - Joining our Discord: https://discord.com/invite/2vXWEEN
> - Contributing code, docs, tests, or localization
> - Following updates on YouTube: https://www.youtube.com/@mounteaframework

## AI
> We used AI for this tool. To be more precise, we used AI to help us bring the tool from desktop to mobile devices, as we lack the experience.
> 
> We are fully transparent and all AI code was pushed by AI agent.
> 
> We intend to use as little AI as we possibly can.

## Contributing
> We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.

## License
> This project is licensed under MPL 2.0.
> See the [LICENSE](LICENSE) file for details.

