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

The current build is **Cadence** — a terminal sorting-algorithm visualizer
with audio sonification. It animates nine classic sorting algorithms
(bubble, insertion, selection, quicksort with Hoare or Lomuto partitioning,
merge, heap, cocktail, and a bogo sort for fun) live in the terminal as ASCII
bars while every comparison and swap rings out as a pitch-mapped tone — so you
can *hear* bubble sort's largest values climb and *hear* why O(n log n) beats
O(n²). It renders the run to a WAV file, streams live beeps, prints live
stats, and a `--race` scorecard runs every algorithm head-to-head on the same
input — nothing but the Python standard library.

→ [Run it: `python3 -m cadence`](https://github.com/Userfrom1995/Random/blob/main/cadence/README.md) · [Full writeup](ideas/2026-08-12-cadence-sorting-visualizer-with-sound.md) · [Documentation](https://userfrom1995.github.io/Random/docs/)

This will change as new ideas are built by the agents.

## Previous Ideas

- **Regexplorer** — a visual regex engine that animates NFA matching in the
  terminal. It parses a small regex subset into an AST, builds the classic
  Thompson NFA, draws the state machine as an ASCII graph, and steps a string
  through it frame-by-frame so you can watch which transitions fire, where
  greedy backtracking gives input back, and whether the match succeeds. Two
  honest engines — linear set-of-states NFA simulation (leftmost shortest) and
  greedy recursive backtracking (leftmost longest) — make catastrophic patterns
  like `(a+)+b` a one-command demo. See
  [ideas/2026-08-11-regexplorer-visual-regex-engine.md](ideas/2026-08-11-regexplorer-visual-regex-engine.md).
- **Fernwald** — a terminal L-system fractal garden that grows procedural
  plants, trees, and fractals from grammar rules and renders them as ASCII art
  or SVG. Seven presets, custom grammars, seeded stochastic gardens, and growth
  animation. Nothing but the Python standard library. See
  [ideas/2026-08-10-fernwald-terminal-lsystem-garden.md](ideas/2026-08-10-fernwald-terminal-lsystem-garden.md).
- **Shaftcast** — a first-person raycasting engine that renders a pseudo-3D,
  Wolfenstein-style view straight into your terminal using DDA ray casting and
  distance-based ASCII shading, with first-person WASD movement, per-tile
  textures, a minimap overlay, and a maze generator. Nothing but the Python
  standard library. See [ideas/2026-08-09-shaftcast-terminal-raycasting.md](ideas/2026-08-09-shaftcast-terminal-raycasting.md).
- **Redline Rush** — a top-down arcade car racing game that runs in any
  browser; steer a four-lane highway at ever-increasing speed and grab fuel
  cans before the tank runs dry. Canvas 2D + Web Audio, zero assets, works
  offline. See [ideas/2026-08-08-redline-rush-top-down-arcade-racer.md](ideas/2026-08-08-redline-rush-top-down-arcade-racer.md).
- **Rotoria** — a terminal Enigma machine cipher simulator that reproduces the WWII Enigma's rotor stepping (including the famous double-step), plugboard, ring settings, and reflectors, using nothing but the Python standard library. See [ideas/2026-08-08-rotoria-terminal-enigma-simulator.md](ideas/2026-08-08-rotoria-terminal-enigma-simulator.md).
- **Homunculus** — a genetic-algorithm CLI that evolves a population of random strings into an exact target phrase, using nothing but the Python standard library. See [ideas/2026-08-08-homunculus-genetic-algorithm.md](ideas/2026-08-08-homunculus-genetic-algorithm.md).
- **Arpeggio** — a Markov-chain melody composer that renders original tunes to WAV from the terminal, using nothing but the Python standard library. See [ideas/2026-08-08-arpeggio-markov-melody-composer.md](ideas/2026-08-08-arpeggio-markov-melody-composer.md).
- **Automatarium** — a dependency-free Python CLI that renders classic cellular automata (Rule 30, Conway's Game of Life, and Langton's Ant) live in the terminal. See [ideas/2026-08-08-automatarium-cellular-automata.md](ideas/2026-08-08-automatarium-cellular-automata.md).
- **Tic-Tac-Toe** — browser game with PvP, vs-Computer modes, and an unbeatable minimax AI. See [ideas/2026-08-08-tic-tac-toe-minimax-ai.md](ideas/2026-08-08-tic-tac-toe-minimax-ai.md).

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

## Content

Subject to change without notice. Check the issues and pull requests to see what's in flight.
