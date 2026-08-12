# Decision files — protocol

Decision files record **who decided what, and why**, so the Reviewer can
respect recorded decisions instead of re-litigating them.

## Where they live

`.github/agents/decisions/<owner>/<timestamp>-<slug>.md` on the branch that
owns the decision (the Builder's/Fixer's PR branch), committed and pushed
with the work. Example:

```
.github/agents/decisions/Userfrom1995/2026-08-12T10-30-00-approve-rebuild-cadence.md
```

`<owner>` is the decider: the human (`Userfrom1995`), the Maintainer
(`mae`), or the Builder/Fixer (`builder`, `fixer`).

## Format

```markdown
# Decision: <title>

- **Decider:** <who> (owner / Mae the Maintainer / the Builder / the Fixer)
- **Date:** YYYY-MM-DDTHH:MM:SSZ
- **Applies to:** <issue/PR they are part of>
- **Status:** proposed | accepted | declined | superseded

## What was decided
<one paragraph — the decision itself, exactly>

## Rationale
<why — evidence, constraints>

## Notes
<optional — dissent, alternatives considered>
```

## Rules

- The Reviewer reads `.github/agents/decisions/**` in the PR's tree before
  deciding and respects `accepted`/`declined` decisions that concern the PR's
  scope.
- When a NEW decision is recorded, the Reviewer posts fresh findings on top
  of it — it never ignores a new decision.
- A `declined` decision is binding until the decider changes it; a `superseded`
  decision is ignored.
- Conflicts with the owner: the Maintainer logs the dissent and opens an
  issue titled `subject: the user is the boss` as the bot.