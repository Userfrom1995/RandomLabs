/**
 * Umbra input combine: OR-merge keyboard/touch/gamepad CombatInputs into
 * one tick of intent. Edges fire if ANY source fires; levels OR together;
 * move/dash prefer keyboard, then touch, then gamepad. Pure, no DOM.
 */

import { sanitizeInput } from '../combat/engine.js';

/**
 * OR-merge up to three per-tick inputs (any may be null/undefined).
 * @param {object|null} kb keyboard CombatInput
 * @param {object|null} touch touch CombatInput
 * @param {object|null} pad gamepad CombatInput
 * @returns {import('../combat/types.js').CombatInput} sanitized merged input
 */
export function mergeInputs(kb, touch, pad) {
  const k = kb || {};
  const t = touch || {};
  const p = pad || {};
  const pickDir = (a, b, c) => {
    for (const v of [a, b, c]) {
      const n = Number(v);
      if (Number.isFinite(n) && Math.round(n) !== 0) return Math.max(-1, Math.min(1, Math.round(n)));
    }
    return 0;
  };
  return sanitizeInput({
    move: pickDir(k.move, t.move, p.move),
    crouch: !!(k.crouch || t.crouch || p.crouch),
    jump: !!(k.jump || t.jump || p.jump),
    punch: !!(k.punch || t.punch || p.punch),
    kick: !!(k.kick || t.kick || p.kick),
    block: !!(k.block || t.block || p.block),
    special: !!(k.special || t.special || p.special),
    dash: pickDir(k.dash, t.dash, p.dash),
  });
}
