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
- The `opencode-review.yml` workflow posts a short `/oc fix` trigger using the owner's PAT when the reviewer has a pending `/oc fix` (the short trigger is what makes the implementer run — comments created with `github.token` do not trigger workflows; timestamp-based dedup prevents duplicate triggers per review round), force-restores the PR head if the reviewer run dirtied the branch, and merges approved PRs via `gh pr rebase --delete-branch` as the bot. The owner's account only ever posts `/oc review` and `/oc fix` triggers — never full comments.
- The implementer commits and pushes its own work itself (rule 12) with a clean message and no `Co-authored-by:` trailer, so all commits on PR branches are authored and attributed only to `github-actions[bot]`.
- If the implementer disagrees with a finding, it applies the changes it agrees with (partial changes are fine), posts a plain-text rebuttal as the bot explaining what it skipped and why, and pushes (an empty commit if it made no changes) to re-trigger the review round; the reviewer must read prior comments and honestly evaluate the rebuttal. A rebuttal must never start with `/oc` (that would get re-posted and loop).
- When you receive a `/oc` comment on a pull request while implementing (this workflow's `issue_comment` trigger), treat it as a review finding: apply all requested fixes to the pull request's branch and push. The next `synchronize` event starts another `/oc review` round. Never self-merge; the reviewer decides when the PR is done.
- When the reviewer approves, the review workflow merges the PR and then auto-closes every issue the PR body links with `Closes #N` (or `Fixes #N` / `Resolves #N`).

## GitHub Pages site

- The Pages site is built from `main` by `pages.yml`: the repo root `index.html` is the Random landing page (repo overview + links to projects and docs), and `docs/` holds the current project's documentation, served at `/docs/`. Never remove or overwrite the root landing page; a new non-web project replaces `docs/index.html`.
- `pages.yml` also runs a PR-preview feature: the `deploy` job stages a preview of every open PR under `/preview/pr-<N>/`, and the `comment` job posts the preview URL on the PR. Previews are built from open PR branches at deploy time — they are never committed to the repo, and the feature must not be removed or broken.

## Daily auto-generated ideas

- A daily cron workflow (`idea.yml`) runs an ideation agent that reads the `ideas/` folder and open issues, proposes a unique idea (or an improvement of a previous one), opens an issue with the `agent-generated` label, and comments `/oc` to trigger the implementation agent.
- The implementation agent builds the code and includes an `ideas/YYYY-MM-DD-keyword-description.md` writeup in the same PR.
- The reviewer agent reviews the PR (including the ideas entry) and merges it.
- The daily run skips if an open PR or open bot-created issue already exists (no pile-up). Manual dispatch with `force: true` bypasses this.
- Both the daily path and the manual `/oc` path coexist identically.
