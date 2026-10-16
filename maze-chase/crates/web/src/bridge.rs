//! C-ABI boundary for the WebAssembly build.
//!
//! Plain `extern "C"` exports, no `wasm-bindgen`, no JS glue to
//! generate: the harness (`maze-chase/web/maze-chase.js`) instantiates
//! the `.wasm` directly. Every entry is total over its inputs: null
//! pointers, absurd lengths, and out-of-range codes degrade to a
//! documented default (0, no-change sentinel, or null frame) instead of
//! trapping, so a hostile or buggy harness can never abort the engine.
//!
//! Returning pointers (`mc_frame`, `mc_scratch`) borrow static buffers
//! that stay stable until the next call into the same buffer on this
//! (single) thread; the harness copies synchronously.

use std::sync::{Mutex, OnceLock};

use crate::audio_map;
use crate::input;
use crate::session::{difficulty_from_index, difficulty_index, WebSession};
use crate::video;

const SCRATCH_LEN: usize = 4096;
const MAX_FRAME_DIM: u32 = 2048;
const MAX_NAME_BYTES: usize = 64;
const MAX_BLOB_BYTES: usize = 65536;

fn session() -> std::sync::MutexGuard<'static, WebSession> {
    static SESSION: OnceLock<Mutex<WebSession>> = OnceLock::new();
    SESSION
        .get_or_init(|| Mutex::new(WebSession::new()))
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn frame_buf() -> std::sync::MutexGuard<'static, Vec<u8>> {
    static FRAME: OnceLock<Mutex<Vec<u8>>> = OnceLock::new();
    FRAME
        .get_or_init(|| Mutex::new(Vec::new()))
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn scratch_buf() -> std::sync::MutexGuard<'static, Vec<u8>> {
    static SCRATCH: OnceLock<Mutex<Vec<u8>>> = OnceLock::new();
    SCRATCH
        .get_or_init(|| Mutex::new(vec![0u8; SCRATCH_LEN]))
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn read_bytes(ptr: *const u8, len: u32, cap: usize) -> Option<Vec<u8>> {
    if ptr.is_null() || len as usize > cap {
        return None;
    }
    if len == 0 {
        return Some(Vec::new());
    }
    // SAFETY: null-checked above; the harness guarantees readable memory
    // for `len` bytes. A wrong length can only misread wasm-linear-memory
    // contents, never host memory.
    Some(unsafe { std::slice::from_raw_parts(ptr, len as usize).to_vec() })
}

fn write_bytes(dst: *mut u8, cap: u32, src: &[u8]) -> u32 {
    if dst.is_null() {
        return 0;
    }
    let n = src.len().min(cap as usize);
    // SAFETY: null-checked; the harness guarantees a writable `cap`.
    unsafe {
        std::ptr::copy_nonoverlapping(src.as_ptr(), dst, n);
    }
    n as u32
}

/// Bridge version the harness gates on (must be 1).
#[no_mangle]
pub extern "C" fn mc_version() -> u32 {
    1
}

/// Start (or restart) a run. `level` 0 selects the difficulty preset
/// start level, `mode` 99 selects the preset mode (0 classic, 1
/// time-attack, 2 sprint, 3 fright-frenzy).
#[no_mangle]
pub extern "C" fn mc_reset(seed_lo: u32, seed_hi: u32, level: u32, mode: u32) {
    let seed = ((seed_hi as u64) << 32) | seed_lo as u64;
    session().reset(seed, level, mode);
}

/// Advance the session to harness wall-clock `now_ms`.
#[no_mangle]
pub extern "C" fn mc_step(now_ms: u32) {
    session().step(now_ms);
}

/// Key event (`input::KEY_*` ids). Returns 1 consumed, 2 rebind
/// duplicate/conflict, 0 ignored.
#[no_mangle]
pub extern "C" fn mc_key(id: u32, down: u32) -> u32 {
    session().key(id, down)
}

/// Touch swipe delta in CSS pixels. Returns 1 when it steered Pip.
#[no_mangle]
pub extern "C" fn mc_swipe(dx: f32, dy: f32) -> u32 {
    session().swipe(dx, dy)
}

