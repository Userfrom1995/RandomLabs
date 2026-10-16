//! Desktop screen flow: pure menu state machine over the pixel UI.
//!
//! Mirrors the terminal [`ScreenId`] flow (title, help, scores,
//! settings, rebind, playing, paused, over) with two desktop additions:
//! an [`ScreenId::Audio`] screen (master/music/SFX sliders plus mute,
//! driven by the rodio backend) and a [`ScreenId::PadBind`] screen
//! (gamepad remap capture). Navigation consumes layer-neutral
//! [`Action`]s and returns [`Event`]s the session applies; all text
//! renders through the 5x7 face (already uppercase).

use crate::gamepad::PadMap;
use gilrs::Button;
use maze_chase_config::{keymap::Action, Key, Keymap, Settings};

/// Visible surface.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ScreenId {
    Title,
    Help,
    Scores,
    Settings,
    Audio,
    Rebind,
    PadBind,
    Playing,
    Paused,
    Over,
}

/// Title menu entries in order.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum MenuItem {
    Play,
    Help,
    Scores,
    Settings,
    Audio,
    Quit,
}

impl MenuItem {
    pub const ALL: [MenuItem; 6] = [
        MenuItem::Play,
        MenuItem::Help,
        MenuItem::Scores,
        MenuItem::Settings,
        MenuItem::Audio,
        MenuItem::Quit,
    ];

    pub fn label(self) -> &'static str {
        match self {
            MenuItem::Play => "PLAY",
            MenuItem::Help => "HOW TO PLAY",
            MenuItem::Scores => "HIGH SCORES",
            MenuItem::Settings => "SETTINGS",
            MenuItem::Audio => "AUDIO",
            MenuItem::Quit => "QUIT",
        }
    }
}

/// Pause menu entries in order.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum PauseItem {
    Resume,
    QuitToTitle,
}

impl PauseItem {
    pub const ALL: [PauseItem; 2] = [PauseItem::Resume, PauseItem::QuitToTitle];

    pub fn label(self) -> &'static str {
        match self {
            PauseItem::Resume => "RESUME",
            PauseItem::QuitToTitle => "QUIT TO TITLE",
        }
    }
}

/// Settings rows in order (volumes live on the Audio screen).
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum SettingsRow {
    Difficulty,
    Theme,
    ReducedFlash,
    ShowFps,
    Keybinds,
    Padbinds,
    Back,
}

impl SettingsRow {
    pub const ALL: [SettingsRow; 7] = [
        SettingsRow::Difficulty,
        SettingsRow::Theme,
        SettingsRow::ReducedFlash,
        SettingsRow::ShowFps,
        SettingsRow::Keybinds,
        SettingsRow::Padbinds,
        SettingsRow::Back,
    ];
}

/// Audio rows in order.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum AudioRow {
    Master,
    Music,
    Sfx,
    Mute,
    Back,
}

impl AudioRow {
    pub const ALL: [AudioRow; 5] = [
        AudioRow::Master,
        AudioRow::Music,
        AudioRow::Sfx,
        AudioRow::Mute,
        AudioRow::Back,
    ];
}

/// Side effects the session must apply after navigation.
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum Event {
    None,
    StartGame,
    PauseGame,
    ResumeGame,
    Quit,
    QuitToTitle,
    SettingsCommitted,
    RebindFailed(String),
}

/// Pure screen flow plus the working settings copy.
#[derive(Clone, Debug)]
pub struct Screens {
    pub current: ScreenId,
    pub menu: usize,
    pub pause_menu: usize,
    pub settings_row: usize,
    pub audio_row: usize,
    pub rebind_action: usize,
    pub padbind_action: usize,
    /// Keyboard capture armed for this action (Rebind screen).
    pub capture: Option<Action>,
    pub capture_error: Option<String>,
    /// Gamepad capture armed for this action (PadBind screen).
    pub pad_capture: Option<Action>,
    pub pad_capture_error: Option<String>,
    pub help_scroll: usize,
    pub settings: Settings,
    pub over_score: u32,
    pub over_level: u32,
    pub over_rank: Option<usize>,
}

