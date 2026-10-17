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
        enable_raw_mode()?;
        let mut out = std::io::stdout();
        execute!(out, EnterAlternateScreen)?;
        execute!(out, crossterm::cursor::Hide)?;
        if kitty_keyboard {
            let _ = execute!(
                out,
                crossterm::event::PushKeyboardEnhancementFlags(
                    KeyboardEnhancementFlags::DISAMBIGUATE_ESCAPE_CODES
                )
            );
        }
        Ok(Self { kitty_keyboard })
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

/// Outcome of the live Sixel probe: whether the terminal positively
/// announced Sixel, plus every user keystroke the probe read while
/// waiting. Captured keys are replayed into the game loop (never
/// dropped), so the probe window can never swallow the first keypress.
struct ProbeOutcome {
    sixel: bool,
    typed: Vec<u8>,
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
    let (reply, typed) = read_probe_reply(Duration::from_millis(250));
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

/// Read stdin until a complete DA1 reply lands or `timeout` elapses,
/// reading only when bytes are ready (Unix: `poll`; Windows: a waitable
/// console handle). Returns `(reply, typed)`: the framed DA1 reply, if
/// any, plus every other byte read (user keystrokes), never dropped.
#[cfg(unix)]
fn read_probe_reply(timeout: Duration) -> (Vec<u8>, Vec<u8>) {
    use std::os::fd::AsRawFd;
    read_probe_reply_fd(std::io::stdin().as_raw_fd(), timeout)
}

/// [`read_probe_reply`] for an arbitrary fd (the pipe-based tests drive
/// this directly).
#[cfg(unix)]
fn read_probe_reply_fd(fd: std::os::fd::RawFd, timeout: Duration) -> (Vec<u8>, Vec<u8>) {
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
        if da1_reply_complete(&captured) {
            break;
        }
    }
    split_da1_reply(&captured)
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
fn read_probe_reply(timeout: Duration) -> (Vec<u8>, Vec<u8>) {
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
        if da1_reply_complete(&captured) {
            break;
        }
    }
    split_da1_reply(&captured)
}

/// No portable bounded console read elsewhere: stay on the cell tier
/// rather than leave a blocked reader behind.
#[cfg(not(any(unix, windows)))]
fn read_probe_reply(_timeout: Duration) -> (Vec<u8>, Vec<u8>) {
    (Vec::new(), Vec::new())
}

fn paint_line(out: &mut String, row: u16, col: u16, text: &str) {
    out.push_str(&format!("\x1b[{};{}H{}", row + 1, col + 1, text));
}

