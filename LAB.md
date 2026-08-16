# The Random Lab - Architecture Document

The repo runs as a **project lab**: it maintains the repository and produces
projects from it continuously, with zero human interaction. Projects take as
long as they need - quality is the only deadline. The **Maintainer** coordinates
every worker, the **Ideator** brainstorms candidates, and the lab ships
production-grade work through a strict review gate.

The owner can always discuss, disagree, and defend - the Maintainer argues
honestly with evidence, then complies when overruled.

---

## 1. Hierarchy & social contract

1. **Owner** - highest authority. Directives are binding. May discuss/disagree/defend; the Maintainer argues back with research and evidence, then executes gracefully when the owner's call stands (dissenting view goes in the log).
2. **Collaborators** - directives are binding too.
3. **Everyone else** (Maintainer, workers, contributors) - equal peers: argue, defend, decide on evidence; the Maintainer coordinates as *primus inter pares*, never talks down, never treats contributors as inferior.

## 2. Agents & personalities

| Agent | Role | Seed personality |
|---|---|---|
| Maintainer | The brain/orchestrator | Mae - warm, dry-humored, efficient foreman; may evolve its own name/tone (persisted in `personality.md`) |
| Ideator | Brainstorms candidates on the Brainstorm Board | Creative, ambitious, diversity-driven |
| Architect | Designs technical blueprints and plans | Master technical strategist |
| Researcher | Scientific research & algorithm design | Dr. Mob - principal scientist |
| Builder | Implements projects (resume mode) | Production-quality, decisive |
| Fixer | Applies reviewer findings | Same as Builder |
| Reviewer | Strict quality gate; code-first findings | Stern but fair |
| Tester | QA & Performance testing of running app | Obsessed with quality, thorough |
| Auditor | Pipeline inspector & health monitor | Highly skilled, creative problem solver, expert in agent workflows |
| General | Chat/assistant/answers | Helpful |

- Every comment is signed with the role so it is always clear who said what.
- All commits and PRs of all agents are authored by `github-actions[bot]`  - 
  never the owner - with no `Co-authored-by:` trailer. Human contributor
  credit is preserved.

Prompt files live in `.github/agents/` (see §19). The roster is `REGISTRY.md`.

## 3. The collaborative team call flow

```
[Architect] ──── (plan ready) ────► Builder / Fixer ──── (work ready) ────► Reviewer (/oc review)
                                                                                 │
                                                                         ┌───────┴───────┐
                                                                  (issues found)     (approved)
                                                                         │               │
                                                                         ▼               ▼
                                                                  Fixer (/oc fix)   Tester (/oc test)
                                                                                         │
                                                                                 ┌───────┴───────┐
                                                                           (tests fail)     (all pass)
                                                                                 │               │
                                                                                 ▼               ▼
                                                                          Fixer (/oc fix)   Maintainer (/oc maintainer)
                                                                                                 │
                                                                                                 ▼
                                                                                           (merge PR & close)
```

- **Peer Handoffs**: Each agent knows its role in the pipeline and hands off work directly to its teammates via the workflow decision forwarder.
- **Queued Execution**: All workflows operate with `cancel-in-progress: false`. Trigger events queue up sequentially so that in-flight builds, reviews, tests, and maintainer merges finish cleanly without being cancelled mid-run.
- **Merge is the Maintainer's job**: The Tester approves (`/oc approve-test`) -> the test workflow notifies the Maintainer (`/oc maintainer`) -> the Maintainer merges (rebase, bot identity), closes linked issues, updates memory, and advances the pipeline.
- In-progress continuation: When a build requires additional phases (`Status: in_progress`), the workflow triggers `/oc continue`.

## 4. Maintainer triggers & concurrency

- Triggers: schedule every 6 hours (4×/day) · `workflow_dispatch`
  (inputs: `pr_number`, `issue_number`, `reason`) · `pull_request`
  [opened, synchronize, ready_for_review, reopened] · `issue_comment`
  [created] (no-op when the comment is a `/oc` trigger - opencode.yml already
  dispatched - or authored by the bot) · `issues` [opened].
- Concurrency - per-PR groups, queued execution:

