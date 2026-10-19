//! Tester regression suite for the Phase 3 Kitty render pipeline and the
//! Sixel handoff, pinning the review-round findings on PR #693:
//!
//! - Sprite stacking (round 1, F1): Ghostty showed a board with zero
//!   sprites because atlas placements carried no explicit `z` and the
//!   spec's equal-z tie-break sorts the atlas image below the static
//!   board. Every atlas placement must carry an explicit `z` (sunseeds
//!   1, warden bodies 3+2i, eyes 4+2i, Pip 11) and the static placement
//!   must sit at `z=0`.
//! - Exact deletes (rounds 1-2, F2/F3): the delete table reaches one
//!   placement only as `a=d,d=i,i=<atlas>,p=<id>`; the old `d=p` form
//!   deletes by cell position and was a silent no-op, leaving dead
//!   sprites composited on screen. Steady-state deletes must be exact.
//! - Live probe paths (round 2, F2): two fragmented OK replies must
//!   upgrade to placement mode; a placement rejection must keep the
//!   whole-frame transmit path; both must stay bounded and silent
//!   (`q=2`) once the probe finishes.
//! - Sixel handoff (round 2, F4): leaving the Kitty tier must release
//!   the board and atlas (delete-all plus both image frees) in the
//!   first frame that reaches the screen, before the first Sixel DCS
//!   frame paints; the old placements otherwise stay composited above
//!   the fallback.
//! - Eaten sunseed (F3 root cause): the desired-placement set must drop
//!   the entity's id, and the renderer's delete for a vanished id is
//!   the exact `d=i` form (never `d=p`).
#![cfg(unix)]

use std::collections::BTreeSet;
use std::io::{Read, Write};
use std::os::fd::{AsRawFd, FromRawFd, OwnedFd};
use std::os::unix::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

const STATIC_IMAGE_ID: &str = "1296236547";
const ATLAS_IMAGE_ID: &str = "1296236546";
const PROBE_IMAGE_ID: &str = "1296236545";

struct Pty {
    master: std::fs::File,
    slave: std::fs::File,
}

/// Serializes the MT-Unsafe `ptsname` static buffer across the parallel
/// test threads in this binary (`ptsname_r` is ENOTSUP on macOS).
static PTSNAME_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

fn open_pty(cols: u16, rows: u16) -> Pty {
    unsafe {
        let master = libc::posix_openpt(libc::O_RDWR | libc::O_NOCTTY);
        assert!(master >= 0, "posix_openpt failed");
        assert_eq!(libc::grantpt(master), 0, "grantpt failed");
        assert_eq!(libc::unlockpt(master), 0, "unlockpt failed");
        let slave = {
            let _guard = PTSNAME_LOCK.lock().unwrap();
            let name = libc::ptsname(master);
            assert!(!name.is_null(), "ptsname failed");
            libc::open(name, libc::O_RDWR | libc::O_NOCTTY)
        };
        assert!(slave >= 0, "open slave failed");
        let ws = libc::winsize {
            ws_row: rows,
            ws_col: cols,
            ws_xpixel: 0,
            ws_ypixel: 0,
        };
        assert_eq!(
            libc::ioctl(master, libc::TIOCSWINSZ as _, &ws as *const libc::winsize),
            0,
            "TIOCSWINSZ failed"
        );
        let master = std::fs::File::from(OwnedFd::from_raw_fd(master));
        let flags = libc::fcntl(master.as_raw_fd(), libc::F_GETFL);
        assert_ne!(flags, -1, "F_GETFL failed");
        assert_ne!(
            libc::fcntl(master.as_raw_fd(), libc::F_SETFL, flags | libc::O_NONBLOCK),
            -1,
            "F_SETFL failed"
        );
        Pty {
            master,
            slave: std::fs::File::from(OwnedFd::from_raw_fd(slave)),
        }
    }
}

