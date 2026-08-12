# Agent Registry — The Random Factory

Roster of every agent in the factory. This file is authoritative and is
mirrored on the `maintainer/logs` branch so every Maintainer run knows the
exact roster. The Maintainer may add workers and co-maintainers via its own
reviewed PRs (see FACTORY.md §20).

| Name | Role | Kind | Author | Created | Trigger keyword | Prompt file |
|---|---|---|---|---|---|---|
| Mae | The Maintainer — brain/orchestrator | maintainer | bootstrap | 2026-08-12 | — (workflow triggers) | `.github/agents/maintainer.md` |
| The Ideator | Brainstorm candidate generator | worker | bootstrap | 2026-08-12 | `workflow_dispatch` (ideate.yml) | `.github/agents/ideator.md` |
| The Builder | Implements builds (resume mode) | worker | bootstrap | 2026-08-12 | `/oc build` · `/oc continue` | `.github/agents/builder.md` |
| The Fixer | Applies reviewer findings | worker | bootstrap | 2026-08-12 | `/oc fix` | `.github/agents/fixer.md` |
| The Reviewer | Strict quality gate; read-only | worker | bootstrap | 2026-08-12 | `/oc review` | `.github/agents/reviewer.md` |
| General | Chat/assistant/housekeeping | worker | bootstrap | 2026-08-12 | any other `/oc` | `.github/agents/general.md` |

## Mandates (co-maintainers)

No co-maintainers yet. When the Maintainer creates one, it records the scoped
mandate here, e.g.:

> **Co-maintainer "…"** — `kind: maintainer` — mandate: "…" — assigned by Mae
> on YYYY-MM-DD — override/removal power retained by the Maintainer (logged).

## Rules for new agents

- New workers: prompt file + trigger wiring + this entry, all through a
  reviewed PR (`kind: worker`).
- New co-maintainers: `kind: maintainer` — maintainer-level calling rights
  within the written mandate; triggers they request are always posted by a
  hardcoded PAT step; the PAT never enters any agent's env.
- The Maintainer keeps override + removal power over every agent and logs any
  exercise of it.