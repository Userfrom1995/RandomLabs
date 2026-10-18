// Versioned key bindings (blueprint: doom-bindings v1, persisted JSON).
// Pure logic with an injectable key/value store so Node tests can use a fake
// while the app passes a localStorage-backed store. Conflict policy: assigning
// a code already bound to another action swaps the two bindings.
export const BINDINGS_FORMAT = 'doom-bindings';
export const BINDINGS_VERSION = 1;
export const BINDINGS_KEY = 'doom-bindings';

export const ACTIONS = [
  'forward', 'back', 'turnLeft', 'turnRight',
  'strafeLeft', 'strafeRight', 'run', 'fire', 'use',
  'weapon1', 'weapon2', 'weapon3', 'weapon4', 'weapon5', 'weapon6', 'weapon7',
  'menu', 'pause',
];

export const ACTION_LABELS = {
  forward: 'Move forward',
  back: 'Move back',
  turnLeft: 'Turn left',
  turnRight: 'Turn right',
  strafeLeft: 'Strafe left',
  strafeRight: 'Strafe right',
  run: 'Run (hold)',
  fire: 'Fire / attack',
  use: 'Use / open',
  weapon1: 'Weapon 1', weapon2: 'Weapon 2', weapon3: 'Weapon 3',
  weapon4: 'Weapon 4', weapon5: 'Weapon 5', weapon6: 'Weapon 6',
  weapon7: 'Weapon 7',
  menu: 'Menu', pause: 'Pause',
};

export function defaultBindings() {
  return {
    format: BINDINGS_FORMAT,
    version: BINDINGS_VERSION,
    actions: {
      forward: { keys: ['KeyW', 'ArrowUp'], mouse: null, touch: 'stick-y' },
      back: { keys: ['KeyS', 'ArrowDown'], mouse: null, touch: 'stick-y' },
      turnLeft: { keys: ['KeyA', 'ArrowLeft'], mouse: null, touch: 'stick-x' },
      turnRight: { keys: ['KeyD', 'ArrowRight'], mouse: null, touch: 'stick-x' },
      strafeLeft: { keys: ['KeyQ'], mouse: null, touch: 'btn-strafe-l' },
      strafeRight: { keys: ['KeyE'], mouse: null, touch: 'btn-strafe-r' },
      run: { keys: ['ShiftLeft', 'ShiftRight'], mouse: null, touch: null },
      fire: { keys: ['Space'], mouse: 0, touch: 'btn-fire' },
      use: { keys: ['KeyF'], mouse: 2, touch: 'btn-use' },
      weapon1: { keys: ['Digit1'], mouse: null, touch: 'weapon-strip' },
      weapon2: { keys: ['Digit2'], mouse: null, touch: 'weapon-strip' },
      weapon3: { keys: ['Digit3'], mouse: null, touch: 'weapon-strip' },
      weapon4: { keys: ['Digit4'], mouse: null, touch: 'weapon-strip' },
      weapon5: { keys: ['Digit5'], mouse: null, touch: 'weapon-strip' },
      weapon6: { keys: ['Digit6'], mouse: null, touch: 'weapon-strip' },
      weapon7: { keys: ['Digit7'], mouse: null, touch: 'weapon-strip' },
      menu: { keys: ['Escape'], mouse: null, touch: 'btn-menu' },
      pause: { keys: ['KeyP'], mouse: null, touch: 'btn-menu' },
    },
  };
}

function validShape(b) {
  return (
    b && typeof b === 'object' &&
    b.format === BINDINGS_FORMAT && b.version === BINDINGS_VERSION &&
    b.actions && typeof b.actions === 'object'
  );
}

export function loadBindings(store) {
  const fallback = defaultBindings();
  try {
    if (!store || typeof store.getItem !== 'function') return fallback;
    const raw = store.getItem(BINDINGS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!validShape(parsed)) return fallback;
    const merged = defaultBindings();
    for (const a of ACTIONS) {
      const row = parsed.actions[a];
      if (row && Array.isArray(row.keys)) {
        merged.actions[a] = {
          keys: row.keys.filter((k) => typeof k === 'string'),
          mouse: row.mouse === null || typeof row.mouse === 'number' ? row.mouse : null,
          touch: typeof row.touch === 'string' ? row.touch : null,
        };
      }
    }
    return merged;
  } catch {
    return fallback;
  }
}

export function saveBindings(store, bindings) {
  try {
    if (!store || typeof store.setItem !== 'function') return false;
    store.setItem(BINDINGS_KEY, JSON.stringify(bindings));
    return true;
  } catch {
    return false;
  }
}

// Find the action (other than `except`) currently holding `code`, or null.
export function findConflict(bindings, code, except = null) {
  if (typeof code !== 'string' || !code) return null;
  for (const a of ACTIONS) {
    if (a === except) continue;
    const row = bindings.actions[a];
    if (row && row.keys.includes(code)) return a;
  }
  return null;
}

// Assign `code` as the primary key of `action`, swapping with the conflicting
// action when one exists. Returns { bindings, swapped } and never mutates.
export function assignBinding(bindings, action, code) {
  if (!ACTIONS.includes(action) || typeof code !== 'string' || !code) {
    return { bindings, swapped: null };
  }
  const next = JSON.parse(JSON.stringify(bindings));
  const conflict = findConflict(next, code, action);
  const row = next.actions[action];
  const displaced = row.keys[0] || null;
  row.keys = [code, ...row.keys.filter((k) => k !== code)].slice(0, 3);
  if (conflict && displaced) {
    const other = next.actions[conflict];
    other.keys = [displaced, ...other.keys.filter((k) => k !== code && k !== displaced)].slice(0, 3);
  }
  return { bindings: next, swapped: conflict };
}

export function resetBindings() {
  return defaultBindings();
}
