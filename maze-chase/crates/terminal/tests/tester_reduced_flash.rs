//! Tester round-9 contract: every brightness-bearing renderer call site is
//! gated by the shared `Fx` accessibility flags, and a 180-frame fright
//! window is pixel-stable under reduced flash and reduced motion.

use std::path::{Path, PathBuf};

use maze_chase_assets::anim::Fx;
use maze_chase_assets::themes::{Rgb, DUSK_POND};
use maze_chase_engine::game::Game;
use maze_chase_engine::tuning;
use maze_chase_terminal::raster;

const FRAMES: usize = 180;
const BRIGHT: f32 = 0.85;
const MAX_REDUCED_DELTA: u8 = 8;

/// Renderer files whose animation call sites are part of the registry.
const RENDER_FILES: &[&str] = &[
    "src/raster.rs",
    "src/atlas.rs",
    "src/unicode.rs",
    "../desktop/src/render.rs",
    "../web/src/video.rs",
];

/// `anim::` helpers whose output changes on screen brightness or position.
/// Every listed helper must appear at least once, and every occurrence must
/// sit in a function that consults the required accessibility token.
const ANIM_CALLS: &[(&str, &[&str])] = &[
    ("sunseed_halo", &["flash"]),
    ("relish_bob", &["reduced_motion"]),
    ("fright_mask_id", &["f32::INFINITY"]),
    ("death_frame_for", &["opts.flash", "flash", "reduced_flash"]),
    ("level_clear_sweep", &["opts.flash", "flash"]),
    (
        "level_clear_banner_on",
        &["opts.flash", "flash", "reduced_motion"],
    ),
];

/// `Effects` frame selectors. A call without its gate is a reduced-flash or
/// reduced-motion leak.
const FX_CALLS: &[(&str, &[&str])] = &[
    ("pickup_burst", &["opts.flash", "flash"]),
    ("turn_spark", &["reduced_motion"]),
    ("lily_frame", &["opts.flash", "flash"]),
    ("chomp_phase", &["reduced_motion"]),
    ("hop_frame", &["reduced_motion"]),
    ("floaters", &["reduced_motion"]),
];

/// Steady (non-frame) helpers that are allowed outside the registry.
const ALLOWED_ANIM: &[&str] = &["Fx", "fright_bar_segments"];
const ALLOWED_FX: &[&str] = &["lily_live"];

fn repo_path(relative: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join(relative)
}

fn read(relative: &str) -> String {
    let path = repo_path(relative);
    std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("cannot read {}: {e}", path.display()))
}

/// Test modules contain fixtures that deliberately exercise every option
/// shape; only production code is part of the shipped renderer.
fn production(source: &str) -> &str {
    match source.find("#[cfg(test)]") {
        Some(at) => &source[..at],
        None => source,
    }
}

/// Function that encloses byte `index`, from its signature line through its
/// closing top-level brace.
fn enclosing_fn(source: &str, index: usize) -> &str {
    let mut start = 0;
    let mut offset = 0;
    for line in source.split_inclusive('\n') {
        if offset > index {
            break;
        }
        let trimmed = line.trim_start();
        if trimmed.starts_with("fn ") || trimmed.starts_with("pub fn ") {
            start = offset;
        }
        offset += line.len();
    }
    let end = source[start..]
        .find("\n}\n")
        .map(|at| start + at + 1)
        .unwrap_or(source.len());
    &source[start..end]
}

fn called_names(source: &str, prefix: &str) -> Vec<String> {
    let mut names = Vec::new();
    for (index, _) in source.match_indices(prefix) {
        let rest = &source[index + prefix.len()..];
        let name: String = rest
            .chars()
            .take_while(|c| c.is_ascii_alphanumeric() || *c == '_')
            .collect();
        if !name.is_empty() {
            names.push(name);
        }
    }
    names
}

#[test]
fn every_renderer_animation_call_is_accessibility_gated() {
    let mut sources = Vec::new();
    for relative in RENDER_FILES {
        let text = read(relative);
        sources.push((*relative, production(&text).to_string()));
    }

    for (name, gates) in ANIM_CALLS {
        let needle = format!("anim::{name}(");
        let mut seen = 0;
        for (relative, source) in &sources {
            for (index, _) in source.match_indices(&needle) {
                seen += 1;
                let body = enclosing_fn(source, index);
                assert!(
                    gates.iter().any(|gate| body.contains(gate)),
                    "{relative}: {needle} at byte {index} is not gated by any of {gates:?}:\n{body}"
                );
            }
        }
        assert!(seen > 0, "registry entry {needle} has no call site");
    }
    for (name, gates) in FX_CALLS {
        let needle = format!(".fx.{name}(");
        let mut seen = 0;
        for (relative, source) in &sources {
            for (index, _) in source.match_indices(&needle) {
                seen += 1;
                let body = enclosing_fn(source, index);
                assert!(
                    gates.iter().any(|gate| body.contains(gate)),
                    "{relative}: {needle} at byte {index} is not gated by any of {gates:?}:\n{body}"
                );
            }
        }
        assert!(seen > 0, "registry entry {needle} has no call site");
    }

    for (relative, source) in &sources {
        for name in called_names(source, "anim::") {
            assert!(
                ALLOWED_ANIM.contains(&name.as_str())
                    || ANIM_CALLS.iter().any(|(known, _)| *known == name),
                "{relative}: unregistered brightness helper anim::{name}"
            );
        }
        for name in called_names(source, ".fx.") {
            assert!(
                ALLOWED_FX.contains(&name.as_str())
                    || FX_CALLS.iter().any(|(known, _)| *known == name),
                "{relative}: unregistered animation selector .fx.{name}"
            );
        }
    }
}

