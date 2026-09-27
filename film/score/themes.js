// Hearthlight leitmotif rows (semitone offsets, original lines).
// Shared by the browser animatic performer and the Phase 4 orchestra.
export const MOTIFS = {
  nia: [0, 2, 4, 7, 9, 7, 4, 2],
  wind: [0, 1, 0, -2, 3, 1, 0],
  ruel: [0, 0, -2, 0, -4, -2],
  cairn: [0, 2, 4, 5, 7, 9, 7, 5],
};

const FAMILY = {
  'nia': 'nia', 'nia+cairn': 'nia', 'nia+ruel': 'nia', 'wind+nia': 'wind',
  'ruel+nia': 'ruel', 'all': 'cairn', 'cairn': 'cairn', 'cairn+nia': 'cairn',
  'nia (frag.)': 'nia', 'nia (lullaby)': 'nia', 'nia (thread)': 'cairn',
  'cairn (hint)': 'cairn', 'ruel (hint)': 'ruel', 'cairn (thread)': 'cairn',
  'cairn (gathering)': 'cairn', 'cairn (cadence)': 'cairn',
  'wind+nia (major)': 'wind',
};

export function motifFor(music) {
  if (!music || typeof music.motif !== 'string' || !music.motif) {
    throw new Error('music.motif must be a non-empty string');
  }
  const key = music.motif.toLowerCase();
  if (MOTIFS[key]) return { name: key, row: MOTIFS[key] };
  const fam = FAMILY[music.motif] || FAMILY[key];
  if (!fam || !MOTIFS[fam]) throw new Error('unknown motif: ' + music.motif);
  return { name: fam, row: MOTIFS[fam] };
}

export function semitoneToFreq(rootFreq, semi) {
  return rootFreq * Math.pow(2, semi / 12);
}
