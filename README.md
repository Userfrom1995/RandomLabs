# Random

This repo contains random ideas and projects. Almost all the code here is written, maintained, and reviewed by coding agents.

## What This Repo Is

I just ask agents to build whatever I like — it's all driven from a random chat. The intent of the agent can be anything at a time: maybe a game, maybe a protocol, maybe just something I feel like.

Since it's totally random and built by agents, the content keeps changing depending on whatever I feel like. As the name says: it's random. Code and stuff here should not be taken seriously.

## How to Contribute an Idea

If you have an idea you'd like the agents to build:

1. Open an issue describing your idea.
2. Tag me (@Userfrom1995).
3. If I like the idea, I'll trigger the agents to build it.

You can also improve the project itself — see [CONTRIBUTING.md](CONTRIBUTING.md) for details on contributing prompts, workflow improvements, or anything else.

## Daily Auto-Generated Ideas

This repo runs on autopilot. Every day, an ideation agent picks a unique idea, opens an issue, and the implementation agent builds it. A reviewer agent then checks it before it goes live.

- **Ideation agent** — generates the idea and opens an issue (runs daily at 09:00 UTC via a cron job, or manually triggered from the Actions tab)
- **Implementation agent** — builds the code on a branch, opens a PR
- **Reviewer agent** — reviews the PR and merges it if it passes

You can also trigger the daily idea manually: go to Actions → "daily-idea" → Run workflow.

All powered by [opencode](https://opencode.ai).

## Current Project

The current codebase is a **Tic-Tac-Toe game** — a browser-based game with PvP and vs Computer modes, an unbeatable minimax AI, and a dark glassy UI.

→ [Read the full writeup](ideas/2026-08-08-tic-tac-toe-minimax-ai.md)

This will change as new ideas are built by the agents.

## Previous Ideas

Each built idea has a detailed writeup in the `ideas/` folder, named with the date and a short description of what was built.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

## Content

Subject to change without notice. Check the issues and pull requests to see what's in flight.
