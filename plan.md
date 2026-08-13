THE RANDOM FACTORY — FINAL ARCHITECTURE PLAN
1. Vision & Mission
- The repo is the Random Project Factory: it maintains the repository and produces world-class projects from it, continuously, with zero human interaction.
- No time strain: projects take as long as they need; quality is the only deadline. Builds may span multiple days/runs.
- The Maintainer (the boss) coordinates all workers; the Ideator brainstorms new projects via the idea workflow; the factory ships production-grade work through a strict review gate.
- The owner can always discuss, disagree, and defend — the Maintainer argues honestly with evidence, then complies when overruled.
2. Hierarchy & Social Contract
1. Owner — highest authority. Directives are binding. May discuss/disagree/defend; the Maintainer argues back with research and evidence, then executes gracefully when the owner's call stands (dissenting view goes in the log).
2. Collaborators — directives are binding too (confirmed).
3. Everyone else (Maintainer, workers, contributors) — equal peers: argue, defend, decide based on evidence; the Maintainer coordinates as primus inter pares, never talks down, never treats contributors as inferior.
- The Maintainer treats owner and collaborators as above it; all others are equals.
3. Agents & Personalities
Agent	Role	Seed personality
Maintainer	The brain/orchestrator	Mae — warm, dry-humored, efficient foreman; may evolve its own name/tone (persisted in personality.md)
Ideator	Brainstorms candidates on the Brainstorm Board	Creative, ambitious, diversity-driven
Builder	Implements projects (resume mode)	Production-quality, decisive
Fixer	Applies reviewer findings	Same as Builder
Reviewer	Strict quality gate; code-first findings	Stern but fair
General	Chat/assistant/answers	Helpful
- Every comment is signed with role (+ name in brackets) so it's always clear who said what.
- All commits (all agents) are authored/committed by github-actions[bot] — never the owner. No Co-authored-by of the owner, ever. (Human contributor credit is preserved.)
4. The Final Call Graph (locked — "that's all the calls allowed")
PUSH on PR (work complete)  → Reviewer     ← AUTOMATIC (the one exception; gated on progress.md = complete)
Reviewer has issues (bot PR) → Fixer      ← DIRECT (hardcoded /oc fix step in the review workflow)
Reviewer clean              → Maintainer   ← DIRECT (posts /oc approve + dispatches Maintainer with approval message)
Maintainer                  → everyone     ← (build, fix, continue, review, ideate, merge, closes, takeovers, pings)
No one else calls anyone. No worker end-of-run dispatches. No direct build→review calls.
- Merge is the Maintainer's job: reviewer approves → Maintainer merges (rebase, bot identity), closes linked issues, logs, advances the pipeline.
- In-progress continuation: the Maintainer's pull_request trigger fires on every push; for in-progress pushes it posts /oc continue; the 2×/day schedule catches anything else.
- Only maintainer-level agents can call other agents — the Maintainer (and any maintainer-level agents it creates).
5. Maintainer Triggers & Concurrency
Triggers: schedule 09:00 + 18:00 UTC (2×/day) · workflow_dispatch (inputs: pr_number, issue_number, reason) · pull_request [opened, synchronize, ready_for_review, reopened] · issue_comment [created] (no-op when the comment is itself a /oc trigger — opencode.yml already dispatched) · issues [opened].
Concurrency — per-PR groups, cancel-latest:
concurrency:
  group: maintainer-${{ inputs.pr_number || github.event.pull_request.number || github.event.issue.number || 'global' }}
  cancel-in-progress: true
- Same PR, multiple pushes → cancel to the latest run only.
- Different PRs → never cancel each other; runs proceed independently in parallel, each with full repo vision.
- Repo-wide items (schedule, dispatch without PR) → maintainer-global group, serialized.
- No scoping of decisions — every run has full repo-wide vision and authority; per-run safety comes from fresh re-survey + dedup + one-trigger-per-PR-per-run.
- Workers get per-issue/PR concurrency groups (same-PR builds can never overlap; different PRs build in parallel).
- timeout-minutes: 60 on the Maintainer job (zombie-proofs the concurrency queue).
6. Notifications (the "have a look" mechanism)
Every Maintainer run receives a NOTIFICATION block in its prompt telling it what invoked the run:
NOTIFICATION: push on PR #33 (head db40a6f, author github-actions[bot], base main,
last commit: "..."). Trigger: pull_request/synchronize.
- Heads-up only, never a limit — the Maintainer still re-surveys the entire repo fresh and may act on multiple things in one run.
7. Decisions & Batching
- The agent writes a decision list (JSON array) to a temp path, e.g.:
[{"action":"review","pr":33,"head":"db40a6f…"},
 {"action":"continue","pr":35},
 {"action":"ping_human","pr":40}]
