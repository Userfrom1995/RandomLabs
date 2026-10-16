//! Web session: fixed-step game flow for the browser layer.
//!
//! Read-only over the engine except through [`Game::step`]: keyboard,
//! swipe, and menu actions become [`TickInput`], engine event strings
//! become stable cue codes for the WebAudio harness, and screen flow
//! (title, help, scores, settings, playing, paused, over) is owned here
//! so the JS harness renders DOM from one source of truth.

use std::collections::VecDeque;

use maze_chase_assets::themes::{self, Theme};
use maze_chase_audio::cue::{cue_for_event, Cue};
use maze_chase_config::keymap::{Action, Key, Keymap};
use maze_chase_config::persist;
use maze_chase_config::settings::{self, Difficulty, Settings};
use maze_chase_engine::actors::TickInput;
use maze_chase_engine::game::{Game, GameState};
use maze_chase_engine::modes::GameMode;
use maze_chase_engine::tuning;

use crate::audio_map;
use crate::input;
use crate::scores::Scores;

/// Screen ids on the wire (`mc_screen`, `mc_goto`).
pub const SCREEN_TITLE: u32 = 0;
/// Help screen id.
pub const SCREEN_HELP: u32 = 1;
/// Scores screen id.
pub const SCREEN_SCORES: u32 = 2;
/// Settings screen id.
pub const SCREEN_SETTINGS: u32 = 3;
/// Playing screen id.
pub const SCREEN_PLAYING: u32 = 4;
/// Paused screen id.
pub const SCREEN_PAUSED: u32 = 5;
/// Game-over screen id.
pub const SCREEN_OVER: u32 = 6;

/// Menu buttons on the wire (`mc_press`).
pub const BTN_BACK: u32 = 1;
/// Pause/resume toggle.
pub const BTN_PAUSE: u32 = 2;
/// Mute toggle.
pub const BTN_MUTE: u32 = 3;
/// Start a new run.
pub const BTN_START: u32 = 4;
/// Resume from pause.
pub const BTN_RESUME: u32 = 5;
/// Restart after game over or pause.
pub const BTN_RESTART: u32 = 6;
/// Quit to the title screen.
pub const BTN_QUIT: u32 = 7;
/// Cycle the color theme.
pub const BTN_THEME_NEXT: u32 = 8;
/// Cycle the difficulty preset.
pub const BTN_DIFFICULTY_NEXT: u32 = 9;

/// `mc_rebind` cancel sentinel.
pub const REBIND_CANCEL: u32 = 99;

/// `mc_poll_music` no-change sentinel.
pub const MUSIC_NO_CHANGE: u32 = 0xFFFF_FFFF;
/// Loop-music ids: 0 stop, 1 title, 2 fright.
pub const MUSIC_STOP: u32 = 0;
/// Title loop id.
pub const MUSIC_TITLE: u32 = 1;
/// Fright loop id.
pub const MUSIC_FRIGHT: u32 = 2;

/// Fixed simulation step (engine 120 Hz).
const FIXED_DT: f32 = 1.0 / tuning::SIM_HZ as f32;
/// Most catch-up steps per harness tick before surplus is dropped.
const MAX_STEPS: u32 = 5;
/// Wall-clock clamp per tick (background-tab jumps never spiral).
const MAX_DT_S: f32 = 0.25;
/// Queued audio cues cap (drop newest under flood, never grow).
const CUE_CAP: usize = 64;
/// Default attract seed.
const ATTRACT_SEED: u64 = 0xC0FFEE;

/// Which flow screen we are on.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Screen {
    Title,
    Help,
    Scores,
    Settings,
    Playing,
    Paused,
    Over,
}

impl Screen {
    /// Wire id for the harness.
    pub fn wire(self) -> u32 {
        match self {
            Screen::Title => SCREEN_TITLE,
            Screen::Help => SCREEN_HELP,
            Screen::Scores => SCREEN_SCORES,
            Screen::Settings => SCREEN_SETTINGS,
            Screen::Playing => SCREEN_PLAYING,
            Screen::Paused => SCREEN_PAUSED,
            Screen::Over => SCREEN_OVER,
        }
    }
}

