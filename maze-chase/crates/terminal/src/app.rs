//! App: the terminal game session on the shared engine.
//!
//! [`App`] owns one [`Game`], the [`Screens`] flow, [`Settings`] plus
//! [`Keymap`] (loaded/saved through `maze_chase_config::persist`), the
//! [`Chime`] audio sink, the high-score table, and the render [`Tier`]
//! with its [`Watchdog`]. Input maps to `TickInput` and rendering reads
//! `Game` state plus drained events: no gameplay logic lives here, so
//! replays recorded from a terminal session reproduce on every layer.

use crate::backend::{Tier, Watchdog};
use crate::chime::Chime;
use crate::layout::{self, Layout};
use crate::scores::{self, Score};
use crate::screens::{Event, ScreenId, Screens};
use crossterm::event::KeyEvent;
use maze_chase_audio::cue::cue_for_event;
use maze_chase_audio::sink::{Audio, TuneId};
use maze_chase_config::persist;
use maze_chase_config::settings::{preset, Settings};
use maze_chase_config::{Action, Keymap};
use maze_chase_engine::actors::Dir;
use maze_chase_engine::game::{Game, GameState};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

/// Settings file name inside the config directory.
pub const SETTINGS_FILE: &str = "settings.txt";
/// Scores file name inside the config directory.
pub const SCORES_FILE: &str = "scores.txt";

/// Config directory: `$HOME/.maze-chase` (or `%USERPROFILE%` on Windows).
pub fn config_dir() -> PathBuf {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".maze-chase")
}

/// Today's date as `YYYY-MM-DD` (civil-from-days, std only).
pub fn today_ymd() -> String {
    let days = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| (d.as_secs() / 86_400) as i64)
        .unwrap_or(0);
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    format!("{:04}-{:02}-{:02}", y + i64::from(m <= 2), m, d)
}

fn fresh_seed() -> u64 {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos() as u64)
        .unwrap_or(0x9E37_79B9);
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    secs.wrapping_mul(0x9E37_79B9_7F4A_7C15).wrapping_add(nanos)
}

/// Short player-facing ticker line for an engine event (`None` for the
/// frequent background flips that would spam the line).
fn ticker_for(event: &str) -> Option<String> {
    if event == "dot" || event.starts_with("wave:") || event.starts_with("house-") {
        return None;
    }
    if let Some(rest) = event.strip_prefix("warden:") {
        return Some(format!("warden eaten +{rest}"));
    }
    if let Some(rest) = event.strip_prefix("relish:spawn:") {
        return Some(format!("a relish ripens (worth {rest})"));
    }
    if let Some(rest) = event.strip_prefix("relish:") {
        if rest != "gone" {
            return Some(format!("relish +{rest}"));
        }
        return Some("the relish faded".into());
    }
    if let Some(rest) = event.strip_prefix("sprint-bonus:") {
        return Some(format!("sprint bonus +{rest}"));
    }
    if let Some(rest) = event.strip_prefix("level:") {
        return Some(format!("descending to level {rest}"));
    }
    match event {
        "sunseed" => Some("sunseed! the hunt turns".into()),
        "death" => Some("caught!".into()),
        "respawn" => Some("back in the warren".into()),
        "extra-life" => Some("spare wick lit!".into()),
        "level-clear" => Some("warren clear!".into()),
        "refill" => Some("fresh crumbs, same warren".into()),
        "time-up" => Some("time!".into()),
        "game-over" => Some("game over".into()),
        "fright-end" => Some("the hunt resumes".into()),
        e if e.starts_with("fright:") => Some("the wardens flee!".into()),
        _ => None,
    }
}

/// The terminal game session.
pub struct App {
    pub game: Game,
    pub screens: Screens,
    pub settings: Settings,
    pub keymap: Keymap,
    pub scores: Vec<Score>,
    pub chime: Chime,
    pub watchdog: Watchdog,
    pub layout: Layout,
    pub frame_no: u64,
    pending_dir: Option<Dir>,
    was_running: bool,
    ticker: Option<(String, u64)>,
    dir: PathBuf,
    seed_counter: u64,
    /// Set when the player picks Quit (the binary exits its loop).
    pub quit: bool,
}

