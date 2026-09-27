// Hearthlight dialogue-first ducking (Phase 4).
// The owner verdict on #449 called the dialogue delivery off and the mix
// discontinuous: the Phase 1-3 master rides the score at full level straight
// through spoken lines. This module is the single source of truth for the
// duck envelope, shared by the offline WAV master (score/mix.js) and the
// live WebAudio performer (score/animatic-audio.js), so both duck the same
// windows to the same floors.
//
// Design: for every caption line [a, b] (absolute film seconds), the score
// bus dips to SCORE_FLOOR and the SFX bed bus to SFX_FLOOR, with a short
// attack into the line and a 0.5 s release after it. The release doubles as
// Yara's scripted half-second of silence (story/dialogue.md): her lines
// land, then the valley stays hushed for exactly one release before the
// score breathes back in. Narrator lines duck too: the narrator states only
// what the picture cannot, and the picture gets the floor back the moment
// the line ends.
//
// All windows derive from the committed screenplay captions, so the curve
// is deterministic, scrub-exact, and reproducible. Overlapping or adjacent
// lines (s05 stacks Yara tightly) merge into one hold: the envelope never
// pumps between back-to-back lines.
export const DUCK_VERSION = 'hearthlight-duck/1';

// Score yields further than the bed: words first, music second, air third.
export const SCORE_FLOOR = 0.45;
export const SFX_FLOOR = 0.7;
export const DUCK_ATTACK = 0.25;
export const DUCK_RELEASE = 0.5;

// Absolute dialogue windows for a timeline: sorted, merged, non-overlapping
// [a, b] pairs in film seconds. Merge gap: lines closer than one release
// hold the duck instead of breathing (no pumping on stacked lines).
export function dialogueWindows(tl, mergeGap = DUCK_RELEASE) {
  const raw = [];
  for (const shot of tl.shots) {
    for (const c of shot.captions || []) {
      const a = shot.start + c.t;
      const b = a + (c.dur || 4.5);
      raw.push([a, b]);
    }
  }
  raw.sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const w of raw) {
    const last = merged[merged.length - 1];
    if (last && w[0] <= last[1] + mergeGap) {
      last[1] = Math.max(last[1], w[1]);
    } else {
      merged.push([w[0], w[1]]);
    }
  }
  return merged;
}

// Envelope level in [floor, 1] at absolute film time t. Linear attack in,
// flat hold, linear release out. Pure function of (t, windows): the offline
// mixer evaluates it per sample, the live performer per scheduled note.
export function duckLevelAt(t, windows, floor, attack = DUCK_ATTACK, release = DUCK_RELEASE) {
  let level = 1;
  for (const [a, b] of windows) {
    if (t < a - attack || t > b + release) continue;
    let v;
    if (t < a) v = 1 - (1 - floor) * ((t - (a - attack)) / attack);
    else if (t <= b) v = floor;
    else v = floor + (1 - floor) * ((t - b) / release);
    if (v < level) level = v;
  }
  return level;
}

// Time-in-shot variant for the live performer: the performer plays a cue
// loop on the wall clock, so it ducks by position inside the current shot
// rather than by absolute film time. shotWindows precomputes the merged
// caption windows of one shot relative to its start.
export function shotWindows(shot) {
  const raw = [];
  for (const c of shot.captions || []) {
    raw.push([c.t, c.t + (c.dur || 4.5)]);
  }
  raw.sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const w of raw) {
    const last = merged[merged.length - 1];
    if (last && w[0] <= last[1] + DUCK_RELEASE) {
      last[1] = Math.max(last[1], w[1]);
    } else {
      merged.push([w[0], w[1]]);
    }
  }
  return merged;
}

// Peak multiplier for one live note starting at timeInShot seconds into the
// shot. Same floors as the offline master, so the theatre ducks what the
// WAV ducks. Exported pure for the regression suite.
export function livePeakFor(windows, timeInShot, floor = SCORE_FLOOR) {
  return duckLevelAt(timeInShot, windows, floor);
}
