# Creating Agents

This guide outlines the strict rules, architectural patterns, and mandatory checklist that must be followed when introducing a new agent or modifying an existing agent in the Random lab.

---

## 1. Security & Identity (The PAT Rule)
Agents must never be granted the authority or credentials of the repository owner.
- **CRITICAL**: Never pass `${{ secrets.OPENCODE_PAT }}` into the agent's environment (the `env:` block of `uses: anomalyco/opencode/github@latest`).
- Always use `GITHUB_TOKEN: ${{ github.token }}` for the agent's run environment. This ensures the agent authenticates properly as `github-actions[bot]`.
- The owner's PAT (`OPENCODE_PAT`) is strictly reserved for hardcoded, human-written YAML steps that execute *outside* the agent's environment.
- Always configure the git identity with the agent's persona display name (e.g. `The Builder`, `Hephaestus (Maintainer)`, `The Lab Engineer (CTO)`) and email `github-actions[bot]@users.noreply.github.com` before running any agent.

---

## 2. Formatting Compliance
- **NO EM DASHES**: You must NEVER use an em dash in any prompt markdown file, comment, commit message, documentation, or code comment. Use standard hyphens (-), colons (:), or parentheses instead.

---

## 3. Workflow Integration & `/oc` Guard Rules

When creating a workflow or trigger for a new agent:

### A. Main Event Bus (`opencode.yml`)
If the new agent is invoked via `/oc <keyword>` and shares `opencode.yml`:
1. Add a dedicated job or mode with an exact prefix check:
   ```yaml
   if: startsWith(github.event.comment.body, '/oc <keyword>')
   ```
2. **Exclusion Guards**: You MUST update the `general` agent's trigger condition to exclude your new `/oc <keyword>`. If you omit this, both the `general` agent and your new agent will trigger simultaneously on the same comment.
   ```yaml
   # Inside the general agent's if condition in opencode.yml:
   && !startsWith(github.event.comment.body, '/oc <keyword>')
   ```

### B. Standalone Workflows
If the new agent runs on a schedule or dedicated workflow (e.g. `auditor.yml` or `ideate.yml`):
- Ensure `cancel-in-progress: false` is set to respect queued execution.
- Set appropriate `permissions:` (`contents: read/write`, `issues: write`, `pull-requests: read/write`).
- Use `${{ github.token }}` in `actions/checkout` and in the agent's `GITHUB_TOKEN` environment variable.

---

## 4. Hardcoded PAT Steps (The Safe Way)
If an agent needs to trigger other workflows (e.g. by posting `/oc test` or `/oc maintainer`):
- The agent cannot do so directly with PAT privileges because it only has `github.token`.
- Use the **file-handoff pattern**:
  1. Instruct the agent in its prompt to write its desired comment/trigger to a local file (e.g. `comment.md` or `.agent/decision.json`).
  2. Create a separate, hardcoded step in the workflow YAML that runs *after* the agent completes.
  3. Pass `GH_TOKEN: ${{ secrets.OPENCODE_PAT }}` only to this hardcoded step.
  4. The step validates the file and posts the comment via `gh` CLI.

**Example YAML Pattern:**
```yaml
- name: Run agent
  uses: anomalyco/opencode/github@latest
  env:
    OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }}
    GITHUB_TOKEN: ${{ github.token }}
  with:
    model: opencode/deepseek-v4-flash-free
    prompt: |
      ...
      Write your trigger comment to `comment.md`.

- name: Post trigger comment (as owner)
  if: success()
  env:
    GH_TOKEN: ${{ secrets.OPENCODE_PAT }}
  run: |
    if [ -s comment.md ]; then
      gh issue comment ${{ github.event.issue.number }} -F comment.md
    fi
```

---

## 5. Squad Awareness & Inter-Agent Integration

When introducing a new agent or modifying roles, you must ensure the entire team is aware of it and that calling permissions are cleanly defined:

