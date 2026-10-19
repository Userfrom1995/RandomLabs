//! `maze-chase-terminal`: the fullscreen terminal game binary.
//!
//! Owns everything the library cannot: raw mode, the alternate screen,
//! the event loop, frame pacing, bitmap presentation, and the live Sixel
//! probe. The game itself lives in the library (`App`): this file maps
//! crossterm events to `App` calls and paints `App` state to stdout.

use crossterm::event::{self, Event as TermEvent, KeyboardEnhancementFlags};
use crossterm::execute;
use crossterm::terminal::{
    disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen,
};
use maze_chase_terminal::app::{config_dir, App};
use maze_chase_terminal::backend::Tier;
use maze_chase_terminal::screens::ScreenId;
use maze_chase_terminal::{chrome, input, sixel, unicode};
use std::io::{IsTerminal, Write};
use std::time::{Duration, Instant};

const VERSION: &str = env!("CARGO_PKG_VERSION");

fn usage() -> String {
    format!(
        "maze-chase-terminal {VERSION}\n\
         A polished fullscreen maze-chase arcade game for the terminal.\n\
         \n\
         Usage: maze-chase-terminal [OPTIONS]\n\
         \n\
         Options:\n\
         \x20 --tier <kitty|sixel|truecolor|legacy>  force a render tier\n\
         \x20 --dir <path>                           config/scores directory\n\
         \x20 --help                                 show this help\n\
         \x20 --version                              show the version\n\
         \n\
         Controls: arrows/WASD move, P pause, M mute, Esc menu.\n\
         The game auto-detects Kitty graphics, Sixel, and truecolor;"
    )
}

/// RAII terminal guard: alternate screen + raw mode on creation, full
/// restore on drop (including panic unwinds).
struct Terminal {
    kitty_keyboard: bool,
}

impl Terminal {
    fn new(kitty_keyboard: bool) -> std::io::Result<Self> {
        // On Windows crossterm's raw mode talks to the console object
        // (CONIN$/CONOUT$), not the redirected std handles, so it
        // "succeeds" on a piped run where the Unix arm fails - refuse
        // exactly like the documented Unix behavior instead of taking
        // over a terminal nobody can see or drive.
        #[cfg(windows)]
        if !std::io::stdout().is_terminal() {
            return Err(std::io::Error::other("stdout is not a terminal"));
        }
        enable_raw_mode()?;
        let mut out = std::io::stdout();
        execute!(out, EnterAlternateScreen)?;
        execute!(out, crossterm::cursor::Hide)?;
        let mut term = Self {
            kitty_keyboard: false,
        };
        if kitty_keyboard {
            term.set_kitty_keyboard(true);
        }
        Ok(term)
    }

    /// Push or pop kitty's keyboard enhancement protocol. Called when the
    /// live probe upgrades to the graphics tier after the terminal
    /// takeover (or when the watchdog drops back to cells), so key
    /// reporting matches the active tier.
    fn set_kitty_keyboard(&mut self, on: bool) {
        if self.kitty_keyboard == on {
            return;
        }
        let mut out = std::io::stdout();
        if on {
            let _ = execute!(
                out,
                crossterm::event::PushKeyboardEnhancementFlags(
                    KeyboardEnhancementFlags::DISAMBIGUATE_ESCAPE_CODES
                )
            );
        } else {
            let _ = execute!(out, crossterm::event::PopKeyboardEnhancementFlags);
        }
        self.kitty_keyboard = on;
    }
}

impl Drop for Terminal {
    fn drop(&mut self) {
        let mut out = std::io::stdout();
        if self.kitty_keyboard {
            let _ = execute!(out, crossterm::event::PopKeyboardEnhancementFlags);
        }
        let _ = execute!(out, crossterm::cursor::Show);
        let _ = execute!(out, LeaveAlternateScreen);
        let _ = disable_raw_mode();
    }
}

/// Which protocol reply a bounded startup probe waits for.
#[derive(Clone, Copy, PartialEq, Eq)]
enum ReplyKind {
    /// Sixel capability: a complete DA1 `ESC [ ? params c` answer.
    Da1,
    /// Kitty graphics: a complete `ESC _ G ... ESC \` APC reply.
    Kitty,
}

impl ReplyKind {
    fn complete(self, captured: &[u8]) -> bool {
        match self {
            ReplyKind::Da1 => da1_reply_complete(captured),
            // The kitty probe issues two commands (transmit plus
            // placement); only both replies prove the round trip, so the
            // capture is complete once two framed APC replies landed.
            ReplyKind::Kitty => maze_chase_terminal::kitty::complete_reply_count(captured) >= 2,
        }
    }

    /// Split a capture into `(reply, typed)`: the framed reply bytes (when
    /// one completed) and every other byte, which is user input typed
    /// while the probe waited. The Kitty arm re-frames every complete APC
    /// reply, so the caller can re-split it with
    /// [`maze_chase_terminal::kitty::split_replies`]; the framing is
    /// never dropped (the old joined-body form was unparseable).
    fn split(self, captured: &[u8]) -> (Vec<u8>, Vec<u8>) {
        match self {
            ReplyKind::Da1 => split_da1_reply(captured),
            ReplyKind::Kitty => {
                let (replies, typed) = maze_chase_terminal::kitty::split_replies(captured);
                let framed: String = replies
                    .iter()
                    .map(|body| format!("\x1b_G{body}\x1b\\"))
                    .collect();
                (framed.into_bytes(), typed)
            }
        }
    }
}

/// Outcome of the live Sixel probe: whether the terminal positively
/// announced Sixel, plus every user keystroke the probe read while
/// waiting. Captured keys are replayed into the game loop (never
/// dropped), so the probe window can never swallow the first keypress.
struct ProbeOutcome {
    sixel: bool,
    typed: Vec<u8>,
}

