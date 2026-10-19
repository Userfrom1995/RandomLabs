# R25 hardening round 13: F25 pre-handler effective PATH and env-file channel closure

Round-12 review of PR #670 (issue #668) verified the F23/F24 isolation
closures and filed one blocking test-integrity finding (F25): the R25 pins
covered the anchored handler step, its workflow/job scopes, and the
repo-root module surface, but nothing pinned the pre-handler steps whose
`$GITHUB_PATH`/`$GITHUB_ENV` writes and PATH-directory contents define the
handler's effective binary, interpreter, environment, and input file. The
duplicate-filing hole was demonstrably live at `25 passed, 0 failed` for
several one-line mutations. The dedupe handler itself is untouched this
round: every fix is audit-side plus contract text.

## Findings addressed

- **F25 (blocking, test-integrity):** the reviewer ran three variants that
  kept the whole audit green while the handler was hijacked:
  (v1) the pinned `echo "$HOME/.opencode/bin" >> $GITHUB_PATH` line
  (`maintainer.yml:198`) mutated to also append a repo-controlled
  `$GITHUB_WORKSPACE/repo-bin` directory while the PR committed a fake `gh`
  there (the planted gh answered the dedupe query with `[]`, so the exact
  duplicate recurred); (v2) a sibling pre-handler step writing
  `BASH_ENV=<repo path>` to `$GITHUB_ENV` plus a committed env file (the
  repo-controlled `python3` then executed the pinned `python3 -I -` line,
  defeating the F23 isolation at the binary layer); (v3) a sibling step
  planting a fake `gh` into the pinned `$HOME/.opencode/bin` directory,
  which is already FIRST on the runner's PATH. Reviewer citations:
  `maintainer.yml:198`; audit `:4888-4892` (`handler-job-env-set`),
  `:4925` (`handler-step-env-keys-changed`), PASS text `:6463`. The
  prescribed minimum fixes were (a) an env-file write allowlist over the
  pre-handler steps with the PATH step's body pinned exactly, (b) a
  pre-handler step-sequence pin plus exact run bodies (or a targeted
  write-scan), (c) header/PASS/AGENTS.md/LAB.md sync, and (d) defense in
  depth in the functional sandbox.

## What changed (all in `.github/scripts/silent-stall-audit.sh`)

1. **F25 static checks in R25EXTRACT (new exit codes 16-21):** the exact
   pre-handler step sequence under the effective names GitHub displays
   (including the YAML-comment-truncated decision-contract name `Verify
   Maintainer wrote its decision contract (loud failure, issue`) is pinned
   (16); every pre-handler run line mentioning `GITHUB_PATH`/`GITHUB_ENV`
   (17), `.opencode` (18), or `decision.json` (19) must be one of the
   exact allowed lines hardcoded in the extractor (the PATH echo, the two
   `EMERGENCY_GATE` writes, the cached-binary probes, and the
   decision-contract reads); the PATH-adding step's body must be exactly
   the single echo line (20); and every `gh issue create` invocation in the
   whole workflow must live in the anchored handler step, checked
   spelling-robustly over the space/quote-normalized run text (21,
   adversarial-hunt closure: an added post-handler step or extra job
   creating issues directly would bypass the guarded path).
2. **Pre-handler canonical region pin (the structural closure):** the
   extractor emits a deterministic manifest of the whole pre-handler region
   (per-step header with effective name, `id`, `uses`, `if`, `shell`,
   `working-directory`, `continue-on-error`, `timeout-minutes`, the FULL
   `env` map including values, and the `with:` map, plus every run line
   with blank lines dropped). The shell section compares it byte for byte
   against the `R25PRE` heredoc, so no pre-handler line can be inserted,
   re-indented, replaced, or re-ordered in ANY spelling, not only the
   named channels: the demonstrated constructed-path plant
   (`d="$HOME/.open"; d="${d}code/bin"`), a dynamically spelled
   `GITHUB_PATH` bucket (`p=$(printf 'GITHUB_%s' PATH)`), a value-only env
   swap (a secret moved onto `OPENROUTER_API_KEY`, `USE_GITHUB_TOKEN`
   flipped, the inline maintainer `PROMPT` overwritten), an added
   `if:`/`env:` key, and a benign-looking run-line insertion all fail
   `maintainer.yml(pre-handler-block-changed)`. A legitimate pre-handler
   edit fails loudly until the heredoc is regenerated with the same
   extractor (documented in property 9).
