# Hearthlight - Character Bible and Model-Sheet Parameters

Original characters created for this film. No reference to, or derivation
from, any existing studio's characters. All proportions below are the
committed model-sheet parameters that the Phase 2 vector rigs in `film/engine/rigs/`
will be built from (head-unit system: 1 hu = height of the character's head).

## Nia - apprentice wind-cartographer, 12

- **Role:** Protagonist. Carries the keeper's lantern from Yara's house to
  the high cairn. Arc: clever-but-hasty reader of wind becomes steady keeper.
- **Silhouette:** Small sturdy frame, big patched cloak that bellies in wind
  (acting surface), survey pole taller than she is, ribbon cluster at the
  shoulder. Readable at 390 px by cloak triangle + pole line alone.
- **Model sheet:** Height 4.5 hu. Head: round, charcoal hair cut short with a
  windswept tuft (3 spikes, always leeward). Eyes: large, amber, single ink
  line upper lid. Cloak: rust-red (#a03a2a) with one patched elbow square;
  hem lifts with wind strength 0..1. Scarf: storm-blue with Yara's knotted
  ribbon (added Act 2). Boots: dark, mud-flecked from Act 3 on.
- **Acting notes:** Thinks with her hands (charting gestures); fear shows in
  stillness, not shaking; smiles once, at Ruel's joke in Act 3; cries without
  sound in Act 4 shot s14, flame reflected in eyes.
- **Voice (captions):** Short sentences, wind vocabulary. Never says what the
  picture already says.

## Grandmother Yara - retired keeper, 78

- **Role:** Mentor and threshold guardian. Gives Nia the flame, the chart,
  and the storm-ribbon; waits at home through Acts 3-4; coda at dawn.
- **Silhouette:** Tall stoop, shawl draped to a peak, keeper's staff she no
  longer needs but keeps by the door. Hands large and steady (close-up
  acting surface in s06).
- **Model sheet:** Height 4.0 hu standing (5.2 hu un-stooped in memory
  flash-frame only). Hair: silver bun with two lacquer sticks. Shawl:
  indigo (#33406a) with embroidered wind-rose at the back hem. Eyes: pale
  grey, heavy calm lids. Moves at half Nia's keyframe rate; stillness is
  her power.
- **Acting notes:** Never hurries, never raises her voice. The farewell
  (s08) is played entirely in the hands knotting the ribbon.

## Ruel - the mossback boar, ancient

- **Role:** Guardian of the gorge, comic ballast, transport across the ford.
  Tests Nia (s11), carries her (s12), witnesses the lighting from below.
- **Silhouette:** Massive quadruped, shoulder hump crowned with moss and
  lichen-antler branches, ember-orange eyes in deep shadow, short tail that
  wags exactly once (s11, on "Climb up"). Readable at any size by hump +
  antler rake.
- **Model sheet:** Shoulder height 2.1x Nia's full height; length 3.4x Nia.
  Hide: slate-brown (#4a4038) with moss-green (#5a7048) mantle thickest on
  the hump. Lichen antlers: pale sage, 5 tines each side, asymmetrical.
  Tusks: short, chipped left. Breath-mist particle emitter in cold shots.
- **Acting notes:** Speaks slowly, with dry humor. All emotion in the ears
  and the tail; the face barely moves, which makes the one tail-wag land.
  Footfalls land on the score's downbeats in s12 (sync point).

## The valley wind - a presence, not a person

- **Role:** Antagonist turned guide. Adversary in Acts 1-4, ally in s15,
  celebrant in Act 5. Never anthropomorphized: no face, no voice.
- **Design language:** Rendered only through its effects: ribbon angles,
  reed bends, snow spirals, spray vectors, ember drift. One consistent
  vector field per shot (direction + strength 0..1 in the screenplay
  `wind` model of later phases). The turn in s15 is the film's midpoint
  miracle and must read purely visually before the narrator confirms it.
- **Leitmotif pairing:** The wind motif (score) is its only "face"; when the
  motif turns to major in s15, the audience understands before Nia does.

## Cast discipline

No other speaking parts. Villagers in s18 are distant silhouettes only.
No animal sidekicks, no comic-relief props. Four voices total
(Narrator, Nia, Yara, Ruel) plus the wind's wordless motif.
