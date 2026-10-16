//! Warden actors: house exits, wander baseline, fright, collisions.
//!
//! Cast: Bram the leader (warden 0), Kessa (1), Jory (2), Nib (3). Their
//! names, scatter corners, and house slots are original to this project
//! (`docs/identity.md`).
//!
//! Phase 2 behavior (this file):
//!   - Warden 0 starts active at the gatehouse mouth; wardens 1-3 wait in
//!     the house on per-level dot counters ([`tuning::house_counters`]) with
//!     a [`tuning::HOUSE_IDLE_TIMEOUT_S`] idle release, then walk out
//!     through the door on a scripted path at
//!     [`tuning::LEAVING_SPEED_FRACTION`] of cruise.
//!   - Active wardens steer with the [`WanderSteering`] baseline (the
//!     [`Steer`] trait Phase 3 personalities plug into), slowed in the
//!     tunnel ([`tuning::WARDEN_TUNNEL_FRACTION`]) and while frightened
//!     ([`tuning::FRIGHT_WARDEN_FRACTION`]).
//!   - Sunseed fright runs a real timer from [`tuning::fright_duration`];
//!     touching a frightened warden eats it for the escalating chain
//!     ([`tuning::WARDEN_CHAIN_SCORE`]), otherwise touch kills Pip.
//!     Eat-vs-death priority: frightened contact always eats first.
//!   - An eaten warden returns to the mouth after
//!     [`tuning::EATEN_RETURN_S`]. Phase 3 replaces this timer with eyes
//!     that drift home at [`tuning::EYES_SPEED_FRACTION`] and revive at
//!     the door; the state machine shape is already the same.
//!
//! Phase 3 owns: four personalities + scatter corners as targets, the
//! scatter/chase wave clock with reversals, fright flash staging, eyes,
//! pursuer stages, relishes, and extra modes.

use crate::actors::{center_of, step_actor, tile_of, Actor, Dir};
use crate::maze::{Maze, GHOST_OUTSIDE_TILE, HOUSE_SLOTS, SCATTER_CORNERS};
use crate::rng::Rng;
use crate::steering::{Steer, WanderSteering};
use crate::tuning;

/// Display names, original to this project.
pub const NAMES: [&str; 4] = ["Bram", "Kessa", "Jory", "Nib"];
/// Tile-center steering snap window (decision gate detail arrives with the
/// Phase 3 personality pass; wander re-decides per center visit).
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
    /// Eaten; returns to the mouth when `timer` reaches zero.
    Eaten,
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
    /// Return countdown (Eaten state).
    pub timer: f32,
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
            WardenState::Eaten => "eaten",
        };
        format!(
            "{}:{}:{}:{:.4}:{:.4}:{}:{}",
            st, self.counter, self.name, p.0, p.1, p.2, p.3
        )
    }
}

/// The four wardens plus the shared fright clock.
#[derive(Debug)]
pub struct Wardens {
    pub wardens: [Warden; 4],
    pub level: u32,
    /// Fright seconds remaining (0 = not frightened).
    pub fright_t: f32,
    /// Fright length that started the current window (for flash staging).
    pub fright_total: f32,
    /// Seconds since any crumb was eaten (idle house release).
    pub idle_t: f32,
    /// Wardens eaten in the current fright window (chain index).
    pub eaten_chain: usize,
    steering: WanderSteering,
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
            timer: 0.0,
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
            fright_t: 0.0,
            fright_total: 0.0,
            idle_t: 0.0,
            eaten_chain: 0,
            steering: WanderSteering,
        }
    }

    /// Cruise speed for the level (before tunnel/fright modifiers).
    pub fn cruise(&self, player_speed: f32) -> f32 {
        player_speed * tuning::WARDEN_SPEED_FRACTION
    }

    pub fn fright_active(&self) -> bool {
        self.fright_t > 0.0
    }

    /// True while the fright window is in its flashing tail.
    pub fn fright_flashing(&self) -> bool {
        self.fright_active() && self.fright_t <= tuning::FRIGHT_FLASH_THRESHOLD
    }

    /// Open a fright window (sunseed eaten). Reversals and flash staging
    /// arrive with Phase 3; the timer and chain reset are real now.
    pub fn start_fright(&mut self, duration: f32) {
        if duration > 0.0 {
            self.fright_t = duration;
            self.fright_total = duration;
            self.eaten_chain = 0;
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

    /// Advance wardens by `dt`. Returns event strings for the game log.
    /// `player` is Pip's position (for steering context in Phase 3; the
    /// wander baseline ignores it) and `player_speed` is Pip's current
    /// speed for cruise derivation.
    pub fn step(
        &mut self,
        maze: &Maze,
        rng: &mut Rng,
        dt: f32,
        _player: (f32, f32),
        player_speed: f32,
    ) -> Vec<String> {
        let mut events = Vec::new();
        if self.fright_t > 0.0 {
            self.fright_t = (self.fright_t - dt).max(0.0);
            if self.fright_t <= 0.0 {
                events.push("fright-end".to_string());
            }
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

        let cruise = self.cruise(player_speed);
        let frightened = self.fright_active();
        for w in self.wardens.iter_mut() {
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
                        let choice = self.steering.choose(
                            maze,
                            tile,
                            w.actor.dir,
                            frightened,
                            rng.fork("wander"),
                        );
                        w.actor.want = choice;
                    } else if !near {
                        w.decided = None;
                    }
                    step_actor(maze, &mut w.actor, dt, true);
                }
                WardenState::Eaten => {
                    w.timer -= dt;
                    w.actor.speed = 0.0;
                    if w.timer <= 0.0 {
                        let (mx, my) = center_of(GHOST_OUTSIDE_TILE.0, GHOST_OUTSIDE_TILE.1);
                        w.actor.x = mx;
                        w.actor.y = my;
                        w.actor.dir = Dir::Left;
                        w.actor.want = Dir::Left;
                        w.state = WardenState::Active;
                        w.decided = None;
                        events.push(format!("warden-back:{}", w.name));
                    }
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
                    w.state = WardenState::Eaten;
                    w.timer = tuning::EATEN_RETURN_S;
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
            "{}|{:.3}|{}",
            parts.join(","),
            self.fright_t,
            self.eaten_chain
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
            wardens.step(&maze, &mut rng, 1.0 / 120.0, (mx, my), 8.5);
            if wardens.wardens[1].state == WardenState::Active {
                break;
            }
        }
        assert_eq!(wardens.wardens[1].state, WardenState::Active);
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
        let (mx, my) = center_of(GHOST_OUTSIDE_TILE.0, GHOST_OUTSIDE_TILE.1);
        for _ in 0..600 {
            wardens.step(&maze, &mut rng, 1.0 / 120.0, (mx, my), 8.5);
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
        assert_eq!(wardens.wardens[0].state, WardenState::Eaten);
        wardens.fright_t = 0.0;
        wardens.wardens[1].state = WardenState::Active;
        wardens.wardens[1].actor.x = mx;
        wardens.wardens[1].actor.y = my;
        let (_, death) = wardens.collide((mx, my));
        assert_eq!(death, 1);
    }
}