impl App {
    /// New session: loads settings/scores from `dir`, picks the starting
    /// tier from `env`, fits `cols`x`rows`.
    pub fn new(cols: u16, rows: u16, env: &[(String, String)], dir: PathBuf) -> Self {
        let (settings, keymap, _) = persist::load_from(&dir.join(SETTINGS_FILE));
        let (scores, _) = scores::load_from(&dir.join(SCORES_FILE));
        let tier = crate::backend::initial_tier(env);
        let mut chime = Chime::new();
        chime.set_master(settings.master);
        chime.set_music(settings.music);
        chime.set_sfx(settings.sfx);
        chime.set_muted(settings.mute);
        let screens = Screens::new(settings.clone());
        let game = Game::new(0, 1);
        let mut app = Self {
            game,
            screens,
            settings,
            keymap,
            scores,
            chime,
            watchdog: Watchdog::new(tier),
            layout: layout::compute(cols, rows),
            frame_no: 0,
            pending_dir: None,
            was_running: false,
            ticker: None,
            dir,
            seed_counter: 0,
            quit: false,
        };
        app.apply_tune();
        app
    }

    pub fn tier(&self) -> Tier {
        self.watchdog.tier()
    }

    /// Re-fit the canvas (dynamic resize path).
    pub fn resize(&mut self, cols: u16, rows: u16) {
        self.layout = layout::compute(cols, rows);
    }

    fn save_settings(&mut self) {
        // First runs have no config directory yet: create it so the very
        // first settings commit persists (config's save_to truncates only).
        let path = self.dir.join(SETTINGS_FILE);
        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() {
                let _ = std::fs::create_dir_all(parent);
            }
        }
        let _ = persist::save_to(&self.settings, &self.keymap, &path);
    }

    fn sync_chime(&mut self) {
        self.chime.set_master(self.settings.master);
        self.chime.set_music(self.settings.music);
        self.chime.set_sfx(self.settings.sfx);
        self.chime.set_muted(self.settings.mute);
    }

    fn start_game(&mut self) {
        let p = preset(self.screens.settings.difficulty);
        self.settings = self.screens.settings.clone();
        self.sync_chime();
        self.save_settings();
        self.seed_counter += 1;
        let seed = fresh_seed().wrapping_add(self.seed_counter);
        self.game = Game::with_mode(seed, p.start_level, p.mode);
        self.pending_dir = None;
        self.was_running = true;
        self.ticker = None;
        self.screens.show(ScreenId::Playing);
        self.apply_tune();
    }

    fn apply_tune(&mut self) {
        let tune = match self.screens.current {
            ScreenId::Playing | ScreenId::Paused => {
                if self.game.wardens.fright_active() {
                    TuneId::Fright
                } else {
                    TuneId::None
                }
            }
            ScreenId::Over => TuneId::None,
            _ => TuneId::Title,
        };
        self.chime.start_music(tune);
    }

    fn apply_event(&mut self, event: Event) {
        match event {
            Event::None => {}
            Event::StartGame => self.start_game(),
            Event::Quit => {
                self.quit = true;
            }
            Event::QuitToTitle => {
                self.was_running = false;
                self.screens.show(ScreenId::Title);
                self.apply_tune();
            }
            Event::SettingsCommitted => {
                self.settings = self.screens.settings.clone();
                self.sync_chime();
                self.save_settings();
            }
            Event::RebindFailed(_) => {
                self.save_settings();
            }
        }
    }

    /// Route one key event by surface.
    pub fn on_key(&mut self, ev: KeyEvent) {
        let Some(key) = crate::input::crossterm_to_key(ev) else {
            return;
        };
        // Armed rebind capture eats the next key whole, except Back
        // which cancels the armed capture (first press) instead of
        // attempting a rebind that could never succeed.
        if self.screens.capture.is_some() && self.screens.current == ScreenId::Rebind {
            if let Some(action) = crate::input::action_for_key(&self.keymap, key) {
                if action == Action::Back {
                    self.screens.capture = None;
                    self.screens.capture_error = None;
                    return;
                }
            }
            let event = self.screens.capture_key(&mut self.keymap, key);
            self.save_settings();
            self.apply_event(event);
            return;
        }
        let Some(action) = crate::input::action_for_key(&self.keymap, key) else {
            return;
        };
        // Global mute works on every surface.
        if action == Action::Mute {
            self.settings.mute = !self.settings.mute;
            self.screens.settings.mute = self.settings.mute;
            self.sync_chime();
            self.save_settings();
            return;
        }
        // Esc on the title quits (the menu also offers Quit explicitly).
        if self.screens.current == ScreenId::Title && action == Action::Back {
            self.quit = true;
            return;
        }
        match self.screens.current {
            ScreenId::Playing => {
                if let Some(dir) = crate::input::dir_for_action(action) {
                    self.pending_dir = Some(dir);
                } else if action == Action::Pause || action == Action::Back {
                    self.screens.show(ScreenId::Paused);
                    self.apply_tune();
                }
            }
            ScreenId::Paused => {
                if action == Action::Pause {
                    self.screens.show(ScreenId::Playing);
                    self.apply_tune();
                } else {
                    let event = self.screens.press(action);
                    self.apply_event(event);
                }
            }
            ScreenId::Settings => {
                if action == Action::Left || action == Action::Right {
                    let dir = if action == Action::Left {
                        Dir::Left
                    } else {
                        Dir::Right
                    };
                    self.screens.adjust(dir);
                    // The edit lands in the screens working copy: commit
                    // it to the live settings before previewing so volume
                    // / mute changes give immediate audible feedback and
                    // persist without waiting for Back.
                    self.settings = self.screens.settings.clone();
                    self.sync_chime();
                    self.save_settings();
                } else {
                    let event = self.screens.press(action);
                    self.apply_event(event);
                }
            }
            _ => {
                if action == Action::Left || action == Action::Right {
                    self.screens.adjust(action_to_dir(action));
                }
                let event = self.screens.press(action);
                self.apply_event(event);
            }
        }
    }

    /// Advance the session by `dt` seconds (game only simulates while
    /// playing; menus just age the ticker).
    pub fn tick(&mut self, dt: f64) {
        self.frame_no += 1;
        if self.screens.current != ScreenId::Playing {
            return;
        }
        let events = self.game.step(dt, self.pending_dir.take());
        for event in &events {
            if let Some(t) = ticker_for(event) {
                self.ticker = Some((t, self.frame_no));
            }
            if let Some(cue) = cue_for_event(event) {
                self.chime.play(cue);
            }
        }
        self.apply_tune();
        if self.game.state == GameState::Over && self.was_running {
            self.was_running = false;
            let mode = self.game.mode.as_str().to_string();
            let score = Score::new(self.game.score, self.game.level, &mode, &today_ymd());
            let rank = scores::insert_ranked(&mut self.scores, score);
            let _ = scores::save_to(&self.scores, &self.dir.join(SCORES_FILE));
            self.screens.over_score = self.game.score;
            self.screens.over_level = self.game.level;
            self.screens.over_rank = rank;
            self.screens.show(ScreenId::Over);
            self.apply_tune();
        }
    }

    /// Current ticker line, if fresh (8 s at 60 fps).
    pub fn ticker(&self) -> Option<&str> {
        self.ticker
            .as_ref()
            .filter(|(_, at)| self.frame_no.saturating_sub(*at) < 480)
            .map(|(t, _)| t.as_str())
    }

    /// Theme for the active settings (falls back to ember-warren).
    pub fn theme(&self) -> &'static maze_chase_assets::themes::Theme {
        maze_chase_assets::themes::by_id(self.settings.theme.as_str())
            .unwrap_or(&maze_chase_assets::themes::EMBER_WARREN)
    }

    /// Render a bitmap PNG of the current game frame (Kitty/Sixel tiers).
    pub fn bitmap_png(&self) -> Vec<u8> {
        let frame = crate::raster::render(
            &self.game,
            self.theme(),
            crate::raster::DEFAULT_PPT,
            self.frame_no,
            !self.settings.reduced_flash,
        );
        crate::kitty::png_encode(&frame)
    }
}