/// Difficulty as a wire index: 0 cozy, 1 standard, 2 harsh.
pub fn difficulty_index(d: Difficulty) -> u32 {
    match d {
        Difficulty::Cozy => 0,
        Difficulty::Standard => 1,
        Difficulty::Harsh => 2,
    }
}

/// Difficulty from a wire index (`None` when out of range).
pub fn difficulty_from_index(i: u32) -> Option<Difficulty> {
    match i {
        0 => Some(Difficulty::Cozy),
        1 => Some(Difficulty::Standard),
        2 => Some(Difficulty::Harsh),
        _ => None,
    }
}

/// Game mode from a wire index (`None` when out of range).
pub fn mode_from_index(i: u32) -> Option<GameMode> {
    match i {
        0 => Some(GameMode::Classic),
        1 => Some(GameMode::TimeAttack),
        2 => Some(GameMode::Sprint),
        3 => Some(GameMode::FrightFrenzy),
        _ => None,
    }
}

/// The browser session: one engine game plus flow state.
pub struct WebSession {
    game: Game,
    screen: Screen,
    menu_return: Screen,
    pending: TickInput,
    acc: f32,
    last_ms: Option<u32>,
    frame_no: u64,
    settings: Settings,
    keymap: Keymap,
    scores: Scores,
    cues: VecDeque<u32>,
    music_want: u32,
    music_pending: Option<u32>,
    capture: Option<Action>,
    capture_ok: bool,
    last_chain: u8,
    pending_score: Option<(u32, u32)>,
    base_seed: u64,
    reset_seq: u64,
}

impl WebSession {
    /// Fresh session on the title screen with default settings.
    pub fn new() -> Self {
        let settings = Settings::default();
        let mut session = Self {
            game: Game::with_mode(ATTRACT_SEED, 1, GameMode::Classic),
            screen: Screen::Title,
            menu_return: Screen::Title,
            pending: None,
            acc: 0.0,
            last_ms: None,
            frame_no: 0,
            settings,
            keymap: Keymap::defaults(),
            scores: Scores::new(),
            cues: VecDeque::new(),
            music_want: MUSIC_TITLE,
            music_pending: Some(MUSIC_TITLE),
            capture: None,
            capture_ok: false,
            last_chain: 1,
            pending_score: None,
            base_seed: ATTRACT_SEED,
            reset_seq: 0,
        };
        session.apply_theme_fallback();
        session
    }

    /// Current screen.
    pub fn screen(&self) -> Screen {
        self.screen
    }

    /// The engine game (read-only render source).
    pub fn game(&self) -> &Game {
        &self.game
    }

    /// Render frame counter (drives sprite animation cadence).
    pub fn frame_no(&self) -> u64 {
        self.frame_no
    }

