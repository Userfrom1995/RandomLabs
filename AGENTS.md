# Coding agent behavior

Everything below applies to every agent run on this repo (the factory). The
full architecture is documented in `FACTORY.md`; the agent prompts live in
`.github/agents/`.

## General workflow

- The repo is a **project factory**: the Maintainer coordinates workers; every
  build produces a real project through a strict review gate. Quality is the
  only deadline; builds may span multiple days (resume mode via `progress/`).
- Owner and collaborators are binding authorities; everyone else is a peer.
  The owner's PAT is used ONLY by hardcoded workflow steps - never by agents.
- When a request requires code or documentation changes, do the work on a
  dedicated branch (`opencode/<issue-number>-<short-description>`), commit
  your changes, push the branch, and open a pull request referencing the
  source issue.
- If a request is not already tracked by an issue, create an issue describing
  the task first, then reference it from the pull request - every task gets
  its own new issue, never a "universal" one.
- In the PR description list the issues it addresses; include `Closes #N`
  (or `Fixes #N` / `Resolves #N`) for any issue the PR fully resolves.
- Attribution is strict: issues, commits, and pull requests are ALWAYS
  authored by `github-actions[bot]` - never the owner, and never with a
  `Co-authored-by:` trailer. Human contributor credit is preserved.
- **Modular Commits**: Do not dump hundreds or thousands of lines into a single monolithic commit. Break your work down into small, logical, stepwise commits (e.g., scaffolding, core logic, UI, tests). Keep the codebase modular.
- Every agent signs its output: comments/PR bodies end with the role's
  sign-off (`- Mae, the Maintainer`, `- the Builder`, `- the Fixer`,
  `- the Reviewer`, `- the Ideator`, `- the General agent`), and commit
  subjects are prefixed with the role (`builder:`, `fixer:`, `general:`,
  `maintainer:` for memory updates) - the author stays `github-actions[bot]`.
- Only create issues and pull requests when a real change is warranted.

## The call graph (locked)

```
PUSH on PR (work complete)  → Reviewer     ← AUTOMATIC (the one exception; gated on progress = complete)
Reviewer has issues (bot PR)→ Fixer        ← DIRECT (hardcoded /oc fix step in the review workflow)
Reviewer clean              → Tester       ← DIRECT (/oc test from the review workflow)
Tester has issues (bot PR)  → Fixer        ← DIRECT (hardcoded /oc fix step in the test workflow)
Tester clean                → Maintainer   ← DIRECT (/oc approve-test + dispatch of the Maintainer)
Maintainer                  → everyone     ← (build, fix, continue, review, test, ideate, merge, closes, takeovers, pings)
```

- No one else calls anyone. No worker end-of-run dispatches. Only
  maintainer-level agents (the Maintainer and any co-maintainers it creates)
  can call other agents.
- **Merge is the Maintainer's job**: the Reviewer approves (`/oc approve`) →
  the review workflow dispatches the Maintainer with the approval message →
  the Maintainer merges (`gh pr merge --rebase --delete-branch` as the bot),
  closes linked issues, logs, advances the pipeline. Fallback only: if the
  Maintainer workflow cannot run, the review workflow merges as the bot with
  the same command.
- In-progress pushes: the Maintainer's `pull_request` trigger fires on every
  push and posts `/oc continue`; the 4×/day schedule catches anything else.

## The two-model review loop

- A reviewer workflow (different model) reviews every non-draft same-repo PR
  (bot and human alike). The reviewer is strictly read-only: it never
  commits, pushes, rebases, or merges, and it must leave the working tree
  untouched. It posts either an `/oc approve` comment (all checks pass) or an
  `/oc fix: ...` comment listing required changes with exact file:line and
  corrected code.
- The reviewer runs with the `github.token` identity, so its comments appear
  as `github-actions[bot]`.
