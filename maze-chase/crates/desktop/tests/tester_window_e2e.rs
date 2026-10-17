//! Tester end-to-end suite for the desktop window-bootstrap and
//! fullscreen-probe fixes (issue #605).
//!
//! Drives the real `maze-chase-desktop` binary against live X servers:
//! windowed probes must stay byte-identical to the committed capture,
//! fullscreen probes must wait for the window-manager resize and write
//! the display size, a session without a display must fail loudly with a
//! non-zero exit (never the old silent success), and a window resized
//! mid-probe must be captured at the size it actually has. Every run is
//! wall-clock bounded: a hang fails the test instead of freezing the
//! suite. Tests that need Xvfb (optionally openbox/xdotool) skip cleanly
//! when the tooling is not installed. The absent-display arm is X11
//! specific (winit's Windows and macOS backends ignore `DISPLAY`), so it
//! runs on Linux only.

use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU32, Ordering};
use std::time::{Duration, Instant};

const BIN: &str = env!("CARGO_BIN_EXE_maze-chase-desktop");
const SCREEN_W: u32 = 1280;
const SCREEN_H: u32 = 1024;

/// The committed windowed capture the fix must keep byte-stable.
fn committed_capture() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../docs/desktop-probe.ppm")
}

fn have_tool(name: &str) -> bool {
    std::env::var_os("PATH")
        .map(|path| std::env::split_paths(&path).any(|dir| dir.join(name).is_file()))
        .unwrap_or(false)
}

fn temp_path(tag: &str) -> PathBuf {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    std::env::temp_dir().join(format!("maze-chase-tester-e2e-{tag}-{nanos}.ppm"))
}

/// Wait for a spawned child under a hard deadline; a hang is a panic,
/// not an indefinitely blocked suite. Returns (exit code, stderr).
fn wait_bounded(mut child: Child, limit: Duration, what: &str) -> (Option<i32>, String) {
    let start = Instant::now();
    let mut timed_out = false;
    loop {
        match child.try_wait().expect("poll child") {
            Some(_) => break,
            None if start.elapsed() >= limit => {
                let _ = child.kill();
                timed_out = true;
                break;
            }
            None => std::thread::sleep(Duration::from_millis(20)),
        }
    }
    let out = child.wait_with_output().expect("collect child output");
    let stderr = String::from_utf8_lossy(&out.stderr).into_owned();
    assert!(
        !timed_out,
        "{what} hung past {limit:?} (killed); stderr:\n{stderr}"
    );
    (out.status.code(), stderr)
}

fn run_bounded(cmd: &mut Command, limit: Duration) -> (Option<i32>, String) {
    let child = cmd
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .expect("spawn maze-chase-desktop");
    wait_bounded(child, limit, "maze-chase-desktop")
}

fn assert_ppm(path: &Path, w: u32, h: u32) -> Vec<u8> {
    let bytes = std::fs::read(path)
        .unwrap_or_else(|e| panic!("probe capture {} missing: {e}", path.display()));
    let header = format!("P6\n{w} {h}\n255\n");
    assert!(
        bytes.starts_with(header.as_bytes()),
        "PPM header must carry {w}x{h}, got {:?}",
        String::from_utf8_lossy(&bytes[..bytes.len().min(32)])
    );
    assert_eq!(
        bytes.len(),
        header.len() + (w as usize) * (h as usize) * 3,
        "PPM body must hold every pixel of a {w}x{h} frame"
    );
    bytes
}

static DISPLAY_SEQ: AtomicU32 = AtomicU32::new(0);

fn next_display() -> u32 {
    71 + (DISPLAY_SEQ.fetch_add(1, Ordering::SeqCst) % 50)
}

/// An Xvfb session (optionally with openbox) on a private display,
/// killed on drop. `None` when the tooling is unavailable, so callers
/// skip instead of failing.
struct XvfbSession {
    server: Child,
    wm: Option<Child>,
    display: u32,
}