    /// Active theme, falling back to Ember Warren on unknown ids.
    pub fn theme(&self) -> &'static Theme {
        themes::by_id(self.settings.theme.as_str()).unwrap_or(&themes::EMBER_WARREN)
    }

    /// Active theme index for the harness cycle button.
    pub fn theme_index(&self) -> u32 {
        let all = themes::all();
        all.iter()
            .position(|t| t.id == self.settings.theme)
            .unwrap_or(0) as u32
    }

    /// Number of shipped themes.
    pub fn theme_count() -> u32 {
        themes::all().len() as u32
    }

    /// Best score: table best or the live run, whichever is higher.
    pub fn best(&self) -> u32 {
        self.scores.best().max(self.game.score)
    }

    /// Whether the finished run is waiting on a name entry.
    pub fn can_add_score(&self) -> bool {
        match self.pending_score {
            Some((score, _)) => self.scores.qualifies(score),
            None => false,
        }
    }

    /// Last warden-chain arm (1..=4) for SFX pitch doubling.
    pub fn last_chain(&self) -> u8 {
        self.last_chain
    }

    /// Settings plus keymap (harness sliders and rebind display).
    pub fn settings(&self) -> &Settings {
        &self.settings
    }

    /// Mutable settings (harness sliders).
    pub fn settings_mut(&mut self) -> &mut Settings {
        &mut self.settings
    }

    /// Keymap (rebind display).
    pub fn keymap(&self) -> &Keymap {
        &self.keymap
    }

    /// Score table (harness list rendering).
    pub fn scores(&self) -> &Scores {
        &self.scores
    }

    /// Score table (import path for localStorage restore).
    pub fn scores_mut(&mut self) -> &mut Scores {
        &mut self.scores
    }

    /// Whether the last rebind capture succeeded (harness hint text).
    pub fn capture_ok(&self) -> bool {
        self.capture_ok
    }

    /// Whether a rebind capture is armed.
    pub fn capture_armed(&self) -> bool {
        self.capture.is_some()
    }

    fn apply_theme_fallback(&mut self) {
        if themes::by_id(self.settings.theme.as_str()).is_none() {
            self.settings.theme = themes::EMBER_WARREN.id.to_string();
        }
    }

    fn push_cue(&mut self, code: u32) {
        if code == 0 {
            return;
        }
        if self.cues.len() < CUE_CAP {
            self.cues.push_back(code);
        }
    }

    fn push_engine_event(&mut self, event: &str) {
        // Bookkeeping the desktop layer filters from its ticker stays
        // silent here too; everything else routes through the cue map.
        if event.starts_with("wave:") || event.starts_with("house-") || event.starts_with("level:")
        {
            return;
        }
        let Some(cue) = cue_for_event(event) else {
            return;
        };
        if let Cue::WardenEaten { chain } = cue {
            self.last_chain = chain.clamp(1, 4);
        }
        self.push_cue(audio_map::cue_code(cue));
    }

    /// Drain one queued cue code, or 0 when empty.
    pub fn poll_cue(&mut self) -> u32 {
        self.cues.pop_front().unwrap_or(0)
    }

    /// Drain a pending loop-music change, or [`MUSIC_NO_CHANGE`].
    pub fn poll_music(&mut self) -> u32 {
        self.music_pending.take().unwrap_or(MUSIC_NO_CHANGE)
    }

    fn want_music(&mut self, id: u32) {
        if self.music_want != id {
            self.music_want = id;
            self.music_pending = Some(id);
        }
    }

    /// (Re)start a run from the difficulty preset. `level` 0 means the
    /// preset start level, `mode` 99 means the preset mode; otherwise the
    /// explicit values apply (clamped to sane ranges).
    pub fn reset(&mut self, seed: u64, level: u32, mode: u32) {
        self.base_seed = seed;
        self.reset_seq = self.reset_seq.wrapping_add(1);
        let mixed = seed.wrapping_add(self.reset_seq.wrapping_mul(0x9E37_79B9_7F4A_7C15));
        let preset = settings::preset(self.settings.difficulty);
        let start_level = if level == 0 {
            preset.start_level
        } else {
            level.clamp(1, 99)
        };
        let game_mode = if mode == 99 {
            preset.mode
        } else {
            mode_from_index(mode).unwrap_or(GameMode::Classic)
        };
        self.game = Game::with_mode(mixed, start_level, game_mode);
        self.pending = None;
        self.acc = 0.0;
        self.pending_score = None;
        self.screen = Screen::Playing;
        self.want_music(MUSIC_STOP);
    }

    /// Advance the session to harness wall-clock `now_ms`.
    pub fn step(&mut self, now_ms: u32) {
        let dt = match self.last_ms {
            Some(last) => (now_ms.wrapping_sub(last) as f32 / 1000.0).clamp(0.0, MAX_DT_S),
            None => 0.0,
        };
        self.last_ms = Some(now_ms);
        self.frame_no = self.frame_no.wrapping_add(1);
        if self.screen != Screen::Playing {
            self.acc = 0.0;
            self.pending = None;
            return;
        }
        self.acc += dt;
        let mut steps = 0u32;
        while self.acc >= FIXED_DT && steps < MAX_STEPS {
            let events = self.game.step(f64::from(FIXED_DT), self.pending.take());
            for event in events.iter() {
                self.push_engine_event(event);
            }
            self.acc -= FIXED_DT;
            steps += 1;
        }
        if steps == MAX_STEPS {
            self.acc = 0.0;
        }
        if self.game.wardens.fright_active() {
            self.want_music(MUSIC_FRIGHT);
        } else {
            self.want_music(MUSIC_STOP);
        }
        if self.game.state == GameState::Over {
            self.pending_score = Some((self.game.score, self.game.level));
            self.screen = Screen::Over;
            self.want_music(MUSIC_STOP);
        }
    }

    /// Feed a key event. Returns 1 when consumed, 2 when a rebind failed
    /// as a duplicate, 0 when ignored.
    pub fn key(&mut self, id: u32, down: u32) -> u32 {
        if down == 0 {
            return 0;
        }
        // Rebind capture owns the next key-down.
        if let Some(action) = self.capture {
            self.capture = None;
            let Some(key) = input::key_from_id(id) else {
                self.capture_ok = false;
                return 0;
            };
            return self.complete_rebind(action, key);
        }
        let Some(key) = input::key_from_id(id) else {
            return 0;
        };
        let _ = key;
        if let Some(dir) = input::dir_from_id(id, &self.keymap) {
            if self.screen == Screen::Playing {
                self.pending = Some(dir);
                return 1;
            }
            return 0;
        }
        match input::action_from_id(id, &self.keymap) {
            Some(Action::Pause) => {
                self.toggle_pause();
                let _ = key;
                1
            }
            Some(Action::Mute) => {
                self.toggle_mute();
                1
            }
            Some(Action::Back) => {
                self.back();
                1
            }
            Some(Action::Confirm) => {
                self.confirm();
                1
            }
            _ => 0,
        }
    }

    /// Feed a touch swipe delta (CSS pixels).
    pub fn swipe(&mut self, dx: f32, dy: f32) -> u32 {
        if self.screen != Screen::Playing {
            return 0;
        }
        match input::swipe_dir(dx, dy) {
            Some(dir) => {
                self.pending = Some(dir);
                1
            }
            None => 0,
        }
    }

    /// Menu button press. Unknown buttons are ignored.
    pub fn press(&mut self, btn: u32) -> u32 {
        match btn {
            BTN_BACK => {
                self.back();
                1
            }
            BTN_PAUSE => {
                self.toggle_pause();
                1
            }
            BTN_MUTE => {
                self.toggle_mute();
                1
            }
            BTN_START => {
                self.reset(self.base_seed, 0, 99);
                self.push_cue(audio_map::CUE_UI_SELECT);
                1
            }
            BTN_RESUME => {
                if self.screen == Screen::Paused {
                    self.screen = Screen::Playing;
                    self.push_cue(audio_map::CUE_UI_SELECT);
                }
                1
            }
            BTN_RESTART => {
                if self.screen == Screen::Over || self.screen == Screen::Paused {
                    self.reset(self.base_seed, 0, 99);
                    self.push_cue(audio_map::CUE_UI_SELECT);
                }
                1
            }
            BTN_QUIT => {
                self.show_title();
                1
            }
            BTN_THEME_NEXT => {
                let count = Self::theme_count();
                if count > 0 {
                    self.set_theme((self.theme_index() + 1) % count);
                    self.push_cue(audio_map::CUE_UI_SELECT);
                }
                1
            }
            BTN_DIFFICULTY_NEXT => {
                let next = (difficulty_index(self.settings.difficulty) + 1) % 3;
                if let Some(d) = difficulty_from_index(next) {
                    self.settings.difficulty = d;
                    self.push_cue(audio_map::CUE_UI_SELECT);
                }
                1
            }
            _ => 0,
        }
    }

    /// Open a menu screen (title, help, scores, settings) from title or
    /// pause, remembering where to return on back.
    pub fn goto(&mut self, screen: u32) -> u32 {
        let target = match screen {
            SCREEN_TITLE => Screen::Title,
            SCREEN_HELP => Screen::Help,
            SCREEN_SCORES => Screen::Scores,
            SCREEN_SETTINGS => Screen::Settings,
            _ => return 0,
        };
        if self.screen == Screen::Title || self.screen == Screen::Paused {
            if self.screen == Screen::Paused && target != Screen::Title {
                self.menu_return = Screen::Paused;
            } else {
                self.menu_return = Screen::Title;
            }
            if target == Screen::Title {
                self.show_title();
            } else {
                self.screen = target;
                self.push_cue(audio_map::CUE_UI_MOVE);
            }
            1
        } else {
            0
        }
    }

    /// Arm (or cancel with [`REBIND_CANCEL`]) a key-capture rebind.
    pub fn rebind(&mut self, action: u32) -> u32 {
        if action == REBIND_CANCEL {
            self.capture = None;
            return 1;
        }
        if action < Action::ALL.len() as u32 {
            self.capture = Some(Action::ALL[action as usize]);
            self.capture_ok = false;
            self.push_cue(audio_map::CUE_UI_MOVE);
            1
        } else {
            0
        }
    }

    /// Finish an armed capture: bind `key` to `action`. Returns 1 on
    /// success, 2 when the key is unusable. A bare duplicate is never
    /// rejected outright on the web layer: the key is *moved* from its
    /// previous owner (which keeps its remaining twins), so every
    /// hardware key stays reachable. The move is refused only when the
    /// previous owner would be left with no keys at all.
    fn complete_rebind(&mut self, action: Action, key: Key) -> u32 {
        if self.keymap.rebind(action, key).is_ok() {
            self.capture_ok = true;
            self.push_cue(audio_map::CUE_UI_SELECT);
            return 1;
        }
        let owner = Action::ALL
            .iter()
            .copied()
            .find(|a| *a != action && self.keymap.keys(*a).contains(&key));
        let Some(owner) = owner else {
            self.capture_ok = false;
            return 2;
        };
        let rest: Vec<Key> = self
            .keymap
            .keys(owner)
            .iter()
            .copied()
            .filter(|k| *k != key)
            .collect();
        if rest.is_empty() {
            self.capture_ok = false;
            return 2;
        }
        // Rebuild the keymap through the save format (the only public
        // whole-list writer): move `key` to `action`, leave `rest` behind.
        // The owner's line is emitted first because the loader validates
        // each line against the running map: the key must be freed before
        // the action claims it.
        let blob = persist::save(&self.settings, &self.keymap);
        let action_line = format!("bind_{} = {}", action.as_str(), key.as_str());
        let kept: Vec<String> = rest.iter().map(|k| k.as_str()).collect();
        let owner_line = format!("bind_{} = {}", owner.as_str(), kept.join(","));
        let mut prelude = String::new();
        for line in blob.lines() {
            let trimmed = line.trim();
            if let Some(rest_of) = trimmed.strip_prefix("bind_") {
                if let Some((name, _)) = rest_of.split_once('=') {
                    let name = name.trim();
                    if name == action.as_str() || name == owner.as_str() {
                        continue;
                    }
                }
            }
            prelude.push_str(line);
            prelude.push('\n');
        }
        let mut rebuilt = String::with_capacity(blob.len() + 32);
        rebuilt.push_str(&prelude);
        rebuilt.push_str(&owner_line);
        rebuilt.push('\n');
        rebuilt.push_str(&action_line);
        rebuilt.push('\n');
        let (settings, map, problems) = persist::load(&rebuilt);
        let moved = map.keys(action).contains(&key)
            && map.keys(owner).len() == rest.len()
            && problems.is_empty();
        if moved {
            self.settings = settings;
            self.keymap = map;
            self.capture_ok = true;
            self.push_cue(audio_map::CUE_UI_SELECT);
            1
        } else {
            self.capture_ok = false;
            2
        }
    }

    fn toggle_pause(&mut self) {
        match self.screen {
            Screen::Playing => {
                self.screen = Screen::Paused;
                self.acc = 0.0;
                self.pending = None;
                self.want_music(MUSIC_STOP);
                self.push_cue(audio_map::CUE_UI_BACK);
            }
            Screen::Paused => {
                self.screen = Screen::Playing;
                self.push_cue(audio_map::CUE_UI_SELECT);
            }
            _ => {}
        }
    }

    fn toggle_mute(&mut self) {
        self.settings.mute = !self.settings.mute;
        self.push_cue(audio_map::CUE_MUTE_TOGGLE);
    }

    fn back(&mut self) {
        match self.screen {
            Screen::Help | Screen::Scores | Screen::Settings => {
                self.screen = self.menu_return;
                self.push_cue(audio_map::CUE_UI_BACK);
            }
            Screen::Paused => {
                self.screen = Screen::Playing;
                self.push_cue(audio_map::CUE_UI_SELECT);
            }
            Screen::Playing => self.toggle_pause(),
            Screen::Over => self.show_title(),
            Screen::Title => {}
        }
    }

    fn confirm(&mut self) {
        match self.screen {
            Screen::Title => {
                self.reset(self.base_seed, 0, 99);
                self.push_cue(audio_map::CUE_UI_SELECT);
            }
            Screen::Paused => {
                self.screen = Screen::Playing;
                self.push_cue(audio_map::CUE_UI_SELECT);
            }
            Screen::Over => {
                self.reset(self.base_seed, 0, 99);
                self.push_cue(audio_map::CUE_UI_SELECT);
            }
            _ => {}
        }
    }

    fn show_title(&mut self) {
        self.game = Game::with_mode(self.base_seed, 1, GameMode::Classic);
        self.pending = None;
        self.acc = 0.0;
        self.pending_score = None;
        self.screen = Screen::Title;
        self.menu_return = Screen::Title;
        self.want_music(MUSIC_TITLE);
        self.push_cue(audio_map::CUE_UI_BACK);
    }

    /// Cycle-free theme setter (harness sliders and next button).
    pub fn set_theme(&mut self, index: u32) {
        let all = themes::all();
        if let Some(theme) = all.get(index as usize) {
            self.settings.theme = theme.id.to_string();
        }
    }

    /// Difficulty setter.
    pub fn set_difficulty(&mut self, index: u32) -> u32 {
        match difficulty_from_index(index) {
            Some(d) => {
                self.settings.difficulty = d;
                1
            }
            None => 0,
        }
    }

    /// Apply a settings blob previously produced by [`persist::save`].
    /// Applies only clean parses (no warnings): corrupt input keeps the
    /// current settings and reports `false` so the harness can warn.
    pub fn apply_settings_blob(&mut self, text: &str) -> bool {
        let (loaded, map, problems) = persist::load(text);
        if problems.is_empty() {
            self.settings = loaded;
            self.keymap = map;
            self.apply_theme_fallback();
            true
        } else {
            false
        }
    }

    /// Add the finished run to the table under `name`.
    pub fn add_score(&mut self, name: &str) -> bool {
        match self.pending_score.take() {
            Some((score, level)) => {
                if self.scores.add(name, score, level) {
                    true
                } else {
                    self.pending_score = Some((score, level));
                    false
                }
            }
            None => false,
        }
    }
}