/// Render one full frame into `out` (caller flushes).
/// `bitmap_fresh` forces a fresh bitmap image (first frame after a
/// resize or tier change); otherwise the live image id is reused after
/// deleting the previous placement.
fn render_frame(app: &mut App, out: &mut String, bitmap_fresh: bool) {
    use maze_chase_terminal::screens::ScreenId;
    let theme = app.theme();
    let truecolor = matches!(app.tier(), Tier::Kitty | Tier::Sixel | Tier::Truecolor);
    let cols = app.layout.cols as usize;
    let rows = app.layout.rows as usize;
    // Synchronized output: tear-free frames where supported, harmless
    // plain text where not.
    out.push_str("\x1b[?2026h");
    out.push_str("\x1b[H");
    if app.layout.too_small {
        for (i, line) in chrome::too_small_card(
            app.layout.cols,
            app.layout.rows,
            maze_chase_terminal::layout::MIN_COLS,
            maze_chase_terminal::layout::MIN_ROWS,
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
        return;
    }
    let bitmap = matches!(app.tier(), Tier::Kitty | Tier::Sixel);
    match app.screens.current {
        ScreenId::Playing | ScreenId::Paused => {
            if bitmap {
                // Board as pixels at the board origin; chrome stays cells.
                // The board band is cleared first so the pixel image (whose
                // cell footprint varies by terminal) never leaves stale
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
                paint_line(out, b.y, b.x, "");
                if app.tier() == Tier::Kitty {
                    if !bitmap_fresh {
                        out.push_str(&maze_chase_terminal::kitty::delete_escape(1));
                    }
                    let png = app.bitmap_png();
                    out.push_str(&maze_chase_terminal::kitty::display_escape_id(
                        &png,
                        b.h as u32,
                        b.w as u32,
                        Some(1),
                    ));
                } else {
                    let frame = maze_chase_terminal::raster::render(
                        &app.game,
                        theme,
                        maze_chase_terminal::raster::DEFAULT_PPT,
                        app.frame_no,
                        !app.settings.reduced_flash,
                    );
                    out.push_str(&sixel::encode(&frame, 64));
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
            // Full-screen surfaces.
            let lines = menu_lines(app);
            paint_panel(out, &lines, theme, truecolor, cols, rows, theme.text);
        }
    }
    // Audible BELs (capped per drain inside the sink).
    out.push_str(&app.chime.take_bells());
    out.push_str("\x1b[?2026l");
}

/// HUD chrome for the playing surface.
fn paint_chrome(app: &App, out: &mut String, truecolor: bool, cols: usize, _rows: usize) {
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
            let padded = format!("{:<width$}", line, width = cols);
            paint_line(
                out,
                bar.y + i as u16,
                0,
                &unicode::paint(&padded, theme.text, theme.bg, theme.bg, truecolor),
            );
        }
    }
    let trail = app.watchdog.trail.last().map(|s| s.as_str());
    let hint = chrome::hint("playing", app.ticker(), trail);
    let padded = format!("{:<width$}", hint, width = cols);
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
        env.push(("MAZE_CHASE_TIER".to_string(), t));
    }
    let (cols, rows) = crossterm::terminal::size().unwrap_or((80, 24));
    let mut app = App::new(cols, rows, &env, dir);

    let term = match Terminal::new(app.tier() == Tier::Kitty) {
        Ok(t) => t,
        Err(e) => {
            eprintln!("maze-chase-terminal: cannot take over the terminal ({e})");
            eprintln!("Run inside a real terminal (not a pipe). --help for options.");
            std::process::exit(1);
        }
    };
    let _guard = term;

    // Live Sixel probe on cell tiers (skipped when the tier is forced or
    // already bitmap): a silent terminal costs 250 ms once, then cells.
    // Keystrokes the probe reads while waiting are decoded here and
    // replayed into the game loop below, never swallowed.
    let forced = env.iter().any(|(k, _)| k == "MAZE_CHASE_TIER");
    let mut replay: Vec<crossterm::event::KeyEvent> = Vec::new();
    if !forced && matches!(app.tier(), Tier::Truecolor | Tier::Legacy) {
        let probe = probe_sixel_live();
        if probe.sixel {
            app.watchdog.note_sixel_probe_ok();
        }
        replay = input::keys_from_captured_bytes(&probe.typed);
    }

    let mut last = Instant::now();
    let mut out = String::new();
    let mut bitmap_tick: u64 = 0;
    let mut bitmap_fresh = true;
    let mut last_tier = app.tier();
    loop {
        if app.quit {
            break;
        }
        if app.tier() != last_tier {
            // Tier change (watchdog downgrade or probe upgrade): clear
            // the screen and rebuild the bitmap image from scratch.
            last_tier = app.tier();
            bitmap_fresh = true;
            out.clear();
            out.push_str("\x1b[2J");
        }
        let now = Instant::now();
        let dt = (now - last).as_secs_f64().clamp(0.0, 0.25);
        last = now;
        // Poll for input; render at up to ~60 fps.
        if event::poll(Duration::from_millis(16)).unwrap_or(false) {
            match event::read() {
                Ok(TermEvent::Key(key)) => app.on_key(key),
                Ok(TermEvent::Resize(c, r)) => {
                    app.resize(c, r);
                    bitmap_fresh = true;
                }
                _ => {}
            }
        }
        app.tick(dt.max(1.0 / 240.0));
        // Bitmap tiers repaint pixels at ~20 fps (encode cost); cell
        // tiers repaint text every frame.
        let is_bitmap = matches!(app.tier(), Tier::Kitty | Tier::Sixel);
        bitmap_tick += 1;
        if !is_bitmap || bitmap_tick % 3 == 1 {
            out.clear();
            if is_bitmap && app.tier() != last_tier {
                last_tier = app.tier();
                bitmap_fresh = true;
            }
            render_frame(&mut app, &mut out, bitmap_fresh);
            bitmap_fresh = false;
            let mut stdout = std::io::stdout();
            if stdout.write_all(out.as_bytes()).is_err() || stdout.flush().is_err() {
                app.watchdog.note_error("frame write failed");
                if app.watchdog.tier() == Tier::Legacy {
                    break;
                }
            } else {
                app.watchdog.note_ok();
            }
        }
        // Replay the startup keystrokes the probe captured, but only
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
        let (reply, typed) = read_probe_reply_fd(reader.as_raw_fd(), Duration::from_secs(5));
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
        let (reply, typed) = read_probe_reply_fd(reader.as_raw_fd(), Duration::from_millis(250));
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
        let (reply, typed) = read_probe_reply_fd(reader.as_raw_fd(), Duration::from_millis(80));
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
}
