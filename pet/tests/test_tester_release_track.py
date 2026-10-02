"""Release-track gate suite for the Desktop Pet platform (issue #504).

Covers the published-artifacts increment: single-source version from
pet/__init__.py, the Linux rpm recipe, the per-OS smoke scripts, the
pet-release.yml native pipeline, and the hub Downloads section with
checksums plus honest unsigned-binary notes. Headless-safe: the live
smoke runs headless by construction against an isolated data dir
(no DESKTOP_PET_NO_DISPLAY forcing, which would flip the
tray-capable path inside selftest red), and installer tools are
probed, never assumed.
Run: python3 -m unittest discover -s pet/tests -t . (this suite is
discover-only on purpose: pet.tests.suite() feeds the bundle
selftest, and this module shells out to the smoke scripts, so
wiring it into selftest would recurse).
"""
import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PET = ROOT / "pet"
PKG = PET / "packaging"
WORKFLOWS = ROOT / ".github" / "workflows"

SEMVER = re.compile(r"^\d+\.\d+\.\d+$")


def _ps_quote(path: str) -> str:
    """Single-quote a filesystem path for PowerShell ('' escape)."""
    return "'" + path.replace("'", "''") + "'"


def _find_bash():
    """Locate a real script-capable bash, or return None.

    On Windows ``bash`` on PATH often resolves to the WSL stub at
    ``<SystemRoot>\\System32\\bash.exe`` (a WSL launcher, not a shell
    that can run ``bash script.sh``), while the real shell ships
    with Git for Windows. Prefer any non-System32 bash, then the
    well-known Git install locations; return None when only the stub
    (or nothing) exists so callers skip instead of testing the stub.
    Mirrors pet/tests/test_tester_phase5_adversarial.py.
    """
    import shutil

    probes = []
    if os.name == "nt":
        probes.extend([
            r"C:\Program Files\Git\bin\bash.exe",
            r"C:\Program Files (x86)\Git\bin\bash.exe",
        ])
    for directory in os.environ.get("PATH", "").split(os.pathsep):
        if directory:
            name = "bash.exe" if os.name == "nt" else "bash"
            probes.append(os.path.join(directory, name))
    system_root = os.path.normcase(
        os.path.abspath(os.environ.get("SystemRoot", r"C:\Windows")))
    real, fallback = [], []
    for probe in probes:
        if not os.path.isfile(probe):
            continue
        if (os.name == "nt" and os.path.normcase(
                os.path.abspath(probe)).startswith(system_root)):
            fallback.append(probe)
        else:
            real.append(probe)
    if real:
        return real[0]
    if fallback:
        return None
    found = shutil.which("bash")
    if found and os.name == "nt" and os.path.normcase(
            os.path.abspath(found)).startswith(system_root):
        return None
    return found


def _require_bash(test):
    """Return a bash path or skip the calling test when only the WSL stub exists."""
    bash = _find_bash()
    if bash is None:
        test.skipTest("no script-capable bash found "
                      "(only the Windows WSL stub or nothing on PATH)")
    return bash


def pet_version() -> str:
    from pet import __version__
    return __version__


def run_pet(*args: str, env_extra: dict | None = None) -> subprocess.CompletedProcess:
    env = dict(os.environ)
    if env_extra:
        env.update(env_extra)
    return subprocess.run(
        [sys.executable, "-m", "pet", *args],
        cwd=str(ROOT), capture_output=True, text=True, env=env,
        timeout=120)