impl Screens {
    pub fn new(settings: Settings) -> Self {
        Self {
            current: ScreenId::Title,
            menu: 0,
            pause_menu: 0,
            settings_row: 0,
            audio_row: 0,
            rebind_action: 0,
            padbind_action: 0,
            capture: None,
            capture_error: None,
            pad_capture: None,
            pad_capture_error: None,
            help_scroll: 0,
            settings,
            over_score: 0,
            over_level: 0,
            over_rank: None,
        }
    }

    pub fn show(&mut self, id: ScreenId) {
        self.current = id;
        self.capture = None;
        self.capture_error = None;
        self.pad_capture = None;
        self.pad_capture_error = None;
        if id == ScreenId::Title {
            self.menu = 0;
        }
        if id == ScreenId::Paused {
            self.pause_menu = 0;
        }
    }

    fn move_cursor(pos: &mut usize, len: usize, up: bool) {
        if len == 0 {
            return;
        }
        *pos = if up {
            pos.checked_sub(1).unwrap_or(len - 1)
        } else {
            (*pos + 1) % len
        };
    }

    /// Clamp a stored cursor to a valid item index (stored cursors are
    /// `pub` so out-of-range writes can never panic a `press` path).
    fn clamp_idx(pos: usize, len: usize) -> usize {
        if len == 0 {
            0
        } else {
            pos.min(len - 1)
        }
    }