impl XvfbSession {
    fn start(depth: u8, with_wm: bool) -> Option<Self> {
        if !have_tool("Xvfb") || (with_wm && !have_tool("openbox")) {
            return None;
        }
        for _ in 0..40 {
            let n = next_display();
            let socket = format!("/tmp/.X11-unix/X{n}");
            if Path::new(&socket).exists() {
                continue;
            }
            let mut server = match Command::new("Xvfb")
                .arg(format!(":{n}"))
                .arg("-screen")
                .arg("0")
                .arg(format!("{SCREEN_W}x{SCREEN_H}x{depth}"))
                .arg("-nolisten")
                .arg("tcp")
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
            {
                Ok(child) => child,
                Err(_) => return None,
            };
            let deadline = Instant::now() + Duration::from_secs(10);
            while !Path::new(&socket).exists() {
                if matches!(server.try_wait(), Ok(Some(_))) || Instant::now() >= deadline {
                    let _ = server.kill();
                    let _ = server.wait();
                    return None;
                }
                std::thread::sleep(Duration::from_millis(25));
            }
            std::thread::sleep(Duration::from_millis(400));
            let wm = if with_wm {
                Some(
                    match Command::new("openbox")
                        .env("DISPLAY", format!(":{n}"))
                        .stdin(Stdio::null())
                        .stdout(Stdio::null())
                        .stderr(Stdio::null())
                        .spawn()
                    {
                        Ok(child) => child,
                        Err(_) => {
                            let _ = server.kill();
                            let _ = server.wait();
                            return None;
                        }
                    },
                )
            } else {
                None
            };
            if wm.is_some() {
                // Let the WM claim the root window before the game starts.
                std::thread::sleep(Duration::from_millis(1200));
            }
            return Some(Self {
                server,
                wm,
                display: n,
            });
        }
        None
    }

    fn display(&self) -> String {
        format!(":{}", self.display)
    }

    fn game(&self) -> Command {
        let mut cmd = Command::new(BIN);
        cmd.env("DISPLAY", self.display())
            .env_remove("WAYLAND_DISPLAY");
        cmd
    }
}

impl Drop for XvfbSession {
    fn drop(&mut self) {
        if let Some(wm) = &mut self.wm {
            let _ = wm.kill();
            let _ = wm.wait();
        }
        let _ = self.server.kill();
        let _ = self.server.wait();
    }
}

/// A display number nothing is listening on right now. Only the Linux
/// arm uses `DISPLAY`, so the helper is Linux-scoped with its test.
#[cfg(target_os = "linux")]
fn absent_display() -> String {
    for _ in 0..80 {
        let n = next_display();
        if !Path::new(&format!("/tmp/.X11-unix/X{n}")).exists() {
            return format!(":{n}");
        }
    }
    ":87".to_string()
}

fn xdotool(display: &str, args: &[&str]) -> std::process::Output {
    Command::new("xdotool")
        .env("DISPLAY", display)
        .args(args)
        .output()
        .expect("run xdotool")
}

fn find_window(display: &str) -> u64 {
    let deadline = Instant::now() + Duration::from_secs(15);
    loop {
        let out = xdotool(display, &["search", "--name", "Maze Chase"]);
        if out.status.success() {
            let id = String::from_utf8_lossy(&out.stdout)
                .split_whitespace()
                .next()
                .and_then(|s| s.parse::<u64>().ok());
            if let Some(id) = id {
                return id;
            }
        }
        assert!(
            Instant::now() < deadline,
            "the Maze Chase window never appeared on {display}"
        );
        std::thread::sleep(Duration::from_millis(50));
    }
}