/// Outcome of the live Kitty graphics probe.
struct KittyProbe {
    /// `None` when the terminal never answered (`not a kitty terminal`);
    /// `Some(placements)` when graphics work, with placement support.
    support: Option<KittySupport>,
    typed: Vec<u8>,
    elapsed: Duration,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct KittySupport {
    /// The terminal accepted `a=p` placements (otherwise the renderer
    /// falls back to whole-frame transmits).
    placements: bool,
}

/// Decide probe support from the framed APC replies of one round trip:
/// the transmit reply must be `OK` (graphics work); the placement reply
/// then decides placement support, and anything but `OK` there keeps
/// the proven whole-frame path. Silence or an errored transmit is
/// "not a kitty terminal".
fn kitty_probe_support(reply: &[u8]) -> Option<KittySupport> {
    let (replies, _) = maze_chase_terminal::kitty::split_replies(reply);
    match replies
        .first()
        .and_then(|body| maze_chase_terminal::kitty::reply_ok(body))
    {
        Some(true) => Some(KittySupport {
            placements: replies
                .get(1)
                .and_then(|body| maze_chase_terminal::kitty::reply_ok(body))
                .unwrap_or(false),
        }),
        _ => None,
    }
}

/// Live Kitty graphics probe: asks the terminal with a real 1x1
/// transmit plus a placement and waits up to 200 ms for both framed
/// replies. Bounded like the DA1 probe, and every non-reply byte the
/// probe reads comes back in `typed` so it is replayed, never swallowed.
fn probe_kitty_live() -> KittyProbe {
    let started = Instant::now();
    if !std::io::stdin().is_terminal() {
        return KittyProbe {
            support: None,
            typed: Vec::new(),
            elapsed: started.elapsed(),
        };
    }
    {
        let mut out = std::io::stdout();
        let _ = out.write_all(maze_chase_terminal::kitty::probe_request().as_bytes());
        let _ = out.flush();
    }
    let (reply, typed) = read_probe_reply(ReplyKind::Kitty, Duration::from_millis(200));
    let support = kitty_probe_support(&reply);
    // The probe is over either way: remove its placement and image data.
    {
        let mut out = std::io::stdout();
        let _ = out.write_all(maze_chase_terminal::kitty::probe_cleanup().as_bytes());
        let _ = out.flush();
    }
    KittyProbe {
        support,
        typed,
        elapsed: started.elapsed(),
    }
}

/// Live Sixel probe: asks the terminal (DA1) and waits up to 250 ms for
/// the reply, reading only while bytes are ready. Bounded by design: no
/// reader thread survives the deadline, so a silent terminal costs a
/// quarter second once. Only a complete framed DA1 reply is consumed;
/// every other captured byte is user input and comes back in `typed`.
/// Returns `sixel = true` only when the reply positively announces it.
fn probe_sixel_live() -> ProbeOutcome {
    if !std::io::stdin().is_terminal() {
        return ProbeOutcome {
            sixel: false,
            typed: Vec::new(),
        };
    }
    {
        let mut out = std::io::stdout();
        let _ = out.write_all(sixel::probe_request().as_bytes());
        let _ = out.flush();
    }
    let (reply, typed) = read_probe_reply(ReplyKind::Da1, Duration::from_millis(250));
    ProbeOutcome {
        sixel: da1_reply_complete(&reply) && sixel::probe_ok(&String::from_utf8_lossy(&reply)),
        typed,
    }
}

/// Find a complete framed DA1 reply (`ESC [ ? params c`) in `bytes` and
/// return its `[start, end)` span. Only bytes forming this shape can be
/// the terminal's answer; anything else stays user input.
fn find_da1_reply(bytes: &[u8]) -> Option<(usize, usize)> {
    let mut start = 0;
    while start + 3 <= bytes.len() {
        if &bytes[start..start + 3] == b"\x1b[?" {
            let mut end = start + 3;
            while end < bytes.len() && (bytes[end].is_ascii_digit() || bytes[end] == b';') {
                end += 1;
            }
            if bytes.get(end) == Some(&b'c') {
                return Some((start, end + 1));
            }
        }
        start += 1;
    }
    None
}

/// True once `reply` holds a complete DA1 reply (`ESC [ ? ... c`).
fn da1_reply_complete(reply: &[u8]) -> bool {
    find_da1_reply(reply).is_some()
}

/// Split a probe capture into `(reply, typed)`: the framed DA1 reply
/// (when one completed inside the window) and every other byte, which is
/// user input typed while the probe waited.
fn split_da1_reply(captured: &[u8]) -> (Vec<u8>, Vec<u8>) {
    match find_da1_reply(captured) {
        Some((start, end)) => {
            let mut typed = captured[..start].to_vec();
            typed.extend_from_slice(&captured[end..]);
            (captured[start..end].to_vec(), typed)
        }
        None => (Vec::new(), captured.to_vec()),
    }
}

/// Read stdin until a complete reply for `kind` lands or `timeout`
/// elapses, reading only when bytes are ready (Unix: `poll`; Windows: a
/// waitable console handle). Returns `(reply, typed)`: the framed reply,
/// if any, plus every other byte read (user keystrokes), never dropped.
#[cfg(unix)]
fn read_probe_reply(kind: ReplyKind, timeout: Duration) -> (Vec<u8>, Vec<u8>) {
    use std::os::fd::AsRawFd;
    read_probe_reply_fd(std::io::stdin().as_raw_fd(), kind, timeout)
}

/// [`read_probe_reply`] for an arbitrary fd (the pipe-based tests drive
/// this directly).
#[cfg(unix)]
fn read_probe_reply_fd(
    fd: std::os::fd::RawFd,
    kind: ReplyKind,
    timeout: Duration,
) -> (Vec<u8>, Vec<u8>) {
    let deadline = Instant::now() + timeout;
    let mut captured: Vec<u8> = Vec::new();
    let mut buf = [0u8; 64];
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            break;
        }
        let ms = remaining.as_millis().min(i32::MAX as u128) as i32;
        let mut pfd = libc::pollfd {
            fd,
            events: libc::POLLIN,
            revents: 0,
        };
        let ready = unsafe { libc::poll(&mut pfd, 1, ms) };
        if ready <= 0 || pfd.revents & libc::POLLIN == 0 {
            break;
        }
        let n = unsafe { libc::read(fd, buf.as_mut_ptr().cast(), buf.len()) };
        if n <= 0 {
            break;
        }
        captured.extend_from_slice(&buf[..n as usize]);
        if kind.complete(&captured) {
            break;
        }
    }
    kind.split(&captured)
}

/// Windows arm: the console input handle is waitable, but a high-level
/// `std::io::stdin().read()` after a wake is not bounded - ReadConsole
/// discards arrow/function-key (and mouse/window) records and does not
/// return until a character is available, so a wake on a non-character
/// record parks a blocking read past the deadline that then eats the
/// next key. Read queued records directly instead, and never through
/// Rust's buffered stdin (a fill can strand records where crossterm
/// will never look).
#[cfg(windows)]
fn read_probe_reply(kind: ReplyKind, timeout: Duration) -> (Vec<u8>, Vec<u8>) {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::Foundation::WAIT_OBJECT_0;
    use windows_sys::Win32::System::Console::{
        GetNumberOfConsoleInputEvents, ReadConsoleInputW, INPUT_RECORD, KEY_EVENT,
    };
    use windows_sys::Win32::System::Threading::WaitForSingleObject;

    let deadline = Instant::now() + timeout;
    let handle = std::io::stdin().as_raw_handle();
    let mut captured: Vec<u8> = Vec::new();
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            break;
        }
        let ms = (remaining.as_millis().min(u32::MAX as u128) as u32).max(1);
        if unsafe { WaitForSingleObject(handle, ms) } != WAIT_OBJECT_0 {
            break;
        }
        // Drain only records that are already queued: ReadConsoleInputW
        // blocks on an empty buffer, and the buffer is not empty when
        // GetNumberOfConsoleInputEvents reports records.
        let mut pending: u32 = 0;
        while unsafe { GetNumberOfConsoleInputEvents(handle, &mut pending) } != 0 && pending > 0 {
            let mut record: INPUT_RECORD = unsafe { std::mem::zeroed() };
            let mut got: u32 = 0;
            if unsafe { ReadConsoleInputW(handle, &mut record, 1, &mut got) } == 0 || got == 0 {
                break;
            }
            if u32::from(record.EventType) == KEY_EVENT {
                let key = unsafe { record.Event.KeyEvent };
                let ch = unsafe { key.uChar.UnicodeChar };
                if key.bKeyDown != 0 && ch != 0 {
                    if ch < 0x80 {
                        captured.push(ch as u8);
                    } else {
                        let mut utf8 = [0u8; 4];
                        captured.extend_from_slice(
                            char::from_u32(ch as u32)
                                .unwrap_or(char::REPLACEMENT_CHARACTER)
                                .encode_utf8(&mut utf8)
                                .as_bytes(),
                        );
                    }
                }
            }
        }
        if kind.complete(&captured) {
            break;
        }
    }
    kind.split(&captured)
}

/// No portable bounded console read elsewhere: stay on the cell tier
/// rather than leave a blocked reader behind.
#[cfg(not(any(unix, windows)))]
fn read_probe_reply(_kind: ReplyKind, _timeout: Duration) -> (Vec<u8>, Vec<u8>) {
    (Vec::new(), Vec::new())
}

fn paint_line(out: &mut String, row: u16, col: u16, text: &str) {
    out.push_str(&format!("\x1b[{};{}H{}", row + 1, col + 1, text));
}

