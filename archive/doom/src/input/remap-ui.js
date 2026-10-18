// Remapping settings table (blueprint: capture next keydown, conflict swap,
// persisted doom-bindings v1, keyboard-only plus screen-reader paths).
// describeRemapRows is pure (unit-tested); renderRemapTable wires the DOM
// with createElement only (the shell forbids content innerHTML).
import { ACTIONS, ACTION_LABELS, assignBinding } from './bindings.js';

export function describeRemapRows(bindings) {
  return ACTIONS.map((action) => {
    const row = bindings.actions[action] || { keys: [], mouse: null, touch: null };
    return {
      action,
      label: ACTION_LABELS[action] || action,
      keys: [...row.keys],
      mouse: row.mouse,
      touch: row.touch,
      testid: `remap-row-${action}`,
    };
  });
}

function keyLabel(code) {
  return String(code).replace(/^Key/, '').replace(/^Digit/, '').replace(/^Arrow/, '');
}

// Render the remap table into `container`. onChange(next) persists + resamples;
// onNotice(msg) surfaces conflict swaps as polite text (never confirm()).
// Returns { refresh, dispose }. No-op without a DOM container.
export function renderRemapTable(container, bindings, opts = {}) {
  const noop = () => {};
  if (!container || typeof document === 'undefined') return { refresh: noop, dispose: noop };
  let current = bindings;
  let capturing = null;
  const onChange = opts.onChange || noop;
  const onNotice = opts.onNotice || noop;
  const doc = container.ownerDocument || document;

  function finishCapture(code) {
    const action = capturing;
    capturing = null;
    if (code === 'Escape') {
      onNotice('Remap cancelled.');
      refresh();
      return;
    }
    const { bindings: next, swapped } = assignBinding(current, action, code);
    current = next;
    onChange(next);
    onNotice(swapped ? `Conflict resolved: swapped with ${ACTION_LABELS[swapped]}.` : `${ACTION_LABELS[action]} mapped to ${keyLabel(code)}.`);
    refresh();
  }

  function onKeyDown(e) {
    if (!capturing) return;
    e.preventDefault();
    e.stopPropagation();
    finishCapture(e.code);
  }

  function refresh() {
    container.textContent = '';
    const table = doc.createElement('table');
    table.setAttribute('aria-label', 'Input remapping');
    const rows = describeRemapRows(current);
    for (const r of rows) {
      const tr = doc.createElement('tr');
      tr.setAttribute('data-testid', r.testid);
      const name = doc.createElement('th');
      name.setAttribute('scope', 'row');
      name.textContent = r.label;
      const cell = doc.createElement('td');
      const btn = doc.createElement('button');
      btn.type = 'button';
      const primary = r.keys[0] || 'unbound';
      btn.textContent = capturing === r.action ? 'Press a key (Esc cancels)' : keyLabel(primary);
      btn.setAttribute('aria-label', `Remap ${r.label}, currently ${primary}`);
      btn.addEventListener('click', () => {
        capturing = r.action;
        refresh();
      });
      cell.appendChild(btn);
      const alt = doc.createElement('span');
      alt.className = 'remap-alt';
      alt.textContent = r.keys.length > 1 ? `alts: ${r.keys.slice(1).map(keyLabel).join(', ')}` : '';
      cell.appendChild(alt);
      tr.appendChild(name);
      tr.appendChild(cell);
      table.appendChild(tr);
    }
    container.appendChild(table);
  }

  doc.addEventListener('keydown', onKeyDown, true);
  refresh();
  return {
    refresh,
    dispose() { doc.removeEventListener('keydown', onKeyDown, true); },
  };
}