/// Menu button (`session::BTN_*`). Returns 1 when handled.
#[no_mangle]
pub extern "C" fn mc_press(btn: u32) -> u32 {
    session().press(btn)
}

/// Open a menu screen (0 title, 1 help, 2 scores, 3 settings).
#[no_mangle]
pub extern "C" fn mc_goto(screen: u32) -> u32 {
    session().goto(screen)
}

/// Arm a rebind capture for action `a` (0..7 in `Action::ALL` order) and
/// return the action's current first web-mappable key id (0 when none).
/// `mc_rebind(99)` cancels an armed capture. Out-of-range arms nothing
/// and returns 0.
#[no_mangle]
pub extern "C" fn mc_rebind(action: u32) -> u32 {
    let current = mc_binding(action);
    if session().rebind(action) == 1 {
        current
    } else {
        0
    }
}

/// Current first web-mappable key id bound to action `a` (0 when none).
#[no_mangle]
pub extern "C" fn mc_binding(action: u32) -> u32 {
    if action >= maze_chase_config::keymap::Action::ALL.len() as u32 {
        return 0;
    }
    let map = session();
    let keys = map
        .keymap()
        .keys(maze_chase_config::keymap::Action::ALL[action as usize]);
    keys.iter()
        .filter_map(|k| input::id_from_key(*k))
        .next()
        .unwrap_or(0)
}

/// Current screen (`session::SCREEN_*`).
#[no_mangle]
pub extern "C" fn mc_screen() -> u32 {
    session().screen().wire()
}

/// Live score.
#[no_mangle]
pub extern "C" fn mc_score() -> u32 {
    session().game().score
}

/// Best score (table best or live run).
#[no_mangle]
pub extern "C" fn mc_best() -> u32 {
    session().best()
}

/// Spare wicks, clamped at zero.
#[no_mangle]
pub extern "C" fn mc_lives() -> u32 {
    session().game().lives.max(0) as u32
}

/// Current level.
#[no_mangle]
pub extern "C" fn mc_level() -> u32 {
    session().game().level
}

/// Game mode (0 classic, 1 time-attack, 2 sprint, 3 fright-frenzy).
#[no_mangle]
pub extern "C" fn mc_mode() -> u32 {
    match session().game().mode {
        maze_chase_engine::modes::GameMode::Classic => 0,
        maze_chase_engine::modes::GameMode::TimeAttack => 1,
        maze_chase_engine::modes::GameMode::Sprint => 2,
        maze_chase_engine::modes::GameMode::FrightFrenzy => 3,
    }
}

/// Crumbs plus sunseeds remaining.
#[no_mangle]
pub extern "C" fn mc_dots_left() -> u32 {
    session().game().dots_left() as u32
}

/// 1 while a fright window runs.
#[no_mangle]
pub extern "C" fn mc_fright_active() -> u32 {
    u32::from(session().game().wardens.fright_active())
}

/// 1 while a bonus relish waits on its tile.
#[no_mangle]
pub extern "C" fn mc_relish_active() -> u32 {
    u32::from(session().game().relish.active)
}

/// Current relish bounty (0 when none waiting).
#[no_mangle]
pub extern "C" fn mc_relish_value() -> u32 {
    if session().game().relish.active {
        session().game().relish.value
    } else {
        0
    }
}

/// Render frame counter, low word (drives harness fps math).
#[no_mangle]
pub extern "C" fn mc_frame_no() -> u32 {
    session().frame_no() as u32
}

/// 1 when muted.
#[no_mangle]
pub extern "C" fn mc_muted() -> u32 {
    u32::from(session().settings().mute)
}

/// Difficulty (0 cozy, 1 standard, 2 harsh).
#[no_mangle]
pub extern "C" fn mc_difficulty() -> u32 {
    difficulty_index(session().settings().difficulty)
}

/// Set difficulty. Returns 1 on success.
#[no_mangle]
pub extern "C" fn mc_set_difficulty(index: u32) -> u32 {
    let ok = difficulty_from_index(index).is_some();
    if ok {
        session().set_difficulty(index);
    }
    u32::from(ok)
}

