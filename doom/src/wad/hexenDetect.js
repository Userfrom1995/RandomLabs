// Hexen dialect detect-and-report (spec 3.8): BEHAVIOR after BLOCKMAP means
// Hexen-format map (20-byte THINGS, 16-byte LINEDEFS, ACS bytecode).
// M1 behavior: detect and report with a v1 message; never silently misparse.
export function detectHexen(mapEntry) {
  if (mapEntry.entries.BEHAVIOR) {
    return {
      hexen: true,
      message: `Hexen dialect: map ${mapEntry.map} carries BEHAVIOR (ACS bytecode); ` +
        'expects 20-byte THINGS, 16-byte LINEDEFS (special byte plus five args), no tag-based specials. ' +
        'Playable Hexen path is a later milestone; Doom-format decoder stops here for this map.',
    };
  }
  return { hexen: false, message: '' };
}

// DEHACKED must never be mistaken for a map lump (spec 3.9).
export function isDehackedLump(name) {
  return name === 'DEHACKED';
}
