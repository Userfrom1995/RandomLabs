//! Desktop session: the game on the shared engine behind the GUI.
//!
//! [`App`] mirrors the terminal session contract (same settings and
//! scores files in the same directory, so machine settings and high
//! scores are shared across layers): keyboard and pad input map to
//! `TickInput`, rendering reads `Game` state plus drained events, and
//! audio follows screen/fright state. The simulation advances on a
//! fixed 120 Hz accumulator (at most 5 steps per frame; surplus time is
//! dropped instead of spiral-of-death stepping), so identical input
//! timing replays identically.

use crate::gamepad::{PadMap, PadPoll};
use crate::render::{self, Hud, MenuLine};
use crate::screens::{self, Event, ScreenId, Screens};
use maze_chase_audio::cue::cue_for_event;
use maze_chase_audio::sink::{Audio, TuneId};
use maze_chase_config::{persist, preset, Action, Key, Keymap, Settings};
use maze_chase_engine::actors::Dir;
use maze_chase_engine::game::{Game, GameState};
use maze_chase_engine::tuning::STEP;
use maze_chase_terminal::app::today_ymd;
use maze_chase_terminal::scores::{self, Score};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

pub const SETTINGS_FILE: &str = "settings.txt";
pub const SCORES_FILE: &str = "scores.txt";
pub const PADMAP_FILE: &str = "padmap.txt";
/// Fixed simulation step (matches the engine 120 Hz clock).
pub const FIXED_DT: f64 = STEP as f64;
/// Cap per frame (drop surplus instead of spiralling).
pub const MAX_STEPS_PER_FRAME: u32 = 5;

fn fresh_seed() -> u64 {
    let now = SystemTime::now().duration_since(UNIX_EPOCH);
    let (secs, nanos) = now
        .map(|d| (d.as_secs(), d.subsec_nanos() as u64))
        .unwrap_or((0, 0x9E37_79B9));
    secs.wrapping_mul(0x9E37_79B9_7F4A_7C15).wrapping_add(nanos)
}

fn ticker_for(event: &str) -> Option<String> {
    if event == "dot" || event.starts_with("wave:") || event.starts_with("house-") {
        return None;
    }
    if let Some(rest) = event.strip_prefix("warden:") {
        return Some(format!("WARDEN EATEN +{rest}"));
    }
    if let Some(rest) = event.strip_prefix("relish:spawn:") {
        return Some(format!("A RELISH RIPENS (WORTH {rest})"));
    }
    if let Some(rest) = event.strip_prefix("relish:") {
        if rest != "gone" {
            return Some(format!("RELISH +{rest}"));
        }
        return Some("THE RELISH FADED".into());
    }
    if let Some(rest) = event.strip_prefix("sprint-bonus:") {
        return Some(format!("SPRINT BONUS +{rest}"));
    }
    if let Some(rest) = event.strip_prefix("level:") {
        return Some(format!("DESCENDING TO LEVEL {rest}"));
    }
    match event {
        "sunseed" => Some("SUNSEED! THE HUNT TURNS".into()),
        "death" => Some("CAUGHT!".into()),
        "respawn" => Some("BACK IN THE WARREN".into()),
        "extra-life" => Some("SPARE WICK!".into()),
        "clear" => Some("WARREN CLEAR!".into()),
        "game-over" => Some("NO WICKS LEFT".into()),
        _ => None,
    }
}

/// The desktop game session.
pub struct App {
    pub game: Game,
    pub settings: Settings,
    pub keymap: Keymap,
    pub padmap: PadMap,
    pub screens: Screens,
    pub scores: Vec<Score>,
    pub audio: Box<dyn Audio>,
    pub audio_live: bool,
    pub pad: PadPoll,
    pub dir: PathBuf,
    pending_dir: Option<Dir>,
    acc: f64,
    pub frame_no: u64,
    fps_ema: f64,
    ticker: Option<(String, u64)>,
    was_running: bool,
    seed_counter: u64,
    tune: TuneId,
    pub quit: bool,
}

impl App {
    /// Load settings/scores/padmap from `dir`, probe audio and gamepads.
    pub fn new(dir: PathBuf) -> Self {
        let (audio, live) = crate::sound::open_or_null();
        Self::with_audio(dir, audio, live)
    }

