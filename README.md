# opencode_agent_test

A static, one-page landing site explaining the benefits of using **coding agents** in your development workflow and on GitHub.

## ✨ Features

- **Animated visuals** — live starfield background, orbit rings, terminal session, parallax cards, and scroll-reveal transitions
- **Explains the benefits** — instant code review, auto-generated tests, security scanning, bug fixes, docs, and repo-aware context
- **Zero build step** — plain HTML/CSS/JS. Open `index.html` locally or host it anywhere, no bundler or framework required
- **Polished design** — dark, glassy UI built with CSS custom properties and a system font stack (plus web fonts)

## 🗂️ Files

| File | Purpose |
| ---- | ------- |
| `index.html` | Landing page markup and copy |
| `styles.css` | All styling, layout, and animations |
| `script.js` | Background animation, scroll reveal, terminal loop, card tilt |

## 🚀 Deployment (GitHub Pages)

The site is deployed via GitHub Actions (see `.github/workflows/pages.yml`) — there's no build step, the workflow just uploads the static files. It deploys on every push to `main` and can also be triggered manually from **Actions → Deploy static site to GitHub Pages → Run workflow**.

### PR previews

Every pull request also gets a **preview**. Because GitHub Pages only permits the default branch to deploy (the `github-pages` environment protection rules) and native Pages PR previews are still an internal alpha, PRs can't deploy directly. Instead, each push to `main` rebuilds the production site plus a preview for every open PR and publishes them as a single artifact:

- Production lives at the site root.
- Each open PR's site is served at `https://<username>.github.io/<repo>/preview/pr-<number>/`, refreshed on the next `main` deployment.
- The bot posts (and updates, on new commits) a comment on the PR stating the preview URL goes live after the next deployment to `main`.
- When a PR closes, its preview disappears on the next deployment.

### One-time setup

1. Go to **Settings → Pages** in your repo.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually). The first successful run creates the Pages site at `https://<username>.github.io/<repo>/`.

> The Pages source can also be configured programmatically with the GitHub API:
>
> ```bash
> curl -X POST \
>   -H "Authorization: token $GITHUB_TOKEN" \
>   -H "Accept: application/vnd.github+json" \
>   https://api.github.com/repos/<owner>/<repo>/pages \
>   -d '{"build_type":"workflow"}'
> ```

### Notes

- The workflow uploads only the site files (`index.html`, `styles.css`, `script.js`), so `.github/` and `README.md` aren't served at the site root.
- If you'd rather serve directly from a branch instead of via the workflow, delete `.github/workflows/pages.yml` and set **Source: Deploy from a branch** → `main` / `/(root)`. GitHub Pages allows only one source, so pick either the Actions workflow *or* branch deployment — not both.

## 🧑‍💻 Local development

```bash
# Nothing to install — just serve the folder
python3 -m http.server 8000
# open http://localhost:8000
```

## 📄 License

MIT — free to use for your own projects.
