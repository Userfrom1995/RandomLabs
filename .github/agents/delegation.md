# Delegation, Parallelism, and Skills Protocol

Binding for every worker agent (Researcher, Architect, Builder, Fixer,
Reviewer, Tester, per-OS testers, Curator, Auditor, Evaluator, Design
Council) and for the Lab Engineer. This file is normative: prompts that
reference it MUST follow it. It changes no workflow wiring and no authority
boundaries.

## 1. Why this exists

Worker prompts previously described subagent use as prose ("you have an
army") with no threshold, no pattern, and no evidence. Runs therefore
defaulted to single-threaded work: one agent reading files serially,
exploring serially, and verifying serially. This protocol makes delegation
measurable: when to split, how to split, and what to record.

## 2. When to delegate (binding thresholds)

Delegate via the Task tool when ANY of these hold:

1. The task has 3 or more independent units (files to inspect, modules to
   implement, hypotheses to test, test dimensions to cover).
2. Exploration spans 4 or more files or 2 or more directories.
3. A verification pass requires a second perspective (correctness,
   security, performance) distinct from the authoring pass.

Do NOT delegate when the task is a single-file trivial edit, a one-line
fix with the file already open, or a purely informational reply. Delegation
is for leverage, not ceremony.

## 3. How to delegate (pattern)

1. Act as orchestrator: keep the primary context for planning, contracts,
   and synthesis. Push heavy lifting (reads, searches, drafts, test runs)
   to subagents.
2. Fan out in parallel: issue independent Task calls in a single turn with
   non-overlapping scopes and a precise return contract (what to return,
   how to verify). Never serialize independent work.
3. Use the right subagent type: `explore` for fast codebase search and
   orientation; `general` for multi-step research, implementation slices,
   and verification passes.
4. Bound each subagent: give it the exact files or question, the done
   criterion, and the verification command where one exists. Trust returned
   evidence; re-check only load-bearing claims with a cheap local read or
   run.
5. Synthesize, do not duplicate: when subagents return, integrate results
   once. Do not redo their work in the primary context.

## 4. Delegation ledger (evidence, lightweight)

Every run that delegates records a 3 to 8 line ledger in its normal
artifact (progress file agent log, PR description, or decision note):

- Which subagents were launched (type plus 3 to 5 word scope each).
- What each returned (one line per subagent).
- What the primary context verified itself (file reads, test commands).

Runs that legitimately do not delegate state one line: why the threshold
was not met (for example "single-file fix, file already open"). The
Reviewer treats a missing ledger on a task above threshold as a finding;
a present ledger is never a finding by itself.

## 5. Skills (discovery, vetting, use)

The known-skill list lives in `.github/agents/skills.md` (companion
registry; this section stays normative for the rules).

1. Discovery: when a task matches a skill domain (for example editing lab
   configuration, agents, or plugins), load it with the skill tool before
   acting. Do not guess at procedures a skill documents.
2. Vetting (for proposing new skills or external capabilities): weigh
   relevance (does it recur in lab work), trust (source, permissions,
   network or filesystem reach), and reversibility (can its effects be
   reviewed and reverted). Record the verdict in one line in the run
   artifact. Never install a skill that exfiltrates secrets or bypasses
   the PAT containment rule.
3. Use, not shelfware: if a skill was loaded, cite the guidance applied
   (one line). If no skill fits, say so in one line rather than forcing
   one. Shelfware (loaded but unused, or needed but unloaded) is a
   Reviewer finding only when it changed the outcome.

## 6. Harness isolation (verification runs must fail inert)

Verification harnesses (mock executables, extracted shell loops, scenario
matrices under `/tmp`) execute inside the live runner with real credentials
in the environment, so a dispatch mistake can mutate GitHub state at machine
speed. On 2026-10-17 a mock `opencode` script was written without the
executable bit; PATH search skipped the non-executable file and fell through
to the real CLI, and a 20-iteration retry matrix ran live `opencode github
run` commands that each posted an error comment on the trigger PR (lab run
39024455956). A mock that fails to intercept MUST fail inert. Binding rules:

1. Prove interception before the matrix: `chmod +x` every mock placed in
   PATH (a non-executable file makes PATH search silently fall through to
   the real binary), assert `command -v <name>` resolves to the mock path,
   and run one probe scenario that proves the mock answered.
2. Scrub the live GitHub context AND run outside any repository working
   tree (for example under `/tmp`): use
   `env -u GITHUB_TOKEN -u GITHUB_EVENT_PATH -u GITHUB_RUN_ID -u GITHUB_REPOSITORY -u GITHUB_ACTIONS`,
   so a mis-dispatched real binary cannot post API comments or use
   `GITHUB_TOKEN`. Scrubbing alone does not revoke checkout-persisted
   credentials (the `.git/config` extraheader), so the working-tree isolation
   is the second half of the guarantee.
3. No real-binary fallback: if a scenario needs real output, capture it as
   a fixture file; never shell out to the production binary for realism.
4. Verify zero external side effects after every harness run (no unexpected
   comments, reactions, pushes, or API writes) before reporting results; a
   harness result without that check is not evidence.

## 7. What this protocol does not change

- Authority: only the Maintainer (and scoped co-maintainers) call other
  agents via decision files and hardcoded PAT steps. Subagents are private
  helpers inside one run, never cross-run triggers.
- Quality gates: Reviewer, Tester, and Evaluator gates are unchanged. The
  ledger feeds them evidence; it replaces none of them. The measurable
  completion criteria live in `.github/agents/quality-gates.md`
  (companion; work is done only when every applicable gate passes
  with its evidence artifact).
- Single-threaded correctness: the primary agent remains responsible for
  the final diff, the final test result, and the final handoff.
- Continuous improvement: after every merged PR the lab verifies it still
  works, records the improvement with evidence, and tracks leftover work
  on the parent issue per `.github/agents/continuous-improvement.md`
  (companion; it records gate results and replaces none of them).
