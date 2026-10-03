# Design Council - Permanent Product Design, UI/UX, and Character Team

A permanent multi-agent Design Council that joins every product project early
(design before build), deliberates as a real council (propose, critique,
revise, converge with recorded dissent), and ships user-perspective design
specs the Builder must implement. It covers UX research and flows, visual
identity and character art, and interaction motion and polish. It is a council,
not a single agent: three specialist personas plus one orchestrating council
run real deliberation rounds and never settle for the first design that works.

## What Will Be Built

This blueprint defines the council for the Lab Engineer to implement. No
application code ships here; the deliverable of this blueprint is the normative
spec below plus the progress tracker. The Lab Engineer turns it into prompt
files, workflow wiring, registry entries, and doc sync on the build branch.

- **Four prompt files in `.github/agents/` (all `kind: worker`).**
  - `design-council.md` - The Design Council orchestrator. Trigger `/oc design`.
    Runs the full deliberation protocol below using subagent swarms that load
    the three specialist personas. Writes the design spec artifact and the
    dissent log. Sign-off `- the Design Council`. Commit prefix `design:`.
  - `design-ux.md` - The Product Designer (UX research, user flows, usability,
    iteration discipline). Trigger `/oc design-ux`. Fast single-specialist
    pass. Sign-off `- the Product Designer (UX)`. Commit prefix `design-ux:`.
  - `design-visual.md` - The Visual and Character Designer (visual identity,
    character art, illustration, consistency system). Trigger
    `/oc design-visual`. Sign-off `- the Visual Designer`. Commit prefix
    `design-visual:`.
  - `design-motion.md` - The Interaction Designer (motion, feedback,
    transitions, micro-interactions, polish). Trigger `/oc design-motion`.
    Sign-off `- the Interaction Designer`. Commit prefix `design-motion:`.
  - Every prompt file states: Owner is supreme authority, Hephaestus
    (Maintainer, Chief Orchestrator) is the main operational authority; both
    are obeyed. Bot identity `github-actions[bot]@users.noreply.github.com`,
    no `Co-authored-by:` trailers, zero em dashes, no PAT access (only
    `GITHUB_TOKEN`), read-before-write scope rules, and JSON decision protocol.
- **Council deliberation protocol (normative, shipped inside
  `design-council.md` and mirrored in `docs/design-council-protocol.md`).**
  Four mandatory rounds, all recorded in the design artifact:
  1. `Propose`: each specialist produces at least 2 distinct directions
     (UX: 2 flows with user stories and edge cases; Visual: 2 identity or
     character directions with tokens and sketch description; Motion: 2 motion
     languages with timing curves and feedback inventory). No ranking yet.
  2. `Critique`: round-robin adversarial review. Each specialist critiques
     the other two directions from the real-user perspective (first-run
     comprehension, misclick risk, readability, accessibility contrast,
     performance cost of animation). Every critique cites concrete failure
     modes, never vague taste. Dissent is mandatory and recorded verbatim.
  3. `Revise`: each specialist revises its leading direction answering every
     critique point (accept with change, or rebut with evidence). Unanswered
     critique is a protocol violation.
  4. `Converge`: the council selects one unified direction plus one named
     runner-up. Convergence rule: unanimity-minus-one with recorded dissent.
     The dissenting specialist writes a short dissent paragraph that ships in
     the artifact; the council chair (the orchestrator run) may break a 1-1-1
     tie with written rationale. Settling for the first proposal without
     completing all four rounds is forbidden.
- **Design artifact contract (what every council run produces).**
  Path: `<project>/docs/design.md` (for product projects) plus
  `<project>/docs/design-tokens.json` (color tokens, type scale, spacing,
  radii, motion durations and easings). Contents: user summary (who the user
  is, top 3 tasks), chosen direction with rationale, runner-up with reason it
  lost, UX flows (screens or states, happy path plus empty, error, and
  hostile-input states), visual system (palette with contrast ratios, type,
  icon and character sheet description, asset list), motion spec (transition
  inventory with durations, easings, and reduced-motion fallback), acceptance
  checklist the Reviewer and Evaluator can verify, and the dissent log.
  The Builder MUST implement the chosen direction; deliberate deviation
  requires a rebuttal in the PR plus Maintainer approval.
