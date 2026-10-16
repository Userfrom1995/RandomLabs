//! Desktop gamepad mapping: gilrs buttons and sticks to engine intent.
//!
//! All mapping is pure and hardware-free: [`stick_to_dir`] turns a stick
//! deflection into a heading, [`PadMap`] binds [`Action`]s to pad
//! buttons with the same duplicate rejection the keyboard keymap uses,
//! and [`button_code`] / [`button_from_code`] give every bound button a
//! stable integer for the save file. Hardware polling ([`PadPoll`])
//! wraps `gilrs::Gilrs` and degrades to "no gamepad" when no backend or
//! device exists; gameplay never branches on gamepad presence beyond
//! reading extra input.
//!
//! Stick polarity: gilrs reports stick-up as positive Y. If a per-OS
//! hardware pass ever shows an inverted device,
//! [`STICK_Y_UP_POSITIVE`] is the single flip point.

use gilrs::{Axis, Button, EventType, Gilrs};
use maze_chase_config::Action;
use maze_chase_engine::actors::Dir;

/// Stick deflection below this magnitude is rest (drift guard).
pub const DEADZONE: f32 = 0.35;
/// Polarity of the Y axis: `true` means positive Y is stick-up.
pub const STICK_Y_UP_POSITIVE: bool = true;

/// Dominant-axis stick heading with a deadzone. Diagonals resolve to
/// the stronger axis; rest is `None`.
pub fn stick_to_dir(x: f32, y: f32) -> Option<Dir> {
    let y = if STICK_Y_UP_POSITIVE { y } else { -y };
    let (ax, ay) = (x.abs(), y.abs());
    if ax < DEADZONE && ay < DEADZONE {
        return None;
    }
    if ax >= ay {
        Some(if x > 0.0 { Dir::Right } else { Dir::Left })
    } else {
        Some(if y > 0.0 { Dir::Up } else { Dir::Down })
    }
}

/// Stable save-file code for a button (`None` for `Unknown`).
pub fn button_code(b: Button) -> Option<u16> {
    Some(match b {
        Button::South => 0,
        Button::East => 1,
        Button::West => 2,
        Button::North => 3,
        Button::C => 4,
        Button::Z => 5,
        Button::LeftTrigger => 6,
        Button::LeftTrigger2 => 7,
        Button::RightTrigger => 8,
        Button::RightTrigger2 => 9,
        Button::Select => 10,
        Button::Start => 11,
        Button::Mode => 12,
        Button::LeftThumb => 13,
        Button::RightThumb => 14,
        Button::DPadUp => 15,
        Button::DPadDown => 16,
        Button::DPadLeft => 17,
        Button::DPadRight => 18,
        Button::Unknown => return None,
    })
}

/// Inverse of [`button_code`].
pub fn button_from_code(code: u16) -> Option<Button> {
    Some(match code {
        0 => Button::South,
        1 => Button::East,
        2 => Button::West,
        3 => Button::North,
        4 => Button::C,
        5 => Button::Z,
        6 => Button::LeftTrigger,
        7 => Button::LeftTrigger2,
        8 => Button::RightTrigger,
        9 => Button::RightTrigger2,
        10 => Button::Select,
        11 => Button::Start,
        12 => Button::Mode,
        13 => Button::LeftThumb,
        14 => Button::RightThumb,
        15 => Button::DPadUp,
        16 => Button::DPadDown,
        17 => Button::DPadLeft,
        18 => Button::DPadRight,
        _ => return None,
    })
}