fn resize_window(display: &str, wid: u64, w: u32, h: u32) {
    let wid = wid.to_string();
    let (ws, hs) = (w.to_string(), h.to_string());
    let out = xdotool(display, &["windowsize", &wid, &ws, &hs]);
    assert!(out.status.success(), "xdotool windowsize must succeed");
    let deadline = Instant::now() + Duration::from_secs(10);
    loop {
        let out = xdotool(display, &["getwindowgeometry", "--shell", &wid]);
        let text = String::from_utf8_lossy(&out.stdout);
        let field = |name: &str| -> Option<u32> {
            text.lines()
                .find_map(|l| l.strip_prefix(name).and_then(|v| v.parse().ok()))
        };
        if field("WIDTH=") == Some(w) && field("HEIGHT=") == Some(h) {
            return;
        }
        assert!(
            Instant::now() < deadline,
            "the window never reached {w}x{h}; geometry:\n{text}"
        );
        std::thread::sleep(Duration::from_millis(50));
    }
}

#[test]
#[cfg(target_os = "linux")]
fn no_display_is_a_loud_nonzero_failure() {
    let path = temp_path("no-display");
    let _ = std::fs::remove_file(&path);
    let mut cmd = Command::new(BIN);
    cmd.env("DISPLAY", absent_display())
        .env_remove("WAYLAND_DISPLAY")
        .args(["--no-pad", "--probe", "1"])
        .arg(&path);
    let (code, stderr) = run_bounded(&mut cmd, Duration::from_secs(30));
    assert_eq!(
        code,
        Some(1),
        "a missing display must exit 1; stderr:\n{stderr}"
    );
    assert!(
        stderr.contains("maze-chase-desktop: cannot"),
        "the failure must be named on stderr:\n{stderr}"
    );
    let _ = std::fs::remove_file(&path);
}

#[test]
fn windowed_probe_stays_byte_identical_to_the_committed_capture() {
    let Some(x) = XvfbSession::start(24, false) else {
        eprintln!("skip: Xvfb is not installed or cannot start");
        return;
    };
    let path = temp_path("windowed");
    let _ = std::fs::remove_file(&path);
    let mut cmd = x.game();
    cmd.args(["--no-pad", "--probe", "30"]).arg(&path);
    let (code, stderr) = run_bounded(&mut cmd, Duration::from_secs(120));
    assert_eq!(
        code,
        Some(0),
        "windowed probe must exit 0; stderr:\n{stderr}"
    );
    let got = std::fs::read(&path).expect("windowed probe capture");
    let want = std::fs::read(committed_capture()).expect("committed docs/desktop-probe.ppm");
    assert_eq!(
        got, want,
        "windowed --probe 30 must stay byte-identical to docs/desktop-probe.ppm"
    );
    let _ = std::fs::remove_file(&path);
}

#[test]
fn fullscreen_probe_waits_for_the_wm_resize() {
    let Some(x) = XvfbSession::start(24, true) else {
        eprintln!("skip: Xvfb/openbox is not installed or cannot start");
        return;
    };
    // N=2 is the recorded pre-fix reproduction (it captured 1100x760).
    for n in ["1", "2"] {
        let path = temp_path("wm-fullscreen");
        let _ = std::fs::remove_file(&path);
        let mut cmd = x.game();
        cmd.args(["--no-pad", "--fullscreen", "--probe", n])
            .arg(&path);
        let (code, stderr) = run_bounded(&mut cmd, Duration::from_secs(120));
        assert_eq!(
            code,
            Some(0),
            "fullscreen --probe {n} must exit 0; stderr:\n{stderr}"
        );
        assert_ppm(&path, SCREEN_W, SCREEN_H);
        let _ = std::fs::remove_file(&path);
    }
}