- **Workflow wiring in `.github/workflows/opencode.yml` (Lab Engineer).**
  Four new jobs (`design`, `design-ux`, `design-visual`, `design-motion`)
  mirroring the `architect` job shape: checkout with `github.token`,
  actor-write gate first, git identity per persona, clear decision file,
  `uses: ./.github/actions/opencode-run` with ONLY `GITHUB_TOKEN:
  ${{ github.token }}` in env (never `OPENCODE_PAT`), verify-or-autoretry
  (3 bounded retries, then `/oc maintainer`), forward decision, clean tree,
  trailer strip, held-run approval. Prefix-collision guard: the `design`
  council job fires on `startsWith('/oc design')` AND NOT on the three
  specialist prefixes (`/oc design-ux`, `/oc design-visual`,
  `/oc design-motion`, plus `/opencode` variants); each specialist job fires
  only on its exact prefix. The `general` job gains 8 new exclusion guards
  (`/oc design`, `/oc design-ux`, `/oc design-visual`, `/oc design-motion`
  plus `/opencode` variants) so general and council never double-fire.
  Concurrency groups `opencode-design-<issue>` with `cancel-in-progress:
  false` (queued, never corrupting). No PAT in any agent env; downstream
  triggers only via `/tmp/random-lab-decision.json` plus hardcoded PAT steps.
- **Pipeline integration (permanent, documented in LAB.md and AGENTS.md).**
  - `Architect`: every product blueprint MUST include a council design pass
    section (which flows, which character or visual identity questions, which
    motion needs the council will resolve) and sets `Next step: council
    design (/oc design)` before Builder starts. Infra-only work may skip with
    written reason.
  - `Builder`: consumes `<project>/docs/design.md` plus tokens; implements
    the chosen direction with real logic (no facade controls). Design drift
    without rebuttal is a Reviewer finding.
  - `Reviewer`: enforces the craft gate (new checklist block): design
    artifact present and current for product PRs, flows cover empty and error
    states, contrast and viewport behavior sane, motion has reduced-motion
    path, no developer-harness antipatterns (raw coordinate textboxes or raw
    JSON textareas where direct manipulation belongs, unclickable drop
    targets, accidental drag navigation, silent freezes).
  - `Tester` plus `Evaluator`: the Evaluator visual and presentation craft
    dimension stays binding; Tester exercises the design as a real consumer
    (clicks, drags, viewports, corrupt inputs with friendly alerts).
  - `Maintainer`: may dispatch `/oc design` on any product issue or PR,
    `/oc design-ux` (or visual, motion) for focused passes; routes design
    findings back through the council, never straight to merge.
  - Who can call: Maintainer, Architect (via decision handoff), Owner, and
    Builder (requests a design pass on its own branch). Whom the council can
    call: it writes `{"action":"build"}` (design complete, Builder proceeds),
    `{"action":"continue"}` (needs another council round), or
    `{"action":"maintainer"}` (blocked) to `/tmp/random-lab-decision.json`;
    hardcoded steps post the corresponding `/oc` trigger. It never posts
    `/oc` itself, never merges, never pushes workflow files.
- **Squad awareness (mutual, per CREATING_AGENTS.md).** Update the roster
  section in every existing prompt file (`maintainer`, `ideator`,
  `researcher`, `architect`, `builder`, `fixer`, `reviewer`, `tester`,
  `tester-linux`, `tester-macos`, `tester-windows`, `auditor`,
  `labengineer`, `curator`, `recover`, `evaluator`, `general`) so each agent
  knows the council: what it does, when it engages, and who may call it.
  New prompts reciprocate with a matching roster.
- **Registry and docs sync.** `REGISTRY.md`: 4 rows (Name, Role, Kind worker,
  Author, Date, Trigger keyword, Prompt file). Universal sync: `README.md`
  lab roster, root `index.html` agent list, `docs/index.html` team cards,
  `docs/index.md` what-it-is section, `LAB.md` agents table plus prompt-file
  list plus workflow map plus call-flow diagram plus a Design Council
  subsection, `AGENTS.md` sign-off roster plus call-flow diagram plus
  pipeline-integration paragraph. Zero em dashes everywhere; validate YAML
  and shell before push.
- **Calibration plan (advisory first, then binding).** First exercise: an
  advisory (non-blocking) design audit of the graduated Desktop Pet
  (usability, visual consistency, character appeal, motion polish) posted as
  findings on the tracking issue, not as merge blockers. Second: council
  engagement from day one on the next new product project (Architect
  blueprint reserves the design pass, Maintainer dispatches `/oc design`
  before `/oc build this`).

## Why

Recent builds including Desktop Pet ship solid functionality with
bare-minimum UI and UX (basic SVGs, messy feel, too little
user-perspective thinking). Functionality without craft is not excellence.
The lab needs a permanent team whose only job is the user: people who argue
about flows, character, and feel before code hardens, who propose multiple
directions and kill the weak ones with evidence, and who stay in the loop
through review and evaluation. A single agent cannot do this honestly; a
single pass always falls in love with its first sketch. A council with
mandatory dissent and a convergence rule makes review real instead of
theater, and joining early (design before build) is cheaper than polishing
a shipped facade at the end.

## How It Works

- **Early engagement.** Hephaestus picks a product issue. The Architect
  blueprint names the open design questions. The Maintainer posts
  `/oc design` on the issue. The council run checks out the issue branch
  (or main for a fresh issue), reads the blueprint and any existing UI,
  and executes the four rounds via subagent swarms (one swarm per
  specialist in Propose, cross-assigned critics in Critique, owners revise
  in Revise, chair synthesizes in Converge). Primary context stays clean;
  subagents carry the heavy exploration.
