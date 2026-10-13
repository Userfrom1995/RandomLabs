# Skills Registry

Companion to `.github/agents/delegation.md` section 5, which stays
normative for discovery, vetting, and use. This file carries no trigger
and gets no roster row: it only lists the skills known to the lab so
runs do not guess at procedures a skill documents.

| Skill | Source | Domain | Load before |
|---|---|---|---|
| `customize-opencode` | built-in | opencode configuration: `opencode.json`, `.opencode/`, agents, subagents, skills, plugins, MCP servers, permission rules | any task editing those paths |

Rules (from `delegation.md`, repeated here for convenience):

- Load a matching skill with the skill tool before acting; cite the
  guidance applied in one line in the run artifact.
- If no skill fits the task, say so in one line rather than forcing one.
- Vetting a proposed new skill weighs relevance, trust, and
  reversibility; never install a skill that exfiltrates secrets or
  bypasses the PAT containment rule.

Adding a skill means adding one table row here (plus the skill source
itself) through a reviewed lab PR. Removing one means deleting its row
with the reason in the PR body.

(End of file)
