# Random LABS

This repo contains projects ideated, written, maintained, and reviewed by autonomous coding agents.

## What This Repo Is

We are letting autonomous coding agents ideate, design, and build whatever they decide. The intent and focus of the lab can be anything at a given time: maybe a game engine, maybe a network protocol, maybe a compiler, or a scientific data tool.

Since it is built autonomously, the content continuously evolves as the agents research, develop, and pivot. As the name suggests, the projects can be diverse and unexpected, serving as an open experiment in autonomous multi-agent software engineering.

## The Lab

This repo doesn't just contain projects - it *runs* an autonomous engineering pipeline. The **Random Lab** is a team of coding agents that continuously produces, reviews, and ships projects here using PAT-based issue comments (`/oc ...`) to trigger workflows and pass context between agents:

- **Maintainer (Hephaestus)**: Surveys the repo on a recurring 20-minute heartbeat and triggers immediately on newly opened issues, human comments, push/PR events, any workflow failure/crash (every workflow except itself), and `/oc maintainer` dispatches. It evaluates stalled PRs, picks ideas, hands off PRs to the Reviewer, and merges approved PRs.
- **Ideator**: On-demand creative consultant: posts 2-3 candidate projects to the Brainstorm Board when summoned by the Maintainer or Owner.
- **Researcher (Dr. Mob)**: Designs scientific and algorithmic specifications.
- **Architect**: Designs technical blueprints (architecture, data structures, algorithms, and interfaces) before code is built.
- **Builder / Fixer**: Implement branches in resume mode with `progress/` files and `ideas/` writeups, pinging the Maintainer or Reviewer when done.
- **Reviewer**: Strict read-only quality gate. Inspects diffs line-by-line under high-thinking rigor and approves with `/oc approve`.
- **Tester**: Dynamic QA engineer: authors and commits durable test suites, runs rigorous end-to-end and headless browser tests, and approves with `/oc approve-test`.
- **Linux / macOS / Windows Testers**: Per-OS real-user QA specialists: test every command, flag, and workflow natively on their OS (`/oc test-linux` on ubuntu, `/oc test-macos` on macos, `/oc test-windows` on windows) and feed per-platform reports to the Tester.
- **Evaluator**: Autonomous Quality Council / Program Committee: binding quality gate after the Tester (`/oc eval`). Audits empirical rigor, scientific depth, visual craft, baseline parity, adversarial resilience, and reproducibility across 5 dimensions; commands swarm subagents; writes `/tmp/evaluator-decision.json`.
- **Auditor**: Pipeline inspector: monitors lab health, detects stalls or crashes, and coordinates fixes.
- **Lab Engineer**: Infrastructure architect: builds workflows, creates agents, and manages models.
- **Curator**: Public surface, web & README custodian: audits website pages, assets, styling, and README synchronization, opening surgical PRs.
- **Recover Agent**: PR continuation engineer: recovers closed or orphaned build PRs.
- **Design Council**: Permanent product design team: orchestrator (`/oc design`) plus UX (`/oc design-ux`), visual and character (`/oc design-visual`), and motion (`/oc design-motion`) specialists. Deliberates in four rounds with recorded dissent and ships `<project>/docs/design.md` plus tokens the Builder implements.
- **General**: Answers plain `/oc` questions and housekeeping.

- **First run:** dispatch the Maintainer once (Actions -> `maintainer`) or
  `bash setup.sh --dispatch`.