fn action_index(action: Action) -> usize {
    match action {
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

/// Remappable pad bindings: one button per [`Action`].
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct PadMap {
    binds: [Option<Button>; 8],
}

impl PadMap {
    /// Shipped defaults: D-pad steers, Start pauses, South confirms,
    /// East backs out, North mutes. (The stick also always steers via
    /// [`stick_to_dir`], independent of these binds.)
    pub fn defaults() -> Self {
        let mut m = Self { binds: [None; 8] };
        m.binds[action_index(Action::Up)] = Some(Button::DPadUp);
        m.binds[action_index(Action::Down)] = Some(Button::DPadDown);
        m.binds[action_index(Action::Left)] = Some(Button::DPadLeft);
        m.binds[action_index(Action::Right)] = Some(Button::DPadRight);
        m.binds[action_index(Action::Pause)] = Some(Button::Start);
        m.binds[action_index(Action::Confirm)] = Some(Button::South);
        m.binds[action_index(Action::Back)] = Some(Button::East);
        m.binds[action_index(Action::Mute)] = Some(Button::North);
        m
    }

    /// Button bound to `action` (if any).
    pub fn button(&self, action: Action) -> Option<Button> {
        self.binds[action_index(action)]
    }

    /// Resolve a pressed button to its action.
    pub fn action_for_button(&self, b: Button) -> Option<Action> {
        Action::ALL
            .iter()
            .copied()
            .find(|&action| self.binds[action_index(action)] == Some(b))
    }

    /// Rebind `action` to `button`, rejecting buttons already taken by a
    /// *different* action (same rule as the keyboard keymap).
    pub fn rebind(&mut self, action: Action, button: Button) -> Result<(), String> {
        if let Some(other) = self.action_for_button(button) {
            if other != action {
                return Err(format!("{button:?} is already bound"));
            }
        }
        self.binds[action_index(action)] = Some(button);
        Ok(())
    }

    /// Serialize to the `padmap.cfg` line format (`pad_<action>=<code>`).
    pub fn save(&self) -> String {
        let mut out = String::from("# maze-chase padmap (button codes)\n");
        for action in Action::ALL {
            let value = self
                .button(action)
                .and_then(button_code)
                .map(|c| c.to_string())
                .unwrap_or_default();
            out.push_str(&format!("pad_{}={value}\n", action.as_str()));
        }
        out
    }

    /// Parse [`PadMap::save`] output; unknown lines are collected as
    /// warnings, bad codes fall back to unbound (never a panic).
    pub fn parse(text: &str) -> (Self, Vec<String>) {
        let mut map = Self { binds: [None; 8] };
        let mut warnings = Vec::new();
        for (n, line) in text.lines().enumerate() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let Some((key, value)) = line.split_once('=') else {
                warnings.push(format!("line {}: no `=`", n + 1));
                continue;
            };
            let Some(action_name) = key.trim().strip_prefix("pad_") else {
                warnings.push(format!("line {}: not a pad_ key", n + 1));
                continue;
            };
            let Some(action) = Action::parse(action_name.trim()) else {
                warnings.push(format!("line {}: unknown action", n + 1));
                continue;
            };
            let value = value.trim();
            if value.is_empty() {
                continue;
            }
            match value.parse::<u16>().ok().and_then(button_from_code) {
                Some(b) => map.binds[action_index(action)] = Some(b),
                None => warnings.push(format!("line {}: bad button code", n + 1)),
            }
        }
        (map, warnings)
    }
}

/// One debounced pad intent for the session layer.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct PadEvent {
    pub action: Action,
    pub pressed: bool,
}

/// Hardware poller. Absent backends/devices are a clean empty state,
/// never an error at the session layer.
pub struct PadPoll {
    gilrs: Option<Gilrs>,
    stick: (f32, f32),
}

impl PadPoll {
    /// Probe the OS backend. Succeeds whether or not a pad is plugged
    /// in; only a broken backend yields the absent state.
    pub fn probe() -> Self {
        Self {
            gilrs: Gilrs::new().ok(),
            stick: (0.0, 0.0),
        }
    }

    /// Forced absent state (tests, `--no-pad` paths).
    pub fn absent() -> Self {
        Self {
            gilrs: None,
            stick: (0.0, 0.0),
        }
    }

    /// True when the backend itself is missing.
    pub fn backend_missing(&self) -> bool {
        self.gilrs.is_none()
    }

    /// Names of currently connected pads.
    pub fn pad_names(&self) -> Vec<String> {
        match &self.gilrs {
            None => Vec::new(),
            Some(g) => g.gamepads().map(|(_, p)| p.name().to_string()).collect(),
        }
    }

    /// Current stick heading (deadzoned), if any pad is connected.
    pub fn stick_dir(&self) -> Option<Dir> {
        self.gilrs.as_ref()?;
        stick_to_dir(self.stick.0, self.stick.1)
    }

    /// Mutable backend handle (session capture path only).
    pub fn gilrs_mut(&mut self) -> Option<&mut Gilrs> {
        self.gilrs.as_mut()
    }