impl Default for WebSession {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn session() -> WebSession {
        WebSession::new()
    }

    #[test]
    fn title_boots_with_attract_music() {
        let mut s = session();
        assert_eq!(s.screen().wire(), SCREEN_TITLE);
        assert_eq!(s.poll_music(), MUSIC_TITLE);
        assert_eq!(s.poll_music(), MUSIC_NO_CHANGE);
    }

    #[test]
    fn confirm_starts_a_run_and_wall_clock_steps() {
        let mut s = session();
        assert_eq!(s.key(input::KEY_ENTER, 1), 1);
        assert_eq!(s.screen(), Screen::Playing);
        s.step(0);
        s.step(100);
        // 100 ms at 120 Hz advances the tick counter.
        assert!(s.game().tick_count > 0, "ticks run");
        assert!(s.frame_no() >= 2);
    }

    #[test]
    fn pause_toggle_freezes_ticks() {
        let mut s = session();
        s.key(input::KEY_ENTER, 1);
        s.step(0);
        s.step(50);
        let ticks = s.game().tick_count;
        s.press(BTN_PAUSE);
        assert_eq!(s.screen(), Screen::Paused);
        s.step(5000);
        assert_eq!(s.game().tick_count, ticks, "paused ticks freeze");
        s.press(BTN_RESUME);
        assert_eq!(s.screen(), Screen::Playing);
    }

