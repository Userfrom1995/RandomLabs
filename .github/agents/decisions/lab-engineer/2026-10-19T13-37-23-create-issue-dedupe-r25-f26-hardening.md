# R25 hardening round 14: F26 literal-spelling scan and F27 pre-handler script env-file scan

> Round-15 correction: this note was written when the dedupe rule was
> numbered R25. After rebasing onto `main`, where issue #701 took R25 for
> lab/fix agent cap headroom, the dedupe rule is R26; the historical text
> below is preserved except for the corrections listed in the round-15
> note (`2026-10-19T14-21-57-create-issue-dedupe-r26-f28-f29-hardening.md`).

Round-13 review of PR #670 (issue #668) verified the F25 pre-handler
closure and filed two blocking test-integrity findings. F26: the
workflow-wide `gh issue create` uniqueness check stripped only spaces and
quotes, so a tab, a backslash continuation, or a global flag between `gh`
and the subcommand kept the audit green while a post-handler step filed
the duplicate. F27: the pinned pre-handler step invokes the repo-local
`.github/actions/opencode-run/resolve-model.sh`, and appending
`echo "BASH_ENV=..." >> "$GITHUB_ENV"` to that script kept the audit green
while the handler sourced the shim. The dedupe handler itself is untouched
this round: every fix is audit-side plus contract text.

## Findings addressed

- **F26 (blocking, test-integrity):** the uniqueness check at
  `silent-stall-audit.sh:5034-5061` (reviewed head) normalized only spaces
  and quotes.
  Prescribed minimum fix: a token-based scan so every literal
  `gh issue create` spelling (tabs, line continuations, global flags,
  multi-line Python list) fails.
- **F27 (blocking, test-integrity):** `maintainer.yml:210` executes
  `bash .github/actions/opencode-run/resolve-model.sh` before the handler,
  and that script is a runtime `GITHUB_ENV` / `GITHUB_PATH` / `BASH_ENV`
  channel. Prescribed minimum fix: scan the repo-local scripts executed by
  the pinned pre-handler steps for the three env-file channels.

## What changed (all in `.github/scripts/silent-stall-audit.sh`)

1. **F26 token scan:** the post-handler/extra-job check now treats the run
   text as whitespace-separated tokens after joining backslash
   continuations; any `gh` / `gh.exe` token whose remaining tokens contain
   both `issue` and `create` fails with
   `issue-create-outside-handler:<step>:<index>` (exit 21). The
   quote/whitespace-normalized form remains as a second detection layer
   for the multi-line Python list form (`"issue","create"`).
2. **F27 pre-handler script scan:** every repo-local `*.sh` / `*.bash`
   path referenced by a `bash`, `sh`, `source`, or dot-source invocation in
   a pinned pre-handler run line is resolved against the repo root
   (`sys.argv[4]`, now passed by the shell section) and read. Any
   `GITHUB_ENV`, `GITHUB_PATH`, `BASH_ENV`, `.opencode`, or
   `decision.json` occurrence fails with
   `handler-pre-script-channel:<path>:<token>` (exit 22); an unreadable
   script fails with `handler-pre-script-unreadable` (exit 22). The current
   tree references only `resolve-model.sh`, which is clean.
3. **Dot-source robustness:** the invocation regex accepts a dot-source
   (`. script.sh`) at line start or after a shell separator, not only after
   a word boundary, so the scanner contract matches the documented
   `bash|sh|source|.` set.
4. **Contract text sync:** the R25 header comment, the R25 PASS text,
   `AGENTS.md`, and `LAB.md` now name F26/F27, the token-based literal
   scan, the pre-handler script scan, and the residual classes. Range
   labels were advanced to `F2/F4-F27` and `F4-F27`.
5. **Round-13 note correction:** the F25 note now qualifies the uniqueness
   check as literal-spelling only and names the same residuals.

## Verification ledger (this session)

- Control audit `25 passed, 0 failed` on `.github/workflows/opencode.yml`
  after every edit wave and after the final doc sync; `bash -n` clean;
  `yaml.safe_load` succeeds on `maintainer.yml`, `opencode.yml`, and
  `auditor.yml`.
