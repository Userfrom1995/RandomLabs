"""Tester regression for Phase 6 build break (issue #532, PR #541).

The Phase 6 branch does not compile: `go build ./...` fails at
internal/engine/media.go:136 with
`assignment mismatch: 2 variables but image.Decode returns 3 values`
(image.Decode returns image, format string, error). Until the Fixer
corrects that line, every hermetic and live gate that needs a binary
(go vet, go test, all tb-agent/tb-mcp CLI flows, repro.sh) fails with
it, so this file pins the defect with a minimal hermetic reproducer.

Hermetic contracts (no Chrome needed):
1. `go build ./...` exits 0 (currently fails at media.go:136).
2. `go vet ./internal/engine/` exits 0 (same root cause).
3. `go test ./internal/engine/ -run TestPNGToImageRoundTrip` passes,
   proving the PNG decode path (the broken line) round-trips.

Test files only; production code is never touched.
"""
import os
import subprocess
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=300,
                          cwd=ROOT, **kw)


class Phase6MediaBuild(unittest.TestCase):
    def test_module_builds(self):
        p = run(["go", "build", "./..."])
        self.assertEqual(p.returncode, 0,
                         f"go build ./... must succeed (media.go:136): {p.stderr[-2000:]}")

    def test_engine_vet_clean(self):
        p = run(["go", "vet", "./internal/engine/"])
        self.assertEqual(p.returncode, 0,
                         f"go vet engine must be clean: {p.stderr[-2000:]}")

    def test_png_roundtrip(self):
        p = run(["go", "test", "-count=1", "./internal/engine/",
                 "-run", "TestPNGToImageRoundTrip"])
        self.assertEqual(p.returncode, 0,
                         f"PNG round-trip must pass: {p.stdout[-2000:]} {p.stderr[-2000:]}")


if __name__ == "__main__":
    unittest.main()