/// Reconcile the fitted layout with the real terminal size.
///
/// crossterm only reports `Resize` when its SIGWINCH pipe byte is
/// drained; a SIGWINCH that lands in the same epoll batch as a key is
/// consumed by the event source without draining (the edge-triggered
/// signal pipe then never re-reports it), so the window change would be
/// invisible until the next resize. Comparing the real size every frame
/// (one cheap size query) makes the layout self-healing regardless of that
/// signal-pipe behavior. Returns true when the layout changed, so the
/// caller can re-encode a fresh bitmap.
fn reconcile_size(app: &mut App) -> bool {
    match crossterm::terminal::size() {
        Ok((cols, rows)) if (cols, rows) != (app.layout.cols, app.layout.rows) => {
            app.resize(cols, rows);
            true
        }
        _ => false,
    }
}

/// One frame's presentation counters for the trace.
#[derive(Clone, Copy, Debug, Default)]
struct FrameStats {
    mode: &'static str,
    placements: usize,
    static_resend: bool,
    atlas_resend: bool,
}

/// Kitty placement pipeline: a static board layer transmitted only when
/// it changes, a transparent sprite atlas transmitted on theme/scale
/// change, and per-entity placements diffed against the previous frame.
/// The full-frame path remains for terminals that answer the graphics
/// probe but reject placements.
struct KittyRenderer {
    /// False when the live probe proved transmit but not `a=p` support.
    placements: bool,
    static_key: Option<u64>,
    atlas_key: Option<u64>,
    atlas: Option<maze_chase_terminal::atlas::Atlas>,
    placed: Vec<maze_chase_terminal::atlas::Placement>,
    force_all: bool,
}

impl KittyRenderer {
    fn new(placements: bool) -> Self {
        Self {
            placements,
            static_key: None,
            atlas_key: None,
            atlas: None,
            placed: Vec::new(),
            force_all: true,
        }
    }

    /// Drop every transmitted image and force a full retransmit. Called
    /// on layout/plan changes, tier changes, and screen transitions.
    fn invalidate(&mut self) {
        self.static_key = None;
        self.atlas_key = None;
        self.atlas = None;
        self.placed.clear();
        self.force_all = true;
    }
}

fn static_key(
    game: &maze_chase_engine::game::Game,
    theme: &maze_chase_assets::themes::Theme,
    ppt: u32,
) -> u64 {
    use std::hash::{Hash, Hasher};
    let mut h = std::collections::hash_map::DefaultHasher::new();
    theme.id.hash(&mut h);
    ppt.hash(&mut h);
    game.level.hash(&mut h);
    game.maze.dot_bytes().hash(&mut h);
    h.finish()
}

fn atlas_key(theme: &maze_chase_assets::themes::Theme, ppt: u32) -> u64 {
    use std::hash::{Hash, Hasher};
    let mut h = std::collections::hash_map::DefaultHasher::new();
    theme.id.hash(&mut h);
    ppt.hash(&mut h);
    h.finish()
}

/// Hash every visible settings field: the Settings screen renders the
/// working copy (`app.screens.settings`) while the playing surface reads
/// the committed copy (`app.settings`, for reduced-flash and the theme),
/// so both participate in the idle-skip key. Volumes hash by bit pattern
/// (settings fields are not `Hash`).
fn hash_settings(h: &mut impl std::hash::Hasher, s: &maze_chase_config::settings::Settings) {
    use std::hash::Hash;
    s.difficulty.as_str().hash(h);
    s.theme.hash(h);
    s.master.to_bits().hash(h);
    s.music.to_bits().hash(h);
    s.sfx.to_bits().hash(h);
    s.mute.hash(h);
    s.reduced_flash.hash(h);
    s.high_contrast.hash(h);
    s.show_fps.hash(h);
}

/// The visible-state signature that lets idle surfaces skip frames.
/// Playing always redraws (the simulation is live); every menu, panel,
/// and overlay is static until one of these inputs changes. Settings
/// values, the armed rebind capture, and the bound keymap are part of
/// the key: changing any of them repaints immediately instead of
/// waiting out the 1 Hz idle keepalive.
fn frame_key(app: &App) -> u64 {
    use maze_chase_terminal::screens::ScreenId;
    use std::hash::{Hash, Hasher};
    let mut h = std::collections::hash_map::DefaultHasher::new();
    let tag: u8 = match app.screens.current {
        ScreenId::Title => 1,
        ScreenId::Help => 2,
        ScreenId::Scores => 3,
        ScreenId::Settings => 4,
        ScreenId::Rebind => 5,
        ScreenId::Playing => 6,
        ScreenId::Paused => 7,
        ScreenId::Over => 8,
    };
    tag.hash(&mut h);
    hash_settings(&mut h, &app.settings);
    hash_settings(&mut h, &app.screens.settings);
    match app.screens.current {
        ScreenId::Title => app.screens.menu.hash(&mut h),
        ScreenId::Help => app.screens.help_scroll.hash(&mut h),
        ScreenId::Settings => app.screens.settings_row.hash(&mut h),
        ScreenId::Rebind => {
            app.screens.rebind_action.hash(&mut h);
            app.screens.capture.hash(&mut h);
            app.screens.capture_error.hash(&mut h);
            for action in maze_chase_config::Action::ALL {
                app.keymap.keys(action).hash(&mut h);
            }
        }
        ScreenId::Paused => app.screens.pause_menu.hash(&mut h),
        ScreenId::Over => {
            app.screens.over_score.hash(&mut h);
            app.screens.over_level.hash(&mut h);
            app.screens.over_rank.hash(&mut h);
        }
        _ => {}
    }
    app.ticker().hash(&mut h);
    app.watchdog.trail.last().hash(&mut h);
    h.finish()
}

/// Wall-clock frame budget. Per-tier target rate, an exponential moving
/// average of the measured write time, and a one-second bytes-per-second
/// window. A slow or expensive frame delays the next one (bounded) so a
/// PTY is never flooded; a sustained Sixel byte flood backs off further
/// before the watchdog ever has to degrade the tier.
struct Pacer {
    interval: Duration,
    next: Instant,
    ema_write: f64,
    window_start: Instant,
    window_bytes: u64,
    bytes_per_s: f64,
    last_skip_log: Option<Instant>,
}

/// Sixel frames are large; above this rate the pacer halves its cadence.
const SIXEL_MAX_BYTES_PER_S: f64 = 8.0 * 1024.0 * 1024.0;

impl Pacer {
    fn for_tier(tier: Tier) -> Self {
        let hz = match tier {
            Tier::Kitty => 30.0,
            Tier::Sixel => 24.0,
            _ => 60.0,
        };
        let now = Instant::now();
        Self {
            interval: Duration::from_secs_f64(1.0 / hz),
            next: now,
            ema_write: 0.0,
            window_start: now,
            window_bytes: 0,
            bytes_per_s: 0.0,
            last_skip_log: None,
        }
    }

    fn due(&self, now: Instant) -> bool {
        now >= self.next
    }

    fn note_write(&mut self, took: Duration, bytes: usize, now: Instant) {
        let target = self.interval.as_secs_f64();
        let sample = took.as_secs_f64();
        self.ema_write = if self.ema_write == 0.0 {
            sample
        } else {
            self.ema_write * 0.7 + sample * 0.3
        };
        self.window_bytes += bytes as u64;
        let elapsed = now.duration_since(self.window_start).as_secs_f64();
        if elapsed >= 1.0 {
            self.bytes_per_s = self.window_bytes as f64 / elapsed;
            self.window_start = now;
            self.window_bytes = 0;
        }
        // Never faster than the tier cadence; back off to 1.5x the
        // smoothed write cost; double that under a Sixel byte flood.
        // The 200 ms cap keeps degradation responsive on a stuck pipe.
        let mut delay = target.max(self.ema_write * 1.5);
        if self.bytes_per_s > SIXEL_MAX_BYTES_PER_S {
            delay *= 2.0;
        }
        self.next = now + Duration::from_secs_f64(delay.min(0.2));
    }

