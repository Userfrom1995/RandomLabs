/**
 * Umbra M2 combat type definitions (JSDoc only, no runtime).
 * Binding shapes from ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md.
 * Pure ES module: no DOM, no Math.random, no Date.now.
 */

/**
 * One tick of intent per fighter. Buttons are edges consumed once per tick.
 * @typedef {object} CombatInput
 * @property {-1|0|1} move walk intent (toward/away resolved by facing)
 * @property {boolean} crouch hold crouch
 * @property {boolean} jump jump edge
 * @property {boolean} punch punch edge (jab, cancels into cross)
 * @property {boolean} kick kick edge (kick, or sweep while crouching)
 * @property {boolean} block hold block (rising edge opens a parry window)
 * @property {boolean} special special edge (uppercut)
 * @property {-1|0|1} dash dash impulse direction
 */

/**
 * Frame data for one attack. All times in ticks at 60 Hz.
 * @typedef {object} MoveDef
 * @property {string} id move id (e.g. "jab")
 * @property {number} startup ticks before the active window (positive integer)
 * @property {number} active ticks during which the hit test runs (positive integer)
 * @property {number} recovery ticks after active before control returns (positive integer)
 * @property {number} range reach in arena units from the attacker origin
 * @property {number} damage base damage on clean hit
 * @property {number} chip damage dealt through block
 * @property {number} knockback push applied to the defender in arena units
 * @property {number} stun stun ticks applied to the defender on clean hit
 * @property {string[]} cancelInto move ids this move may cancel into after startup
 * @property {string} pose pose-track key for the renderer
 * @property {string} sfx synth-voice key for the audio engine
 */

/**
 * Fighter states. knockdown -> down -> idle (getup); ko is terminal.
 * @typedef {"idle"|"walk"|"crouch"|"jump"|"attack"|"block"|"parry"|"hit"|"stun"|"knockdown"|"down"|"ko"} FighterStateName
 */

/**
 * Full per-fighter simulation state.
 * @typedef {object} FighterState
 * @property {number} x horizontal arena position in [-0.9, 0.9]
 * @property {number} vx horizontal velocity carried through air/dash ticks
 * @property {number} y vertical height above the ground (0 = grounded)
 * @property {number} vy vertical velocity while airborne
 * @property {1|-1} facing direction the fighter faces (engine keeps it aimed at the foe)
 * @property {number} hp current hit points
 * @property {number} maxHp hit points at round start
 * @property {number} stamina guard stamina (drains on block, breaks to stun at 0)
 * @property {FighterStateName} state current state-machine node
 * @property {number} stateTick ticks spent in the current state
 * @property {string|null} moveId active MoveDef id while state is "attack"
 * @property {number} moveTick ticks since the current attack started
 * @property {boolean} blockHeld whether block is currently held
 * @property {number} parryWindow ticks remaining in which a held block parries
 * @property {number} stunTick ticks remaining in hit/stun/parry/knockdown/down
 * @property {number} combo consecutive hits landed by this fighter
 * @property {number} comboTick tick of this fighter's most recent landed hit
 * @property {boolean} grounded false while airborne
 */

/**
 * Whole-bout simulation state, advanced one tick by stepFight().
 * @typedef {object} FightState
 * @property {number} seed bout seed (drives the only RNG stream)
 * @property {number} arena arena index (presentation only)
 * @property {number} rounds total rounds in the match (first to floor(rounds/2)+1)
 * @property {number} roundTicks timer ticks per round
 * @property {number} tick global tick counter (advances even through hitstop)
 * @property {number} round current round, 1-indexed
 * @property {[number, number]} wins rounds won per side
 * @property {number} timer ticks remaining in the current round
 * @property {[FighterState, FighterState]} fighters side 0 (left) and side 1 (right)
 * @property {number} hitstop ticks of sim freeze remaining (timer still runs)
 * @property {boolean} over true once the match is decided
 * @property {0|1|-1|null} winner decided side, -1 for a drawn match, null while live
 * @property {FightEvent[]} events append-only event log (never consumed by the sim)
 * @property {string} phase "intro" | "fight" | "roundEnd" | "over"
 * @property {number} phaseTick ticks spent in the current phase
 * @property {number} frozenTicks ticks skipped by hitstop (diagnostics)
 */

/**
 * Presentation consumes these; the sim never touches DOM or audio.
 * @typedef {object} FightEvent
 * @property {"hit"|"blocked"|"parried"|"whiff"|"ko"|"round"|"phase"} t event kind
 * @property {number} tick global tick at which the event fired
 * @property {0|1|-1} side instigating side (-1 for neutral round/timeout decisions)
 * @property {string|null} move move id when the event belongs to an attack
 * @property {number} damage hit points removed by this event
 */

export {};
