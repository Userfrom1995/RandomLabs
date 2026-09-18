// DMX digital-sound lump parser (research spec 5.1). Pure: no WebAudio import.
// DS* lump layout (all little-endian):
//   u16 format (must be 3 for PCM; 0 is PC-speaker square wave, out of scope)
//   u16 sampleRate Hz (dominant 11025, four Doom 2 lumps at 22050)
//   u32 length (bytes after this header INCLUDING both 16-byte pads)
//   16 bytes leading pad, <length - 32> PCM samples, 16 bytes trailing pad.
// WebAudio conversion strips the pads and maps u8 0..255 to f32 -1..1.
export const DMX_FORMAT_PCM = 3;
export const DMX_PAD = 16;
export const DMX_HEADER = 8;
export const DMX_MAX_SAMPLES = 65535;

function fail(code, actual, lump = '') {
  throw Object.assign(new Error(`DMX ${code}: ${actual}`), { code, lump });
}

export function parseDmxLump(bytes, lump = '') {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (u8.length < DMX_HEADER) fail('E_DMX_TRUNCATED', `header needs 8 bytes, got ${u8.length}`, lump);
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const format = view.getUint16(0, true);
  const sampleRate = view.getUint16(2, true);
  const length = view.getUint32(4, true);
  if (format !== DMX_FORMAT_PCM) fail('E_DMX_FORMAT', `format ${format}, want 3 (PC-speaker 0 unsupported)`, lump);
  if (sampleRate <= 0) fail('E_DMX_RATE', `sample rate ${sampleRate}`, lump);
  const count = length - DMX_PAD * 2;
  if (count < 0) fail('E_DMX_TRUNCATED', `length ${length} below 32 pad bytes`, lump);
  if (count > DMX_MAX_SAMPLES) fail('E_DMX_TRUNCATED', `sample count ${count} above vanilla cap 65535`, lump);
  const start = DMX_HEADER + DMX_PAD;
  if (start + count + DMX_PAD > u8.length) {
    fail('E_DMX_TRUNCATED', `payload ${start}+${count}+16 exceeds lump ${u8.length}`, lump);
  }
  return {
    format,
    sampleRate,
    length,
    sampleCount: count,
    samples: u8.slice(start, start + count),
  };
}

// Unsigned 8-bit PCM to float32 mono, vanilla mapping (b - 128) / 128.
export function dmxToFloat32(samples) {
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = (samples[i] - 128) / 128;
  return out;
}

// Duration in seconds at the lump rate (context resamples on playback).
export function dmxDurationSec(parsed) {
  return parsed.sampleCount / parsed.sampleRate;
}
