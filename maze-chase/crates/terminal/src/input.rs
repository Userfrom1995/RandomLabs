//! Input mapping: crossterm key events to engine directions.
//!
//! Two stages, both pure and tested: [`crossterm_to_key`] translates a
//! `crossterm::event::KeyEvent` into the layer-neutral [`Key`], and
//! [`action_for_key`] resolves a [`Key`] through the player's [`Keymap`]
//! into an [`Action`]. Gameplay code consumes [`dir_for_action`]; menu
//! code consumes the raw actions. Nothing here touches the simulation.

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use maze_chase_config::{Action, Key, Keymap};
use maze_chase_engine::actors::Dir;

/// Translate a crossterm key event to the layer-neutral [`Key`].
/// Returns `None` for modified keys the game does not bind (Ctrl/Alt
/// combos) and for unmapped function keys.
pub fn crossterm_to_key(ev: KeyEvent) -> Option<Key> {
    if ev.modifiers.contains(KeyModifiers::CONTROL) || ev.modifiers.contains(KeyModifiers::ALT) {
        return None;
    }
    match ev.code {
        KeyCode::Up => Some(Key::Up),
        KeyCode::Down => Some(Key::Down),
        KeyCode::Left => Some(Key::Left),
        KeyCode::Right => Some(Key::Right),
        KeyCode::Char('w') | KeyCode::Char('W') => Some(Key::W),
        KeyCode::Char('a') | KeyCode::Char('A') => Some(Key::A),
        KeyCode::Char('s') | KeyCode::Char('S') => Some(Key::S),
        KeyCode::Char('d') | KeyCode::Char('D') => Some(Key::D),
        KeyCode::Char('p') | KeyCode::Char('P') => Some(Key::P),
        KeyCode::Char('m') | KeyCode::Char('M') => Some(Key::M),
        KeyCode::Char(c) => Key::parse(&c.to_string()),
        KeyCode::Enter => Some(Key::Enter),
        KeyCode::Esc => Some(Key::Escape),
        // No dedicated Back key in the neutral map: Backspace backs out.
        KeyCode::Backspace => Some(Key::Escape),
        _ => None,
    }
}

/// Resolve a [`Key`] through the active [`Keymap`] to an [`Action`].
pub fn action_for_key(map: &Keymap, key: Key) -> Option<Action> {
    Action::ALL
        .iter()
        .copied()
        .find(|&action| map.keys(action).contains(&key))
}

/// Movement actions become engine headings; everything else is `None`.
pub fn dir_for_action(action: Action) -> Option<Dir> {
    match action {
        Action::Up => Some(Dir::Up),
        Action::Down => Some(Dir::Down),
        Action::Left => Some(Dir::Left),
        Action::Right => Some(Dir::Right),
        _ => None,
    }
}

/// One-step helper: key event plus keymap straight to an engine heading.
pub fn dir_for_event(map: &Keymap, ev: KeyEvent) -> Option<Dir> {
    let key = crossterm_to_key(ev)?;
    let action = action_for_key(map, key)?;
    dir_for_action(action)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crossterm::event::KeyEventKind;

    fn key(code: KeyCode) -> KeyEvent {
        KeyEvent {
            code,
            modifiers: KeyModifiers::empty(),
            kind: KeyEventKind::Press,
            state: crossterm::event::KeyEventState::empty(),
        }
    }

    #[test]
    fn arrows_and_wasd_reach_the_engine() {
        let map = Keymap::defaults();
        for code in [
            KeyCode::Up,
            KeyCode::Char('w'),
            KeyCode::Char('W'),
            KeyCode::Down,
            KeyCode::Char('s'),
            KeyCode::Left,
            KeyCode::Char('a'),
            KeyCode::Right,
            KeyCode::Char('d'),
        ] {
            assert!(dir_for_event(&map, key(code)).is_some(), "{code:?}");
        }
        assert_eq!(dir_for_event(&map, key(KeyCode::Up)), Some(Dir::Up));
        assert_eq!(
            dir_for_event(&map, key(KeyCode::Char('a'))),
            Some(Dir::Left)
        );
    }

    #[test]
    fn modified_keys_never_leak_into_gameplay() {
        let modified = KeyEvent {
            code: KeyCode::Up,
            modifiers: KeyModifiers::CONTROL,
            kind: KeyEventKind::Press,
            state: crossterm::event::KeyEventState::empty(),
        };
        assert_eq!(crossterm_to_key(modified), None);
        let map = Keymap::defaults();
        assert_eq!(dir_for_event(&map, modified), None);
    }

    #[test]
    fn ui_keys_resolve_but_do_not_steer() {
        let map = Keymap::defaults();
        let esc = crossterm_to_key(key(KeyCode::Esc)).unwrap();
        let action = action_for_key(&map, esc);
        assert!(action.is_some());
        assert_eq!(dir_for_action(action.unwrap()), None);
    }

    #[test]
    fn rebinds_take_effect_immediately() {
        let mut map = Keymap::defaults();
        // Rebind pause onto a free key; the old key must stop working.
        let _ = map.rebind(Action::Pause, Key::Char('x'));
        let action = action_for_key(&map, Key::Char('x'));
        assert_eq!(action, Some(Action::Pause));
        assert_eq!(dir_for_action(Action::Pause), None);
    }
}
