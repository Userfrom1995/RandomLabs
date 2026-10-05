"""Tester regression for Phase 6 Kitty animation byte budget (issue #532, PR #541).

Builder-authored hermetic gate TestKittyAnimationBytes
(internal/engine/media_test.go:96) fails deterministically: ten synthetic
64x48 frames with distinct content each cost a full transmit (~12370 bytes
of raw RGB24 base64) because Kitty.Paint keys transmit-once reuse by exact
content hash (internal/gfx/kitty.go:36-54), so no distinct frame can ever
be a sub-1KiB place-only repeat. The test demands every repeat under
1 KiB and ten frames far below ten transmits, which is unsatisfiable for
genuinely new pixel content: every new frame must transmit its bytes at
least once under the Kitty protocol.

Hermetic, no Chrome needed: runs the Go test and asserts it passes.
Currently FAILS; kept red so the Fixer has a reproducible case (either
correct the byte-budget contract in the test for distinct frames, or
implement true animation-frame support in the painter). Test files only;
production code is never touched.
"""
import os
import subprocess
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=300,
                           cwd=ROOT, **kw)


class Phase6KittyAnimationBytes(unittest.TestCase):
    def test_kitty_animation_bytes(self):
        p = run(["go", "test", "-count=1", "./internal/engine/",
                 "-run", "TestKittyAnimationBytes"])
        self.assertEqual(p.returncode, 0,
                         f"TestKittyAnimationBytes must pass: "
                         f"{p.stdout[-2000:]} {p.stderr[-2000:]}")


if __name__ == "__main__":
    unittest.main()
