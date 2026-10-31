//! Tester packaging-verification regression suite (final release-audit phase).
//!
//! Pins the contracts shipped by the terminal packaging pair plus the
//! release-audit docs. Most checks are static so the suite stays fast and
//! hermetic (no rebuild, no network); the release-pipeline tests execute
//! the extracted workflow steps against hermetic mock binaries:
//! - both scripts exist, are executable, and pass `bash -n`;
//! - the tarball script keeps its contract (strict mode, versioned dist
//!   name from `Cargo.toml`, per-machine `os-arch` suffix, `--version`
//!   probe, no cross-OS relabel path);
//! - the installer refuses unknown flags (exit 2) and a missing tarball
//!   (non-zero, no silent success), and a missing `--prefix` or `--tarball`
//!   value prints the usage line and exits 2 instead of tripping `set -u`;
//! - the release docs cross-link only to committed files and the crate
//!   version cited in the packaging matrix matches `Cargo.toml`.

#![cfg(unix)]

mod common;

use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
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

fn layer_packaging_script(layer: &str, name: &str) -> PathBuf {
    maze_root().join("packaging").join(layer).join(name)
}

fn read_script(name: &str) -> String {
    let path = packaging_script(name);
    std::fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("packaging script {name} must be readable: {e}"))
}

fn crate_version() -> String {
    // The crate inherits [workspace.package] in maze-chase/Cargo.toml, so
    // the compiled package version is the single-source value a release
    // tag must match.
    env!("CARGO_PKG_VERSION").to_string()
}