class TestSingleSourceVersion(unittest.TestCase):
    def test_porcelain_prints_bare_semver(self):
        proc = run_pet("version", "--porcelain")
        self.assertEqual(proc.returncode, 0, proc.stderr[-1000:])
        bare = proc.stdout.strip()
        self.assertTrue(SEMVER.match(bare), "porcelain output %r" % bare)
        self.assertEqual(bare, pet_version())

    def test_human_version_still_friendly(self):
        proc = run_pet("version")
        self.assertEqual(proc.returncode, 0, proc.stderr[-1000:])
        self.assertIn(pet_version(), proc.stdout)
        self.assertIn("desktop-pet", proc.stdout)

    def test_no_version_literal_in_packaging_scripts(self):
        version = pet_version()
        scanned = ["build-linux.sh", "build-macos.sh", "build.sh",
                   "build-windows.ps1", "desktop-pet.iss",
                   "desktop-pet.rpm.spec", "build-rpm.sh",
                   "smoke-linux.sh", "smoke-macos.sh",
                   "smoke-windows.ps1"]
        for name in scanned:
            text = (PKG / name).read_text(encoding="utf-8")
            self.assertNotIn(version, text,
                             "%s carries its own %s literal" % (name, version))

    def test_scripts_derive_version_from_porcelain(self):
        for name in ("build-linux.sh", "build-macos.sh", "build-rpm.sh",
                     "smoke-linux.sh", "smoke-macos.sh"):
            text = (PKG / name).read_text(encoding="utf-8")
            self.assertIn("version --porcelain", text,
                          "%s does not derive VERSION from pet" % name)
        ps1 = (PKG / "build-windows.ps1").read_text(encoding="utf-8")
        self.assertIn("version --porcelain", ps1)
        ps1_smoke = (PKG / "smoke-windows.ps1").read_text(encoding="utf-8")
        self.assertIn("version --porcelain", ps1_smoke)

    def test_iss_takes_version_from_command_line(self):
        iss = (PKG / "desktop-pet.iss").read_text(encoding="utf-8")
        self.assertIn("#ifndef MyAppVersion", iss)
        self.assertIn("#define MyAppVersion", iss)
        ps1 = (PKG / "build-windows.ps1").read_text(encoding="utf-8")
        self.assertIn("/DMyAppVersion=", ps1)

    def test_engine_version_follows_package_version(self):
        from pet.pet_core import packs
        self.assertEqual(packs.ENGINE_VERSION, pet_version())


class TestRpmRecipe(unittest.TestCase):
    def test_rpm_files_exist_and_fail_closed(self):
        for name in ("build-rpm.sh", "desktop-pet.rpm.spec"):
            self.assertTrue((PKG / name).is_file(), "missing %s" % name)
        text = (PKG / "build-rpm.sh").read_text(encoding="utf-8")
        self.assertIn("set -euo pipefail", text)
        self.assertIn("selftest", text)
        self.assertIn("SHA256SUMS", text)

    def test_rpm_script_parses(self):
        bash = _require_bash(self)
        proc = subprocess.run([bash, "-n", str(PKG / "build-rpm.sh")],
                              capture_output=True, text=True, timeout=30)
        self.assertEqual(proc.returncode, 0, proc.stderr[-1000:])

    def test_spec_uses_placeholder_and_shares_deb_payload(self):
        spec = (PKG / "desktop-pet.rpm.spec").read_text(encoding="utf-8")
        self.assertIn("@VERSION@", spec)
        self.assertNotIn(pet_version(), spec)
        script = (PKG / "build-rpm.sh").read_text(encoding="utf-8")
        self.assertIn("s/@VERSION@/$VERSION/g", script)
        for marker in ("desktop-pet-autostart.desktop",
                       "Exec=/usr/bin/desktop-pet gui"):
            self.assertIn(marker, script)
        self.assertIn("X-GNOME-Autostart-enabled=false", script)

    def test_rpm_sources_layout_matches_spec(self):
        # Regression for pet-release run 37076887677 (issue #515):
        # the spec reads payloads as %{_sourcedir}/<name>, so the
        # script must stage them flat under SOURCES/, never under a
        # versioned SOURCES/desktop-pet-$VERSION subdirectory.
        script = (PKG / "build-rpm.sh").read_text(encoding="utf-8")
        spec = (PKG / "desktop-pet.rpm.spec").read_text(encoding="utf-8")
        for name in ("desktop-pet", "desktop-pet.desktop",
                     "desktop-pet.svg", "desktop-pet-autostart.desktop"):
            self.assertIn("%%{_sourcedir}/%s" % name, spec,
                          "spec no longer reads %r from SOURCES" % name)
        self.assertNotIn("SOURCES/desktop-pet-$VERSION", script,
                         "script stages under a versioned SOURCES subdir")
        self.assertRegex(
            script,
            r'(?m)^SRCDIR="\$STAGE/rpmbuild/SOURCES"$',
            "script must stage payloads flat under SOURCES/")


