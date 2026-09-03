// Folio auto-rename patterns (E19): {name} {date} {pages} {tool} {index}.
export function applyPattern(pattern, vars) {
  return pattern.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : "{" + k + "}"));
}

export function sanitizeFileName(s) {
  return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120) || "folio-output";
}

// PDF permission flags (S3): 32-bit Perms encode/decode roundtrip.
export const PERMS = { print: 4, modify: 8, copy: 16, annotate: 32, fill: 256, extractAccess: 512, assemble: 1024, printHigh: 2048 };
const BASE_ON = 0xfffff000;

export function encodePerms(grants) {
  let v = BASE_ON >>> 0;
  for (const [k, bit] of Object.entries(PERMS)) if (grants[k]) v |= bit;
  return v >>> 0;
}

export function decodePerms(v) {
  const out = {};
  for (const [k, bit] of Object.entries(PERMS)) out[k] = (v & bit) !== 0;
  return out;
}
