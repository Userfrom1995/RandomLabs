// Map discovery: marker scan + fixed 10-lump order check (spec 3.3).
import { WadError } from './errors.js';

export const MAP_ORDER = ['THINGS', 'LINEDEFS', 'SIDEDEFS', 'VERTEXES', 'SEGS', 'SSECTORS', 'NODES', 'SECTORS', 'REJECT', 'BLOCKMAP'];
export const MAP_MARKER_DOOM1 = /^E[1-5]M[1-9]$/;
export const MAP_MARKER_DOOM2 = /^MAP\d\d$/;

export function isMapMarker(name) {
  return MAP_MARKER_DOOM1.test(name) || MAP_MARKER_DOOM2.test(name);
}

// Scan directory entries; validate the fixed order after each marker.
// Returns [{ marker, index, entries: {THINGS.., BEHAVIOR?}, partial, map }].
// Malformed sequences throw E_MAP on that map only (caller isolates per map).
export function discoverMaps(lumps) {
  const maps = [];
  const byIndex = new Map(lumps.map((l) => [l.index, l]));
  void byIndex;
  for (let i = 0; i < lumps.length; i++) {
    const lump = lumps[i];
    if (!isMapMarker(lump.name)) continue;
    const mapName = lump.name;
    const entries = {};
    let j = i + 1;
    let k = 0;
    let partial = false;
    while (k < MAP_ORDER.length && j < lumps.length) {
      const want = MAP_ORDER[k];
      const got = lumps[j];
      if (got.name === want) {
        entries[want] = got;
        j++; k++;
      } else if (isMapMarker(got.name)) {
        // Next map starts early: partial PWAD map (changed lumps only).
        partial = true;
        break;
      } else {
        // Out-of-order lump: skip one slot and mark partial; strict order
        // required for full maps, lenient for partial PWAD fragments.
        const ahead = lumps.slice(j, j + 3).findIndex((l) => l.name === want);
        if (ahead === -1) { partial = true; k++; }
        else { for (let s = 0; s < ahead; s++) j++; }
      }
    }
    if (k < MAP_ORDER.length) partial = true;
    // Optional Hexen BEHAVIOR right after BLOCKMAP.
    if (j < lumps.length && lumps[j].name === 'BEHAVIOR' && !isMapMarker(lumps[j].name)) {
      entries.BEHAVIOR = lumps[j];
      j++;
    }
    // Minimum viable data check happens in lumpDecoders; here record names.
    const have = Object.keys(entries);
    if (have.length === 0 && !partial) {
      throw new WadError({ code: 'E_MAP', lump: mapName, map: mapName, offset: lump.dirOffset, expected: 'map lump sequence after marker', actual: 'no map lumps', severity: 'error', fallback: 'drop map' });
    }
    maps.push({ marker: lump, index: i, map: mapName, entries, partial, endIndex: j });
  }
  return maps;
}

// Shareware detection helper: episode clamp rule (spec 3.10).
export function episodeClamp(maps) {
  const names = new Set(maps.map((m) => m.map));
  const hasE2 = [...names].some((n) => /^E[2-5]M[1-9]$/.test(n) || /^MAP\d\d$/.test(n));
  return { episodes: hasE2 ? [1, 2, 3, 4] : [1], sharewareLikely: !hasE2 };
}
