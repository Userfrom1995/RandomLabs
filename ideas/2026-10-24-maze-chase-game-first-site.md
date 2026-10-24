# Maze Chase: game-first site and rendered documentation

## Problem

The project URL opened on a documentation hub. A visitor had to read release
status and cast notes before pressing Play, and the Pages deployment served
raw markdown for every guide. The game itself was one hop away, which buried
the product behind its packaging.

## Direction

1. **The game is the front door.** `maze-chase/index.html` is the complete
   playable page: board, HUD, title, help, scores, settings, pause, game over,
   keyboard, and touch. A compact Site menu in the header holds the secondary
   pages so distribution copy never competes with the board.
2. **Old links keep working.** `play.html` forwards to the game and preserves
   the query string and fragment, so shared `?seed=` links and bookmarks do not
   break.
3. **Dedicated subpages, one shell.** `install.html`, `downloads.html`,
   `compatibility.html`, and `releases.html` carry the detail that used to sit
   on the hub. `site.css` gives them one Pondwake shell. Each page states what
   is built and verified separately from what is still pending its native host.
4. **Docs are rendered, not dumped.** A dependency-free Node renderer turns
   each `docs/*.md` into a committed `docs/*.html` page with a shared sidebar,
   heading anchors, tables, code blocks, and rewritten links. A freshness
   marker binds every page to its source, and both `--check` mode and the Rust
   site suite reject stale pages or broken internal links.
5. **Test the deployed shape.** A browser harness crawls the site over HTTP
   and in chromium, checks every internal link and fragment, verifies the
   game-first boot at desktop and 390 by 844, and runs unchanged against the
   Pages preview URL.

## Acceptance

- The project URL boots the game with no layout shift into a docs page.
- Every subpage is reachable from the game and from every other subpage.
- No shipped page links raw markdown, and no internal link or fragment is
  broken.
- The game starts, pauses, and resumes at desktop and mobile widths with no
  console errors.
- Release and compatibility status stays honest: Linux packages built and
  smoke-tested, native rows clearly pending the release workflow, and the
  compatibility matrix never claims a row that did not run.
