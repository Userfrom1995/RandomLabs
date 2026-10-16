//! Tester packaging-verification regression suite (final release-audit phase).
//!
//! Pins the contracts shipped by the terminal packaging pair plus the
//! release-audit docs, at the static level so the suite stays fast and
//! hermetic (no rebuild, no network):
//! - both scripts exist, are executable, and pass `bash -n`;
//! - the tarball script keeps its contract (strict mode, versioned dist
//!   name from `Cargo.toml`, per-machine `os-arch` suffix, `--version`
//!   probe, no cross-OS relabel path);
//! - the installer refuses unknown flags (exit 2) and a missing tarball
//!   (non-zero, no silent success);
//! - the release docs cross-link only to committed files and the crate
//!   version cited in the packaging matrix matches `Cargo.toml`.

use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;
use std::process::{Command, Stdio};

fn manifest_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

/// `maze-chase/` workspace member root.
fn maze_root() -> PathBuf {
    manifest_dir()
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .to_path_buf()
}

fn packaging_script(name: &str) -> PathBuf {
    maze_root().join("packaging").join("terminal").join(name)
}

fn read_script(name: &str) -> String {
    let path = packaging_script(name);
    std::fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("packaging script {name} must be readable: {e}"))
}

fn crate_version() -> String {
    let text = std::fs::read_to_string(manifest_dir().join("Cargo.toml"))
        .expect("terminal Cargo.toml must be readable");
    for line in text.lines() {
        let line = line.trim();
        if let Some(rest) = line.strip_prefix("version") {
            let rest = rest.trim().trim_start_matches('=').trim();
            let v = rest.trim_matches('"');
            if !v.is_empty() {
                return v.to_string();
            }
        }
    }
    panic!("version not found in terminal Cargo.toml");
}

#[test]
fn packaging_scripts_exist_and_are_executable() {
    for name in ["linux-tarball.sh", "install-linux.sh"] {
        let path = packaging_script(name);
        assert!(path.is_file(), "{name} must exist at {}", path.display());
        let mode = std::fs::metadata(&path)
            .expect("stat script")
            .permissions()
            .mode();
        assert!(
            mode & 0o111 != 0,
            "{name} must be executable (mode {mode:o})"
        );
    }
}

#[test]
fn packaging_scripts_pass_bash_syntax_check() {
    for name in ["linux-tarball.sh", "install-linux.sh"] {
        let out = Command::new("bash")
            .args(["-n", &packaging_script(name).to_string_lossy()])
            .stdin(Stdio::null())
            .output()
            .expect("spawn bash -n");
        assert!(
            out.status.success(),
            "{name} must pass `bash -n`: {}",
            String::from_utf8_lossy(&out.stderr)
        );
    }
}

#[test]
fn tarball_script_keeps_staging_contract() {
    let body = read_script("linux-tarball.sh");
    assert!(
        body.contains("set -euo pipefail"),
        "tarball script must run in strict mode"
    );
    assert!(
        body.contains("crates/terminal/Cargo.toml"),
        "tarball name must derive the version from Cargo.toml"
    );
    assert!(
        body.contains("uname -s") && body.contains("uname -m"),
        "tarball name must record the build machine os-arch"
    );
    assert!(
        body.contains("tar -czf"),
        "tarball script must stage a compressed artifact"
    );
    assert!(
        body.contains("--version"),
        "tarball script must end with a --version probe"
    );
    // No cross-OS relabel path: the name records the builder, never a
    // caller-supplied OS label.
    assert!(
        !body.contains("--os "),
        "tarball script must not accept an OS relabel flag"
    );
}

#[test]
fn installer_script_keeps_safety_contract() {
    let body = read_script("install-linux.sh");
    assert!(
        body.contains("set -euo pipefail"),
        "installer must run in strict mode"
    );
    assert!(
        body.contains("--prefix") && body.contains("--tarball"),
        "installer must support --prefix/--tarball flags"
    );
    assert!(
        body.contains("unknown argument"),
        "installer must refuse unknown flags loudly"
    );
    // The EXIT-trap cleanup must be scoped to the temp dir created for
    // --tarball mode, so a local-mode install can never rm the source dir.
    let trap_line = body
        .lines()
        .find(|l| l.contains("trap"))
        .expect("installer must trap temp-dir cleanup");
    assert!(
        trap_line.contains("$WORK"),
        "trap must clean the temp work dir only, got: {trap_line}"
    );
    assert!(
        body.contains("--version"),
        "installer must re-probe the installed binary"
    );
}

#[test]
fn installer_refuses_unknown_flag_with_exit_two() {
    let out = Command::new("bash")
        .args([
            &packaging_script("install-linux.sh").to_string_lossy(),
            "--bogus-flag-xyz",
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .expect("spawn installer");
    assert_eq!(
        out.status.code(),
        Some(2),
        "unknown flag must exit 2, stderr: {}",
        String::from_utf8_lossy(&out.stderr)
    );
}

#[test]
fn installer_refuses_missing_tarball_without_silent_success() {
    let out = Command::new("bash")
        .args([
            &packaging_script("install-linux.sh").to_string_lossy(),
            "--tarball",
            "/nonexistent-maze-chase-tester-probe.tar.gz",
            "--prefix",
            "/tmp/mc-tester-missing-tarball-prefix",
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .expect("spawn installer");
    assert!(
        !out.status.success(),
        "missing tarball must fail, not silently succeed"
    );
}

#[test]
fn release_docs_crosslink_only_committed_files() {
    let docs = maze_root().join("docs");
    for name in ["release.md", "parity.md", "scoreboard.md"] {
        assert!(
            docs.join(name).is_file(),
            "release-audit doc {name} must be committed"
        );
    }
    let release = std::fs::read_to_string(docs.join("release.md")).unwrap();
    for anchor in ["feature-matrix.md", "scoreboard.md", "parity.md"] {
        assert!(release.contains(anchor), "release.md must link {anchor}");
        assert!(
            docs.join(anchor).is_file(),
            "release.md link target {anchor} must exist"
        );
    }
    let hub = std::fs::read_to_string(maze_root().join("index.html")).unwrap();
    for anchor in ["docs/release.md", "docs/scoreboard.md", "docs/parity.md"] {
        assert!(hub.contains(anchor), "hub must link {anchor}");
    }
    // Every relative docs link in the hub must resolve to a committed file.
    for token in hub.split('"') {
        let Some(rel) = token.strip_prefix("docs/") else {
            continue;
        };
        if rel.contains(':') || rel.is_empty() {
            continue;
        }
        assert!(
            maze_root().join(token).is_file(),
            "hub link {token} must resolve to a committed file"
        );
    }
}

#[test]
fn packaging_matrix_version_matches_crate() {
    let version = crate_version();
    let release = std::fs::read_to_string(maze_root().join("docs").join("release.md")).unwrap();
    assert!(
        release.contains(&version),
        "release.md matrix must cite the terminal crate version {version}"
    );
    assert!(
        release.contains("libudev-dev"),
        "release.md must document the udev prerequisite (ALSA/udev link gate)"
    );
}