fn session_dir(tag: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("maze-chase-{tag}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).expect("create session dir");
    dir
}

/// Make the PTY slave the child's controlling terminal so `/dev/tty`
/// (the first fd crossterm sizes against) resolves to this test's
/// terminal even when stdout is a pipe.
fn own_controlling_tty() -> impl FnMut() -> std::io::Result<()> {
    || {
        unsafe {
            libc::setsid();
            libc::ioctl(0, libc::TIOCSCTTY as _, 0);
        }
        Ok(())
    }
}

/// Spawn the shipped binary on a PTY. `tier` forces `--tier`; the trace
/// file always lands in `dir/trace.jsonl`.
fn spawn_pty(dir: &Path, tier: &str, term: &str) -> (Pty, Child) {
    let pty = open_pty(100, 40);
    let mut cmd = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"));
    cmd.arg("--dir")
        .arg(dir)
        .arg("--tier")
        .arg(tier)
        .env("TERM", term)
        .env("COLORTERM", "truecolor")
        .env("MAZE_CHASE_TRACE", dir.join("trace.jsonl"))
        .stdin(Stdio::from(pty.slave.try_clone().unwrap()))
        .stdout(Stdio::from(pty.slave.try_clone().unwrap()))
        .stderr(Stdio::from(pty.slave.try_clone().unwrap()));
    unsafe {
        cmd.pre_exec(own_controlling_tty());
    }
    let child = cmd.spawn().expect("spawn maze-chase-terminal");
    (pty, child)
}

fn spawn_pty_auto(dir: &Path, term: &str) -> (Pty, Child) {
    let pty = open_pty(100, 40);
    let mut cmd = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"));
    cmd.arg("--dir")
        .arg(dir)
        .env("TERM", term)
        .env("COLORTERM", "truecolor")
        .env_remove("MAZE_CHASE_TIER")
        .env("MAZE_CHASE_TRACE", dir.join("trace.jsonl"))
        .stdin(Stdio::from(pty.slave.try_clone().unwrap()))
        .stdout(Stdio::from(pty.slave.try_clone().unwrap()))
        .stderr(Stdio::from(pty.slave.try_clone().unwrap()));
    unsafe {
        cmd.pre_exec(own_controlling_tty());
    }
    let child = cmd.spawn().expect("spawn maze-chase-terminal");
    (pty, child)
}

fn drain(master: &mut std::fs::File, out: &mut Vec<u8>) {
    let mut buf = [0u8; 8192];
    loop {
        match master.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => out.extend_from_slice(&buf[..n]),
            Err(e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
            // WouldBlock (nothing ready) and EIO (child exited) both end
            // this drain; the caller decides whether to keep waiting.
            Err(_) => break,
        }
    }
}

fn wait_for(
    master: &mut std::fs::File,
    out: &mut Vec<u8>,
    needle: &str,
    timeout: Duration,
) -> bool {
    let deadline = Instant::now() + timeout;
    loop {
        drain(master, out);
        if String::from_utf8_lossy(out).contains(needle) {
            return true;
        }
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return false;
        }
        let mut pfd = libc::pollfd {
            fd: master.as_raw_fd(),
            events: libc::POLLIN,
            revents: 0,
        };
        let ms = remaining.as_millis().min(25) as i32;
        unsafe { libc::poll(&mut pfd, 1, ms) };
    }
}

fn collect_for(master: &mut std::fs::File, out: &mut Vec<u8>, dur: Duration) {
    let deadline = Instant::now() + dur;
    while Instant::now() < deadline {
        drain(master, out);
        std::thread::sleep(Duration::from_millis(15));
    }
}

fn stop(child: &mut Child) {
    let _ = child.kill();
    let _ = child.wait();
}

fn tail(bytes: &[u8]) -> String {
    let text: Vec<char> = String::from_utf8_lossy(bytes).chars().collect();
    let start = text.len().saturating_sub(400);
    text[start..].iter().collect()
}

fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    if needle.is_empty() || haystack.len() < needle.len() {
        return None;
    }
    haystack.windows(needle.len()).position(|w| w == needle)
}

