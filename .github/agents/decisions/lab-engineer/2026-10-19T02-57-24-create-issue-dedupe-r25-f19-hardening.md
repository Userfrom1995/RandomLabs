# R25 hardening round 10: main rebase and renumber (F19), repo-root module identity (F20), effective execution shape (F21)

Round-9 review of PR #670 (issue #668) verified the F17/F18 closures and
filed three new blocking structural/test-integrity findings. This round
closes all three. The shipped handler is byte-identical to the handler
confirmed in every prior round (md5
`09f5118e2691d8ccad4ce33fc4da7c19`; untouched this session).

## Findings addressed

- **F19 (blocking, structural):** main's issue #692 landed while this branch
  was in review and claimed rule number R24 for the per-OS arm cap headroom
  and partial-report salvage contract (commits `56ed1875`, `29929fde`,
  `75de2769`), so the branch was CONFLICTING and a kept-both merge would
  have left two `# [R24]` rule headers, four `check "R24"` calls, and a
  shared `r24_bad` shell variable (the two rules' bad-token accumulators
  colliding).
- **F20 (blocking, test-integrity):** the extractor and the normalization
  fixture runner ran with cwd on `sys.path`, and the functional sandbox ran
  in a private work dir with no shadowing files, while production runs the
  handler with cwd set to the workspace root. A committed repo-root `json.py`
  could special-case the `_load_open_issue_titles` caller and return `[]`:
  audit 24/0, dedupe dead in production. A repo-root `yaml.py` could equally
  redirect the extractor itself.
- **F21 (blocking, test-integrity):** the anchored step's own keys were
  pinned (F17/F18) but its EFFECTIVE execution shape was not: a
  workflow-level or job-level `defaults: run: shell: cat {0}` (or
  `working-directory`) rewrites the effective shell without touching the
  step, and an extra step env key (`BASH_ENV`) passed 24/0 while the handler
  was dead in production. The same class extends to a workflow-level or
  job-level `env:` key (a merged `PYTHONPATH`) and a job-level `container:`.

## What changed

1. **Rebase onto current main and renumber to R25**
   (`.github/scripts/silent-stall-audit.sh`,
   `.github/workflows/opencode.yml`, `.github/workflows/auditor.yml`,
   `.github/agents/tester.md`, `.github/agents/maintainer.md`, `AGENTS.md`,
   `LAB.md`). A direct `git rebase origin/main` conflicted in the audit
   script's header and R24 block region; the content was rebuilt as a
   net-diff rewrite onto `origin/main` (`75de2769`): main's R24 (#692) block
   is kept verbatim, and this branch's dedupe rule is renumbered R24 -> R25
   everywhere, with its block's `r24_*` shell variables renamed `r25_*` so
   the two rules share no identifiers. The eight prior dedupe decision
   notes keep their r24 filenames and text as historical records. Main's
   own R24 rule and documentation trail are intact (V2 census).
2. **Repo-root module identity (F20):** the extractor runs
   `python3 -I - "$R25_WF"` and the normalization fixture runner
   `python3 -I -`, so neither the audit's own analysis nor its fixtures can
   be redirected by a repo-root module; a static scan fails loudly with
   `repo-root(<mod> shadows stdlib)` for
   `json os re subprocess time sys sitecustomize usercustomize` committed at
   the repo root as `<mod>.py` or a package directory with `__init__.py`;
   and `r25_run` mirrors the repo root's top-level `*.py` files and package
   directories into the sandbox work dir, so any shadow is imported there
   exactly as in production and also breaks the functional assertions
   (defense in depth; verified together by the m5 mutation: static token
   plus functional failures).
3. **Effective execution shape (F21):** the parse-tree extractor now
   rejects malformed defaults shapes and any `shell`/`working-directory`
   key in `defaults.run` on the workflow scope or the anchored job
   (`handler-effective-defaults-set:<scope>`), any workflow-level or
   job-level `env` key (`handler-workflow-env-set` / `handler-job-env-set`),
   a job-level `container` (`handler-job-container-set`), a step-level
   `working-directory` (`handler-step-working-directory-set`), and any step
   env key set other than exactly `{GH_TOKEN, BOT_TOKEN}`
   (`handler-step-env-keys-changed`, with a non-mapping env failing as
   `handler-step-env-malformed`).
