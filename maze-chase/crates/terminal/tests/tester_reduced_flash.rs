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

/// Local call context: up to 60 lines before and 15 lines after the call,
/// clamped to the enclosing function body. The signature is excluded so a
/// parameter named `reduced_flash` cannot satisfy the gate on its own, while
/// a helper derived earlier in the function (the `flash_t_left` INFINITY
/// sentinel) stays inside the window.
fn call_context(source: &str, index: usize) -> &str {
    let mut fn_start = 0;
    let mut offset = 0;
    for line in source.split_inclusive('\n') {
        if offset > index {
            break;
        }
        let trimmed = line.trim_start();
        if trimmed.starts_with("fn ") || trimmed.starts_with("pub fn ") {
            fn_start = offset;
        }
        offset += line.len();
    }
    let body_start = source[fn_start..]
        .find('{')
        .map(|at| fn_start + at + 1)
        .unwrap_or(fn_start);
    let line_start = source[..index].rfind('\n').map(|at| at + 1).unwrap_or(0);
    let mut ctx_start = line_start.max(body_start);
    for _ in 0..60 {
        if ctx_start <= body_start {
            break;
        }
        let search_end = ctx_start.saturating_sub(1).max(body_start);
        match source[body_start..search_end].rfind('\n') {
            Some(at) => ctx_start = body_start + at + 1,
            None => {
                ctx_start = body_start;
                break;
            }
        }
    }
    let mut ctx_end = index;
    for _ in 0..15 {
        match source[ctx_end..].find('\n') {
            Some(at) => ctx_end += at + 1,
            None => {
                ctx_end = source.len();
                break;
            }
        }
    }
    &source[ctx_start..ctx_end]
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
                let context = call_context(source, index);
                assert!(
                    gates.iter().any(|gate| context.contains(gate)),
                    "{relative}: {needle} at byte {index} is not gated by any of {gates:?}:\n{context}"
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
                let context = call_context(source, index);
                assert!(
                    gates.iter().any(|gate| context.contains(gate)),
                    "{relative}: {needle} at byte {index} is not gated by any of {gates:?}:\n{context}"
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
    let start = app
        .find("render::render_attract(")
        .expect("desktop title must compose the attract board");
    let rest = &app[start..];
    let call = &rest[..rest.find(')').expect("unterminated render_attract call")];
    assert!(
        call.contains("!self.settings.reduced_flash"),
        "title attract call must pass the reduced-flash setting, got: {call}"
    );
    assert!(
        call.contains("self.settings.reduced_motion"),
        "title attract call must pass the reduced-motion setting, got: {call}"
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
fn reduced_flash_holds_the_two_state_death_window() {
    let count_states = |flash: bool, reduced_motion: bool| {
        let mut game = Game::new(1, 1);
        game.kill_player();
        let mut states: Vec<raster::PixelFrame> = Vec::new();
        for _ in 0..4 {
            let frame = raster::render_opts(
                &game,
                &DUSK_POND,
                raster::DEFAULT_PPT,
                Fx::new(flash, reduced_motion),
            );
            if !states.iter().any(|seen| seen == &frame) {
                states.push(frame);
            }
            game.tick(0.1);
        }
        states.len()
    };
    assert_eq!(
        count_states(false, false),
        2,
        "reduced flash must hold two static death states, not the four-frame clip"
    );
    assert_eq!(
        count_states(true, false),
        4,
        "full flash must still run the four-frame death clip"
    );
}

#[test]
fn reduced_flash_keeps_the_fright_mask_center_hollow() {
    let theme = &DUSK_POND;
    let mut game = Game::new(1, 1);
    game.wardens.start_fright(6.0);
    game.wardens.fright_t = 3.0;
    let warden = &game.wardens.wardens[0];
    let ppt = raster::DEFAULT_PPT;
    let cx = (warden.actor.x * ppt as f32) as i32;
    let cy = (warden.actor.y * ppt as f32) as i32;
    let reduced = raster::render_opts(&game, theme, ppt, Fx::new(false, false));
    let solid = raster::render_opts(&game, theme, ppt, Fx::new(true, false));
    assert_ne!(
        reduced.get(cx, cy),
        solid.get(cx, cy),
        "reduced flash must show the hollow warning mask, not the solid mask"
    );
    let center = reduced.get(cx, cy);
    assert!(
        center == Some(theme.bg) || center == Some(theme.crumb) || center == Some(theme.sunseed),
        "the hollow warning mask center must show the board layer, got {center:?}"
    );
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
