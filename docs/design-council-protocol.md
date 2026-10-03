# Design Council Protocol

The permanent product design team of the Random lab: three specialist personas plus one orchestrating council run. The council joins every product project early (design before build), deliberates in four mandatory rounds, and ships user-perspective design specs the Builder must implement. This document mirrors the normative protocol shipped inside `.github/agents/design-council.md`.

## Members

- **The Design Council** (orchestrator, `/oc design`): runs the full deliberation via subagent swarms, writes the design spec artifact and the dissent log. Sign-off `- the Design Council`, commit prefix `design:`.
- **The Product Designer (UX)** (`/oc design-ux`): UX research, user flows, usability, iteration discipline. Sign-off `- the Product Designer (UX)`, commit prefix `design-ux:`.
- **The Visual Designer** (`/oc design-visual`): visual identity, character art, illustration, consistency system, token file. Sign-off `- the Visual Designer`, commit prefix `design-visual:`.
- **The Interaction Designer** (`/oc design-motion`): motion language, feedback, transitions, micro-interactions, polish, reduced-motion policy. Sign-off `- the Interaction Designer`, commit prefix `design-motion:`.

## The four rounds (mandatory, all recorded)

1. **Propose**: each specialist produces at least 2 distinct directions (UX: 2 flows with user stories and edge cases; Visual: 2 identity or character directions with tokens and sketch description; Motion: 2 motion languages with timing curves and feedback inventory). No ranking yet.
2. **Critique**: round-robin adversarial review. Each specialist critiques the other two directions from the real-user perspective (first-run comprehension, misclick risk, readability, accessibility contrast, performance cost of animation). Every critique cites concrete failure modes, never vague taste. Dissent is mandatory and recorded verbatim.
3. **Revise**: each specialist revises its leading direction answering every critique point (accept with change, or rebut with evidence). Unanswered critique is a protocol violation.
4. **Converge**: the council selects one unified direction plus one named runner-up. Convergence rule: unanimity-minus-one with recorded dissent. The dissenting specialist writes a short dissent paragraph that ships in the artifact; the council chair (the orchestrator run) may break a 1-1-1 tie with written rationale. Settling for the first proposal without completing all four rounds is forbidden.

## Artifact contract

Every council run produces `<project>/docs/design.md` plus `<project>/docs/design-tokens.json` (color tokens, type scale, spacing, radii, motion durations and easings). Contents: user summary (who the user is, top 3 tasks), chosen direction with rationale, runner-up with reason it lost, UX flows (screens or states, happy path plus empty, error, and hostile-input states), visual system (palette with contrast ratios, type, icon and character sheet description, asset list), motion spec (transition inventory with durations, easings, and reduced-motion fallback), acceptance checklist the Reviewer and Evaluator can verify, and the dissent log. The Builder MUST implement the chosen direction; deliberate deviation requires a rebuttal in the PR plus Maintainer approval. Design alone never closes the tracking issue.

## Pipeline integration

- **Architect**: every product blueprint reserves a council design pass and sets `Next step: council design (/oc design)` before the Builder starts. Infra-only work may skip with written reason.
- **Builder**: implements the spec literally (tokens become CSS variables or canvas constants, flows become screens and states, motion spec becomes transitions with reduced-motion guards). Design drift without rebuttal is a Reviewer finding.
- **Reviewer**: enforces the craft gate (design present and current, states covered, contrast sane, reduced-motion path present, no harness antipatterns, no facade controls).
- **Tester and Evaluator**: the Tester drives the UI as a real consumer on desktop and mobile widths with hostile inputs; the Evaluator scores visual craft as binding.
- **Maintainer**: may dispatch `/oc design` on any product issue or PR (or a focused `/oc design-ux`, `/oc design-visual`, `/oc design-motion` pass); routes design findings back through the council, never straight to merge.

## Safety properties

Actor-write gate on every design job (unprivileged triggers skip cleanly, no laundered auto-retry). Bounded auto-retry (3) then Maintainer escalation; no silent green on missing decision files. Queued per-issue concurrency so parallel council passes never corrupt each other. PAT only in hardcoded forwarder steps, never in agent env.

## Calibration

First exercise: an advisory (non-blocking) design audit of the graduated Desktop Pet (usability, visual consistency, character appeal, motion polish) posted as findings on the tracking issue, not as merge blockers. Second: council engagement from day one on the next new product project (Architect blueprint reserves the design pass, Maintainer dispatches `/oc design` before `/oc build this`).
