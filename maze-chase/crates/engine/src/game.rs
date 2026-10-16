//! Headless deterministic game state: scoring, lives, level flow.
//!
//! This module owns the pure simulation: fixed-timestep Pip movement, crumb
//! and sunseed pickup, sunseed fright windows, chain scoring, the extra
//! life, bonus relishes, death/respawn, mode rules, and level transitions.
//! It performs no I/O and imports no I/O modules, so replays and benchmarks
//! run identically on every platform.
//!
//! Phase 3 (shipped): relish bonuses with spawn/expire/pickup, pursuer
//! pressure through the wardens, and the extra mode rules (classic,
//! time-attack refill clock, sprint single-life par bonus, fright-frenzy
//! long windows). One endless classic loop otherwise: clear the maze, take
//! the cinematics beat, descend to a fresh maze one level deeper.

use crate::actors::{center_of, step_actor, tile_of, Actor, Dir, TickInput};
use crate::ghosts::Wardens;
use crate::maze::{Maze, Pickup, PLAYER_START_TILE};
use crate::modes::GameMode;
use crate::relish::Relish;
use crate::rng::Rng;
use crate::sha256;
use crate::tuning;

/// Lifecycle of a run.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum GameState {
    Play,
    Dying,
    Clearing,
    Over,
}

/// Deterministic game simulation.
#[derive(Debug)]
pub struct Game {
    pub seed: u64,
    pub level: u32,
    pub mode: GameMode,
    /// Mode clock in seconds (time-attack countdown basis, sprint par
    /// basis; classic and frenzy ignore it but still hash it).
    pub mode_t: f32,
    pub score: u32,
    pub lives: i32,
    pub tick_count: u64,
    acc: f64,
    /// Drained event log (see `take_events`).
    events: Vec<String>,
    extra_life_given: bool,
    pub state: GameState,
    state_t: f32,
    pub player: Actor,
    pub wardens: Wardens,
    pub maze: Maze,
    pub relish: Relish,
    rng: Rng,
    last_tile: (i32, i32),
    crumbs_seen: usize,
}

impl Game {
    /// Fresh classic run at `level` (1-based) from `seed`.
    pub fn new(seed: u64, level: u32) -> Self {
        Self::with_mode(seed, level, GameMode::Classic)
    }

    /// Fresh run under an extra mode ruleset.
    pub fn with_mode(seed: u64, level: u32, mode: GameMode) -> Self {
        assert!(level >= 1, "level must be >= 1");
        let mut game = Self {
            seed,
            level,
            mode,
            mode_t: 0.0,
            score: 0,
            lives: mode.start_lives(),
            tick_count: 0,
            acc: 0.0,
            events: Vec::new(),
            extra_life_given: false,
            state: GameState::Play,
            state_t: 0.0,
            player: Actor::new(0.0, 0.0, Dir::Left, 0.0),
            wardens: Wardens::new(level),
            maze: Maze::new(),
            relish: Relish::new(level),
            rng: Rng::new(seed),
            last_tile: PLAYER_START_TILE,
            crumbs_seen: 0,
        };
        game.reset_positions();
        game.last_tile = tile_of(game.player.x, game.player.y);
        game.eat_current_tile(true);
        game.crumbs_seen = game.maze.dots_eaten;
        game
    }

    fn reset_positions(&mut self) {
        let (cx, cy) = center_of(PLAYER_START_TILE.0, PLAYER_START_TILE.1);
        self.player = Actor::new(cx, cy, Dir::Left, tuning::player_speed(self.level));
        self.player.want = Dir::Left;
        self.wardens = Wardens::new(self.level);
        self.relish.clear_active();
        self.crumbs_seen = self.maze.dots_eaten;
    }

    /// Buffer a heading for the next ticks.
    pub fn set_want(&mut self, dir: Dir) {
        self.player.want = dir;
    }

    /// Drain the event log since the last call.
    pub fn take_events(&mut self) -> Vec<String> {
        core::mem::take(&mut self.events)
    }

    /// Peek at pending events without draining.
    pub fn events(&self) -> &[String] {
        &self.events
    }