    #[test]
    fn steering_reaches_the_engine() {
        let mut s = session();
        s.key(input::KEY_ENTER, 1);
        assert_eq!(s.key(input::KEY_UP, 1), 1);
        assert_eq!(s.key(input::KEY_SPACE, 0), 0, "key-up ignored");
        assert_eq!(s.key(99, 1), 0, "unknown ignored");
        assert_eq!(s.swipe(3.0, 2.0), 0, "tap-sized swipe ignored");
        assert_eq!(s.swipe(80.0, 5.0), 1);
    }

    #[test]
    fn menus_navigate_and_return() {
        let mut s = session();
        assert_eq!(s.goto(SCREEN_HELP), 1);
        assert_eq!(s.screen(), Screen::Help);
        s.press(BTN_BACK);
        assert_eq!(s.screen(), Screen::Title);
        assert_eq!(s.goto(SCREEN_PLAYING), 0, "never jump straight in");
        s.key(input::KEY_ENTER, 1);
        s.press(BTN_PAUSE);
        assert_eq!(s.goto(SCREEN_SETTINGS), 1);
        assert_eq!(s.screen(), Screen::Settings);
        s.press(BTN_BACK);
        assert_eq!(s.screen(), Screen::Paused, "back returns to pause");
    }

    #[test]
    fn theme_and_difficulty_cycle() {
        let mut s = session();
        let count = WebSession::theme_count();
        assert!(count >= 3);
        let first = s.theme_index();
        s.press(BTN_THEME_NEXT);
        assert_eq!(s.theme_index(), (first + 1) % count);
        let d0 = difficulty_index(s.settings().difficulty);
        s.press(BTN_DIFFICULTY_NEXT);
        assert_eq!(difficulty_index(s.settings().difficulty), (d0 + 1) % 3);
        assert_eq!(s.set_difficulty(9), 0);
    }