3. **Sandbox PATH composition (defense in depth, reviewer fix (d)):** the
   extractor emits the path directories derived from the exact-pinned
   `$GITHUB_PATH` step(s) (today exactly `$HOME/.opencode/bin`) to a second
   output; `r25_run` resolves them against the sandbox `$HOME`/
   `$GITHUB_WORKSPACE`, mirrors a `$GITHUB_WORKSPACE`-derived directory
   from the repo if one is ever derived, prepends them BEFORE the mock
   bin, and plants a failing fake `gh` into the first resolved directory
   for one dedicated `pathshadow` scenario: an empty mock invocation log
   proves the composition order is load-bearing. The negative control
   (mock bin first) fails with `functional-pathshadow-mock-drained`, so a
   reorder regression cannot silently neutralize the derivation.
4. **Contract text sync:** R25 header property 9 (the full F25 rationale,
   the named channels, the canonical region pin, the sandbox composition,
   the issue-create uniqueness check, and the review-gated boundary), the
   R25 PASS text (F25 named, full env maps, the uniqueness check, the
   derived-PATH shadow scenario, residual range `F4-F25`), `AGENTS.md`
   (the create-issue dedupe bullet), and `LAB.md` (the R25 section,
   residual range `F2/F4-F25`).

## Verification ledger (this session)

- Control audit `25 passed, 0 failed` on `.github/workflows/opencode.yml`
  after every edit wave including the final tree; `bash -n` clean.
- Handler untouched: `git diff -- .github/workflows/maintainer.yml` is
  empty; whole-file md5 `05e477fa6a503fbfeb44365d6d5950a9` equals HEAD
  (independently re-verified by subagent B).
- Before/after, reproduced first-hand with the full audit: the reviewer's
  v3-class plant (dynamically spelled fake-gh plant appended to a
  pre-handler step) -> HEAD audit `25 passed, 0 failed` (the hole), fixed
  audit `FAIL R25 ... maintainer.yml(pre-handler-block-changed)`; the
  v1-class PATH append -> HEAD audit green, fixed audit
  `FAIL R25 ... handler-effective-envfile-write:echo
  "$GITHUB_WORKSPACE/repo-bin" >> $GITHUB_PATH`.
- Primary mutation matrix (fast extractor harness, each mutation applied to
  the real `maintainer.yml` then restored): m1 PATH-append block (17), m1b
  bucket-name spelling (17), m1c printf-spelled `GITHUB_PATH` (manifest
  mismatch), m2 PATH step repointed (17), m3 `BASH_ENV` via `GITHUB_ENV`
  (17), m4 decision rewrite (19), m5 token-spelled fake-gh plant
  (manifest), m6 step rename (16), m7 benign run-line insert (manifest),
  m8 added `if: false` (manifest), m9 PATH echo commented out (20), m10
  added env key (manifest), env-value swaps (`OPENROUTER_API_KEY` ->
  `OPENCODE_PAT`, `USE_GITHUB_TOKEN` flip: manifest), post-handler
  `gh issue create` step (21), extra job with the Python-form create call
  (21). Control green after every restore.
- `pathshadow` negative control: with `PATH="$r25_bin:${r25_path_prefix}..."`
  (mock first) the full audit is `24 passed, 1 failed` with
  `FAIL R25: ... maintainer.yml(functional-pathshadow-mock-drained)`.
- Manifest regeneration idempotence: the embedded `R25PRE` heredoc is
  byte-identical to a fresh extractor run on the pristine workflow (494
  lines, exactly 17 step headers), and the emitted path list is exactly
  `$HOME/.opencode/bin`.
