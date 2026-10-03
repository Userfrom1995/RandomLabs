# Progress - Design Council

- **Issue:** #528
- **Branch:** opencode/issue528-20261003215241
- **Status:** in-progress
- **Updated:** 2026-10-03T00:00:00Z

## Checklist
- [x] Architect blueprint (ideas/2026-10-03-design-council.md)
- [x] Progress tracker scaffold
- [x] Council prompts: 4 prompt files (design-council, design-ux, design-visual, design-motion) plus docs/design-council-protocol.md mirror
- [x] opencode.yml wiring WRITTEN and VALIDATED (4 jobs plus 8 general exclusions, collision guard, queued concurrency, bounded retry), staged as appliable patch: PENDING PAT-backed application by Lab Engineer (see Workflows-permission note below)
- [x] Council registered in REGISTRY.md (4 rows plus Team Spirit bullet)
- [x] Squad awareness in all 17 existing agent prompts
- [x] Universal docs sync (README, index.html, docs/index.html, docs/index.md, LAB, AGENTS)
- [x] Static validation: YAML parses, no em dashes, no PAT in agent env, silent-stall audit R1-R13 passes
- [ ] Reviewer approve plus Tester approve-test plus Evaluator approve-eval on lab PR
- [ ] Maintainer merges; calibration starts (Desktop Pet advisory audit, then day-one engagement)

## Current step
Council implementation written. Blocked on push of the workflow file (see note). Handing to Maintainer to dispatch the Lab Engineer (`{"action":"maintainer"}`).

## Workflows-permission note (binding constraint, AGENTS.md Merge capability)
PRs touching `.github/workflows/*` cannot be pushed with the agent token (no `workflows` scope; pushes are rejected server-side). The validated wiring lives as `infra-patches/opencode-design-jobs.patch` (format-patch of the dropped wiring commit; verified with `git apply --check`). Lab Engineer path: check out this branch, `git am infra-patches/opencode-design-jobs.patch`, delete the `infra-patches/` staging file, and let the PAT-backed runner step push (it owns `workflows` scope). Then continue the pipeline (review, test, eval, merge, calibration).

## Next steps
- Reviewer: enforce agent-creation compliance (CREATING_AGENTS.md) plus craft-gate block spec.
- Tester: infra read-only validation plus trigger-collision checks (council vs specialist vs general double-fire).
- Evaluator: binding eval on the lab PR, then Maintainer merges.
- Calibration: advisory Desktop Pet audit, then council from day one on next product.

## Agent log
- 2026-10-03 (architect) - Blueprinted permanent 4-member Design Council (council orchestrator plus UX, visual-character, and motion specialists), 4-round deliberation protocol with unanimity-minus-one convergence and recorded dissent, artifact contract, workflow wiring with collision guards, pipeline gates, registry and docs sync, and calibration plan. Refs #528.
- 2026-10-03 (builder) - Implemented the council per the blueprint Module Breakdown: 4 prompt files with hierarchy, calling permissions, sign-offs, and JSON decision protocol; 4 opencode.yml jobs mirroring the architect shape (actor gate, GITHUB_TOKEN only, verify plus 3 bounded retries, forward, clean tree, trailer strip, held-run approval) with council prefix-collision guard and 8 general exclusions; REGISTRY plus 17-prompt squad awareness; universal docs sync including docs/design-council-protocol.md. Validated: YAML parses, zero em dashes, no PAT in agent env, audit R1-R13 13/13 pass. Refs #528.