    /// Start the death sequence (called by collision resolution).
    pub fn kill_player(&mut self) {
        if self.state != GameState::Play {
            return;
        }
        self.state = GameState::Dying;
        self.state_t = 0.0;
        self.events.push("death".to_string());
    }

    /// Score a warden eaten during fright (200/400/800/1600 chain).
    pub fn notify_warden_eaten(&mut self) -> u32 {
        if self.state != GameState::Play {
            return 0;
        }
        let idx = self
            .wardens
            .eaten_chain
            .min(tuning::WARDEN_CHAIN_SCORE.len() - 1);
        let points = tuning::WARDEN_CHAIN_SCORE[idx];
        self.wardens.eaten_chain += 1;
        self.add_score(points);
        self.events.push(format!("warden:{points}"));
        points
    }

    /// Add points with the extra-life rule. Crate-visible so the verify
    /// harness can stage scores without playing a thousand crumbs; layers
    /// (separate crates) can only score through simulation.
    pub(crate) fn add_score(&mut self, points: u32) {
        let before = self.score;
        self.score = self.score.saturating_add(points);
        if self.mode.extra_life_allowed()
            && !self.extra_life_given
            && before < tuning::EXTRA_LIFE_AT
            && self.score >= tuning::EXTRA_LIFE_AT
        {
            self.extra_life_given = true;
            self.lives += 1;
            self.events.push("extra-life".to_string());
        }
    }

    /// Advance by `dt` seconds (any positive dt; fixed 120 Hz inside).
    /// Returns the events raised since the previous call.
    ///
    /// Tick accounting runs in f64: `tuning::STEP` is an f32 whose widening
    /// to f64 sits a hair above `1.0/120.0`, so comparing a summed f64
    /// accumulator against the widened f32 would starve the loop. The tick
    /// itself still integrates at f32 precision.
    pub fn step(&mut self, dt: f64, want: TickInput) -> Vec<String> {
        assert!(dt > 0.0, "dt must be positive");
        if self.state == GameState::Over {
            return self.take_events();
        }
        if let Some(dir) = want {
            self.set_want(dir);
        }
        const STEP64: f64 = 1.0 / 120.0;
        self.acc = (self.acc + dt).min(tuning::MAX_ACCUMULATOR as f64);
        while self.acc >= STEP64 {
            self.acc -= STEP64;
            self.tick(STEP64 as f32);
        }
        self.take_events()
    }