#[test]
fn bare_xvfb_fullscreen_probe_settles_bounded_and_stays_honest() {
    let Some(x) = XvfbSession::start(24, false) else {
        eprintln!("skip: Xvfb is not installed or cannot start");
        return;
    };
    // A bare X server has no window manager, so borderless fullscreen
    // has no resize to wait for: the bounded settle must release the
    // probe (never hang) and the capture must carry the window's real
    // launch size.
    let path = temp_path("bare-fullscreen");
    let _ = std::fs::remove_file(&path);
    let mut cmd = x.game();
    cmd.args(["--no-pad", "--fullscreen", "--probe", "1"])
        .arg(&path);
    let start = Instant::now();
    let (code, stderr) = run_bounded(&mut cmd, Duration::from_secs(60));
    let wall = start.elapsed();
    assert_eq!(
        code,
        Some(0),
        "bare-Xvfb fullscreen probe must exit 0; stderr:\n{stderr}"
    );
    assert!(
        wall >= Duration::from_secs(1),
        "the probe must wait for the settle budget, finished in {wall:?}"
    );
    assert!(
        wall < Duration::from_secs(30),
        "the bounded settle must release fast, took {wall:?}"
    );
    assert_ppm(&path, 1100, 760);
    let _ = std::fs::remove_file(&path);
}

#[test]
fn window_resized_mid_probe_is_captured_at_its_current_size() {
    if !have_tool("xdotool") {
        eprintln!("skip: xdotool is not installed");
        return;
    }
    let Some(x) = XvfbSession::start(24, true) else {
        eprintln!("skip: Xvfb/openbox is not installed or cannot start");
        return;
    };
    let path = temp_path("resize");
    let _ = std::fs::remove_file(&path);
    let mut cmd = x.game();
    cmd.args(["--no-pad", "--probe", "1800"]).arg(&path);
    let child = cmd
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .expect("spawn maze-chase-desktop");
    let wid = find_window(&x.display());
    resize_window(&x.display(), wid, 800, 600);
    let (code, stderr) = wait_bounded(child, Duration::from_secs(300), "the resized probe");
    assert_eq!(
        code,
        Some(0),
        "resized probe must exit 0; stderr:\n{stderr}"
    );
    assert_ppm(&path, 800, 600);
    let _ = std::fs::remove_file(&path);
}

#[test]
fn induced_bootstrap_failure_is_loud_or_an_honest_success() {
    let Some(x) = XvfbSession::start(8, false) else {
        eprintln!("skip: Xvfb is not installed or cannot start");
        return;
    };
    // Depth 8 refuses softbuffer's pixel format in this environment,
    // which used to be a silent exit 0 with no window and no capture.
    // Other X servers may serve depth 8, so the pinned contract is the
    // honest one: exit 0 produces the capture it promised, and every
    // failure names itself on stderr with a non-zero exit.
    let path = temp_path("depth8");
    let _ = std::fs::remove_file(&path);
    let mut cmd = x.game();
    cmd.args(["--no-pad", "--probe", "30"]).arg(&path);
    let (code, stderr) = run_bounded(&mut cmd, Duration::from_secs(60));
    if code == Some(0) {
        assert!(
            path.exists(),
            "exit 0 must produce the probe capture; stderr:\n{stderr}"
        );
        assert_ppm(&path, 1100, 760);
    } else {
        assert!(
            stderr.contains("maze-chase-desktop: cannot"),
            "a failed boot must name the failure on stderr and exit non-zero (got {code:?}):\n{stderr}"
        );
    }
    let _ = std::fs::remove_file(&path);
}

#[test]
fn unwritable_probe_path_fails_loudly() {
    let Some(x) = XvfbSession::start(24, false) else {
        eprintln!("skip: Xvfb is not installed or cannot start");
        return;
    };
    let path = Path::new("/nonexistent-maze-chase-tester-dir/shot.ppm");
    let mut cmd = x.game();
    cmd.args(["--no-pad", "--probe", "1"]).arg(path);
    let (code, stderr) = run_bounded(&mut cmd, Duration::from_secs(60));
    assert_eq!(
        code,
        Some(1),
        "an unwritable capture path must exit 1; stderr:\n{stderr}"
    );
    assert!(
        stderr.contains("probe screenshot failed"),
        "the write failure must be named on stderr:\n{stderr}"
    );
}