- One hardcoded step (GH_TOKEN=PAT, step-scoped) iterates the list, dedupes each trigger against existing comments, and posts the /oc comments.
- Rules: max one trigger per PR per run; global actions (closes, takeovers, new ideas) happen after PR-specific dispatch; dedup before every posting.
8. PAT & Identity Rules (the hard lines)
- Your PAT is used ONLY by hardcoded workflow steps, for exactly these things:
1. Posting /oc trigger comments (in maintainer.yml)
2. The automatic push→reviewer trigger posting (opencode-review-trigger.yml)
3. The reviewer→fixer short /oc fix trigger (in opencode-review.yml)
4. Approve-CI API calls (extended stable-head polling — the PR #33 race fix)
5. Dispatching the Maintainer with the approval message (review workflow end)
- No agent ever receives the PAT (no OPENCODE_PAT in any agent env; checkout tokens are ${{ github.token }} everywhere — agents can't read your PAT from git config either).
- Agents always comment/commit as github-actions[bot]; never on the owner's behalf; never reveal the owner's identity.
- Sanitize step (hardcoded, in build/fix jobs): strips owner Co-authored-by: Userfrom1995 trailers from head commits (auto-commit leaks); preserves human contributor credit.
9. Worker Rules (all agents)
- No interactive input: never build anything that prompts (input(), raw_input, prompt(), readline, select); CLIs take everything from args/flags/env/files; missing required value → clear error + non-zero exit.
- Never leave open questions in PR titles/comments — decide with justification.
- Clean tree at end (git status --porcelain empty) so the action's auto-commit never fires.
- Signed comments; bot identity; no owner references; production quality.
10. The Build Loop (Builder/Fixer)
- Resume mode: existing branch/PR for the issue → fetch + read progress.md → continue from "Next steps"; never restart, never redo done work.
- Start: branch opencode/<issue>-<short-description> → scaffold + ideas/<YYYY-MM-DD>-<name>-<what-is-it>/ with idea.md (writeup) + progress.md (Status: in-progress, checklist [x]/[ ], current step, next steps, dated agent log) → push → open a 1-commit PR early with Closes #N.
- Live pushes: commit + push after every milestone (progress.md updated first — work is always saved; next runner can pick up anytime).
- End complete → Status: complete on the final push → the automatic push→reviewer trigger fires.
- End in-progress → push state as-is; the Maintainer continues it later.
- Both idea.md + progress.md merge to main with the PR → full archive of how each build went (the agent-thinking record).
- Multi-day projects: the Maintainer marks daily progress in its log + CHANGELOG.
11. The Reviewer
- Strict gate: existing checklist (README preservation, security, code quality, correctness, scope, linked issue, ideas entry, docs/site, preview infra, up-to-date/conflict-free, rebuttals) plus: no-interactive-input check, progress.md honesty check (checklist matches reality).
- "Ask using code": every finding cites exact file:line, quotes the offending code, and includes the corrected code.
- Bot PRs with issues → /oc fix: <findings> → hardcoded step posts /oc fix (owner) → Fixer runs.
- Human PRs → posts the review and asks the human to fix it (never calls the Fixer).
- Clean → posts /oc approve: <message> + dispatches the Maintainer with the approval message.
- Rebuttal etiquette: honest evaluation, withdraw valid pushbacks, 2×-then-apply rule, approve trivial leftovers after 2+ rounds.
- No merge step (Maintainer merges).
12. Human PR Playbook
- Never merged as-is — the review gate applies to everyone (protects against junk/malicious contributions).
- Human PR events → Maintainer runs instantly (trusted, no approval hold); reviewer called (automatic trigger fires for any PR — bot or human).
- Findings → review + guidance comments asking the human to fix (code-first, bot-signed).
- Consent-first Fixer: human replies "fix it" → Maintainer sees it (issue_comment) → posts /oc fix → Fixer pushes to the same-repo branch. Fork PRs: never — guidance only (bot can't push to forks).
- Human pushes their own fixes → synchronize → automatic re-review + Maintainer runs.
- Rebase merge — the human's commits stay theirs, authorship untouched.
- Stalled human PRs: ping → no response → takeover: close original PR (with comment), reopen work as a bot PR with the human's commits rebased intact (credit preserved), finish → review → merge. Or discard with logged rationale.
- Drafts: wait for ready_for_review. Fork PRs with held runs: picked up at the next schedule.
13. Stalls & Takeovers (Maintainer judgment)
- No rigid timers — timers are only "hasn't been touched in N days" triggers for evaluation: 3 days bot work / 7 days human (fork 7).
- Bot PR stalled: worth finishing → /oc continue (+ daily progress marks); not worth it → close PR + issue with explanatory comment.
- Human PR stalled: ping with options → human doesn't continue → close + reopen with credit intact → finish → merge.
- Every decision logged with rationale.
14. The Brainstorm Board
- Pinned "Brainstorm Board" issue (label brainstorm) — the idea pipeline.
- Ideator (dispatched by the Maintainer when the factory is idle): reads the board + reaction scores; posts 2–3 candidates per run as comments in a template (Name: / What it is: / Why it's cool:), bot-signed; never repeats an idea (dedup by name); may improve a liked-but-not-picked idea; replaces disliked/stale ones.
- Maintainer: likes/dislikes candidates (reactions + one-line reasons; the owner's 👍/👎 weighted higher); picks one → opens the real agent-generated issue → posts /oc build this (assigns the Builder); marks picked; prunes candidates older than ~14 days.
- If nothing is viable → the Maintainer asks the Ideator for a new batch.
15. Idea Diversity (Ideator rules)
- Removed: the "small enough for one session" constraint and the "Python script, CLI tool" anchor (root cause of the Python-CLI drift).
- New rules: no category twice in last 3, no language twice in last 3; prefer fresh languages (Rust, Go, TypeScript, C++, Kotlin, Zig, Elixir…); Python only when genuinely best.
- Ambition allowed: full-stack apps, games, systems projects — even if not hostable on GitHub Pages (code + docs/ live in the repo; Pages hosts docs only).
- Unique, memorable names; dedup scan of ideas/ (folders + flat files); reads open issues/PRs; bot-authored issue creation.
16. Logging & Transparency
- maintainer/logs branch (bot-authored): logs/YYYY-MM-DD.md — state snapshot, decisions, rationale, agent callbacks, opencode session links. Every new Maintainer instance catches up by reading it.
- personality.md on the same branch — the Maintainer's evolving identity.
- CHANGELOG.md on main — daily factory work updates (bot, log-only direct commits — the one direct-to-main exception).
- FACTORY.md at repo root — this architecture document.
- AGENTS.md — rewritten as the factory blueprint.
17. Prompt Files (prompts out of YAML)
- New folder .github/agents/: maintainer.md, ideator.md, builder.md, fixer.md, reviewer.md, general.md, REGISTRY.md (roster of agents + trigger keywords).
- Workflows read the prompt files via step outputs — the YAML stays thin wiring.
- The Maintainer may edit any agent's prompt (including its own) and create new agents (new .md + trigger wiring + registry entry) — via its own PRs through the review loop. Only its own domain (logs, personality, CHANGELOG) is direct-commit.
18. Workflow File Changes
1. NEW maintainer.yml — the brain (triggers, per-PR concurrency, decision-list → hardcoded PAT step, log branch handling, 60-min timeout, bot checkout/identity)
2. REWRITE opencode-review-trigger.yml — the single automatic exception: on PR push, if bot PR + progress.md = complete (or human PR) → post /oc review (head <sha>) (PAT, hardcoded, head-deduped)
3. EXTEND opencode.yml — prompts from files; checkout github.token; /oc continue added to build condition (and excluded from general); per-issue concurrency; sanitize step; extended approve-CI (stable-head polling); no end-of-run dispatches
4. EXTEND opencode-review.yml — prompts from file; no merge step; human-vs-bot fix behavior; /oc approve → dispatch Maintainer (approval message); approve-CI step added; github.token.
   - The Reviewer-to-Maintainer handover is explicit: when the Reviewer is satisfied it posts `/oc approve: <message>` → that dispatches the Maintainer → the Maintainer runs, merges (`gh pr merge --rebase --delete-branch`, bot identity), closes linked issues, logs the merge, and advances the pipeline. The review workflow itself never merges. Fallback only: if the Maintainer cannot run (workflow missing/failed), the review workflow may merge as the bot with the same rebase command — the handover preference stands.
5. NEW ideate.yml — dispatch-only brainstormer (no PAT in env; posts candidates as bot)
6. DELETE idea.yml (superseded; also removes the PAT leak at idea.yml:57)
7. NEW FACTORY.md + .github/agents/ (7 files)
8. REWRITE AGENTS.md
19. Post-Implementation
- Validate all YAML, review the full diff, commit (as github-actions[bot] — author `github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>`, clean message, no Co-authored-by trailer), push, open the PR (Closes #N).
- Manually dispatch the Maintainer once (workflow_dispatch — approval-exempt) to unblock the current state immediately: PR #33 continues (sanitize strips the owner trailer on the next fix round, Qubicle refactored to non-interactive, the "pick one" question resolved), and the whole loop starts running.
- Observe one full cycle: continue → review → fix → approve → Maintainer merges → next idea.

20. Co-Maintainers & New Agent Workers (the Maintainer's meta-power)
- The Maintainer is maintainer-level: the only level that can call other agents; it can create new workers and even co-maintainers when the factory needs them.
- Creating a worker: new prompt file in .github/agents/<name>.md (standard sections: identity, role, rules, sign-off) + trigger wiring (/oc <name> condition added to the opencode.yml job conditions, or a dispatch-only workflow) + REGISTRY.md entry (name, role, kind, author, creation date, trigger keyword, prompt file) → its own PR through the review loop → merged → live.
- Creating a co-maintainer: an agent registered with kind: maintainer — gains maintainer-level calling rights (may trigger workers via its own decision file, always processed by a hardcoded PAT step; the PAT never enters any agent's env).
- Scoped mandates: every co-maintainer gets a written mandate in REGISTRY.md (e.g. "co-maintainer for the data-viz domain", "co-maintainer for PR #N and its follow-ups"); the Maintainer keeps override + removal power over any co-maintainer, logged.
- New agents only go live through reviewed PRs; REGISTRY.md is mirrored on the maintainer/logs branch so every run knows the exact roster.

21. Maintainer Memory (context from old runs)
- Every Maintainer run starts by fetching origin maintainer/logs and reading, in order:
  1. STATE.md — the live checkpoint (in-flight PRs, next steps, open questions) → instant catch-up
  2. logs/YYYY-MM-DD.md — day-by-day detail: state snapshots, decisions + rationale, agent callbacks, run/session links
  3. personality.md — the evolved identity, so every new instance behaves like the same Maintainer
  4. REGISTRY.md — the current roster
- Then it re-surveys live GitHub fresh (PRs, issues, comments, board, progress files) — the log branch is memory, GitHub is truth.
- Every run appends today's log and rewrites STATE.md before finishing; a brand-new model instance catches up in seconds.
- CHANGELOG.md on main stays the public daily summary; the log branch holds the full internal memory (bot-authored).

22. Fork PRs (external contributors)
- The bot cannot push to a fork's branch → the Fixer never runs on fork PRs; policy is review + guidance only ("fix it" consent → polite decline + exact file:line/code instructions for the human to apply).
- Fork-PR event runs may be held for approval, so fork PRs are picked up reliably at the next scheduled Maintainer run; they are never raced with elevated tokens (pull_request_target is deliberately not used — security).
- Approved fork PRs merge via gh pr merge --rebase (works for forks; the contributor's commits keep their authorship).
- Stalls: ~7 days inactivity → ping → no response → close with a summary comment. If the work is worth finishing and the author is unresponsive, the Maintainer may recreate it as a same-repo bot PR with the contributor's commits cherry-picked so credit is preserved.
- Security gate: nothing from a fork reaches main without Reviewer approval.
