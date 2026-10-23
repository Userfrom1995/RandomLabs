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

#![cfg(unix)]

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
        body.contains("--exit-code --tags")
            && body.contains("exists but its commit cannot be resolved"),
        "a tag without a release must be validated or fail closed"
    );
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