class TestSmokeScripts(unittest.TestCase):
    def test_smoke_files_exist_and_fail_closed(self):
        for name in ("smoke-linux.sh", "smoke-macos.sh"):
            text = (PKG / name).read_text(encoding="utf-8")
            self.assertIn("set -euo pipefail", text)
        ps1 = (PKG / "smoke-windows.ps1").read_text(encoding="utf-8")
        self.assertIn('$ErrorActionPreference = "Stop"', ps1)

    def test_smoke_shell_scripts_parse(self):
        bash = _require_bash(self)
        for name in ("smoke-linux.sh", "smoke-macos.sh"):
            proc = subprocess.run([bash, "-n", str(PKG / name)],
                                  capture_output=True, text=True, timeout=30)
            self.assertEqual(proc.returncode, 0,
                             "%s: %s" % (name, proc.stderr[-1000:]))

    def test_smoke_covers_full_lifecycle(self):
        for name in ("smoke-linux.sh", "smoke-macos.sh", "smoke-windows.ps1"):
            text = (PKG / name).read_text(encoding="utf-8")
            for marker in ("selftest", "characters", "service start",
                           "service stop", "uninstall-clean"):
                self.assertIn(marker, text,
                              "%s misses lifecycle step %r" % (name, marker))

    def test_windows_smoke_surfaces_installer_exit_codes(self):
        ps1 = (PKG / "smoke-windows.ps1").read_text(encoding="utf-8")
        self.assertEqual(ps1.count("Start-Process"), 2)
        self.assertEqual(ps1.count("-PassThru"), 2,
                         "every Start-Process must capture -PassThru")
        self.assertIn("ExitCode", ps1)

    def test_windows_smoke_parses_when_pwsh_present(self):
        import shutil
        pwsh = shutil.which("pwsh") or shutil.which("powershell")
        if pwsh is None:
            self.skipTest("no PowerShell on PATH to parse the ps1 scripts")
        for name in ("smoke-windows.ps1", "build-windows.ps1"):
            script = str(PKG / name)
            probe = (
                "$errors = $null; $tokens = $null; "
                "[void][System.Management.Automation.PSParser]::Tokenize("
                "(Get-Content -Raw %s), [ref]$errors); "
                "if ($errors.Count -ne 0) { $errors | ForEach-Object { "
                "Write-Output $_.Message }; exit 1 }" % _ps_quote(script))
            proc = subprocess.run(
                [pwsh, "-NoProfile", "-Command", probe],
                capture_output=True, text=True, timeout=60)
            self.assertEqual(proc.returncode, 0,
                             "%s has PowerShell syntax errors: %s"
                             % (name, proc.stdout[-1000:]))

    def test_linux_logic_smoke_passes_live(self):
        bash = _require_bash(self)
        with tempfile.TemporaryDirectory() as tmp:
            env = {"DESKTOP_PET_DATA_DIR": os.path.join(tmp, "data")}
            proc = subprocess.run(
                [bash, str(PKG / "smoke-linux.sh")],
                cwd=str(ROOT), capture_output=True, text=True, env={
                    **os.environ, **env},
                timeout=180)
        self.assertEqual(proc.returncode, 0,
                         proc.stdout[-2000:] + proc.stderr[-2000:])
        self.assertIn("smoke PASS", proc.stdout)

    def test_linux_smoke_rejects_missing_payload(self):
        bash = _require_bash(self)
        with tempfile.TemporaryDirectory() as tmp:
            proc = subprocess.run(
                [bash, str(PKG / "smoke-linux.sh"),
                 "--deb", os.path.join(tmp, "no-such.deb")],
                cwd=str(ROOT), capture_output=True, text=True, env={
                    **os.environ,
                    "DESKTOP_PET_DATA_DIR": os.path.join(tmp, "data")},
                timeout=180)
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("error", proc.stderr.lower() + proc.stdout.lower())

    def test_deb_payload_check_is_sigpipe_safe(self):
        text = (PKG / "smoke-linux.sh").read_text(encoding="utf-8")
        self.assertNotIn("tar -t | grep", text,
                         "deb payload check must not pipe a streaming tar "
                         "listing into grep -q: under pipefail grep exits on "
                         "the first match while tar still streams, tar dies "
                         "with 'stdout: write error', and the check "
                         "false-negatives on a present payload "
                         "(pet-release run 37078577617)")
        self.assertIn("DEB_LIST=", text,
                      "deb payload listing must be captured before matching")
        self.assertIn('[[ "$DEB_LIST" == *"usr/bin/desktop-pet"* ]]', text,
                      "captured deb listing must be matched with [[ ]]")

    def test_captured_listing_match_passes_live(self):
        bash = _require_bash(self)
        with tempfile.TemporaryDirectory() as tmp:
            pkg = os.path.join(tmp, "pkg")
            os.makedirs(os.path.join(pkg, "usr", "bin"))
            os.makedirs(os.path.join(pkg, "usr", "share", "doc"))
            with open(os.path.join(pkg, "usr", "bin", "desktop-pet"),
                      "w", encoding="utf-8") as fh:
                fh.write("binary")
            for i in range(3000):
                with open(os.path.join(
                        pkg, "usr", "share", "doc",
                        "file-%04d.txt" % i), "w",
                        encoding="utf-8") as fh:
                    fh.write("doc %d" % i)
            archive = os.path.join(tmp, "data.tar")
            proc = subprocess.run(
                ["tar", "-cf", archive, "-C", pkg, "usr"],
                capture_output=True, text=True, timeout=60)
            self.assertEqual(proc.returncode, 0, proc.stderr[-1000:])
            check = ('set -o pipefail; LIST="$(tar -tf %s)"; '
                     '[[ "$LIST" == *"usr/bin/desktop-pet"* ]]'
                     % archive)
            proc = subprocess.run([bash, "-c", check],
                                  capture_output=True, text=True,
                                  timeout=60)
            self.assertEqual(proc.returncode, 0,
                             "captured-listing match must pass: " +
                             proc.stderr[-1000:])
            miss = ('set -o pipefail; LIST="$(tar -tf %s)"; '
                    '[[ "$LIST" == *"usr/bin/no-such-binary"* ]]'
                    % archive)
            proc = subprocess.run([bash, "-c", miss],
                                  capture_output=True, text=True,
                                  timeout=60)
            self.assertNotEqual(proc.returncode, 0,
                               "captured-listing match must miss honestly")


