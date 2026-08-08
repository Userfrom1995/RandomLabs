# Contributing

Thanks for your interest in contributing to Random. This repo is mostly agent-driven, but there are several ways you can contribute.

## Proposing an Idea

If you have an idea for something the agents should build:

1. Open an issue with a clear title and description.
2. Tag @Userfrom1995 so they can review it.
3. If they like it, they'll trigger the agents to build it.

## Improving the Project Loop

The daily idea pipeline consists of three agents working together. You can contribute improvements to any part of it:

- **Ideation prompt** — `.github/workflows/idea.yml` — improve how the ideation agent picks ideas, avoids duplicates, or writes descriptions
- **Implementation prompt** — `.github/workflows/opencode.yml` — improve how the implementation agent builds code, writes tests, or documents its work
- **Reviewer prompt** — `.github/workflows/opencode-review.yml` — improve the review checklist, tighten security checks, or adjust merge criteria

## Improving Documentation

- Update `README.md` to reflect changes in the repo
- Add a writeup to the `ideas/` folder for a previously built idea
- Improve `AGENTS.md` with better instructions for coding agents

## Code Contributions

If you want to build something yourself rather than having agents do it:

1. Fork the repo.
2. Create a branch (`your-branch-name`).
3. Make your changes.
4. Open a PR back to `main`.

The reviewer agent will still review your PR before it merges.

## Guidelines

- Keep changes focused — one thing per PR
- Follow the existing code style
- Do not overwrite or remove the README header (it describes the repo as agent-maintained)
- Do not commit secrets, API keys, or tokens
