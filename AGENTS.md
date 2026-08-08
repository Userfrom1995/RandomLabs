# Coding agent behavior

## GitHub workflow

- When a request requires code or documentation changes, always do the work on a dedicated branch (e.g. `opencode/<issue-number>-<short-description>`), commit your changes, push the branch, and open a pull request back to the default branch that references the source issue or comment.
- If a request is not already tracked by an issue, create an issue describing the task first, then reference it from the pull request.
- In the pull request description, list the issues it addresses. If the pull request fully resolves an issue, include `Closes #<issue-number>` so GitHub closes it automatically on merge.
- After a pull request is merged: if it fully resolved an issue and the issue is still open, close it with a short comment summarizing what was done.
- Only create issues and pull requests when a real change is warranted. Do not create them for purely informational replies or trivial clarifications.
