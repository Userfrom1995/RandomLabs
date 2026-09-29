// Folio op pipeline: typed op envelopes with inverse payloads, undo/redo stacks.
// Headless (no DOM); the shell wires this to the viewer.
export function makeOp(tool, params, inverse) {
  return { id: "op-" + Math.random().toString(36).slice(2, 10), tool, params, inverse, createdAt: Date.now() };
}

export function createStore(limit) {
  const cap = limit || 100;
  return { applied: [], undone: [], cap };
}

export function applyOp(store, op) {
  store.applied.push(op);
  store.undone.length = 0;
  if (store.applied.length > store.cap) store.applied.shift();
  return op;
}

export function undo(store) {
  const op = store.applied.pop();
  if (!op) return null;
  store.undone.push(op);
  return op.inverse || null;
}

export function redo(store) {
  const op = store.undone.pop();
  if (!op) return null;
  store.applied.push(op);
  return op;
}

export function chainSummary(store) {
  return store.applied.map((o) => o.tool);
}