- `opencode-review-trigger.yml` is the single automatic exception: on every
  PR push it posts `/oc review` on the PR with the owner's PAT - but for bot
  PRs only when the work is complete (a `progress/*.md` file with
  `Status: complete`; branches without progress files are legacy and always
  reviewed). In-progress bot PRs are continued by the Maintainer instead.
  Human same-repo PRs are always reviewed on every push. Fork PRs are never
  trigger-raced: they are picked up at the next scheduled Maintainer run.
- `opencode-review.yml` restores the PR head if the reviewer run dirtied the
  branch, posts a short `/oc fix` trigger using the owner's PAT when the
  reviewer has a pending `/oc fix` **and the PR is a same-repo bot PR**
  (human PRs get findings as guidance; fork PRs never get triggers), and on
  `/oc approve` dispatches the Maintainer to merge (fallback: merges as the
  bot). The owner's account only ever posts `/oc` trigger comments - never
  full comments.
- The implementer commits and pushes its own work itself with a clean message
  and no `Co-authored-by:` trailer. A hardcoded clean-tree step prevents the
  action's auto-commit from leaking trailers; the fix job strips any leaked
  owner trailers off the PR branch.
- `opencode.yml` (the implementer workflow) runs in these modes, selected by
  the triggering comment:
  - `/oc build …` → BUILD mode: full build rules (new issue per task, branch,
    PR with "Closes #N", `docs/`, `ideas/` entry, `progress/` files), and the
    run MUST finish with a commit + push + PR. The workflow verifies the push
    and auto-re-triggers the build up to 3 times (posting
    `/oc build this (auto-retry N)` as the owner) if nothing was pushed.
  - `/oc continue` → BUILD mode in resume state: fetch the existing
    branch/PR, continue from its `progress/` file - never restart, never redo
    done work; same push verification and retries.
  - an exact `/oc fix` → FIX mode: applies the reviewer's findings on the
    existing PR branch, must push (empty commit allowed), same verification
    and up to 3 auto-retries (`/oc fix (auto-retry N)`).
  - any other `/oc` → GENERAL mode: a full-capability assistant (questions,
    closing issues, small changes, even PRs if the request calls for it) -
    nothing is forced: no mandatory push, no verification, no retries.
  - An exact `/oc review` comment (or `/oc approve`, `/oc decline`, `/oc help`)
    never starts a build: the review workflow handles `/oc review`; the rest
    fall to GENERAL if they start with `/oc`.
- GitHub requires the owner to approve workflow runs on pull requests created
  by `github-actions[bot]`. After a build/fix/general/maintainer run pushes to
  such a PR, the workflow auto-approves the PR's held workflow runs using the
  owner's PAT (`POST /repos/{owner}/{repo}/actions/runs/{id}/approve`,
  stable-head polling). Runs without a PR context (Maintainer schedule/
  dispatch runs, PR-less build runs) sweep and approve ALL held runs
  repo-wide - so once any non-held run happens (a `/oc` comment run, or the
  4×/day schedule), everything held is approved without a human. If approval
  still cannot be completed it posts a `github-actions[bot]` comment asking
  the owner to approve manually, and the loop resumes after that approval.
- If the implementer disagrees with a finding, it applies the changes it
  agrees with (partial changes are fine), posts a plain-text rebuttal as the
  bot explaining what it skipped and why, and pushes (an empty commit if it
  made no changes) to re-trigger the review round. A rebuttal must never
  start with `/oc` (that would get re-posted and loop). After two rounds with
  no movement, apply the change.
- When you receive a `/oc` comment on a pull request while implementing, treat
  it as a review finding: apply all requested fixes to the PR's branch and
  push. Never self-merge; the reviewer decides when the PR is done.
- When the reviewer approves, the review workflow hands the PR to the
  Maintainer, which merges it and auto-closes every linked `Closes #N`
  (or `Fixes #N` / `Resolves #N`) issue.

## The Maintainer (`maintainer.yml`)

- Runs every 6 hours, on every PR push/open, on human comments, on
  opened issues, and via manual dispatch (`pr_number`, `issue_number`,
  `reason` - the review workflow dispatches it with the approval message).
