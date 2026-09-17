// Checked little-endian reader over an ArrayBuffer.
// Throws WadError (E_CONTAINER) on any out-of-bounds access instead of
// returning undefined. All multi-byte integers are little-endian per spec.
import { WadError } from './errors.js';

export class CheckedReader {
  constructor(buffer, opts = {}) {
    if (buffer instanceof Uint8Array) {
      this.bytes = buffer;
      this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else if (buffer instanceof ArrayBuffer) {
      this.bytes = new Uint8Array(buffer);
      this.view = new DataView(buffer);
    } else {
      throw new WadError({ code: 'E_CONTAINER', lump: '', map: null, offset: 0, expected: 'ArrayBuffer or Uint8Array', actual: typeof buffer, severity: 'fatal', fallback: 'reject file' });
    }
    this.size = this.bytes.length;
    this.lump = opts.lump || '';
    this.map = opts.map || null;
  }

  check(offset, length) {
    if (!Number.isInteger(offset) || !Number.isInteger(length) || offset < 0 || length < 0 || offset + length > this.size) {
      throw new WadError({
        code: 'E_CONTAINER', lump: this.lump, map: this.map, offset,
        expected: `read ${length} bytes inside [0, ${this.size})`,
        actual: `offset=${offset} len=${length} size=${this.size}`,
        severity: 'fatal', fallback: 'reject file',
      });
    }
  }

  u8(offset) { this.check(offset, 1); return this.view.getUint8(offset); }
  i8(offset) { this.check(offset, 1); return this.view.getInt8(offset); }
  u16(offset) { this.check(offset, 2); return this.view.getUint16(offset, true); }
  i16(offset) { this.check(offset, 2); return this.view.getInt16(offset, true); }
  u32(offset) { this.check(offset, 4); return this.view.getUint32(offset, true); }
  i32(offset) { this.check(offset, 4); return this.view.getInt32(offset, true); }

  slice(offset, length) {
    this.check(offset, length);
    return this.bytes.subarray(offset, offset + length);
  }

  ascii(offset, length) {
    const s = this.slice(offset, length);
    let out = '';
    for (let i = 0; i < s.length; i++) {
      if (s[i] === 0) break;
      out += String.fromCharCode(s[i]);
    }
    return out;
  }

  // Fixed 8-byte lump name: uppercase, null-padded; compare helper normalizes.
  name8(offset) {
    const s = this.slice(offset, 8);
    let out = '';
    for (let i = 0; i < 8; i++) {
      if (s[i] === 0) break;
      out += String.fromCharCode(s[i]);
    }
    return out.toUpperCase();
  }
}

// Normalize a lump name for comparison: fixed 8-byte case-insensitive.
export function normName(name) {
  return String(name).toUpperCase();
}