    /// Route one action through the current screen.
    pub fn press(&mut self, action: Action) -> Event {
        match self.current {
            ScreenId::Title => match action {
                Action::Up => Self::move_cursor(&mut self.menu, MenuItem::ALL.len(), true),
                Action::Down => Self::move_cursor(&mut self.menu, MenuItem::ALL.len(), false),
                Action::Confirm => {
                    match MenuItem::ALL[Self::clamp_idx(self.menu, MenuItem::ALL.len())] {
                        MenuItem::Play => return Event::StartGame,
                        MenuItem::Help => self.show(ScreenId::Help),
                        MenuItem::Scores => self.show(ScreenId::Scores),
                        MenuItem::Settings => self.show(ScreenId::Settings),
                        MenuItem::Audio => self.show(ScreenId::Audio),
                        MenuItem::Quit => return Event::Quit,
                    }
                }
                Action::Back => return Event::Quit,
                _ => {}
            },
            ScreenId::Help => match action {
                Action::Up => self.help_scroll = self.help_scroll.saturating_sub(1),
                Action::Down => self.help_scroll = self.help_scroll.saturating_add(1),
                Action::Confirm | Action::Back => self.show(ScreenId::Title),
                _ => {}
            },
            ScreenId::Scores => match action {
                Action::Confirm | Action::Back => self.show(ScreenId::Title),
                _ => {}
            },
            ScreenId::Settings => match action {
                Action::Up => {
                    Self::move_cursor(&mut self.settings_row, SettingsRow::ALL.len(), true)
                }
                Action::Down => {
                    Self::move_cursor(&mut self.settings_row, SettingsRow::ALL.len(), false);
                }
                Action::Confirm => match SettingsRow::ALL
                    [Self::clamp_idx(self.settings_row, SettingsRow::ALL.len())]
                {
                    SettingsRow::Keybinds => self.show(ScreenId::Rebind),
                    SettingsRow::Padbinds => self.show(ScreenId::PadBind),
                    SettingsRow::Back => {
                        self.show(ScreenId::Title);
                        return Event::SettingsCommitted;
                    }
                    _ => self.adjust_notify(),
                },
                Action::Back => {
                    self.show(ScreenId::Title);
                    return Event::SettingsCommitted;
                }
                _ => {}
            },
            ScreenId::Audio => match action {
                Action::Up => Self::move_cursor(&mut self.audio_row, AudioRow::ALL.len(), true),
                Action::Down => Self::move_cursor(&mut self.audio_row, AudioRow::ALL.len(), false),
                Action::Confirm => {
                    match AudioRow::ALL[Self::clamp_idx(self.audio_row, AudioRow::ALL.len())] {
                        AudioRow::Mute => self.adjust_notify(),
                        AudioRow::Back => {
                            self.show(ScreenId::Title);
                            return Event::SettingsCommitted;
                        }
                        _ => {}
                    }
                }
                Action::Back => {
                    self.show(ScreenId::Title);
                    return Event::SettingsCommitted;
                }
                _ => {}
            },
            ScreenId::Rebind => match action {
                Action::Up => {
                    if self.capture.is_none() {
                        Self::move_cursor(&mut self.rebind_action, Action::ALL.len(), true)
                    }
                }
                Action::Down => {
                    if self.capture.is_none() {
                        Self::move_cursor(&mut self.rebind_action, Action::ALL.len(), false)
                    }
                }
                Action::Confirm => {
                    if self.capture.is_some() {
                        return Event::None;
                    }
                    self.capture =
                        Some(Action::ALL[Self::clamp_idx(self.rebind_action, Action::ALL.len())]);
                    self.capture_error = None;
                }
                Action::Back => {
                    self.show(ScreenId::Settings);
                    return Event::SettingsCommitted;
                }
                _ => {}
            },
            ScreenId::PadBind => match action {
                Action::Up => {
                    if self.pad_capture.is_none() {
                        Self::move_cursor(&mut self.padbind_action, Action::ALL.len(), true);
                    }
                }
                Action::Down => {
                    if self.pad_capture.is_none() {
                        Self::move_cursor(&mut self.padbind_action, Action::ALL.len(), false);
                    }
                }
                Action::Confirm => {
                    if self.pad_capture.is_some() {
                        return Event::None;
                    }
                    self.pad_capture =
                        Some(Action::ALL[Self::clamp_idx(self.padbind_action, Action::ALL.len())]);
                    self.pad_capture_error = None;
                }
                Action::Back => {
                    self.show(ScreenId::Settings);
                    return Event::SettingsCommitted;
                }
                _ => {}
            },
            ScreenId::Playing => {
                if action == Action::Pause {
                    self.show(ScreenId::Paused);
                    return Event::PauseGame;
                }
            }
            ScreenId::Paused => match action {
                Action::Up => Self::move_cursor(&mut self.pause_menu, PauseItem::ALL.len(), true),
                Action::Down => {
                    Self::move_cursor(&mut self.pause_menu, PauseItem::ALL.len(), false);
                }
                Action::Confirm => {
                    match PauseItem::ALL[Self::clamp_idx(self.pause_menu, PauseItem::ALL.len())] {
                        PauseItem::Resume => {
                            self.show(ScreenId::Playing);
                            return Event::ResumeGame;
                        }
                        PauseItem::QuitToTitle => return Event::QuitToTitle,
                    }
                }
                Action::Back => {
                    self.show(ScreenId::Playing);
                    return Event::ResumeGame;
                }
                _ => {}
            },
            ScreenId::Over => match action {
                Action::Confirm | Action::Back => self.show(ScreenId::Title),
                _ => {}
            },
        }
        Event::None
    }

    /// Toggle-style rows flip on Confirm (sliders go through `adjust`).
    fn adjust_notify(&mut self) {
        match self.current {
            ScreenId::Settings => {
                match SettingsRow::ALL[Self::clamp_idx(self.settings_row, SettingsRow::ALL.len())] {
                    SettingsRow::ReducedFlash => {
                        self.settings.reduced_flash = !self.settings.reduced_flash;
                    }
                    SettingsRow::ShowFps => {
                        let v = self.settings.show_fps;
                        self.settings.show_fps = !v;
                    }
                    SettingsRow::Difficulty => self.cycle_difficulty(1),
                    SettingsRow::Theme => self.cycle_theme(1),
                    _ => {}
                }
            }
            ScreenId::Audio
                if AudioRow::ALL[Self::clamp_idx(self.audio_row, AudioRow::ALL.len())]
                    == AudioRow::Mute =>
            {
                self.settings.mute = !self.settings.mute;
            }
            _ => {}
        }
    }