/// Params (before the first `;`) of every `ESC_G ... ESC\` APC escape.
fn apc_params(stream: &[u8]) -> Vec<String> {
    let mut out = Vec::new();
    let mut i = 0;
    while let Some(pos) = find(&stream[i..], b"\x1b_G") {
        let start = i + pos + 3;
        let Some(end) = find(&stream[start..], b"\x1b\\") else {
            break;
        };
        let body = &stream[start..start + end];
        let params = match body.iter().position(|&b| b == b';') {
            Some(semi) => &body[..semi],
            None => body,
        };
        out.push(String::from_utf8_lossy(params).into_owned());
        i = start + end + 2;
    }
    out
}

fn kv(params: &str) -> Vec<(String, String)> {
    params
        .split(',')
        .filter(|part| !part.is_empty())
        .map(|part| match part.split_once('=') {
            Some((k, v)) => (k.to_string(), v.to_string()),
            None => (part.to_string(), String::new()),
        })
        .collect()
}

fn get<'a>(kvs: &'a [(String, String)], key: &str) -> Option<&'a str> {
    kvs.iter().find(|(k, _)| k == key).map(|(_, v)| v.as_str())
}

fn trace_text(dir: &Path) -> String {
    std::fs::read_to_string(dir.join("trace.jsonl")).unwrap_or_default()
}

fn wait_trace(dir: &Path, needle: &str, timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    loop {
        if trace_text(dir).contains(needle) {
            return true;
        }
        if Instant::now() >= deadline {
            return false;
        }
        std::thread::sleep(Duration::from_millis(10));
    }
}

/// Forced-Kitty steady state: every atlas placement carries an explicit
/// `z`, static sits at z=0, transmits stay silent, deletes are exact,
/// and no Sixel escape ever leaks into the Kitty stream.
#[test]
fn kitty_render_pipeline_z_layers_quiet_transmits_and_exact_deletes() {
    let dir = session_dir("kitty-pipeline");
    let (mut pty, mut child) = spawn_pty(&dir, "kitty", "xterm-kitty");
    let mut out = Vec::new();
    assert!(
        wait_for(
            &mut pty.master,
            &mut out,
            "video tier: kitty-graphics",
            Duration::from_secs(20)
        ),
        "kitty title never appeared; tail: {}",
        tail(&out)
    );
    (&pty.master).write_all(b"\r").unwrap();
    assert!(
        wait_for(&mut pty.master, &mut out, "SCORE ", Duration::from_secs(10)),
        "play never started; tail: {}",
        tail(&out)
    );
    collect_for(&mut pty.master, &mut out, Duration::from_millis(2200));
    stop(&mut child);

    let apcs = apc_params(&out);
    let mut static_tx = false;
    let mut atlas_tx = false;
    let mut static_place_z0 = false;
    let mut zs: BTreeSet<u32> = BTreeSet::new();
    let mut exact_deletes = 0usize;
    for params in &apcs {
        let kvs = kv(params);
        match get(&kvs, "a") {
            Some("t") => {
                if get(&kvs, "i") == Some(STATIC_IMAGE_ID) {
                    static_tx = true;
                    assert_eq!(
                        get(&kvs, "f"),
                        Some("100"),
                        "static transmit must be PNG: {params}"
                    );
                    assert_eq!(
                        get(&kvs, "q"),
                        Some("2"),
                        "steady-state transmit must stay silent: {params}"
                    );
                }
                if get(&kvs, "i") == Some(ATLAS_IMAGE_ID) {
                    atlas_tx = true;
                    assert_eq!(
                        get(&kvs, "q"),
                        Some("2"),
                        "steady-state transmit must stay silent: {params}"
                    );
                }
            }
            Some("p") => {
                if get(&kvs, "i") == Some(ATLAS_IMAGE_ID) {
                    let z = get(&kvs, "z")
                        .unwrap_or_else(|| panic!("atlas placement without explicit z: {params}"));
                    assert_eq!(
                        get(&kvs, "q"),
                        Some("2"),
                        "steady-state placement must stay silent: {params}"
                    );
                    zs.insert(z.parse::<u32>().expect("numeric z"));
                }
                if get(&kvs, "i") == Some(STATIC_IMAGE_ID) && get(&kvs, "p") == Some("1") {
                    assert_eq!(
                        get(&kvs, "z"),
                        Some("0"),
                        "static board must sit at z=0: {params}"
                    );
                    static_place_z0 = true;
                }
            }
            Some("d") => {
                assert_ne!(
                    get(&kvs, "d"),
                    Some("p"),
                    "d=p deletes no placement (the F2 no-op): {params}"
                );
                let exact = params == "a=d";
                let free = get(&kvs, "d") == Some("I")
                    && get(&kvs, "i").is_some()
                    && get(&kvs, "p").is_none();
                let placement = get(&kvs, "d") == Some("i")
                    && get(&kvs, "i") == Some(ATLAS_IMAGE_ID)
                    && get(&kvs, "p")
                        .is_some_and(|p| !p.is_empty() && p.bytes().all(|b| b.is_ascii_digit()));
                assert!(
                    exact || free || placement,
                    "unexpected delete shape: {params}"
                );
                if placement {
                    exact_deletes += 1;
                }
            }
            _ => {}
        }
    }
    assert!(static_tx, "no static transmit seen");
    assert!(atlas_tx, "no atlas transmit seen");
    assert!(static_place_z0, "static placement with z=0 never seen");
    assert!(zs.contains(&1), "no sunseed placement at z=1; zs={zs:?}");
    assert!(zs.contains(&11), "no Pip placement at z=11; zs={zs:?}");
    assert!(
        zs.iter().any(|z| (3..=10).contains(z)),
        "no warden placement in z=3..=10; zs={zs:?}"
    );
    assert!(
        exact_deletes >= 5,
        "expected moving entities to issue exact d=i deletes; saw {exact_deletes}"
    );
    assert!(
        !String::from_utf8_lossy(&out).contains("\x1bPq"),
        "a Kitty-tier session must never emit Sixel frames"
    );
    let _ = std::fs::remove_dir_all(&dir);
}

