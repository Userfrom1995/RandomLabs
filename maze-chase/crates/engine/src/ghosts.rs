//! Warden actors: house exits, personalities, wave clock, fright, eyes.
//!
//! Cast: Bram the leader (warden 0), Kessa (1), Jory (2), Nib (3). Their
//! names, scatter corners, and house slots are original to this project
//! (`docs/identity.md`).
//!
//! Phase 3 behavior (this file):
//!   - Warden 0 starts active at the gatehouse mouth; wardens 1-3 wait in
//!     the house on per-level dot counters ([`tuning::house_counters`]) with
//!     a [`tuning::HOUSE_IDLE_TIMEOUT_S`] idle release, then walk out
//!     through the door on a scripted path at
//!     [`tuning::LEAVING_SPEED_FRACTION`] of cruise.
//!   - The [`WaveClock`] alternates scatter legs (every warden drifts to
//!     its authored corner) with chase legs (the four personalities from
//!     [`personalities`] hunt Pip). Every leg switch reverses all active
//!     wardens, and the second pursuer stage pins chase for the level.
//!   - Active wardens steer greedily toward their leg target (no direct
//!     reversal, fixed Up/Left/Down/Right tie-breaks), slowed in the
//!     tunnel ([`tuning::WARDEN_TUNNEL_FRACTION`]) and while frightened
//!     ([`tuning::FRIGHT_WARDEN_FRACTION`]); frightened wardens wander at
//!     random from the seeded `fright` stream instead.
//!   - Sunseed fright runs a real timer; fright starts reverse the pack.
//!     Touching a frightened warden eats it for the escalating chain
//!     ([`tuning::WARDEN_CHAIN_SCORE`]), otherwise touch kills Pip.
//!     Eat-vs-death priority: frightened contact always eats first.
//!   - An eaten warden becomes eyes that drift home to the gatehouse door
//!     at [`tuning::EYES_SPEED_FRACTION`] of cruise and revive at the
//!     mouth on arrival.
//!   - Late-level pursuer stages: with 20 crumbs left Bram gains 3%
//!     cruise, with 10 left 6% plus a chase pin.

use crate::actors::{center_of, step_actor, tile_of, Actor, Dir};
use crate::maze::{Maze, GHOST_DOOR_TILE, GHOST_OUTSIDE_TILE, HOUSE_SLOTS, SCATTER_CORNERS};
use crate::modes::{WaveClock, WavePhase};
use crate::personalities::chase_target;
use crate::rng::Rng;
use crate::steering::greedy_exit;
use crate::tuning;

/// Display names, original to this project.
pub const NAMES: [&str; 4] = ["Bram", "Kessa", "Jory", "Nib"];
/// Tile-center steering snap window (wardens re-decide at most once per
/// tile-center visit through the `decided` gate).
pub const CENTER_SNAP: f32 = 0.09;

/// Lifecycle of one warden.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum WardenState {
    /// Waiting in the house on `counter` more crumbs.
    House,
    /// Scripted walk out of the gatehouse.
    Leaving,
    /// Hunting in the maze.
    Active,
    /// Eaten: drifting home to the gatehouse door as eyes.
    Eyes,
}

/// Per-tick player context for warden steering: Pip's tile and heading
/// feed the chase targets, `player_speed` derives cruise, and
/// `ghost_factor` carries the mode slowdown (fright-frenzy hunts slower).
#[derive(Clone, Copy, Debug)]
pub struct PlayerCtx {
    pub tile: (i32, i32),
    pub dir: Dir,
    pub speed: f32,
    pub ghost_factor: f32,
}

/// One warden actor.
#[derive(Clone, Debug)]
pub struct Warden {
    pub index: usize,
    pub name: &'static str,
    pub actor: Actor,
    pub state: WardenState,
    /// Crumbs still owed before leaving (House state).
    pub counter: u32,
    pub scatter: (i32, i32),
    /// Last tile where steering ran (decide-once gate).
    pub decided: Option<(i32, i32)>,
}