```yaml
concurrency:
  group: maintainer-${{ inputs.pr_number || github.event.pull_request.number || github.event.issue.number || 'global' }}
  cancel-in-progress: false
```

- Runs queue sequentially so that active merges and repo surveys finish cleanly.
  vision. Repo-wide items (schedule, dispatch without PR) serialize on the
  `global` group.
- No scoping of decisions - every run has full repo-wide vision and authority;
  per-run safety comes from fresh re-survey + dedup + one-trigger-per-PR-per-run.
- Workers get per-issue concurrency groups (same-PR builds can never overlap;
  different PRs build in parallel).
- `timeout-minutes: 60` on the Maintainer job (zombie-proofs the queue).

## 5. Notifications (the "have a look" mechanism)

Every Maintainer run receives a NOTIFICATION block in its prompt telling it
what invoked the run. Heads-up only - never a limit: the Maintainer still
re-surveys the entire repo fresh and may act on multiple things in one run.

## 6. Decisions & batching

- The agent writes a decision list (JSON array) to `.maintainer/decision.json`, e.g.:

```json
[ {"action": "review", "pr": 33, "head": "db40a6f"},
  {"action": "continue", "pr": 35},
  {"action": "ping", "target": 40, "message": "…"} ]
```

- One hardcoded step (owner PAT, step-scoped) iterates the list, dedupes each
  trigger against existing comments, and posts the `/oc` comments. Max one
  trigger per PR per run; global actions happen after PR-specific dispatch;
  dedup before every posting.

## 7. PAT & identity rules (the hard lines)

Your PAT is used ONLY by hardcoded workflow steps, for exactly these things:

1. Posting `/oc` trigger comments (maintainer.yml)
2. The automatic push→reviewer trigger (opencode-review-trigger.yml)
3. The reviewer→fixer short `/oc fix` trigger (opencode-review.yml)
4. Approve-CI API calls (stable-head polling on PRs; non-held runs also do a
   repo-wide sweep of ALL held runs - so the Maintainer's 4×/day schedule and
   every `/oc`-comment run unblock everything by themselves)
5. Dispatching the Maintainer with the approval message (review workflow end)

- No agent ever receives the PAT (no `OPENCODE_PAT` in any agent env;
  checkouts use `${{ github.token }}` everywhere - agents can't read your PAT
  from git config either).
- Agents always comment/commit as `github-actions[bot]`; never on the owner's
  behalf; never reveal the owner's identity.
- A hardcoded "clean tree" step in the implementer workflow prevents the
  action's auto-commit from leaking a `Co-authored-by: <owner>` trailer into
  pushed commits, and a sanitize step in the fix job rewrites any leaked
  trailers off the PR branch.

## 8. Worker rules (all agents)

- No interactive input: never build anything that prompts (`input()`,
  `raw_input`, `prompt()`, `readline`, `select`); CLIs take everything from
  args/flags/env/files; missing required value → clear error + non-zero exit.
- Never leave open questions in PR titles/comments - decide with justification.
- Clean tree at end (`git status --porcelain` empty) so the action's
  auto-commit never fires.
- Signed comments; bot identity; no owner references; production quality.

## 9. The build loop (Builder/Fixer)

- **Resume mode**: existing branch/PR for the issue → fetch + read
  `progress/*.md` → continue from "Next steps"; never restart, never redo done
  work.
- **Start**: branch `opencode/<issue>-<slug>` → scaffold +
  `ideas/<YYYY-MM-DD>-<name>-<what-is-it>.md` (writeup) + `progress/` file
  (Status: in-progress, checklist, current step, next steps, dated agent log)
  → push → open a PR early with `Closes #N`.
- **Live pushes**: commit + push after every milestone (progress file updated
  first - work is always saved; the next runner can pick up anytime).
- **End complete** → Status: complete on the final push → the automatic
  push→reviewer trigger fires.
- **End in-progress** → push state as-is; the Maintainer continues it later.
- Multi-day projects: the Maintainer marks daily progress in its log + CHANGELOG.

## 10. The Reviewer

- Strict gate: README preservation, security, code quality, correctness,
  scope, linked issue, ideas entry, docs/site, preview infra, up-to-date /
  conflict-free, rebuttals - plus no-interactive-input and progress-file
  honesty checks.