/// Theme index for the cycle button.
#[no_mangle]
pub extern "C" fn mc_theme() -> u32 {
    session().theme_index()
}

/// Number of shipped themes.
#[no_mangle]
pub extern "C" fn mc_theme_count() -> u32 {
    WebSession::theme_count()
}

/// Set theme by index (ignored when out of range).
#[no_mangle]
pub extern "C" fn mc_set_theme(index: u32) {
    session().set_theme(index);
}

/// Master volume 0..1.
#[no_mangle]
pub extern "C" fn mc_master() -> f32 {
    session().settings().master
}

/// Music volume 0..1.
#[no_mangle]
pub extern "C" fn mc_music() -> f32 {
    session().settings().music
}

/// SFX volume 0..1.
#[no_mangle]
pub extern "C" fn mc_sfx() -> f32 {
    session().settings().sfx
}

fn clamp01(v: f32) -> Option<f32> {
    if v.is_finite() {
        Some(v.clamp(0.0, 1.0))
    } else {
        None
    }
}

/// Set master volume (ignores NaN/infinite).
#[no_mangle]
pub extern "C" fn mc_set_master(v: f32) {
    if let Some(c) = clamp01(v) {
        session().settings_mut().master = c;
    }
}

/// Set music volume (ignores NaN/infinite).
#[no_mangle]
pub extern "C" fn mc_set_music(v: f32) {
    if let Some(c) = clamp01(v) {
        session().settings_mut().music = c;
    }
}

/// Set SFX volume (ignores NaN/infinite).
#[no_mangle]
pub extern "C" fn mc_set_sfx(v: f32) {
    if let Some(c) = clamp01(v) {
        session().settings_mut().sfx = c;
    }
}

/// 1 when reduced-flash is on (steady fright mask).
#[no_mangle]
pub extern "C" fn mc_reduced_flash() -> u32 {
    u32::from(session().settings().reduced_flash)
}

/// Set reduced-flash.
#[no_mangle]
pub extern "C" fn mc_set_reduced_flash(on: u32) {
    session().settings_mut().reduced_flash = on != 0;
}

/// Scratch buffer for blob/name transfers (4096 bytes).
#[no_mangle]
pub extern "C" fn mc_scratch() -> *mut u8 {
    scratch_buf().as_mut_ptr()
}

/// Scratch buffer length.
#[no_mangle]
pub extern "C" fn mc_scratch_len() -> u32 {
    SCRATCH_LEN as u32
}

/// Settings blob length in bytes.
#[no_mangle]
pub extern "C" fn mc_settings_len() -> u32 {
    let s = session();
    maze_chase_config::persist::save(s.settings(), s.keymap()).len() as u32
}

/// Copy the settings blob to `out` (capacity `cap`). Returns bytes written.
#[no_mangle]
pub extern "C" fn mc_settings_read(out: *mut u8, cap: u32) -> u32 {
    let s = session();
    let blob = maze_chase_config::persist::save(s.settings(), s.keymap());
    write_bytes(out, cap, blob.as_bytes())
}

/// Apply a settings blob. Returns 1 when applied.
#[no_mangle]
pub extern "C" fn mc_settings_write(ptr: *const u8, len: u32) -> u32 {
    match read_bytes(ptr, len, MAX_BLOB_BYTES) {
        Some(bytes) => match std::str::from_utf8(&bytes) {
            Ok(text) => u32::from(session().apply_settings_blob(text)),
            Err(_) => 0,
        },
        None => 0,
    }
}

/// Score rows on the table.
#[no_mangle]
pub extern "C" fn mc_score_count() -> u32 {
    session().scores().count() as u32
}

/// Row score (0 when out of range).
#[no_mangle]
pub extern "C" fn mc_score_get_score(i: u32) -> u32 {
    session()
        .scores()
        .get(i as usize)
        .map(|e| e.score)
        .unwrap_or(0)
}

/// Row level (0 when out of range).
#[no_mangle]
pub extern "C" fn mc_score_get_level(i: u32) -> u32 {
    session()
        .scores()
        .get(i as usize)
        .map(|e| e.level)
        .unwrap_or(0)
}

