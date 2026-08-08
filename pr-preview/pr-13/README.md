# Random Repository

This is a random repository, mostly coded by agents.

I ask agents to build or add whatever I feel like, so there isn't really any particular purpose or theme to this repository. It contains random experiments, ideas, and things I randomly ask agents to build.

Nothing here should be taken too seriously. This repository is just for fun and experimentation.

## What This Repository Currently Has

### Coding agents landing page

A static, one-page site explaining the benefits of using **coding agents** in your development workflow and on GitHub. It's plain HTML/CSS/JS with no build step — just open `index.html` or host it anywhere.

- `index.html` — Landing page markup and copy
- `styles.css` — Styling, layout, and animations (starfield, orbit rings, scroll reveals, glassy dark UI)
- `script.js` — Background animation, scroll reveal, terminal loop, card tilt

The site is deployed to GitHub Pages via `.github/workflows/pages.yml`, which also publishes a preview for every open PR.

### Agent automation

- `.github/workflows/opencode.yml` — Runs an opencode coding agent in GitHub Actions
- `.github/workflows/pages.yml` — Deploys the static site to GitHub Pages (production plus PR previews)
- `AGENTS.md` — Instructions that tell coding agents how to behave in this repo (branch + PR workflow)