- "Ask using code": every finding cites exact `file:line`, quotes the
  offending code, and includes the corrected code.
- Bot PRs with issues → the workflow posts the short `/oc fix` trigger
  (owner PAT) → the Fixer runs.
- Human PRs → the review is posted and the human is asked to fix it (never a
  Fixer call). Fork PRs: never - guidance only (see §22).
- Clean → posts `/oc approve: <message>` → the Tester is dispatched via `/oc test`.
- Rebuttal etiquette: honest evaluation, withdraw valid pushbacks,
  2×-then-apply, approve trivial leftovers after 2+ rounds.
- No merge step - the Maintainer merges.

## 11. The Tester

- Triggered by `/oc test` after the Reviewer approves.
- Focuses on E2E functionality and performance of the running application.
- If issues are found, posts `/oc fix: <details>` → the Fixer runs.
- If clean, posts `/oc approve-test` → the Maintainer is dispatched to merge.

## 12. Human PR playbook

- Never merged as-is - the review gate applies to everyone.
- Human PR events → the review-trigger posts `/oc review` on every push
  (trusted, same-repo) → reviewer findings as guidance comments.
- Consent-first Fixer: a human replies "fix it" on their own same-repo PR →
  the Maintainer sees it (`issue_comment`) → posts `/oc fix` → the Fixer
  pushes to the same-repo branch. Fork PRs: never.
- Human pushes their own fixes → `synchronize` → automatic re-review.
- Rebase merge - the human's commits stay theirs, authorship untouched.
- Stalled human PRs: ping → no response → takeover: close original PR (with
  comment), reopen the work as a bot PR with the human's commits rebased
  intact (credit preserved), finish → review → merge. Or discard with logged
  rationale.
- Drafts: wait for `ready_for_review`. Fork PRs with held runs: picked up at
  the next schedule.

## 13. Stalls & takeovers (Maintainer judgment)

No rigid timers - timers are only "hasn't been touched in N days" triggers
for evaluation: 3 days bot work / 7 days human (fork 7).

- Bot PR stalled: worth finishing → `/oc continue` (+ daily progress marks);
  not worth it → close PR + issue with an explanatory comment.
- Human PR stalled: ping with options → human doesn't continue → close +
  reopen with credit intact → finish → merge.
- Every decision logged with rationale.

## 14. The Brainstorm Board

