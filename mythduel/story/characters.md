# Fighter bible: two original interpretations of public-domain myth figures

IP DECLARATION (binding): Thor and Zeus here are original creations drawn only
from public-domain Norse and Greek myth sources (the storm-bringer of the
north; the storm-lord of Olympus). No Marvel Thor likeness, costume, or story.
No God of War / Sony Santa Monica likeness, design, audio, or script. No game
or film assets of any kind. Every silhouette, palette, weapon shape, line of
dialogue, and motif in this duel is authored in-repo for this project.

## THOR, storm-bringer of the north (original design)

- Read: a broad, low-gravity brawler. Wide shoulders, heavy braid and beard worn
  for wind-reading, layered sea-cloak over a riveted work-harness. Palette:
  slate blue `#3d4c63`, rust red `#a03c2e`, bone `#e4d7bd`, iron `#2a2f38`.
- Proportions (head units, binding on the model sheet): 7.0 heads tall; shoulder
  width 2.1 heads; beard mass 1.2 heads; braid 2.4 heads with iron ring.
- Weapon: the northern haft-hammer `hafra`: a long two-hand ash haft (3.2 heads)
  with a compact wedge head, leather lanyard, zero resemblance to any screen
  hammer. Grip states: grounded, raised, low, gripped, lowered.
- Effort language: leads with the shoulder, overextends half a step on misses,
  exhales audibly on impact, kneels only when the ribs demand it.
- Secondary motion: braid and cloak hem driven by the beat wind vector; beard
  fringe trembles at force >= 0.5.

## ZEUS, storm-lord of Olympus (original design)

- Read: a tall, upright placer of precise strikes. Close-cropped silver hair,
  short philosopher's beard, draped pale himation over a bronze-fitted shoulder
  guard. Palette: marble white `#ece7da`, Aegean blue `#2e5f8a`, bronze
  `#a8762e`, storm grey `#565b66`.
- Proportions (head units, binding on the model sheet): 7.4 heads tall; shoulder
  width 1.8 heads; himation drape 2.0 heads; stance narrow, weight high.
- Weapon: the Olympian shaft-bolt `keraunos-rod`: a tapered bronze-capped shaft
  (3.0 heads) with a faceted glass-bronze head that throws sparks, zero
  resemblance to any screen bolt. Grip states: grounded, raised, high, gripped,
  lowered, dropped (b05 only, recovered by b06 entry per the ledger).
- Effort language: fights off the back foot, places counters, drops the shaft
  when the ribs fail (b05), stays a killing blow rather than lands it (b07).
- Secondary motion: himation edge and aegis-fringe driven by the beat wind
  vector; hair barely moves (oiled), fringe does the talking.

## Shared rig contract ( Phases 3 )

- Proportion bodies with FK limbs per the head-unit sheets above; hands that
  grip, throw, and catch per the shaft/haft grip states; gaze plus blink plus
  brows plus effort mouths; ground-contact feet; exertion tremor scaled by the
  fatigue field (0-7) in `duel.json`.
- Model-sheet tolerance (audit-enforced from Phase 3): rendered limb ratios
  within 5 percent of the sheets; turnaround symmetry mirrored; silhouettes
  readable at 390 px (distinct shoulder-to-hip ratio: Thor 1.35, Zeus 1.15).
