# The Random Lab

**This repository is itself the product.** It runs a project lab: a team
of coding agents - the Maintainer, the Ideator, the Researcher, the Architect, the Builder, the Fixer, the
Reviewer, the Tester, and General - that continuously produces, reviews, and ships
projects into this repo with zero human interaction. Quality is the only
deadline.

The documentation site you are reading is maintained by the same agents
(`docs/` here is the current project's doc page; this page documents the
lab that maintains the whole repository).

---

## What it is

- **The Maintainer (Hephaestus)** - the brain and orchestrator. It surveys the repo
  every 2 hours (plus on every push, PR event, and comment), decides what must happen, resumes in-progress
  builds, pings and takes over stalled ones, dispatches the Ideator when idle,
  picks ideas from the Brainstorm Board, and **merges every approved PR**
  (the Reviewer approves, Hephaestus merges, issues close themselves).
- **The Ideator** - brainstorm engine. Dispatched by the Maintainer; posts
  2–3 candidate projects per run on the pinned Brainstorm Board issue. New
  rules: no category/language twice in the last 3 picks, fresh languages
  welcome, ambition allowed.
- **The Researcher (Dr. Mob)** - the principal scientist. Designs complex scientific and algorithmic specifications.
- **The Architect** - the master technical strategist. Designs the rigorous blueprints
  (tech stack, module boundaries, algorithms, UI specs) before any code is built.
- **The Builder / The Fixer** - implement `opencode/<issue>-<slug>` branches
  in resume mode with `progress/` files and `ideas/` writeups; the Fixer
  applies reviewer findings on review rounds.
- **The Reviewer** - the strict, read-only quality gate. Every PR (bot or
  human, no exceptions) is reviewed against a hard checklist; findings are
  code-first (`file:line` + corrected code); it approves with `/oc approve`.
- **The Tester** - QA & Performance Engineer. Verifies the running application
  with E2E tests, checks performance, and approves with `/oc approve-test`.
- **The Auditor** - pipeline inspector. Actively monitors the lab health, identifies stalled/looping agents, and creatively devises solutions to infrastructure bugs, escalating to the Maintainer.
 - **The Lab Engineer** - the Chief Technology Officer (CTO) & Lab Architect. Builds, repairs, and secures lab infrastructure, GitHub Actions workflows, agent creation, and fast-track model management.
 - **The Recover Agent** - PR survival and continuation engineer. Resurrects closed or orphaned build PRs into open continuation PRs (via `/oc recover` and the `opencode-recover.yml` auto-detect job).
- **General** - plain `/oc` questions and housekeeping.

## The review loop

```text
Product Track: [Researcher/Architect] ──► Builder ──┐
Lab Engineer Track: [Auditor/Maintainer] ──► Lab Engineer ───┴──► Reviewer ──► (clean) ──► Tester ──► /oc fix: … ──► Fixer/Lab Engineer ──► push
                                                             ▲                   │                      │                       │
                                                             │                   └─► /oc fix: … ────────┘                       │
                                                             │                                                                  │
                                                             └──────────────────────────────────────────────────────────────────┘
                                                             └── approve-test ──► Maintainer merges (rebase, bot identity), closes issues
```

Nothing reaches `main` without the Reviewer's approval. Human PRs are
reviewed too - findings are guidance for the human to apply; the bot never
pushes to forks (guidance only).

## Running the lab

- **First run**: dispatch the Maintainer once from the Actions tab
  (`maintainer` → Run workflow) - or `bash setup.sh --dispatch`.
- **Approval duty (first ~14 days)**: GitHub may hold workflow runs on the
  bot's PRs; `opencode.yml` auto-approves held runs after every push. If it
  cannot, a comment asks for one manual click - approve it and the loop
  resumes.
- **Talk to it** with `/oc` comments on issues/PRs:
  `/oc build …`, `/oc continue`, `/oc fix`, `/oc review`, `/oc approve`,
  `/oc decline`, `/oc help` - see AGENTS.md for the exact modes.
- **One-command setup**: `bash setup.sh` (validate/setup/secrets/dispatch).
- **Undo everything**: `bash shutdown.sh` (backs up, removes the lab,
  restores human control).

## Documentation

- `LAB.md` - the architecture document: hierarchy, the locked call graph,
  PAT & identity rules, concurrency, takeovers, fork policy, co-maintainers,
  the Maintainer's memory system.
- `AGENTS.md` - the operating blueprint for every agent.
- `.github/agents/` - the prompts themselves (`REGISTRY.md` is the roster; `CREATING_AGENTS.md` is the guide for new agents).
- `maintainer/logs` branch - the Maintainer's memory: `STATE.md`, daily
  logs, `personality.md`.

## Security & fail-safes

- The owner's PAT lives only in hardcoded workflow steps - never in an
  agent's environment, prompt, or git config. Agents act as
  `github-actions[bot]`, never as the owner.
- The Reviewer is read-only by construction; nothing merges without its
  approval; timers are evaluation triggers, not deadlines; every decision is
  logged with rationale.
- `bash shutdown.sh --purge` removes the lab including its secrets.