    /// Drain pending button presses/releases into pad events. Stick
    /// motion updates the cached deflection (read via [`stick_dir`]).
    pub fn drain(&mut self, map: &PadMap) -> Vec<PadEvent> {
        let mut out = Vec::new();
        let gilrs = match self.gilrs.as_mut() {
            None => return out,
            Some(g) => g,
        };
        while let Some(ev) = gilrs.next_event() {
            match ev.event {
                EventType::ButtonPressed(b, _) => {
                    if let Some(action) = map.action_for_button(b) {
                        out.push(PadEvent {
                            action,
                            pressed: true,
                        });
                    }
                }
                EventType::ButtonReleased(b, _) => {
                    if let Some(action) = map.action_for_button(b) {
                        out.push(PadEvent {
                            action,
                            pressed: false,
                        });
                    }
                }
                EventType::AxisChanged(Axis::LeftStickX, v, _) => self.stick.0 = v,
                EventType::AxisChanged(Axis::LeftStickY, v, _) => self.stick.1 = v,
                EventType::Connected | EventType::Disconnected => {}
                _ => {}
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stick_deadzone_and_dominant_axis() {
        assert_eq!(stick_to_dir(0.0, 0.0), None);
        assert_eq!(stick_to_dir(0.2, -0.1), None);
        assert_eq!(stick_to_dir(0.9, 0.0), Some(Dir::Right));
        assert_eq!(stick_to_dir(-0.9, 0.0), Some(Dir::Left));
        assert_eq!(stick_to_dir(0.0, 0.9), Some(Dir::Up));
        assert_eq!(stick_to_dir(0.0, -0.9), Some(Dir::Down));
        // Diagonal resolves to the stronger axis.
        assert_eq!(stick_to_dir(0.4, 0.9), Some(Dir::Up));
        assert_eq!(stick_to_dir(-0.9, 0.4), Some(Dir::Left));
        // Just past the deadzone still steers.
        assert_eq!(stick_to_dir(DEADZONE + 0.01, 0.0), Some(Dir::Right));
    }

    #[test]
    fn button_codes_round_trip_all_variants() {
        let buttons = [
            Button::South,
            Button::East,
            Button::West,
            Button::North,
            Button::C,
            Button::Z,
            Button::LeftTrigger,
            Button::LeftTrigger2,
            Button::RightTrigger,
            Button::RightTrigger2,
            Button::Select,
            Button::Start,
            Button::Mode,
            Button::LeftThumb,
            Button::RightThumb,
            Button::DPadUp,
            Button::DPadDown,
            Button::DPadLeft,
            Button::DPadRight,
        ];
        assert_eq!(buttons.len(), 19);
        for b in buttons {
            let code = button_code(b).unwrap();
            assert_eq!(button_from_code(code), Some(b));
        }
        assert_eq!(button_code(Button::Unknown), None);
        assert_eq!(button_from_code(99), None);
    }

    #[test]
    fn default_map_steers_confirms_pauses_backs_mutes() {
        let map = PadMap::defaults();
        assert_eq!(map.action_for_button(Button::DPadUp), Some(Action::Up));
        assert_eq!(map.action_for_button(Button::DPadDown), Some(Action::Down));
        assert_eq!(map.action_for_button(Button::DPadLeft), Some(Action::Left));
        assert_eq!(
            map.action_for_button(Button::DPadRight),
            Some(Action::Right)
        );
        assert_eq!(map.action_for_button(Button::Start), Some(Action::Pause));
        assert_eq!(map.action_for_button(Button::South), Some(Action::Confirm));
        assert_eq!(map.action_for_button(Button::East), Some(Action::Back));
        assert_eq!(map.action_for_button(Button::North), Some(Action::Mute));
        assert_eq!(map.action_for_button(Button::West), None);
    }

    #[test]
    fn rebind_rejects_duplicates_like_the_keymap() {
        let mut map = PadMap::defaults();
        // South is taken by Confirm: Back cannot steal it.
        assert!(map.rebind(Action::Back, Button::South).is_err());
        assert_eq!(map.action_for_button(Button::South), Some(Action::Confirm));
        // Rebinding to the same button is a no-op success.
        assert!(map.rebind(Action::Confirm, Button::South).is_ok());
        // A free button moves cleanly.
        assert!(map.rebind(Action::Back, Button::West).is_ok());
        assert_eq!(map.action_for_button(Button::West), Some(Action::Back));
    }

    #[test]
    fn padmap_save_parse_round_trip_with_warnings() {
        let mut map = PadMap::defaults();
        map.rebind(Action::Mute, Button::Select).unwrap();
        let text = map.save();
        let (back, warnings) = PadMap::parse(&text);
        assert!(warnings.is_empty());
        assert_eq!(back, map);
        // Corrupt lines warn but never panic; bad codes unbind.
        let (partial, warnings) = PadMap::parse("pad_up=15\nbogus\npad_down=99\npad_left=\n");
        assert_eq!(warnings.len(), 2);
        assert_eq!(partial.button(Action::Up), Some(Button::DPadUp));
        assert_eq!(partial.button(Action::Down), None);
        assert_eq!(partial.button(Action::Left), None);
    }

    #[test]
    fn absent_poll_is_a_clean_empty_state() {
        let mut poll = PadPoll::absent();
        assert!(poll.backend_missing());
        assert!(poll.pad_names().is_empty());
        assert_eq!(poll.stick_dir(), None);
        assert!(poll.drain(&PadMap::defaults()).is_empty());
    }

    #[test]
    fn live_probe_never_panics_without_hardware() {
        // Passes with zero pads on CI and with real pads on desks: the
        // contract is "no panic, well-formed state", not a device count.
        let mut poll = PadPoll::probe();
        let names = poll.pad_names();
        assert!(names.iter().all(|n| !n.is_empty()));
        let events = poll.drain(&PadMap::defaults());
        assert!(events.len() < 1024);
    }
}