4. **Contract text sync:** R25 header property 8, the extractor comment,
   the R25 PASS text, `AGENTS.md`, and `LAB.md` state the F19/F20/F21
   contract; residual ranges updated to F4-F21.

## Verification ledger (this session)

- Control audit `25 passed, 0 failed` on `.github/workflows/opencode.yml`
  after the renumber (19s) and again after every subsequent edit,
  including the final tree (`50f66fcd` and `d8868123`).
- V1 (isolated clone at `50f66fcd`): control 25/0; six mutations fail with
  their intended tokens (job defaults `handler-effective-defaults-set:job`,
  workflow defaults `:workflow`, extra step env key
  `handler-step-env-keys-changed`, step working-directory
  `handler-step-working-directory-set`, repo-root json.py
  `repo-root(json shadows stdlib)` plus functional failures, repo-root
  sitecustomize.py `repo-root(sitecustomize shadows stdlib)`); final
  control 25/0; handler md5 intact; clone clean.
- V3 (isolated clone at `d8868123`): control 25/0; workflow env
  `handler-workflow-env-set`, job env `handler-job-env-set`, job container
  `handler-job-container-set`, and the F20 json.py sanity mutation all fail
  as intended; final control 25/0; handler md5 intact; clone clean.
- V2 (read-only, primary tree at `50f66fcd`): renumber census (no stale
  dedupe R24 reference; main's #692 R24 rule and docs intact);
  `check "R25"` x2 and `check "R24"` x2; `bash -n` OK; governance docs
  consistent; F20/F21 implementation present at the claimed locations; zero
  em dashes in `git diff origin/main`; handler md5 intact; diff stat 16
  files, +3479/-21.
- Primary: three effective-environment mutations
  (`handler-workflow-env-set`, `handler-job-env-set`,
  `handler-job-container-set`) verified before V3's independent rerun;
  handler md5 rechecked after every mutation; `git status` clean.

## Delegation ledger

- **V1** (general; adversarial mutation closure in an isolated clone at
  `/tmp/opencode/v1r10`): six-mutation matrix plus control, exact tokens,
  handler md5 and clean status asserted.
- **V2** (general; read-only renumber/docs/implementation sweep): census of
  every R24/R25 occurrence with classification, check-count and summary
  assertions, docs consistency, F20/F21 implementation locations, hygiene.
- **V3** (general; independent mutation closure for the extended pins in an
  isolated clone at `/tmp/opencode/v3r10`): three effective-environment
  mutations plus the F20 sanity mutation, control before and after.
- **Primary (this session):** implemented the rebase/renumber, the F20 and
  F21 closures and the effective-environment extension; updated contract
  text in the audit script and both docs; ran the control audit after every
  edit and the mutation matrix for the extension.
- **Skills:** no skill fits (GitHub Actions lab infrastructure, not
  opencode workspace configuration).

## Known residual / gap boundary

- A wholesale rewrite of the executing step into unrelated code carrying
  none of the three handler needles, with a canonical decoy left in place,
  passes the structural checks; visible in the diff, documented as the
  review-gated boundary (unchanged from prior rounds).
- `R25_REPO_ROOT` resolves via `dirname "$0"`; a symlinked or relocated
  invocation fails loudly with `repo-root(unresolved)` rather than passing
  silently.
- Job-level `runs-on`/`timeout-minutes` and step-level `timeout-minutes`
  can still change runtime characteristics without tripping the structural
  pins; they remain visible-in-diff, the same review-gated boundary class.
- `handler-run-empty` is effectively unreachable (the needle check exits
  first on a truly empty anchored run); retained as defense in depth.
- The expected text lives in the audit script beside the checker, so a PR
  editing both handler and audit passes the in-tree audit; unchanged from
  prior rounds, and exactly what the review gate exists for.

- the Lab Engineer