    /// Advance exactly one fixed tick (120 Hz). Public for the verify
    /// harness and replays; layers should prefer `step`.
    pub fn tick(&mut self, dt: f32) {
        if self.state == GameState::Over {
            return;
        }
        // Time-attack clock runs through play and the death beat; at
        // time-up the run ends wherever it stands.
        if self.mode == GameMode::TimeAttack
            && matches!(self.state, GameState::Play | GameState::Dying)
        {
            self.mode_t += dt;
            if self.mode_t >= tuning::TIME_ATTACK_S {
                self.state = GameState::Over;
                self.events.push("time-up".to_string());
                return;
            }
        }
        if self.mode == GameMode::Sprint && self.state == GameState::Play {
            self.mode_t += dt;
        }
        self.tick_count += 1;
        match self.state {
            GameState::Dying => {
                self.state_t += dt;
                if self.state_t >= tuning::DEATH_SEQUENCE_S {
                    self.lives -= 1;
                    if self.lives < 0 {
                        self.state = GameState::Over;
                        self.events.push("game-over".to_string());
                    } else {
                        self.reset_positions();
                        self.last_tile = tile_of(self.player.x, self.player.y);
                        self.state = GameState::Play;
                        self.events.push("respawn".to_string());
                    }
                }
                return;
            }
            GameState::Clearing => {
                self.state_t += dt;
                if self.state_t >= tuning::LEVEL_CLEAR_SEQUENCE_S {
                    self.finish_clear();
                }
                return;
            }
            GameState::Over => return,
            GameState::Play => {}
        }

        // Pip cruise for this tick (fright + tunnel modifiers).
        let mut speed = tuning::player_speed(self.level);
        if self.wardens.fright_active() {
            speed *= tuning::FRIGHT_PLAYER_FRACTION;
        }
        if self.maze.is_tunnel(
            tile_of(self.player.x, self.player.y).0,
            tile_of(self.player.x, self.player.y).1,
        ) {
            speed *= tuning::PLAYER_TUNNEL_FRACTION;
        }
        self.player.speed = speed;
        step_actor(&self.maze, &mut self.player, dt, false);

        // Pickup on tile change (plus the settle case below).
        let tile = tile_of(self.player.x, self.player.y);
        if tile != self.last_tile {
            self.last_tile = tile;
            self.eat_current_tile(false);
        }
        if self.maze.dots_eaten != self.crumbs_seen {
            let delta = self.maze.dots_eaten - self.crumbs_seen;
            self.crumbs_seen = self.maze.dots_eaten;
            self.wardens.notify_crumbs(delta);
        }

        // Bonus relish schedule: ripen, expire, and pickup.
        if self.relish.notify_dots(self.maze.dots_eaten) {
            self.events
                .push(format!("relish:spawn:{}", self.relish.value));
        }
        if self.relish.tick(dt) {
            self.events.push("relish:gone".to_string());
        }
        let bounty = self.relish.try_eat(tile);
        if bounty > 0 {
            self.add_score(bounty);
            self.events.push(format!("relish:{bounty}"));
        }

        // Wardens move on the same tick.
        let player_tile = tile_of(self.player.x, self.player.y);
        let warden_events = self.wardens.step(
            &self.maze,
            &mut self.rng,
            dt,
            crate::ghosts::PlayerCtx {
                tile: player_tile,
                dir: self.player.dir,
                speed,
                ghost_factor: self.mode.ghost_factor(),
            },
        );
        self.events.extend(warden_events);

        // Collisions: frightened contact eats first, otherwise Pip dies.
        let (eaten, death) = self.wardens.collide((self.player.x, self.player.y));
        for _ in 0..eaten {
            self.notify_warden_eaten();
        }
        if death > 0 {
            self.kill_player();
        }

        // Level clear when the last crumb falls.
        if self.maze.pickups_left() == 0 && self.state == GameState::Play {
            self.state = GameState::Clearing;
            self.state_t = 0.0;
            self.events.push("level-clear".to_string());
        }
    }

    /// End-of-clearing fan-out per mode: classic/frenzy descend one level
    /// deeper, sprint banks its par-time bonus then descends, and
    /// time-attack refills the same maze against its clock.
    fn finish_clear(&mut self) {
        if self.mode == GameMode::TimeAttack {
            self.maze = Maze::new();
            self.relish = Relish::new(self.level);
            self.reset_positions();
            self.last_tile = tile_of(self.player.x, self.player.y);
            self.eat_current_tile(true);
            self.crumbs_seen = self.maze.dots_eaten;
            self.state = GameState::Play;
            self.events.push("refill".to_string());
            return;
        }
        if self.mode == GameMode::Sprint {
            let spare_s = (tuning::SPRINT_PAR_S - self.mode_t).max(0.0);
            let bonus = (spare_s * tuning::SPRINT_BONUS_PER_S as f32) as u32;
            self.add_score(bonus);
            self.events.push(format!("sprint-bonus:{bonus}"));
        }
        self.level += 1;
        self.maze = Maze::new();
        self.relish = Relish::new(self.level);
        self.reset_positions();
        self.last_tile = tile_of(self.player.x, self.player.y);
        self.eat_current_tile(true);
        self.crumbs_seen = self.maze.dots_eaten;
        self.state = GameState::Play;
        self.events.push(format!("level:{}", self.level));
    }

