# Contributing

Thanks for your interest in contributing to Random. This repository is an **automated project lab** entirely run by coding agents. Everything from ideation, building, QA, review, to merging and site deployment is orchestrated by Mae the Maintainer and her team of specialized agents.

However, human collaboration is highly welcome! You can contribute in several ways:

## Proposing an Idea

If you have an idea for something the agents should build:

1. Open an issue with a clear title and description of your idea.
2. **Mae the Maintainer** will automatically evaluate it on her next run (she surveys the repository multiple times a day).
3. If she likes the idea, she will open an official project issue and dispatch the **Builder** to create it. If she declines, she will close the issue with a polite explanation.

## Improving the Lab

You can contribute improvements to the agents' behavior, instructions, or pipeline logic. The prompts live in `.github/agents/` and the workflows in `.github/workflows/`:

- **Ideator** (`.github/agents/ideator.md`) - Improve how the ideation agent picks ideas, avoids generic concepts, or enforces complexity.
- **Builder / Fixer** (`.github/agents/builder.md`, `.github/agents/fixer.md`) - Improve how the agents scaffold projects, manage modular commits, and update documentation.
- **Reviewer** (`.github/agents/reviewer.md`) - Improve the strict review gate, code quality checks, and architectural review.
- **Tester** (`.github/agents/tester.md`) - Enhance how the QA engineer tests applications, validates functionality, and checks performance.
- **Maintainer** (`.github/agents/maintainer.md`) - Adjust Mae's management logic, evaluation rules, and merging limits.

If you want to suggest improvements to these components, you can either open an issue for Mae to handle, or open a Pull Request yourself. 

## Improving Documentation

- The global lab documentation is in the root `/docs/` folder (do not delete or overwrite the main landing page `index.html`).
- Each project has its own documentation in `/<project-name>/docs/`.
- Deep-dive technical writeups for projects live in the `/ideas/` folder.
- If you find documentation lacking, open an issue and the **General** agent or **Builder** can address it.

## Code Contributions (Manual)

If you want to build something yourself or fix a bug manually rather than having the agents do it:

1. Fork the repo.
2. Create a branch (`your-branch-name`).
3. Make your changes (e.g., updating documentation, fixing a bug, or even a new project).
4. Open a PR back to `main`.

**Note on Reviews**: The Reviewer and Tester agents will still automatically review your PR before it merges. They treat human code with the same strict standards as agent code! Mae the Maintainer will merge it once it passes the review gates.

## Guidelines

- **Keep changes focused** - one concept or fix per PR.
- **Follow existing conventions** - see `LAB.md` and `AGENTS.md` for architectural rules.
- **No Em Dashes** - The lab strictly forbids the use of em dashes (—). Use hyphens, colons, or parentheses instead.
- Do not overwrite or remove the README header or the global `/docs/` folder (these are central to the lab).
- Do not commit secrets, API keys, or tokens.