/// The kitty live probe: two fragmented OK replies (one frame split mid
/// escape) must upgrade to graphics-and-placements, and the probe's
/// cleanup must remove its placement and free its image. The Sixel DA1
/// probe must not run after a positive kitty answer.
#[test]
fn kitty_probe_two_fragmented_ok_replies_upgrade_to_placement_mode() {
    let dir = session_dir("kitty-probe-ok");
    let (mut pty, mut child) = spawn_pty_auto(&dir, "xterm-256color");
    let mut out = Vec::new();
    let probe_tx = format!("i={PROBE_IMAGE_ID},a=t");
    assert!(
        wait_for(
            &mut pty.master,
            &mut out,
            &probe_tx,
            Duration::from_secs(20)
        ),
        "kitty probe transmit request never appeared; tail: {}",
        tail(&out)
    );
    // Reply one, deliberately fragmented mid-frame.
    (&pty.master).write_all(b"\x1b_Gi=1296236545").unwrap();
    std::thread::sleep(Duration::from_millis(60));
    (&pty.master).write_all(b";OK\x1b\\").unwrap();
    assert!(
        wait_for(
            &mut pty.master,
            &mut out,
            "a=p,i=1296236545",
            Duration::from_secs(5)
        ),
        "kitty probe placement request never appeared; tail: {}",
        tail(&out)
    );
    (&pty.master)
        .write_all(b"\x1b_Gi=1296236545,p=1;OK\x1b\\")
        .unwrap();
    assert!(
        wait_for(
            &mut pty.master,
            &mut out,
            "video tier: kitty-graphics",
            Duration::from_secs(10)
        ),
        "two OK replies must upgrade to kitty-graphics; tail: {}",
        tail(&out)
    );
    (&pty.master).write_all(b"\r").unwrap();
    assert!(
        wait_for(&mut pty.master, &mut out, "SCORE ", Duration::from_secs(10)),
        "play never started after the probe; tail: {}",
        tail(&out)
    );
    stop(&mut child);

    let text = trace_text(&dir);
    let probe_line = text
        .lines()
        .find(|l| l.contains("\"kind\":\"probe\"") && l.contains("\"protocol\":\"kitty\""))
        .unwrap_or_else(|| panic!("no kitty probe record in trace:\n{text}"));
    assert!(
        probe_line.contains("\"ok\":true"),
        "probe record must report graphics ok: {probe_line}"
    );
    assert!(
        probe_line.contains("\"placements\":true"),
        "probe record must report placement support: {probe_line}"
    );
    let stream = String::from_utf8_lossy(&out);
    assert!(
        stream.contains("a=d,d=i,i=1296236545,p=1"),
        "probe cleanup must delete its placement exactly"
    );
    assert!(
        stream.contains("a=d,d=I,i=1296236545"),
        "probe cleanup must free its image"
    );
    assert!(
        !stream.contains("\x1b[c"),
        "the Sixel DA1 probe must not run after a positive kitty answer"
    );
    let _ = std::fs::remove_dir_all(&dir);
}