#[test]
fn packaging_scripts_exist_and_are_executable() {
    for name in [
        "linux-tarball.sh",
        "macos-tarball.sh",
        "install-linux.sh",
        "uninstall-linux.sh",
        "build-deb.sh",
        "build-rpm.sh",
    ] {
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
    for name in [
        "linux-tarball.sh",
        "macos-tarball.sh",
        "install-linux.sh",
        "uninstall-linux.sh",
        "build-deb.sh",
        "build-rpm.sh",
    ] {
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
    let common = std::fs::read_to_string(maze_root().join("packaging").join("common.sh"))
        .expect("the shared packaging contract must be readable");
    assert!(
        body.contains("common.sh"),
        "the tarball script must source the shared packaging contract"
    );
    assert!(
        common.contains("workspace_version") && common.contains("workspace\\.package"),
        "the version must come from the workspace [workspace.package] table"
    );
    assert!(
        body.contains("maze-chase-terminal-$VERSION-$HOST_OS-$HOST_ARCH.tar.gz"),
        "tarball name must carry version plus host os-arch"
    );
    assert!(
        common.contains("uname -s") && common.contains("uname -m"),
        "the host os-arch must come from the build machine"
    );
    assert!(
        body.contains("reproducible_targz") && common.contains("tar --sort=name"),
        "tarball script must stage a reproducible compressed artifact"
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
    assert!(
        body.contains("usage: install-linux.sh [--prefix DIR] [--tarball FILE]"),
        "installer must print its usage line for bad or incomplete options"
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
fn installer_refuses_missing_option_value_with_exit_two() {
    // A bare option must reach the usage contract, never `set -u`'s
    // `$2: unbound variable` exit 1. Both layers ship the same parser.
    for layer in ["terminal", "desktop"] {
        for flag in ["--prefix", "--tarball"] {
            for args in [vec![flag], vec![flag, ""]] {
                let out = Command::new("bash")
                    .arg(&layer_packaging_script(layer, "install-linux.sh"))
                    .args(&args)
                    .stdin(Stdio::null())
                    .stdout(Stdio::piped())
                    .stderr(Stdio::piped())
                    .output()
                    .expect("spawn installer");
                let stderr = String::from_utf8_lossy(&out.stderr);
                assert_eq!(
                    out.status.code(),
                    Some(2),
                    "{layer} {flag} {args:?} must exit 2, stderr: {stderr}"
                );
                assert!(
                    stderr.contains("usage: install-linux.sh [--prefix DIR] [--tarball FILE]"),
                    "{layer} {flag} {args:?} must print the usage line, stderr: {stderr}"
                );
                assert!(
                    !stderr.contains("unbound variable"),
                    "{layer} {flag} {args:?} must be guarded before `set -u` expands $2, stderr: {stderr}"
                );
                assert!(
                    !stderr.contains(&format!("unknown argument: {flag}")),
                    "{layer} {flag} {args:?} must be rejected as a missing value, not as an unknown argument: {stderr}"
                );
            }
        }
    }
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
fn installer_refuses_a_tarball_without_the_layer_binary() {
    // The tarball path must never fall back to target/release: a
    // malformed archive (here, one with a README and no game binary)
    // must fail even when a developer build exists in the workspace.
    for layer in ["terminal", "desktop"] {
        let root = scratch_dir(&format!("missing-binary-{layer}"));
        let payload = root.join("payload");
        std::fs::create_dir_all(&payload).unwrap();
        std::fs::write(payload.join("README.md"), "not a game\n").unwrap();
        let tarball = root.join("broken.tar.gz");
        let status = Command::new("tar")
            .args([
                "-czf",
                tarball.to_str().unwrap(),
                "-C",
                payload.to_str().unwrap(),
                ".",
            ])
            .status()
            .expect("create malformed tarball");
        assert!(status.success(), "tar failed to create the fixture");
        let installer = maze_root()
            .join("packaging")
            .join(layer)
            .join("install-linux.sh");
        let prefix = root.join("prefix");
        let out = Command::new("bash")
            .arg(&installer)
            .args([
                "--tarball",
                tarball.to_str().unwrap(),
                "--prefix",
                prefix.to_str().unwrap(),
            ])
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .expect("spawn installer");
        assert!(
            !out.status.success(),
            "{layer} installer accepted a tarball without maze-chase-{layer}: {}",
            String::from_utf8_lossy(&out.stdout)
        );
        let stderr = String::from_utf8_lossy(&out.stderr);
        assert!(
            stderr.contains("tarball") && stderr.contains("no maze-chase-"),
            "{layer} installer must name the tarball in its missing-binary error, got: {stderr}"
        );
        assert!(
            !prefix.exists(),
            "{layer} installer must validate the payload before creating prefix directories"
        );
        assert!(
            !prefix
                .join("bin")
                .join(format!("maze-chase-{layer}"))
                .exists(),
            "{layer} installer must not install a fallback developer binary"
        );
        let _ = std::fs::remove_dir_all(&root);
    }
}

#[test]
fn release_matrix_commands_resolve_from_the_documented_directory() {
    // The matrix preamble names the working directory; every command in
    // the table must exist when run from there (the earlier guide ran
    // from the repo root and did not).
    let release = std::fs::read_to_string(maze_root().join("docs").join("release.md")).unwrap();
    let matrix = release
        .split_once("## Artifact matrix")
        .expect("release.md must carry the artifact matrix")
        .1
        .split_once("\n## ")
        .expect("the matrix section must end")
        .0;
    assert!(
        matrix.contains("Every script runs from `maze-chase/`"),
        "the matrix preamble must name its working directory"
    );
    let mut checked = 0;
    for row in matrix.lines().filter(|line| line.starts_with('|')) {
        let cells: Vec<&str> = row.split('|').collect();
        if cells.len() < 5 {
            continue;
        }
        let mut last_dir = String::new();
        for token in cells[3].split('`') {
            if !(token.ends_with(".sh") || token.ends_with(".ps1")) {
                continue;
            }
            let path = if token.contains('/') {
                last_dir = token
                    .rsplit_once('/')
                    .map(|(dir, _)| dir.to_string())
                    .unwrap_or_default();
                maze_root().join(token)
            } else {
                maze_root().join(&last_dir).join(token)
            };
            assert!(
                path.is_file(),
                "matrix command {token} must resolve at {}",
                path.display()
            );
            checked += 1;
        }
    }
    assert!(
        checked >= 12,
        "expected the full native artifact matrix, checked {checked} commands"
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
    // The rendered docs hub and the releases/downloads pages are the
    // user-facing paths into the release audit docs after the game-first
    // split. They link the rendered .html pages, never raw markdown.
    let docs_hub = std::fs::read_to_string(maze_root().join("docs/index.html"))
        .expect("the rendered docs hub must be committed");
    for anchor in ["release.html", "scoreboard.html", "parity.html"] {
        assert!(
            docs_hub.contains(anchor),
            "rendered docs hub must link {anchor}"
        );
        assert!(
            maze_root().join("docs").join(anchor).is_file(),
            "rendered docs hub link target {anchor} must exist"
        );
    }
    for page in ["downloads.html", "releases.html"] {
        let html = std::fs::read_to_string(maze_root().join(page)).unwrap();
        for anchor in [
            "docs/release.html",
            "docs/scoreboard.html",
            "docs/parity.html",
        ] {
            assert!(html.contains(anchor), "{page} must link {anchor}");
            assert!(
                maze_root().join(anchor).is_file(),
                "{page} link target {anchor} must exist"
            );
        }
    }
    // The game-first page never carries distribution copy.
    let hub = std::fs::read_to_string(maze_root().join("index.html")).unwrap();
    for clutter in ["release-status", "Linux packages", "SHA256SUMS"] {
        assert!(
            !hub.contains(clutter),
            "the game-first index.html must not carry distribution clutter ({clutter})"
        );
    }
    // When this suite runs alone it still walks every rendered docs page, so
    // the fixed anchors above cannot hide a broken link elsewhere.
    let (checked, fragments, problems) = common::check_internal_links(&common::site_pages());
    assert!(
        problems.is_empty(),
        "internal site links are broken:\n{}",
        problems.join("\n")
    );
    assert!(
        checked > 200 && fragments > 0,
        "the generic crawl must cover the site (checked {checked}, fragments {fragments})"
    );
}

#[test]
fn downloads_and_readme_claim_only_the_published_prerelease() {
    // The downloads page is the distribution surface. Its status block
    // must stay short and user-facing: it reports the published rc.2
    // candidate, including the native macOS/Windows rows and the
    // ad-hoc-signed macOS app, and never claims notarization or a stable
    // release. The game-first page carries no status block at all, so the
    // hunt is the first thing a visitor sees.
    let hub = std::fs::read_to_string(maze_root().join("index.html")).unwrap();
    assert!(
        !hub.contains("release-status"),
        "the game-first page must not bury the game under a release status block"
    );
    let downloads = std::fs::read_to_string(maze_root().join("downloads.html")).unwrap();
    let status_open = downloads
        .find("<div class=\"callout\" id=\"release-status\">")
        .expect("downloads must carry a release status block");
    let play = downloads
        .find("id=\"artifacts\"")
        .expect("downloads must carry the artifact matrix");
    assert!(
        status_open < play,
        "the release status must precede the artifact matrix"
    );
    let status_html = downloads[status_open..]
        .split_once("</div>")
        .expect("the status block must close")
        .0;
    let status = status_html
        .split('<')
        .map(|piece| piece.split_once('>').map(|(_, text)| text).unwrap_or(piece))
        .collect::<Vec<_>>()
        .join(" ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    assert!(
        status.contains("Linux packages") && status.contains("built and smoke-tested"),
        "the status must report the Linux packages as built and smoke-tested: {status}"
    );
    for published in [
        "maze-chase-v0.1.0-rc.2",
        "41080938033",
        "prerelease",
        "unsigned",
        "ad-hoc signed",
    ] {
        assert!(
            status.contains(published),
            "the status must report the published candidate ({published}): {status}"
        );
    }
    assert_eq!(
        common::signing_or_stable_claim(&status),
        None,
        "the status must not claim signing or a stable release: {status}"
    );
    for qa_copy in [
        "passed",
        "assertions",
        "harness",
        "E2E",
        "pre-Pondwake",
        "Tester final rerun",
        "commit ",
    ] {
        assert!(
            !status.contains(qa_copy),
            "the status must stay user-facing, found {qa_copy}: {status}"
        );
    }
    let words = status.split_whitespace().count();
    assert!(
        words <= 120,
        "the status block must stay compact, found {words} words: {status}"
    );

    let readme = std::fs::read_to_string(maze_root().join("README.md"))
        .unwrap()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    assert!(
        readme.contains("Linux release packages (deb, rpm, tarballs) are built and smoke-tested"),
        "the README must report the Linux packages as built and smoke-tested"
    );
    for published in [
        "maze-chase-v0.1.0-rc.2",
        "41080938033",
        "unsigned",
        "ad-hoc signed",
        "#683",
    ] {
        assert!(
            readme.contains(published),
            "the README must report the published candidate ({published})"
        );
    }
    for (surface, text) in common::release_copy_surfaces() {
        common::assert_no_signing_or_stable_claim(&text, surface);
    }
}

#[test]
fn release_tag_gate_is_fail_closed() {
    let gate = maze_root()
        .join("packaging")
        .join("release")
        .join("check-tag.sh");
    let version = crate_version();
    let run = |args: &[&str]| {
        Command::new("bash")
            .arg(&gate)
            .args(args)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .expect("spawn check-tag.sh")
    };

    let stable = format!("maze-chase-v{version}");
    let candidate = format!("maze-chase-v{version}-rc.1");
    let bad_rc = format!("maze-chase-v{version}-rc.1junk");
    let ahead = format!("maze-chase-v{version}-next");
    assert!(run(&[&stable]).status.success(), "stable tag must pass");
    assert!(run(&[&candidate]).status.success(), "rc tag must pass");
    assert!(
        !run(&[&bad_rc]).status.success(),
        "non-numeric rc must fail"
    );
    assert!(!run(&[&ahead]).status.success(), "ahead tag must fail");
    assert!(
        !run(&["main"]).status.success(),
        "a branch needs --allow-branch"
    );
    let branch = run(&["main", "--allow-branch"]);
    assert!(branch.status.success(), "an explicit branch build may pass");
    assert!(
        String::from_utf8_lossy(&branch.stdout).contains(&version),
        "branch builds must still report the workspace version"
    );
    // A branch can be named like a tag. --allow-branch means the ref is
    // a branch, so the name shape must never turn it into a tag check.
    for tag_shaped in [&stable, &candidate, &ahead] {
        let out = run(&[tag_shaped.as_str(), "--allow-branch"]);
        assert!(
            out.status.success(),
            "branch {tag_shaped} must pass with --allow-branch, stderr: {}",
            String::from_utf8_lossy(&out.stderr)
        );
        assert!(
            String::from_utf8_lossy(&out.stdout).contains(&version),
            "branch {tag_shaped} must report the workspace version"
        );
    }
}

fn scratch_dir(name: &str) -> PathBuf {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    let dir = std::env::temp_dir().join(format!(
        "maze-chase-packaging-{}-{name}-{nanos}",
        std::process::id()
    ));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).expect("create scratch dir");
    dir
}

#[test]
fn check_tag_gate_tolerates_a_crlf_workspace_manifest() {
    // Windows checkouts with core.autocrlf=true deliver CRLF manifests;
    // the parity gate must read the version without the carriage return.
    let root = scratch_dir("crlf-tag");
    let release = root.join("packaging").join("release");
    std::fs::create_dir_all(&release).unwrap();
    std::fs::copy(
        maze_root().join("packaging").join("common.sh"),
        root.join("packaging").join("common.sh"),
    )
    .unwrap();
    std::fs::copy(
        maze_root()
            .join("packaging")
            .join("release")
            .join("check-tag.sh"),
        release.join("check-tag.sh"),
    )
    .unwrap();
    let manifest = "[workspace]\nmembers = []\n\n[workspace.package]\nversion = \"0.1.0\"\nedition = \"2021\"\nlicense = \"MIT\"\n";
    std::fs::write(
        root.join("Cargo.toml"),
        manifest.replace('\n', "\r\n").as_bytes(),
    )
    .unwrap();
    let gate = release.join("check-tag.sh");
    let run = |tag: &str| {
        Command::new("bash")
            .arg(&gate)
            .arg(tag)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .expect("spawn check-tag.sh against the CRLF manifest")
    };
    let ok = run("maze-chase-v0.1.0");
    assert!(
        ok.status.success(),
        "a CRLF manifest must still match the tag, stderr: {}",
        String::from_utf8_lossy(&ok.stderr)
    );
    assert!(
        String::from_utf8_lossy(&ok.stdout).contains("0.1.0"),
        "the reported workspace version must have no carriage return: {}",
        String::from_utf8_lossy(&ok.stdout)
    );
    assert!(
        !run("maze-chase-v0.2.0").status.success(),
        "a CRLF manifest must not defeat the mismatch gate"
    );
    let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn reproducible_tarball_digest_ignores_the_caller_umask() {
    let root = scratch_dir("umask-tar");
    let common = maze_root().join("packaging").join("common.sh");
    // The stage itself must be created under the umask under test: a
    // pre-created 0755 stage would hide a missing stage-mode pin, and
    // pre-created 0644 files would hide a missing tar --mode pin.
    let build = |mask: &str, stage: &PathBuf, out: &PathBuf, path: Option<&str>| {
        let mut cmd = Command::new("bash");
        cmd.arg("-c")
            .arg(
                "umask \"$1\"; stage=\"$3\"; rm -rf \"$stage\"; mkdir -p \"$stage/nested\"; \
                 printf 'payload\\n' > \"$stage/payload\"; chmod +x \"$stage/payload\"; \
                 printf 'docs\\n' > \"$stage/nested/doc.md\"; . \"$2\"; \
                 reproducible_targz \"$stage\" \"$4\"",
            )
            .arg("build")
            .arg(mask)
            .arg(&common)
            .arg(stage)
            .arg(out)
            .env("SOURCE_DATE_EPOCH", "1700000000")
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        if let Some(path) = path {
            cmd.env("PATH", path);
        }
        let status = cmd.output().expect("spawn reproducible_targz");
        assert!(
            status.status.success(),
            "tarball build under umask {mask} failed: {}",
            String::from_utf8_lossy(&status.stderr)
        );
        // Digest equality alone can be green on an empty or incomplete
        // archive, so prove the real tar can list and unpack the content.
        let listing = Command::new("tar")
            .args(["-tzf", out.to_str().unwrap()])
            .output()
            .expect("list staged tarball");
        assert!(
            listing.status.success(),
            "tar cannot list {out:?}: {}",
            String::from_utf8_lossy(&listing.stderr)
        );
        let listing = String::from_utf8_lossy(&listing.stdout);
        assert!(
            listing.contains("payload"),
            "top-level file missing from {out:?}:\n{listing}"
        );
        assert!(
            listing.contains("nested/doc.md"),
            "nested file missing from {out:?}:\n{listing}"
        );
        let unpack = out.with_extension("unpacked");
        let _ = std::fs::remove_dir_all(&unpack);
        std::fs::create_dir_all(&unpack).unwrap();
        let extract = Command::new("tar")
            .args([
                "-xzf",
                out.to_str().unwrap(),
                "-C",
                unpack.to_str().unwrap(),
            ])
            .output()
            .expect("extract staged tarball");
        assert!(
            extract.status.success(),
            "tar cannot extract {out:?}: {}",
            String::from_utf8_lossy(&extract.stderr)
        );
        let payload = unpack.join("payload");
        assert_eq!(
            std::fs::read_to_string(&payload).expect("read extracted payload"),
            "payload\n",
            "the extracted payload must match the stage"
        );
        let mode = std::fs::metadata(&payload)
            .expect("stat extracted payload")
            .permissions()
            .mode();
        assert!(
            mode & 0o111 != 0,
            "payload must stay executable after extraction, mode {mode:o}"
        );
        assert_eq!(
            std::fs::read_to_string(unpack.join("nested").join("doc.md")).unwrap(),
            "docs\n",
            "the extracted nested doc must match the stage"
        );
        std::fs::read(out).expect("read staged tarball")
    };
    let wide = build(
        "022",
        &root.join("stage-022"),
        &root.join("umask-022.tar.gz"),
        None,
    );
    let tight = build(
        "077",
        &root.join("stage-077"),
        &root.join("umask-077.tar.gz"),
        None,
    );
    assert_eq!(
        wide, tight,
        "the archive bytes must not depend on the caller's umask"
    );
    // macOS has bsdtar, not GNU tar: force the Python writer and prove it
    // is deterministic too, with the same umask matrix.
    let fake_bin = root.join("fakebin");
    std::fs::create_dir_all(&fake_bin).unwrap();
    let fake_tar = fake_bin.join("tar");
    std::fs::write(&fake_tar, b"#!/bin/sh\nexit 1\n").unwrap();
    std::fs::set_permissions(&fake_tar, std::fs::Permissions::from_mode(0o755)).unwrap();
    let path = format!("{}:/usr/bin:/bin", fake_bin.display());
    let py_wide = build(
        "022",
        &root.join("py-stage-022"),
        &root.join("py-umask-022.tar.gz"),
        Some(&path),
    );
    let py_tight = build(
        "077",
        &root.join("py-stage-077"),
        &root.join("py-umask-077.tar.gz"),
        Some(&path),
    );
    assert_eq!(
        py_wide, py_tight,
        "the Python fallback must not depend on the caller's umask"
    );
    let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn tarballs_ship_the_documented_installers_and_smoke_uses_them() {
    for layer in ["terminal", "desktop"] {
        let body = std::fs::read_to_string(
            maze_root()
                .join("packaging")
                .join(layer)
                .join("linux-tarball.sh"),
        )
        .unwrap();
        for script in ["install-linux.sh", "uninstall-linux.sh"] {
            assert!(
                body.contains(&format!("\"$STAGE/{script}\"")),
                "{layer} tarball must stage {script} so the launch guide works"
            );
        }
    }
    let smoke = std::fs::read_to_string(
        maze_root()
            .join("packaging")
            .join("release")
            .join("smoke-linux.sh"),
    )
    .unwrap();
    assert!(
        smoke.contains("cd \"$unpack\"") && smoke.contains("./install-linux.sh"),
        "smoke must exercise the installer extracted from the tarball"
    );
    let macos = std::fs::read_to_string(
        maze_root()
            .join("packaging")
            .join("release")
            .join("smoke-macos.sh"),
    )
    .unwrap();
    assert!(
        macos.contains("maze-chase-terminal-*") && macos.contains("maze-chase-desktop-*"),
        "macOS smoke must classify terminal and desktop tarballs separately"
    );
    assert!(
        macos.contains("codesign --verify --deep --strict"),
        "macOS smoke must verify the bundle signature Gatekeeper checks"
    );
    let app = std::fs::read_to_string(
        maze_root()
            .join("packaging")
            .join("desktop")
            .join("macos-app.sh"),
    )
    .unwrap();
    assert!(
        app.contains("codesign --force --deep --sign - \"$APP\""),
        "the macOS app bundle must be ad-hoc signed after staging"
    );
}

#[test]
fn release_workflow_binds_new_tags_to_the_built_commit() {
    let body = std::fs::read_to_string(
        maze_root()
            .join("packaging")
            .join("release")
            .join("maze-chase-release.yml"),
    )
    .unwrap();
    assert_eq!(
        body.matches("--target \"$GITHUB_SHA\"").count(),
        2,
        "both prerelease and stable create paths must target the tested commit"
    );
    assert!(
        body.contains("TAG_SHA") && body.contains("not the tested commit"),
        "an existing tag must be proven to point at the built commit before refresh"
    );
    assert!(
        body.contains("/commits/refs/tags/${TAG}")
            && !body.contains("/commits/tags/${TAG}")
            && !body.contains("/commits/${TAG}"),
        "the parity gate must resolve the refs/tags namespace explicitly so a same-named branch cannot shadow it and annotated tags still peel"
    );
    assert!(
        body.contains("--exit-code --tags")
            && body.contains("exists but its commit cannot be resolved"),
        "a tag without a release must be validated or fail closed"
    );
}

#[test]
fn release_workflow_cuts_a_fresh_candidate_and_states_the_signing_status() {
    let body = std::fs::read_to_string(
        maze_root()
            .join("packaging")
            .join("release")
            .join("maze-chase-release.yml"),
    )
    .unwrap();
    assert!(
        body.contains("maze-chase-v${VERSION}-rc.${RC}"),
        "a branch dispatch must cut a fresh candidate tag"
    );
    assert!(
        body.contains("git ls-remote --tags origin \"refs/tags/maze-chase-v${VERSION}-rc.*\"")
            && body.contains("RC=$((RC + 1))"),
        "the next candidate must be chosen from the existing rc tags"
    );
    assert!(
        body.contains("github.event.inputs.rc") && body.contains("RC_INPUT"),
        "a dispatch must accept an explicit rc number"
    );
    assert!(
        body.contains("RC_DIGITS") && body.contains("between 1 and 999"),
        "an explicit rc number must be bounded before bash arithmetic can wrap it"
    );
    assert!(
        !body.contains("TAG=\"maze-chase-v${VERSION}-rc.1\""),
        "a branch dispatch must never republish rc.1 at a new commit"
    );
    assert!(
        body.contains("The terminal and Windows binaries are unsigned. The macOS app bundle")
            && body.contains("is ad-hoc signed, not notarized")
            && body.contains("on macOS 13 and later")
            && body.contains("System Settings > Privacy & Security > Security > Open Anyway")
            && body.contains("macOS 11-12")
            && body.contains("is not a damaged-app refusal"),
        "the release notes must describe the ad-hoc-signed macOS bundle and the version-scoped approval step"
    );
    assert!(
        !body.contains("right-click Open"),
        "the release notes must not promise the retired macOS right-click workaround"
    );
    assert!(
        body.contains("\n  group: maze-chase-release\n")
            && body.contains("queue: max")
            && !body.contains("group: maze-chase-release-"),
        "release runs must serialize globally so two dispatches cannot resolve the same candidate"
    );
}

/// Extract one step's `run: |` body from the release workflow, with the
/// YAML block indentation removed, so the suite can execute the real
/// publishing logic instead of matching strings.
fn workflow_step_body(workflow: &str, name: &str) -> String {
    let marker = format!("      - name: {name}\n");
    let start = workflow
        .find(&marker)
        .unwrap_or_else(|| panic!("workflow step {name} must exist"));
    let after = &workflow[start + marker.len()..];
    let end = after.find("\n      - name:").unwrap_or(after.len());
    let step = &after[..end];
    let run_marker = "        run: |\n";
    let run_at = step
        .find(run_marker)
        .unwrap_or_else(|| panic!("workflow step {name} must carry a block run"));
    step[run_at + run_marker.len()..]
        .lines()
        .map(|line| line.strip_prefix("          ").unwrap_or(line))
        .collect::<Vec<_>>()
        .join("\n")
}

fn write_mock_executable(path: &Path, body: &str) {
    std::fs::write(path, body).unwrap();
    std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o755)).unwrap();
}

#[test]
fn release_refresh_resolves_the_tag_not_a_same_named_branch() {
    let workflow = std::fs::read_to_string(
        maze_root()
            .join("packaging")
            .join("release")
            .join("maze-chase-release.yml"),
    )
    .unwrap();
    let step = workflow_step_body(&workflow, "Create or refresh the release");
    assert!(
        step.contains("/commits/refs/tags/${TAG}"),
        "the parity gate must resolve the refs/tags namespace explicitly"
    );

    let root = scratch_dir("release-tag-shadow");
    let bin = root.join("bin");
    let runner_temp = root.join("runner-temp");
    let assets = root.join("release-assets");
    std::fs::create_dir_all(&bin).unwrap();
    std::fs::create_dir_all(&runner_temp).unwrap();
    std::fs::create_dir_all(&assets).unwrap();
    std::fs::write(
        runner_temp.join("toolchain-info.txt"),
        "rustc 1.99.0\ncargo 1.99.0\n",
    )
    .unwrap();
    std::fs::write(
        assets.join("maze-chase-desktop-0.1.0-linux-x86_64.tar.gz"),
        "payload\n",
    )
    .unwrap();
    std::fs::write(assets.join("existing.deb"), "payload\n").unwrap();

    // The mock emulates GitHub's own ref resolution: /commits/{ref}
    // returns the same-named branch first, /commits/tags/{ref} resolves
    // only lightweight tags (422 for an annotated tag), and
    // /commits/refs/tags/{ref} resolves both kinds. A regression to an
    // ambiguous or lightweight-only path fails the branch-shadow or the
    // annotated-tag scenario below.
    write_mock_executable(
        &bin.join("gh"),
        r#"#!/bin/sh
set -u
printf 'gh %s\n' "$*" >> "${MOCK_LOG:?}"
case "$1" in
  api)
    case "$2" in
      */commits/refs/tags/*)
        tag="${2##*/commits/refs/tags/}"
        [ "$tag" = "${MOCK_TAG:?}" ] || exit 1
        [ "${MOCK_TAG_EXISTS:-0}" = "1" ] || exit 1
        [ "${MOCK_TAG_API_FAILS:-0}" = "1" ] && exit 1
        printf '%s\n' "${MOCK_TAG_SHA:?}"
        exit 0
        ;;
      */commits/tags/*)
        tag="${2##*/commits/tags/}"
        [ "$tag" = "${MOCK_TAG:?}" ] || exit 1
        [ "${MOCK_TAG_EXISTS:-0}" = "1" ] || exit 1
        [ "${MOCK_ANNOTATED:-0}" = "1" ] && exit 1
        [ "${MOCK_TAG_API_FAILS:-0}" = "1" ] && exit 1
        printf '%s\n' "${MOCK_TAG_SHA:?}"
        exit 0
        ;;
      */commits/*)
        ref="${2##*/commits/}"
        if [ "$ref" = "${MOCK_TAG:?}" ]; then
          printf '%s\n' "${MOCK_BRANCH_SHA:?}"
          exit 0
        fi
        [ "${MOCK_TAG_EXISTS:-0}" = "1" ] || exit 1
        printf '%s\n' "${MOCK_TAG_SHA:?}"
        exit 0
        ;;
    esac
    exit 1
    ;;
  release)
    case "$2" in
      view)
        [ "${MOCK_RELEASE_EXISTS:-0}" = "1" ] || exit 1
        case "$*" in
          *--json*assets*) printf 'existing.deb\nstale-payload.rpm\n' ;;
        esac
        exit 0
        ;;
      upload|edit|create|delete-asset) exit 0 ;;
    esac
    exit 1
    ;;
