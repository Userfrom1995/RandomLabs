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
use maze_chase_terminal::{chrome, sixel, unicode};
use std::io::{IsTerminal, Read, Write};
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

/// Live Sixel probe: asks the terminal (DA1) and waits up to 250 ms for
/// the reply on a helper thread, so a silent terminal costs a quarter
/// second once at startup and never blocks the game. Returns true only
/// when the reply positively announces Sixel.
fn probe_sixel_live() -> bool {
    use std::sync::mpsc;
    if !std::io::stdin().is_terminal() {
        return false;
    }
    {
        let mut out = std::io::stdout();
        let _ = out.write_all(sixel::probe_request().as_bytes());
        let _ = out.flush();
    }
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let mut buf = [0u8; 64];
        // One blocking read: the DA reply arrives as a single burst.
        let n = std::io::stdin().read(&mut buf).unwrap_or(0);
        let _ = tx.send(buf[..n].to_vec());
    });
    match rx.recv_timeout(Duration::from_millis(250)) {
        Ok(bytes) => sixel::probe_ok(&String::from_utf8_lossy(&bytes)),
        Err(_) => false,
    }
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
    let forced = env.iter().any(|(k, _)| k == "MAZE_CHASE_TIER");
    if !forced && matches!(app.tier(), Tier::Truecolor | Tier::Legacy) && probe_sixel_live() {
        app.watchdog.note_sixel_probe_ok();
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
    }
}