    fn should_log_skip(&mut self, now: Instant) -> bool {
        match self.last_skip_log {
            Some(at) if at.elapsed() < Duration::from_secs(1) => false,
            _ => {
                self.last_skip_log = Some(now);
                true
            }
        }
    }
}

/// Kitty frame production: static layer, sprite atlas, and diffed
/// placements in board-native pixel coordinates.
fn kitty_frame(app: &App, out: &mut String, fresh: bool, kitty: &mut KittyRenderer) -> FrameStats {
    use maze_chase_engine::maze::{HEIGHT, WIDTH};
    use maze_chase_terminal::atlas;
    use maze_chase_terminal::kitty as kg;

    let b = app.layout.board;
    let theme = app.theme();
    let ppt = app.layout.ppt();
    let native_w = WIDTH as u32 * ppt;
    let native_h = HEIGHT as u32 * ppt;

    if fresh {
        out.push_str(kg::delete_all_escape());
        out.push_str(&kg::free_image_escape(kg::STATIC_IMAGE_ID));
        out.push_str(&kg::free_image_escape(kg::ATLAS_IMAGE_ID));
        kitty.invalidate();
    }

    if !kitty.placements {
        // Probe proved graphics but not placements: keep the proven
        // whole-frame path, still silent (q=2) to protect input.
        out.push_str(&kg::delete_escape(1));
        let png = app.bitmap_png();
        out.push_str(&kg::display_escape_id(
            &png,
            b.h as u32,
            b.w as u32,
            Some(1),
        ));
        return FrameStats {
            mode: "frame",
            ..FrameStats::default()
        };
    }

    let mut static_resend = false;
    let key = static_key(&app.game, theme, ppt);
    if kitty.static_key != Some(key) {
        let frame = atlas::static_frame(&app.game, theme, ppt);
        let png = kg::png_encode_rgba(frame.w, frame.h, &frame.px);
        out.push_str(&kg::transmit_escape(&png, kg::STATIC_IMAGE_ID));
        kitty.static_key = Some(key);
        static_resend = true;
    }

    let mut atlas_resend = false;
    let akey = atlas_key(theme, ppt);
    if kitty.atlas_key != Some(akey) {
        let built = atlas::Atlas::build(theme, ppt);
        let png = kg::png_encode_rgba(built.frame.w, built.frame.h, &built.frame.px);
        out.push_str(&kg::transmit_escape(&png, kg::ATLAS_IMAGE_ID));
        kitty.atlas = Some(built);
        kitty.atlas_key = Some(akey);
        kitty.placed.clear();
        kitty.force_all = true;
        atlas_resend = true;
    }
    let atlas = kitty
        .atlas
        .as_ref()
        .expect("the atlas is built on first use and kept until invalidation");

    if static_resend {
        // Re-placing the static layer puts it above existing sprite
        // placements; repaint every sprite after it in the same frame
        // to restore the intended order.
        kitty.force_all = true;
        paint_line(out, b.y, b.x, "");
        out.push_str(&kg::place_scaled_escape(
            kg::STATIC_IMAGE_ID,
            kg::STATIC_PLACEMENT_ID,
            (0, 0, native_w, native_h),
            (0, 0),
            Some((b.w as u32, b.h as u32)),
            atlas::z::STATIC,
        ));
    }

    let desired = atlas::placements(
        &app.game,
        ppt,
        app.frame_no,
        !app.settings.reduced_flash,
        atlas,
    );
    let (cell_w, cell_h) = maze_chase_terminal::geometry::detect_cell_px().unwrap_or((
        maze_chase_terminal::geometry::NOMINAL_CELL_W_PX,
        maze_chase_terminal::geometry::NOMINAL_CELL_H_PX,
    ));
    let cell_w = cell_w.max(1) as i32;
    let cell_h = cell_h.max(1) as i32;
    let disp_w = b.w as i32 * cell_w;
    let disp_h = b.h as i32 * cell_h;
    let fx = disp_w as f32 / native_w as f32;
    let fy = disp_h as f32 / native_h as f32;
    let scaled = (fx - 1.0).abs() > 0.02 || (fy - 1.0).abs() > 0.02;

    let prev: std::collections::HashMap<u32, atlas::Placement> =
        kitty.placed.iter().map(|p| (p.id, *p)).collect();
    for old in &kitty.placed {
        if !desired.iter().any(|p| p.id == old.id) {
            out.push_str(&kg::delete_placement_escape(kg::ATLAS_IMAGE_ID, old.id));
        }
    }

    let sprite = atlas.cell as i32;
    let mut emitted = 0usize;
    for part in &desired {
        if !kitty.force_all && prev.get(&part.id) == Some(part) {
            continue;
        }
        if prev.contains_key(&part.id) {
            out.push_str(&kg::delete_placement_escape(kg::ATLAS_IMAGE_ID, part.id));
        }
        // Clip to the board before mapping: a sprite at the tunnel edge
        // must never bleed into the chrome, exactly like the raster.
        let sx0 = part.x.max(0);
        let sy0 = part.y.max(0);
        let sx1 = (part.x + sprite).min(native_w as i32);
        let sy1 = (part.y + sprite).min(native_h as i32);
        if sx1 <= sx0 || sy1 <= sy0 {
            continue;
        }
        let (ax, ay) = atlas.slot_origin(part.slot);
        let src = (
            ax + (sx0 - part.x) as u32,
            ay + (sy0 - part.y) as u32,
            (sx1 - sx0) as u32,
            (sy1 - sy0) as u32,
        );
        let dx = (sx0 as f32 * fx).round() as i32;
        let dy = (sy0 as f32 * fy).round() as i32;
        let col = b.x as i32 + dx.div_euclid(cell_w);
        let row = b.y as i32 + dy.div_euclid(cell_h);
        if col < 0 || row < 0 {
            continue;
        }
        out.push_str(&format!("[{};{}H", row + 1, col + 1));
        let cells = scaled.then(|| {
            (
                ((sx1 - sx0) as f32 * fx / cell_w as f32).round().max(1.0) as u32,
                ((sy1 - sy0) as f32 * fy / cell_h as f32).round().max(1.0) as u32,
            )
        });
        out.push_str(&kg::place_scaled_escape(
            kg::ATLAS_IMAGE_ID,
            part.id,
            src,
            (dx.rem_euclid(cell_w) as u32, dy.rem_euclid(cell_h) as u32),
            cells,
            part.z,
        ));
        emitted += 1;
    }
    kitty.placed = desired;
    kitty.force_all = false;
    FrameStats {
        mode: "placements",
        placements: emitted,
        static_resend,
        atlas_resend,
    }
}

/// Render one full frame into `out` (caller flushes).
///
/// `fresh` marks a layout-plan or tier change: the frame first clears
/// the screen and deletes every live image placement, then repaints
/// everything in the same frame, so a resize can never leave stale
/// pixels or clipped glyphs behind (issue #674 - the old placement on
/// the old cell grid must be gone before the new frame shows).
/// Compose one due frame into `out`: clear the buffer, prepend the
/// pending Kitty release when the session just left the tier, then render
/// the current surface. One function on purpose: the release and the
/// buffer clear must not be reorderable, or a later clear can silently
/// discard the only bytes that release the old placements on a terminal
/// that never erases graphics on its own.
fn compose_frame(
    app: &mut App,
    out: &mut String,
    fresh: bool,
    kitty: &mut KittyRenderer,
    left_kitty: bool,
) -> FrameStats {
    out.clear();
    if left_kitty {
        out.push_str(maze_chase_terminal::kitty::delete_all_escape());
        out.push_str(&maze_chase_terminal::kitty::free_image_escape(
            maze_chase_terminal::kitty::STATIC_IMAGE_ID,
        ));
        out.push_str(&maze_chase_terminal::kitty::free_image_escape(
            maze_chase_terminal::kitty::ATLAS_IMAGE_ID,
        ));
    }
    render_frame(app, out, fresh, kitty)
}