esac
exit 1
"#,
    );
    write_mock_executable(
        &bin.join("git"),
        r#"#!/bin/sh
case "$1" in
  ls-remote)
    [ "$2" = "--exit-code" ] || exit 99
    [ "$3" = "--tags" ] || exit 99
    [ "$4" = "origin" ] || exit 99
    [ "$5" = "refs/tags/${MOCK_TAG:?}" ] || exit 99
    [ "${MOCK_TAG_EXISTS:-0}" = "1" ] && exit 0
    exit 2
    ;;
esac
exit 99
"#,
    );

    let version = crate_version();
    let tag = format!("maze-chase-v{version}-rc.1");
    let tested = "2222222222222222222222222222222222222222";
    let tag_sha = "1111111111111111111111111111111111111111";
    let run = |scenario: &str, extra: &[(&str, &str)]| {
        let log = root.join(format!("{scenario}.log"));
        let _ = std::fs::remove_file(&log);
        let mut command = Command::new("bash");
        command
            .arg("-c")
            .arg(&step)
            .current_dir(&root)
            .env_clear()
            .env("PATH", format!("{}:/usr/bin:/bin", bin.display()))
            .env("HOME", &root)
            .env("GITHUB_REF_TYPE", "branch")
            .env("GITHUB_REF_NAME", "main")
            .env("GITHUB_REPOSITORY", "Userfrom1995/RandomLabs")
            .env("GITHUB_SHA", tested)
            .env("VERSION", &version)
            .env("TAG", &tag)
            .env("RUNNER_TEMP", &runner_temp)
            .env("MOCK_LOG", &log)
            .env("MOCK_TAG", &tag)
            .env("MOCK_TAG_SHA", tag_sha)
            .env("MOCK_BRANCH_SHA", tested)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        for (key, value) in extra {
            command.env(key, value);
        }
        let output = command.output().expect("run the extracted release step");
        let log = std::fs::read_to_string(&log).unwrap_or_default();
        (
            output.status.success(),
            log,
            String::from_utf8_lossy(&output.stderr).into_owned(),
        )
    };

    let (ok, log, stderr) = run(
        "branch-shadow",
        &[("MOCK_TAG_EXISTS", "1"), ("MOCK_RELEASE_EXISTS", "1")],
    );
    assert!(
        !ok,
        "a tag shadowed by a same-named branch must fail closed"
    );
    assert!(
        stderr.contains("not the tested commit"),
        "the parity failure must name the commit mismatch: {stderr}"
    );
    assert!(
        log.contains("/commits/refs/tags/"),
        "the shadowed-tag scenario must actually exercise the tag lookup: {log}"
    );
    assert_eq!(
        log.lines()
            .filter(|line| !line.starts_with("gh api "))
            .count(),
        0,
        "a shadowed tag must never reach a release operation: {log}"
    );

    let (ok, log, stderr) = run(
        "same-commit-refresh",
        &[
            ("MOCK_TAG_EXISTS", "1"),
            ("MOCK_RELEASE_EXISTS", "1"),
            ("MOCK_TAG_SHA", tested),
        ],
    );
    assert!(ok, "a tag at the tested commit may refresh: {stderr}");
    assert!(
        log.contains("release upload") && log.contains("release edit"),
        "the same-commit refresh must upload and update the release: {log}"
    );

    let (ok, log, stderr) = run(
        "missing-tag-create",
        &[("MOCK_TAG_EXISTS", "0"), ("MOCK_RELEASE_EXISTS", "0")],
    );
    assert!(ok, "a missing tag must create the release: {stderr}");
    assert!(
        log.contains("release create") && log.contains(&format!("--target {tested}")),
        "a new tag must bind the release to the tested commit: {log}"
    );

    let (ok, _log, stderr) = run(
        "tag-unresolvable",
        &[("MOCK_TAG_EXISTS", "1"), ("MOCK_TAG_API_FAILS", "1")],
    );
    assert!(
        !ok,
        "a tag whose commit cannot be resolved must fail closed"
    );
    assert!(
        stderr.contains("exists but its commit cannot be resolved"),
        "the fail-closed path must name the unresolved tag: {stderr}"
    );

    let (ok, log, stderr) = run(
        "annotated-tag",
        &[
            ("MOCK_TAG_EXISTS", "1"),
            ("MOCK_RELEASE_EXISTS", "1"),
            ("MOCK_TAG_SHA", tested),
            ("MOCK_ANNOTATED", "1"),
        ],
    );
    assert!(
        ok,
        "an annotated tag at the tested commit must refresh through refs/tags: {stderr}"
    );
    assert!(
        log.contains("release upload") && log.contains("release edit"),
        "the annotated-tag refresh must upload and update the release: {log}"
    );

    let (ok, log, stderr) = run(
        "release-without-tag",
        &[("MOCK_TAG_EXISTS", "0"), ("MOCK_RELEASE_EXISTS", "1")],
    );
    assert!(
        !ok,
        "a release whose tag is gone must not be refreshed without a commit binding"
    );
    assert!(
        stderr.contains("refusing to refresh an unbound release"),
        "the unbound-release guard must name the reason: {stderr}"
    );
    assert!(
        !log.contains("release upload")
            && !log.contains("release edit")
            && !log.contains("release create")
            && !log.contains("release delete-asset"),
        "an unbound release must never reach a release operation: {log}"
    );

    let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn release_tag_resolution_rejects_unbounded_and_colliding_candidates() {
    let workflow = std::fs::read_to_string(
        maze_root()
            .join("packaging")
            .join("release")
            .join("maze-chase-release.yml"),
    )
    .unwrap();
    let step = workflow_step_body(&workflow, "Resolve the release tag");

    let root = scratch_dir("release-tag-resolve");
    let bin = root.join("bin");
    std::fs::create_dir_all(&bin).unwrap();
    write_mock_executable(
        &bin.join("git"),
        r#"#!/bin/sh
case "$1" in
  ls-remote)
    [ "${MOCK_LS_REMOTE_FAILS:-0}" = "1" ] && exit 1
    printf 'aaaa refs/tags/maze-chase-v%s-rc.1\n' "${VERSION:?}"
    printf 'bbbb refs/tags/maze-chase-v%s-rc.2\n' "${VERSION:?}"
    printf 'cccc refs/tags/maze-chase-v%s-rc.10\n' "${VERSION:?}"
    exit 0
    ;;
esac
exit 2
"#,
    );

    let version = crate_version();
    let run = |name: &str, ref_type: &str, ref_name: &str, rc: Option<&str>| {
        let github_env = root.join(format!("{name}.env"));
        let _ = std::fs::remove_file(&github_env);
        std::fs::write(&github_env, "").unwrap();
        let mut command = Command::new("bash");
        command
            .arg("-c")
            .arg(&step)
            .current_dir(&root)
            .env_clear()
            .env("PATH", format!("{}:/usr/bin:/bin", bin.display()))
            .env("HOME", &root)
            .env("GITHUB_REF_TYPE", ref_type)
            .env("GITHUB_REF_NAME", ref_name)
            .env("GITHUB_ENV", &github_env)
            .env("VERSION", &version)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        if let Some(rc) = rc {
            command.env("RC_INPUT", rc);
        }
        let output = command.output().expect("run the extracted tag resolver");
        let env = std::fs::read_to_string(&github_env).unwrap_or_default();
        let tag = env
            .lines()
            .find_map(|line| line.strip_prefix("TAG="))
            .map(str::to_string);
        (
            output.status.success(),
            tag,
            String::from_utf8_lossy(&output.stderr).into_owned(),
        )
    };

    let tag_ref = format!("maze-chase-v{version}-rc.5");
    let (ok, tag, stderr) = run("tag-ref", "tag", &tag_ref, None);
    assert!(ok, "a tag ref publishes that tag: {stderr}");
    assert_eq!(tag.as_deref(), Some(tag_ref.as_str()));

    let (ok, tag, stderr) = run("explicit", "branch", "main", Some("7"));
    assert!(ok, "an explicit rc must resolve: {stderr}");
    assert_eq!(
        tag,
        Some(format!("maze-chase-v{version}-rc.7")),
        "an explicit rc must name that candidate"
    );

    let (ok, tag, stderr) = run("padded", "branch", "main", Some("007"));
    assert!(ok, "leading zeros must still resolve normally: {stderr}");
    assert_eq!(
        tag,
        Some(format!("maze-chase-v{version}-rc.7")),
        "padded input must normalize to the same candidate"
    );

    for (name, value) in [
        ("zero", "0"),
        ("too-large", "1000"),
        ("wraps", "18446744073709551617"),
        ("junk", "rc.1"),
    ] {
        let (ok, _tag, stderr) = run(name, "branch", "main", Some(value));
        assert!(!ok, "rc input {value} must be rejected: {stderr}");
    }

    let (ok, tag, stderr) = run("auto-next", "branch", "main", None);
    assert!(ok, "an automatic candidate must resolve: {stderr}");
    assert_eq!(
        tag,
        Some(format!("maze-chase-v{version}-rc.11")),
        "the resolver must pick the highest existing rc plus one"
    );

    let fail = |name: &str| {
        let github_env = root.join(format!("{name}.env"));
        let _ = std::fs::remove_file(&github_env);
        std::fs::write(&github_env, "").unwrap();
        let output = Command::new("bash")
            .arg("-c")
            .arg(&step)
            .current_dir(&root)
            .env_clear()
            .env("PATH", format!("{}:/usr/bin:/bin", bin.display()))
            .env("HOME", &root)
            .env("GITHUB_REF_TYPE", "branch")
            .env("GITHUB_REF_NAME", "main")
            .env("GITHUB_ENV", &github_env)
            .env("VERSION", &version)
            .env("MOCK_LS_REMOTE_FAILS", "1")
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .expect("run the extracted tag resolver");
        (
            output.status.success(),
            String::from_utf8_lossy(&output.stderr).into_owned(),
        )
    };
    let (ok, stderr) = fail("ls-remote-fails");
    assert!(!ok, "a failed tag listing must fail closed: {stderr}");

    let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn windows_artifacts_link_the_static_crt() {
    // A clean Windows install has no VC++ redistributable, so the release
    // binaries must link the static CRT and every build path must prove
    // it with dumpbin instead of trusting the flag.
    let common = std::fs::read_to_string(maze_root().join("packaging").join("common.ps1"))
        .expect("common.ps1 must exist");
    assert!(
        common
            .contains("$env:RUSTFLAGS = (\"$env:RUSTFLAGS -C target-feature=+crt-static\").Trim()"),
        "common.ps1 must append +crt-static before every Windows build"
    );
    assert!(
        common.contains("if ($deps -match '(?m)^\\s+(VCRUNTIME|MSVCP)\\d')"),
        "common.ps1 must reject a dynamic CRT dependency on an actual dumpbin line"
    );
    for script in [
        "terminal/windows-zip.ps1",
        "desktop/windows-zip.ps1",
        "desktop/windows-installer.ps1",
    ] {
        let body = std::fs::read_to_string(maze_root().join("packaging").join(script))
            .unwrap_or_else(|e| panic!("{script} must be readable: {e}"));
        assert!(
            body.contains("Assert-StaticCrt @($exe)"),
            "{script} must verify the static CRT before packaging"
        );
    }
}

