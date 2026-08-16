# progress/ — per-build progress files

Every build keeps a progress file here so any future run can resume the work
in seconds — resume mode depends on these files.

## Naming

`progress/<issue-number>-<slug>.md` (example: `progress/42-shaftcast-docs.md`).

## Format

```markdown
# Progress — <Name>

- **Issue:** #<N>
- **Branch:** opencode/<N>-<slug>
- **Status:** in-progress | complete
- **Updated:** YYYY-MM-DDTHH:MM:SSZ (run link)

## Checklist
- [x] scaffold + progress file
- [ ] core implementation
- [ ] tests
- [ ] docs/ + ideas entry
- [ ] reviewer findings addressed

## Current step
<what is being worked on right now>

## Next steps
- <the exact next actions a resuming agent must take>

## Agent log
- YYYY-MM-DD (run) — <what this run did>
```

## Rules

- Update the file BEFORE every push — work is always saved.
- `Status: complete` on the final push is the signal that fires the automatic
  reviewer trigger (opencode-review-trigger.yml).
- A branch with progress files that are not complete is an in-progress build —
  the Maintainer continues it via `/oc continue`, never restarts it.
- The reviewer checks progress-file honesty: a `complete` status with an
  unchecked checklist is a finding.