fn render_frame(
    app: &mut App,
    out: &mut String,
    fresh: bool,
    kitty: &mut KittyRenderer,
) -> FrameStats {
    use maze_chase_terminal::screens::ScreenId;
    let mut stats = FrameStats::default();
    let theme = app.theme();
    let truecolor = matches!(app.tier(), Tier::Kitty | Tier::Sixel | Tier::Truecolor);
    let cols = app.layout.cols as usize;
    let rows = app.layout.rows as usize;
    // Synchronized output: tear-free frames where supported, harmless
    // plain text where not.
    out.push_str("\x1b[?2026h");
    if fresh {
        out.push_str("\x1b[2J");
    }
    out.push_str("\x1b[H");
    if app.layout.too_small {
        if fresh && app.tier() == Tier::Kitty {
            // Same contract as the board path below: a plan change must
            // kill every live placement before the card paints, so a
            // Kitty-compatible terminal that does not clear graphics on
            // ED2 can never leave the stale board behind the card.
            out.push_str(maze_chase_terminal::kitty::delete_all_escape());
        }
        for (i, line) in chrome::too_small_card(
            app.layout.cols,
            app.layout.rows,
            app.layout.min_cols,
            app.layout.min_rows,
        )
        .iter()
        .enumerate()
        {
            let padded = format!("{:<width$}", line, width = cols);
            paint_line(
                out,
                i as u16,
                0,
                &unicode::paint(&padded, theme.text, theme.bg, theme.bg, truecolor),
            );
        }
        out.push_str("\x1b[?2026l");
        return stats;
    }
    let bitmap = matches!(app.tier(), Tier::Kitty | Tier::Sixel);
    match app.screens.current {
        ScreenId::Playing | ScreenId::Paused => {
            if bitmap {
                // Board as pixels; chrome stays cells. The whole board
                // band is cleared first so the pixel image (whose cell
                // footprint varies by terminal) never leaves stale
                // fragments, then the image draws over the clearing.
                let b = &app.layout.board;
                for i in 0..b.h {
                    paint_line(
                        out,
                        b.y + i,
                        b.x,
                        &unicode::paint(
                            &" ".repeat(b.w as usize),
                            theme.bg,
                            theme.bg,
                            theme.bg,
                            truecolor,
                        ),
                    );
                }
                // The raster footprint: centered inside the board, mapped
                // from the raster's pixel size through the detected window
                // pixels; the full board without a pixel report (issue
                // #656 - no more overflow into the hint line and no more
                // corner-hugging inside a larger box).
                let img = app.layout.image;
                paint_line(out, img.y, img.x, "");
                if app.tier() == Tier::Kitty {
                    stats = kitty_frame(app, out, fresh, kitty);
                } else {
                    let frame = maze_chase_terminal::raster::render(
                        &app.game,
                        theme,
                        app.layout.ppt(),
                        app.frame_no,
                        !app.settings.reduced_flash,
                    );
                    let encoded = sixel::encode(&frame, 64);
                    let cells_fallback = encoded.is_empty();
                    if cells_fallback {
                        // A frame the byte budget cannot carry falls
                        // back to cells for this frame, never a blank
                        // or unbounded stream.
                        let screen = unicode::render_board(
                            &app.game,
                            theme,
                            &app.layout,
                            app.frame_no,
                            !app.settings.reduced_flash,
                        );
                        for (i, row) in screen.rows.iter().enumerate() {
                            paint_line(out, i as u16, 0, &unicode::row_ansi(row, theme, truecolor));
                        }
                    } else {
                        out.push_str(&encoded);
                    }
                    stats = FrameStats {
                        // The trace must name what actually painted:
                        // an over-budget frame painted cells, not sixel.
                        mode: if cells_fallback {
                            "cells-fallback"
                        } else {
                            "sixel"
                        },
                        ..FrameStats::default()
                    };
                }
            } else {
                // Full repaint: every row covers the window width, so
                // resizes and menu transitions never leave stale glyphs.
                let screen = unicode::render_board(
                    &app.game,
                    theme,
                    &app.layout,
                    app.frame_no,
                    !app.settings.reduced_flash,
                );
                for (i, row) in screen.rows.iter().enumerate() {
                    paint_line(out, i as u16, 0, &unicode::row_ansi(row, theme, truecolor));
                }
            }
            paint_chrome(app, out, truecolor, cols, rows);
            if app.screens.current == ScreenId::Paused {
                paint_panel(
                    out,
                    &chrome::paused(app.screens.pause_menu),
                    theme,
                    truecolor,
                    cols,
                    rows,
                    theme.accent,
                );
            }
        }
        _ => {
            if fresh && app.tier() == Tier::Kitty {
                // Leaving the board for a menu: no placement grid exists
                // on this surface, and unlike text the terminal never
                // erases graphics on its own.
                out.push_str(maze_chase_terminal::kitty::delete_all_escape());
                out.push_str(&maze_chase_terminal::kitty::free_image_escape(
                    maze_chase_terminal::kitty::STATIC_IMAGE_ID,
                ));
                out.push_str(&maze_chase_terminal::kitty::free_image_escape(
                    maze_chase_terminal::kitty::ATLAS_IMAGE_ID,
                ));
                kitty.invalidate();
            }
            // Full-screen surfaces.
            let lines = menu_lines(app);
            paint_panel(out, &lines, theme, truecolor, cols, rows, theme.text);
        }
    }
    // Audible BELs (capped per drain inside the sink).
    out.push_str(&app.chime.take_bells());
    out.push_str("\x1b[?2026l");
    stats
}

/// HUD chrome for the playing surface.
fn paint_chrome(app: &App, out: &mut String, truecolor: bool, _cols: usize, _rows: usize) {
    let theme = app.theme();
    let best = app.scores.first().map(|s| s.score).unwrap_or(0);
    if let Some(side) = app.layout.side {
        for (i, line) in chrome::side_panel(&app.game, best, tune_name(app), app.tier().name())
            .iter()
            .enumerate()
        {
            if i >= side.h as usize {
                break;
            }
            let padded = format!("{:<width$}", line, width = side.w as usize);
            paint_line(
                out,
                side.y + i as u16,
                side.x,
                &unicode::paint(&padded, theme.text, theme.bg, theme.bg, truecolor),
            );
        }
    } else if let Some(bar) = app.layout.top_bar {
        for (i, line) in chrome::top_bar(&app.game, best).iter().enumerate() {
            if i >= bar.h as usize {
                break;
            }
            let padded = format!("{:<width$}", line, width = bar.w as usize);
            paint_line(
                out,
                bar.y + i as u16,
                bar.x,
                &unicode::paint(&padded, theme.text, theme.bg, theme.bg, truecolor),
            );
        }
    }
    let trail = app.watchdog.trail.last().map(|s| s.as_str());
    let hint = chrome::hint("playing", app.ticker(), trail);
    let padded = format!("{:<width$}", hint, width = app.layout.hint.w as usize);
    paint_line(
        out,
        app.layout.hint.y,
        app.layout.hint.x,
        &unicode::paint(&padded, theme.dim_text, theme.bg, theme.bg, truecolor),
    );
}

fn tune_name(app: &App) -> &'static str {
    match app.chime.tune() {
        maze_chase_audio::sink::TuneId::Title => "title",
        maze_chase_audio::sink::TuneId::Fright => "fright",
        maze_chase_audio::sink::TuneId::None => "off",
    }
}