impl Warden {
    fn state_tuple(&self) -> String {
        let p = self.actor.state_tuple();
        let st = match self.state {
            WardenState::House => "house",
            WardenState::Leaving => "leaving",
            WardenState::Active => "active",
            WardenState::Eyes => "eyes",
        };
        format!(
            "{}:{}:{}:{:.4}:{:.4}:{}:{}",
            st, self.counter, self.name, p.0, p.1, p.2, p.3
        )
    }
}

/// The four wardens plus the shared fright and wave clocks.
#[derive(Debug)]
pub struct Wardens {
    pub wardens: [Warden; 4],
    pub level: u32,
    /// Scatter/chase wave clock for this life.
    pub mode: WaveClock,
    /// Fright seconds remaining (0 = not frightened).
    pub fright_t: f32,
    /// Fright length that started the current window (for flash staging).
    pub fright_total: f32,
    /// Seconds since any crumb was eaten (idle house release).
    pub idle_t: f32,
    /// Wardens eaten in the current fright window (chain index).
    pub eaten_chain: usize,
}

impl Wardens {
    /// Fresh wardens for a level. Warden 0 starts active at the mouth;
    /// the rest wait in the house on counters.
    pub fn new(level: u32) -> Self {
        let counters = tuning::house_counters(level);
        let mk = |index: usize, x: f32, y: f32, state: WardenState| Warden {
            index,
            name: NAMES[index],
            actor: Actor::new(x, y, Dir::Left, 0.0),
            state,
            counter: counters[index],
            scatter: SCATTER_CORNERS[index],
            decided: None,
        };
        let (ox, oy) = center_of(GHOST_OUTSIDE_TILE.0, GHOST_OUTSIDE_TILE.1);
        let w0 = mk(0, ox, oy, WardenState::Active);
        let slots = [
            center_of(HOUSE_SLOTS[0].0, HOUSE_SLOTS[0].1),
            center_of(HOUSE_SLOTS[1].0, HOUSE_SLOTS[1].1),
            center_of(HOUSE_SLOTS[2].0, HOUSE_SLOTS[2].1),
        ];
        Self {
            wardens: [
                w0,
                mk(1, slots[0].0, slots[0].1, WardenState::House),
                mk(2, slots[1].0, slots[1].1, WardenState::House),
                mk(3, slots[2].0, slots[2].1, WardenState::House),
            ],
            level,
            mode: WaveClock::new(level),
            fright_t: 0.0,
            fright_total: 0.0,
            idle_t: 0.0,
            eaten_chain: 0,
        }
    }

    /// Cruise speed for warden `index`: player speed scaled by the warden
    /// fraction, the mode factor (fright-frenzy hunts slower), and Bram's
    /// late-level pursuer bonus.
    pub fn cruise(
        &self,
        player_speed: f32,
        pickups_left: usize,
        index: usize,
        ghost_factor: f32,
    ) -> f32 {
        let mut cruise = player_speed * tuning::WARDEN_SPEED_FRACTION * ghost_factor;
        if index == 0 {
            if pickups_left <= tuning::PURSUER_SECOND_AT {
                cruise *= tuning::PURSUER_SECOND_FRACTION;
            } else if pickups_left <= tuning::PURSUER_FIRST_AT {
                cruise *= tuning::PURSUER_FIRST_FRACTION;
            }
        }
        cruise
    }

    pub fn fright_active(&self) -> bool {
        self.fright_t > 0.0
    }

    /// True while the fright window is in its flashing tail.
    pub fn fright_flashing(&self) -> bool {
        self.fright_active() && self.fright_t <= tuning::FRIGHT_FLASH_THRESHOLD
    }

    /// Reverse every active warden (wave switches, fright starts).
    /// Reversal is instant anywhere, so the flip applies immediately and
    /// the decide-once gate re-arms for the new heading.
    pub fn reverse_all(&mut self) {
        for w in self.wardens.iter_mut() {
            if w.state == WardenState::Active {
                w.actor.dir = w.actor.dir.opposite();
                w.actor.want = w.actor.dir;
                w.decided = None;
            }
        }
    }

