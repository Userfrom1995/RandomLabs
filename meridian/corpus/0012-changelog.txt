# CHANGELOG

Daily factory work updates — the public summary of what the agents did. The
Maintainer appends an entry at the end of every day (through reviewed PRs).

## 2026-08-12 — The factory boots

- **Factory foundation shipped**: the Maintainer (Mae), the Ideator, the
  Builder, the Fixer, the Reviewer, and the General agent now run the repo —
  documented in `FACTORY.md`, prompts in `.github/agents/`, wired by
  `maintainer.yml` (+ `opencode.yml`, `opencode-review.yml`,
  `opencode-review-trigger.yml`, `ideate.yml`).
- **New order**: the Reviewer approves → hands over to the Maintainer → the
  Maintainer merges (rebase, bot identity) and closes linked issues.
- **Memory**: `maintainer/logs` branch (STATE.md, personality.md, daily logs)
  — every Maintainer run catches up from it.
- **Daily ideation retired**: the Ideator is now dispatched by the Maintainer
  and posts candidates on the Brainstorm Board.
- `setup.sh` (one-command setup/validation) and `shutdown.sh` (undo the
  factory) added.