    #[test]
    fn rebind_steals_without_orphaning() {
        use maze_chase_config::keymap::{Action, Key};
        let mut s = session();
        assert_eq!(s.rebind(0), 1, "arm Up");
        assert!(s.capture_armed());
        // Down-arrow belongs to Down (which keeps S): the steal succeeds,
        // Up collapses to the new key, Down keeps its twin.
        assert_eq!(s.key(input::KEY_DOWN, 1), 1);
        assert!(!s.capture_armed());
        assert!(s.capture_ok());
        assert_eq!(s.keymap().keys(Action::Up), &[Key::Down]);
        assert_eq!(s.keymap().keys(Action::Down), &[Key::S]);
        // Stealing Pause's only key would orphan it: refused, map intact.
        assert_eq!(s.rebind(5), 1, "arm Confirm");
        assert_eq!(s.key(input::KEY_P, 1), 2, "orphan move refused");
        assert!(!s.capture_ok());
        assert_eq!(s.keymap().keys(Action::Pause), &[Key::P]);
        assert_eq!(s.rebind(9), 0, "out of range");
        assert_eq!(s.rebind(REBIND_CANCEL), 1);
    }

    #[test]
    fn settings_blob_round_trips() {
        let mut s = session();
        s.set_theme(2);
        s.press(BTN_DIFFICULTY_NEXT);
        let blob = persist::save(s.settings(), s.keymap());
        let mut other = session();
        assert!(other.apply_settings_blob(&blob));
        assert_eq!(other.settings().theme, s.settings().theme);
        assert_eq!(
            difficulty_index(other.settings().difficulty),
            difficulty_index(s.settings().difficulty)
        );
        assert!(
            !other.apply_settings_blob("difficulty = nonsense\n"),
            "garbage keeps current settings"
        );
    }