    /// Left/right adjustment for selector and slider rows.
    pub fn adjust(&mut self, left: bool) {
        let step = if left { -1 } else { 1 };
        match self.current {
            ScreenId::Settings => {
                match SettingsRow::ALL[Self::clamp_idx(self.settings_row, SettingsRow::ALL.len())] {
                    SettingsRow::Difficulty => self.cycle_difficulty(step),
                    SettingsRow::Theme => self.cycle_theme(step),
                    _ => {}
                }
            }
            ScreenId::Audio => {
                let delta = if left { -0.1 } else { 0.1 };
                match AudioRow::ALL[Self::clamp_idx(self.audio_row, AudioRow::ALL.len())] {
                    AudioRow::Master => {
                        self.settings.master = clamp01(self.settings.master + delta)
                    }
                    AudioRow::Music => self.settings.music = clamp01(self.settings.music + delta),
                    AudioRow::Sfx => self.settings.sfx = clamp01(self.settings.sfx + delta),
                    _ => {}
                }
            }
            _ => {}
        }
    }

    fn cycle_difficulty(&mut self, step: i32) {
        use maze_chase_config::Difficulty;
        let order = [Difficulty::Cozy, Difficulty::Standard, Difficulty::Harsh];
        let i = order
            .iter()
            .position(|&d| d == self.settings.difficulty)
            .unwrap_or(1);
        let n = ((i as i32 + step).rem_euclid(order.len() as i32)) as usize;
        self.settings.difficulty = order[n];
    }

    fn cycle_theme(&mut self, step: i32) {
        use maze_chase_config::settings::KNOWN_THEMES;
        let i = KNOWN_THEMES
            .iter()
            .position(|&t| t == self.settings.theme)
            .unwrap_or(0);
        let n = ((i as i32 + step).rem_euclid(KNOWN_THEMES.len() as i32)) as usize;
        self.settings.theme = KNOWN_THEMES[n].to_string();
    }

    /// Feed a captured keyboard key to an armed rebind.
    pub fn capture_key(&mut self, map: &mut Keymap, key: Key) -> Event {
        let Some(action) = self.capture else {
            return Event::None;
        };
        match map.rebind(action, key) {
            Ok(()) => {
                self.capture = None;
                self.capture_error = None;
                Event::SettingsCommitted
            }
            Err(e) => {
                self.capture_error = Some(e.clone());
                Event::RebindFailed(e)
            }
        }
    }

    /// Feed a captured pad button to an armed pad remap.
    pub fn capture_pad(&mut self, map: &mut PadMap, button: Button) -> Event {
        let Some(action) = self.pad_capture else {
            return Event::None;
        };
        match map.rebind(action, button) {
            Ok(()) => {
                self.pad_capture = None;
                self.pad_capture_error = None;
                Event::SettingsCommitted
            }
            Err(e) => {
                self.pad_capture_error = Some(e.clone());
                Event::RebindFailed(e)
            }
        }
    }

    /// Settings rows as (label, value) display pairs.
    pub fn settings_lines(&self) -> Vec<(String, String)> {
        vec![
            (
                "DIFFICULTY".into(),
                self.settings.difficulty.as_str().to_uppercase(),
            ),
            ("THEME".into(), self.settings.theme.to_uppercase()),
            ("REDUCED FLASH".into(), on_off(self.settings.reduced_flash)),
            ("SHOW FPS".into(), on_off(self.settings.show_fps)),
            ("KEYBINDS".into(), "EDIT >".into()),
            ("PADBINDS".into(), "EDIT >".into()),
            ("BACK".into(), "".into()),
        ]
    }

    /// Audio rows as (label, value) display pairs.
    pub fn audio_lines(&self) -> Vec<(String, String)> {
        vec![
            ("MASTER".into(), bar(self.settings.master)),
            ("MUSIC".into(), bar(self.settings.music)),
            ("SFX".into(), bar(self.settings.sfx)),
            ("MUTE".into(), on_off(self.settings.mute)),
            ("BACK".into(), "".into()),
        ]
    }
}

