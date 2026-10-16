//! Menu, help, scores, settings, and pause flows as pure state.
//!
//! [`Screens`] owns which surface is showing and the cursor positions;
//! the app applies side effects (starting runs, saving settings) from the
//! returned [`Event`]s. Key capture for rebinding is explicit state, not
//! a blocking prompt: selecting a binding arms capture, the next key
//! event completes or cancels it.

use maze_chase_config::settings::{Difficulty, Settings, KNOWN_THEMES};
use maze_chase_config::{Action, Key, Keymap};
use maze_chase_engine::actors::Dir;

/// Which surface is showing.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ScreenId {
    Title,
    Help,
    Scores,
    Settings,
    Rebind,
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
    Quit,
}

impl MenuItem {
    pub const ALL: [MenuItem; 5] = [
        MenuItem::Play,
        MenuItem::Help,
        MenuItem::Scores,
        MenuItem::Settings,
        MenuItem::Quit,
    ];

    pub fn label(self) -> &'static str {
        match self {
            MenuItem::Play => "Play",
            MenuItem::Help => "How to play",
            MenuItem::Scores => "High scores",
            MenuItem::Settings => "Settings",
            MenuItem::Quit => "Quit",
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
            PauseItem::Resume => "Resume",
            PauseItem::QuitToTitle => "Quit to title",
        }
    }
}

/// Settings rows in order.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum SettingsRow {
    Difficulty,
    Theme,
    Master,
    Music,
    Sfx,
    Mute,
    ReducedFlash,
    Keybinds,
    Back,
}

impl SettingsRow {
    pub const ALL: [SettingsRow; 9] = [
        SettingsRow::Difficulty,
        SettingsRow::Theme,
        SettingsRow::Master,
        SettingsRow::Music,
        SettingsRow::Sfx,
        SettingsRow::Mute,
        SettingsRow::ReducedFlash,
        SettingsRow::Keybinds,
        SettingsRow::Back,
    ];
}

