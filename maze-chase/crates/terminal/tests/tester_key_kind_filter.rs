//! Tester contract: the key-kind filter at the input choke point.
//!
//! The Windows native pass found the terminal double-fired every
//! keystroke because `crossterm_to_key` never filtered key-up records.
//! The shipped fix drops every non-`Press` kind, not only `Release`,
//! and the startup-probe replay must synthesize `Press` events by
//! construction so the fix can never starve the replay path. The
//! Windows contract pins `Release`; this file pins the remainder of
//! the filter contract (`Repeat`) plus the replay path's `Press`
//! invariant, so a future loosening of the filter or a crossterm
//! default change fails loudly here instead of on a native Windows
//! keyboard.

use crossterm::event::{KeyCode, KeyEvent, KeyEventKind, KeyEventState, KeyModifiers};
use maze_chase_config::Keymap;
use maze_chase_terminal::input::{crossterm_to_key, dir_for_event, keys_from_captured_bytes};

fn event(code: KeyCode, kind: KeyEventKind) -> KeyEvent {
    KeyEvent {
        code,
        modifiers: KeyModifiers::empty(),
        kind,
        state: KeyEventState::empty(),
    }
}

#[test]
fn repeat_events_never_translate_or_steer() {
    let map = Keymap::defaults();
    for code in [
        KeyCode::Down,
        KeyCode::Up,
        KeyCode::Left,
        KeyCode::Right,
        KeyCode::Enter,
        KeyCode::Esc,
        KeyCode::Char('p'),
    ] {
        assert_eq!(
            crossterm_to_key(event(code, KeyEventKind::Repeat)),
            None,
            "a Repeat for {code:?} must not act: the filter contract is \
             every non-Press kind, not only Release"
        );
    }
    assert_eq!(
        dir_for_event(&map, event(KeyCode::Down, KeyEventKind::Repeat)),
        None,
        "a Repeat must not steer the player"
    );
}

#[test]
fn replayed_probe_keystrokes_are_press_by_construction() {
    let map = Keymap::defaults();
    let keys = keys_from_captured_bytes(b"\x1b[B\rp");
    assert_eq!(keys.len(), 3, "Down, Enter, and p must decode");
    assert_eq!(
        keys.iter().map(|k| k.code).collect::<Vec<_>>(),
        vec![KeyCode::Down, KeyCode::Enter, KeyCode::Char('p')]
    );
    for key in &keys {
        assert_eq!(
            key.kind,
            KeyEventKind::Press,
            "replayed probe keystrokes must synthesize Press: a non-Press \
             kind would be dropped by the filter and silently swallow the \
             first keypress typed during the probe window"
        );
    }
    assert!(
        dir_for_event(&map, keys[0]).is_some(),
        "the replayed Down must still steer through the Press path"
    );
}
