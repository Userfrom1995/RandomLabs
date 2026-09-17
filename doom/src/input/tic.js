// 35 Hz ticcmd pipeline (blueprint 4.4 + M2 milestone).
// Input listeners only set flags plus a mouse-delta accumulator; each tick
// consumes them exactly once into a deterministic Ticcmd. Speeds follow the
// vanilla Doom mapping: walk forward 25 / run 50, walk strafe 24 / run 40,
// turn walk 640 / run 1280 / slow 320. Forward/side clamp to +-50 per spec.
export const BUTTON = { ATTACK: 1, USE: 2 };

export const TIC = {
  STEP_MS: 1000 / 35,
  FWD_WALK: 25,
  FWD_RUN: 50,
  SIDE_WALK: 24,
  SIDE_RUN: 40,
  TURN_WALK: 640,
  TURN_RUN: 1280,
  TURN_SLOW: 320,
  MOVE_CLAMP: 50,
  WEAPON_MIN: 1,
  WEAPON_MAX: 7,
};

function finite01(v) {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0;
}

function clampMove(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return Math.max(-TIC.MOVE_CLAMP, Math.min(TIC.MOVE_CLAMP, Math.round(v)));
}

// Build one ticcmd from a normalized per-tick input sample.
// sample: { moveF, moveS, turn } in [-1, 1]; run/slow booleans;
// attack/use booleans; weapon integer slot or null.
export function buildTiccmd(sample = {}, opts = {}) {
  const alwaysRun = opts.alwaysRun !== undefined ? !!opts.alwaysRun : true;
  const run = sample.run !== undefined ? !!sample.run : alwaysRun;
  const slow = !!sample.slow;
  const moveF = finite01(sample.moveF);
  const moveS = finite01(sample.moveS);
  const turn = finite01(sample.turn);
  const fwdSpeed = run ? TIC.FWD_RUN : TIC.FWD_WALK;
  const sideSpeed = run ? TIC.SIDE_RUN : TIC.SIDE_WALK;
  const turnSpeed = slow ? TIC.TURN_SLOW : run ? TIC.TURN_RUN : TIC.TURN_WALK;
  let buttons = 0;
  if (sample.attack) buttons |= BUTTON.ATTACK;
  if (sample.use) buttons |= BUTTON.USE;
  let weapon = null;
  if (sample.weapon !== undefined && sample.weapon !== null) {
    const w = Number(sample.weapon);
    if (Number.isFinite(w)) {
      weapon = Math.max(TIC.WEAPON_MIN, Math.min(TIC.WEAPON_MAX, Math.round(w)));
    }
  }
  return {
    forwardmove: clampMove(moveF * fwdSpeed),
    sidemove: clampMove(moveS * sideSpeed),
    angleturn: Math.round(turn * turnSpeed),
    buttons,
    weaponSelect: weapon,
  };
}

// Merge a partial ticcmd into a latched per-tick slot (last-writer-wins per
// field). Non-finite values are dropped so hostile callers cannot NaN the
// simulation. Returns the merged slot.
export function latchTiccmd(slot, partial) {
  const out = slot || { forwardmove: 0, sidemove: 0, angleturn: 0, buttons: 0, weaponSelect: null };
  if (!partial || typeof partial !== 'object') return out;
  if (Number.isFinite(Number(partial.forwardmove))) {
    out.forwardmove = clampMove(Number(partial.forwardmove));
  }
  if (Number.isFinite(Number(partial.sidemove))) {
    out.sidemove = clampMove(Number(partial.sidemove));
  }
  if (Number.isFinite(Number(partial.angleturn))) {
    const a = Number(partial.angleturn);
    out.angleturn = (out.angleturn || 0) + Math.max(-32768, Math.min(32767, Math.round(a)));
  }
  if (Number.isFinite(Number(partial.buttons))) {
    out.buttons = (out.buttons || 0) | (Math.round(Number(partial.buttons)) & 3);
  }
  if (partial.weaponSelect !== undefined && partial.weaponSelect !== null) {
    const w = Number(partial.weaponSelect);
    if (Number.isFinite(w)) {
      out.weaponSelect = Math.max(TIC.WEAPON_MIN, Math.min(TIC.WEAPON_MAX, Math.round(w)));
    }
  }
  return out;
}