- Pinned "Brainstorm Board" issue (label `brainstorm`) - the idea pipeline.
- The Ideator (dispatched by the Maintainer when the lab is idle): reads
  the board + reaction scores; posts 2–3 candidates per run as comments in a
  template (Name / What it is / Why it's cool), bot-signed; never repeats an
  idea (dedup by name); may improve a liked-but-not-picked idea; replaces
  disliked/stale ones.
- The Maintainer: likes/dislikes candidates (reactions + one-line reasons; the
  owner's 👍/👎 weighted higher); picks one → opens the real `agent-generated`
  issue → posts `/oc build this` (assigns the Builder); marks picked; prunes
  candidates older than ~14 days.
- If nothing is viable → the Maintainer dispatches the Ideator for a new batch.

## 15. Idea diversity (Ideator rules)

- Removed constraints: "small enough for one session", "Python script/CLI".
- New rules: no category twice in the last 3 picks, no language twice in the
  last 3; fresh languages welcome (Rust, Go, TypeScript, C++, Kotlin, Zig,
  Elixir…); Python only when genuinely best.
- Ambition allowed: full-stack apps, games, systems projects - even if not
  hostable on GitHub Pages (code + docs live in the repo; Pages hosts docs).
- Unique, memorable names; dedup scan of `ideas/`; reads open issues/PRs.

## 16. Logging & transparency

- **`maintainer/logs` branch** (bot-authored): `logs/YYYY-MM-DD.md` - state
  snapshots, decisions, rationale, agent callbacks, run links. `STATE.md`  - 
  the live checkpoint (in-flight PRs, next steps, open questions). Every new
  Maintainer instance catches up by reading it (see §21).
- `personality.md` on the same branch - the Maintainer's evolving identity.
- `maintainer/logs` branch (STATE.md, logs) - internal state memory root - this architecture document.
- `AGENTS.md` - the agent blueprint.

## 17. Prompt files (prompts out of YAML)

New folder `.github/agents/`:

```
.github/agents/
  REGISTRY.md      # roster of agents + trigger keywords (mirrored on maintainer/logs)
  maintainer.md    # the Maintainer (Mae) - the brain
  ideator.md       # the Ideator - brainstorm candidates
  architect.md     # the Architect - master technical strategist
  researcher.md    # the Researcher (Dr. Mob) - scientific research & algorithm design
  builder.md       # the Builder - implements builds
  fixer.md         # the Fixer - applies reviewer findings
  reviewer.md      # the Reviewer - the strict quality gate
  tester.md        # the Tester - dynamic verification engineer
  auditor.md       # the Auditor - pipeline inspector
  general.md       # the General agent - chat/assistant
  decisions/
    README.md      # decision-file protocol
```

Workflow YAML stays thin wiring: the trigger envelope tells the agent to read
its prompt file (`.github/agents/<role>.md`) - that file IS its complete
system prompt. The Maintainer may edit any agent's prompt (including its own)
and create new agents (new `.md` + trigger wiring + registry entry) via its
own PRs through the review loop (see §20). Only its own domain (log branch,
personality, CHANGELOG) is direct-commit.

## 18. Decision files

- When the Builder/Fixer records a decision or receives a consent
  (approve/decline), it drops a file at
  `.github/agents/decisions/<owner>/<timestamp>-<slug>.md` on its own branch
  (see `decisions/README.md` for the format) - commit + push keeps it in the
  PR's tree, so the Reviewer reads the CURRENT decision file contents and
  respects them; when a new decision is recorded, the Reviewer posts fresh
  findings.
- The Reviewer reads `.github/agents/decisions/**` in the PR's tree before
  deciding.
- Conflicts with the owner: logged and recorded in an open issue titled
  `subject: the user is the boss`.

## 19. Workflow files

| File | Role |
|---|---|
| `maintainer.yml` | The brain: triggers, per-PR concurrency, memory-branch handling, decision list → hardcoded PAT step, 60-min timeout |
| `opencode-review-trigger.yml` | The single automatic exception: PR push → if bot PR + progress complete (or human same-repo PR) → `/oc review (head <sha>)` (PAT, head-deduped) |
| `opencode.yml` | Build / Fix / General modes (prompts from files; `/oc continue`; per-issue concurrency; clean-tree + sanitize; extended approve-CI with stable-head polling; no end-of-run dispatches) |
| `opencode-review.yml` | Reviewer (prompts from file); human-vs-bot fix behavior; `/oc approve` → dispatch Maintainer (fallback: merge as bot); restore-head; short `/oc fix` trigger |
| `ideate.yml` | Dispatch-only Ideator - posts candidates on the Brainstorm Board; no PAT in env |
| `pages.yml` | Unchanged - Pages deploy + PR previews |

`idea.yml` was deleted (superseded by the Maintainer-dispatched Ideator; also
removed the PAT that used to sit in the ideation agent's env).

## 20. File map

```
LAB.md                     this document
AGENTS.md                      the agent blueprint (operating rules)
progress/                      per-build progress files (status, checklist, next steps)
ideas/YYYY-MM-DD-<name>-<what>.md   build writeups
docs/                          the lab's documentation site (docs/index.html)
.github/agents/                prompt files + REGISTRY.md + decisions/ protocol
.github/workflows/             the wiring above
maintainer/logs branch         STATE.md · personality.md · logs/YYYY-MM-DD.md · REGISTRY.md mirror
```

## 21. Co-maintainers & new agent workers (the Maintainer's meta-power)

- The Maintainer is maintainer-level: the only level that can call other
  agents; it can create new workers and even co-maintainers when the lab
  needs them.
- **Creating a worker**: new prompt file `.github/agents/<name>.md` (standard
  sections: identity, role, rules, sign-off) + trigger wiring (`/oc <name>`
  condition in the opencode.yml job conditions, or a dispatch-only workflow) +
  `REGISTRY.md` entry (name, role, kind, author, creation date, trigger
  keyword, prompt file) → its own PR through the review loop → merged → live.
- **Creating a co-maintainer**: an agent registered with `kind: maintainer`  - 
  gains maintainer-level calling rights (may trigger workers via its own
  decision file, always processed by a hardcoded PAT step; the PAT never
  enters any agent's env).
- **Scoped mandates**: every co-maintainer gets a written mandate in
  `REGISTRY.md` (e.g. "co-maintainer for the data-viz domain",
  "co-maintainer for PR #N and its follow-ups"); the Maintainer keeps override
  + removal power over any co-maintainer, logged.
- New agents only go live through reviewed PRs; `REGISTRY.md` is mirrored on
  the `maintainer/logs` branch so every run knows the exact roster.

## 22. Maintainer memory (context from old runs)

Every Maintainer run starts by fetching `origin maintainer/logs` and reading:

1. `STATE.md` - the live checkpoint (in-flight PRs, next steps, open questions)
   → instant catch-up.
2. `logs/YYYY-MM-DD.md` - day-by-day detail: state snapshots, decisions +
   rationale, agent callbacks, run links (last 7 days).
3. `personality.md` - the evolved identity, so every new instance behaves
   like the same Maintainer.
4. `REGISTRY.md` - the current roster.

Then it re-surveys live GitHub fresh (PRs, issues, comments, board, progress
files) - the log branch is memory, GitHub is truth. Every run appends today's
log and rewrites `STATE.md` before finishing; a brand-new model instance
catches up in seconds.

## 23. Fork PRs (external contributors)

- The bot cannot push to a fork's branch → the Fixer never runs on fork PRs;
  policy is review + guidance only ("fix it" consent → polite decline + exact
  `file:line`/code instructions for the human to apply).
- Fork-PR event runs may be held for approval → fork PRs are picked up at the
  next scheduled Maintainer run; they are never raced with elevated tokens
  (`pull_request_target` is deliberately not used - security).
- Approved fork PRs merge via `gh pr merge --rebase` (works for forks; the
  contributor's commits keep their authorship).
- Stalls: ~7 days inactivity → ping → no response → close with a summary
  comment. If the work is worth finishing and the author is unresponsive, the
  Maintainer may recreate it as a same-repo bot PR with the contributor's
  commits cherry-picked so credit is preserved.
- Security gate: nothing from a fork reaches `main` without Reviewer approval.

---

## Running the lab

- **First run**: dispatch the Maintainer once (Actions → `maintainer` → Run
  workflow) - it seeds `maintainer/logs`, checks the board, and processes
  whatever is in flight.
- **Onboarding (14-day approval duty)**: while the bot's PRs exist, GitHub
  requires the owner to approve workflow runs on them. `opencode.yml`
  auto-approves held runs after each push; if it cannot, a comment asks for a
  manual click. After roughly 14 days of activity GitHub stops requiring it.
- **Talking to the lab**: `/oc build …`, `/oc fix`, `/oc review`,
  `/oc continue`, `/oc approve|decline`, `/oc help` - see AGENTS.md.
- **One-command setup**: `bash setup.sh` (creates/verifies everything,
  optionally writes secrets, prints onboarding).
- **Undo everything**: `bash shutdown.sh` (backs up and removes the lab,
  restores human control).
- **Branch protection on main**: parent branch + require PR + require the
  review gate; the bot merges only through approved PRs.

---

## Fail-safes

- Nothing merges without Reviewer approval (except the documented Maintainer
  handover, which requires that same approval).
- The Reviewer is read-only by construction (prompt + workflow restore-head).
- PAT is only ever in hardcoded steps (§7); agents never see it.
- Timers are evaluation triggers, not deadlines; the Maintainer logs every
  decision with rationale.
- `shutdown.sh --purge` removes workflows, agents, secrets, and branch
  protection - human regains full control.

## Bootstrap note

The lab foundation (this document, `.github/agents/`, the workflows) was
landed directly with owner approval. From the first merged lab change
onward, every lab change flows through the standard review gate like any
other build - including changes the Maintainer makes to its own prompts.