    fn eat_current_tile(&mut self, initial: bool) {
        match self.maze.eat_at(self.last_tile.0, self.last_tile.1) {
            Some(Pickup::Dot) => {
                self.add_score(tuning::DOT_SCORE);
                if !initial {
                    self.events.push("dot".to_string());
                }
            }
            Some(Pickup::Energizer) => {
                self.add_score(tuning::ENERGIZER_SCORE);
                if !initial {
                    self.events.push("sunseed".to_string());
                }
                self.wardens.eaten_chain = 0;
                let duration = self.mode.fright_duration(self.level);
                self.wardens.start_fright(duration);
                if duration > 0.0 {
                    self.events.push(format!("fright:{duration:.1}"));
                }
            }
            None => {}
        }
    }

    /// Crumbs + sunseeds still standing.
    pub fn dots_left(&self) -> usize {
        self.maze.pickups_left()
    }

    /// Canonical state string: mode, mode clock, seed, level, score,
    /// lives, tick, positions, crumb field, relish, warden clocks, and
    /// wave clock. Floats print at fixed precision so hashes are stable
    /// across platforms.
    pub fn canonical(&self) -> String {
        let p = self.player.state_tuple();
        let state = match self.state {
            GameState::Play => "play",
            GameState::Dying => "dying",
            GameState::Clearing => "clearing",
            GameState::Over => "over",
        };
        let field: String = self
            .maze
            .dot_bytes()
            .iter()
            .map(|b| (b + b'0') as char)
            .collect();
        format!(
            "{}|{:.3}|{}|{}|{}|{}|{}|{:.4}|{:.4}|{}|{}|{}|{}|{}|{}",
            self.mode.as_str(),
            self.mode_t,
            self.seed,
            self.level,
            self.score,
            self.lives,
            self.tick_count,
            p.0,
            p.1,
            p.2,
            p.3,
            state,
            field,
            self.relish.canonical(),
            self.wardens.canonical(),
        )
    }

    /// SHA-256 over the canonical state string.
    pub fn state_hash(&self) -> String {
        sha256::hex(self.canonical().as_bytes())
    }

