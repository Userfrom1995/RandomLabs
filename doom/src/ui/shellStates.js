// Shell states (M4): one pure resolver maps boot facts to the visible
// shell mode, so onboarding, loading, empty, warning, and error renders
// stay deterministic and headless-testable. The app shell owns storage
// (seen flags) and DOM; this module only decides.
export const SHELL_STATES = ['loading', 'onboarding', 'ready', 'ready-warnings', 'error'];

export const ONBOARDED_KEY = 'doom-onboarded';

// Facts: loading (async ingest/boot in flight), fatal (error message or
// null), seenBefore (returning visitor: cached WAD seen or onboarding
// dismissed), viableMaps (bootable map count), droppedCount (isolated
// bad maps reported as warnings, never fatal).
export function resolveShellState(facts) {
  const f = facts || {};
  if (f.loading) return 'loading';
  if (f.fatal) return 'error';
  if (!f.seenBefore) return 'onboarding';
  if ((f.droppedCount || 0) > 0) return 'ready-warnings';
  return 'ready';
}

// Empty-state line for the load-order list when no custom WAD is staged.
export function emptyLoadOrderLine() {
  return 'No custom WADs loaded. Built-in sample level active.';
}

// Loading line names the file so slow drops have visible progress.
export function loadingLine(fileName) {
  return `Loading ${fileName || 'WAD'}...`;
}

// Dropped-map warning lines keep taxonomy codes visible for bug reports.
export function droppedLines(dropped) {
  return (dropped || []).map((d) => `map ${d.map || '(unknown)'} skipped (${d.code}): ${d.message}`);
}