/// A rejected probe placement keeps the proven whole-frame transmit
/// path: the session must use `a=T` full-frame displays and never atlas
/// placements, and the trace must record the rejection.
#[test]
fn kitty_probe_placement_rejection_keeps_full_frame_transmit_mode() {
    let dir = session_dir("kitty-probe-einval");
    let (mut pty, mut child) = spawn_pty_auto(&dir, "xterm-256color");
    let mut out = Vec::new();
    let probe_tx = format!("i={PROBE_IMAGE_ID},a=t");
    assert!(
        wait_for(
            &mut pty.master,
            &mut out,
            &probe_tx,
            Duration::from_secs(20)
        ),
        "kitty probe transmit request never appeared; tail: {}",
        tail(&out)
    );
    (&pty.master)
        .write_all(b"\x1b_Gi=1296236545;OK\x1b\\")
        .unwrap();
    assert!(
        wait_for(
            &mut pty.master,
            &mut out,
            "a=p,i=1296236545",
            Duration::from_secs(5)
        ),
        "kitty probe placement request never appeared; tail: {}",
        tail(&out)
    );
    (&pty.master)
        .write_all(b"\x1b_Gi=1296236545,p=1;EINVAL\x1b\\")
        .unwrap();
    assert!(
        wait_for(
            &mut pty.master,
            &mut out,
            "video tier: kitty-graphics",
            Duration::from_secs(10)
        ),
        "graphics support must still engage; tail: {}",
        tail(&out)
    );
    (&pty.master).write_all(b"\r").unwrap();
    assert!(
        wait_for(&mut pty.master, &mut out, "SCORE ", Duration::from_secs(10)),
        "play never started; tail: {}",
        tail(&out)
    );
    collect_for(&mut pty.master, &mut out, Duration::from_millis(800));
    stop(&mut child);

    let text = trace_text(&dir);
    let probe_line = text
        .lines()
        .find(|l| l.contains("\"kind\":\"probe\"") && l.contains("\"protocol\":\"kitty\""))
        .unwrap_or_else(|| panic!("no kitty probe record in trace:\n{text}"));
    assert!(
        probe_line.contains("\"ok\":true") && probe_line.contains("\"placements\":false"),
        "probe record must report graphics-without-placements: {probe_line}"
    );
    assert!(
        text.lines()
            .any(|l| l.contains("\"kind\":\"frame\"") && l.contains("\"mode\":\"frame\"")),
        "trace must show full-frame frames:\n{text}"
    );
    let apcs = apc_params(&out);
    assert!(
        apcs.iter().any(|p| get(&kv(p), "a") == Some("T")),
        "no full-frame a=T display escape seen"
    );
    assert!(
        !apcs
            .iter()
            .any(|p| get(&kv(p), "a") == Some("p") && get(&kv(p), "i") == Some(ATLAS_IMAGE_ID)),
        "the rejected-placement path must never place atlas sprites"
    );
    let _ = std::fs::remove_dir_all(&dir);
}