/// Side effects the app must apply after navigation.
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum Event {
    None,
    StartGame,
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
    pub rebind_action: usize,
    /// Armed key capture: the next key press binds this action.
    pub capture: Option<Action>,
    pub capture_error: Option<String>,
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
            rebind_action: 0,
            capture: None,
            capture_error: None,
            help_scroll: 0,
            settings,
            over_score: 0,
            over_level: 1,
            over_rank: None,
        }
    }

    pub fn show(&mut self, id: ScreenId) {
        self.current = id;
        self.capture = None;
        self.capture_error = None;
        if id == ScreenId::Help {
            self.help_scroll = 0;
        }
        if id == ScreenId::Paused {
            self.pause_menu = 0;
        }
    }

    /// Handle a menu-level action (Confirm/Back/Up/Down). Left/Right
    /// adjustments go through [`Screens::adjust`]. Returns the app event.
    pub fn press(&mut self, action: Action) -> Event {
        match self.current {
            ScreenId::Title => match action {
                Action::Up => {
                    self.menu = self.menu.saturating_sub(1);
                    Event::None
                }
                Action::Down => {
                    self.menu = (self.menu + 1).min(MenuItem::ALL.len() - 1);
                    Event::None
                }
                Action::Confirm => match MenuItem::ALL[self.menu] {
                    MenuItem::Play => Event::StartGame,
                    MenuItem::Help => {
                        self.show(ScreenId::Help);
                        Event::None
                    }
                    MenuItem::Scores => {
                        self.show(ScreenId::Scores);
                        Event::None
                    }
                    MenuItem::Settings => {
                        self.settings_row = 0;
                        self.show(ScreenId::Settings);
                        Event::None
                    }
                    MenuItem::Quit => Event::Quit,
                },
                Action::Back | Action::Mute | Action::Pause | Action::Left | Action::Right => {
                    Event::None
                }
            },
            ScreenId::Help | ScreenId::Scores => match action {
                Action::Back | Action::Confirm => {
                    self.show(ScreenId::Title);
                    Event::None
                }
                Action::Up => {
                    self.help_scroll = self.help_scroll.saturating_sub(1);
                    Event::None
                }
                Action::Down => {
                    self.help_scroll = self.help_scroll.saturating_add(1);
                    Event::None
                }
                _ => Event::None,
            },
            ScreenId::Settings => match action {
                Action::Up => {
                    self.settings_row = self.settings_row.saturating_sub(1);
                    Event::None
                }
                Action::Down => {
                    self.settings_row = (self.settings_row + 1).min(SettingsRow::ALL.len() - 1);
                    Event::None
                }
                Action::Confirm => match SettingsRow::ALL[self.settings_row] {
                    SettingsRow::Back => {
                        self.show(ScreenId::Title);
                        Event::SettingsCommitted
                    }
                    SettingsRow::Keybinds => {
                        self.rebind_action = 0;
                        self.show(ScreenId::Rebind);
                        Event::None
                    }
                    SettingsRow::Mute => {
                        self.settings.mute = !self.settings.mute;
                        Event::SettingsCommitted
                    }
                    SettingsRow::ReducedFlash => {
                        self.settings.reduced_flash = !self.settings.reduced_flash;
                        Event::SettingsCommitted
                    }
                    _ => Event::None,
                },
                Action::Back => {
                    self.show(ScreenId::Title);
                    Event::SettingsCommitted
                }
                _ => Event::None,
            },
            ScreenId::Rebind => match action {
                Action::Up => {
                    self.rebind_action = self.rebind_action.saturating_sub(1);
                    self.capture = None;
                    Event::None
                }
                Action::Down => {
                    self.rebind_action = (self.rebind_action + 1).min(Action::ALL.len() - 1);
                    self.capture = None;
                    Event::None
                }
                Action::Confirm => {
                    self.capture = Some(Action::ALL[self.rebind_action]);
                    self.capture_error = None;
                    Event::None
                }
                Action::Back => {
                    self.show(ScreenId::Settings);
                    Event::None
                }
                _ => Event::None,
            },
            ScreenId::Paused => match action {
                Action::Up => {
                    self.pause_menu = self.pause_menu.saturating_sub(1);
                    Event::None
                }
                Action::Down => {
                    self.pause_menu = (self.pause_menu + 1).min(PauseItem::ALL.len() - 1);
                    Event::None
                }
                Action::Confirm => match PauseItem::ALL[self.pause_menu] {
                    PauseItem::Resume => {
                        self.show(ScreenId::Playing);
                        Event::None
                    }
                    PauseItem::QuitToTitle => Event::QuitToTitle,
                },
                Action::Back | Action::Pause => {
                    self.show(ScreenId::Playing);
                    Event::None
                }
                _ => Event::None,
            },
            ScreenId::Over => match action {
                Action::Confirm | Action::Back => {
                    self.show(ScreenId::Title);
                    Event::QuitToTitle
                }
                _ => Event::None,
            },
            ScreenId::Playing => Event::None,
        }
    }

    /// Left/Right adjustment on the settings screen.
    pub fn adjust(&mut self, dir: Dir) {
        if self.current != ScreenId::Settings {
            return;
        }
        let delta: i32 = match dir {
            Dir::Left => -1,
            Dir::Right => 1,
            _ => return,
        };
        match SettingsRow::ALL[self.settings_row] {
            SettingsRow::Difficulty => {
                let order = [Difficulty::Cozy, Difficulty::Standard, Difficulty::Harsh];
                let i = order
                    .iter()
                    .position(|&d| d == self.settings.difficulty)
                    .unwrap_or(1);
                let n = (i as i32 + delta).rem_euclid(3) as usize;
                self.settings.difficulty = order[n];
            }
            SettingsRow::Theme => {
                let i = KNOWN_THEMES
                    .iter()
                    .position(|&t| t == self.settings.theme.as_str())
                    .unwrap_or(0);
                let n = (i as i32 + delta).rem_euclid(KNOWN_THEMES.len() as i32) as usize;
                self.settings.theme = KNOWN_THEMES[n].to_string();
            }
            SettingsRow::Master => {
                self.settings.master =
                    ((self.settings.master * 10.0) as i32 + delta).clamp(0, 10) as f32 / 10.0;
            }
            SettingsRow::Music => {
                self.settings.music =
                    ((self.settings.music * 10.0) as i32 + delta).clamp(0, 10) as f32 / 10.0;
            }
            SettingsRow::Sfx => {
                self.settings.sfx =
                    ((self.settings.sfx * 10.0) as i32 + delta).clamp(0, 10) as f32 / 10.0;
            }
            SettingsRow::Mute => {
                self.settings.mute = !self.settings.mute;
            }
            SettingsRow::ReducedFlash => {
                self.settings.reduced_flash = !self.settings.reduced_flash;
            }
            SettingsRow::Keybinds | SettingsRow::Back => {}
        }
    }

    /// Complete an armed key capture with a physical key. Returns the
    /// app event (a failed rebind surfaces its message on the screen).
    pub fn capture_key(&mut self, map: &mut Keymap, key: Key) -> Event {
        let Some(action) = self.capture.take() else {
            return Event::None;
        };
        match map.rebind(action, key) {
            Ok(()) => Event::None,
            Err(msg) => {
                self.capture_error = Some(msg.clone());
                Event::RebindFailed(msg)
            }
        }
    }

    /// Rendered settings rows: (label, value) pairs for the app painter.
    pub fn settings_lines(&self) -> Vec<(String, String)> {
        let s = &self.settings;
        vec![
            ("Difficulty".into(), s.difficulty.as_str().into()),
            ("Theme".into(), s.theme.clone()),
            ("Master volume".into(), format!("{:.0}%", s.master * 100.0)),
            ("Music volume".into(), format!("{:.0}%", s.music * 100.0)),
            ("SFX volume".into(), format!("{:.0}%", s.sfx * 100.0)),
            (
                "Mute".into(),
                if s.mute { "on".into() } else { "off".into() },
            ),
            (
                "Reduced flashing".into(),
                if s.reduced_flash {
                    "on".into()
                } else {
                    "off".into()
                },
            ),
            ("Key bindings".into(), "press Enter to edit".into()),
            ("Back".into(), "save and return".into()),
        ]
    }
}

