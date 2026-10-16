//! Web input mapping: keyboard codes and touch gestures to headings.
//!
//! Pure adapter logic, no gameplay: keyboard ids arrive from the JS
//! harness (`KeyboardEvent.code` table), swipes arrive as raw pixel
//! deltas, and everything resolves to an engine [`Dir`] (or `None` for
//! UI-only keys) through the shared [`Keymap`] so player rebinds apply
//! on the web layer exactly like the desktop layer.

use maze_chase_config::keymap::{Action, Key, Keymap};
use maze_chase_engine::actors::Dir;

/// Key id for `ArrowUp`. Full table (mirrors the JS harness):
/// 1 Up, 2 Down, 3 Left, 4 Right, 5 W, 6 A, 7 S, 8 D,
/// 9 Space, 10 Enter, 11 Escape, 12 P, 13 M.
pub const KEY_UP: u32 = 1;
/// Key id for `ArrowDown`.
pub const KEY_DOWN: u32 = 2;
/// Key id for `ArrowLeft`.
pub const KEY_LEFT: u32 = 3;
/// Key id for `ArrowRight`.
pub const KEY_RIGHT: u32 = 4;
/// Key id for `KeyW`.
pub const KEY_W: u32 = 5;
/// Key id for `KeyA`.
pub const KEY_A: u32 = 6;
/// Key id for `KeyS`.
pub const KEY_S: u32 = 7;
/// Key id for `KeyD`.
pub const KEY_D: u32 = 8;
/// Key id for `Space`.
pub const KEY_SPACE: u32 = 9;
/// Key id for `Enter`.
pub const KEY_ENTER: u32 = 10;
/// Key id for `Escape`.
pub const KEY_ESCAPE: u32 = 11;
/// Key id for `KeyP`.
pub const KEY_P: u32 = 12;
/// Key id for `KeyM`.
pub const KEY_M: u32 = 13;

/// Highest valid key id.
pub const KEY_MAX: u32 = 13;

/// Human label for a key id (rebind screens and the web settings panel).
pub fn key_label(id: u32) -> &'static str {
    match id {
        KEY_UP => "Up",
        KEY_DOWN => "Down",
        KEY_LEFT => "Left",
        KEY_RIGHT => "Right",
        KEY_W => "W",
        KEY_A => "A",
        KEY_S => "S",
        KEY_D => "D",
        KEY_SPACE => "Space",
        KEY_ENTER => "Enter",
        KEY_ESCAPE => "Esc",
        KEY_P => "P",
        KEY_M => "M",
        _ => "?",
    }
}

/// Map a wire key id to a config [`Key`]. `None` means unknown to this
/// layer (the harness never sends one, but the boundary stays total).
pub fn key_from_id(id: u32) -> Option<Key> {
    match id {
        KEY_UP => Some(Key::Up),
        KEY_DOWN => Some(Key::Down),
        KEY_LEFT => Some(Key::Left),
        KEY_RIGHT => Some(Key::Right),
        KEY_W => Some(Key::W),
        KEY_A => Some(Key::A),
        KEY_S => Some(Key::S),
        KEY_D => Some(Key::D),
        KEY_SPACE => Some(Key::Space),
        KEY_ENTER => Some(Key::Enter),
        KEY_ESCAPE => Some(Key::Escape),
        KEY_P => Some(Key::P),
        KEY_M => Some(Key::M),
        _ => None,
    }
}

/// Map a wire key id back from a config [`Key`] (rebind display).
/// `Key::Char` has no web key cap and maps to `None`.
pub fn id_from_key(key: Key) -> Option<u32> {
    match key {
        Key::Up => Some(KEY_UP),
        Key::Down => Some(KEY_DOWN),
        Key::Left => Some(KEY_LEFT),
        Key::Right => Some(KEY_RIGHT),
        Key::W => Some(KEY_W),
        Key::A => Some(KEY_A),
        Key::S => Some(KEY_S),
        Key::D => Some(KEY_D),
        Key::Space => Some(KEY_SPACE),
        Key::Enter => Some(KEY_ENTER),
        Key::Escape => Some(KEY_ESCAPE),
        Key::P => Some(KEY_P),
        Key::M => Some(KEY_M),
        Key::Char(_) => None,
    }
}

/// Resolve a key id to the bound movement heading through `map`.
/// Returns `None` for UI-only keys and unknown ids.
pub fn dir_from_id(id: u32, map: &Keymap) -> Option<Dir> {
    let key = key_from_id(id)?;
    [
        (Action::Up, Dir::Up),
        (Action::Down, Dir::Down),
        (Action::Left, Dir::Left),
        (Action::Right, Dir::Right),
    ]
    .iter()
    .find(|(action, _)| map.keys(*action).contains(&key))
    .map(|(_, dir)| *dir)
}