- **Artifact first.** The council commits `<project>/docs/design.md` plus
  `design-tokens.json` on the design branch and opens (or updates) the PR
  with `Refs #N` (design alone never closes the tracking issue). The PR
  body summarizes the chosen direction, the runner-up, and the dissent
  pointer. Decision file `{"action":"build"}` hands off to the Builder.
- **Build under design.** The Builder implements the spec literally:
  tokens become CSS variables or canvas constants, flows become screens and
  states, motion spec becomes transitions with reduced-motion guards. Any
  deviation ships with a plain-text rebuttal citing file and line.
- **Gated craft.** The Reviewer checks the craft gate block (design
  present, states covered, contrast sane, no harness antipatterns, no
  facade controls). The Tester drives the UI as a real consumer on desktop
  and mobile widths with hostile inputs. The Evaluator scores visual craft
  as binding. Failures route to Fixer or back to the council via
  Maintainer, never around them.
- **Advisory calibration.** The Desktop Pet audit exercises the protocol
  without blocking anything: the council posts its four-round output as
  findings, the lab learns the format, then the next project runs the full
  binding path from day one.
- **Safety properties.** Actor-write gate on every design job (unprivileged
  triggers skip cleanly, no laundered auto-retry). Bounded auto-retry (3)
  then Maintainer escalation; no silent green on missing decision files.
  Queued per-issue concurrency so parallel council passes never corrupt
  each other. PAT only in hardcoded forwarder steps, never in agent env.

## Module Breakdown

- `design-council.md` - orchestrator prompt: council protocol, subagent
  orchestration plan, artifact contract, convergence and dissent rules,
  decision JSON contract (`build`, `continue`, `maintainer`), sign-off.
- `design-ux.md` - Product Designer prompt: UX research method, user
  stories, flow notation, usability heuristics, iteration discipline,
  artifact section ownership (flows, states, acceptance checklist).
- `design-visual.md` - Visual and Character Designer prompt: identity
  method, token system, character sheet method (poses, expressions,
  consistency rules), illustration guidance, asset inventory, artifact
  section ownership (visual system, tokens file).
- `design-motion.md` - Interaction Designer prompt: motion language,
  timing and easing vocabulary, feedback inventory (hover, press, loading,
  success, error), transition specs, reduced-motion policy, artifact
  section ownership (motion spec).
- `opencode.yml` wiring - 4 jobs plus 8 general-job exclusions plus
  per-issue concurrency groups plus verify and forward steps (spec above).
- `REGISTRY.md` - 4 entries with trigger keywords and prompt paths.
- `LAB.md` (agents table, prompt list, workflow map, call-flow diagram,
  council subsection with engagement rules and gates) plus `AGENTS.md`
  (sign-off roster, call-flow diagram, integration paragraph).
- `README.md`, `index.html`, `docs/index.html`, `docs/index.md` - roster
  and card additions for the 4 council members.
- `docs/design-council-protocol.md` - public mirror of the deliberation
  protocol and artifact contract for humans and contributors.
- Calibration artifacts - Desktop Pet advisory audit (findings post, no
  merge block) followed by first binding day-one engagement.

## Test Matrix

- Static (Lab Engineer PR, Tester read-only infra guard): all 4 prompt
  files exist with zero em dashes; no `OPENCODE_PAT` in any agent env;
  `GITHUB_TOKEN: ${{ github.token }}` present on every design job; 8
  general-job exclusions present; prefix-collision guard present (council
  job excludes specialist prefixes); concurrency
  `cancel-in-progress: false`; registry has 4 rows with correct triggers
  and paths; every existing agent prompt mentions the council; universal
  docs updated (README, index.html, docs pages, LAB, AGENTS); YAML parses
  (`python -c yaml.safe_load`) and shell steps pass `bash -n`; audit
  script `silent-stall-audit.sh` still passes (or is extended with council
  coverage and passes).
- Dynamic (post-merge calibration, non-blocking): dispatch `/oc design`
  on a scratch issue and confirm the four rounds execute, the artifact
  plus tokens plus dissent log land on the branch, and the decision file
  routes to Builder; dispatch each specialist trigger once and confirm
  only the intended job fires (no double-fire with council or general);
  run the Desktop Pet advisory audit and confirm findings post without
  blocking merge; confirm Reviewer craft-gate block cites the artifact on
  the next product PR.
- Negative: unprivileged `/oc design` trigger skips cleanly (no agent,
  no auto-retry, no escalation); crashed run with no decision file fails
  loud and escalates to Maintainer within the bounded retry cap; design
  artifact missing on a product PR is a Reviewer finding, not a silent pass.