/// Title banner lines (plain text; the app paints them).
pub const TITLE_BANNER: [&str; 5] = [
    " __  __   _   ____________   ___ _  _   _   ___ ___",
    "|  \\/  | /_\\ |__/__ / __|  / __| || | /_\\ / __| __|",
    "| |\\/| |/ _ \\  |_ \\ (__  | (__| __ |/ _ \\\\__ \\ _|",
    "|_|  |_/_/ \\_\\___/ \\___|  \\___|_||_/_/ \\_\\___/___|",
    "            a maze-chase arcade original",
];

/// Help body lines (scrollable).
pub const HELP_LINES: [&str; 20] = [
    "Outrun the wardens, clear every crumb, chase the high score.",
    "",
    "MOVE ............ Arrow keys or WASD (remappable in Settings).",
    "PAUSE ........... P or Esc while playing.",
    "MUTE ............ M toggles sound instantly.",
    "",
    "Eat all crumbs and sunseeds to clear the warren and descend.",
    "Sunseeds turn the hunt around: wardens glow pale and flee,",
    "and eating them scores a 200 / 400 / 800 / 1600 chain.",
    "Eaten wardens drift home as eyes, then revive at the gate.",
    "Twice per level a relish ripens below the gatehouse: grab it",
    "before it fades (70 and 170 crumbs).",
    "A spare wick (extra life) lights at 10,000 points.",
    "",
    "Wardens: Bram leads the chase, Kessa ambushes ahead of you,",
    "Jory mirrors your flank, Nib lurks at range. They scatter",
    "to their corners on a wave clock, then hunt again.",
    "",
    "Cozy starts gentle, Standard starts deeper, Harsh is one",
    "life with no fright windows. Scores save on this machine.",
];

#[cfg(test)]
mod tests {
    use super::*;

    fn screens() -> Screens {
        Screens::new(Settings::default())
    }

    #[test]
    fn title_navigation_reaches_every_screen() {
        let mut s = screens();
        // Menu order: Play, Help, Scores, Settings, Quit.
        s.press(Action::Down);
        assert_eq!(s.press(Action::Confirm), Event::None);
        assert_eq!(s.current, ScreenId::Help);
        assert_eq!(s.press(Action::Back), Event::None);
        assert_eq!(s.current, ScreenId::Title);
    }

    #[test]
    fn play_and_quit_emit_events() {
        let mut s = screens();
        assert_eq!(s.press(Action::Confirm), Event::StartGame);
        s.show(ScreenId::Title);
        for _ in 0..4 {
            s.press(Action::Down);
        }
        assert_eq!(s.press(Action::Confirm), Event::Quit);
    }

    #[test]
    fn settings_adjust_cycles_and_persists() {
        let mut s = screens();
        for _ in 0..3 {
            s.press(Action::Down);
        }
        assert_eq!(s.current, ScreenId::Title);
        assert_eq!(s.press(Action::Confirm), Event::None);
        assert_eq!(s.current, ScreenId::Settings);
        // Difficulty row: cycle right twice from standard -> harsh -> cozy.
        s.adjust(Dir::Right);
        assert_eq!(s.settings.difficulty, Difficulty::Harsh);
        s.adjust(Dir::Right);
        assert_eq!(s.settings.difficulty, Difficulty::Cozy);
        // Volumes clamp at the rails.
        s.settings_row = 2;
        for _ in 0..20 {
            s.adjust(Dir::Right);
        }
        assert!((s.settings.master - 1.0).abs() < 1e-6);
        // Back commits.
        s.settings_row = 8;
        assert_eq!(s.press(Action::Confirm), Event::SettingsCommitted);
        assert_eq!(s.current, ScreenId::Title);
    }

    #[test]
    fn rebind_capture_and_conflict() {
        let mut s = screens();
        let mut map = Keymap::defaults();
        s.show(ScreenId::Rebind);
        // Arm capture for Up, then feed a conflicting key (W is taken
        // by Up already? W IS Up's key: idempotent Ok).
        s.press(Action::Confirm);
        assert_eq!(s.capture, Some(Action::Up));
        assert_eq!(s.capture_key(&mut map, Key::W), Event::None);
        // Arm capture for Pause, feed W (taken by Up): conflict surfaces.
        s.rebind_action = 4;
        s.press(Action::Confirm);
        let ev = s.capture_key(&mut map, Key::W);
        assert!(matches!(ev, Event::RebindFailed(_)));
        assert!(s.capture_error.is_some());
    }

    #[test]
    fn pause_and_gameover_flow() {
        let mut s = screens();
        s.show(ScreenId::Paused);
        s.press(Action::Down);
        assert_eq!(s.press(Action::Confirm), Event::QuitToTitle);
        s.show(ScreenId::Over);
        assert_eq!(s.press(Action::Confirm), Event::QuitToTitle);
        assert_eq!(s.current, ScreenId::Title);
    }
}