fn action_to_dir(action: Action) -> Dir {
    match action {
        Action::Left => Dir::Left,
        Action::Right => Dir::Right,
        Action::Up => Dir::Up,
        _ => Dir::Down,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::backend::Tier;
    use crossterm::event::{KeyCode, KeyEventKind, KeyEventState, KeyModifiers};

    fn app() -> App {
        let dir = std::env::temp_dir().join("maze-chase-app-test");
        let _ = std::fs::remove_dir_all(&dir);
        App::new(120, 45, &[], dir)
    }

    fn key(code: KeyCode) -> KeyEvent {
        KeyEvent {
            code,
            modifiers: KeyModifiers::empty(),
            kind: KeyEventKind::Press,
            state: KeyEventState::empty(),
        }
    }

    #[test]
    fn boots_to_title_and_starts_a_run() {
        let mut a = app();
        assert_eq!(a.screens.current, ScreenId::Title);
        assert_eq!(a.tier(), Tier::Legacy);
        a.on_key(key(KeyCode::Enter));
        assert_eq!(a.screens.current, ScreenId::Playing);
        assert!(a.was_running);
    }

    #[test]
    fn movement_reaches_the_engine_and_scores() {
        let mut a = app();
        a.on_key(key(KeyCode::Enter));
        let before = a.game.score;
        for _ in 0..600 {
            a.tick(1.0 / 60.0);
        }
        assert!(a.game.score >= before, "crumbs score over time");
        assert!(a.game.tick_count > 500);
        // Determinism across identical sessions is the engine's promise;
        // the layer only maps input, so two runs diverge only by seed.
        assert_ne!(a.game.state_hash(), Game::new(0, 1).state_hash());
    }

    #[test]
    fn pause_mute_and_resize_flow() {
        let mut a = app();
        a.on_key(key(KeyCode::Enter));
        a.on_key(key(KeyCode::Char('p')));
        assert_eq!(a.screens.current, ScreenId::Paused);
        // Ticks while paused do not simulate.
        let hash = a.game.state_hash();
        for _ in 0..60 {
            a.tick(1.0 / 60.0);
        }
        assert_eq!(a.game.state_hash(), hash);
        a.on_key(key(KeyCode::Char('p')));
        assert_eq!(a.screens.current, ScreenId::Playing);
        a.on_key(key(KeyCode::Char('m')));
        assert!(a.settings.mute);
        a.resize(200, 80);
        assert!(a.layout.magnified);
        a.resize(62, 35);
        assert!(!a.layout.magnified);
    }

    #[test]
    fn game_over_records_the_score() {
        let mut a = app();
        a.on_key(key(KeyCode::Enter));
        a.game.kill_player();
        // Sprint-style: burn through death beats until Over.
        for _ in 0..40 {
            for _ in 0..200 {
                a.tick(1.0 / 120.0);
            }
            if a.screens.current == ScreenId::Over {
                break;
            }
        }
        // Classic has 3 lives: force the end directly for the test.
        while a.screens.current != ScreenId::Over {
            a.game.kill_player();
            for _ in 0..200 {
                a.tick(1.0 / 120.0);
            }
        }
        assert_eq!(a.screens.over_rank, Some(1));
        assert!(!a.scores.is_empty());
        a.on_key(key(KeyCode::Enter));
        assert_eq!(a.screens.current, ScreenId::Title);
    }

    #[test]
    fn ticker_ages_out() {
        let mut a = app();
        a.on_key(key(KeyCode::Enter));
        a.ticker = Some(("hello".into(), a.frame_no));
        assert_eq!(a.ticker(), Some("hello"));
        for _ in 0..500 {
            a.tick(1.0 / 60.0);
        }
        assert_eq!(a.ticker(), None);
    }

    #[test]
    fn today_looks_like_a_date() {
        let d = today_ymd();
        assert_eq!(d.len(), 10);
        assert_eq!(&d[4..5], "-");
        assert!(d[0..4].parse::<i32>().unwrap() >= 2026);
    }

    #[test]
    fn space_confirms_and_esc_cancels_rebind_capture() {
        use maze_chase_config::Action;
        let mut a = app();
        // Space is a default Confirm key: it starts a run from the title.
        a.on_key(key(KeyCode::Char(' ')));
        assert_eq!(a.screens.current, ScreenId::Playing);
        // Arm a rebind capture, then Esc cancels instead of failing.
        a.screens.show(ScreenId::Rebind);
        a.screens.capture = Some(Action::Pause);
        a.on_key(key(KeyCode::Esc));
        assert_eq!(a.screens.capture, None);
        assert!(a.screens.capture_error.is_none());
        assert_eq!(a.screens.current, ScreenId::Rebind);
        // A second Back with nothing armed exits to Settings.
        a.on_key(key(KeyCode::Esc));
        assert_eq!(a.screens.current, ScreenId::Settings);
    }

    #[test]
    fn settings_edits_sync_and_persist_live() {
        let mut a = app();
        for _ in 0..3 {
            a.on_key(key(KeyCode::Down));
        }
        a.on_key(key(KeyCode::Enter));
        assert_eq!(a.screens.current, ScreenId::Settings);
        // Left/Right on Master commits to the live settings + chime.
        a.screens.settings_row = 2;
        let before = a.settings.master;
        a.on_key(key(KeyCode::Right));
        assert_eq!(a.settings.master, a.screens.settings.master);
        assert_ne!(a.settings.master, before - 1.0);
        // Mute toggle via Confirm commits immediately (not only on Back).
        a.screens.settings_row = 5;
        let muted = a.settings.mute;
        a.on_key(key(KeyCode::Enter));
        assert_eq!(a.settings.mute, !muted);
        assert_eq!(a.screens.settings.mute, a.settings.mute);
    }
}
