// Mythduel leitmotif rows (semitone offsets, original lines).
// Shared by the offline orchestra (score/orchestra.js) and the live WebAudio
// performer (score/live-audio.js), so both play identical pitches.
//
// All four rows are original melodies written for this duel: the northern
// horn-call row for Thor, the bright bronze row for Zeus, the grinding
// half-step ostinato for clashing weapons, and the resolving hymn the two
// fighters finally play in unison. No quoted material, no samples.
export const MOTIFS = {
  'thor-row': [0, 3, 5, 7, 10, 7, 5, 3],
  'zeus-row': [0, 4, 5, 7, 11, 9, 7, 4],
  'clash-ostinato': [0, 0, -1, 0, -3, 0, 1, 0],
  'resolution-hymn': [0, 2, 5, 7, 12, 9, 7, 5],
};

export function motifFor(music) {
  if (!music || typeof music.motif !== 'string' || !music.motif) {
    throw new Error('music.motif must be a non-empty string');
  }
  const key = music.motif.toLowerCase();
  if (!MOTIFS[key]) throw new Error('unknown motif: ' + music.motif);
  return { name: key, row: MOTIFS[key] };
}

export function semitoneToFreq(rootFreq, semi) {
  return rootFreq * Math.pow(2, semi / 12);
}