- Handler untouched: `git diff -- .github/workflows/maintainer.yml` empty;
  whole-file md5 `05e477fa6a503fbfeb44365d6d5950a9` equals HEAD.
- F26 mutation matrix (each applied to a throwaway copy, then restored):
  `gh -R owner/repo issue create`, tab-separated tokens, backslash
  continuation, `gh issue --repo owner/repo create`, multiple spaces,
  multi-line Python list, and `gh.exe issue create` all produced
  `24 passed, 1 failed` with
  `issue-create-outside-handler:<step>:<index>`.
- F27 mutation matrix: `GITHUB_ENV` write, `GITHUB_PATH` write,
  `.opencode` directory plant, and `decision.json` write appended to
  `resolve-model.sh` all produced
  `handler-pre-script-channel:.github/actions/opencode-run/resolve-model.sh:<token>`;
  a benign comment append stayed `25 passed, 0 failed`.
- Documented-residual probes (expected green, recorded as the boundary, not
  as a defect): a resolver that invokes a second script writing
  `GITHUB_ENV`, and a `.opencode` path assembled from shell variables with
  no literal token.
- Documentation sweep: no current claim still describes the uniqueness
  check as space/quote-only; the only old wording is the historical
  round-13 section of the F25 note, explicitly superseded there.
- Zero U+2014 em dashes in the five changed files (the audit script,
  `AGENTS.md`, `LAB.md`, and the round-13 and round-14 decision notes); no
  secret literals added; `git status --porcelain` shows only those five
  intended files.

## Delegation ledger

- **Subagent A** (general; adversarial F26/F27 mutation hunt, own copy):
  baseline 25/0; all seven F26 spellings caught with the expected token;
  all four F27 script mutations caught; benign control green; the two
  documented-residual probes green as expected. No unexpected green on an
  in-scope mutation.
- **Subagent B** (general; independent verification, own worktree):
  reproduced the control 25/0, the handler md5 equality, YAML parsing,
  `bash -n`, and the F26/F27 behavior; confirmed the extractor receives
  the repo root; confirmed the docs claims and residual wording; flagged
  the dot-source regex gap and the stale range labels, both fixed by the
  primary after its report.
- **Subagent C** (explore; docs/scope/residual sweep): no stale live
  claims; confirmed the round-13 note qualification, the four-file scope,
  the untouched workflow, and the zero-em-dash state; flagged the same
  range-label lag, fixed.
- **Primary (this session):** implemented the token scan, the script scan,
  the dot-source regex, the extractor repo-root argument, the contract
  text sync, and the round-13 note correction; ran the control audits and
  the combined mutation matrix; reviewed and reconciled all subagent
  findings; wrote the handoff files.
- **Skills:** no skill fits (GitHub Actions lab infrastructure and audit
  engineering, not opencode workspace configuration).

## Known residual / gap boundary

- The F26 scan is literal and token based by design: a create reached
  through a variable or command-substitution indirection at the call site,
  or a create executed from inside a repo script, composite action, or
  reusable workflow, stays review-gated. Round 15 closes the F29 spelling
  class (path-qualified executables, `env`/`command`/`bash -c` prefixes,
  tabs, backslash continuations, quote/backslash concatenation, ANSI-C
  quoting, shell metacharacters, and global flags between `gh` and the
  subcommand) with a shell-faithful scan and a red self-test matrix, so
  those spellings are no longer residual; a direct REST create
  (`gh api --method POST .../issues` or `curl .../issues`) stays
  review-gated alongside the indirection classes above.
- The F27 scan covers the scripts the pinned pre-handler run lines invoke
  directly. One level of indirection inside such a script (the script
  invoking another script, or a variable-expanded path with no literal
  token) remains review-gated.
- The pre-handler canonical manifest pin still blocks any new pre-handler
  run line, so a future legitimate script invocation fails loudly until
  the manifest is regenerated with the same extractor.
- Deliberate fingerprinting (fixture token strings, sandbox paths,
  per-title charset gates), character-class transformations outside the
  tested digit/space/truncation classes, and thresholds above the fixture
  envelope remain as previously documented.

Refs #668.

- the Lab Engineer