class TestReleasePipeline(unittest.TestCase):
    def _workflow(self) -> str:
        path = WORKFLOWS / "pet-release.yml"
        self.assertTrue(path.is_file(), "missing pet-release.yml")
        return path.read_text(encoding="utf-8")

    def test_native_triggers_and_runners(self):
        text = self._workflow()
        self.assertIn("desktop-pet-v*", text)
        self.assertIn("workflow_dispatch", text)
        for runner in ("windows-latest", "macos-latest", "ubuntu-latest"):
            self.assertIn(runner, text)

    def test_all_artifact_kinds_built(self):
        text = self._workflow()
        for marker in ("build-windows.ps1", "Inno Setup",
                       "build-macos.sh", ".pkg", ".dmg",
                       "build-linux.sh", ".deb", "AppImage",
                       "build-rpm.sh", ".rpm"):
            self.assertIn(marker, text,
                          "workflow misses artifact marker %r" % marker)

    def test_smoke_runs_before_upload_in_every_job(self):
        text = self._workflow()
        for job in ("build-windows", "build-macos", "build-linux"):
            start = text.index(job + ":")
            nxt = text.find("\n  build-", start + 1)
            pub = text.find("\n  publish:", start + 1)
            candidates = [i for i in (nxt, pub) if i != -1]
            end = min(candidates) if candidates else len(text)
            block = text[start:end]
            self.assertIn("moke", block, "%s never smokes" % job)
            self.assertLess(block.index("moke"), block.index("upload-artifact"),
                            "%s uploads before smoking" % job)

    def test_publish_gates_on_version_parity(self):
        text = self._workflow()
        self.assertIn("version --porcelain", text)
        self.assertIn("GITHUB_REF_NAME", text)
        self.assertIn("SHA256SUMS", text)

    def test_workflow_parses_as_yaml_with_expected_jobs(self):
        path = WORKFLOWS / "pet-release.yml"
        text = path.read_text(encoding="utf-8")
        self.assertNotIn("\t", text, "workflow contains tab indentation")
        try:
            import yaml
        except ImportError:
            yaml = None
        if yaml is not None:
            doc = yaml.safe_load(text)
            self.assertIsInstance(doc, dict)
            self.assertIn("on", doc)
            self.assertIn("jobs", doc)
            triggers = doc["on"]
            self.assertIn("workflow_dispatch", triggers)
            tags = triggers.get("push", {}).get("tags", [])
            self.assertTrue(any("desktop-pet-v*" in t for t in tags),
                            "tag trigger missing: %r" % (tags,))
            jobs = doc["jobs"]
            for job in ("build-windows", "build-macos", "build-linux",
                        "publish"):
                self.assertIn(job, jobs, "job %r missing" % job)
                self.assertIn("runs-on", jobs[job],
                              "job %r has no runner" % job)
        else:
            # PyYAML is not a runtime dependency of the pet, so without
            # it this gate asserts structure: top-level `on:`/`jobs:`
            # keys plus each expected job as a two-space job header.
            for key in ("^on:", "^jobs:"):
                self.assertRegex(text, r"(?m)" + key, "missing %s" % key)
            for job in ("build-windows", "build-macos", "build-linux",
                        "publish"):
                self.assertRegex(text, r"(?m)^  %s:\s*$" % job,
                                 "job header %r missing" % job)

    def test_workflow_cannot_break_review_loop(self):
        text = self._workflow()
        for trigger in ("issue_comment", "pull_request_target"):
            self.assertNotIn(trigger, text,
                             "workflow must never trigger on %s" % trigger)
        self.assertNotIn("\n  pull_request:", text,
                         "workflow must never trigger on pull_request")


class TestHubDownloads(unittest.TestCase):
    def test_hub_points_at_releases_with_checksums(self):
        hub = (PET / "index.html").read_text(encoding="utf-8")
        self.assertIn("github.com/Userfrom1995/RandomLabs/releases", hub)
        self.assertIn("SHA256SUMS", hub)
        self.assertIn("desktop-pet-v", hub)

    def test_hub_carries_honest_unsigned_notes(self):
        hub = (PET / "index.html").read_text(encoding="utf-8")
        for marker in ("unsigned", "SmartScreen", "Gatekeeper", "chmod +x"):
            self.assertIn(marker, hub,
                          "hub misses unsigned-binary note %r" % marker)

    def test_packaging_readme_documents_release_track(self):
        readme = (PKG / "README.md").read_text(encoding="utf-8")
        for marker in ("build-rpm.sh", "smoke-linux.sh", "pet-release.yml",
                       "GitHub Releases", "unsigned"):
            self.assertIn(marker, readme,
                          "packaging README misses %r" % marker)


if __name__ == "__main__":
    unittest.main()
