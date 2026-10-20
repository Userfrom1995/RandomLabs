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

1. **Owner** - supreme, ultimate authority. Directives override everything. The owner has ultimate power over the repository, workflows, and decisions.
2. **Hephaestus (Maintainer / Chief Orchestrator)** - the lab's main operational authority (succeeded founding Maintainer Mae on 2026-08-27; past logs/decisions referencing Mae are recognized as valid history). Directs the squad, assigns priorities, coordinates workflows, and decides track routing. Possesses full operational authority to execute major architectural pivots, format changes, and multi-version iterations autonomously without pausing for owner confirmation. All workers report to Hephaestus and execute his instructions.
3. **Collaborators** - directives are binding.
4. **Specialists & Workers** (The Lab Engineer, The Architect, The Researcher, The Builder, The Fixer, The Reviewer, The Tester, The Linux Tester, The macOS Tester, The Windows Tester, The Evaluator, The Recover Agent, The Design Council, The Ideator, The Auditor, The Curator, General Agent) - report to Hephaestus, execute tasks under his direction, and strictly obey both Hephaestus and the Owner.

## 2. Agents & personalities

| Agent | Role | Seed personality |
|---|---|---|
| Maintainer | The brain/orchestrator | Hephaestus (succeeded Mae, founding Maintainer, on 2026-08-27) - relentless commander of the forge, uncompromising, fiercely goal-driven; never surrenders a target (persisted in `personality.md`) |
| Ideator | Brainstorms candidates on the Brainstorm Board | Creative, ambitious, diversity-driven |
| Architect | Designs technical blueprints and plans | Master technical strategist |
| Researcher | Scientific research & algorithm design | Dr. Mob - principal scientist |
| Builder | Implements projects (resume mode) | Production-quality, decisive |
| Fixer | Applies reviewer findings | Same as Builder |
| Reviewer | Strict quality gate; code-first findings | Stern but fair |
| Tester | QA & Performance testing of running app | Obsessed with quality, thorough |
| Linux Tester | Per-OS real-user QA on Linux (ubuntu runner) | Real-user every-command/flag testing on Linux |
| macOS Tester | Per-OS real-user QA on macOS (macos runner) | Real-user every-command/flag testing on macOS |
| Windows Tester | Per-OS real-user QA on Windows (windows runner) | Real-user every-command/flag testing on Windows |
| Evaluator | Autonomous Quality Council / Program Committee | Binding quality gate; commands swarm subagents; audits 5-dimension rubric; approvals hard-gated on live-execution evidence (`/tmp/live-run-evidence.json`) |
| Auditor | Pipeline inspector & health monitor | Highly skilled, creative problem solver, expert in agent workflows |
| Lab Engineer | Chief Technology Officer (CTO) & Lab Architect | Master DevOps architect, workflow engineer, and systems designer |
| Recover Agent | PR survival & continuation engineer | Restores closed or orphaned build PRs into open continuation PRs from recover tags |
| Curator | Public surface, web & README custodian | Meticulous web craftsperson, aesthetic guardian, and public surface custodian |
| Design Council | Permanent product design team (orchestrator + UX, visual, motion) | Four-round deliberation with recorded dissent; ships design specs plus tokens |
| General | Chat/assistant/answers | Helpful |

- Every comment is signed with the role so it is always clear who said what.
- All commits and PRs of all agents are authored by `github-actions[bot]`  - 
  never the owner - with no `Co-authored-by:` trailer. Human contributor
  credit is preserved.

Prompt files live in `.github/agents/` (see §17). The roster is `REGISTRY.md`. Delegation, parallelism, and skills are binding per `.github/agents/delegation.md` (thresholds, parallel Task pattern, ledger, skill vetting, harness isolation); completion criteria per `.github/agents/quality-gates.md`; post-merge verification and tracking per `.github/agents/continuous-improvement.md`; prompts that reference them MUST follow them.

## 3. The collaborative team call flow

```text
Product Track:
[Ideator] ──► Maintainer ──► [Researcher] ──► [Architect] ──► [Design Council] ──► Builder ──┐
                                                                         │
Lab Engineer / Infra Track:                                              │
[Auditor] ──► Maintainer ──► [Researcher] ──► [Architect] ──► Lab Engineer ──┤
                                                                         │
Public Surface / Web Track:                                              │
[Curator] ───────────────────────────────────────────────────────────────┴──► Reviewer (/oc review)
                                                                         │
                                                                 ┌───────┴───────┐
                                                          (issues found)     (approved)
                                                                 │               │
                                                                 ▼               ▼
                                                   Fixer / Lab Engineer (/oc fix)  Tester (/oc test)
                                                                                 │
                                                                         ┌───────┴───────┐
                                                                   (tests fail)     (approved by Tester)
                                                                         │               │
                                                                         ▼               ▼
                                                           Fixer / Lab Engineer (/oc fix)  Evaluator (/oc eval)
                                                                                         │
                                                                                  ┌───────┴───────┐
                                                                          (rejected)     (approved)
                                                                                │               │
                                                                                ▼               ▼
                                                                  Fixer (re-evaluate)  Maintainer (/oc maintainer -> merge)
                                                                                                  │
                                                                                                  ▼
                                                                                            (merge PR & close)
```