#[test]
fn windows_artifacts_ship_the_license() {
    let desktop_zip = std::fs::read_to_string(
        maze_root()
            .join("packaging")
            .join("desktop")
            .join("windows-zip.ps1"),
    )
    .unwrap();
    assert!(
        desktop_zip.contains("Join-Path $RepoRoot \"LICENSE\""),
        "the documented desktop zip must ship LICENSE like the terminal zip"
    );
    let installer = std::fs::read_to_string(
        maze_root()
            .join("packaging")
            .join("desktop")
            .join("windows-installer.iss"),
    )
    .unwrap();
    assert!(
        installer.contains("\\LICENSE\"; DestDir"),
        "the installer must keep staging LICENSE"
    );
    let smoke = std::fs::read_to_string(
        maze_root()
            .join("packaging")
            .join("release")
            .join("smoke-windows.ps1"),
    )
    .unwrap();
    assert!(
        smoke.contains("does not contain LICENSE") && smoke.contains("did not place LICENSE"),
        "the Windows smoke must prove both zips and the installed tree carry LICENSE"
    );
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

#[test]
fn linux_packages_ship_the_full_mit_license() {
    let license = std::fs::read_to_string(maze_root().parent().unwrap().join("LICENSE"))
        .expect("the repository LICENSE must be readable");
    assert!(
        license.contains("MIT License"),
        "the repository LICENSE must carry the MIT text"
    );
    for layer in ["terminal", "desktop"] {
        let deb = std::fs::read_to_string(
            maze_root()
                .join("packaging")
                .join(layer)
                .join("build-deb.sh"),
        )
        .unwrap();
        assert!(
            deb.contains("\"$REPO_ROOT/LICENSE\""),
            "{layer} deb copyright must be built from the repository LICENSE"
        );
        assert!(
            !deb.contains("RandomLabs contributors. MIT licensed."),
            "{layer} deb must not ship a hand-written license stub"
        );
        let rpm = std::fs::read_to_string(
            maze_root()
                .join("packaging")
                .join(layer)
                .join("build-rpm.sh"),
        )
        .unwrap();
        assert!(
            rpm.contains("\"$REPO_ROOT/LICENSE\""),
            "{layer} rpm payload must stage the repository LICENSE"
        );
        assert!(
            rpm.contains(&format!(
                "%license /usr/share/licenses/maze-chase-{layer}/LICENSE"
            )),
            "{layer} rpm must install the license through %license"
        );
        assert!(
            !rpm.contains("RandomLabs contributors. MIT licensed."),
            "{layer} rpm must not ship a hand-written license stub"
        );
    }
    let smoke = std::fs::read_to_string(
        maze_root()
            .join("packaging")
            .join("release")
            .join("smoke-linux.sh"),
    )
    .unwrap();
    assert!(
        smoke.contains("grep -q 'MIT License'")
            && smoke.contains("usr/share/licenses/maze-chase-$name/LICENSE"),
        "the Linux smoke must prove both package payloads carry the MIT text"
    );
}

#[test]
fn packaging_helpers_pin_a_safe_umask() {
    // dpkg-deb rejects a 0700 control directory and generated payload
    // files inherit the caller's umask, so the shared helper must reset
    // it before any build script creates a stage.
    let common = std::fs::read_to_string(maze_root().join("packaging").join("common.sh")).unwrap();
    assert!(
        common.lines().any(|line| line.trim() == "umask 022"),
        "common.sh must pin a safe umask for every packaging script"
    );
    let dir = scratch_dir("umask-helper");
    let out = Command::new("bash")
        .arg("-c")
        .arg("umask 077; . \"$1\"; mkdir -p \"$2/DEBIAN\"")
        .arg("bash")
        .arg(maze_root().join("packaging").join("common.sh"))
        .arg(&dir)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .expect("spawn the packaging helper");
    assert!(
        out.status.success(),
        "sourcing the packaging helper under umask 077 failed: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    let mode = std::fs::metadata(dir.join("DEBIAN"))
        .expect("stat the staged control directory")
        .permissions()
        .mode()
        & 0o777;
    assert_eq!(
        mode, 0o755,
        "a 077 caller umask must not leak into the control directory"
    );
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn checksum_manifest_is_sorted_independently_of_argument_order() {
    let dir = scratch_dir("checksum-sort");
    std::fs::create_dir_all(&dir).unwrap();
    for name in ["z-last.deb", "m-middle.rpm", "a-first.tar.gz"] {
        std::fs::write(dir.join(name), format!("payload {name}\n")).unwrap();
    }
    let out = Command::new("bash")
        .arg("-c")
        .arg(
            ". \"$1\"; write_checksums \"$2\" z-last.deb a-first.tar.gz m-middle.rpm; cat \"$2/SHA256SUMS.txt\"",
        )
        .arg("bash")
        .arg(maze_root().join("packaging").join("common.sh"))
        .arg(&dir)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .expect("spawn the checksum helper");
    assert!(
        out.status.success(),
        "write_checksums failed: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    let manifest = String::from_utf8_lossy(&out.stdout);
    let names: Vec<&str> = manifest
        .lines()
        .map(|line| line.split_whitespace().nth(1).unwrap_or(""))
        .collect();
    assert_eq!(
        names,
        ["a-first.tar.gz", "m-middle.rpm", "z-last.deb"],
        "the checksum manifest must be sorted by artifact name, got: {manifest}"
    );
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn linux_smoke_resolves_relative_inputs_and_leaf_names() {
    let smoke = std::fs::read_to_string(
        maze_root()
            .join("packaging")
            .join("release")
            .join("smoke-linux.sh"),
    )
    .unwrap();
    assert!(
        smoke.contains("case \"$(basename \"$1\")\" in"),
        "the Linux smoke must classify packages by leaf name, not a full path"
    );
    assert!(
        smoke.contains("rpm=\"$(cd \"$(dirname \"$rpm\")\" && pwd)/$(basename \"$rpm\")\""),
        "the Linux smoke must resolve a relative rpm before the extraction subshell"
    );
}

#[test]
fn release_hardening_contracts_are_pinned() {
    let workflow = std::fs::read_to_string(
        maze_root()
            .join("packaging")
            .join("release")
            .join("maze-chase-release.yml"),
    )
    .unwrap();
    assert!(
        workflow.contains("libxkbcommon-x11-0"),
        "the Linux release job must install the winit XKB runtime for the Xvfb-gated probe"
    );
    let installed = std::fs::read_to_string(
        maze_root()
            .parent()
            .unwrap()
            .join(".github")
            .join("workflows")
            .join("maze-chase-release.yml"),
    )
    .expect("the installed release workflow must be readable");
    assert_eq!(
        workflow, installed,
        "the installed release workflow must stay byte-identical to the packaging source"
    );
    assert!(
        workflow.contains("*-rc.*) PRERELEASE=\"true\"") && !workflow.contains("inputs.prerelease"),
        "prerelease must derive from the tag, never a manual input"
    );
    assert!(
        workflow.contains("--prerelease=false"),
        "a refresh must be able to correct the prerelease flag"
    );
    assert!(
        workflow.contains("permissions:\n  contents: read")
            && workflow.contains("permissions:\n      contents: write"),
        "only the publish job may write contents"
    );
    assert!(
        workflow.contains("gh release delete-asset"),
        "a refresh must remove assets outside the verified set"
    );
    let stage = std::fs::read_to_string(
        maze_root()
            .join("packaging")
            .join("release")
            .join("stage-linux.sh"),
    )
    .unwrap();
    assert!(
        stage.contains("maze-chase-terminal-$VERSION-1.$(rpm_arch).rpm")
            && stage.contains("maze-chase-desktop-$VERSION-1.$(rpm_arch).rpm")
            && !stage.contains("-1.*.rpm\" -type f | head"),
        "the Linux stage must select the RPM by this host's architecture"
    );
    let smoke = std::fs::read_to_string(
        maze_root()
            .join("packaging")
            .join("release")
            .join("smoke-windows.ps1"),
    )
    .unwrap();
    let smoke_compact: Vec<String> = smoke
        .to_ascii_lowercase()
        .lines()
        .map(|line| line.chars().filter(|c| !c.is_whitespace()).collect())
        .collect();
    let version_clobbered = smoke_compact.iter().any(|line| {
        line.contains("$version=")
            || line.contains("${version}=")
            || line.contains("$script:version=")
            || line.contains("$global:version=")
    });
    assert!(
        smoke.contains("$leaf = Split-Path -Leaf $zip")
            && smoke.contains("cannot identify layer from")
            && smoke.contains("$reported -ne \"maze-chase-$name $Version\"")
            && smoke.contains("$reported -ne \"maze-chase-desktop $Version\"")
            && !version_clobbered
            && smoke.contains("\"/DIR=`\"$target`\"\""),
        "the Windows smoke must classify by leaf, compare the full version without clobbering $Version, and quote /DIR"
    );
}

fn sha256_file(path: &Path) -> String {
    for (program, args) in [("sha256sum", &[][..]), ("shasum", &["-a", "256"][..])] {
        let mut command = Command::new(program);
        command.args(args).arg(path);
        if let Ok(output) = command.output() {
            if output.status.success() {
                let text = String::from_utf8_lossy(&output.stdout);
                if let Some(digest) = text.split_whitespace().next() {
                    return digest.to_string();
                }
            }
        }
    }
    panic!("need sha256sum or shasum to verify the committed wasm");
}

fn grouped_digits(value: usize) -> String {
    let digits = value.to_string();
    let head = digits.len() % 3;
    let mut grouped = String::new();
    if head > 0 {
        grouped.push_str(&digits[..head]);
    }
    for index in (head..digits.len()).step_by(3) {
        if !grouped.is_empty() {
            grouped.push(',');
        }
        grouped.push_str(&digits[index..index + 3]);
    }
    grouped
}

#[test]
fn committed_wasm_matches_every_documented_artifact_claim() {
    let wasm = maze_root().join("web").join("maze-chase.wasm");
    let bytes = std::fs::read(&wasm).expect("committed web/maze-chase.wasm must exist");
    let size = bytes.len();
    let hash = sha256_file(&wasm);
    let grouped = grouped_digits(size);

    const HISTORICAL_WASM: &str =
        "5bcceec8356d8659d53405c593df744ba3c980c8b31582358313a53f5a2f72db";
    let release = std::fs::read_to_string(maze_root().join("docs").join("release.md")).unwrap();
    for doc in ["release.md", "web.md", "scoreboard.md", "feature-matrix.md"] {
        let body = std::fs::read_to_string(maze_root().join("docs").join(doc)).unwrap();
        assert!(
            body.contains(&hash),
            "{doc} must cite the committed wasm sha256 {hash}"
        );
        assert!(
            body.contains(&grouped) || body.contains(&size.to_string()),
            "{doc} must cite the committed wasm size {grouped}"
        );
        // The superseded digest may survive only in the dated 2026-10-22
        // scoreboard section, which keeps its own measurement provenance;
        // every current-artifact claim must carry the committed bytes.
        if let Some(offset) = body.find(HISTORICAL_WASM) {
            let section_start = body[..offset].rfind("\n## ").map_or(0, |index| index + 1);
            let section = &body[section_start..];
            let header = section.lines().next().unwrap_or_default();
            assert!(
                doc == "scoreboard.md" && header.starts_with("## 2026-10-22"),
                "{doc} advertises the superseded wasm digest outside a historical section: {header}"
            );
        }
    }
    assert!(
        release.contains("1.99.0") && release.contains("check-wasm.sh"),
        "release.md must name the recorded toolchain and the wasm rebuild gate"
    );
    assert!(
        release.contains("cargo run --release --locked --bin maze-chase-verify"),
        "release.md's verifier command must use the locked dependency graph"
    );
}

#[test]
fn release_check_wasm_script_rebuilds_with_the_locked_toolchain() {
    let path = maze_root()
        .join("packaging")
        .join("release")
        .join("check-wasm.sh");
    assert!(
        path.is_file(),
        "check-wasm.sh must exist at {}",
        path.display()
    );
    let mode = std::fs::metadata(&path)
        .expect("stat check-wasm.sh")
        .permissions()
        .mode();
    assert!(
        mode & 0o111 != 0,
        "check-wasm.sh must be executable (mode {mode:o})"
    );
    let body = std::fs::read_to_string(&path).unwrap();
    for needle in [
        "RECORDED_RUST=\"1.99.0\"",
        "--locked",
        "CARGO_TARGET_DIR",
        "cmp -s",
        "sha256_file",
    ] {
        assert!(
            body.contains(needle),
            "check-wasm.sh must keep {needle} in its rebuild contract"
        );
    }
    let status = Command::new("bash")
        .arg("-n")
        .arg(&path)
        .status()
        .expect("bash -n check-wasm.sh");
    assert!(status.success(), "check-wasm.sh must pass bash -n");
}

#[test]
fn committed_wasm_rebuilds_byte_identically_on_the_recorded_toolchain() {
    let Ok(rustc) = Command::new("rustc").arg("--version").output() else {
        eprintln!("skipping wasm rebuild: rustc is unavailable");
        return;
    };
    let version = String::from_utf8_lossy(&rustc.stdout);
    if !rustc.status.success() || !version.contains("1.99.0") {
        eprintln!("skipping wasm rebuild: rustc is {version}");
        return;
    }
    let Ok(targets) = Command::new("rustup")
        .args(["target", "list", "--installed"])
        .output()
    else {
        eprintln!("skipping wasm rebuild: rustup is unavailable");
        return;
    };
    if !targets.status.success()
        || !String::from_utf8_lossy(&targets.stdout)
            .lines()
            .any(|line| line.trim() == "wasm32-unknown-unknown")
    {
        eprintln!("skipping wasm rebuild: wasm32-unknown-unknown is not installed");
        return;
    }
    let out = Command::new("bash")
        .arg(
            maze_root()
                .join("packaging")
                .join("release")
                .join("check-wasm.sh"),
        )
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .expect("spawn check-wasm.sh");
    assert!(
        out.status.success(),
        "the committed wasm must match a clean rebuild:\nstdout: {}\nstderr: {}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    );
}

#[test]
fn release_workflow_pins_the_toolchain_and_locked_dependencies() {
    let workflow = std::fs::read_to_string(
        maze_root()
            .join("packaging")
            .join("release")
            .join("maze-chase-release.yml"),
    )
    .unwrap();
    assert_eq!(
        workflow
            .matches("rustup toolchain install 1.99.0 --profile minimal --no-self-update")
            .count(),
        3,
        "every native job must pin the recorded toolchain"
    );
    assert_eq!(
        workflow
            .matches("cargo test --workspace --no-fail-fast --locked")
            .count(),
        3,
        "every native job must test the locked dependency graph"
    );
    assert_eq!(
        workflow
            .matches("cargo run --release --locked --bin maze-chase-verify")
            .count(),
        3,
        "every native job must run the verifier from the locked graph"
    );
    for token in [
        "toolchain-linux.txt",
        "toolchain-macos.txt",
        "toolchain-windows.txt",
        "missing toolchain record",
        "bash maze-chase/packaging/release/check-wasm.sh",
    ] {
        assert!(
            workflow.contains(token),
            "the release workflow must keep {token}"
        );
    }
    for script in [
        "terminal/build-deb.sh",
        "terminal/build-rpm.sh",
        "terminal/linux-tarball.sh",
        "desktop/build-deb.sh",
        "desktop/build-rpm.sh",
        "desktop/linux-tarball.sh",
        "desktop/macos-app.sh",
    ] {
        let body = std::fs::read_to_string(maze_root().join("packaging").join(script)).unwrap();
        assert!(
            body.contains("cargo build --release --locked -p"),
            "{script} must build from the locked dependency graph"
        );
        assert!(
            !body.contains("cargo build --release -p"),
            "{script} still has an unlocked cargo build"
        );
    }
}