    /// Constructor with an explicit sink (tests use `NullSink`/`RecordSink`).
    pub fn with_audio(dir: PathBuf, audio: Box<dyn Audio>, live: bool) -> Self {
        let (settings, keymap, _) = persist::load_from(&dir.join(SETTINGS_FILE));
        let (scores, _) = scores::load_from(&dir.join(SCORES_FILE));
        let (padmap, _) = std::fs::read_to_string(dir.join(PADMAP_FILE))
            .map(|t| PadMap::parse(&t))
            .unwrap_or((PadMap::defaults(), Vec::new()));
        let mut app = Self {
            game: Game::new(1, 1),
            screens: Screens::new(settings.clone()),
            settings,
            keymap,
            padmap,
            scores,
            audio,
            audio_live: live,
            pad: PadPoll::probe(),
            dir,
            pending_dir: None,
            acc: 0.0,
            frame_no: 0,
            fps_ema: 60.0,
            ticker: None,
            was_running: false,
            seed_counter: 0,
            tune: TuneId::None,
            quit: false,
        };
        app.sync_audio();
        app.apply_tune();
        app
    }

    /// Theme for the current settings (unknown ids fall back to Ember).
    pub fn theme(&self) -> &'static maze_chase_assets::themes::Theme {
        maze_chase_assets::themes::by_id(&self.settings.theme)
            .unwrap_or(&maze_chase_assets::themes::EMBER_WARREN)
    }

    fn save_settings(&self) {
        let _ = persist::save_to(&self.settings, &self.keymap, &self.dir.join(SETTINGS_FILE));
        let _ = std::fs::write(self.dir.join(PADMAP_FILE), self.padmap.save());
    }

    fn sync_audio(&mut self) {
        self.audio.set_master(self.settings.master);
        self.audio.set_music(self.settings.music);
        self.audio.set_sfx(self.settings.sfx);
        self.audio.set_muted(self.settings.mute);
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
        self.tune = tune;
        self.audio.start_music(tune);
    }

    fn start_game(&mut self) {
        let p = preset(self.settings.difficulty);
        self.seed_counter += 1;
        let seed = fresh_seed().wrapping_add(self.seed_counter);
        self.game = Game::with_mode(seed, p.start_level, p.mode);
        self.pending_dir = None;
        self.acc = 0.0;
        self.was_running = true;
        self.ticker = None;
        self.screens.show(ScreenId::Playing);
        self.apply_tune();
    }

    fn apply_event(&mut self, event: Event) {
        match event {
            Event::None => {}
            Event::StartGame => self.start_game(),
            Event::PauseGame | Event::ResumeGame => self.apply_tune(),
            Event::Quit => self.quit = true,
            Event::QuitToTitle => {
                self.was_running = false;
                self.screens.show(ScreenId::Title);
                self.apply_tune();
            }
            Event::SettingsCommitted => {
                self.settings = self.screens.settings.clone();
                self.sync_audio();
                self.save_settings();
            }
            Event::RebindFailed(_) => self.save_settings(),
        }
    }

    /// Feed one keyboard key through capture, globals, and screens.
    pub fn on_key(&mut self, key: Key) {
        use maze_chase_terminal::input::action_for_key;
        if self.screens.capture.is_some() && self.screens.current == ScreenId::Rebind {
            if let Some(action) = action_for_key(&self.keymap, key) {
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
        let Some(action) = action_for_key(&self.keymap, key) else {
            return;
        };
        self.on_action(action);
    }

    /// Feed one gamepad button press through capture and screens.
    pub fn on_pad_button(&mut self, button: gilrs::Button) {
        if self.screens.pad_capture.is_some() && self.screens.current == ScreenId::PadBind {
            if let Some(action) = self.padmap.action_for_button(button) {
                if action == Action::Back {
                    self.screens.pad_capture = None;
                    self.screens.pad_capture_error = None;
                    return;
                }
            }
            let event = self.screens.capture_pad(&mut self.padmap, button);
            self.save_settings();
            self.apply_event(event);
            return;
        }
        if let Some(action) = self.padmap.action_for_button(button) {
            self.on_action(action);
        }
    }

    /// Route one resolved action (keyboard, pad, or oscillating test).
    pub fn on_action(&mut self, action: Action) {
        use maze_chase_terminal::input::dir_for_action;
        if action == Action::Mute {
            self.settings.mute = !self.settings.mute;
            self.screens.settings.mute = self.settings.mute;
            self.audio.play(maze_chase_audio::cue::Cue::MuteToggle);
            self.sync_audio();
            self.save_settings();
            return;
        }
        if self.screens.current == ScreenId::Title && action == Action::Back {
            self.quit = true;
            return;
        }
        match self.screens.current {
            ScreenId::Playing => {
                if let Some(dir) = dir_for_action(action) {
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
            ScreenId::Settings | ScreenId::Audio => {
                if action == Action::Left || action == Action::Right {
                    self.screens.adjust(action == Action::Left);
                    // Commit live so slider moves give immediate audible
                    // feedback and persist without waiting for Back.
                    self.settings = self.screens.settings.clone();
                    self.sync_audio();
                    self.save_settings();
                } else {
                    let event = self.screens.press(action);
                    self.apply_event(event);
                }
            }
            _ => {
                if action == Action::Left || action == Action::Right {
                    self.screens.adjust(action == Action::Left);
                }
                let event = self.screens.press(action);
                self.apply_event(event);
            }
        }
    }

    /// Drain gamepad hardware into actions (called once per frame).
    pub fn poll_pad(&mut self) {
        if self.screens.current == ScreenId::PadBind && self.screens.pad_capture.is_some() {
            // Capture mode consumes raw buttons, not mapped actions.
            let mut raw = Vec::new();
            if let Some(g) = self.pad_gilrs_events() {
                raw = g;
            }
            for b in raw {
                self.on_pad_button(b);
            }
            return;
        }
        let events = self.pad.drain(&self.padmap);
        for ev in events {
            if ev.pressed {
                self.on_pad_button_action(ev.action);
            }
        }
        if self.screens.current == ScreenId::Playing {
            if let Some(dir) = self.pad.stick_dir() {
                self.pending_dir = Some(dir);
            }
        }
    }

    /// Raw pressed buttons since the last drain (capture path).
    fn pad_gilrs_events(&mut self) -> Option<Vec<gilrs::Button>> {
        use gilrs::EventType;
        let g = self.pad.gilrs_mut()?;
        let mut out = Vec::new();
        while let Some(ev) = g.next_event() {
            if let EventType::ButtonPressed(b, _) = ev.event {
                out.push(b);
            }
        }
        Some(out)
    }

    fn on_pad_button_action(&mut self, action: Action) {
        use maze_chase_terminal::input::dir_for_action;
        // Pad D-pad repeats nothing when held, so directions latch and
        // menus advance per press like the keyboard path.
        if self.screens.current == ScreenId::Playing {
            if let Some(dir) = dir_for_action(action) {
                self.pending_dir = Some(dir);
                return;
            }
        }
        self.on_action(action);
    }

    /// Advance the session by `dt` seconds of wall time.
    pub fn tick(&mut self, dt: f64) {
        self.frame_no += 1;
        if dt > 0.0 && dt.is_finite() {
            let fps = 1.0 / dt.max(1e-6);
            self.fps_ema += (fps - self.fps_ema) * 0.05;
        }
        if self.screens.current != ScreenId::Playing {
            return;
        }
        self.acc += dt.clamp(0.0, 0.25);
        let mut steps = 0;
        while self.acc >= FIXED_DT && steps < MAX_STEPS_PER_FRAME {
            self.acc -= FIXED_DT;
            steps += 1;
            let events = self.game.step(FIXED_DT, self.pending_dir.take());
            for event in &events {
                if let Some(t) = ticker_for(event) {
                    self.ticker = Some((t, self.frame_no));
                }
                if let Some(cue) = cue_for_event(event) {
                    self.audio.play(cue);
                }
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

    /// Fresh ticker line, if any (8 s at 60 fps).
    pub fn ticker(&self) -> Option<&str> {
        self.ticker
            .as_ref()
            .filter(|(_, at)| self.frame_no.saturating_sub(*at) < 480)
            .map(|(t, _)| t.as_str())
    }

    /// Compose the current surface at `w`x`h` window pixels.
    pub fn render(&self, w: u32, h: u32) -> Option<crate::frame::Frame> {
        let theme = self.theme();
        let best = self.scores.first().map(|s| s.score).unwrap_or(0);
        match self.screens.current {
            ScreenId::Playing | ScreenId::Paused => {
                let hud = Hud {
                    best,
                    frame_no: self.frame_no,
                    flash: !self.settings.reduced_flash,
                    fps: self.settings.show_fps.then_some(self.fps_ema as f32),
                    tune: tune_name(self.tune),
                };
                let mut frame = render::render_play(&self.game, theme, hud, w, h)?;
                if self.screens.current == ScreenId::Paused {
                    overlay_pause(&mut frame, &self.screens, theme);
                }
                Some(frame)
            }
            ScreenId::Title => {
                let lines: Vec<MenuLine> = screens::MenuItem::ALL
                    .iter()
                    .enumerate()
                    .map(|(i, m)| MenuLine::at(m.label(), i == self.screens.menu))
                    .collect();
                let footer = match best {
                    0 => "ARROWS/WASD + ENTER - NO SCORES YET",
                    b => &format!("ARROWS/WASD + ENTER - BEST {b}"),
                };
                render::render_menu("MAZE CHASE", &lines, footer, theme, w, h)
            }
            ScreenId::Help => {
                let lines: Vec<MenuLine> = screens::help_window(self.screens.help_scroll)
                    .iter()
                    .map(|l| MenuLine::plain(l))
                    .collect();
                render::render_menu(
                    "HOW TO PLAY",
                    &lines,
                    "UP/DOWN SCROLL - ESC BACK",
                    theme,
                    w,
                    h,
                )
            }
            ScreenId::Scores => {
                let mut lines = vec![MenuLine::plain(&format!("BEST {best}"))];
                for s in &self.scores {
                    lines.push(MenuLine::plain(&scores::format_line(s).to_uppercase()));
                }
                if self.scores.is_empty() {
                    lines.push(MenuLine::plain("NO RUNS YET - PLAY!"));
                }
                render::render_menu("HIGH SCORES", &lines, "ESC BACK", theme, w, h)
            }
            ScreenId::Settings => {
                let rows = self.screens.settings_lines();
                let lines: Vec<MenuLine> = rows
                    .iter()
                    .enumerate()
                    .map(|(i, (label, value))| {
                        let text = if value.is_empty() {
                            label.clone()
                        } else {
                            format!("{label} <{value}>")
                        };
                        MenuLine::at(&text, i == self.screens.settings_row)
                    })
                    .collect();
                render::render_menu(
                    "SETTINGS",
                    &lines,
                    "LEFT/RIGHT ADJUST - ESC BACK",
                    theme,
                    w,
                    h,
                )
            }
            ScreenId::Audio => {
                let rows = self.screens.audio_lines();
                let lines: Vec<MenuLine> = rows
                    .iter()
                    .enumerate()
                    .map(|(i, (label, value))| {
                        let text = if value.is_empty() {
                            label.clone()
                        } else {
                            format!("{label} {value}")
                        };
                        MenuLine::at(&text, i == self.screens.audio_row)
                    })
                    .collect();
                render::render_menu("AUDIO", &lines, "LEFT/RIGHT ADJUST - ESC BACK", theme, w, h)
            }
            ScreenId::Rebind => {
                let lines: Vec<MenuLine> = Action::ALL
                    .iter()
                    .enumerate()
                    .map(|(i, a)| {
                        let keys: Vec<String> = self
                            .keymap
                            .keys(*a)
                            .iter()
                            .map(|k| k.as_str().to_uppercase())
                            .collect();
                        let mut text = format!("{}: {}", a.as_str(), keys.join("/")).to_uppercase();
                        if Some(*a) == self.screens.capture {
                            text = format!("{}: PRESS A KEY...", a.as_str()).to_uppercase();
                        }
                        MenuLine::at(&text, i == self.screens.rebind_action)
                    })
                    .collect();
                let footer = self
                    .screens
                    .capture_error
                    .clone()
                    .unwrap_or_else(|| "ENTER REBIND - ESC BACK".into())
                    .to_uppercase();
                render::render_menu("KEYBINDS", &lines, &footer, theme, w, h)
            }
            ScreenId::PadBind => {
                let lines: Vec<MenuLine> = Action::ALL
                    .iter()
                    .enumerate()
                    .map(|(i, a)| {
                        let mut text = match self.padmap.button(*a) {
                            Some(b) => format!("{}: {b:?}", a.as_str()),
                            None => format!("{}: ---", a.as_str()),
                        }
                        .to_uppercase();
                        if Some(*a) == self.screens.pad_capture {
                            text = format!("{}: PRESS A BUTTON...", a.as_str()).to_uppercase();
                        }
                        MenuLine::at(&text, i == self.screens.padbind_action)
                    })
                    .collect();
                let footer = self
                    .screens
                    .pad_capture_error
                    .clone()
                    .unwrap_or_else(|| "ENTER REMAP - ESC BACK".into())
                    .to_uppercase();
                render::render_menu("PADBINDS", &lines, &footer, theme, w, h)
            }
            ScreenId::Over => {
                let rank = match self.screens.over_rank {
                    Some(r) => format!("RANK #{r}"),
                    None => "UNRANKED".into(),
                };
                let lines = vec![
                    MenuLine::plain(&format!("SCORE {}", self.screens.over_score)),
                    MenuLine::plain(&format!("LEVEL {}", self.screens.over_level)),
                    MenuLine::plain(&rank),
                ];
                render::render_menu("GAME OVER", &lines, "ENTER TITLE", theme, w, h)
            }
        }
    }
}

fn tune_name(id: TuneId) -> &'static str {
    match id {
        TuneId::Title => "TITLE",
        TuneId::Fright => "FRIGHT",
        TuneId::None => "OFF",
    }
}

/// Centered pause panel over the frozen board.
fn overlay_pause(
    frame: &mut crate::frame::Frame,
    screens: &Screens,
    theme: &maze_chase_assets::themes::Theme,
) {
    use crate::font;
    use crate::screens::PauseItem;
    let entries: Vec<String> = PauseItem::ALL
        .iter()
        .enumerate()
        .map(|(i, m)| {
            if i == screens.pause_menu {
                format!("> {}", m.label())
            } else {
                format!("  {}", m.label())
            }
        })
        .collect();
    let w = entries
        .iter()
        .map(|e| font::text_width(e, 2))
        .max()
        .unwrap_or(0)
        + 48;
    let h = font::text_height(entries.len() + 1, 2) + 40;
    let x = frame.w as i32 / 2 - w as i32 / 2;
    let mut y = frame.h as i32 / 2 - h as i32 / 2;
    frame.rect(x, y, w, h, theme.bg);
    frame.border(x, y, w, h, 2, theme.accent);
    y += 16;
    frame.text_centered("PAUSED", frame.w as i32 / 2, y, 2, theme.accent, None);
    y += font::LINE as i32 * 2 + 8;
    for (i, e) in entries.iter().enumerate() {
        let color = if i == screens.pause_menu {
            theme.accent
        } else {
            theme.text
        };
        frame.text_centered(e, frame.w as i32 / 2, y, 2, color, None);
        y += font::LINE as i32 * 2 + 4;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use maze_chase_audio::sink::NullSink;
    use maze_chase_config::Difficulty;

    fn test_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "maze-chase-desktop-test-{}-{name}",
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn test_app(name: &str) -> App {
        let dir = test_dir(name);
        App::with_audio(dir, Box::new(NullSink::new()), false)
    }

    #[test]
    fn start_play_tick_score_and_render() {
        let mut app = test_app("play");
        assert_eq!(app.screens.current, ScreenId::Title);
        app.on_action(Action::Confirm);
        assert_eq!(app.screens.current, ScreenId::Playing);
        app.on_key(Key::Left);
        for _ in 0..600 {
            app.tick(FIXED_DT);
        }
        assert!(app.game.score > 0, "five simulated seconds must score");
        assert!(app.game.tick_count >= 590);
        // Every surface renders at window size without panic.
        for screen in [
            ScreenId::Title,
            ScreenId::Help,
            ScreenId::Scores,
            ScreenId::Settings,
            ScreenId::Audio,
            ScreenId::Rebind,
            ScreenId::PadBind,
            ScreenId::Playing,
            ScreenId::Paused,
            ScreenId::Over,
        ] {
            app.screens.show(screen);
            let frame = app.render(1100, 760).unwrap();
            assert_eq!((frame.w, frame.h), (1100, 760));
        }
        let _ = std::fs::remove_dir_all(&app.dir);
    }

    #[test]
    fn fixed_step_cap_and_frame_counter() {
        let mut app = test_app("fixed");
        app.on_action(Action::Confirm);
        let before = app.game.tick_count;
        app.tick(10.0);
        // Capped: a huge wall dt never steps more than the per-frame max.
        assert_eq!(app.game.tick_count, before + MAX_STEPS_PER_FRAME as u64);
        assert_eq!(app.frame_no, 1);
        let _ = std::fs::remove_dir_all(&app.dir);
    }

    #[test]
    fn mute_toggle_syncs_and_persists() {
        let dir = test_dir("mute");
        let mut app = App::with_audio(dir.clone(), Box::new(NullSink::new()), false);
        assert!(!app.settings.mute);
        app.on_action(Action::Mute);
        assert!(app.settings.mute);
        assert!(app.audio.muted());
        let again = App::with_audio(dir.clone(), Box::new(NullSink::new()), false);
        assert!(again.settings.mute, "mute must survive a restart");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn difficulty_change_persists_across_restarts() {
        let dir = test_dir("difficulty");
        let mut app = App::with_audio(dir.clone(), Box::new(NullSink::new()), false);
        app.screens.show(ScreenId::Settings);
        app.on_action(Action::Confirm);
        assert_ne!(app.screens.settings.difficulty, Difficulty::Standard);
        // Leaving via Back commits the working copy to the session.
        app.on_action(Action::Back);
        assert_eq!(app.screens.current, ScreenId::Title);
        let again = App::with_audio(dir.clone(), Box::new(NullSink::new()), false);
        assert_eq!(again.settings.difficulty, app.settings.difficulty);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn pad_capture_rebinds_without_hardware() {
        use gilrs::Button;
        let mut app = test_app("padbind");
        app.screens.show(ScreenId::PadBind);
        // Arm the Confirm row.
        let confirm_idx = Action::ALL
            .iter()
            .position(|&a| a == Action::Confirm)
            .unwrap();
        while app.screens.padbind_action != confirm_idx {
            app.on_action(Action::Down);
        }
        app.on_action(Action::Confirm);
        assert_eq!(app.screens.pad_capture, Some(Action::Confirm));
        app.on_pad_button(Button::West);
        assert_eq!(
            app.padmap.action_for_button(Button::West),
            Some(Action::Confirm)
        );
        assert_eq!(app.screens.pad_capture, None);
        let _ = std::fs::remove_dir_all(&app.dir);
    }

    #[test]
    fn absent_pad_polls_cleanly_inside_session() {
        let mut app = test_app("nopad");
        app.pad = PadPoll::absent();
        app.on_action(Action::Confirm);
        for _ in 0..120 {
            app.poll_pad();
            app.tick(FIXED_DT);
        }
        assert_eq!(app.screens.current, ScreenId::Playing);
        let _ = std::fs::remove_dir_all(&app.dir);
    }

    #[test]
    fn pause_overlay_keeps_board_visible() {
        let mut app = test_app("pause");
        app.on_action(Action::Confirm);
        for _ in 0..120 {
            app.tick(FIXED_DT);
        }
        app.on_action(Action::Pause);
        assert_eq!(app.screens.current, ScreenId::Paused);
        let frame = app.render(1100, 760).unwrap();
        // Board geometry still paints under the pause panel.
        let wall = maze_chase_assets::themes::EMBER_WARREN.wall;
        assert!(frame.count(wall) > 100);
        let _ = std::fs::remove_dir_all(&app.dir);
    }
}