    /// Open a fright window (sunseed eaten): restart the timer and the
    /// chain, and reverse the pack.
    pub fn start_fright(&mut self, duration: f32) {
        if duration > 0.0 {
            self.fright_t = duration;
            self.fright_total = duration;
            self.eaten_chain = 0;
            self.reverse_all();
        }
    }

    /// Notify that `n` crumbs were eaten (house counters + idle clock).
    pub fn notify_crumbs(&mut self, n: usize) {
        if n == 0 {
            return;
        }
        self.idle_t = 0.0;
        let mut owed = n;
        for w in self.wardens.iter_mut().skip(1) {
            if w.state != WardenState::House || owed == 0 {
                continue;
            }
            let take = owed.min(w.counter as usize);
            w.counter -= take as u32;
            owed -= take;
            if w.counter == 0 {
                w.state = WardenState::Leaving;
                // Scripted walk anchors: straight up through the door
                // column, then sideways along the mouth row. The Leaving
                // step below walks y first, then x; no teleports.
                w.actor.dir = Dir::Up;
                w.actor.want = Dir::Up;
            }
        }
    }

    /// Advance wardens by `dt` under the player context `player`
    /// (chase targets, cruise derivation, mode slowdown). The maze's
    /// remaining pickups drive the pursuer stages. Returns event strings
    /// for the game log.
    pub fn step(&mut self, maze: &Maze, rng: &mut Rng, dt: f32, player: PlayerCtx) -> Vec<String> {
        let mut events = Vec::new();
        if self.fright_t > 0.0 {
            self.fright_t = (self.fright_t - dt).max(0.0);
            if self.fright_t <= 0.0 {
                events.push("fright-end".to_string());
            }
        }
        // Wave clock: leg switches reverse the pack.
        if self.mode.tick(dt) {
            self.reverse_all();
            let leg = match self.mode.phase() {
                WavePhase::Scatter => "scatter",
                WavePhase::Chase => "chase",
            };
            events.push(format!("wave:{leg}"));
        }
        // Second pursuer stage pins chase (reverses when it flips the leg).
        if maze.pickups_left() <= tuning::PURSUER_SECOND_AT && self.mode.pin_chase() {
            self.reverse_all();
            events.push("wave:chase".to_string());
        }
        self.idle_t += dt;
        if self.idle_t >= tuning::HOUSE_IDLE_TIMEOUT_S {
            self.idle_t = 0.0;
            if let Some(w) = self
                .wardens
                .iter_mut()
                .skip(1)
                .find(|w| w.state == WardenState::House)
            {
                w.counter = 0;
                w.state = WardenState::Leaving;
                w.actor.dir = Dir::Up;
                w.actor.want = Dir::Up;
                events.push(format!("house-release:{}", w.name));
            }
        }

        let frightened = self.fright_active();
        let scatter = self.mode.phase() == WavePhase::Scatter;
        let bram_tile = tile_of(self.wardens[0].actor.x, self.wardens[0].actor.y);
        let pickups = maze.pickups_left();
        for i in 0..4 {
            let cruise = self.cruise(player.speed, pickups, i, player.ghost_factor);
            let w = &mut self.wardens[i];
            match w.state {
                WardenState::House => {
                    w.actor.speed = 0.0;
                }
                WardenState::Leaving => {
                    // Scripted walk: up through the door column first, then
                    // sideways to the mouth. Arrival within a quarter tile
                    // activates. Movement is manual (not step_actor) because
                    // the path crosses the ghost-only door by design.
                    let (mx, my) = center_of(GHOST_OUTSIDE_TILE.0, GHOST_OUTSIDE_TILE.1);
                    w.actor.speed = cruise * tuning::LEAVING_SPEED_FRACTION;
                    let stride = w.actor.speed * dt;
                    let dx = (mx - w.actor.x).abs();
                    let dy = (my - w.actor.y).abs();
                    if dx + dy < 0.25 {
                        w.actor.x = mx;
                        w.actor.y = my;
                        w.actor.dir = Dir::Left;
                        w.actor.want = Dir::Left;
                        w.state = WardenState::Active;
                        w.decided = None;
                        events.push(format!("house-out:{}", w.name));
                    } else if dy > 0.01 {
                        w.actor.y = (w.actor.y - stride).max(my);
                    } else if w.actor.x < mx {
                        w.actor.x = (w.actor.x + stride).min(mx);
                    } else {
                        w.actor.x = (w.actor.x - stride).max(mx);
                    }
                }
                WardenState::Active => {
                    let tile = tile_of(w.actor.x, w.actor.y);
                    let mut speed = cruise;
                    if maze.is_tunnel(tile.0, tile.1) {
                        speed *= tuning::WARDEN_TUNNEL_FRACTION;
                    }
                    if frightened {
                        speed *= tuning::FRIGHT_WARDEN_FRACTION;
                    }
                    w.actor.speed = speed;
                    // Decide once per tile-center visit.
                    let (cx, cy) = center_of(tile.0, tile.1);
                    let near = (cx - w.actor.x).abs() + (cy - w.actor.y).abs() <= CENTER_SNAP;
                    if near && w.decided != Some(tile) {
                        w.decided = Some(tile);
                        if frightened {
                            w.actor.want = random_exit(maze, tile, w.actor.dir, rng);
                        } else {
                            let target = if scatter {
                                w.scatter
                            } else {
                                chase_target(
                                    w.index,
                                    player.tile,
                                    player.dir,
                                    bram_tile,
                                    tile,
                                    w.scatter,
                                )
                            };
                            w.actor.want = greedy_exit(maze, tile, w.actor.dir, target);
                        }
                    } else if !near {
                        w.decided = None;
                    }
                    step_actor(maze, &mut w.actor, dt, true);
                }
                WardenState::Eyes => {
                    // Drift home to the gatehouse door at eyes pace, then
                    // revive at the mouth. Greedy pathing with the ghost
                    // walkability set (the door belongs to wardens).
                    let speed = cruise * tuning::EYES_SPEED_FRACTION;
                    w.actor.speed = speed;
                    let tile = tile_of(w.actor.x, w.actor.y);
                    let (dx, dy) = center_of(GHOST_DOOR_TILE.0, GHOST_DOOR_TILE.1);
                    if (dx - w.actor.x).abs() + (dy - w.actor.y).abs() < 0.3 {
                        let (mx, my) = center_of(GHOST_OUTSIDE_TILE.0, GHOST_OUTSIDE_TILE.1);
                        w.actor.x = mx;
                        w.actor.y = my;
                        w.actor.dir = Dir::Left;
                        w.actor.want = Dir::Left;
                        w.state = WardenState::Active;
                        w.decided = None;
                        events.push(format!("warden-back:{}", w.name));
                        continue;
                    }
                    let (cx, cy) = center_of(tile.0, tile.1);
                    let near = (cx - w.actor.x).abs() + (cy - w.actor.y).abs() <= CENTER_SNAP;
                    if near && w.decided != Some(tile) {
                        w.decided = Some(tile);
                        w.actor.want = greedy_exit(maze, tile, w.actor.dir, GHOST_DOOR_TILE);
                    } else if !near {
                        w.decided = None;
                    }
                    step_actor(maze, &mut w.actor, dt, true);
                }
            }
        }
        events
    }

