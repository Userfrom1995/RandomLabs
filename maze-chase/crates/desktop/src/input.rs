//! Desktop keyboard mapping: winit physical keys to engine headings.
//!
//! One pure stage, fully tested without a window:
//! [`winit_to_key`] translates a [`winit::keyboard::KeyCode`] into the
//! layer-neutral [`Key`]. Action resolution and heading mapping reuse the
//! shared terminal adapters
//! ([`maze_chase_terminal::input::{action_for_key, dir_for_action}`]) so
//! keyboard intent is identical on both layers. Physical (layout-
//! independent) codes are used, so WASD stays WASD on AZERTY and Dvorak.

use maze_chase_config::Key;
use winit::keyboard::KeyCode;

/// Translate a winit physical key code to the layer-neutral [`Key`].
/// Returns `None` for keys the game does not bind (function keys,
/// modifiers, navigation beyond arrows).
pub fn winit_to_key(code: KeyCode) -> Option<Key> {
    Some(match code {
        KeyCode::ArrowUp => Key::Up,
        KeyCode::ArrowDown => Key::Down,
        KeyCode::ArrowLeft => Key::Left,
        KeyCode::ArrowRight => Key::Right,
        KeyCode::KeyW => Key::W,
        KeyCode::KeyA => Key::A,
        KeyCode::KeyS => Key::S,
        KeyCode::KeyD => Key::D,
        KeyCode::KeyP => Key::P,
        KeyCode::KeyM => Key::M,
        KeyCode::Space => Key::Space,
        KeyCode::Enter | KeyCode::NumpadEnter => Key::Enter,
        KeyCode::Escape | KeyCode::Backspace => Key::Escape,
        KeyCode::Digit0 => Key::Char('0'),
        KeyCode::Digit1 => Key::Char('1'),
        KeyCode::Digit2 => Key::Char('2'),
        KeyCode::Digit3 => Key::Char('3'),
        KeyCode::Digit4 => Key::Char('4'),
        KeyCode::Digit5 => Key::Char('5'),
        KeyCode::Digit6 => Key::Char('6'),
        KeyCode::Digit7 => Key::Char('7'),
        KeyCode::Digit8 => Key::Char('8'),
        KeyCode::Digit9 => Key::Char('9'),
        other => {
            // Remaining letter codes become rebindable `Char` keys, except
            // the dedicated WASD/PM twins handled above.
            let name = format!("{other:?}");
            if let Some(rest) = name.strip_prefix("Key") {
                let mut chars = rest.chars();
                if let (Some(c), None) = (chars.next(), chars.next()) {
                    if c.is_ascii_alphabetic() {
                        let lower = c.to_ascii_lowercase();
                        if !matches!(lower, 'w' | 'a' | 's' | 'd' | 'p' | 'm') {
                            return Key::parse(&lower.to_string());
                        }
                    }
                }
            }
            return None;
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use maze_chase_config::{Action, Keymap};
    use maze_chase_engine::actors::Dir;

    #[test]
    fn arrows_wasd_and_system_keys_map() {
        use KeyCode::*;
        assert_eq!(winit_to_key(ArrowUp), Some(Key::Up));
        assert_eq!(winit_to_key(ArrowDown), Some(Key::Down));
        assert_eq!(winit_to_key(ArrowLeft), Some(Key::Left));
        assert_eq!(winit_to_key(ArrowRight), Some(Key::Right));
        assert_eq!(winit_to_key(KeyW), Some(Key::W));
        assert_eq!(winit_to_key(KeyA), Some(Key::A));
        assert_eq!(winit_to_key(KeyS), Some(Key::S));
        assert_eq!(winit_to_key(KeyD), Some(Key::D));
        assert_eq!(winit_to_key(KeyP), Some(Key::P));
        assert_eq!(winit_to_key(KeyM), Some(Key::M));
        assert_eq!(winit_to_key(Space), Some(Key::Space));
        assert_eq!(winit_to_key(Enter), Some(Key::Enter));
        assert_eq!(winit_to_key(NumpadEnter), Some(Key::Enter));
        assert_eq!(winit_to_key(Escape), Some(Key::Escape));
        assert_eq!(winit_to_key(Backspace), Some(Key::Escape));
        assert_eq!(winit_to_key(Digit7), Some(Key::Char('7')));
        // Unbound keys stay silent.
        assert_eq!(winit_to_key(KeyCode::F1), None);
        assert_eq!(winit_to_key(KeyCode::ShiftLeft), None);
        assert_eq!(winit_to_key(KeyCode::Tab), None);
    }

    #[test]
    fn spare_letters_are_rebindable_chars() {
        assert_eq!(winit_to_key(KeyCode::KeyQ), Some(Key::Char('q')));
        assert_eq!(winit_to_key(KeyCode::KeyZ), Some(Key::Char('z')));
        // Dedicated twins never degrade to Char.
        assert_eq!(winit_to_key(KeyCode::KeyW), Some(Key::W));
    }

    #[test]
    fn default_keymap_resolves_through_shared_adapter() {
        use maze_chase_terminal::input::{action_for_key, dir_for_action};
        let map = Keymap::defaults();
        let key = winit_to_key(KeyCode::ArrowUp).unwrap();
        assert_eq!(action_for_key(&map, key), Some(Action::Up));
        assert_eq!(dir_for_action(Action::Up), Some(Dir::Up));
        assert_eq!(dir_for_action(Action::Pause), None);
        let wasd = winit_to_key(KeyCode::KeyA).unwrap();
        assert_eq!(action_for_key(&map, wasd), Some(Action::Left));
    }

    #[test]
    fn rebinding_flows_end_to_end() {
        use maze_chase_terminal::input::action_for_key;
        let mut map = Keymap::defaults();
        map.rebind(Action::Pause, Key::Char('q')).unwrap();
        let key = winit_to_key(KeyCode::KeyQ).unwrap();
        assert_eq!(action_for_key(&map, key), Some(Action::Pause));
    }
}