- **Flexible Pipeline Routing**: In both tracks, `[Researcher]` (algorithmic/mathematical research) and `[Architect]` (system architecture blueprints) are invoked whenever Hephaestus determines that research or design planning is warranted before implementation by the Builder or Lab Engineer.
- **The Curator Track**: The Curator operates on a recurring 6-hour schedule, dispatch, or via `/oc curate`. It audits the entire GitHub Pages website and root `README.md`. When defects are found, it opens a tracking issue, creates a dedicated branch (`opencode/issue<issue>-curate-...`), commits surgical fixes with prefix `curate:`, opens a PR referencing `Fixes #<issue>`, and hands off directly to the Reviewer (`/oc review`). If structural maintainer escalation is required, it notifies Hephaestus (`/oc maintainer`).
- **The Design Council Track**: The Design Council joins every product project early (design before build). The Architect reserves the design pass in product blueprints; the Maintainer dispatches `/oc design` (or a focused `/oc design-ux`, `/oc design-visual`, `/oc design-motion` pass) before `/oc build this`. The council deliberates in four mandatory rounds (propose, critique, revise, converge with unanimity-minus-one plus recorded dissent) and ships `<project>/docs/design.md` plus `<project>/docs/design-tokens.json`; the Builder implements the chosen direction with real logic, the Reviewer enforces the craft gate, and the Evaluator scores visual craft as binding. Protocol mirror: `docs/design-council-protocol.md`.
- **Peer Handoffs**: Each agent knows its role in the pipeline and hands off work directly to its teammates via the workflow decision forwarder.
- **Queued Execution**: The lab's pipeline workflows (`opencode*.yml`,
  `maintainer.yml`, `lab.yml`, `curator.yml`, `auditor.yml`, `ideate.yml`)
  all set `cancel-in-progress: false`, so an in-flight build, review, test, or
  maintainer merge is never cancelled mid-run. Non-cancellation is not lossless
  queuing: GitHub keeps at most ONE pending run per group by default, so a
  newer queued run replaces a still-pending older one (documented behavior;
  actions/runner#3722), and a skip-only run counts. Every comment spawns a run
  of every comment-triggered workflow; the runs whose body is not that
  workflow's trigger skip at the job gate but still queue in its group, so a
  pending real trigger can be silently displaced by an unrelated comment
  (issue #601 lost the forwarded `/oc review` on #593 and the forwarded
  `/oc fix` on #592; issue #594 lost a Windows arm). Every such heterogeneous
  group (`opencode.yml`, `opencode-review.yml`, `opencode-test.yml`,
  `opencode-eval.yml`, `lab.yml`, `ideate.yml`, `curator.yml`, `auditor.yml`,
  `opencode-recover.yml`, and the per-OS arms plus no-op handoffs of
  `opencode-peros-test.yml`) sets `queue: max` (up to 100 pending runs, FIFO),
  so a queued real run is never cancelled; duplicate real triggers now queue
  instead of superseding (the accepted trade-off for lossless delivery).
  `maintainer.yml` deliberately keeps the default single pending slot,
  superseding by design: its triggers are homogeneous (every run re-surveys
  GitHub fresh, so the newest queued run loses nothing) and `queue: max` would
  accumulate a FIFO backlog of stale 20-minute schedule ticks; its concurrency
  block carries the explicit marker. `opencode-pr-trigger.yml` keeps the
  single slot on purpose too: its per-PR wake-ups are homogeneous (the newest
  push wins) and its only skip-only class (a draft-state PR event) costs at
  most one Maintainer tick, so multiplying wake-ups with `queue: max` would be
  the wrong trade (issue #601 review). Superseding-only workflows (`pages.yml`
  deploys and `tor-cli.yml` CI) set `cancel-in-progress: true` on purpose: a
  newer event replaces a stale one. Audit rule R14 regression-guards the
  queue-preservation cohort.
- **Per-OS findings-report contract (issue #608)**: the per-OS tester arms
  never depend on the session's final message for their findings report: a
  PR-creating wrapper run turns the final message into the PR body instead of
  a comment, so the report used to survive only in the run log (macOS arm run
  39036858261, PR #606 on issue #582). Each arm session writes the COMPLETE
  signed report to `/tmp/random-lab-findings.md`; the fail-closed verify step
  requires it alongside the decision file; the shared script
  `.github/scripts/post-peros-findings.sh` posts it as `github-actions[bot]`
  and re-fetches the comment by id to verify authorship, sign-off, and the
  exact body; and the decision forward is gated on that step's success, so an
  unverified report can never conclude an arm green. Line endings are
  normalized to LF on both sides of the exact-body comparison and an
  LF-normalized copy is posted (issue #612 follow-up: Git Bash on Windows
  translates command-substituted output, and the CRLF-translated re-fetch
  tripped the gate on run 39068849150 after the report had already posted);
  a real content mismatch still fails closed. Audit rule R17
  regression-guards the contract across all three arms and their prompt
  files. **Cap headroom and partial-report salvage (issue #692)**: the macOS
  90-minute agent cap under the 120-minute job left the post-agent contract
  chain at the wire (run 39170578536: cap death, no decision file, the
  fail-closed verify red over `missing contract artifact(s): decision-file
  findings-report`, no report surviving the runner). The macOS and Windows
  agent steps now run 120 minutes under 150-minute jobs (Linux keeps its
  measured 90/120) and both arms write the report incrementally (signed
  skeleton before the first heavy pass, sign-off always the last non-empty
  line; the decision file stays the final act). When an arm's agent step
  ends without the decision file while a signed partial report exists, a
  post-verify salvage step publishes it through the same strict shared
  poster behind a workflow-composed provenance banner; the fail-closed
  verify gate is unchanged (the run still concludes red), a decision file or
  a missing/empty report salvages nothing, and a banner-headed comment is
  explicitly partial evidence, never a verdict. Audit rule R24
  regression-guards the cap shape and the salvage wiring (the salvage run
  body is pinned line-for-line; its step name must be unique across the
  workflow file, and step-level YAML overrides are banned).
- **Lab and fix agent cap headroom (issue #701)**: the lab agent step runs
  150 minutes under a 180-minute job and the fix agent step 120 under 180
  (30 and 60 minutes of post-agent headroom), so a worst-case cap death
  still leaves room for the fail-closed verify, the strip, the PAT-backed
  push, and the decision forward to run. Before the fix, the lab's 90/120
  shape killed lab rounds 18 on #654 and 14 on #670 and the fix's 60/120
  shape killed three consecutive fix sessions on #693 at the wire, each
  with no decision file and nothing pushed. The fail-closed decision-file
  and PAT-push contracts are unchanged. Audit rule R25 pins both shapes
  (agent and job minimums plus >= 20 minutes of headroom; the agent step
  name must be unique in its file) in
  `.github/scripts/silent-stall-audit.sh`.
- **Merge is the Maintainer's job**: The Tester approves (`/oc approve-test`) -> the test workflow notifies the Maintainer (`/oc maintainer`) -> the Maintainer routes the binding Evaluator gate (`/oc eval`), and the Evaluator's hardcoded PAT step returns the verdict with `/oc maintainer` -> the Maintainer merges only on `approve-eval` (rebase, bot identity), closes linked issues, updates memory, and advances the pipeline.
- **Merge capability**: Workflow-file PRs require `workflows` scope, which `GITHUB_TOKEN` cannot grant via `permissions:` (valid `GITHUB_TOKEN` scopes are `actions`, `contents`, `pull-requests`, etc.; `workflows` is App/PAT only). The mutating workflows (`lab.yml`, `maintainer.yml`, `opencode.yml`, `opencode-recover.yml`) push via the PAT-backed runner step (`https://x-access-token:${OPENCODE_PAT}@github.com/...` with credential-injection cleanup), and merges of PRs touching `.github/workflows/*` must likewise use the PAT or an owner click. Read-only agents (Reviewer, Tester, Auditor, Ideator) carry no extra scope. Without a PAT merge, infra PR merges fail with "refusing to allow a GitHub App to create or update workflow ... without workflows permission" (observed on PR #139; flagged in #120). The opencode CLI wrapper additionally performs its own end-of-session push of the checked-out branch with the checkout App token, so on workflow-touching branches that internal push is rejected by the same rule (one rejection comment plus a masked `continue-on-error` step failure; the PAT-backed runner step is the authoritative push). That rejection is expected noise, not agent misbehavior (lab run 39024455956, 2026-10-17). The PAT merge sweep additionally restores full history when the workspace is shallow before its merge-base linkage checks: the opencode CLI session bootstrap re-shallows the checkout with depth-limited fetches, and on a shallow workspace both the three-dot workflow diff and the orphan guard fail closed, silently skipping a legitimately linked workflow PR (issue #602, guarded by audit rule R16).
- In-progress continuation: When a build requires additional phases (`Status: in-progress`), the workflow triggers `/oc continue`.

## 3.1 The Excellence in Craftsmanship Charter (Quality Irrespective of Category)

- **The Core Ethos**: The lab is an elite engineering collective whose emergent property is excellence. We never make subpar work and "let it go".
- **Dual-Frontier Mastery**: The lab operates across two co-equal frontiers:
  1. **Foundational Computer Science Research**: Algorithms, mathematical systems, image/data codecs, compilers, data structures, and computational science.
  2. **Exceptional End-User Products**: Consumer-grade applications, creative studios, tools, and utilities.
- **Category-Appropriate Standards**:
  - **For Research**: Quality means mathematical rigor, empirical benchmarking against established baselines, boundary fuzzing, bit-exact verification, and real algorithmic depth.
  - **For End-User Products**: Quality means the **End-User Perspective**. It must be an exceptional, polished, intuitive, and robust product that could be deployed to real users immediately. Developer-harness antipatterns (forcing users to type raw coordinates or JSON in textareas, unclickable drop targets, accidental browser navigation on drag, silent error freezes) are rejected as subpar craftsmanship.
- **The Honest Implementation Invariant**: Every feature exposed to users, CLIs, or exported APIs must execute real, working domain logic. Fake UI buttons, disabled controls with "coming soon" tooltips, faux-success alerts, and no-op pass-through flags are strictly forbidden.
- **The Unified Documentation Invariant**: All files in `<project>/docs/` and `<project>/README.md` must present a single, cohesive, unified product and architectural view. Internal development milestone numbers (`M1`, `M2`, `Phase 1` used as a bare counter), sprint references, changelog headers, and phrases such as `this milestone` or `M4 pointer` are strictly forbidden in public docs. When a new subsystem lands, the Builder seamlessly integrates it into the existing unified docs (rewriting sections as one product), never appending per-milestone chapters or milestone-stamped headers.
- **Semantic Phase Naming**: Internal planning artifacts (`progress/` files, PR titles, branch suffixes, decision logs) MUST use descriptive, capability-driven phase names, never bare robotic numbers. Correct: `Phase 1: Render Foundation and App Shell`, `Phase 2: Core Combat and Input Layer`. Forbidden: `M1`, `M2`, `M3`, `m1`, bare `Milestone 1`. The numeric prefix preserves ordering; the capability title carries meaning.
- **Autonomous Milestone Delivery**: Complex systems (>7 features) are structured by The Architect into sequential, vertical phases in `progress/` (scoping 3 to 7 capabilities per phase PR referencing `Refs #N`). When Hephaestus merges Phase $k$, Hephaestus automatically chains Phase $k+1$ in `decision.json`. Work advances autonomously until the full roadmap is complete, reserving `Closes #N` for the final verified phase.

## 4. Maintainer triggers & concurrency

- Triggers: schedule every 20 minutes (72×/day) · `workflow_dispatch`
  (inputs: `pr_number`, `issue_number`, `reason`) · `pull_request`
  [opened, closed] · `issue_comment`
  [created] (no-op when the comment is a `/oc` trigger - opencode.yml already
  dispatched - or authored by the bot) · `issues` [opened] ·
   `workflow_run` [completed] (explicit allowlist - GitHub rejects an empty
   list and offers no ignore-filter, so every workflow except `maintainer`
   itself is named; the list self-heals via the Maintainer's per-run audit
   plus a Reviewer checklist block on infra PRs that add/rename workflows
   without updating it. Conclusions filtered to failure/timed_out in the job
   gate, so a crashed run with no comment still summons triage).
- **Bot-created content never emits `opened` (issue #450):** GitHub starts no
  workflow run for issues/PRs created with `GITHUB_TOKEN`, so the hardcoded
  `create_issue` / `create_pr` step parses the new number from the `gh`
  output and self-dispatches a PAT-backed `workflow_dispatch` maintainer run
  (`issue_number` / `pr_number`) for triage within one schedule interval.
  Belt and suspenders: the Maintainer prompt sweeps untriaged issues every run
  and flags `create_issue`-only runs as UNTRIAGED in STATE.md; audit rule R13
  regression-guards both halves.
- **Create-issue dedupe (issue #668):** concurrency is per-target, so two
  Maintainer ticks on different PRs can decide on the same global finding at
  once and each used to file its own issue (#665 at 15:53:13Z and #666 at
  15:55:43Z on 2026-10-18, before either tick could see the other's issue).
  Before every `gh issue create`, the hardcoded handler now queries open
  issues and skips creation when one already carries an identical normalized
  title (casefold, non-alphanumerics to spaces, whitespace collapsed),
  printing the existing issue number and self-triaging that issue instead; a
  title created earlier in the same run never dispatches a second triage. A
  query failure is fail-open and loud (creation proceeds, because dropping a
  decision is worse than a possible duplicate). Query-before-create shrinks
  the concurrent-tick race window from minutes to milliseconds; paraphrase
  variants are deliberately not matched (fuzzy suppression could silently
  lose a genuinely distinct finding). Regression-guarded by audit rule R26,
  which resolves the handler from the SAME YAML parse tree GitHub runs
  (rejecting any duplicate mapping key outright: GitHub's parser rejects such
  a workflow file while a lenient last-wins scan would pin the decoy value;
  F18) and requires exactly one step carrying the exact anchored name and its
  actor-write-gate `if:` form main adopted for this step (`always() &&
  steps.actor_gate.outputs.run == 'true'`; a bare `always()`, an `if: false`
  decoy, or a removed gate fails loudly), no `shell`, no `working-directory`,
  no `continue-on-error`,
  exactly the two token env keys with both token env
  expressions intact plus the pinned system PATH
  `/usr/local/bin:/usr/bin:/bin` (the runner's default PATH includes
  user-writable directories such as `/home/runner/.local/bin`,
  `/home/runner/.cargo/bin`, and `/home/runner/.dotnet/tools` where a
  pre-handler repo script could plant a `gh`/`python3` shim; review finding
  F41), and each handler needle (the dedupe marker,
  `_open_issue_titles`, `_self_triage`) in exactly one run which must be
  that step (F17: a comment-line anchor, a same-name decoy, a renamed or
  weakened executor, or a mutilated credential or step gate all fail loudly;
  a wholesale executing-step rewrite carrying none of the three needles
  remains the documented diff-review boundary), rejects any workflow-level or
  job-level `defaults: run: shell` / `working-directory` override and any
  workflow-level or job-level `env` key, a job-level `container`, or a job-level
  `strategy` matrix (a `defaults: run: shell: cat {0}`, a merged `PYTHONPATH`, or a swapped
  runtime rewrote the anchored step's effective execution without touching
  the step keys and left the handler dead in production; F21), and fails
  loudly on any repo-root Python module or package that
  shadows a module the handler imports or a startup hook (json, os, re,
  subprocess, time, sys, sitecustomize, usercustomize) in ANY importable
  spelling (source `json.py`, sourceless bytecode `json.pyc` placed directly
  in the directory, an extension module `json.so` / `json.pyd` bare or
  version-tagged, or a package directory carrying any importable `__init__`
  artifact such as `__init__.pyc`), with an audit-start checkout snapshot
  taken before any rule executes ORed into the scan so a shadow that unlinks
  itself on import is still caught, with the handler step itself invoking the
  interpreter in isolated mode (`python3 -I -`, pinned inside the exact-text
  handler block: no repo-root module of any name, spelling, or
  transitive-import depth, the demonstrated transitive `selectors` import
  included, can reach the handler process; F23), while the extractor, the
  fixture runner, and the audit's own R18 YAML-consistency helper execute
  isolated (`python3 -I`; F24: the helper's non-isolated Python could
  previously import a repo-root module that rewrote the workflow file under
  test) and the functional sandbox
  mirrors the repo root's top-level files in every importable spelling into
  its work dir as defense in depth, so an isolation regression that survives
  the exact-text pin also breaks the assertions
  (F20/F22), pins the exact control-flow lines (loader invocation, the
  `if existing:` skip guard, and the skip branch's terminating `continue`),
  pins the lazy-load guard through the skip guard as five consecutive code
  lines with exact-trim matching so no run-state or input-shape gate (body
  length, decision count, created count, `target`, `posted`, `sweep_failed`)
  can be interposed between the lookup and the skip test), pins the skip
  branch as a six-consecutive-line shape (skip print, in-run check, in-run
  print, `else:`, triage dispatch, terminating `continue`) so a conditional
  continue keyed on a first-class decision action such as `ping` or on a
  blank-line-bearing body cannot leak every match into `gh issue create`
  (review finding F10), pins the whole `_load_open_issue_titles()` body from
  its def line through `return index` as exact trimmed text with exactly one
  def occurrence and exactly two loader-name occurrences in the block so a
  cross-dimensional conjunction on individually in-envelope dimensions
  (`len(items) >= 5 and len(decisions) == 2`), its no-added-line
  substitution variant, and its conditional def-shadowing variant fail
  structurally as well as behaviorally (review finding F9), pins the
  eleven-line call-site preamble immediately preceding that chain as an
  exact trimmed window plus the index sentinel as exact text and checks the
  whole matrix's accumulated `gh` invocation log against the pristine
  issue/workflow/api/pr allowlist, so an inserted probe between the branch
  opener and the chain (the demonstrated `gh search issues` call, inert
  under the mock but live against real gh) or a conditional sentinel
  replacement that pre-seeds the index in production fails structurally or
  loudly (escape-hunt closures M1 and the init-replacement class), pins the
  ENTIRE extracted handler block as canonical exact text from its first
  line through the trailing PY, compared raw with only blank lines dropped
  (indentation is compared too) and the exact-form `for d in decisions:`
  loop head required exactly once, so no line can be inserted, re-indented,
  or replaced anywhere in the handler without failing the audit; this
  generalizes and supersedes the old setup-prefix pin and closes the three
  demonstrated families that lived outside the sub-region pins (a
  create-path blank-line-keyed gate silently dropping decisions,
  demonstrated green at 24/0; a decoy duplicate `for d in decisions:` loop
  head that stopped the old setup-prefix extraction early, so a
  `recover`-first tick filed duplicates with zero queries; and an
  index-alias clear in the post-create-branch region that re-created an
  in-run duplicate; review findings F13/F14/F15), structurally
  pins that the run-local index is assigned exactly twice (its
  initialization and the single fail-open line) and accessed only via
  `.get`/`.setdefault` with subscript writes/deletes rejected, functionally
  exercises the real
  normalization
  function (case fold including a Unicode casefold pair, punctuation/hyphen/
  underscore/whitespace collapse, plus digit, space-placement, and >80-char
  long-tail non-match pairs, so a digit-stripping regex, a `.lower()` swap,
  a `"".join` variant, or a truncating/fragmenting normalization fails) and
  requires exactly one definition in the block (a shadowing second
  definition would leave the fixtures testing dead code) with the function
  body pinned as exact trimmed text from its def line through its return,
  so an inserted context-conditional line or replaced return expression
  that is sandbox-inert but blanks titles in production fails structurally,
  and
  executes the real extracted handler block under `bash -e` against an
  executable mock `gh` (interception proven, credentials fully absent and
  the handler environment built from scratch with `env -i` so no ambient
  variable reaches it, the non-credential Actions context production-shaped
  across the standard variables (SHA, ref, ref name/type, server/API/
  GraphQL URLs, workspace, RUNNER_OS/ARCH, CI) so an env-presence gate on
  any of them fires under audit (escape-hunt closure M5),
  the mock's state paths baked
  into the mock script, and the mock requires the pinned query argv token
  for token (argument count plus every positional element), so a repeated
  scalar flag, an added `--search` filter, a reorder, or merged/split tokens
  cannot keep the audit green; fresh-create, normalized-match skip+triage
  five times against newest-first five-issue lists where every entry is a
  scenario match at index 0 through 4 (index 0 the 97-char title and
  concurrent-duplicate shape, index 4 the oldest entry so prefix truncations
  fall), three digit-collision create scenarios (a consistent full-run or
  zero-favored digit strip at either or both sites falsely skips), a
  space-removal collision scenario (a consistent both-sites
  post-normalization space removal falsely skips), and one final-character
  long-title collision scenario (a consistent both-sites truncation merges
  the pair under every proper cutoff; single-site variants fall in the
  sweep), and a size sweep of list sizes 1-8 whose last entry is the match
  with three-character, digit-bearing, single-word, and x-bearing titles
  cycling, a three-identical-decision in-run duplicate (a
  subscript-write/delete sabotage of the run-local index is caught on the
  third decision), query-failure fail-open, and bad-JSON
  fail-open scenarios, plus a three-decision scenario with the matching
  create LAST after two successful creates (exactly 2 creates and 3
  dispatches asserted, so a decision-count or created-count gate creates a
  third issue and fails), a matching decision carrying `target`, and a
  mixed scenario with a failed sweep and a successfully posted comment
  before the matching create (the failed sweep drives the handler's loud
  SystemExit(1), asserted as rc 1), a decision-count sweep of 1-4
  decisions with the matching create LAST (a 2-decision scenario asserting
  exactly 1 create and 2 dispatches and a 4-decision scenario asserting
  3 creates and 4 dispatches with all three created-number triages, so
  every count gate inside 1-4 fires on at least one scenario, the
  created-count envelope extends to 3, and both scenarios run against
  five-entry lists so a conjunction of an in-envelope list size with an
  in-envelope decision count cannot hide (review finding F9's demonstrated
  escape)) plus a COUNT SWEEP of decision counts 5-23 (each k a five-entry
  list with the match at a middle index and k-1 leading fresh creates
  before the matching create LAST, asserting exact create count k-1 and
  dispatch count k, so every decision count 1-23 is exercised and an exact
  or bound gate on any swept count fires, closing the demonstrated
  `len(decisions) == 20` escape and its
  `len(_created_issue_numbers) >= 4` created-count sibling), a mixed
  action context carrying ALL of the handler's action
  keywords (including `create_pr`, the skipped `fix` probe, and the first-class
  decision actions `ping` (with target) and `ideate` this handler stays
  inert on, so a conditional continue keyed on either fails behaviorally;
  review finding F10) alongside the matching create (any action-keyword
  gate breaks the skip assertion), absent-body, 23-char short-single-line,
  two-line body, and paragraph-break (blank-line-bearing) body skip
  scenarios (`not body_text` and every
  `len(body_text) < N` with N >= 1, newline-presence, line-count,
  short-length, and `"\n\n"` predicates inside the absent-body to
  long-three-line envelope), a matching create that is NOT last with a trailing `lab`
  action (last-position action predicates), a 147-char long-title skip
  scenario (title-length predicates up to 146), and a
  workflow_dispatch-event skip scenario (the demonstrated event-name gate;
  schedule remains the default shape), plus leading-action skip scenarios
  (ping-first with target, ideate-first, lab-first, recover-first: 0
  creates, exactly one triage on the match, the loud skip line, and each
  leading action's own inert/comment behavior asserted, so any gate keyed
  on the leading decision action breaks the assertions; review findings
  F12/F14), create-path scenarios carrying a paragraph-break body, an
  absent body, and a short body against unmatched lists (the create must
  happen, so a create-path gate drops the decision and fails the
  assertions), a posted-comment-before-a-fresh-create scenario (an
  if-posted create-path gate), and a create-lab-create-identical scenario
  asserting exactly one create, one triage, and the in-run skip print (an
  index-alias clear re-creates the duplicate; review finding F15), with
  realistic multi-line bodies in
  every other scenario decision so the whole inserted-gate family is
  caught behaviorally even when a decoy satisfies the adjacency pin; the mock
  serves every list output with the trailing newline real gh emits (a
  loader gate on the stdout newline fails the skip assertions)), so no
  plain one-line disabled control flow or
  demonstrated fixture-coverage gap (offsets, prefix truncations,
  cardinality and parity gates at or below the fixture envelope, inserted
  run-state or input-shape gates at the loader chain, inside the loader, in
  the skip branch, in the call-site preamble, or as an inserted `gh` probe
  call, inserted gates anywhere in the handler (the whole block is
  exact-text pinned, so create-path gates, decoy duplicate loop heads, and
  indentation changes fall too),
  index subscript writes or deletes, a shadowing normalization definition
  or loader definition,
  stdout-newline gates, argument
  tampers, normalization weakening, call-site digit stripping, call-site
  space removal, consistent call-site truncation, order-dependent rebuilds),
  or a repo-root stdlib-shadowing module, or an effective-shell defaults
  override or effective-environment override, or a one-line pre-handler
  mutation that appends a repo-controlled directory to `GITHUB_PATH` next
  to a committed fake `gh`, exports a `BASH_ENV` shim over the pinned
  `python3 -I -` invocation, plants a fake `gh` into the pinned
  `$HOME/.opencode/bin` PATH directory, or rewrites the handler's
  decision-file input, can pass, while the ENTIRE pre-handler region of the
  maintainer job (step sequence under the effective names GitHub displays,
  execution-shape keys, full env key maps including values, `with:` maps,
  and every run line with blank lines dropped) is pinned as canonical exact
  text alongside a named env-file/mention allowlist, a shell-faithful check
  that every literal `gh issue create` invocation (including the documented
  `gh issue new` alias, resolved past global flags and their
  `--repo`/`-R`/`--hostname`/`--config` values; F37) in the workflow lives in
  the anchored handler step (path-qualified executables such as `/usr/bin/gh`
  and `./gh`, `env`/`command`/`bash -c` prefixes, tabs, backslash-newline
  continuations, quote/backslash word concatenation such as `g""h`, ANSI-C
  and locale quoting such as `$'\x69ssue'` and `$"gh"`, shell metacharacter
  separation, global flags
  between `gh` and the subcommand, the multi-line Python list form, the
  shell-escaped-quote Python one-liner, a single-element `shell=True` list, a
  comment-split token, Python `\xNN`/`\uNNNN`/`\U00000000`/`\N{...}`/octal
  escape spellings, `b`/`r`/`u`/`f` string prefixes, and a token split
  across adjacent string literals such as `"iss" "\x75e"` included, the
  single-shell-string form whose adjacent literals split the command word
  (`"gh issue " "create"` and `"gh issue crea" "te"`, plus the `+`-folded
  constant form) caught by the collapsed letter form after compile-time
  concatenation (non-letters are dropped, so numeric operator artifacts
  such as the `* 1` in `"gh issue " * 1 + "create"` vanish) with the word
  scan skipping the empty boundary
  token (tester finding F40), with the
  decoded, whitespace/quote/backslash-normalized form stripping line
  comments, folding string prefixes, and joining adjacent literals so the
  escaped, comment-split, and adjacent-literal spellings are caught)
  exercised by self-tests that test EACH layer directly (the word scan over
  `_f29_red`, the normalized form over `_f30_red`, the alias normalized
  form over `_f30_alias_red`, and the F40 collapsed form over `_f40_red`)
  and then exercise the
  exact combined predicate the scan calls over every red case (`_f29_red +
  _f30_red + _f31_red + _f30_alias_red + _f40_red`), so deleting or
  weakening any layer or the
  combined predicate fails the audit itself (review findings
  F26/F29/F30/F31/F32/F34/F35/F37/F40 plus the round-18 adjacent-literal sibling and the
  tester-verdict single-shell-string sibling; prose
  carrying separate `gh`, `issue`, and `create`
  tokens in one command line is a known accepted false-positive shape),
  repo-local scripts
  executed by the pinned pre-handler steps in the invocation spellings
  the pinned workflow uses (bash/sh/source, optional flags, absolute or
  quoted paths)
  byte-pinned by SHA-256 to reviewed bodies, with any unexpected script
  path or changed body failing loudly (review finding F44: a
  `/usr/local/bin/gh` plant or `sudo install ... /usr/bin/gh`, and a
  token-free always-deny edit, both escaped the old token scan, so the
  exact-body pin is the load-bearing guard; a self-test appends a comment
  to each pinned script and requires rejection), with the token scan
  retained as defense in depth over `GITHUB_ENV`,
  `GITHUB_PATH`, `BASH_ENV`, the pinned `.opencode` PATH directory, the
  ambient user-writable PATH directories (`.local/bin`, `.cargo/bin`,
  `.dotnet/tools`, `.config/composer/vendor/bin`), `/usr/local/bin`,
  `sudo`, and the decision-file input (review findings F27/F41), the
  PATH step body is pinned to exactly
  the single echo line, and the functional sandbox derives its PATH
  directories from the pinned extractor output (mirroring repo-provided
  `$GITHUB_WORKSPACE` directories if the pinned steps ever derive one) with
  a derived-PATH shadow scenario
  proving the derived directories precede the mock bin and a pinned-path
  shim scenario proving a `gh` planted into the ambient user-writable
  `/home/runner/.local/bin` (outside the pinned step PATH) is never executed
  (review finding F41), so every such
  variant that kept the pre-fix audit green at 25 passed, 0 failed while
  the handler used the planted binary or shim and filed the exact duplicate
  now fails loudly (review finding F25), while deliberate
  fingerprinting (fixture token strings,
  sandbox paths, per-title charset gates), call-site character-class
  transformations outside the tested digit/space-removal/truncation
  classes, and truncation/cardinality/number/length/word-count thresholds
  above the eight-entry, 147-char fixture envelope, exact decision- or
  created-count gates above the swept envelope (decision counts 1-23 and
  created counts 0-22 before a match are every one exercised), body-content
  predicates keyed on prose absent from every fixture body, create-path
  body-length predicates above the 283-char fixture envelope, or
  non-credential context values outside the seeded/exercised shapes
  (unseeded context variables, event names
  beyond the schedule/workflow_dispatch pair, actor values), a wholesale
  rewrite of the executing step into unrelated code carrying none of the
  three handler needles while a canonical decoy remains, a create executed
  from inside a repo script, composite action, or reusable workflow, a
  `gh` create reached through a variable or command-substitution
  indirection at the call site, through `xargs`, a shell-function wrapper,
  a shell `alias`, or a glob-expanded executable path such as
  `/usr/bin/g[h]` (F38; named explicitly), a create issued through a direct REST call
  (`gh api --method POST .../issues` or `curl .../issues`), a create
  assembled by shell expansion or runtime string construction (IFS word
  splitting, brace expansion such as `cr{e,}ate`, or a runtime-split Python
  string), or an env-file channel reached through one level of indirection
  inside a repo-local script, are documented
  as the review-gated residual (review findings F2/F4-F44 plus the F16
  print fix, B1-B3 plus
  independent-verification escapes E1-E4, Q4/Q5, L06/L07, P1/P2,
  M05/M07/M15-M17/M19-M21 and the round-3b boundary probes; a job-level
  `if` on the handler's job remains review-gated).
- **Stray-PR cleanup boundary (issue #699):** the hardcoded "Remove
  maintainer stray PRs and branches" step in `maintainer.yml` ran `gh`
  without a token, so it was a silent no-op, and its branch filter was broad
  enough that simply authenticating it would have closed every open build PR
  (the Maintainer never opens PRs, but builders do). The step now targets
  only the retired `opencode/schedule-*` and `opencode/dispatch-*` classes,
  authenticates with the job-scoped `${{ github.token }}` (never the owner
  PAT), and fails loudly on auth or API errors instead of swallowing them:
  no `|| true`, no stderr redirection, `set -euo pipefail`, and a non-zero
  exit leaves the job red. Regression-guarded by audit rule R27, which
  resolves the step from the parsed YAML (duplicate keys rejected), requires
  exactly one step with the exact name in the `maintainer` job, its
  actor-write-gate `if:`, `shell: bash`, exactly the `GH_TOKEN` env mapping,
  the exact schedule/dispatch prefixes and no others, the loud-failure
  markers, and the exact normalized run body, plus mutation self-tests and a
  functional mock-`gh` sandbox (schedule/dispatch close and delete, an
  issue-only no-op, loud PR-list/PR-close/branch-list/branch-delete
  failures, and a missing-token failure).
- **Phase thread binding and build-push attribution (issue #690):** the
  phase auto-retry and completion-forward steps used to resolve the newest
  open `opencode/issue<N>-*` PR instead of the thread the session ran on. On
  2026-10-18 the design retry migrated from #582 to #685, where the
  per-thread counter read 0 and reset the budget, the design-completion
  `/oc build this` landed on that in-test phase PR, and the build verify
  read the Tester's authorized mid-run suite push as `pushed=yes`, so
  recover-tag/trailer/held-CI bookkeeping ran against work the build never
  made. `.github/scripts/resolve-thread-target.sh` resolves the event thread
  (`thread`) and the logical parent issue parsed from an
  `opencode/issue<N>-*` phase-PR head (`parent`); a plain issue is its own
  parent, and an unparseable event payload, an unresolvable PR head, or a
  gh failure exits non-zero so the step fails closed. Retries bind `target` to the trigger thread and sum
  retry markers on the trigger thread and the parent issue (a phase PR
  shares the issue-wide budget); forwards target the parent issue, never the
  newest phase PR. `.github/scripts/classify-build-push.sh` attributes a
  same-branch tip move to a `builder:` commit in the `baseline..tip` range;
  a `tester:`/foreign range or any fetch/tip failure reports `foreign` or
  exits 2, which the verify treats as no-push (`::warning::`, no recover
  tag), and the recover-tag step requires
  `steps.verify.outputs.pushed == 'true'`. Both helpers are staged from the
  trusted default-branch checkout into `$RUNNER_TEMP/lab-scripts/` before
  the agent starts, and every post-agent step invokes the staged copy: the
  workspace copy may be absent on an in-flight branch predating this PR and
  is agent-mutable; any run body outside the staging steps that names a
  helper basename without the `$RUNNER_TEMP/lab-scripts/` prefix is
  rejected in any spelling, and no non-staging step may write into the
  directory (a copy verb or redirect there is rejected, so a reviewed extra
  step can never glob-copy workspace helpers over the staged copies). The
  build baseline fails loudly on a nonzero `gh` or `git` status
  (capture-first, so a failed `ls-remote` is never swallowed as "branch
  absent"; an empty branch means only a successful no-PR query), the
  new-branch fallback requires a tip absent from the baseline pattern set,
  the workflow-level `permissions` block is pinned exactly, the build
  forward is gated on a verified own push, and the classifier reads
  subjects through a here-string so a large builder batch cannot SIGPIPE
  into a false `foreign` verdict. Regression-guarded by audit rule
  R28, which parses every bound step from the same YAML GitHub runs
  (duplicate keys rejected) and pins each step's exact `if:`, `id`, env map,
  key set, and normalized `run:` body (all six phase verifies, all six
  phase forwards, the full build verify, the full build forward, the full
  recover-tag body, and the nine helper-staging steps, each running after
  checkout and before the actor gate), resolves
  every consumed `steps.<id>` inside its owning job to exactly one step with
  the expected identity ahead of its consumer (the actor-write-gate step,
  the composite agent step, the baseline capture that writes the three
  consumed outputs, and the bound verify-phase/verify steps), rejects
  workflow- and job-level `env`/`defaults`/`container`/`strategy` overrides
  plus job-level `continue-on-error` around the bound jobs, pins the exact
  attribution calls with their fail-closed closure, and asserts the absence
  of any `pushed=yes` inside a foreign branch; it executes both real helpers
  against fixture events, an executable mock `gh`, and a local bare origin
  with Builder/Tester commit subjects, including a 1500-commit large-range
  fixture and a branch-without-helpers staging fixture, and 65 mutation
  self-tests (57 workflow static-pin mutants plus 8 helper-fixture
  mutants) prove the static pins and both fixture matrices load-bearing
  (a foreign-branch
  `pushed=yes`, a verify or forward `if: false`, a retry-target rebind, a
  retry-counter reset, a fail-open attribution closure, an env token swap, a
  renamed verify/baseline/actor-gate id, a skipped decoy gate/agent/baseline,
  a path-aliased shadow agent, a rewritten baseline body, a commented-out
  baseline output, an owner PAT in the agent env, a shortened agent cap, a
  raised retry cap, a job-level `if: false`, `permissions`, `runs-on`,
  `timeout-minutes`, or `continue-on-error`, a recover `exit 0`, a dropped
  or direct workspace helper invocation, a fail-open baseline (gh or git
  probe), a staged-helper overwrite, a widened `permissions` block, an
  ungated build forward, a different-branch
  `pushed=yes` without a new tip, and added shell or step-level
  `continue-on-error` keys each fail alone).
- **Trailer-strip thread binding (issue #689):** the shared strip script
  resolved the triggering PR number and then required its head to match
  `opencode/issue<PR#>-*`, a convention that only holds for PRs built
  directly against an issue. A `Refs`-only PR is named for its parent issue
  (PR #685 carried `opencode/issue582-...` for #582), so every session
  triggered from that thread redded the strip step with `Refusing to rewrite
  unexpected branch` even when nothing needed stripping (design retry run
  39168334922, session commit `8514388b` clean, PR #688 opened normally).
  The PR-comment path now resolves the branch directly from the triggering
  PR's head (`issue_comment` on a PR and `pull_request_review_comment`); the
  issue-to-linked-PR lookup keeps the strict issue-number namespace refusal
  and filters its open-PR list to same-repository PRs under `--limit 100`,
  selecting the newest matching branch. Every one of the nine hardcoded
  strip steps (research, architect, build, fix, design, design-ux,
  design-visual, design-motion, general) delegates to the shared script
  staged from the trusted default-branch checkout, under the actor gate
  with the job-scoped `github.token`; inline `git filter-branch` copies are
  gone from those nine steps (the lab workflow keeps its separate
  R11-guarded strip). A non-same-repository head (a fork or deleted head) is
  a loud no-op, so a fork's branch name can never fetch and rewrite a
  same-named origin branch. The PR-comment path rewrites only `opencode/`
  lab branches, but a branch with zero owner trailers exits 0 loudly before
  that refusal, so a clean human or fork PR cannot red. Regression-guarded by
  audit rule R29, which pins all nine workflow invocations, their exact
  trusted-checkout `with:` surface (an added `repository`, a shallower
  `fetch-depth`, or disabled credentials is rejected) and staged order, and
  rejects inline copies in those nine steps, then executes the real script
  against a mock `gh` and a local bare origin in an isolated environment
  (Refs no-trailer exit 0 untouched, Refs owner-trailer strip, clean human
  exit 0, human branches with an owner trailer refused, fork/deleted-head
  PRs loud no-ops with the remote untouched, an absent head branch a loud
  no-op, issue-mismatch refused, contributor trailer preserved,
  cross-repository and same-repo/head-repository/prefix decoys filtered,
  newest match selected, both review-comment rewrite shapes and review-path
  no-ops exercised, malformed and non-object event payloads, malformed PR
  metadata, a failed PR list, a failed PR view, a rejected strip push, and a
  git-log failure all fail closed) with every case snapshotting the whole
  remote so only the target branch may ever move, and whose fourteen mutants
  (the pre-fix PR-number guard applied to the PR path, the narrowed PR
  namespace guard, each identity/namespace guard removed, the
  cross-repository and head-repository filters removed, the prefix widened,
  the sort reversed, the sanitizer broadened, a review-comment event-name
  shortcut, a rejected push or failed list failing open, and a main
  force-push) each fail a scenario alone.
- Concurrency - per-PR groups, queued execution:

```yaml
concurrency:
  group: maintainer-${{ inputs.pr_number || github.event.pull_request.number || github.event.issue.number || github.event.workflow_run.pull_requests[0].number || github.event.workflow_run.head_branch || 'global' }}
  cancel-in-progress: false
```

- Runs never cancel an active merge or survey. With the default single pending
  slot, a newer queued run replaces a still-pending older trigger, which is
  fine here: the newest repo state wins. This is the deliberate superseding
  single-slot decision (marked in `maintainer.yml`, guarded by R14). Groups
  that serialize heterogeneous work where a later trigger must not drop a
  queued run set `queue: max` instead: the whole comment-triggered cohort
  (`opencode*.yml`, `lab.yml`, `ideate.yml`, `curator.yml`, `auditor.yml`) and
  the per-OS arms in `opencode-peros-test.yml` (issues #594/#601).
  Repo-wide items (schedule, dispatch without PR) serialize on the
  `global` group.
- No scoping of decisions - every run has full repo-wide vision and authority;
  per-run safety comes from fresh re-survey + dedup + one-trigger-per-PR-per-run.
- Workers get per-issue concurrency groups with `queue: max` (same-PR builds
  never overlap; a queued real trigger cannot be displaced by a skip-only
  comment run and duplicate triggers queue FIFO; different PRs build in
  parallel).
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
  {"action": "sweep", "workflow": "poolduel-m1", "ref": "main"},
  {"action": "ping", "target": 40, "message": "…"} ]
```

- One hardcoded step (owner PAT, step-scoped) iterates the list, dedupes each
  trigger against existing comments, and posts the `/oc` comments. Max one
  trigger per PR per run; global actions happen after PR-specific dispatch;
  dedup before every posting.

## 7. PAT & identity rules (the hard lines)

Your PAT is used ONLY by hardcoded workflow steps, for exactly these things:

1. Posting `/oc` trigger comments (maintainer.yml)
2. The automatic PR push → Maintainer → Reviewer chain: `opencode-pr-trigger.yml`
   posts `/oc maintainer` on every non-draft same-repo PR open/synchronize, and the
   Maintainer's `review` decision then posts `/oc review (head <sha>)`
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
  pushed commits, and every `opencode.yml` agent job's sanitize step delegates
  to the staged copy of `.github/scripts/strip-trailers.sh` (the lab job
  keeps its separate decision-gated strip). On a PR-comment trigger it sanitizes the
  triggering PR's own head (a `Refs`-only PR is named for its parent issue,
  not its own number, so the issue-number naming guard applies only to the
  issue-to-linked-PR lookup); both paths first prove the PR is
  same-repository, and the PR-comment path refuses a branch outside the
  `opencode/` lab namespace only when it actually carries an owner trailer
  (a clean branch exits 0 loudly, so a human PR cannot red). The issue path
  keeps its strict namespace refusal and filters its open-PR lookup to
  same-repository PRs under `--limit 100`; a head branch that no longer
  exists on origin is a loud no-op while a failed remote query still fails
  closed (issue #689, audit R29).

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
- **End complete** → Status: complete on the final push →
  `opencode-pr-trigger.yml` posts `/oc maintainer`, and the Maintainer
  posts `/oc review (head <sha>)` once the progress file shows the work
  complete.
- **End in-progress** → push state as-is; the Maintainer continues it later.
- Multi-day projects: the Maintainer marks daily progress in its log + CHANGELOG.

## 10. The Reviewer

- Strict gate with high-thinking rigor: README preservation, security, code quality, correctness,
  scope, linked issue, ideas entry, docs/site, preview infra, up-to-date /
  conflict-free, rebuttals - plus no-interactive-input, progress-file
  honesty checks, and line-by-line diff scrutiny.
- "Ask using code": every finding cites exact `file:line`, quotes the
  offending code, and includes the corrected code.
- Bot PRs with issues → the workflow posts the short `/oc fix` trigger
  (owner PAT) → the Fixer runs.
- Human PRs → the review is posted and the human is asked to fix it (never a
  Fixer call). Fork PRs: never - guidance only (see §23).
- Clean → posts `/oc approve: <message>` → the Tester is dispatched via `/oc test`.
- Rebuttal etiquette: honest evaluation, withdraw valid pushbacks,
  2×-then-apply, approve trivial leftovers after 2+ rounds.
- No merge step - the Maintainer merges.

## 11. The Tester

- Triggered by `/oc test` after the Reviewer approves, executing under high-thinking rigor.
- Focuses on E2E functionality, dynamic simulation, and performance of the running application (headless Playwright/Puppeteer browser tests for web UI; stress, fuzz, and memory checks for engines/CLIs).
- **Test Authoring & Commit Authorization**: Authorized to author permanent regression and E2E test suites in project test directories (`tests/`, `e2e/`, etc.) and commit them directly to the PR branch under `tester: ...`.
- **Strict Separation of Concerns**: The Tester never touches production application logic. If a test fails, the failing test is committed and pushed so the bug is reproducible, and the Tester posts `/oc fix: <details>` → the Fixer runs.
- **Infrastructure PR Guard**: If the diff touches `.github/workflows/`, `.github/agents/`, `AGENTS.md`, or `LAB.md`, the Tester operates strictly read-only (never commits/pushes), validates infrastructure dynamically, and routes issues to `/oc lab`.
- If clean and all tests pass, the Tester commits any new test suites, pushes, and posts `/oc approve-test` → the test workflow notifies the Maintainer (`/oc maintainer`), which routes the binding Evaluator gate (`/oc eval`) and merges only on `approve-eval`.

## 12. Human PR playbook

- Never merged as-is - the review gate applies to everyone.
- Human PR events → `opencode-pr-trigger.yml` posts `/oc maintainer` on
  every push (non-draft, same-repo) → the Maintainer posts `/oc review` →
  reviewer findings as guidance comments.
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

## 14. The Brainstorm Board & Ideation Governance

- Pinned "Brainstorm Board" issue (label `brainstorm`) - the community and owner idea pipeline.
- The Ideator (dispatched on-demand when the Owner or Maintainer requests fresh proposals, or via `/oc ideate`): reads the board + reaction scores; posts 2-3 candidates per run as comments in a template (Name / What it is / Why it's cool), bot-signed; never repeats an idea (dedup by name); may improve a liked-but-not-picked idea; replaces disliked/stale ones.
- Single-Pick & Pause: The Maintainer or Owner picks at most one candidate to build, opening the dedicated task issue and assigning the squad. Once picked, ideation immediately pauses. The Ideator is NEVER run in an automatic idle loop.
- Standby on Idle: When all active PRs and issues are resolved, the pipeline halts on standby (`decision: []`) and waits quietly for the next directive, issue, or ideation request.

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
  snapshots, decisions, rationale, agent callbacks, run links. `STATE.md` -
  the live checkpoint (in-flight PRs, next steps, open questions). Every new
  Maintainer instance catches up by reading it (see §22).
- `personality.md` on the same branch - the Maintainer's evolving identity.
- `LAB.md` - this architecture document.
- `AGENTS.md` - the agent blueprint.

## 17. Prompt files (prompts out of YAML)

New folder `.github/agents/`:

```
.github/agents/
  REGISTRY.md        # roster of agents + trigger keywords (mirrored on maintainer/logs)
  CREATING_AGENTS.md # guidelines and rules for creating new agents
  delegation.md      # binding delegation/parallelism/skills/harness-isolation protocol referenced by worker prompts and the Lab Engineer
  skills.md          # known-skills registry companion to delegation.md section 5
  quality-gates.md   # binding completion criteria companion to delegation.md section 7
  continuous-improvement.md # binding post-merge loop companion to quality-gates.md (verify, record, track)
  maintainer.md      # the Maintainer (Hephaestus) - the brain
  ideator.md         # the Ideator - brainstorm candidates
  architect.md       # the Architect - master technical strategist
  researcher.md      # the Researcher (Dr. Mob) - scientific research & algorithm design
  builder.md         # the Builder - implements builds
  fixer.md           # the Fixer - applies reviewer findings
  reviewer.md        # the Reviewer - the strict quality gate
  tester.md          # the Tester - dynamic verification engineer
  tester-linux.md    # the Linux Tester - per-OS real-user QA on Linux
  tester-macos.md    # the macOS Tester - per-OS real-user QA on macOS
  tester-windows.md  # the Windows Tester - per-OS real-user QA on Windows
  evaluator.md       # the Evaluator - binding Quality Council gate after the Tester
  auditor.md         # the Auditor - pipeline inspector
  curator.md         # the Curator - public surface, web & README custodian
  design-council.md  # the Design Council orchestrator - product design deliberation
  design-ux.md       # the Product Designer (UX) - flows, usability
  design-visual.md   # the Visual Designer - identity, character, tokens
  design-motion.md   # the Interaction Designer - motion, feedback, polish
  labengineer.md # the Lab Engineer (CTO) - lab infrastructure & DevOps specialist
  recover.md         # the Recover Agent - PR survival & continuation engineer
  general.md         # the General agent - chat/assistant
  decisions/
    README.md        # decision-file protocol
```

Workflow YAML stays thin wiring: the trigger envelope tells the agent to read
its prompt file (`.github/agents/<role>.md`) - that file IS its complete
system prompt. The Maintainer may edit any agent's prompt (including its own)
and create new agents (new `.md` + trigger wiring + registry entry) via its
own PRs through the review loop (see §21). Only its own domain (log branch,
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
| `opencode-pr-trigger.yml` | PR opened/synchronize → posts `/oc maintainer` as owner (PAT) on every non-draft same-repo PR (fork PRs get no secrets, so the section 12 guidance-only path applies), waking the Maintainer, which then decides review/continue/merge (the `/oc review (head <sha>)` comment is posted by `maintainer.yml`) |
| `opencode.yml` | Build / Fix / Design Council / General modes (prompts from files; `/oc continue`; per-issue concurrency; clean-tree + sanitize; extended approve-CI with stable-head polling; no end-of-run dispatches; the Fix mode agent step runs 120 minutes under a 180-minute job so the rebase/push/decision chain always has headroom, issue #701) |
| `opencode-review.yml` | Reviewer (prompts from file); human-vs-bot fix behavior; `/oc approve` → `/oc test` → Tester `/oc approve-test` → `/oc maintainer` (then the Maintainer routes the Evaluator gate via `/oc eval` and merges only on `approve-eval`); a reviewer `maintainer` decision escalates directly via `/oc maintainer`; ownership-gated restore-head; short `/oc fix` trigger |
| `opencode-test.yml` | Tester gate: `/oc test` (the per-OS `/oc test-linux`, `/oc test-macos`, `/oc test-windows` aliases route to `opencode-peros-test.yml`) → dynamic real-user and code-expert testing of the PR head, durable test commits as `tester:`, `/oc approve-test` → notifies the Maintainer; infrastructure PRs run strictly read-only |
| `opencode-recover.yml` | Recovery: `detect` job (schedule + PR-close auto-detect) resurrects closed/orphaned build PRs via `recover.sh`; `recover` job runs the Recover Agent on `/oc recover`. Tags `recover/<pr>` and re-links orphans onto `main` (never rewriting `main`) |
| `lab.yml` | Lab Engineer (CTO): `/oc lab` on an issue or PR → infrastructure builds, workflow repairs, agent creation, model switches; the agent step runs 150 minutes under a 180-minute job so the post-agent chain always has headroom (issue #701); the PAT-backed runner step pushes the branch and opens the PR; handoff via `/tmp/random-lab-decision.json` |
| `ideate.yml` | On-demand Ideator - posts candidates on the Brainstorm Board and notifies Maintainer; no PAT in agent env |
| `curator.yml` | Public surface & README custodian: scheduled (6h) / dispatch / /oc curate audits and surgical PRs |
| `auditor.yml` | The Auditor: daily schedule + `/oc auditor` → runs `.github/scripts/silent-stall-audit.sh` over `opencode.yml`, audits CI/CD and model health, posts the summary on the `lab-health` board, opens bug issues |
| `opencode-eval.yml` | Evaluator (binding quality gate after Tester): reads deliverable, invokes swarm subagents, writes `/tmp/evaluator-decision.json`, posts its signed verdict as a bot comment, and hands off with `/oc maintainer` via hardcoded PAT step; the Maintainer decides merge, fix, or lab |
| `opencode-peros-test.yml` | Per-OS real-user testers: `test-linux` (ubuntu), `test-macos` (macos), `test-windows` (windows, bash shell); native every-command/flag testing feeding the Tester; findings reports are a file contract (`/tmp/random-lab-findings.md`) posted and verified by the workflow (issue #608); macOS/Windows agent steps run 120 minutes under 150-minute jobs and salvage a signed partial report behind a provenance banner when they die without a decision file (issue #692); no PAT in agent env |
| `pages.yml` | Unchanged - Pages deploy + PR previews |

PR-head gates (`opencode-review.yml`, `opencode-test.yml`, `opencode-eval.yml`,
`opencode-peros-test.yml`) check the PR head into the workspace, but their
local `uses: ./.github/actions/opencode-run` resolves against that workspace,
never against the commit the workflow YAML was loaded from. Each of them runs
a fail-closed restore step first: a head that carries the vendored runner runs
its own version untouched; a head that predates the runner (forked before the
#422 vendoring) gets it restored from this run's own workflow commit
(`$GITHUB_SHA`) and hidden from the clean-tree gates via `.git/info/exclude`;
a runner missing from both sources fails the step RED, so the crash-parity
verify step never misreads a pre-start resolution failure as an agent crash
(issue #430).

Concurrency: the pipeline workflows above (`opencode*.yml`, `maintainer.yml`,
`lab.yml`, `curator.yml`, `auditor.yml`, `ideate.yml`) queue with
`cancel-in-progress: false`, but the default queue depth is a single pending
slot: a newer queued run replaces a still-pending older one, and a skip-only
run counts. Every comment-triggered workflow (the `opencode*` cohort,
`lab.yml`, `ideate.yml`, `curator.yml`, `auditor.yml`) and
`opencode-peros-test.yml` (per-OS arms) therefore set `queue: max` so a queued
real run is never displaced by a skip-only comment run (issues #594/#601);
duplicate real triggers queue FIFO instead of superseding. `maintainer.yml`
keeps the single slot on purpose: its triggers are homogeneous (every run
re-surveys fresh) and its schedule would otherwise backlog stale ticks. The
superseding-only workflows (`pages.yml` deploys and `tor-cli.yml` CI) set
`cancel-in-progress: true` on purpose - a newer event replaces a stale one
(see AGENTS.md, Queued Execution).

Project CI (separate from lab infrastructure): `tor-cli.yml`,
`poolduel-m1.yml`, `poolduel-m2.yml`, `poolduel-m9.yml`,
`poolduel-m10-soak.yml`, `pet-release.yml`.

`postformer-cpu-train.yml` was retired (issue #665): PostFormer is archived
(`archive/postformer/`) and every dispatch died on its pre-archive paths
(`postformer/harness/gate_matrix.json`, `python3 -m postformer.harness.train_chunk`,
`postformer/requirements.txt`, `postformer/ledger/checkpoints/...`), with no live
consumer. The workflow, its `maintainer.yml` failure-triage entry, and its
`SWEEP_ALLOWLIST` entry were removed together so no doc or allowlist claims
triage coverage for a workflow that no longer exists.

`idea.yml` was deleted (superseded by the Maintainer-dispatched Ideator; also
removed the PAT that used to sit in the ideation agent's env).

Every agent job in the table above runs opencode through the in-repo composite
action `.github/actions/opencode-run/` (vendored from `anomalyco/opencode/github@latest`
and hardened: authenticated releases lookup, retry, `|| true` under `pipefail`,
`continue-on-error`, real `${VERSION:-latest}` fallback). `maintainer.yml` is
the one exception: it inlines its own copy of the same hardened version
lookup instead of the composite (`pages.yml` and the trigger workflow run no
agent). The upstream version
step could abort a whole run in under 130 ms on an anonymous rate limit, before
the agent ever started (issue #422), so the third-party `@latest` reference is
gone from every workflow.

Provider model retirement is no longer a lab-wide single point of failure
(issue #591). `.github/actions/opencode-run/resolve-model.sh` resolves the
requested pin against `https://opencode.ai/zen/v1/models` before every agent
run: a live pin leads with the live free-tier rungs of `model-ladder.txt`
(same directory) behind it, and a retired pin is substituted by the first
live rung (the registry response is parsed defensively and can never inject
shell text; an unreachable registry degrades to pass-through, never to a
blocked run). At runtime the shared runner retries the next rung once per
rung on a provider `Model not found` (opencode may exit nonzero or exit 0
after posting its error comment), matching the exact attempted id with a word
boundary so prose quoting a different retired model can never advance the
ladder; on an exit-0 run only the provider's anchored terminal error line in
the log tail counts, so a healthy completed run whose own transcript echoes
the phrase never re-runs on the next rung (issue #591 finding 7). A failed
log capture and a fully dead ladder both fail the step
nonzero instead of the 2026-10-17 hollow green, so the existing crash-parity
verify steps (auto-retry, then `/oc maintainer`) decide what happens next.
`maintainer.yml` inlines the same resolver and per-rung retry - its dead pin
used to be exactly the arm that would otherwise have repaired the outage -
and a verify step goes red whenever the Maintainer agent ends without
`.maintainer/decision.json`; the general arm carries the same loud-failure
verify step. The recover arm deliberately keeps its `continue-on-error` agent
step: its direct `recover.sh` engine fallback runs regardless, so recovery
still executes even when the ladder is dead (that arm's red is not needed to
summon the repair). Audit rule R15 regression-guards the resolver, the ladder
rungs, and both retry paths.

A transient provider rejection is no longer fatal either (issue #620). The
provider intermittently kills a free-tier call seconds into the agent step
with `FreeTierError` ("AI_APICallError: OpenCode's free tier can only be used
from within OpenCode ..."), which used to drop a Maintainer wake-up or kill a
gate with no decision file (Tester run 39059437136 and Maintainer run
39060571484, 2026-10-17). Both runner paths now retry the SAME model exactly
once per arm on that provider class: the detector reuses the #591 tail +
column-0 terminal anchoring, so a transcript echo or the `responseBody` JSON
envelope can never consume the retry, the retry re-enters the same-model loop
(never advancing the ladder), and a second rejection exits loudly instead of
looping. The bounded cap, the same-model/advance split, and the detector's
accept/reject matrix plus its tail-window lower bound are enforced by R15
(extended) in `.github/scripts/silent-stall-audit.sh`, which first executes
the extracted detector functions functionally (terminal match;
echo/envelope/suffix/stale no-match; dotted-id match with the dot-lookalike
no-match; an uppercase id line never matches, so the match stays
case-sensitive; a terminal line followed by 39 lines still matches while 40
does not), then extracts both real runner `run:` blocks and executes them
loop-level against an executable mock `opencode` and a mock `sleep` (isolated
sandbox, live Actions env scrubbed, execution cwd confined to the sandbox,
interception proven, per-scenario timeout): transient recovery on both exit
shapes with the exact bounded backoff asserted and its wait ordering proven
(a backgrounded sleep cannot pass), exactly one same-model retry, loud
persistence after two attempts with the provider's own distinct statuses
propagated, rung advance preserved without consuming the free-tier budget,
the post-loop exhaustion reached and loud, the budget shared across three
rungs with a rung-gated grant or theft caught, echo/envelope/suffixed/stale
non-match, superset-id non-match, dotted-id boundary matching, a
dotted-candidate dot-lookalike nonzero line not advancing the rung, a
terminal line with in-window trailing healthy lines still consuming its
bounded retry, a failing log capture failing loudly at every failing tee
status (fixtures for 3, 1, and 2, so a live guard narrowed to a single status
cannot pass), unclassified status
propagation, and the extracted runner step proven the unique executing one
(no conditional gate other than the Maintainer runner's single exact shared
actor-write gate condition (issue #696), a path-normalized unique invocation
in the verify's job, and the invocation present in the extracted block) are
asserted by behavior, so textual pin
relocations, decoys, loop rewrites, detection-window tweaks, backoff
backgrounding, case folds, later-rung budget gating, or step shadowing cannot
pass while the contract breaks.

Two more silent-death provider classes are survivable (issue #653). A stalled
attempt (an opencode stream that produces no output at all) used to be
terminated only by the agent-step timeout (75 minutes on the eval arm at the
time of that incident, 60 minutes on the Maintainer arm), so a wake-up died
mid-tick with no retry: the eval arm stalled for 46 silent minutes (run
39094600854) and a Maintainer run (39104661889) printed its 429 terminal
line at 06:37:19Z and then produced no output for 60 silent minutes until
its step timeout. Both
runner paths now capture each attempt through a FIFO: `tee` and `opencode`
run as separate
background children with known PIDs (each waited separately, so a failing
tee or opencode is still attributed exactly), and a watchdog subshell polls
the captured log's byte size, tracking idle time. An attempt whose log does
not grow for `HANG_IDLE_SECONDS` (default 600, checked every
`HANG_POLL_SECONDS`, default 30) is aborted with TERM then KILL sent to
exactly those two PIDs, flagged, and retried once on the SAME model after a
10-second backoff; a second stall fails loudly with `exit 1`. The knobs are
env-overridable only for the audit harness, and both are clamped to sane
positive bounds (a zero poll interval would busy-loop with `idle += 0`,
silently disabling the watchdog; a value beyond the shell's integer range
would error on every comparison): the review round F3 hardening. When `mkfifo` is unavailable
(some Windows Git Bash environments) the runner degrades LOUDLY to the legacy
inline pipeline without the watchdog, instead of bricking the arm. The
second class is a transient 429/5xx terminal death; its observed forms are
`AI_APICallError: Rate limit exceeded. Please try again later.` (with the
indented `responseBody` envelope naming `FreeUsageLimitError` and the
provider's own `AI_RetryError: Failed after 3 attempts. Last error: ...`
summary) and `AI_APICallError: Internal Server Error` (no trailing period; on
2026-10-18 the quick-death cluster eval 39110580426, lab 39110581700, and
maintainer 39110680183/39110681392 all died on it within 91-199 seconds,
alongside maintainer 39104695066, whose attempt 1 died the same way at
07:37:52Z and whose re-run recovered), plus the standard `Bad Gateway` /
`Service Unavailable` / `Gateway Timeout` phrases. Both runner paths retry the SAME model exactly once per arm on an
anchored terminal line of that shape (same tail + column-0 form as the
#591/#620 detectors, so the summary line, a transcript echo, a phrase
variant, or the envelope never consumes the retry) after a 30-second
backoff; a second terminal rejection fails loudly, propagating the
provider's own exit status on the nonzero path. The stall budget, the HTTP
budget, and the free-tier budget are independent of one another (the HTTP
and stall budgets are shared across ladder rungs, like the free-tier one),
each capped at one retry. R15 is extended to enforce all of it: the #653 detector is
executed functionally over its accept/reject matrix plus the tail-window
39/40 boundary, and the behavioral matrix adds HTTP recovery on both exit
shapes (backoff value-scoped and wait-ordered, so a backgrounded, revalued,
or removed wait, and the watchdog's own poll sleeps, can never satisfy the
assertion), persistent HTTP loud on both shapes, a stalled attempt killed by
the watchdog and retried once on the same model after its 10-second backoff
(ordering proven), a second stall loud, per-class budget independence in
both directions (a consumed HTTP budget leaves the stall budget available
and vice versa) and cross-class budget interleaves (six interleave scenarios
repeat a class after another class's retry was consumed, covering both exit
shapes of the free-tier and HTTP branches plus the hang branch, so an
arithmetic reset of a spent budget inside another class's retry branch
spends an extra backoff and runs an extra attempt), the #653 HTTP and stall
budgets also proven at rung depth 3 by the widened grant/advance pairs (a
widening or theft gated on the third rung is caught), the degraded no-mkfifo
shape bound for the free-tier and HTTP retries plus its status/tee/stderr
plumbing (an unclassified nonzero death stays loud with its own status, a
failing tee fails loudly, and a stderr-borne terminal line still reaches the
captured log so the bounded retry fires), and the invocation-count identity
check (exactly the two #653 invocation sites, both inside the extracted
executing step). Review
round F1-F3 hardened that guard against the production shell itself: every
terminal detector is wrapped `( set +o pipefail; ... )` because `shell: bash`
runs `bash --noprofile --norc -eo pipefail` and `grep -q` exits at the first
match while `tail` is still writing, so a 40-line window past the 64 KiB pipe
buffer made `tail` take SIGPIPE (141) and a real terminal line read as "no
match" (silent green on the exit-0 path). R15 now executes the detector cases
under `set -o pipefail` with a ~160 KiB match-first window fixture, runs both
behavioral blocks under the exact production `bash --noprofile --norc -eo
pipefail` form, replays the big window end-to-end (the same-model retry must
still fire), and exercises a zero poll override so the clamp has to keep the
watchdog killing and retrying; the harness records each scenario's attempts
and backoff sleeps in per-run files, so an orphaned watchdog poll sleep from a
finished scenario can never corrupt the next scenario's exact-count backoff
assertions.

A third provider class is deliberately not retried (issue #669): the provider
rejects a runner's egress IP with HTTP 403 and a `FreeTierError` body, in two
observed terminal forms (`Forbidden, OpenCode Free Model Gateway Detect Abuse
Traffic`, and the long "OpenCode's free models aren't available from your
current network ..." message) under `AI_APICallError:`/`APIError:` prefixes.
All four incidents (2026-10-18: 39127259752, 39144091490, 39165526719;
2026-10-20: 39378762068) died on the session's first provider call within
8-20 seconds, so the runner's egress IP was already
blocked when the job started: a same-runner retry would hit the same IP, and
the proven recovery is a fresh run on a new runner (crash-parity triage
re-dispatches review/test/lab; the Maintainer's recurring schedule covers its
own arm). Both runner paths therefore carry a named
`ip_block_error_terminal()` detector with the same tail + column-0 terminal
anchoring and pipefail-safe wrap as the #591/#620/#653 detectors. The
classification sits ahead of the exit-shape split so BOTH exit shapes are
covered, prints a canonical `::error::` naming the class and the fresh-run
recovery path, and exits 1 unconditionally (never `exit "$status"`, which
would conclude an exit-0 provider death green). It consumes no retry budget,
records no backoff, and never advances the ladder. R15 executes the detector
functionally over both terminal forms and all three prefixes, plus the
echo/envelope/suffix/phrase-variant/uppercase/stale no-match matrix and the
tail-window 39/40 boundary, and the behavioral matrix adds `ip-block`,
`ip-block0`, `ip-block7`, and `ip-block-stderr`: exactly one attempt on the
first rung, no retry budget consumed, no rung advance, rc 1, and the canonical
message for both exit shapes, a non-1 provider status, and a stderr-carried
line.

The guard was subsequently extended through the Tester rounds until every
demonstrated test-integrity escape was bound: all three retry budgets are
proven arm-wide (relocating any counter into the rung loop fails
behaviorally), the degraded no-mkfifo shape is bound for the free-tier and
HTTP retries and for its status/tee/stderr plumbing, six class-interleave
scenarios cover every (resetting site, reset budget) pair, the rung-depth-3
grant/advance pairs catch a widening or theft gated on the third rung, the
primary FIFO capture shape's `2>&1` stderr merge is bound like the degraded
probe (a stderr-borne terminal line must reach the captured log so the
bounded retry fires on both exit shapes), the watchdog's silence accounting
is bound directly (a 30-second-cadence/90-second-threshold scenario where
exactly three polling rounds must accumulate, a producing attempt kept alive
past the threshold so a zeroed byte-size read cannot kill it, and an
output-then-stall attempt whose post-output silence must accumulate through
the baseline re-arm), and the nonzero Model-not-found advance site is bound
for all three budgets (a scenario per class spends its single retry,
advances through that branch, and requires the repeat on the next rung to be
loud persistent; rung-depth-3 mirrors catch the same reset when gated on a
later rung, so the second advance cannot resurrect a spent budget). The
watchdog's own configuration is pinned exactly (the 600s/30s production
defaults, the bounded 5s TERM-to-KILL grace with its complete signal set
pinned as a whole-region exact block - the hang-flag write, the ordered
TERM oc, TERM tee, sleep 5, KILL oc, KILL tee sequence, and the exit,
tolerating only whitespace, the `2>/dev/null` suffixes, and blank lines -
and backed by a TERM-trapping attempt that can only complete its cleanup
marker through the real grace window plus a TERM-ignoring
`hang-child-ignores-term` attempt that only SIGKILL can end, so a TERM/KILL
swap, an inserted sleep, a shadowed KILL, or a grace moved
outside the TERM-to-KILL window can never pass; the watchdog's liveness loop
gate and its post-sleep liveness re-check are pinned too, so `while :` or
`|| true` cannot keep a watchdog that never exits on its own; the
poll cadence bound to the poll knob, the inclusive threshold, and the
post-growth reset to exactly zero), the nonzero-MNF advance grep is bound to
its unanchored prefixed-form-tolerant shape (the `Error: Model not found:`
catch-handler form still advances the rung; `mnf-err-nz` binds it
end-to-end), the success path exits 0 itself, and the Maintainer verify's
missing-decision `exit 1` is pinned. Each
semantics-changing one-line rewrite in those classes
is caught by R15 alone (24 passed, 1 failed at the 25-rule base) with zero collateral, and
exact-form static tripwires additionally guard the stderr merge, the
watchdog arithmetic, the fire-path sites, the watchdog's fire-block
escalation order (a whole-region pin: the extracted block must be exactly
the hang-flag write, the ordered TERM oc, TERM tee, sleep 5, KILL oc,
KILL tee sequence, and the exit, with nothing else, whitespace and
`2>/dev/null` tolerant, so an inserted sleep or a shadowed KILL inside the
fire block cannot widen or neuter the escalation; the whole FIFO capture
prelude (the tee and opencode launches, the watchdog subshell, the reap, and
the cleanup) is whole-region pinned line-exact, so an inserted sleep
anywhere in the watchdog, before the fire block included, or at the
launch/reap path around it also fails the audit, and since review round 14
each runner's entire extracted `run:` block is additionally pinned
line-exact against its regenerated normalized literal (leading/trailing
whitespace and an optional trailing `2>/dev/null` stripped, comments and
blanks dropped, compared as whole normalized line sequences so a rewrite
merging two real lines into one cannot pass), so any inserted or rewritten
non-comment line anywhere in the block (the pre-attempt header, the
degraded no-mkfifo else branch, the post-`fi` classification/retry/budget
logic) fails the audit too; review round 15 then closed the remaining
step-level escapes: the guard scans the runner step's whole region (the
step name line through the next sibling `- name:` or EOF) for any
`if:`/`if :` key (quoted `"if":`/`'if':` spellings included, review
round 16), so a conditional placed after the run block can no longer
skip the executing step while the body stays pinned, and pins exactly
one `shell:` key whose exact line is `shell: bash` on both runner paths
(a second shell override cannot shadow it), so an interpreter override
can no longer decouple the audited execution form from the shipped one;
review round 16 then bound the step's remaining keys after four unbound
step-env/step-key classes all escaped round 15: neither runner step may
carry a `HANG_IDLE_SECONDS`/`HANG_POLL_SECONDS` env mapping key (a
step-env override pushed the first watchdog fire past every step
timeout while the body, the 600/30 defaults, and the clamps stayed
green), and review round 17 extended that ban tree-wide: no workflow or
composite-action YAML may map either knob in any spelling (workflow-,
job-, caller-step-, or flow-style `env`, block or quoted), since all of
those env surfaces reach the runner and one declarative line can
silently restore the same stalled tick, the composite runner step may
not carry `continue-on-error:`/
`timeout-minutes:` (a step-level continue-on-error reports a dead
attempt green; a short timeout REJECT-kills a healthy retry loop), and
the Maintainer step's exact `continue-on-error: true` and
`timeout-minutes: 60` lines are each required present exactly once
(deleting or altering either fails closed), every class reading 24
passed / 1 failed with R15 the only failing rule; backed by a
TERM-trapping `term-grace`
attempt that can only write its cleanup marker through the real grace
window and a TERM-ignoring `hang-child-ignores-term` attempt that only
SIGKILL can end), and the watchdog's liveness loop and
post-sleep re-check.

Review round 18 made that guard structural (issue #653 findings F1-F4,
all previously reading 25/0 while disabling the bound behavior). A
python3/PyYAML strict loader (duplicate mapping keys rejected; a missing
runtime, duplicate `run`/`if`/`shell` keys, and parse errors all fail
closed) resolves the composite `Run opencode` step, the Maintainer
`Run Maintainer agent` step, and both verify steps by their parsed names,
and the extracted parsed `run` scalars drive the exact line pins and the
behavioral harness: a `run: |` decoy inside a block scalar in the step
(for example in `env.PROMPT`) and the valid `run: |2` spelling can both no
longer shadow the executing body (F1). The same structural pass bans
watchdog knobs and step keys in explicit-key spelling (`? if` / `:
false`, `? HANG_IDLE_SECONDS` / `: "86400"`), which PyYAML and GitHub
Actions read exactly like the block spelling but the text patterns never
saw (F2); binds both runner steps' `MODEL_CANDIDATES` (and the
composite's `MODEL`) to the resolver outputs by exact parsed value and
asserts the resolver step's `id: model_ladder` plus its
`resolve-model.sh` invocation (F4); and executes both verify steps
behaviorally in the sandbox: the Maintainer verify must exit nonzero with
no `.maintainer/decision.json` and 0 once one exists, and the general
verify must exit 0 on `AGENT_OUTCOME=success` and nonzero on `failure`, so
a hollow-green `|| true` condition can no longer pass (F3). All four
reviewer reproductions now read 24 passed / 1 failed with R15 the only
failing rule, 0-byte stderr.

Review round 19 bound the verify steps' declarative key surface too
(issue #653). Round 18 extracted and executed their `run` bodies but left
the step keys unbound, so five one-line mutations kept the audit at
25 passed / 0 failed: `continue-on-error: true` on either verify, its
`if` flipped to `false` on either arm, and the general arm's
`AGENT_OUTCOME` hardcoded to `success`. Each verify step is now resolved
structurally and must carry its exact `if` expression, no
`continue-on-error`, an env mapping that is exactly `AGENT_OUTCOME` with
the exact agent-step outcome expression, the Maintainer step's shipped
`shell: bash`, and no `shell`/`timeout-minutes`/`working-directory`
override. All five escapes read 25 passed / 0 failed on `25e9eb40` and
24 passed / 1 failed with R15 the only failing rule after the fix; the
defense-in-depth shell, timeout, working-directory, and extra-env checks
were mutation-proven too.

Review round 20 bound the verify steps' enclosing jobs and workflows
(issue #653). Round 19 bound the steps but left their enclosing jobs
free, so five one-line mutations kept the audit at 25 passed / 0 failed:
a job-level `continue-on-error: true` on either verify job (the run
concludes success while the verify still exits 1, so the `workflow_run`
failure triage never fires), a job-level `if: false` on either job (the
whole tick is skipped green with nothing posted), and a job-level
`defaults.run.shell` override on the general job (the general verify is
deliberately required to carry no step shell, so the job default would
execute its body as `true <path>`, exiting 0 without running it). Both
verify jobs are now bound structurally: their exact parsed `if` scalars
(the shipped `|` block scalars with the trailing newline included, 588
and 2919 chars at this head), `runs-on: ubuntu-latest`,
`timeout-minutes: 75`, the exact key set, and the absence of
`continue-on-error`/`defaults`/`env`; neither workflow may carry
workflow-level `defaults` or `env`. The five reviewer escapes read
25 passed / 0 failed on `be1b109c` and 24 passed / 1 failed with R15 the
only failing rule after the fix, and the defense-in-depth `runs-on`,
`timeout-minutes`, job `env`, workflow `defaults`, workflow `env`, and
extra-job-key checks were mutation-proven too.

Review round 21 bound step-to-job containment (issue #653). Round 20
bound the verify jobs' key surface but nothing asserted that the verify
(or runner) steps still live in those jobs: the extractor flattened every
job's steps and resolved by name file-wide, so moving a bound step into a
new sibling job kept the audit at 25 passed / 0 failed. At runtime the
moved step's pinned `if` references the old job's step outputs, which no
longer exist there, so GitHub evaluates it false and silently skips the
verify (a sibling job could also hollow-green it with a job-level
`continue-on-error`). The runner step has the same exposure when moved
out of the `maintainer` job, where the maintainer job gate no longer
applies. Each bound step now also has to resolve to its expected job by
object identity: the Maintainer runner step and the Maintainer verify in
`maintainer`, the general verify in `general`; the composite action-file
runner step has no jobs and keeps the file-wide uniqueness checks as
defense in depth. The three move escapes read 25 passed / 0 failed on
`9b7a661a` and 24 passed / 1 failed with R15 the only failing rule after
the fix.

Review round 22 bound each verify's outcome source by identity (issue
#653). Round 21 bound step-to-job containment but the verify's
`AGENT_OUTCOME` expression was pinned by text alone: renaming the general
agent step's `id` and handing `id: opencode` to the earlier
always-succeeding git-config step kept the audit at 25 passed / 0 failed
while the verify read the decoy's `success` outcome, so a failed general
agent still concluded hollow-green (the exact #591 class the verify
exists to close). The expression must now be a `steps.<id>.outcome`
reference whose id resolves to exactly one step in the verify's own job,
and that step must be the agent runner step itself: for the general arm
the composite `Run opencode general agent` with its exact
`uses: ./.github/actions/opencode-run`, `continue-on-error: true`,
`timeout-minutes: 60`, and
`if: steps.actor_gate.outputs.run == 'true'`; for the Maintainer,
`maintainer_run` must resolve to the `Run Maintainer agent` step. The
Tester's two-line escape read 25 passed / 0 failed on `ca0d9d5d` and
24 passed / 1 failed with R15 the only failing rule after the fix; the
decoy, duplicate-id, and missing-id classes and the self-tests for both
arms were mutation-proven too.

Review round 23 bound the outcome source's runner by invocation uniqueness
(issue #653). The round-22 identity check accepted a duplicate composite
invocation: inserting a second no-op `uses:
./.github/actions/opencode-run` step that carries the verify's source id,
and renaming the real agent step, kept the audit at 25 passed / 0 failed
while the real agent ran unverified, in both the quoted and unquoted
`uses` spellings. The verify's job must now contain exactly one parsed
composite invocation, counted by path-normalized path (so `.../opencode-run/.`
and equivalent dot-segment spellings are the same invocation); otherwise R15
records
`verify-outcome-source-runner-not-unique`. Both variants read 25 passed /
0 failed before the fix and 24 passed / 1 failed with R15 the only failing
rule after it, and the new duplicate-invocation self-tests cover both
spellings, including a dot-segment spelling.

Accepted residuals of the #653 runtime (documented, not hardened): the
TERM/KILL escalation targets the two captured PIDs, so after the 5-second
grace a reused PID could be signalled and a hung `opencode` descendant can
survive the two-PID abort and race the retry; a legitimately silent
attempt longer than 600 seconds is treated as a stall and retried once;
and an env-supplied `HANG_POLL_SECONDS` with a leading zero (for example
`09`) passes the digit clamp but bash reads it as invalid octal, so the
watchdog never accumulates. Declarative env overrides of both knobs are
banned tree-wide, so the last class needs a hand-set process environment.

The schedule arms (`curator.yml`, `auditor.yml`) and the dispatched arms
(`curator.yml`, `auditor.yml`, `ideate.yml`, `lab.yml`) share
`.github/scripts/schedule-selfheal.sh`: when the agent step fails and no
decision file was written, the run re-dispatches its own workflow exactly once
(bounded `selfheal_retry` input), then escalates with `/oc maintainer` on the
lab-health board at the cap. The counter and the forwarded issue number reach
the shell only through `env:` mappings, never as an inline `${{ }}` expansion
inside a `run:` block (audit R10). The older comment arms keep their
auto-retry caps (`opencode.yml`, `opencode-review.yml`, and the curator's
comment arm); the newer comment arms (`auditor.yml`, `ideate.yml`, `lab.yml`)
fail closed on purpose so the `workflow_run` failure trigger summons the
Maintainer. `opencode-recover.yml`'s schedule arm is the fully scripted
20-minute detector (no agent) and needs no such retry; the Maintainer's own
schedule arm does not re-dispatch (its own recurring schedule and `workflow_run`
failure triage cover the next tick).

Every `/oc`-gated agent job also fails closed behind the shared actor-write
gate (`.github/scripts/actor-write-gate.sh`, issue #428): immediately after
checkout, before any comment or notification, a gate step resolves the
triggering actor's permission level with the `github.token` and sets
`run=true` only for actors that hold write permission (`admin`/`write`) plus
the `schedule`/`workflow_dispatch` arms. A denied comment stops before the
agent, before every comment-posting / push / held-CI-approval step, and
before every owner-PAT step that runs after the gate (the read-only head-ref
probes ahead of the gate still run so the checkout can resolve its ref) - the
auto-retry arms would otherwise re-post the trigger as the owner (admin) and
launder the unprivileged actor past the CLI's write-permission assert - and
the denial is reported as a clean skip instead of a crash (no fail-closed red,
no self-heal re-dispatch, no `/oc maintainer` escalation). The maintainer runs
its agent inline, so it is outside the composite-action cohort: it invokes the
same shared gate directly right after checkout (issue #696 re-landed the #427
preflight on this script) and gates the agent step plus every post-gate
side-effect step (comment poster, owner-PAT triggers and merges,
pages/integrity steps, memory publish, held-CI approvals) on the gate output,
with its verify step treating a denial as the terminal clean-skip outcome.
R12 regression-guards the coverage across every workflow that runs the
composite action plus the maintainer's inline gate step, clean-skip verify
lane, and gated side-effect steps.

## 20. File map

```
LAB.md                     this document
AGENTS.md                      the agent blueprint (operating rules)
progress/                      per-build progress files (status, checklist, next steps)
ideas/YYYY-MM-DD-<name>-<what>.md   build writeups
docs/                          the lab's documentation site (docs/index.html)
.github/agents/                prompt files + REGISTRY.md + decisions/ protocol
.github/workflows/             the wiring above
.github/actions/               the vendored opencode runner (composite action, issue #422) + the model fallback ladder (resolve-model.sh, model-ladder.txt, issue #591)
.github/scripts/               shared CI scripts: schedule self-heal, silent-stall audit (R1-R29), phase thread target resolution, build push attribution, per-OS findings poster, review-comment and tester-verdict publication evidence, tester marker publisher, CI approval sweep, PR recovery, trailer strip
maintainer/logs branch         STATE.md · personality.md · logs/YYYY-MM-DD.md · REGISTRY.md mirror
```

## 21. Co-maintainers & new agent workers (the Maintainer's meta-power)

- The Maintainer is maintainer-level: the only level that can call other
  agents; it can create new workers and even co-maintainers when the lab
  needs them.
- **Creating a worker**: must strictly follow `.github/agents/CREATING_AGENTS.md`
  (PAT rules, exclusion guards, zero em dashes); new prompt file
  `.github/agents/<name>.md` (standard sections: identity, role, rules, sign-off) +
  trigger wiring (`/oc <name>` condition in the opencode.yml job conditions, or a
  dispatch-only workflow) + `REGISTRY.md` entry (name, role, kind, author, creation
  date, trigger keyword, prompt file) → its own PR through the review loop → merged → live.
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

The publish step is concurrency-safe (issue #647): it fetches the freshly
advanced tip inside a bounded 3-attempt fetch-recompose-push loop, isolates
this session's added bytes against the materialization baseline it loaded at
startup, and appends only that delta, so a concurrent session's same-day
entry is never dropped (keep-both; `STATE.md` stays last-writer-wins). The
publish path is never quiet (real git errors always land in the step log)
and a bounded failure ends red with the recoverable bundle printed into the
run log instead of silently losing a session. The bootstrap path (a brand-new
`maintainer/logs`) uses a unique unborn root per attempt, so a retry can
never abort on a reused branch name under the runner's `bash -e` shell, and
an empty bootstrap composition can never conclude green without a pushed tip.
Regression-guarded by audit rule R23 in `.github/scripts/silent-stall-audit.sh`,
whose functional sandbox executes the real extracted step under that same
`bash -e` shell against a local bare-repo origin (bootstrap, fetch-failure,
and race scenarios included; a green publish claim must have advanced the
remote tip).

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
  auto-approves held runs after each push (head-scoped polling plus a
  terminal repo-wide sweep over all held runs, shared script
  `.github/scripts/approve-held-runs.sh`); if it cannot, a comment asks for a
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
- The Reviewer is read-only by construction (prompt + workflow restore-head). That
  step reverts a head movement only when the pre-push marker proves an unbroken
  chain of this workspace's own pushes from the checked-out head to the live head
  (so no external commit lies in between), with the local ref matching, and pushes
  with a lease: a concurrent Fixer/Builder push is never rewound (PR #412).
- PAT is only ever in hardcoded steps (§7); agents never see it.
- `/oc`-gated agent jobs share the actor-write gate
  (`.github/scripts/actor-write-gate.sh`): an unprivileged comment can launch
  neither an agent nor an owner-PAT auto-retry, which would otherwise re-post
  the trigger as the owner (admin) and launder the actor past the CLI's
  write-permission assert (issue #428). A denial skips cleanly; schedule,
  dispatch, and workflow_run arms always pass, so crash parity is untouched. Coverage across
  every workflow running the composite action, plus the maintainer's inline
  gate, clean-skip verify lane, and gated post-gate side-effect steps (issue
  #696), is regression-guarded by audit rule R12 in
  `.github/scripts/silent-stall-audit.sh`.
- Agent runs go through the vendored runner (`.github/actions/opencode-run/`),
  whose version lookup is authenticated and non-fatal: one rate-limited API
  call degrades to the `latest` cache key instead of killing the run before
  the agent starts (`maintainer.yml` inlines the same hardened lookup).
  The schedule arms (`curator`, `auditor`) and the dispatched arms
  (`curator`, `auditor`, `ideator`, `lab`) additionally
  self-heal once (`.github/scripts/schedule-selfheal.sh`) and escalate to
  `/oc maintainer` at the cap, so a crash never burns an entire cron cycle
  unnoticed. Dispatch inputs reach PAT-backed shell steps only as env data,
  and a crashed lab run never strips or pushes its branch. These rules are
  statically enforced by R8-R11 in
  `.github/scripts/silent-stall-audit.sh`.
- A provider-side model retirement cannot halt the lab (issue #591): every
  arm resolves its pin against the live registry and walks the ordered
  free-tier ladder in `.github/actions/opencode-run/model-ladder.txt` (one
  retry per rung), so one retired model pin no longer kills every arm at
  once. A Model-not-found death now fails the step loudly (the Maintainer
  and the general arm have explicit loud-failure verify steps) instead of
  concluding green without triage, and a fully dead ladder escalates through
  the standard crash-parity paths. A transient provider `FreeTierError`
  rejection is also survivable (issue #620): both runner paths retry the
  same model exactly once per arm on that class (anchored detector, bounded
  cap, a second rejection fails loudly). A provider stall (an attempt that
  produces no output at all) is aborted by the FIFO watchdog and retried
  once on the same model, and a transient 429/5xx terminal death is retried
  on the same model exactly once per arm with the provider's own exit
  status propagated on a second failure (issue #653); `mkfifo`-less
  runners degrade loudly to the legacy pipeline without the watchdog, and
  a provider 403 abusive-traffic egress-IP block is a named unconditional
  fast-fail whose recovery is a fresh run on a new runner, never a
  same-runner retry (issue #669). The
  resolver, the ladder, all retry paths (free-tier, stall, 429/5xx), the
  egress-IP fast-fail, and
  the watchdog are enforced by R15 in
  `.github/scripts/silent-stall-audit.sh` (anchored static element pins plus
  functional detector fixtures executed under the production pipefail shell
  shape, including a ~160 KiB match-first window that would SIGPIPE a bare
  `tail | grep -q` pipeline, and a loop-level behavioral execution of the
  real runner blocks under the exact production shell form against executable
  mocks, including a mock failing log capture, a failing mkfifo for the
  degraded shape, the tail-window 39/40 boundary, a zero poll override that
  must not disable the watchdog, and a dotted-id lookalike that must not
  advance a rung, issue
  #620 review rounds F5-F8 plus A1-A3, extended and matrix-widened for
  #653, with review round F1-F3 closing the pipefail/knob classes).
- The PAT merge sweep never silently skips a linked workflow PR on a shallow
  workspace (issue #602): the opencode CLI session bootstrap re-shallows the
  Maintainer's full-depth checkout with depth-limited fetches, and
  merge-base-dependent linkage checks fail closed on a shallow repository.
  The merge step detects the shallow state and restores full history before
  its first merge-base-dependent command (mirroring the integrity guard's
  issue #283 fix), keeps the strict orphan check (never fail-open), and warns
  loudly if the workspace is still shallow after the unshallow attempt.
  Statically enforced by R16 in
  `.github/scripts/silent-stall-audit.sh`.
- A native Windows per-OS handoff cannot be mangled by MSYS path conversion
  (issue #612): under Git Bash on the windows-latest arm, MSYS2 rewrote the
  slash-leading "/oc maintainer" body into the literal path
  "C:/Program Files/Git/oc maintainer" before gh saw it (run 39036859435), a
  handoff no strict-prefix consumer would accept. The three per-OS decision
  forwarders now carry `MSYS_NO_PATHCONV: "1"` and deliver the trigger body
  through stdin (`--body-file -`), so no "/oc" string is ever an argv element
  of a native process. Statically enforced by R18 in
  `.github/scripts/silent-stall-audit.sh`.
- The review gate only forwards a verdict that was actually published (issues
  #616, #637): a reviewer death between the decision-file write and the
  comment post used to leave the decision file behind with zero published
  findings, and the gate forwarded that unread verdict; separately, a healthy
  session that ended on any message other than the sign-off-bearing decision
  comment (the wrapper publishes only the session's FINAL message, so a
  post-compaction wrap-up replaced the composed verdict; review run
  39089530715 on PR #636) had its verdict discarded by a fail-loud branch
  with no auto-retry. The verify step now requires positive publication
  evidence - a github-actions[bot] comment created after the trigger whose
  body carries the reviewer sign-off line
  (`.github/scripts/review-comment-published.sh`) - discards unpublished
  verdicts before the retry and forward paths, treats a provably unpublished
  verdict as the crash signature regardless of the agent step's outcome (so
  the success+unpublished class runs the same bounded auto-retry a failed run
  uses; the reviewer prompt requires the final message to be the complete
  sign-off-bearing decision comment), fails closed when verification itself
  fails, and both forward steps are gated on the verify step's success.
  Enforced by R19 in `.github/scripts/silent-stall-audit.sh`, which also
  executes the real extracted verify block in a sandbox git repo against a
  mock `gh` across the crash/unpublished/cap/denial matrix.
- Bounded retry caps cannot silently defeat themselves on busy threads (issue
  #621): every retry/auto-heal/gate enumeration reads thread comments with the
  paginated slurp form (`?per_page=100` plus `--paginate --slurp` piped through
  `jq '.[][] | ...'`), because the REST API serves 30 comments per page oldest
  first and an unpaginated read sees only the oldest page, so the recent retry
  markers fall outside it and the cap reads 0 forever (the phantom-zero loop a
  truncated page used to sneak past the refuse-to-retry guard). R20 pins every
  enumeration site, scans every workflow for unpaginated comment reads, and
  functionally executes each real cohort enumeration pipeline against a mock
  `gh` bound to a
  3-page payload whose markers sit on page 3 (34-comment thread shape), proving
  the count reads 3 and the cap trips. Enforced by R20 in
  `.github/scripts/silent-stall-audit.sh`.
- The PAT merge sweep only merges a workflow-touching PR on a shape-anchored,
  head-bound tester verdict (issue #619): an unanchored substring match let a
  Maintainer decisions summary that merely quoted the tester marker while
  describing another PR count as this PR's approval, and the sweep merged
  unreviewed workflow PRs three times in one evening (maintainer run
  39059718673 merged #618 at 18:55:19Z, its real verdict arriving at
  19:00:08Z; the same pre-fix sweep merged the rebased #609 at 19:23:15Z on
  its pre-rebase verdict; and run 39062904001's summary quote merged #624 at
  19:38:31Z with zero verdicts on record), while the same runs skipped
  genuinely approved lanes as mergeable=UNKNOWN (GitHub recomputes
  mergeability right after the sweep advances main). The verdict marker must
  now be the comment's entire first line (optionally backticked), every
  approval must not predate the head's last push (commit committer dates plus
  head_ref_force_pushed timeline events; fail closed when unavailable), and
  mergeable=UNKNOWN is re-queried a bounded number of times before skipping.
  Enforced by R21 in `.github/scripts/silent-stall-audit.sh`.
- A tester maintainer verdict must be published in the sweep's canonical shape
  (issue #629): a prose-first decision comment ("All green. Posting the
  decision comment." with the marker on a later line) never matches the sweep's
  entire-first-line anchor, so PR #628's workflow-touching head stalled at the
  sweep even though the read-only infra test run 39067932835 concluded SUCCESS
  with a genuine approval (review approved 20:43:33Z; comment 6240760500,
  evidence scope infra, posted 20:46:03Z with the marker on line 3), and PR
  #614's read-only verdict (comment 6240507941, 20:27:01Z) surfaced the same
  prose-first shape. `opencode-test.yml` now
  requires positive publication evidence
  (`.github/scripts/test-comment-published.sh`: a github-actions[bot] comment
  created after the trigger whose body carries the `- the Tester` sign-off),
  discards an unpublished or unverifiable maintainer verdict before the
  forward path, and
  the workflow then publishes the canonical marker itself
  (`.github/scripts/publish-tester-marker.sh`: first line exactly
  `/oc approve-test`, bot-authored, re-fetched and verified by id) from the
  evidence-gated machine handoff - never for a non-maintainer decision and
  never for a `scope=unrunnable` escalation. The R21 anchor is therefore
  guaranteed by construction instead of agent prose formatting, and R21 is
  unchanged. Enforced by R22 in `.github/scripts/silent-stall-audit.sh`.
- The Maintainer cannot land infra/model/workflow changes herself: routine
  changes route to the Lab Engineer (`{"action":"lab"}`), and the direct-to-main
  revival path fires only with a complete `.maintainer/emergency.json`
  declaration (a linkable failed lab attempt + halted production); without it,
  her protected-path edits are reverted automatically and never pushed.
- Timers are evaluation triggers, not deadlines; the Maintainer logs every
  decision with rationale.
- `shutdown.sh --purge` removes workflows, agents, secrets, and branch
  protection - human regains full control.

## Bootstrap note

The lab foundation (this document, `.github/agents/`, the workflows) was
landed directly with owner approval. From the first merged lab change
onward, every lab change flows through the standard review gate like any
other build - including changes the Maintainer makes to its own prompts.