fn on_off(v: bool) -> String {
    if v {
        "ON".into()
    } else {
        "OFF".into()
    }
}

fn bar(v: f32) -> String {
    let filled = (v.clamp(0.0, 1.0) * 10.0).round() as usize;
    let mut s = String::with_capacity(12);
    for i in 0..10 {
        s.push(if i < filled { '#' } else { '-' });
    }
    s
}

fn clamp01(v: f32) -> f32 {
    if v.is_nan() {
        0.0
    } else {
        v.clamp(0.0, 1.0)
    }
}

/// Help body (scrollable window of [`HELP_WINDOW`] lines).
pub const HELP: &[&str] = &[
    "EAT EVERY CRUMB TO CLEAR",
    "THE WARREN.",
    "",
    "ARROWS OR WASD STEER PIP.",
    "THE LEFT AND RIGHT EDGES",
    "ARE TUNNELS.",
    "",
    "SUNSEEDS TURN THE HUNT:",
    "FRIGHTENED WARDENS ARE",
    "WORTH 200/400/800/1600",
    "IN ONE CHAIN. EYES DRIFT",
    "HOME AND REVIVE.",
    "",
    "RELISHES RIPEN AT 70 AND",
    "170 CRUMBS. EAT THEM FAST.",
    "",
    "EVERY 10000 POINTS EARNS",
    "A SPARE WICK.",
    "",
    "P PAUSES. M MUTES.",
    "F TOGGLES FULLSCREEN.",
    "ESC OPENS THE MENU.",
    "",
    "GAMEPAD: STICK OR D-PAD",
    "STEERS. A CONFIRMS.",
    "B BACKS OUT. START PAUSES.",
    "REMAP STICKS IN PADBINDS.",
];
/// Visible help lines per scroll window.
pub const HELP_WINDOW: usize = 12;