    /// Collision sweep against Pip. Returns `(eaten, death)` counts:
    /// frightened contact eats first (chain), anything else kills.
    pub fn collide(&mut self, player: (f32, f32)) -> (usize, usize) {
        let mut eaten = 0;
        let mut death = 0;
        let frightened = self.fright_active();
        for w in self.wardens.iter_mut() {
            if w.state != WardenState::Active {
                continue;
            }
            let same_tile = tile_of(w.actor.x, w.actor.y) == tile_of(player.0, player.1);
            let dist = (w.actor.x - player.0).abs() + (w.actor.y - player.1).abs();
            if same_tile || dist <= tuning::COLLIDE_DISTANCE {
                if frightened {
                    w.state = WardenState::Eyes;
                    w.decided = None;
                    eaten += 1;
                } else {
                    death += 1;
                }
            }
        }
        (eaten, death)
    }

    /// Canonical wardens string for the state hash.
    pub fn canonical(&self) -> String {
        let parts: Vec<String> = self.wardens.iter().map(Warden::state_tuple).collect();
        format!(
            "{}|{:.3}|{}|{}",
            parts.join(","),
            self.fright_t,
            self.eaten_chain,
            self.mode.canonical(),
        )
    }
}

/// Uniform-random non-reversing exit from the `fright` stream (frightened
/// wardens ignore personality targets).
fn random_exit(maze: &Maze, tile: (i32, i32), current: Dir, rng: &mut Rng) -> Dir {
    let mut exits = Vec::new();
    for dir in Dir::ORDER {
        if dir == current.opposite() {
            continue;
        }
        let (dx, dy) = dir.delta();
        if maze.is_walkable(tile.0 + dx, tile.1 + dy, true) {
            exits.push(dir);
        }
    }
    if exits.is_empty() {
        return current.opposite();
    }
    exits[rng.fork("fright").next_bounded(exits.len())]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::actors::tile_of;

    fn ctx(tile: (i32, i32)) -> PlayerCtx {
        PlayerCtx {
            tile,
            dir: Dir::Left,
            speed: 8.5,
            ghost_factor: 1.0,
        }
    }

    #[test]
    fn house_counters_release_in_order() {
        let maze = Maze::new();
        let mut rng = Rng::new(1);
        let mut wardens = Wardens::new(1);
        assert_eq!(wardens.wardens[0].state, WardenState::Active);
        assert_eq!(wardens.wardens[1].counter, 3);
        wardens.notify_crumbs(3);
        assert_eq!(wardens.wardens[1].state, WardenState::Leaving);
        // Walk the leaver out: bounded ticks must activate it at the mouth.
        let (mx, my) = center_of(GHOST_OUTSIDE_TILE.0, GHOST_OUTSIDE_TILE.1);
        for _ in 0..1200 {
            wardens.step(&maze, &mut rng, 1.0 / 120.0, ctx((13, 23)));
            if wardens.wardens[1].state == WardenState::Active {
                break;
            }
        }
        assert_eq!(wardens.wardens[1].state, WardenState::Active);
        let _ = (mx, my);
    }

    #[test]
    fn idle_timeout_releases_a_warden() {
        let maze = Maze::new();
        let mut rng = Rng::new(2);
        let mut wardens = Wardens::new(5);
        assert!(wardens
            .wardens
            .iter()
            .skip(1)
            .all(|w| w.state == WardenState::House));
        for _ in 0..600 {
            wardens.step(&maze, &mut rng, 1.0 / 120.0, ctx((13, 23)));
        }
        assert!(wardens
            .wardens
            .iter()
            .skip(1)
            .any(|w| w.state != WardenState::House));
    }

    #[test]
    fn fright_eat_vs_death_priority() {
        let mut wardens = Wardens::new(1);
        let (mx, my) = center_of(GHOST_OUTSIDE_TILE.0, GHOST_OUTSIDE_TILE.1);
        wardens.start_fright(6.0);
        assert_eq!(wardens.collide((mx, my)), (1, 0));
        assert_eq!(wardens.wardens[0].state, WardenState::Eyes);
        wardens.fright_t = 0.0;
        wardens.wardens[1].state = WardenState::Active;
        wardens.wardens[1].actor.x = mx;
        wardens.wardens[1].actor.y = my;
        let (_, death) = wardens.collide((mx, my));
        assert_eq!(death, 1);
    }

    #[test]
    fn fright_start_reverses_the_pack() {
        let mut wardens = Wardens::new(1);
        let before = wardens.wardens[0].actor.dir;
        wardens.start_fright(6.0);
        assert_eq!(wardens.wardens[0].actor.dir, before.opposite());
    }

    #[test]
    fn scatter_and_chase_steer_differently() {
        let maze = Maze::new();
        let mut rng = Rng::new(4);
        // Bram parked at the open row below the house, heading left, with
        // Pip far to the left: chase must pick Left (toward Pip), scatter
        // must pick Up (toward corner (1,1)).
        let tile = (13, 16);
        for (phase_pin, want) in [(false, Dir::Left), (true, Dir::Up)] {
            let mut wardens = Wardens::new(1);
            if phase_pin {
                assert_eq!(wardens.mode.phase(), WavePhase::Scatter);
            } else {
                // Jump to chase: drain the 7 s scatter leg.
                for _ in 0..(8.0 * 120.0) as usize {
                    wardens.step(&maze, &mut rng, tuning::STEP, ctx((1, 16)));
                }
                assert_eq!(wardens.mode.phase(), WavePhase::Chase);
                // Re-park Bram: the drain walk moved him.
                let (cx, cy) = center_of(tile.0, tile.1);
                wardens.wardens[0].actor.x = cx;
                wardens.wardens[0].actor.y = cy;
                wardens.wardens[0].actor.dir = Dir::Left;
                wardens.wardens[0].actor.want = Dir::Left;
                wardens.wardens[0].decided = None;
            }
            let (cx, cy) = center_of(tile.0, tile.1);
            wardens.wardens[0].actor.x = cx;
            wardens.wardens[0].actor.y = cy;
            wardens.wardens[0].actor.dir = Dir::Left;
            wardens.wardens[0].actor.want = Dir::Left;
            wardens.wardens[0].decided = None;
            wardens.step(&maze, &mut rng, tuning::STEP, ctx((1, 16)));
            assert_eq!(wardens.wardens[0].actor.want, want);
        }
    }

    #[test]
    fn eyes_drift_home_and_revive() {
        let maze = Maze::new();
        let mut rng = Rng::new(5);
        let mut wardens = Wardens::new(1);
        // Strand Bram far south, then eat him under fright.
        let (sx, sy) = center_of(13, 27);
        wardens.wardens[0].actor.x = sx;
        wardens.wardens[0].actor.y = sy;
        wardens.wardens[0].decided = None;
        wardens.start_fright(600.0);
        assert_eq!(wardens.collide((sx, sy)), (1, 0));
        assert_eq!(wardens.wardens[0].state, WardenState::Eyes);
        // Eyes never enter walls and revive at the mouth in bounded time.
        let mut revived = false;
        for _ in 0..3600 {
            wardens.step(&maze, &mut rng, tuning::STEP, ctx((13, 23)));
            let tile = tile_of(wardens.wardens[0].actor.x, wardens.wardens[0].actor.y);
            assert!(
                maze.is_walkable(tile.0, tile.1, true),
                "eyes entered a wall at {tile:?}"
            );
            if wardens.wardens[0].state == WardenState::Active {
                revived = true;
                break;
            }
        }
        assert!(revived, "eyes never made it home");
        let (mx, my) = center_of(GHOST_OUTSIDE_TILE.0, GHOST_OUTSIDE_TILE.1);
        assert!((wardens.wardens[0].actor.x - mx).abs() < 1e-4);
        assert!((wardens.wardens[0].actor.y - my).abs() < 1e-4);
    }

    #[test]
    fn pursuer_stages_enrage_bram_only() {
        let wardens = Wardens::new(1);
        let base = 8.5 * tuning::WARDEN_SPEED_FRACTION;
        assert!((wardens.cruise(8.5, 449, 0, 1.0) - base).abs() < 1e-4);
        assert!((wardens.cruise(8.5, 21, 0, 1.0) - base).abs() < 1e-4);
        assert!((wardens.cruise(8.5, 20, 0, 1.0) - base * 1.03).abs() < 1e-4);
        assert!((wardens.cruise(8.5, 10, 0, 1.0) - base * 1.06).abs() < 1e-4);
        assert!((wardens.cruise(8.5, 0, 0, 1.0) - base * 1.06).abs() < 1e-4);
        // Kessa never enrages; the frenzy factor scales everyone.
        assert!((wardens.cruise(8.5, 10, 1, 1.0) - base).abs() < 1e-4);
        assert!((wardens.cruise(8.5, 449, 0, 0.9) - base * 0.9).abs() < 1e-4);
    }
}
