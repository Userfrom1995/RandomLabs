"""Static gate for the terminal browser: required files, module build,
no facade markers, unified docs, and a resolving Pages hub."""
import os
import re
import subprocess
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

REQUIRED = [
    "go.mod",
    "README.md",
    "index.html",
    "docs/index.md",
    "docs/architecture.md",
    "cmd/tb/main.go",
    "cmd/tb-agent/main.go",
    "internal/term/probe.go",
    "internal/term/frame.go",
    "internal/term/input.go",
    "internal/gfx/gfx.go",
    "internal/gfx/kitty.go",
    "internal/gfx/sixel.go",
    "internal/gfx/iterm2.go",
    "internal/gfx/block.go",
    "internal/tui/shell.go",
    "internal/demo/fixture.go",
]

FACADE = re.compile(
    r"coming soon|not implemented|todo.{0,12}stub|faux|placeholder|"
    r"lorem ipsum|hard-?coded page",
    re.IGNORECASE,
)

MILESTONE = re.compile(
    r"\bM[1-9]\b|milestone\s+\d|this milestone|sprint\s+\d|changelog",
    re.IGNORECASE,
)


def go(*args):
    return subprocess.run(
        ["go"] + list(args),
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=300,
    )


class StaticGate(unittest.TestCase):
    def test_required_files(self):
        missing = [f for f in REQUIRED if not os.path.isfile(os.path.join(ROOT, f))]
        self.assertEqual(missing, [], f"missing files: {missing}")

    def test_module_builds(self):
        p = go("build", "./...")
        self.assertEqual(p.returncode, 0, p.stderr[-2000:])

    def test_vet_clean(self):
        p = go("vet", "./...")
        self.assertEqual(p.returncode, 0, p.stderr[-2000:])

    def test_go_tests(self):
        p = go("test", "./...")
        self.assertEqual(p.returncode, 0, p.stdout[-2000:] + p.stderr[-2000:])

    def test_no_facade_markers(self):
        hits = []
        for dirpath, _, files in os.walk(ROOT):
            if "tests" in dirpath:
                continue
            for name in files:
                if not name.endswith((".go", ".md", ".html")):
                    continue
                path = os.path.join(dirpath, name)
                with open(path, encoding="utf-8", errors="replace") as fh:
                    for i, line in enumerate(fh, 1):
                        if FACADE.search(line):
                            hits.append(f"{os.path.relpath(path, ROOT)}:{i}: {line.strip()}")
        self.assertEqual(hits, [], "\n".join(hits))

    def test_docs_unified(self):
        hits = []
        for name in ("README.md", "docs/index.md", "docs/architecture.md", "index.html"):
            path = os.path.join(ROOT, name)
            with open(path, encoding="utf-8") as fh:
                for i, line in enumerate(fh, 1):
                    if MILESTONE.search(line):
                        hits.append(f"{name}:{i}: {line.strip()}")
        self.assertEqual(hits, [], "\n".join(hits))

    def test_hub_links_resolve(self):
        hub = os.path.join(ROOT, "index.html")
        with open(hub, encoding="utf-8") as fh:
            body = fh.read()
        for href in re.findall(r'href="([^":]+?)"', body):
            if href.startswith(("http", "#")):
                continue
            target = os.path.normpath(os.path.join(ROOT, href))
            self.assertTrue(os.path.isfile(target), f"dead hub link: {href}")


if __name__ == "__main__":
    sys.exit(0 if unittest.TextTestRunner(verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromName("__main__")).wasSuccessful() else 1)