/// F4: leaving the Kitty tier under write pressure must release the old
/// board and atlas in the first frame that reaches the screen, strictly
/// before the first Sixel DCS frame, and never place another kitty
/// sprite afterwards.
#[test]
fn leaving_kitty_tier_releases_board_and_atlas_before_first_sixel_frame() {
    let dir = session_dir("kitty-release");
    // stdout: a bounded, non-blocking pipe we deliberately stop reading
    // so frame writes fail and the watchdog downgrades the tier.
    let mut fds = [0i32; 2];
    assert_eq!(unsafe { libc::pipe(fds.as_mut_ptr()) }, 0, "pipe failed");
    let (read_fd, write_fd) = (fds[0], fds[1]);
    // 64 KiB keeps the fill window short; failure is fine (the default
    // capacity matches). Linux-only: macOS has no F_SETPIPE_SZ and its
    // default pipe capacity is small enough anyway.
    #[cfg(target_os = "linux")]
    unsafe {
        libc::fcntl(write_fd, libc::F_SETPIPE_SZ, 65536)
    };
    for fd in [read_fd, write_fd] {
        let flags = unsafe { libc::fcntl(fd, libc::F_GETFL) };
        assert_ne!(flags, -1);
        assert_ne!(
            unsafe { libc::fcntl(fd, libc::F_SETFL, flags | libc::O_NONBLOCK) },
            -1
        );
    }
    let write_end = unsafe { std::fs::File::from_raw_fd(write_fd) };
    let mut read_end = unsafe { std::fs::File::from_raw_fd(read_fd) };

    let pty = open_pty(100, 40);
    let mut cmd = Command::new(env!("CARGO_BIN_EXE_maze-chase-terminal"));
    cmd.arg("--dir")
        .arg(&dir)
        .arg("--tier")
        .arg("kitty")
        .env("TERM", "xterm-kitty")
        .env("MAZE_CHASE_TRACE", dir.join("trace.jsonl"))
        .stdin(Stdio::from(pty.slave.try_clone().unwrap()))
        .stdout(Stdio::from(write_end))
        .stderr(Stdio::from(pty.slave.try_clone().unwrap()));
    unsafe {
        cmd.pre_exec(own_controlling_tty());
    }
    let mut child = cmd.spawn().expect("spawn maze-chase-terminal");
    std::thread::sleep(Duration::from_millis(900));
    (&pty.master).write_all(b"\r").unwrap();

    // Wait for the first downgrade (kitty -> sixel) while never reading
    // the pipe: the frames pile up until writes fail.
    assert!(
        wait_trace(&dir, "\"kind\":\"watchdog\"", Duration::from_secs(30)),
        "the watchdog never downgraded under write pressure; trace:\n{}",
        trace_text(&dir)
    );

    // The moment the downgrade lands, drain: the pending release frame
    // and the first Sixel frames can now reach the pipe. Keep reading for
    // the whole window so no later frame write fails into a full pipe.
    let mut buf = Vec::new();
    let deadline = Instant::now() + Duration::from_secs(5);
    while Instant::now() < deadline {
        let mut chunk = [0u8; 65536];
        match read_end.read(&mut chunk) {
            Ok(0) => break,
            Ok(n) => buf.extend_from_slice(&chunk[..n]),
            Err(e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
            Err(_) => std::thread::sleep(Duration::from_millis(10)),
        }
    }
    let released = wait_trace(&dir, "\"mode\":\"sixel\"", Duration::from_secs(10));
    stop(&mut child);

    let stream = String::from_utf8_lossy(&buf).into_owned();
    let last_place = stream
        .rfind("a=p,i=1296236546")
        .expect("no kitty atlas placement seen before the downgrade");
    let release = format!(
        "\x1b_Ga=d\x1b\\\x1b_Ga=d,d=I,i={STATIC_IMAGE_ID}\x1b\\\x1b_Ga=d,d=I,i={ATLAS_IMAGE_ID}\x1b\\"
    );
    let rel_at = stream[last_place..]
        .find(&release)
        .map(|i| i + last_place)
        .unwrap_or_else(|| {
            panic!(
                "release trio (delete-all plus both image frees) never followed the \
                 last kitty placement; tail: {}",
                tail(&buf)
            )
        });
    let dcs_at = stream[rel_at..]
        .find("\x1bPq")
        .map(|i| i + rel_at)
        .unwrap_or_else(|| panic!("no Sixel DCS frame after the release; tail: {}", tail(&buf)));
    let sync_at = stream[rel_at..]
        .find("\x1b[?2026h")
        .map(|i| i + rel_at)
        .unwrap_or_else(|| panic!("no synchronized frame after the release"));
    assert!(
        rel_at < sync_at && sync_at < dcs_at,
        "release must precede the frame header and the first Sixel DCS"
    );
    assert!(
        stream[rel_at..].find("a=p,i=1296236546").is_none(),
        "no kitty sprite may be placed after the release"
    );
    assert!(
        released,
        "the first post-downgrade frame never landed as a Sixel frame; trace:\n{}",
        trace_text(&dir)
    );
    let _ = std::fs::remove_dir_all(&dir);
}

/// F3 root cause: eating a sunseed drops its entity id from the desired
/// placement set, and the renderer's escape for a vanished id is the
/// exact `d=i` delete (the `d=p` form can never match a placement).
#[test]
fn eaten_sunseed_leaves_the_desired_set_and_maps_to_an_exact_delete() {
    use maze_chase_assets::themes;
    use maze_chase_engine::game::Game;
    use maze_chase_engine::maze::Pickup;
    use maze_chase_terminal::{atlas, kitty};

    let theme = themes::by_id("ember-warren").expect("ember-warren theme");
    let mut game = Game::new(7, 1);
    let built = atlas::Atlas::build(theme, 8);
    let tile_id = 1000 + (22 * 28 + 2) as u32; // bottom-left sunseed (2, 22)
    let before = atlas::placements(&game, 8, 0, false, &built);
    let sun = before
        .iter()
        .find(|p| p.id == tile_id)
        .expect("sunseed placement before eating");
    assert_eq!(sun.z, 1, "sunseeds stack at z=1");
    assert_eq!(game.maze.eat_at(2, 22), Some(Pickup::Energizer));
    let after = atlas::placements(&game, 8, 0, false, &built);
    assert!(
        !after.iter().any(|p| p.id == tile_id),
        "an eaten sunseed must leave the desired placement set"
    );
    let del = kitty::delete_placement_escape(kitty::ATLAS_IMAGE_ID, tile_id);
    assert_eq!(
        del,
        format!(
            "\x1b_Ga=d,d=i,i={},p={tile_id}\x1b\\",
            kitty::ATLAS_IMAGE_ID
        )
    );
    assert!(!del.contains("d=p"), "d=p is not a placement delete");
}

#[test]
fn private_csi_input_stall_is_pinned_and_recovers_on_the_completion_byte() {
    // Documented limitation (review round E5): crossterm's parser keeps
    // an unrecognized private CSI (for example `ESC [ ? 99999 h`) in its
    // buffer and delivers no key events until a completion byte such as
    // `u` arrives. The game therefore cannot recover on its own; this
    // test pins the exact behavior so the docs cannot drift from it.
    let dir = session_dir("private-csi");
    let (mut pty, mut child) = spawn_pty(&dir, "truecolor", "xterm-256color");
    let mut out = Vec::new();
    assert!(
        wait_for(
            &mut pty.master,
            &mut out,
            "video tier: truecolor-cells",
            Duration::from_secs(20)
        ),
        "title never appeared; tail: {}",
        tail(&out)
    );
    pty.master.write_all(b"\x1b[?99999h").unwrap();
    collect_for(&mut pty.master, &mut out, Duration::from_millis(250));
    pty.master.write_all(b"\x1b").unwrap();
    collect_for(&mut pty.master, &mut out, Duration::from_millis(700));
    assert!(
        child.try_wait().unwrap().is_none(),
        "the private-CSI limitation changed: Esc quit while the parser was stalled; tail: {}",
        tail(&out)
    );
    pty.master.write_all(b"u").unwrap();
    collect_for(&mut pty.master, &mut out, Duration::from_millis(250));
    pty.master.write_all(b"\x1b").unwrap();
    let deadline = Instant::now() + Duration::from_secs(4);
    let exited = loop {
        if child.try_wait().unwrap().is_some() {
            break true;
        }
        if Instant::now() >= deadline {
            break false;
        }
        collect_for(&mut pty.master, &mut out, Duration::from_millis(50));
    };
    if !exited {
        stop(&mut child);
    }
    assert!(
        exited,
        "Esc after the completion byte must quit; tail: {}",
        tail(&out)
    );
}
