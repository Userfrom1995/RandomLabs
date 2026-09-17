// Layered corrupt-WAD error taxonomy (research spec section 3.11).
// Codes: E_CONTAINER (fatal file reject), E_MAP (fatal per map),
// E_REF (droppable map with message), W_GEOM / W_MEDIA (warning + fallback).
export class WadError extends Error {
  constructor({ code, lump = '', map = null, offset = 0, expected = '', actual = '', severity = 'error', fallback = '' }) {
    super(`[${code}] ${map ? map + ':' : ''}${lump}@${offset} expected ${expected}, got ${actual}`);
    this.name = 'WadError';
    this.code = code;
    this.lump = lump;
    this.map = map;
    this.offset = offset;
    this.expected = expected;
    this.actual = actual;
    this.severity = severity;
    this.fallback = fallback;
  }

  toJSON() {
    return {
      code: this.code, lump: this.lump, map: this.map, offset: this.offset,
      expected: this.expected, actual: this.actual, severity: this.severity,
      fallback: this.fallback,
    };
  }
}

// Per-map report: one bad PWAD map never kills the whole load.
export class MapReport {
  constructor(map) {
    this.map = map;
    this.errors = [];
    this.warnings = [];
    this.dropped = false;
  }

  add(err) {
    if (err.code === 'E_REF' || err.code === 'E_MAP') this.errors.push(err.toJSON());
    else this.warnings.push(err.toJSON());
    if (err.code === 'E_MAP' || err.code === 'E_REF') this.dropped = true;
  }
}

// Collects file-level plus per-map reports for UI surfacing.
export class WadReport {
  constructor() {
    this.fatal = null;
    this.maps = new Map();
    this.warnings = [];
  }

  forMap(name) {
    if (!this.maps.has(name)) this.maps.set(name, new MapReport(name));
    return this.maps.get(name);
  }

  toJSON() {
    return {
      fatal: this.fatal ? this.fatal.toJSON() : null,
      maps: [...this.maps.values()].map((m) => ({ map: m.map, dropped: m.dropped, errors: m.errors, warnings: m.warnings })),
      warnings: this.warnings.map((w) => (w.toJSON ? w.toJSON() : w)),
    };
  }
}