/// Copy row `i` name to `out`. Returns bytes written.
#[no_mangle]
pub extern "C" fn mc_score_get_name(i: u32, out: *mut u8, cap: u32) -> u32 {
    match session().scores().get(i as usize) {
        Some(entry) => write_bytes(out, cap, entry.name.as_bytes()),
        None => 0,
    }
}

/// 1 when the finished run is waiting on a name entry and qualifies.
#[no_mangle]
pub extern "C" fn mc_can_add_score() -> u32 {
    u32::from(session().can_add_score())
}

/// Add the finished run under the UTF-8 name at `ptr`/`len`.
/// Returns 1 when the row made the table.
#[no_mangle]
pub extern "C" fn mc_score_add(ptr: *const u8, len: u32) -> u32 {
    match read_bytes(ptr, len, MAX_NAME_BYTES) {
        Some(bytes) => match std::str::from_utf8(&bytes) {
            Ok(name) => u32::from(session().add_score(name)),
            Err(_) => 0,
        },
        None => 0,
    }
}

/// Drop every score row.
#[no_mangle]
pub extern "C" fn mc_scores_clear() {
    session().scores_mut().clear();
}

/// Drain one queued cue code (0 when empty).
#[no_mangle]
pub extern "C" fn mc_poll_cue() -> u32 {
    session().poll_cue()
}

/// Drain a loop-music change (`MUSIC_NO_CHANGE` when none pending).
#[no_mangle]
pub extern "C" fn mc_poll_music() -> u32 {
    session().poll_music()
}

/// 1 when the cue is a one-shot music sting (see `mc_cue_tune`).
#[no_mangle]
pub extern "C" fn mc_cue_is_music(code: u32) -> u32 {
    u32::from(audio_map::cue_is_music(code))
}

/// Tune id for a musical cue (`0xFFFF_FFFF` when not musical).
#[no_mangle]
pub extern "C" fn mc_cue_tune(code: u32) -> u32 {
    audio_map::tune_for_cue(code).unwrap_or(0xFFFF_FFFF)
}

/// Last warden-chain arm 1..=4 (SFX pitch doubling).
#[no_mangle]
pub extern "C" fn mc_last_chain() -> u32 {
    session().last_chain() as u32
}

/// SFX waveform code (0 square, 1 triangle, 2 sine, 3 noise;
/// `0xFFFF_FFFF` when the cue has no SFX recipe).
#[no_mangle]
pub extern "C" fn mc_sfx_wave(code: u32) -> u32 {
    match audio_map::sfx_for_code(code, session().last_chain()) {
        Some(sfx) => audio_map::wave_code(sfx.wave),
        None => 0xFFFF_FFFF,
    }
}

/// SFX start frequency in Hz (0.0 when no recipe).
#[no_mangle]
pub extern "C" fn mc_sfx_from(code: u32) -> f32 {
    match audio_map::sfx_for_code(code, session().last_chain()) {
        Some(sfx) => sfx.from_hz,
        None => 0.0,
    }
}

/// SFX end frequency in Hz (0.0 when no recipe).
#[no_mangle]
pub extern "C" fn mc_sfx_to(code: u32) -> f32 {
    match audio_map::sfx_for_code(code, session().last_chain()) {
        Some(sfx) => sfx.to_hz,
        None => 0.0,
    }
}

/// SFX length in ms (0 when no recipe).
#[no_mangle]
pub extern "C" fn mc_sfx_ms(code: u32) -> u32 {
    match audio_map::sfx_for_code(code, session().last_chain()) {
        Some(sfx) => sfx.ms,
        None => 0,
    }
}

/// Tune note count (0 when out of range).
#[no_mangle]
pub extern "C" fn mc_tune_len(id: u32) -> u32 {
    audio_map::tune_for_id(id)
        .map(|t| t.notes.len() as u32)
        .unwrap_or(0)
}