#[test]
fn attract_board_passes_the_live_accessibility_flags() {
    let app_source = read("../desktop/src/app.rs");
    let app = production(&app_source);
    assert!(
        app.contains("!self.settings.reduced_flash"),
        "title attract board must pass the reduced-flash setting"
    );
    assert!(
        app.contains("self.settings.reduced_motion"),
        "title attract board must pass the reduced-motion setting"
    );
    let render_source = read("../desktop/src/render.rs");
    let render = production(&render_source);
    assert!(
        render.contains("anim::Fx::dimmed(flash, reduced_motion, dim, dim)"),
        "render_attract must forward its flags into the shared Fx"
    );
    assert!(
        render.contains("pub fn render_attract(")
            && render.contains("flash: bool,")
            && render.contains("reduced_motion: bool,"),
        "render_attract must accept the accessibility flags"
    );
}

fn luminance(c: Rgb) -> f32 {
    fn linear(channel: u8) -> f32 {
        let c = channel as f32 / 255.0;
        if c <= 0.03928 {
            c / 12.92
        } else {
            ((c + 0.055) / 1.055).powf(2.4)
        }
    }
    0.2126 * linear(c.0) + 0.7152 * linear(c.1) + 0.0722 * linear(c.2)
}

fn fixture() -> Game {
    let mut game = Game::new(0xC0FFEE, 1);
    game.relish.active = false;
    game.wardens.start_fright(6.0);
    game.wardens.fright_t = 1.5;
    game
}

fn advance(game: &mut Game) {
    game.tick_count += 1;
    game.fx.advance(tuning::STEP);
    game.wardens.fright_t = (game.wardens.fright_t - tuning::STEP).max(0.0);
}

fn max_channel_delta(a: &raster::PixelFrame, b: &raster::PixelFrame) -> u8 {
    a.px.iter()
        .zip(&b.px)
        .map(|(x, y)| {
            (x.0 as i16 - y.0 as i16)
                .abs()
                .max((x.1 as i16 - y.1 as i16).abs())
                .max((x.2 as i16 - y.2 as i16).abs()) as u8
        })
        .max()
        .unwrap_or(0)
}

fn assert_reduced_window(opts: Fx, label: &str) {
    let theme = &DUSK_POND;
    let mut game = fixture();
    let mut previous: Option<raster::PixelFrame> = None;
    for frame in 0..FRAMES {
        let rendered = raster::render_opts(&game, theme, raster::DEFAULT_PPT, opts);
        for (index, pixel) in rendered.px.iter().enumerate() {
            if luminance(*pixel) > BRIGHT {
                assert!(
                    *pixel == theme.eyes || *pixel == theme.text,
                    "{label}: frame {frame} pixel {index} is an unlisted bright colour {:?}",
                    pixel
                );
            }
        }
        if let Some(previous) = &previous {
            let delta = max_channel_delta(previous, &rendered);
            assert!(
                delta <= MAX_REDUCED_DELTA,
                "{label}: frame {frame} changed by {delta} (> {MAX_REDUCED_DELTA})"
            );
        }
        previous = Some(rendered);
        advance(&mut game);
    }
}

#[test]
fn reduced_flash_and_motion_hold_a_stable_bright_window() {
    assert_reduced_window(Fx::new(false, false), "reduced flash");
    assert_reduced_window(Fx::new(true, true), "reduced motion");
}

#[test]
fn the_same_window_flashes_without_reduced_options() {
    let mut game = fixture();
    let mut previous: Option<raster::PixelFrame> = None;
    let mut saw_change = false;
    for _ in 0..FRAMES {
        let rendered =
            raster::render_opts(&game, &DUSK_POND, raster::DEFAULT_PPT, Fx::new(true, false));
        if let Some(previous) = &previous {
            saw_change |= max_channel_delta(previous, &rendered) > MAX_REDUCED_DELTA;
        }
        previous = Some(rendered);
        advance(&mut game);
    }
    assert!(
        saw_change,
        "the fixture must flash with default options, or the reduced test proves nothing"
    );
}