1. **Universal Mutual Squad Awareness (`.github/agents/*.md`)**:
   - Every single existing agent prompt MUST have its "Team Spirit & Squad Leadership" roster updated so every agent in the lab explicitly knows about the new member, their title, their responsibilities, and how they interact.
2. **Define Calling Permissions**:
   - Explicitly define **who is allowed to call the new agent** (e.g., Maintainer via `/oc maintainer` or Reviewer via `/oc test`).
   - Explicitly define **whom the new agent is allowed to call** (e.g., Tester calling Fixer via `/oc fix` or Maintainer via `/oc maintainer`).
   - Prohibit unauthorized calls (e.g., Tester cannot self-merge or call Builder directly).
3. **Synchronize Call Flow Diagrams**:
   - Update the ASCII team call flow diagrams across all documentation sites (`LAB.md`, `AGENTS.md`, `docs/index.md`, and `docs/index.html`) to accurately map the new agent's flow and handoff paths.

---

## 6. Universal Documentation Synchronization

Every new agent addition or modification MUST be synchronized across all core repository documentation:

- [ ] **`README.md`**: Add the new agent to "The Lab" roster bullet points.
- [ ] **`index.html`** (Landing page): Add the new agent to the "About This Repo" list.
- [ ] **`docs/index.html`** (Lab Docs Site): Add an agent card under the team section.
- [ ] **`docs/index.md`**: Add the new agent to the "What it is" section.
- [ ] **`LAB.md`**: Add the agent to the Agents table (§2), prompt files list (§17), and workflow map (§19).
- [ ] **`AGENTS.md`**: Add the agent to the sign-off roster and general workflow overview.
- [ ] **`REGISTRY.md`**: Register the agent with Name, Role, Kind, Author, Date, Trigger keyword, and Prompt file path.

---

## 7. Prompt Design & Best Practices

When authoring `.github/agents/<agent>.md`:
1. **Clear Role & Boundaries**: Explicitly state what the agent can and cannot do (e.g. read-only, code modifications allowed, specific issue labels).
2. **Authority Hierarchy**: Explicitly recognize that the Owner is the supreme authority (whose decisions override everything) and Hephaestus (Maintainer / Chief Orchestrator) is the main operational authority directing the squad. All agents must listen to and obey both Hephaestus and the Owner.
3. **Safety Net**: Provide a concise fallback safety net in the workflow prompt string in case `.github/agents/<agent>.md` cannot be read.
4. **Sign-off Instruction**: Every agent must end its output comments with its distinctive sign-off:
   - Example: `- the Auditor`, `- Hephaestus, the Maintainer`, `- Dr. Mob, the Researcher`, `- the Architect`, `- the Builder`, `- the Fixer`, `- the Reviewer`, `- the Tester`, `- the Lab Engineer`, `- the General agent`.
5. **Commit Subject Prefix**: Every agent that commits code must prefix commit messages with its role:
   - Example: `auditor: ...`, `researcher: ...`, `architect: ...`, `builder: ...`, `fixer: ...`, `lab: ...`, `maintainer: ...`.
6. **JSON Decision Protocol**: Prefer structured JSON output written to files over free-form chat for workflow handoffs.

---

## 8. Registration Checklist

Before submitting a PR for a new agent, verify:
- [ ] Prompt file created in `.github/agents/<name>.md` with zero em dashes.
- [ ] Added to `.github/agents/REGISTRY.md` with role, kind, trigger keyword, and prompt file.
- [ ] Workflow YAML created or updated with `GITHUB_TOKEN: ${{ github.token }}` (no PAT in agent env).
- [ ] Main event bus `opencode.yml` updated with exclusion guards if applicable.
- [ ] Prompts of existing agents updated with squad awareness and calling permissions.
- [ ] Universal documentation updated (`README.md`, `index.html`, `docs/index.html`, `docs/index.md`, `LAB.md`, `AGENTS.md`).
- [ ] All em dashes purged from documentation and prompt files.
