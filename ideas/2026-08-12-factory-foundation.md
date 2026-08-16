# The Random Lab — a self-maintaining project repository

**What it is:** the Random repo itself becomes the product: a "lab" of
coding agents that continuously produces, reviews, and ships projects into the
repository with zero human interaction.

## Why

The repo already ran a daily-idea pipeline (cron ideation → implementer →
reviewer → merge). The lab takes that to its logical end: instead of one
daily bolt-on, the **whole loop becomes the architecture** — a Maintainer
brain with memory, a brainstorm board, a locked call graph, and a strict
review gate that even the lab's own changes must pass.

## How it works

- **The circuits** — push (work complete) → Reviewer → `/oc fix` → Fixer →
  push; on `/oc approve` the Reviewer hands over to the **Maintainer**, who
  merges (rebase, bot identity) and closes linked issues. This is the only
  call graph; nothing else may call anything (hardcoded auto-triggers excepted).
- **The Maintainer (Mae)** — runs 2×/day + on every repo event; reads its own
  memory from the `maintainer/logs` branch (`STATE.md` checkpoint, daily logs,
  `personality.md`), re-surveys live GitHub, then emits a decision list that a
  hardcoded step converts into `/oc` triggers. It merges approved PRs,
  continues in-progress builds, handles stalls/takeovers — and can create new
  workers and co-maintainers through reviewed PRs.
- **PAT discipline** — the owner's PAT exists only in hardcoded workflow
  steps; agents never see it, always act as `github-actions[bot]`.
- **The Ideator** — dispatch-only now; posts candidates on a Brainstorm
  Board; the Maintainer picks.
- **Anchors** — `LAB.md` documents everything; prompts live in
  `.github/agents/`; `setup.sh`/`shutdown.sh` are the one-command on/off
  switches.

## Key files

- `LAB.md` — the architecture document (hierarchy, call graph, PAT rules,
  concurrency, forks, co-maintainers, memory).
- `.github/agents/` — maintainer/ideator/builder/fixer/reviewer/general
  prompts + `REGISTRY.md` + decisions protocol.
- `.github/workflows/` — `maintainer.yml`, `opencode.yml`,
  `opencode-review.yml`, `opencode-review-trigger.yml`, `ideate.yml`
  (`idea.yml` retired), `pages.yml` untouched.
- `maintainer/logs` branch — STATE.md, personality.md, daily logs.
- `progress/`, `BOARD.md`, `CHANGELOG.md`, `docs/` — the lab's workspace.

## Notes

- The review gate applies to everyone, including the lab's own changes —
  the foundation itself was owner-approved while being built; every lab
  change after this commit goes through the gate like any build.
- Builds may span multiple days; quality is the only deadline.
- The owner stays the highest authority: directives bind, arguments are heard,
  dissents are logged; `shutdown.sh --purge` undoes everything.