/// Resolve a key id to its bound non-movement [`Action`], if any.
pub fn action_from_id(id: u32, map: &Keymap) -> Option<Action> {
    let key = key_from_id(id)?;
    [Action::Pause, Action::Confirm, Action::Back, Action::Mute]
        .iter()
        .copied()
        .find(|action| map.keys(*action).contains(&key))
}

/// Minimum swipe length in CSS pixels before a touch counts as a turn.
pub const SWIPE_DEADZONE_PX: f32 = 24.0;

/// Map a touch swipe delta to a heading: dominant axis wins, tiny
/// drags stay `None` so taps never turn Pip by accident.
pub fn swipe_dir(dx: f32, dy: f32) -> Option<Dir> {
    if !dx.is_finite() || !dy.is_finite() {
        return None;
    }
    if dx.abs().max(dy.abs()) < SWIPE_DEADZONE_PX {
        return None;
    }
    if dx.abs() >= dy.abs() {
        Some(if dx > 0.0 { Dir::Right } else { Dir::Left })
    } else {
        Some(if dy > 0.0 { Dir::Down } else { Dir::Up })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_table_round_trips() {
        for id in 1..=KEY_MAX {
            let key = key_from_id(id).expect("every id maps");
            assert_eq!(id_from_key(key), Some(id), "id {id}");
            assert_ne!(key_label(id), "?");
        }
        assert_eq!(key_from_id(0), None);
        assert_eq!(key_from_id(99), None);
        assert_eq!(id_from_key(Key::Char('z')), None);
    }

    #[test]
    fn defaults_map_arrows_and_wasd() {
        let map = Keymap::defaults();
        assert_eq!(dir_from_id(KEY_UP, &map), Some(Dir::Up));
        assert_eq!(dir_from_id(KEY_W, &map), Some(Dir::Up));
        assert_eq!(dir_from_id(KEY_A, &map), Some(Dir::Left));
        assert_eq!(dir_from_id(KEY_S, &map), Some(Dir::Down));
        assert_eq!(dir_from_id(KEY_D, &map), Some(Dir::Right));
        assert_eq!(dir_from_id(KEY_SPACE, &map), None);
        assert_eq!(dir_from_id(99, &map), None);
    }

    #[test]
    fn rebinds_apply_to_direction_lookup() {
        let mut map = Keymap::defaults();
        // Park Pause on an unbound Char key first (every hardware key is
        // bound by default, exactly like the desktop policy), then move
        // P over to Up: W stops steering, Up and P steer.
        map.rebind(Action::Pause, Key::Char('p'))
            .expect("park works");
        map.rebind(Action::Up, Key::P).expect("rebind works");
        // Replace semantics (shared with desktop): Up is now P alone.
        assert_eq!(dir_from_id(KEY_P, &map), Some(Dir::Up));
        assert_eq!(dir_from_id(KEY_UP, &map), None);
        assert_eq!(dir_from_id(KEY_W, &map), None);
    }

    #[test]
    fn ui_actions_resolve() {
        let map = Keymap::defaults();
        assert_eq!(action_from_id(KEY_P, &map), Some(Action::Pause));
        assert_eq!(action_from_id(KEY_ENTER, &map), Some(Action::Confirm));
        assert_eq!(action_from_id(KEY_ESCAPE, &map), Some(Action::Back));
        assert_eq!(action_from_id(KEY_M, &map), Some(Action::Mute));
        assert_eq!(action_from_id(KEY_UP, &map), None);
    }

    #[test]
    fn swipe_needs_deadzone_and_picks_dominant_axis() {
        assert_eq!(swipe_dir(5.0, 3.0), None);
        assert_eq!(swipe_dir(0.0, 0.0), None);
        assert_eq!(swipe_dir(60.0, 10.0), Some(Dir::Right));
        assert_eq!(swipe_dir(-60.0, 10.0), Some(Dir::Left));
        assert_eq!(swipe_dir(10.0, 80.0), Some(Dir::Down));
        assert_eq!(swipe_dir(10.0, -80.0), Some(Dir::Up));
        // Ties prefer horizontal, matching d-pad intuition.
        assert_eq!(swipe_dir(50.0, 50.0), Some(Dir::Right));
        assert_eq!(swipe_dir(f32::NAN, 50.0), None);
        assert_eq!(swipe_dir(50.0, f32::INFINITY), None);
    }
}
