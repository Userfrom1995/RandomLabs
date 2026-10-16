//! Layer-neutral key bindings.
//!
//! [`Keymap`] stores, per [`Action`], the list of [`Key`] values that
//! trigger it. Movement actions bind BOTH the arrow key and its WASD
//! twin by default (so layers resolve either physical key to the same
//! intent); all other actions bind a single key. [`Keymap::rebind`]
//! replaces one action's list after rejecting keys already taken by a
//! *different* action, so no physical key ever means two things at once.

/// Layer-neutral key identity (no winit / SDL dependency).
#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub enum Key {
    Up,
    Down,
    Left,
    Right,
    W,
    A,
    S,
    D,
    Space,
    Enter,
    Escape,
    P,
    M,
    Char(char),
}

impl Key {
    /// Stable identifier used in save files (`bind_<action>` lists).
    pub fn as_str(self) -> String {
        match self {
            Key::Up => "Up".to_string(),
            Key::Down => "Down".to_string(),
            Key::Left => "Left".to_string(),
            Key::Right => "Right".to_string(),
            Key::W => "W".to_string(),
            Key::A => "A".to_string(),
            Key::S => "S".to_string(),
            Key::D => "D".to_string(),
            Key::Space => "Space".to_string(),
            Key::Enter => "Enter".to_string(),
            Key::Escape => "Escape".to_string(),
            Key::P => "P".to_string(),
            Key::M => "M".to_string(),
            Key::Char(c) => c.to_string(),
        }
    }

    /// Parse [`Key::as_str`] output. Single printable characters (other
    /// than whitespace / comma, which would break the save format) parse
    /// as `Char`; everything else must match a named key exactly.
    /// Returns `None` for empty or unknown tokens.
    pub fn parse(text: &str) -> Option<Self> {
        let t = text.trim();
        match t {
            "Up" => Some(Key::Up),
            "Down" => Some(Key::Down),
            "Left" => Some(Key::Left),
            "Right" => Some(Key::Right),
            "W" => Some(Key::W),
            "A" => Some(Key::A),
            "S" => Some(Key::S),
            "D" => Some(Key::D),
            "Space" => Some(Key::Space),
            "Enter" => Some(Key::Enter),
            "Escape" => Some(Key::Escape),
            "P" => Some(Key::P),
            "M" => Some(Key::M),
            _ => {
                let mut chars = t.chars();
                match (chars.next(), chars.next()) {
                    (Some(c), None)
                        if !c.is_whitespace() && c != ',' && c != '=' && !c.is_control() =>
                    {
                        Some(Key::Char(c))
                    }
                    _ => None,
                }
            }
        }
    }
}

/// Intent an input layer can trigger.
#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub enum Action {
    Up,
    Down,
    Left,
    Right,
    Pause,
    Confirm,
    Back,
    Mute,
}

impl Action {
    /// All actions in save-file order.
    pub const ALL: [Action; 8] = [
        Action::Up,
        Action::Down,
        Action::Left,
        Action::Right,
        Action::Pause,
        Action::Confirm,
        Action::Back,
        Action::Mute,
    ];

    /// Stable identifier used as the `bind_<id>` save key suffix.
    pub fn as_str(self) -> &'static str {
        match self {
            Action::Up => "up",
            Action::Down => "down",
            Action::Left => "left",
            Action::Right => "right",
            Action::Pause => "pause",
            Action::Confirm => "confirm",
            Action::Back => "back",
            Action::Mute => "mute",
        }
    }

    /// Parse [`Action::as_str`] output (case-insensitive, trimmed).
    pub fn parse(text: &str) -> Option<Self> {
        match text.trim().to_ascii_lowercase().as_str() {
            "up" => Some(Action::Up),
            "down" => Some(Action::Down),
            "left" => Some(Action::Left),
            "right" => Some(Action::Right),
            "pause" => Some(Action::Pause),
            "confirm" => Some(Action::Confirm),
            "back" => Some(Action::Back),
            "mute" => Some(Action::Mute),
            _ => None,
        }
    }

    fn index(self) -> usize {
        match self {
            Action::Up => 0,
            Action::Down => 1,
            Action::Left => 2,
            Action::Right => 3,
            Action::Pause => 4,
            Action::Confirm => 5,
            Action::Back => 6,
            Action::Mute => 7,
        }
    }
}

/// Per-action key bindings.
///
/// Internally one `Vec<Key>` per action in [`Action::ALL`] order, so
/// movement can honestly hold both arrows and WASD while the save format
/// stays a flat comma list per action.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Keymap {
    binds: [Vec<Key>; 8],
}

impl Keymap {
    /// Default bindings: arrows plus WASD twins on movement; `P` pause,
    /// `Enter`/`Space` confirm, `Escape` back, `M` mute.
    pub fn defaults() -> Self {
        Self {
            binds: [
                vec![Key::Up, Key::W],
                vec![Key::Down, Key::S],
                vec![Key::Left, Key::A],
                vec![Key::Right, Key::D],
                vec![Key::P],
                vec![Key::Enter, Key::Space],
                vec![Key::Escape],
                vec![Key::M],
            ],
        }
    }