/// Plain-text lines for the current full-screen surface.
fn menu_lines(app: &App) -> Vec<String> {
    use maze_chase_terminal::screens::ScreenId;
    let best = app.scores.first().map(|s| s.score);
    match app.screens.current {
        ScreenId::Title => chrome::title(
            app.screens.menu,
            best,
            app.tier().name(),
            &app.watchdog.trail,
        ),
        ScreenId::Help => chrome::help(app.screens.help_scroll),
        ScreenId::Scores => chrome::scores_table(&app.scores),
        ScreenId::Settings => {
            chrome::settings_list(&app.screens.settings_lines(), app.screens.settings_row)
        }
        ScreenId::Rebind => chrome::rebind_list(
            &app.keymap,
            app.screens.rebind_action,
            app.screens.capture,
            app.screens.capture_error.as_deref(),
        ),
        ScreenId::Over => chrome::game_over(
            app.screens.over_score,
            app.screens.over_level,
            app.screens.over_rank,
        ),
        ScreenId::Playing | ScreenId::Paused => vec![],
    }
}

/// Centered panel: pad lines full-width and paint with a highlight for
/// the cursor row is the caller's simplicity: uniform text color here.
fn paint_panel(
    out: &mut String,
    lines: &[String],
    theme: &maze_chase_assets::themes::Theme,
    truecolor: bool,
    cols: usize,
    rows: usize,
    fg: maze_chase_assets::themes::Rgb,
) {
    for (i, line) in chrome::centered(lines, cols, rows).iter().enumerate() {
        let padded = format!("{:<width$}", line, width = cols);
        let color = if line.starts_with("> ") {
            theme.accent
        } else {
            fg
        };
        paint_line(
            out,
            i as u16,
            0,
            &unicode::paint(&padded, color, theme.bg, theme.bg, truecolor),
        );
    }
}

/// Machine-readable session trace for the compatibility harness.
///
/// When `MAZE_CHASE_TRACE` names a file, the binary appends one JSON
/// object per line (`{"kind":...,"ts_ms":...}`): `start` (window,
/// detected cell pixels), `plan` (chosen layout plan), `frame` (bitmap
/// encode cost), and `watchdog` (tier changes). The compat harness
/// (`tools/compat/collect.py`) reads `session/trace.jsonl`. Tracing can
/// never fail a run: an unset or unopenable path disables it, and write
/// errors disable it silently.
struct Trace {
    file: Option<std::fs::File>,
    started: Instant,
}

impl Trace {
    fn from_env() -> Self {
        let file = std::env::var_os("MAZE_CHASE_TRACE").and_then(|p| {
            std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(p)
                .ok()
        });
        Self {
            file,
            started: Instant::now(),
        }
    }

    fn event(&mut self, fields: &str) {
        let Some(file) = self.file.as_mut() else {
            return;
        };
        let ms = self.started.elapsed().as_millis();
        use std::io::Write as _;
        if writeln!(file, "{{\"kind\":{fields},\"ts_ms\":{ms}}}").is_err() || file.flush().is_err()
        {
            self.file = None;
        }
    }

    fn note_start(&mut self, cols: u16, rows: u16) {
        let cell = maze_chase_terminal::geometry::detect_cell_px();
        let (cw, ch) = cell.unwrap_or((
            maze_chase_terminal::geometry::NOMINAL_CELL_W_PX,
            maze_chase_terminal::geometry::NOMINAL_CELL_H_PX,
        ));
        let known = cell.is_some();
        self.event(&format!(
            "\"start\",\"cols\":{cols},\"rows\":{rows},\"cell_w_px\":{cw},\"cell_h_px\":{ch},\"pixels_known\":{known}"
        ));
    }

    fn note_plan(&mut self, layout: &maze_chase_terminal::layout::Layout) {
        let chrome = match layout.chrome {
            maze_chase_terminal::layout::Chrome::Side => "side",
            maze_chase_terminal::layout::Chrome::Band => "band",
            maze_chase_terminal::layout::Chrome::Minimal => "minimal",
        };
        self.event(&format!(
            "\"plan\",\"cols\":{},\"rows\":{},\"cell_cols\":{},\"cell_rows\":{},\"ppt\":{},\"too_small\":{},\"chrome\":\"{chrome}\",\"board_x\":{},\"board_y\":{},\"board_w\":{},\"board_h\":{},\"board_px_w\":{},\"board_px_h\":{},\"img_x\":{},\"img_y\":{},\"img_w\":{},\"img_h\":{}",
            layout.cols,
            layout.rows,
            layout.cell_cols,
            layout.cell_rows,
            layout.ppt(),
            layout.too_small,
            layout.board.x,
            layout.board.y,
            layout.board.w,
            layout.board.h,
            layout.board_px.0,
            layout.board_px.1,
            layout.image.x,
            layout.image.y,
            layout.image.w,
            layout.image.h
        ));
    }

    fn note_watchdog(&mut self, tier: Tier) {
        self.event(&format!("\"watchdog\",\"tier\":\"{}\"", tier.name()));
    }

    fn note_probe(&mut self, protocol: &str, ok: bool, placements: bool, elapsed_ms: u128) {
        self.event(&format!(
            "\"probe\",\"protocol\":\"{protocol}\",\"ok\":{ok},\"placements\":{placements},\"elapsed_ms\":{elapsed_ms}"
        ));
    }

    fn note_sixel_probe(&mut self, ok: bool) {
        self.event(&format!("\"probe\",\"protocol\":\"sixel\",\"ok\":{ok}"));
    }

    fn note_frame(
        &mut self,
        seq: u64,
        bytes: usize,
        ppt: u32,
        encode_ms: u128,
        stats: &FrameStats,
    ) {
        self.event(&format!(
            "\"frame\",\"seq\":{seq},\"bytes\":{bytes},\"ppt\":{ppt},\"encode_ms\":{encode_ms},\"mode\":\"{}\",\"placements\":{},\"static\":{},\"atlas\":{}",
            stats.mode, stats.placements, stats.static_resend, stats.atlas_resend
        ));
    }

    fn note_skip(&mut self, reason: &str) {
        self.event(&format!("\"skip\",\"reason\":\"{reason}\""));
    }
}