- Zero U+2014 em dashes in the diff and the three changed files; no secret
  literals added (only `${{ secrets.OPENCODE_PAT }}` /
  `${{ secrets.OPENROUTER_API_KEY }}` expressions already present).

## Delegation ledger

- **Subagent A** (general; adversarial F25 mutation hunt, own throwaway
  repo copy, 8 full-audit runs plus fast triage): confirmed the whole F25
  layer (sequence, allowlists, PATH-step body, manifest, derived PATH)
  catches every in-scope mutation tried, including several secondary
  spellings; its out-of-scope escapes (pre-step env VALUES, post-handler
  and extra-job direct `gh issue create`, `runs-on`/`permissions`/
  `concurrency` changes, agent-prompt semantics) drove two closures taken
  this round: full env values in the region pin and the workflow-wide
  issue-create uniqueness check. Its residual list (cache poisoning,
  agent-step runtime writes, floating action tags, job-level keys) is
  recorded below.
- **Subagent B** (general; independent verification, own copy): reproduced
  control 25/0, the handler-untouched md5 equality, all five requested
  mutations caught with the expected tokens, the pre-fix green / post-fix
  red pair, manifest regeneration byte-identity, and the hygiene sweep
  (only the three intended files modified, zero em dashes). No
  discrepancies found.
- **Subagent C** (explore; docs/scope sweep): no blocking findings;
  flagged the allowlist-provenance wording (hardcoded lists, not parsed
  from the workflow text) and the inert-for-today `$GITHUB_WORKSPACE`
  mirroring phrasing, both corrected by the primary in this round; also
  confirmed the historical decision notes' old range labels stay as
  history, and that no F25 decision note existed yet (this note).
- **Primary (this session):** implemented the extractor checks, the
  canonical manifest and heredoc, the sandbox composition and pathshadow
  scenario, the env-value and issue-create extensions, the contract text,
  and this note; ran the full control audits, the before/after
  demonstrations, the 15-mutation matrix, and the pathshadow negative
  control; reviewed and reconciled all subagent findings; wrote the
  handoff files.
- **Skills:** no skill fits (GitHub Actions lab infrastructure and audit
  engineering, not opencode workspace configuration).

## Known residual / gap boundary

- The canonical region pin covers the ENTIRE pre-handler region; the
  post-handler steps (18-22) and other job-level surfaces (`runs-on`,
  `permissions`, `concurrency`, `timeout-minutes`, `on:`) are outside
  R25's scope. The adversarial hunt's post-handler/extra-job direct-create
  escape is closed for every LITERAL `gh issue create` spelling by the
  token-based workflow-wide uniqueness check (21), including tabs, backslash
  continuations, global flags before the subcommand, and the multi-line
  Python list form (review finding F26; the round-13 space/quote-stripping
  version missed those spellings, corrected in round 14); a create executed
  from inside a repo script, composite action, or reusable workflow, and a
  create reached through a variable or command-substitution indirection at
  the call site, remain documented residuals, as does an env-file channel
  reached through one level of indirection inside a repo-local script
  (review finding F27).
  Runner substitution, permission revocation, and concurrency changes
  remain diff-visible changes outside the dedupe guard's trust boundary and
  are recorded here.
- Pre-handler env values are now pinned in full (including the inline
  maintainer `PROMPT`); the agent's own runtime writes (`$GITHUB_ENV`,
  `$GITHUB_PATH`, `BASH_ENV`, planted files during the agent step) happen
  in a later step and cannot be modeled by the static region pin; the
  handler runs in the same job, so a hostile agent transcript remains the
  trust boundary the sandbox cannot see, as documented.
- Cache content is not modeled: `actions/cache` restores `~/.opencode/bin`
  and the pre-handler cached-binary guard verifies only the `opencode`
  executable; a poisoned cache entry planting `gh`/`python3` there stays a
  recorded residual (out of R25's static model).
- Deliberate identity fingerprinting, thresholds above the fixture
  envelope, prose-keyed predicates, and context values outside the seeded
  shapes remain the documented review-gated residual, unchanged by this
  round; the wholesale executing-step rewrite boundary is also unchanged.

- the Lab Engineer
