//! End-to-end installer contract for both Linux packaging layers.
//!
//! A real tarball installs into a prefix that contains spaces, the
//! installed binary runs, the bundled guide wins over the in-repo copy,
//! and the matching uninstall removes exactly what was installed.

#![cfg(unix)]

use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

fn maze_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .to_path_buf()
}

fn scratch_dir(name: &str) -> PathBuf {
    let root = std::env::temp_dir().join(format!(
        "maze-chase-tester-installer-{name}-{}",
        std::process::id()
    ));
    let _ = std::fs::remove_dir_all(&root);
    std::fs::create_dir_all(&root).expect("create scratch root");
    root
}

fn build_payload(root: &Path, layer: &str) -> PathBuf {
    let payload = root.join("payload");
    std::fs::create_dir_all(&payload).expect("create payload");
    let binary = payload.join(format!("maze-chase-{layer}"));
    std::fs::write(
        &binary,
        format!("#!/bin/sh\nprintf '%s\\n' 'maze-chase-{layer} 0.1.0'\n"),
    )
    .expect("write payload binary");
    std::fs::set_permissions(&binary, std::fs::Permissions::from_mode(0o755))
        .expect("chmod payload binary");
    std::fs::write(
        payload.join(format!("README-{layer}.md")),
        format!("tarball {layer} guide\n"),
    )
    .expect("write payload guide");
    std::fs::write(payload.join("LICENSE"), "MIT\n").expect("write payload license");
    if layer == "desktop" {
        std::fs::write(
            payload.join("maze-chase.desktop"),
            "[Desktop Entry]\nName=Maze Chase\n",
        )
        .expect("write desktop entry");
        std::fs::write(payload.join("maze-chase.xpm"), "/* XPM */\n").expect("write icon");
    }
    let tarball = root.join(format!("{layer}.tar.gz"));
    let status = Command::new("tar")
        .args([
            "-czf",
            tarball.to_str().unwrap(),
            "-C",
            payload.to_str().unwrap(),
            ".",
        ])
        .status()
        .expect("spawn tar");
    assert!(status.success(), "tar must build the {layer} fixture");
    tarball
}

fn run(script: &Path, args: &[&str]) -> std::process::Output {
    Command::new("bash")
        .arg(script)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .expect("spawn installer script")
}

#[test]
fn tarball_install_honors_spaced_prefix_and_uninstall_removes_it() {
    for layer in ["terminal", "desktop"] {
        let root = scratch_dir(layer);
        let tarball = build_payload(&root, layer);
        let prefix = root.join("prefix with spaces");
        let installer = maze_root()
            .join("packaging")
            .join(layer)
            .join("install-linux.sh");
        let uninstaller = maze_root()
            .join("packaging")
            .join(layer)
            .join("uninstall-linux.sh");
        let tarball_arg = tarball.to_str().unwrap();
        let prefix_arg = prefix.to_str().unwrap();
        let args = if layer == "desktop" {
            ["--prefix", prefix_arg, "--tarball", tarball_arg]
        } else {
            ["--tarball", tarball_arg, "--prefix", prefix_arg]
        };

        let out = run(&installer, &args);
        let stdout = String::from_utf8_lossy(&out.stdout);
        let stderr = String::from_utf8_lossy(&out.stderr);
        assert_eq!(
            out.status.code(),
            Some(0),
            "{layer} install must succeed: {stdout}\n{stderr}"
        );
        assert!(
            stdout.contains(&format!("installed maze-chase-{layer} to")),
            "{layer} installer must report the install: {stdout}"
        );

        let bin = prefix.join("bin").join(format!("maze-chase-{layer}"));
        assert!(bin.is_file(), "{layer} binary must be installed");
        let mode = std::fs::metadata(&bin)
            .expect("stat installed binary")
            .permissions()
            .mode();
        assert!(
            mode & 0o111 != 0,
            "{layer} binary must stay executable (mode {mode:o})"
        );

        let guide = prefix
            .join("share")
            .join("doc")
            .join("maze-chase")
            .join(format!("README-{layer}.md"));
        assert_eq!(
            std::fs::read_to_string(&guide).expect("read installed guide"),
            format!("tarball {layer} guide\n"),
            "{layer} installer must ship the tarball guide, not the repo fallback"
        );

        let version = Command::new(&bin)
            .arg("--version")
            .stdin(Stdio::null())
            .output()
            .expect("run installed binary");
        assert!(
            version.status.success(),
            "{layer} installed binary must run: {}",
            String::from_utf8_lossy(&version.stderr)
        );
        assert!(
            String::from_utf8_lossy(&version.stdout).contains(&format!("maze-chase-{layer}")),
            "{layer} installed binary must report its name: {}",
            String::from_utf8_lossy(&version.stdout)
        );

        if layer == "desktop" {
            for rel in [
                "share/applications/maze-chase.desktop",
                "share/icons/hicolor/11x11/apps/maze-chase.xpm",
            ] {
                assert!(prefix.join(rel).is_file(), "desktop must install {rel}");
            }
        }

        let out = run(&uninstaller, &["--prefix", prefix_arg]);
        assert_eq!(
            out.status.code(),
            Some(0),
            "{layer} uninstall must succeed: {}",
            String::from_utf8_lossy(&out.stderr)
        );
        assert!(!bin.exists(), "{layer} uninstall must remove the binary");
        assert!(!guide.exists(), "{layer} uninstall must remove the guide");
        if layer == "desktop" {
            assert!(
                !prefix
                    .join("share/applications/maze-chase.desktop")
                    .exists(),
                "desktop uninstall must remove the desktop entry"
            );
            assert!(
                !prefix
                    .join("share/icons/hicolor/11x11/apps/maze-chase.xpm")
                    .exists(),
                "desktop uninstall must remove the icon"
            );
        }
        let _ = std::fs::remove_dir_all(&root);
    }
}
