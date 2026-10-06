# T-544: repro.sh mcp-framing stale deferred grep

Status: complete

## Checklist
- [x] Reproduce: stale `grep -q '"deferred":\[\]'` never matches the
      double-encoded capabilities envelope (`deferred\":[]` on the wire)
- [x] Fix repro.sh mcp-framing step: layered python3 JSON parse with
      fixed-string escaped-grep fallback when python3 is absent
- [x] Regression pin: `terminal-browser/tests/test_mcp_framing_deferred.py`
- [x] Verify: new tests pass on fix, fail on unfixed repro.sh; `sh -n` clean;
      full python suite shows only pre-existing go-toolchain errors
- [ ] Reviewer / Tester / Evaluator gates (pipeline)

## Current step
Done. Ready for review.

## Next steps
- `/oc review`, then `/oc test`, then `/oc eval` before merge.

## Agent log
- 2026-10-06 (Builder): confirmed the bug by simulating tb-mcp
  `toolResult` double-encoding (compact JSON): old BRE grep NOMATCH,
  fixed-string escaped grep MATCH. Replaced repro.sh line 88 with a
  python3 two-layer JSON decode plus `grep -q -F '\"deferred\":[]'`
  fallback. Added 3-test regression pin. Positive and negative paths
  verified. Full `tests/` suite: only pre-existing `go missing` errors
  (no go toolchain in this container); pin fails on unfixed repro.sh
  and passes on fixed.