    /// Keys currently bound to `action` (a live slice of the binding list).
    pub fn keys(&self, action: Action) -> &[Key] {
        &self.binds[action.index()]
    }

    /// Replace `action`'s binding list with the single `key`.
    ///
    /// Fails with a human-readable message when `key` is already bound to
    /// a *different* action. Re-adding a key the same action already holds
    /// is idempotent `Ok` (the list is left untouched).
    pub fn rebind(&mut self, action: Action, key: Key) -> Result<(), String> {
        let idx = action.index();
        if self.binds[idx].contains(&key) {
            return Ok(());
        }
        for (i, list) in self.binds.iter().enumerate() {
            if i != idx && list.contains(&key) {
                return Err(format!(
                    "key {:?} is already bound to {:?}",
                    key,
                    Action::ALL[i]
                ));
            }
        }
        self.binds[idx] = vec![key];
        Ok(())
    }

    /// Restore [`Keymap::defaults`].
    pub fn reset(&mut self) {
        *self = Self::defaults();
    }

    /// Replace one action's full key list (used by the save loader after
    /// it has validated the whole list; rejects cross-action duplicates).
    pub(crate) fn set_keys(&mut self, action: Action, keys: Vec<Key>) -> Result<(), String> {
        let idx = action.index();
        for (i, list) in self.binds.iter().enumerate() {
            if i == idx {
                continue;
            }
            for k in &keys {
                if list.contains(k) {
                    return Err(format!(
                        "key {:?} is already bound to {:?}",
                        k,
                        Action::ALL[i]
                    ));
                }
            }
        }
        // No key may repeat inside one action either.
        let mut seen = Vec::with_capacity(keys.len());
        for k in &keys {
            if seen.contains(k) {
                return Err(format!("duplicate key {:?} for {:?}", k, action));
            }
            seen.push(*k);
        }
        self.binds[idx] = keys;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn contains(keys: &[Key], key: Key) -> bool {
        keys.contains(&key)
    }

    #[test]
    fn defaults_have_arrows_plus_wasd_on_movement() {
        let map = Keymap::defaults();
        assert!(contains(map.keys(Action::Up), Key::Up));
        assert!(contains(map.keys(Action::Up), Key::W));
        assert!(contains(map.keys(Action::Down), Key::Down));
        assert!(contains(map.keys(Action::Down), Key::S));
        assert!(contains(map.keys(Action::Left), Key::Left));
        assert!(contains(map.keys(Action::Left), Key::A));
        assert!(contains(map.keys(Action::Right), Key::Right));
        assert!(contains(map.keys(Action::Right), Key::D));
        // Single-key actions still resolve.
        assert_eq!(map.keys(Action::Pause), &[Key::P]);
        assert_eq!(map.keys(Action::Mute), &[Key::M]);
    }

    #[test]
    fn duplicate_across_actions_rejected() {
        let mut map = Keymap::defaults();
        // `W` already drives Up: giving it to Pause must fail.
        assert!(map.rebind(Action::Pause, Key::W).is_err());
        // The failed rebind leaves Pause untouched.
        assert_eq!(map.keys(Action::Pause), &[Key::P]);
        // A free key works.
        assert!(map.rebind(Action::Pause, Key::Space).is_err()); // taken by Confirm
        assert!(map.rebind(Action::Pause, Key::Char('x')).is_ok());
        assert_eq!(map.keys(Action::Pause), &[Key::Char('x')]);
    }

    #[test]
    fn same_action_rebind_is_idempotent() {
        let mut map = Keymap::defaults();
        let before = map.clone();
        // `W` is already on Up: Ok with no change (both twins kept).
        assert!(map.rebind(Action::Up, Key::W).is_ok());
        assert_eq!(map, before);
        assert!(map.rebind(Action::Up, Key::Up).is_ok());
        assert_eq!(map, before);
    }

    #[test]
    fn reset_restores_defaults() {
        let mut map = Keymap::defaults();
        map.rebind(Action::Pause, Key::Char('x')).unwrap();
        assert_ne!(map, Keymap::defaults());
        map.reset();
        assert_eq!(map, Keymap::defaults());
    }

    #[test]
    fn key_and_action_str_round_trip() {
        for k in [
            Key::Up,
            Key::Down,
            Key::Left,
            Key::Right,
            Key::W,
            Key::A,
            Key::S,
            Key::D,
            Key::Space,
            Key::Enter,
            Key::Escape,
            Key::P,
            Key::M,
            Key::Char('z'),
        ] {
            assert_eq!(Key::parse(&k.as_str()), Some(k));
        }
        assert_eq!(Key::parse(""), None);
        assert_eq!(Key::parse("Nope"), None);
        for a in Action::ALL {
            assert_eq!(Action::parse(a.as_str()), Some(a));
        }
        assert_eq!(Action::parse("dance"), None);
    }
}
