# Coding agent behavior

## GitHub workflow

- When a request requires code or documentation changes, always do the work on a dedicated branch (e.g. `opencode/<issue-number>-<short-description>`), commit your changes, push the branch, and open a pull request back to the default branch that references the source issue or comment.
- If a request is not already tracked by an issue, create an issue describing the task first, then reference it from the pull request.
- In the pull request description, list the issues it addresses. If the pull request fully resolves an issue, include `Closes #<issue-number>` so GitHub closes it automatically on merge.
- After a pull request is merged: if it fully resolved an issue and the issue is still open, close it with a short comment summarizing what was done.
- Only create issues and pull requests when a real change is warranted. Do not create them for purely informational replies or trivial clarifications.

## Two-model review loop

- A separate reviewer workflow (different model) reviews every non-draft pull request. The reviewer is strictly read-only: it never commits, pushes, rebases, or merges, and it must leave the working tree untouched. It posts either an `/oc approve` comment (all checks pass) or an `/oc fix: ...` comment listing required changes.
- The reviewer runs with the `github.token` identity, so its comments and merges appear as `github-actions[bot]`.
- `opencode-review-trigger.yml` listens for pull requests opened/updated by `github-actions[bot]` and posts `/oc review` on the PR with the owner's PAT. Because the permission check keys on the comment's author, this makes the reviewer workflow run.
- The `opencode-review.yml` workflow re-posts the bot's `/oc` fix comment using the owner's PAT (this is what triggers the implementer — comments created with `github.token` do not trigger workflows), force-restores the PR head if the reviewer run dirtied the branch, and merges approved PRs via `gh pr rebase --delete-branch` as the bot.
- If the implementer disagrees with a finding, it posts a plain-text rebuttal as the bot and pushes a commit (even an empty one) to re-trigger the review round; the reviewer must read prior comments and honestly evaluate the rebuttal. A rebuttal must never start with `/oc` (that would get re-posted and loop).
- When you receive a `/oc` comment on a pull request while implementing (this workflow's `issue_comment` trigger), treat it as a review finding: apply all requested fixes to the pull request's branch and push. The next `synchronize` event starts another `/oc review` round. Never self-merge; the reviewer decides when the PR is done.

## Daily auto-generated ideas

- A daily cron workflow (`idea.yml`) runs an ideation agent that reads the `ideas/` folder and open issues, proposes a unique idea (or an improvement of a previous one), opens an issue with the `agent-generated` label, and comments `/oc` to trigger the implementation agent.
- The implementation agent builds the code and includes an `ideas/YYYY-MM-DD-keyword-description.md` writeup in the same PR.
- The reviewer agent reviews the PR (including the ideas entry) and merges it.
- The daily run skips if an open PR or open bot-created issue already exists (no pile-up). Manual dispatch with `force: true` bypasses this.
- Both the daily path and the manual `/oc` path coexist identically.
