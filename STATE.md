# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~18:45Z, maintainer run 32762038490, owner comment event on PR #139). #139 fully approved + Tester PASS but merge mechanically REFUSED by a new workflows-permission regression => lab escalated on #70; D4 continuation re-fired on #131 after a 40-min stall.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt - they serve Prism.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim cites a fresh reproducible measurement in BOTH units. Corpus truth: e1 = 10.2904 / 3.4301; e3/e7 = 10.2861 / 3.4287 - about 19 percent above JXL parity at e1.
- **#134 HOLD (2026-08-24T12:07:26Z, owner):** "keep it in draft... wait for my action." Zero action until release. NOTE: owner's direct ox-alpha switch (601caaa, 18:07Z) superseded #134's deepseek purpose - closure/repurpose is the owner's call.
- **DECISION POINT RESOLVED:** D4 stretch chosen over honest closure (owner continue 17:38Z); formal stop-and-decide returns to the owner after D-series exhaustion with final dual-unit numbers.
- **NEW (18:07Z):** owner switched ALL agent models directly to `openrouter/stealth/ox-alpha` via direct push 601caaa256c (+ repo-name sweep). Old pins retired by owner fiat; falsification watch now applies to ox-alpha.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `601caaa256c`** (owner direct push; normal child of aa94ae4). Pages green on it (dispatch success 18:22:25Z).
- **MERGE-CAPABILITY REGRESSION (OPEN, escalated to lab on #70):** App-token rebase merge of workflow-touching infra PRs now refused ("refusing to allow a GitHub App to create or update workflow .github/workflows/lab.yml without workflows permission"). Same token merged #133 (9bb40298b, 01:41Z) and #136 (aa94ae4, 16:28Z) fine. Window opens post-601caaa. Suspect repo Actions settings flip during owner maintenance. DO NOT blind-retry; lab owns diagnosis/fix (settings restore preferred; PAT-backed hardcoded merge step acceptable; interim PAT merge of #139 authorized).
- **PR #139** (`opencode/lab-137-session-death-resilience`, head `a4994c6cc6`, MERGEABLE/CLEAN, non-draft): fixes #137+#138. Reviewer round-3 APPROVED 18:27:11Z; Tester PASS 18:35:27Z (run 32762528559); metadata verified correct via API (Closes #137/#138); orphan-safe (base aa94ae44e shared with main tip). ONLY the mechanical merge is blocked. On capability restoration: verify head unchanged + nothing newer than approvals => merge --rebase --delete-branch => main advances past 601caaa => #137/#138 auto-close (manually if not) => pages dispatch.
- Provider ledger: bursty windows continue on ox-alpha (rate-limit deaths of maintainer successors 32760618015 at 18:09Z, 32761106008 at 18:14Z; review attempts died 17:39/17:51/18:09x2/18:24Z but crash-parity self-healed all of them). Guards healthy; no model escalation (owner just pinned ox-alpha themselves).

## IN FLIGHT
- **#131 D4 continuation** re-fired by this run (`continue` decision; verdict chain: round-3 concluded continue 18:00:15Z but no resume engaged for ~40 min). Head `c8b01c85e1`, MERGEABLE/CLEAN. Watch its outcome next run.
- **Lab Engineer on #70**: merge-regression mandate (diagnose => restore => optionally land #139 via PAT).
- NOTHING else repo-wide. #134 draft-held.

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> build C0-C5 + rescope D0/D1/D2 (honest rejections) -> D3 checkpoint DONE (byte-identical proof, dual-unit fails honest) -> REVIEW ROUND 2 DONE (continue; docs-only F1a-g) -> F1 FOLD DONE -> REVIEW ROUND 3 DONE (continue handoff, fold verified) -> **D4 STRETCH RE-FIRED THIS RUN** -> then review round 4 automatic-first -> post-D4: formal owner stop-and-decide.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION (a) #70/#139: read lab outcome. Capability restored => merge #139 per the gate above (head check, orphan check vs CURRENT main tip, metadata readback, then --rebase --delete-branch; verify main > 601caaa; confirm #137/#138 closed; dispatch pages). Lab landed #139 itself => verify the same four post-merge facts. Lab dead once => error-class inspection, one sanctioned retry; twice + halted production => emergency contract arguable (not before).
2. FIRST ACTION (b) #131: read D4 outcome (comment plus job log). Clean => review round 4 automatic-first (standing checklist: dual-unit statements; fail-capable self-checks; decoder mirrors bits 3-6; corrected topology b50935ae2; A2-retraction propagation; I7 citability; D1/D2 rejection chains + G-anchor invariants; mixer mirrors; addendum 12 consistency; D0 harness-before-format ordering). Death => verify NEW auto-retry engaged server-side; manual fire only if demonstrably misbehaving, with run IDs.
3. Mirror a two-sentence pointer onto #131 answering the owner's 18:12Z summary question (full answer lives in run 32762038490's comment on #139).
4. NO project merges until dual-unit M2 AND M3 pass. Lab PRs (#139 class) merge freely once approved AND mechanically mergeable.
5. #134: zero action while hold stands.

## ISSUES
- **#130** - sole active workstream (Prism), carried by PR #131 through D4.
- **#137 + #138** - open; auto-close when #139 lands (metadata now correct).
- **#70 (Lab Health)** - carries the open merge-capability escalation; baseline-bug fix already live (#136).
- **#42 (Brainstorm)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- What changed repo-side at ~18:07Z to revoke App-token merges of workflow-touching PRs? Will lab restore it or land #139 via PAT first?
- Does the D4 continuation survive provider windows on the new ox-alpha pin?
- When will the owner release/close #134?

## STANDING LESSONS (in force)
- Shallow local diffs/merge-bases LIE (601caaa showed everything-as-added locally while being a normal child) - topology facts from commits/compare APIs ONLY.
- Paginate FULL comment timelines before declaring any gate silent (found the stalled #131 resume + unanswered owner question this way); verdicts post as comments while formal reviews stay empty.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure.
- Merge-token pushes do not trip workflows: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms at ref=main.
- Closing keywords resolve against ISSUES only - verify PR body linkage before merging (worked exactly as designed on #139).
- A deterministically-refused action is never blind-retried - escalate with evidence (applied to the merge refusal this run).

- Mae, the Maintainer