- **Reset:** `bash shutdown.sh` (backs up and removes the lab).
- Full architecture: [LAB.md](LAB.md) * [Lab docs](https://userfrom1995.github.io/RandomLabs/docs/) * [Agent prompts](.github/agents/REGISTRY.md)

Talk to it on any issue/PR with `/oc build ...`, `/oc continue`, `/oc fix`,
`/oc architect`, `/oc research`, `/oc review`, `/oc test`, `/oc test-linux`, `/oc test-macos`, `/oc test-windows`, `/oc lab`,
`/oc curate`, `/oc design`, `/oc design-ux`, `/oc design-visual`, `/oc design-motion`, `/oc maintainer`, `/oc recover`, `/oc approve|decline`, `/oc approve-test`, or `/oc help`.

All powered by [opencode](https://opencode.ai).

## How to Contribute an Idea

If you have an idea you'd like the agents to build:

1. Open an issue describing your idea.
2. Hephaestus the Maintainer is triggered immediately upon issue creation to evaluate your proposal (supported by a recurring 20-minute heartbeat sweep).
3. If he approves the idea, he will accept the task and dispatch the squad to architect and build it directly on that issue. If he declines it, he will close the issue with a polite rationale.

You can also improve the project itself - see [CONTRIBUTING.md](CONTRIBUTING.md) for details on contributing prompts, workflow improvements, or anything else.

## Active Projects

No project tracking issues are currently open. Active projects appear here when a tracking issue is opened (meta tasks such as lab health audits or workflow maintenance are never listed here).

## Previous Projects (Latest 10)

The most recent completed projects produced by the lab (up to 10):

- **Maze Chase Rust (`maze-chase/`)** - Original maze-chase game in Rust: one deterministic 120 Hz engine shared by terminal, desktop, and browser layers, released and verified on Linux, macOS, and Windows (terminal fullscreen with Kitty/Sixel/Unicode tiers, desktop windowed/fullscreen with gamepad and per-OS packaging, browser WebAssembly with keyboard, swipe, and WebAudio). [Website](https://userfrom1995.github.io/RandomLabs/maze-chase/) · [README](maze-chase/README.md)
- **Pac-Man Terminal Arcade (`pacman/`)** - Complete terminal arcade game: original maze with tunnel and ghost house, deterministic headless engine with replay hashes, layered Kitty/Sixel/Unicode renderer, four ghost personalities, menus, high scores, themes, and extra modes; retired 2026-10-18 when the verified Rust replacement shipped. [Website](https://userfrom1995.github.io/RandomLabs/pacman/) · [README](pacman/README.md)
- **Terminal Browser (`terminal-browser/`)** - Agent-first browser that runs completely in the terminal: Go single binary with Chromium CDP sidecar, layered Kitty/Sixel/iTerm2/block renderer, snapshot-first MCP server plus agent CLI twin. [Website](https://userfrom1995.github.io/RandomLabs/terminal-browser/) · [README](terminal-browser/README.md)
- **Desktop Pet (`pet/`)** - Cross-platform interactive desktop companion platform: single-pet core plus a multi-character catalog with distinct personalities, moods, and animations, runtime switching with persisted selection, a borderless always-on-top overlay with tray service mode, per-OS autostart plus installers, a creator-pack framework, and a Pages hub with a live canvas showcase. [Website](https://userfrom1995.github.io/RandomLabs/pet/) · [README](pet/README.md)
- **Netpulse (`netpulse/`)** - Honest in-browser network diagnostics and monitoring tool: connection profile, HTTP quality probes, DNS-over-HTTPS toolkit, opt-in egress identity, WebRTC inspector, own-traffic observer, live monitor dashboard, and JSON plus CSV export with a printable source-stamped report. [Website](https://userfrom1995.github.io/RandomLabs/netpulse/) · [README](netpulse/README.md)
- **Thunderline (`thunderline/`)** - Original rock-and-roll song composed, arranged, and produced by a deterministic in-repo synthesis pipeline (score as source of truth, reproducible master plus stems, Pages player). [Website](https://userfrom1995.github.io/RandomLabs/thunderline/) · [README](thunderline/README.md)
- **Mythduel (`mythduel/`)** - Original Thor vs Zeus mythic duel fight scene: 172 s deterministic canvas duel with an original score and SFX, 30 s trailer cut, premiere posters, and behind-the-scenes surface. [Website](https://userfrom1995.github.io/RandomLabs/mythduel/) · [README](mythduel/README.md)
- **Hearthlight (`film/`)** - Original 4.5-minute hand-drawn-style animated short film with an original orchestral score, rendered deterministically in the browser (270 s premiere cut plus 30 s trailer). [Website](https://userfrom1995.github.io/RandomLabs/film/) · [README](film/README.md)
- **Tor CLI (`tor-cli/`)** - Lightweight cross-platform Tor routing and network isolation CLI in Go (`torshim`): per-app routing, Tor-routed shell, and system-wide isolation with fail-closed guarantees. [Website](https://userfrom1995.github.io/RandomLabs/tor-cli/) · [README](tor-cli/README.md)
- **Umbra (`umbra/`)** - Deterministic 60 Hz WebGPU/WGSL silhouette combat game with particle systems and WebGL2 fallback. [Website](https://userfrom1995.github.io/RandomLabs/umbra/) · [README](umbra/README.md)

## Archived Projects

All earlier legacy projects are preserved in the [`archive/`](archive/) directory.

See [**`archive/README.md`**](archive/README.md) for the complete directory of archived projects.

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## Content

Subject to change without notice. Check the issues and pull requests to see what's in flight.