    #[test]
    fn game_over_flow_queues_name_entry() {
        let mut s = session();
        s.key(input::KEY_ENTER, 1);
        // Three kills with full death sequences between them exhaust the
        // spare wicks through the public engine path only.
        let mut now = 0u32;
        for _ in 0..200 {
            s.game.kill_player();
            now = now.wrapping_add(250);
            s.step(now);
            if s.screen() == Screen::Over {
                break;
            }
        }
        assert_eq!(s.screen(), Screen::Over, "three deaths end the run");
        assert!(s.pending_score.is_some());
        assert_eq!(s.can_add_score(), s.scores.qualifies(s.game.score));
    }

    #[test]
    fn cue_queue_drains_in_order() {
        let mut s = session();
        assert_eq!(s.poll_cue(), 0, "starts empty");
        s.press(BTN_MUTE);
        assert_eq!(s.poll_cue(), audio_map::CUE_MUTE_TOGGLE);
        assert!(s.settings().mute);
        assert_eq!(s.poll_cue(), 0);
    }

    #[test]
    fn wire_ids_cover_every_screen() {
        for (screen, wire) in [
            (Screen::Title, SCREEN_TITLE),
            (Screen::Help, SCREEN_HELP),
            (Screen::Scores, SCREEN_SCORES),
            (Screen::Settings, SCREEN_SETTINGS),
            (Screen::Playing, SCREEN_PLAYING),
            (Screen::Paused, SCREEN_PAUSED),
            (Screen::Over, SCREEN_OVER),
        ] {
            assert_eq!(screen.wire(), wire);
        }
    }
}
