# Tic-Tac-Toe

A clean, responsive Tic-Tac-Toe game built with plain HTML, CSS, and JavaScript — no dependencies, no build step. Play a friend on the same device or challenge the computer.

## How to Play

Open `index.html` in a browser or host the repo on GitHub Pages. Click any empty cell to place your mark. Get three in a row (horizontal, vertical, or diagonal) to win.

## Features

- **Two modes** — 2-player (pass-and-play) or single-player against the computer
- **Difficulty levels** — *Easy* (random moves) or *Hard* (unbeatable minimax AI)
- **Scoreboard** — tracks wins for each player and draws across the session
- **Status bar** — shows whose turn it is, announces wins and draws
- **Winning line highlight** — the three winning cells light up
- **Responsive** — works great on desktop and mobile

## Files

- `index.html` — Game markup
- `styles.css` — Styling and layout (dark, glassy theme)
- `script.js` — Game logic: state, win detection, scoring, and the minimax AI

## Automation

- `.github/workflows/pages.yml` — Deploys the game to GitHub Pages (production plus PR previews)
- `.github/workflows/opencode.yml` — Runs an opencode coding agent in GitHub Actions
- `AGENTS.md` — Instructions that tell coding agents how to behave in this repo (branch + PR workflow)
