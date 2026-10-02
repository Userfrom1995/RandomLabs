"""Linux Tester per-OS regression: service switch must not clobber identity.

Refs #504. On Linux (and every OS), `python -m pet service switch
<unknown-id>` rewrote the persisted shared-save character to the Pip
fallback, while the sibling `python -m pet characters switch
<unknown-id>` correctly preserves the active character. A background
service command must never silently change who the pet is on a typo.

Covers: preset Kiki, invalid service switch keeps Kiki in pet.json and
says so honestly (no garbled "using Pip switched" concatenation).

Run: python3 -m unittest pet.tests.test_peros_linux_service_switch -v
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))))


def run_pet(*argv, data_dir=None):
    env = dict(os.environ)
    if data_dir is not None:
        env["DESKTOP_PET_DATA_DIR"] = data_dir
    return subprocess.run(
        [sys.executable, "-m", "pet"] + list(argv),
        cwd=ROOT, capture_output=True, text=True, env=env, timeout=120,
    )


def saved_character_id(data_dir):
    with open(os.path.join(data_dir, "pet.json"),
              encoding="utf-8") as handle:
        return json.load(handle)["character_id"]


class TestLinuxServiceSwitchPreservesIdentity(unittest.TestCase):
    def test_service_switch_unknown_keeps_active_character(self):
        with tempfile.TemporaryDirectory() as data:
            proc = run_pet("characters", "switch", "kiki", data_dir=data)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertEqual(saved_character_id(data), "kiki")
            bad = run_pet("service", "switch", "nope-not-real",
                          data_dir=data)
            combined = (bad.stdout + bad.stderr).lower()
            self.assertIn("unknown character", combined)
            self.assertEqual(saved_character_id(data), "kiki",
                             "service switch with an unknown id clobbered "
                             "the saved character: %r" % bad.stdout)
            self.assertIn("kiki", combined)

    def test_service_switch_unknown_message_is_readable(self):
        with tempfile.TemporaryDirectory() as data:
            run_pet("characters", "switch", "kiki", data_dir=data)
            bad = run_pet("service", "switch", "nope-not-real",
                          data_dir=data)
            self.assertNotIn("using pip switched", bad.stdout.lower())


if __name__ == "__main__":
    unittest.main()