fn main() {
    let mut tier_override: Option<String> = None;
    let mut dir = config_dir();
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--help" | "-h" => {
                println!("{}", usage());
                return;
            }
            "--version" | "-V" => {
                println!("maze-chase-terminal {VERSION}");
                return;
            }
            "--tier" => match args.next() {
                Some(v) => {
                    tier_override = Some(v);
                }
                None => {
                    eprintln!("missing value for --tier\n{}", usage());
                    std::process::exit(2);
                }
            },
            "--dir" => match args.next() {
                Some(d) => {
                    dir = d.into();
                }
                None => {
                    eprintln!("missing value for --dir\n{}", usage());
                    std::process::exit(2);
                }
            },
            other => {
                eprintln!("unknown argument: {other}\n{}", usage());
                std::process::exit(2);
            }
        }
    }

    let mut env: Vec<(String, String)> = std::env::vars().collect();
    if let Some(t) = tier_override {
        // The explicit flag is the highest-precedence tier source:
        // replace any exported MAZE_CHASE_TIER so the first-match env
        // lookup can never read the ambient value instead (issue #615).
        env.retain(|(k, _)| k != "MAZE_CHASE_TIER");
        env.push(("MAZE_CHASE_TIER".to_string(), t));
    }
    let (cols, rows) = crossterm::terminal::size().unwrap_or((80, 24));
    let mut app = App::new(cols, rows, &env, dir);

    let mut term = match Terminal::new(app.tier() == Tier::Kitty) {
        Ok(t) => t,
        Err(e) => {
            eprintln!("maze-chase-terminal: cannot take over the terminal ({e})");
            eprintln!("Run inside a real terminal (not a pipe). --help for options.");
            std::process::exit(1);
        }
    };

    // Live capability probes on auto-detect runs. Kitty graphics is
    // probed first (this is what enables Ghostty and any terminal that
    // speaks the protocol without an identifying environment); Sixel's
    // DA1 probe runs only when graphics did not answer. Both are
    // bounded, and every key either probe reads is replayed into the
    // game loop below, never swallowed.
    let forced = env.iter().any(|(k, _)| k == "MAZE_CHASE_TIER");
    let mut replay: Vec<crossterm::event::KeyEvent> = Vec::new();
    let mut kitty_placements = true;
    let mut kitty_probe = None;
    let mut sixel_probe = None;
    if !forced && app.tier() != Tier::Kitty {
        let probe = probe_kitty_live();
        replay.extend(input::keys_from_captured_bytes(&probe.typed));
        if let Some(support) = probe.support {
            app.watchdog.note_kitty_probe_ok();
            kitty_placements = support.placements;
            term.set_kitty_keyboard(true);
        }
        kitty_probe = Some(probe);
    }
    if !forced && matches!(app.tier(), Tier::Truecolor | Tier::Legacy) {
        let probe = probe_sixel_live();
        replay.extend(input::keys_from_captured_bytes(&probe.typed));
        if probe.sixel {
            app.watchdog.note_sixel_probe_ok();
        }
        sixel_probe = Some(probe);
    }

    let mut last = Instant::now();
    let mut out = String::new();
    let mut fresh = true;
    let mut last_tier = app.tier();
    let mut last_plan = app.layout;
    let mut frame_seq: u64 = 0;
    let mut trace = Trace::from_env();
    trace.note_start(app.layout.cols, app.layout.rows);
    trace.note_plan(&app.layout);
    if let Some(probe) = &kitty_probe {
        trace.note_probe(
            "kitty",
            probe.support.is_some(),
            probe.support.is_some_and(|s| s.placements),
            probe.elapsed.as_millis(),
        );
    }
    if let Some(probe) = &sixel_probe {
        trace.note_sixel_probe(probe.sixel);
    }
    let mut kitty = KittyRenderer::new(kitty_placements);
    let mut pacer = Pacer::for_tier(app.tier());
    let mut last_key = 0u64;
    let mut last_screen = app.screens.current;
    let mut last_drawn = Instant::now();
    // Set when the session leaves the Kitty tier; the release escapes are
    // prepended to the next frame that actually reaches the screen and stay
    // pending across failed writes (the failed frame never arrived, and
    // `last_tier` has already moved on so re-entering the tier-change block
    // cannot re-arm them).
    let mut left_kitty = false;
    loop {
        if app.quit {
            break;
        }
        if app.tier() != last_tier {
            // Tier change (watchdog downgrade or probe upgrade): rebuild
            // the bitmap image from scratch and, when leaving Kitty,
            // release the old board and sprites. The terminal never
            // erases placements on its own, and render_frame's Kitty
            // cleanups only run while the new tier is Kitty, so without
            // the release the old graphics would stay composited above
            // the Sixel/cell fallback.
            let previous = last_tier;
            last_tier = app.tier();
            fresh = true;
            if previous == Tier::Kitty {
                left_kitty = true;
            }
            kitty.invalidate();
            pacer = Pacer::for_tier(last_tier);
            term.set_kitty_keyboard(last_tier == Tier::Kitty);
            trace.note_watchdog(last_tier);
        }
        let now = Instant::now();
        let dt = (now - last).as_secs_f64().clamp(0.0, 0.25);
        last = now;
        // Poll for input; the pacer below decides when a frame is due.
        if event::poll(Duration::from_millis(16)).unwrap_or(false) {
            match event::read() {
                Ok(TermEvent::Key(key)) => app.on_key(key),
                Ok(TermEvent::Resize(c, r)) => app.resize(c, r),
                _ => {}
            }
        }
        // Self-healing resize: never trust the Resize event alone (a
        // SIGWINCH batched with a key is dropped by the event source).
        reconcile_size(&mut app);
        // Plan change (size or real cell pixels): the next frame clears
        // every surface and deletes stale image placements before it
        // repaints (issue #674).
        if app.layout != last_plan {
            last_plan = app.layout;
            fresh = true;
            kitty.invalidate();
            trace.note_plan(&app.layout);
        }
        if app.screens.current != last_screen {
            // Menus never erase the graphics layer on their own; a
            // transition must delete the board before the new surface
            // paints (RT: the image used to linger behind Title).
            last_screen = app.screens.current;
            fresh = true;
            kitty.invalidate();
        }
        app.tick(dt.max(1.0 / 240.0));
        let key = frame_key(&app);
        let rate_due = pacer.due(Instant::now());
        // Idle surfaces are static, but a once-a-second keepalive repaint
        // heals any externally disturbed cells and keeps the PTY stream
        // observable without the old per-frame churn.
        let idle_refresh = last_drawn.elapsed() >= Duration::from_secs(1);
        let due = fresh
            || (rate_due
                && (key != last_key || app.screens.current == ScreenId::Playing || idle_refresh));
        if rate_due && !due && pacer.should_log_skip(Instant::now()) {
            trace.note_skip("unchanged");
        }
        if due {
            let encode_start = Instant::now();
            let stats = compose_frame(&mut app, &mut out, fresh, &mut kitty, left_kitty);
            let bytes = out.len();
            let mut stdout = std::io::stdout();
            let wrote = stdout
                .write_all(out.as_bytes())
                .and_then(|_| stdout.flush());
            let took = encode_start.elapsed();
            if wrote.is_err() {
                app.watchdog.note_error("frame write failed");
                if app.watchdog.tier() == Tier::Legacy {
                    break;
                }
                // The failed frame never reached the screen: keep
                // `fresh` set so the next frame redoes the cleanup.
            } else {
                fresh = false;
                left_kitty = false;
                last_key = key;
                last_drawn = Instant::now();
                app.watchdog.note_ok();
                if matches!(app.tier(), Tier::Kitty | Tier::Sixel) {
                    trace.note_frame(frame_seq, bytes, app.layout.ppt(), took.as_millis(), &stats);
                }
                pacer.note_write(took, bytes, Instant::now());
            }
            frame_seq += 1;
        }
        // Replay the startup keystrokes the probes captured, but only
        // after the first frame is on screen: the player saw the title
        // they were typing at, and the key acts on it instead of being
        // swallowed by the probe window.
        if !replay.is_empty() {
            for key in std::mem::take(&mut replay) {
                if app.quit {
                    break;
                }
                app.on_key(key);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(unix)]
    fn pipe_pair() -> (std::fs::File, std::fs::File) {
        use std::os::fd::FromRawFd;
        let mut fds = [0i32; 2];
        assert_eq!(unsafe { libc::pipe(fds.as_mut_ptr()) }, 0, "pipe failed");
        unsafe {
            (
                std::fs::File::from(std::os::fd::OwnedFd::from_raw_fd(fds[0])),
                std::fs::File::from(std::os::fd::OwnedFd::from_raw_fd(fds[1])),
            )
        }
    }

    #[cfg(unix)]
    #[test]
    fn probe_reply_assembles_fragmented_da1_reply() {
        use std::io::Write;
        use std::os::fd::AsRawFd;
        let (reader, mut writer) = pipe_pair();
        // Fragment one is queued synchronously; this test proves fragmented
        // assembly, not budget precision, so the completion gets a generous
        // budget (loaded runners have seen short sleeps stretch past 250 ms).
        writer.write_all(b"\x1b[?6").unwrap();
        writer.flush().unwrap();
        let sender = std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(40));
            writer.write_all(b"2;4c").unwrap();
        });
        let (reply, typed) =
            read_probe_reply_fd(reader.as_raw_fd(), ReplyKind::Da1, Duration::from_secs(5));
        sender.join().unwrap();
        assert_eq!(reply, b"\x1b[?62;4c");
        assert!(typed.is_empty(), "no user input arrived in this window");
        assert!(sixel::probe_ok(&String::from_utf8_lossy(&reply)));
    }

    #[cfg(unix)]
    #[test]
    fn probe_keeps_typed_bytes_that_precede_the_reply() {
        use std::io::Write;
        use std::os::fd::AsRawFd;
        let (reader, mut writer) = pipe_pair();
        writer.write_all(b"\r").unwrap();
        writer.flush().unwrap();
        let sender = std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(20));
            writer.write_all(b"\x1b[?62;4c").unwrap();
        });
        let (reply, typed) = read_probe_reply_fd(
            reader.as_raw_fd(),
            ReplyKind::Da1,
            Duration::from_millis(250),
        );
        sender.join().unwrap();
        assert_eq!(reply, b"\x1b[?62;4c");
        assert_eq!(typed, b"\r", "the Enter must be replayed, not consumed");
        assert!(sixel::probe_ok(&String::from_utf8_lossy(&reply)));
    }

    #[cfg(unix)]
    #[test]
    fn probe_timeout_is_bounded_and_leaves_input_intact() {
        use std::io::{Read, Write};
        use std::os::fd::AsRawFd;
        let (mut reader, mut writer) = pipe_pair();
        let started = Instant::now();
        let (reply, typed) = read_probe_reply_fd(
            reader.as_raw_fd(),
            ReplyKind::Da1,
            Duration::from_millis(80),
        );
        let elapsed = started.elapsed();
        assert!(reply.is_empty(), "silent terminal must yield no reply");
        assert!(typed.is_empty(), "nothing was typed during the window");
        assert!(
            elapsed >= Duration::from_millis(60),
            "returned before the budget: {elapsed:?}"
        );
        assert!(
            elapsed < Duration::from_millis(800),
            "waited past the budget: {elapsed:?}"
        );
        // The old orphan thread consumed the next user key; the bounded
        // probe must leave everything typed after its deadline untouched.
        writer.write_all(b"\r").unwrap();
        writer.flush().unwrap();
        let mut buf = [0u8; 1];
        assert_eq!(reader.read(&mut buf).unwrap(), 1, "key must survive");
        assert_eq!(buf[0], b'\r');
    }

    #[cfg(unix)]
    #[test]
    fn da1_reply_completion_ignores_plain_keys() {
        assert!(!da1_reply_complete(b"\r"));
        assert!(!da1_reply_complete(b"\x1b[?62;4"));
        assert!(!da1_reply_complete(b"\x1b[?"));
        assert!(da1_reply_complete(b"\x1b[?62;4c"));
        assert!(da1_reply_complete(b"typed\x1b[?1;2c"));
    }

    #[test]
    fn split_da1_reply_keeps_every_non_reply_byte() {
        let (reply, typed) = split_da1_reply(b"\r\x1b[?62;4c4");
        assert_eq!(reply, b"\x1b[?62;4c");
        assert_eq!(typed, b"\r4");
        let (reply, typed) = split_da1_reply(b"4");
        assert!(reply.is_empty());
        assert_eq!(typed, b"4");
        let (reply, typed) = split_da1_reply(b"\x1b[A");
        assert!(reply.is_empty());
        assert_eq!(typed, b"\x1b[A");
        let (reply, typed) = split_da1_reply(b"\x1b[?6");
        assert!(reply.is_empty());
        assert_eq!(typed, b"\x1b[?6");
    }

    #[test]
    fn kitty_probe_requires_two_replies_and_reframes_them() {
        // Transmit plus placement, both OK: graphics and placement proven.
        let both_ok = b"\x1b_Gi=1;OK\x1b\\\x1b_Gi=1,p=1;OK\x1b\\";
        assert_eq!(
            kitty_probe_support(both_ok),
            Some(KittySupport { placements: true })
        );
        // Placement rejected: graphics proven, placements degraded.
        assert_eq!(
            kitty_probe_support(b"\x1b_Gi=1;OK\x1b\\\x1b_Gi=1,p=1;ENOTSUP\x1b\\"),
            Some(KittySupport { placements: false })
        );
        // Only the transmit reply arrived: the placement verdict has no
        // evidence and must read as unsupported, not guessed.
        assert_eq!(
            kitty_probe_support(b"\x1b_Gi=1;OK\x1b\\"),
            Some(KittySupport { placements: false })
        );
        // Transmit rejected or silent: not a kitty terminal.
        assert_eq!(kitty_probe_support(b"\x1b_Gi=1;ENOENT\x1b\\"), None);
        assert_eq!(kitty_probe_support(b""), None);
        // The split re-frames every reply so the caller can re-parse
        // them, and typed keys around them survive untouched.
        let mut combined = Vec::new();
        combined.extend_from_slice(b"\r");
        combined.extend_from_slice(both_ok);
        combined.extend_from_slice(b"x");
        let (reply, typed) = ReplyKind::Kitty.split(&combined);
        assert_eq!(reply, both_ok);
        assert_eq!(typed, b"\rx");
    }

    #[test]
    fn kitty_probe_completion_needs_both_replies() {
        // The old probe stopped at the first reply, so the placement
        // verdict was always computed from a truncated capture.
        assert!(!ReplyKind::Kitty.complete(b"\x1b_Gi=1;OK\x1b\\"));
        assert!(!ReplyKind::Kitty.complete(b"\x1b_Gi=1;OK\x1b\\\x1b_Gi=1,p=1;OK"));
        assert!(ReplyKind::Kitty.complete(b"\x1b_Gi=1;OK\x1b\\\x1b_Gi=1,p=1;OK\x1b\\"));
    }

    #[test]
    fn leaving_kitty_prepends_the_release_to_the_next_frame() {
        use maze_chase_terminal::kitty;
        let mut app = App::new(80, 24, &[], std::path::PathBuf::from("."));
        let mut kitty_renderer = KittyRenderer::new(true);
        let trio = format!(
            "{}{}{}",
            kitty::delete_all_escape(),
            kitty::free_image_escape(kitty::STATIC_IMAGE_ID),
            kitty::free_image_escape(kitty::ATLAS_IMAGE_ID),
        );
        let mut leaving = String::new();
        let _ = compose_frame(&mut app, &mut leaving, true, &mut kitty_renderer, true);
        assert!(
            leaving.starts_with(&trio),
            "the release must lead the first frame after leaving Kitty"
        );
        assert!(
            leaving.contains("\x1b[?2026h"),
            "the frame surface still renders after the release"
        );
        let mut staying = String::new();
        let _ = compose_frame(&mut app, &mut staying, true, &mut kitty_renderer, false);
        assert!(
            staying.starts_with("\x1b[?2026h"),
            "no release bytes when the session never left Kitty"
        );
        assert!(!staying.starts_with(&trio));
    }

    #[cfg(unix)]
    #[test]
    fn kitty_probe_pipe_captures_fragmented_two_reply_round_trip() {
        use std::io::Write;
        use std::os::fd::AsRawFd;
        let (reader, mut writer) = pipe_pair();
        writer.write_all(b"\x1b_Gi=1;OK").unwrap();
        writer.flush().unwrap();
        let sender = std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(30));
            writer.write_all(b"\x1b\\\x1b_Gi=1,p=1;OK\x1b\\").unwrap();
        });
        let (reply, typed) =
            read_probe_reply_fd(reader.as_raw_fd(), ReplyKind::Kitty, Duration::from_secs(5));
        sender.join().unwrap();
        assert_eq!(
            kitty_probe_support(&reply),
            Some(KittySupport { placements: true }),
            "both fragmented replies must assemble: {reply:?}"
        );
        assert!(typed.is_empty());
    }
}
