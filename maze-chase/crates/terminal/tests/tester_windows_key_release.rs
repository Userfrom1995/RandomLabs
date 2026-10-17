//! Windows Tester regression: key-up records must never act.
//!
//! Native Windows evidence (Windows Server 2025, Git Bash + MSVC, rustc
//! 1.99.0, release binary at head 76abb6b0): a real pywinpty 120x40 ConPTY
//! session showed one physical Down arrow on the title menu moving the
//! cursor from `> Play` straight to `> High scores` (two rows), one `p`
//! toggling pause on and off, and Esc from play only flashing the pause
//! overlay. Root cause: on Windows crossterm reports the key-up twin of
//! every keystroke as `KeyEventKind::Release` (console records on conhost,
//! pair records synthesized by ConPTY, which is what Windows Terminal, VS
//! Code, and winpty all run on), `main.rs` forwards every `Event::Key`
//! into `App::on_key`, and `crossterm_to_key` never inspected `ev.kind`.
//! Unix terminals emit Press only, so the Linux and macOS per-OS arms
//! cannot catch this class.
//!
//! These tests pin the layered contract: the pure translation drops
//! Release events, the one-step direction helper does not steer on them,
//! and the Press path keeps working (no over-filtering).

use crossterm::event::{KeyCode, KeyEvent, KeyEventKind, KeyEventState, KeyModifiers};
use maze_chase_config::Keymap;
use maze_chase_terminal::input::{crossterm_to_key, dir_for_event};

fn event(code: KeyCode, kind: KeyEventKind) -> KeyEvent {
    KeyEvent {
        code,
        modifiers: KeyModifiers::empty(),
        kind,
        state: KeyEventState::empty(),
    }
}

#[test]
fn release_events_never_translate_to_keys() {
    for code in [
        KeyCode::Down,
        KeyCode::Up,
        KeyCode::Left,
        KeyCode::Right,
        KeyCode::Esc,
        KeyCode::Enter,
        KeyCode::Char('p'),
        KeyCode::Char('m'),
    ] {
        assert_eq!(
            crossterm_to_key(event(code, KeyEventKind::Release)),
            None,
            "a Release for {code:?} must not act; otherwise every Windows \
             key-up record doubles the keystroke"
        );
    }
}

#[test]
fn release_events_never_steer() {
    let map = Keymap::defaults();
    assert_eq!(
        dir_for_event(&map, event(KeyCode::Down, KeyEventKind::Release)),
        None,
        "a Release must not steer the player"
    );
}

#[test]
fn press_events_still_translate_and_steer() {
    let map = Keymap::defaults();
    assert!(crossterm_to_key(event(KeyCode::Down, KeyEventKind::Press)).is_some());
    assert!(crossterm_to_key(event(KeyCode::Enter, KeyEventKind::Press)).is_some());
    assert!(
        dir_for_event(&map, event(KeyCode::Down, KeyEventKind::Press)).is_some(),
        "the Press path must keep steering"
    );
}