/// Scroll window over [`HELP`] starting at `scroll` (clamped).
pub fn help_window(scroll: usize) -> Vec<String> {
    let max_start = HELP.len().saturating_sub(HELP_WINDOW);
    let start = scroll.min(max_start);
    HELP[start..(start + HELP_WINDOW).min(HELP.len())]
        .iter()
        .map(|s| s.to_string())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use maze_chase_config::Difficulty;

    fn screens() -> Screens {
        Screens::new(Settings::for_difficulty(Difficulty::Standard))
    }

    #[test]
    fn title_navigates_to_every_surface() {
        let mut s = screens();
        // Play starts the game.
        assert_eq!(s.press(Action::Confirm), Event::StartGame);
        s.show(ScreenId::Title);
        s.press(Action::Down);
        s.press(Action::Confirm);
        assert_eq!(s.current, ScreenId::Help);
        // Help scrolls and backs out.
        s.press(Action::Down);
        assert_eq!(s.help_scroll, 1);
        s.press(Action::Back);
        assert_eq!(s.current, ScreenId::Title);
        // Cursor wraps around.
        s.press(Action::Up);
        assert_eq!(s.menu, MenuItem::ALL.len() - 1);
        s.press(Action::Confirm);
        // Quit is last.
        assert_eq!(s.current, ScreenId::Title);
    }

    #[test]
    fn title_audio_and_scores_open() {
        let mut s = screens();
        for _ in 0..2 {
            s.press(Action::Down);
        }
        s.press(Action::Confirm);
        assert_eq!(s.current, ScreenId::Scores);
        s.press(Action::Back);
        for _ in 0..4 {
            s.press(Action::Down);
        }
        s.press(Action::Confirm);
        assert_eq!(s.current, ScreenId::Audio);
        // Audio sliders adjust and commit on exit.
        s.press(Action::Down);
        s.press(Action::Down);
        let before = s.settings.sfx;
        s.adjust(false);
        assert!(s.settings.sfx > before);
        s.adjust(true);
        s.adjust(true);
        assert!(s.settings.sfx < before + 0.001);
        while s.current != ScreenId::Title {
            s.press(Action::Down);
            if s.audio_row == AudioRow::ALL.len() - 1 {
                assert_eq!(s.press(Action::Confirm), Event::SettingsCommitted);
            }
            if s.audio_row > 20 {
                panic!("audio exit unreachable");
            }
        }
    }

    #[test]
    fn settings_toggle_adjust_and_commit() {
        let mut s = screens();
        s.show(ScreenId::Settings);
        // Difficulty cycles through all three presets.
        s.press(Action::Confirm);
        let d1 = s.settings.difficulty;
        s.press(Action::Confirm);
        let d2 = s.settings.difficulty;
        assert_ne!(d1, d2);
        s.adjust(false);
        // Theme cycles without leaving known themes.
        s.press(Action::Down);
        let t0 = s.settings.theme.clone();
        s.press(Action::Confirm);
        assert_ne!(s.settings.theme, t0);
        assert!(maze_chase_config::settings::KNOWN_THEMES.contains(&s.settings.theme.as_str()));
        // Exit commits.
        s.settings_row = SettingsRow::ALL.len() - 1;
        assert_eq!(s.press(Action::Confirm), Event::SettingsCommitted);
        assert_eq!(s.current, ScreenId::Title);
    }

    #[test]
    fn rebind_capture_and_duplicate_rejection() {
        let mut s = screens();
        let mut map = Keymap::defaults();
        s.show(ScreenId::Rebind);
        s.press(Action::Confirm);
        assert_eq!(s.capture, Some(Action::Up));
        assert_eq!(
            s.capture_key(&mut map, Key::Char('q')),
            Event::SettingsCommitted
        );
        assert_eq!(s.capture, None);
        // Stealing an in-use key from a DIFFERENT action reports the
        // conflict and stays armed.
        s.press(Action::Down);
        s.press(Action::Confirm);
        let before = map.clone();
        match s.capture_key(&mut map, Key::Char('q')) {
            Event::RebindFailed(_) => {}
            other => panic!("expected RebindFailed, got {other:?}"),
        }
        assert!(s.capture_error.is_some());
        let _ = before;
    }

    #[test]
    fn padbind_capture_and_duplicate_rejection() {
        let mut s = screens();
        let mut map = PadMap::defaults();
        s.show(ScreenId::PadBind);
        // Arm the Confirm row (index of Confirm in Action::ALL).
        let confirm_idx = Action::ALL
            .iter()
            .position(|&a| a == Action::Confirm)
            .unwrap();
        while s.padbind_action != confirm_idx {
            s.press(Action::Down);
        }
        s.press(Action::Confirm);
        assert_eq!(s.pad_capture, Some(Action::Confirm));
        assert_eq!(
            s.capture_pad(&mut map, Button::West),
            Event::SettingsCommitted
        );
        assert_eq!(map.action_for_button(Button::West), Some(Action::Confirm));
        // DPadUp is taken: stays armed with an error.
        s.press(Action::Confirm);
        match s.capture_pad(&mut map, Button::DPadUp) {
            Event::RebindFailed(_) => {}
            other => panic!("expected RebindFailed, got {other:?}"),
        }
        assert!(s.pad_capture_error.is_some());
    }

    #[test]
    fn pause_resume_and_quit_flows() {
        let mut s = screens();
        s.show(ScreenId::Playing);
        assert_eq!(s.press(Action::Pause), Event::PauseGame);
        assert_eq!(s.current, ScreenId::Paused);
        assert_eq!(s.press(Action::Confirm), Event::ResumeGame);
        assert_eq!(s.current, ScreenId::Playing);
        s.press(Action::Pause);
        s.press(Action::Down);
        assert_eq!(s.press(Action::Confirm), Event::QuitToTitle);
        // Game-over returns to title on either key.
        s.show(ScreenId::Over);
        s.press(Action::Confirm);
        assert_eq!(s.current, ScreenId::Title);
    }

    #[test]
    fn volume_bar_renders_ten_cells() {
        assert_eq!(bar(1.0), "##########");
        assert_eq!(bar(0.0), "----------");
        assert_eq!(bar(0.5).len(), 10);
        assert_eq!(on_off(true), "ON");
    }
}
