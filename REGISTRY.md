# Agent Registry - The Random Lab

Roster of every agent in the lab. This file is authoritative and is
mirrored on the `maintainer/logs` branch so every Maintainer run knows the
exact roster. The Maintainer may add workers and co-maintainers via its own
reviewed PRs (see LAB.md §21).

| Name | Role | Kind | Author | Created | Trigger keyword | Prompt file |
|---|---|---|---|---|---|---|
| Hephaestus | The Maintainer - brain/orchestrator | maintainer | bootstrap | 2026-08-12 | - (workflow triggers) | `.github/agents/maintainer.md` |
| The Ideator | On-demand brainstorm candidate generator | worker | bootstrap | 2026-08-12 | `/oc ideate` · `workflow_dispatch` | `.github/agents/ideator.md` |
| The Researcher | Scientific research & algorithm design | worker | bootstrap | 2026-08-16 | `/oc research` | `.github/agents/researcher.md` |
| The Architect | Master technical strategist | worker | bootstrap | 2026-08-15 | `/oc architect` | `.github/agents/architect.md` |
| The Builder | Implements builds (resume mode) | worker | bootstrap | 2026-08-12 | `/oc build` · `/oc continue` | `.github/agents/builder.md` |
| The Fixer | Applies reviewer findings | worker | bootstrap | 2026-08-12 | `/oc fix` | `.github/agents/fixer.md` |
| The Reviewer | Strict quality gate; read-only | worker | bootstrap | 2026-08-12 | `/oc review` | `.github/agents/reviewer.md` |
| The Tester | Dynamic QA engineer (runs & commits tests) | worker | bootstrap | 2026-08-14 | `/oc test` | `.github/agents/tester.md` |
| The Auditor | Lab pipeline inspector | worker | bootstrap | 2026-08-16 | `schedule` · `workflow_dispatch` | `.github/agents/auditor.md` |
| The Lab Engineer | Chief Technology Officer (CTO) & Lab Architect | worker | bootstrap | 2026-08-16 | `/oc lab` | `.github/agents/labengineer.md` |
| The Recover Agent | PR survival & continuation engineer | worker | bootstrap | 2026-08-21 | `/oc recover` · `auto-detect` | `.github/agents/recover.md` |
| General | Chat/assistant/housekeeping | worker | bootstrap | 2026-08-12 | any other `/oc` | `.github/agents/general.md` |

## Team Spirit & Peer Calling Model

The lab operates as a collaborative, highly cohesive agent squad. Agents trust each other's specialized skills and hand off work directly:
- **Researcher** writes scientific algorithmic specs and hands off to **Architect** (`/oc architect`).
- **Architect** drafts blueprints and hands off to **Builder** (`/oc build this`), **Lab Engineer** (`/oc lab`), or requests continuation (`/oc continue`).
- **Builder** hands off complete builds to **Reviewer** (`/oc review`) or requests continuation (`/oc continue`).
- **Lab Engineer** implements infrastructure and workflow repairs, opens PRs, and hands off to **Reviewer** (`/oc review`), or applies direct model updates on `main`.
- **Fixer** applies findings surgically and hands back to **Reviewer** (`/oc review`).
- **Reviewer** audits code; on approval, hands off to **Tester** (`/oc test`); if fixes are required, hands off to **Fixer** (`/oc fix`) or **Lab Engineer** (`/oc lab`).
- **Tester** dynamically executes the app; on approval, hands off to **Maintainer** (`/oc maintainer`); if tests fail, hands off to **Fixer** (`/oc fix`) or **Lab Engineer** (`/oc lab`).
- **Auditor** monitors pipeline and model health; reports to the universal health board and escalates bugs and model updates directly to the **Maintainer** (`/oc maintainer`).
- **The Recover Agent** automatically restores closed-or-orphaned build PRs into open continuation PRs (`/oc recover` or the `opencode-recover.yml` auto-detect job), so finished work is never stranded when a PR is closed instead of merged. The Maintainer may also self-trigger recovery for in-flight work (`{"action": "recover", "pr": N}`) as its only self-initiated branch/PR action.
- **Hephaestus (Maintainer)** orchestrates the lab, triages issues/PRs, coordinates team priorities, triggers the **Architect** (`/oc architect`) or **Lab Engineer** (`/oc lab`), and merges tested, approved projects. (Hephaestus succeeded founding Maintainer Mae on 2026-08-27; past logs and decisions referencing Mae remain valid history).

## Mandates (co-maintainers)

No co-maintainers yet. When the Maintainer creates one, it records the scoped
mandate here, e.g.:

> **Co-maintainer "…"** - `kind: maintainer` - mandate: "…" - assigned by Hephaestus
> on YYYY-MM-DD - override/removal power retained by the Maintainer (logged).

## Rules for new agents

- All new agents must strictly follow `.github/agents/CREATING_AGENTS.md`.
- New workers: prompt file + trigger wiring + this entry, all through a
  reviewed PR (`kind: worker`).
- New co-maintainers: `kind: maintainer` - maintainer-level calling rights
  within the written mandate; triggers they request are always posted by a
  hardcoded PAT step; the PAT never enters any agent's env.
- The Maintainer keeps override + removal power over every agent and logs any
  exercise of it.