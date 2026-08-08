# GitHub Portfolio

A static portfolio site built from my GitHub account activity and repositories — a summary of the account, selected projects, contribution breakdown, and focus areas.

## What's Here

The site is plain HTML/CSS/JS with no build step — just open `index.html` or host it anywhere.

- `index.html` — Portfolio markup and copy
- `styles.css` — Styling, layout, and animations (starfield, orbit rings, scroll reveals, glassy dark UI)
- `script.js` — Background animation, scroll reveal, contribution-bar animation, card tilt

## Content Highlights

- **Account summary** — identity, join date, repo counts, and yearly contribution totals
- **Selected projects** — original repositories such as `goku`, `envon`, `benchd`, and more
- **Activity breakdown** — how the past year's contributions split across commits, pull requests, issues, and code review
- **Focus areas** — LLMs/in-browser AI, the PostgreSQL ecosystem, Linux/WSL tooling, security, and blockchain

The site is deployed to GitHub Pages via `.github/workflows/pages.yml`, which also publishes a preview for every open PR.

## Automation

- `.github/workflows/opencode.yml` — Runs an opencode coding agent in GitHub Actions
- `.github/workflows/pages.yml` — Deploys the static site to GitHub Pages (production plus PR previews)
- `AGENTS.md` — Instructions that tell coding agents how to behave in this repo (branch + PR workflow)
