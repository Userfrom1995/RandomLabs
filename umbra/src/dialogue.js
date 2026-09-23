/**
 * Umbra M3 dialogue box model: pure typewriter state machine.
 * The DOM shell (app.js) renders `visibleText()` each frame and calls
 * `advance()` on a timer; tests drive the model directly. No DOM.
 */

/**
 * @typedef {object} DialogueState
 * @property {{speaker:string, text:string}[]} lines script lines
 * @property {number} lineIndex current line index
 * @property {number} shown characters revealed on the current line
 */

/**
 * @param {{speaker:string, text:string}[]} lines script (non-empty)
 * @returns {DialogueState}
 */
export function createDialogue(lines) {
  const clean = Array.isArray(lines) ? lines.filter((l) => l && typeof l.text === 'string') : [];
  return { lines: clean, lineIndex: 0, shown: 0 };
}

/** @param {DialogueState} d */
export function dialogueDone(d) {
  return !d || d.lines.length === 0 || d.lineIndex >= d.lines.length;
}

/** @param {DialogueState} d */
export function currentLine(d) {
  if (dialogueDone(d)) return null;
  return d.lines[d.lineIndex];
}

/** @param {DialogueState} d @returns {string} revealed prefix of the current line */
export function visibleText(d) {
  const line = currentLine(d);
  if (!line) return '';
  return line.text.slice(0, Math.max(0, Math.min(line.text.length, d.shown)));
}

/** @param {DialogueState} d */
export function lineComplete(d) {
  const line = currentLine(d);
  return line != null && d.shown >= line.text.length;
}

/**
 * Reveal more characters (called once per render tick by the shell).
 * @param {DialogueState} d
 * @param {number} [chars] characters to reveal (default 1)
 */
export function advanceDialogue(d, chars = 1) {
  if (!d || dialogueDone(d)) return;
  const line = d.lines[d.lineIndex];
  const n = Number.isFinite(chars) && chars > 0 ? Math.floor(chars) : 1;
  d.shown = Math.min(line.text.length, d.shown + n);
}

/** Reveal the whole current line at once (skip / accessibility fast path). */
export function revealLine(d) {
  if (!d || dialogueDone(d)) return;
  d.shown = d.lines[d.lineIndex].text.length;
}

/**
 * Move to the next line. If the current line is partial, completes it
 * first and stays (standard typewriter advance behavior).
 * @param {DialogueState} d
 * @returns {boolean} false when the whole script is finished
 */
export function nextDialogueLine(d) {
  if (!d || dialogueDone(d)) return false;
  if (!lineComplete(d)) {
    revealLine(d);
    return true;
  }
  d.lineIndex += 1;
  d.shown = 0;
  return d.lineIndex < d.lines.length;
}