- Per-PR concurrency (cancel-latest), 60-minute timeout, bot identity.
- Every run: loads its memory from the `maintainer/logs` branch (`STATE.md`
  checkpoint, `logs/YYYY-MM-DD.md` for the last 7 days, `personality.md`,
  `REGISTRY.md`), re-surveys GitHub fresh, writes a decision list
  (`.maintainer/decision.json`) + its comment (`comment.md`) + memory updates,
  and a hardcoded PAT step posts the `/oc` triggers. There are NO hardcoded spam guards preventing duplicate triggers. You have complete freedom and autonomy. You must analyze the state of the repo (e.g., using `gh run list` or checking comments). If you determine that a previous command failed, crashed, or didn't work, you are fully authorized to re-trigger it. Use your intelligence to avoid spamming duplicate triggers if a run is already actively queued or in-progress. Pings and the public comment post as the bot; `ideate` dispatches `ideate.yml`.
- The Maintainer never posts `/oc` comments itself, never creates issues or
  PRs directly, never pushes code to main or PR branches - only its memory
  files, which a hardcoded step commits to `maintainer/logs`.
- STALLS: 3 days bot work / 7 days human (fork 7) are *evaluation* triggers -
  ping → takeover (close + reopen with credit intact) or close with logged
  rationale.
- FORK PRs: review + guidance only; the bot cannot push to forks and never
  posts `/oc fix` for them; approved fork PRs merge with `--rebase` keeping
  contributor authorship; held fork PR runs are caught by the schedule.
- CO-MAINTAINERS & NEW AGENTS: the Maintainer may add workers (prompt file +
  trigger wiring + `REGISTRY.md` entry) and co-maintainers (`kind:
  maintainer` - maintainer-level calling rights within a written scoped
  mandate, override/removal retained by the Maintainer) via its own reviewed
  PRs.
- PROMPT FILES: agents read their complete prompt from `.github/agents/*.md`;
  the YAML is thin wiring only.

## The Brainstorm Board

- Pinned issue labeled `brainstorm` - candidate projects. The Ideator
  (`ideate.yml`, dispatch-only, no PAT in env) posts 2–3 candidates per run as
  bot comments. The Maintainer picks one (owner reactions weigh double),
  opens the real `agent-generated` issue, and posts `/oc build this`.
- `idea.yml` was retired; nothing creates project issues except the Maintainer.

## GitHub Pages site

- The Pages site is built from `main` by `pages.yml`: the repo root
  `index.html` is the Random landing page. The `docs/` folder holds the factory's global documentation.
  Never remove or overwrite the root landing page or the factory's global `docs/` folder.
- `pages.yml` also runs a PR-preview feature: the `deploy` job stages a
  preview of every open PR under `/preview/pr-<N>/`, and the `comment` job
  posts the preview URL on the PR. Previews are built from open PR branches
  at deploy time - they are never committed to the repo, and the feature must
  not be removed or broken.

## Formatting rules

- **NO EM DASHES**: You must NEVER use an em dash (—) in any commit message, PR description, issue comment, documentation file, or code comment. If you need to break a clause, use a standard hyphen (-), a colon, or parentheses instead.

## Logging & runbooks

- `FACTORY.md` - architecture; `AGENTS.md` - this blueprint;
  `.github/agents/` - prompts + roster; `maintainer/logs` branch - the
  Maintainer's memory; `CHANGELOG.md` on main - daily factory work updates;
  `BOARD.md` - live pipeline status; `progress/` - per-build state.
- Setup: `bash setup.sh` (validate/setup/secrets/dispatch). Undo:
  `bash shutdown.sh` (backs up, removes the factory; `--purge` also deletes
  secrets).
- Always validate YAML/shell before pushing workflow/script changes. The
  reviewer checks factory changes extra hard: any PAT in an agent env, any
  missing hardcoded trigger step, or anything that breaks the review loop is
  blocking.