/// Tune note MIDI key (`0xFFFF_FFFF` when out of range).
#[no_mangle]
pub extern "C" fn mc_tune_midi(id: u32, i: u32) -> u32 {
    match audio_map::tune_for_id(id) {
        Some(tune) => tune
            .notes
            .get(i as usize)
            .map(|n| n.midi as u32)
            .unwrap_or(0xFFFF_FFFF),
        None => 0xFFFF_FFFF,
    }
}

/// Tune note length in beats (0.0 when out of range).
#[no_mangle]
pub extern "C" fn mc_tune_beats(id: u32, i: u32) -> f32 {
    match audio_map::tune_for_id(id) {
        Some(tune) => tune.notes.get(i as usize).map(|n| n.beats).unwrap_or(0.0),
        None => 0.0,
    }
}

/// 1 when the tune loops.
#[no_mangle]
pub extern "C" fn mc_tune_looped(id: u32) -> u32 {
    match audio_map::tune_for_id(id) {
        Some(tune) => u32::from(tune.looped),
        None => 0,
    }
}

/// Presentation tempo in beats per minute (mirrors the desktop synth).
#[no_mangle]
pub extern "C" fn mc_tune_bpm() -> f32 {
    audio_map::TUNE_BPM
}

/// Paint the board scaled into a `w`x`h` RGBA buffer and return its
/// pointer (null when the dimensions are insane). Read `mc_frame_len`
/// bytes synchronously; the buffer is reused by the next call.
#[no_mangle]
pub extern "C" fn mc_frame(w: u32, h: u32) -> *const u8 {
    if !(1..=MAX_FRAME_DIM).contains(&w) || !(1..=MAX_FRAME_DIM).contains(&h) {
        return std::ptr::null();
    }
    let s = session();
    let board = video::render_board(
        s.game(),
        s.theme(),
        s.frame_no(),
        !s.settings().reduced_flash,
    );
    let bg = s.theme().bg;
    drop(s);
    let fit = video::fit_canvas(w, h);
    let mut frame = frame_buf();
    let need = (w as usize) * (h as usize) * 4;
    frame.clear();
    frame.resize(need, 0);
    video::blit_scaled(frame.as_mut_slice(), w, h, &board, &fit, bg);
    frame.as_ptr()
}

/// Byte length of the last painted frame.
#[no_mangle]
pub extern "C" fn mc_frame_len() -> u32 {
    frame_buf().len() as u32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_starts_clean() {
        // Statics are shared across tests in one binary: only assert the
        // API shape here, behavior lives in the session tests.
        assert_eq!(mc_version(), 1);
        assert!(mc_scratch_len() as usize >= SCRATCH_LEN);
        assert!(!mc_scratch().is_null());
    }

    #[test]
    fn unknown_codes_degrade_quietly() {
        assert_eq!(mc_press(999), 0);
        assert_eq!(mc_goto(99), 0);
        assert_eq!(mc_key(999, 1), 0);
        assert_eq!(mc_swipe(f32::NAN, 0.0), 0);
        assert_eq!(mc_rebind(99), 0 + 0, "cancel path returns armed-state 0");
        assert_eq!(mc_binding(99), 0);
        assert_eq!(mc_cue_tune(0), 0xFFFF_FFFF);
        assert_eq!(mc_sfx_wave(0), 0xFFFF_FFFF);
        assert_eq!(mc_tune_len(99), 0);
        assert_eq!(mc_tune_midi(0, 9999), 0xFFFF_FFFF);
        assert!(mc_frame(0, 0).is_null());
        assert!(mc_frame(99999, 99999).is_null());
        assert_eq!(mc_score_get_score(999), 0);
        assert_eq!(mc_settings_write(std::ptr::null(), 10), 0);
        assert_eq!(mc_score_add(std::ptr::null(), 4), 0);
    }

    #[test]
    fn scores_api_round_trips() {
        mc_scores_clear();
        // Nothing pending without a finished run.
        assert_eq!(mc_can_add_score(), 0);
        assert_eq!(mc_score_add(b"Pip".as_ptr(), 3), 0);
        assert_eq!(mc_score_count(), 0);
    }

    #[test]
    fn max_name_bytes_cap() {
        assert_eq!(crate::scores::MAX_NAME, 12);
    }
}