    /// True while the run accepts simulation (not game over).
    pub fn running(&self) -> bool {
        self.state != GameState::Over
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fresh_game_eats_start_tile() {
        let game = Game::new(0, 1);
        // Start tile (13,23) holds a crumb: +10 at once, no event logged.
        assert_eq!(game.score, tuning::DOT_SCORE);
        assert!(game.events.is_empty());
        assert_eq!(game.lives, tuning::START_LIVES);
    }

    #[test]
    fn death_respawn_and_defeat() {
        let mut game = Game::new(3, 1);
        game.kill_player();
        for _ in 0..(1.4 * 120.0 + 10.0) as usize {
            game.tick(tuning::STEP);
        }
        assert_eq!(game.state, GameState::Play);
        assert_eq!(game.lives, tuning::START_LIVES - 1);
        // Burn the remaining lives: defeat drops below zero.
        for _ in 0..3 {
            game.kill_player();
            for _ in 0..(1.4 * 120.0 + 10.0) as usize {
                game.tick(tuning::STEP);
            }
        }
        assert_eq!(game.state, GameState::Over);
        assert_eq!(game.lives, -1);
        assert!(game.events.contains(&"game-over".to_string()));
    }

    #[test]
    fn level_clear_advances_on_fresh_maze() {
        let mut game = Game::new(5, 1);
        // Eat everything by hand through the maze API, then tick once so
        // the clear check fires.
        for y in 0..crate::maze::HEIGHT {
            for x in 0..crate::maze::WIDTH {
                game.maze.eat_at(x, y);
            }
        }
        assert_eq!(game.maze.pickups_left(), 0);
        game.tick(tuning::STEP);
        assert_eq!(game.state, GameState::Clearing);
        for _ in 0..(2.0 * 120.0 + 10.0) as usize {
            game.tick(tuning::STEP);
        }
        assert_eq!(game.state, GameState::Play);
        assert_eq!(game.level, 2);
        assert!(game.maze.pickups_left() > 0);
        assert!(game.events.iter().any(|e| e == "level:2"));
    }

    #[test]
    fn extra_life_fires_once() {
        let mut game = Game::new(9, 1);
        game.add_score(tuning::EXTRA_LIFE_AT);
        assert_eq!(game.lives, tuning::START_LIVES + 1);
        game.add_score(50_000);
        assert_eq!(game.lives, tuning::START_LIVES + 1);
    }

    #[test]
    fn determinism_same_seed_same_hash() {
        let mut a = Game::new(42, 1);
        let mut b = Game::new(42, 1);
        for i in 0..600 {
            let want = if i % 120 < 30 {
                Some(Dir::Left)
            } else if i % 120 < 60 {
                Some(Dir::Up)
            } else {
                None
            };
            a.step(1.0 / 120.0, want);
            b.step(1.0 / 120.0, want);
        }
        assert_eq!(a.state_hash(), b.state_hash());
        let mut c = Game::new(43, 1);
        for _ in 0..600 {
            c.step(1.0 / 120.0, None);
        }
        assert_ne!(a.state_hash(), c.state_hash());
    }

    #[test]
    fn sprint_runs_single_life_without_fright() {
        let mut game = Game::with_mode(11, 1, GameMode::Sprint);
        assert_eq!(game.lives, 0);
        assert_eq!(game.mode.fright_duration(1), 0.0);
        // A sunseed under sprint opens no window and scores no chain.
        game.wardens.start_fright(game.mode.fright_duration(1));
        assert!(!game.wardens.fright_active());
        // One caught ends the run: defeat drops below zero at once.
        game.kill_player();
        for _ in 0..(1.4 * 120.0 + 10.0) as usize {
            game.tick(tuning::STEP);
        }
        assert_eq!(game.state, GameState::Over);
        // No spare wick at 10,000 either: one life is one life.
        let mut rich = Game::with_mode(12, 1, GameMode::Sprint);
        rich.add_score(tuning::EXTRA_LIFE_AT);
        assert_eq!(rich.lives, 0);
    }

    #[test]
    fn sprint_banks_par_bonus_on_clear() {
        let mut game = Game::with_mode(13, 1, GameMode::Sprint);
        for y in 0..crate::maze::HEIGHT {
            for x in 0..crate::maze::WIDTH {
                game.maze.eat_at(x, y);
            }
        }
        game.tick(tuning::STEP);
        assert_eq!(game.state, GameState::Clearing);
        for _ in 0..(2.0 * 120.0 + 10.0) as usize {
            game.tick(tuning::STEP);
        }
        assert_eq!(game.level, 2);
        // Cleared almost instantly: near-full par bonus banked.
        assert!(game.events.iter().any(|e| e.starts_with("sprint-bonus:")));
        let bonus: u32 = game
            .events
            .iter()
            .find(|e| e.starts_with("sprint-bonus:"))
            .unwrap()["sprint-bonus:".len()..]
            .parse()
            .unwrap();
        assert!(bonus >= 2990);
    }

    #[test]
    fn time_attack_refills_and_times_out() {
        let mut game = Game::with_mode(14, 1, GameMode::TimeAttack);
        for y in 0..crate::maze::HEIGHT {
            for x in 0..crate::maze::WIDTH {
                game.maze.eat_at(x, y);
            }
        }
        game.tick(tuning::STEP);
        for _ in 0..(2.0 * 120.0 + 10.0) as usize {
            game.tick(tuning::STEP);
        }
        // Same level, fresh maze, clock still running.
        assert_eq!(game.level, 1);
        assert!(game.maze.pickups_left() > 0);
        assert!(game.events.iter().any(|e| e == "refill"));
        // Run out the clock through play: time-up ends the run.
        // (`step` drains the log, so keep the final batch for the event.)
        let mut last = Vec::new();
        while game.running() {
            last = game.step(1.0 / 120.0, None);
        }
        assert_eq!(game.state, GameState::Over);
        assert!(last.iter().any(|e| e == "time-up"));
    }

    #[test]
    fn frenzy_opens_long_windows_at_depth() {
        let game = Game::with_mode(15, 11, GameMode::FrightFrenzy);
        // Level 11 classic fright is 0; frenzy floors at 1.0 s.
        assert_eq!(game.mode.fright_duration(11), 1.0);
        assert!((game.mode.ghost_factor() - 0.9).abs() < 1e-5);
    }
}
