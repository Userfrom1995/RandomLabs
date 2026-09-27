# Hearthlight story

**Logline.** When the lanterns of Ember Hollow begin to go out one by one,
twelve-year-old apprentice wind-cartographer Nia must chart the unseen
valley wind, befriend the ancient mossback boar Ruel, and carry her
grandmother's last lantern flame to the high cairn before the final night
of the dark month falls.

## The five acts (270 s total)

1. **The Dimming** (0:00-0:50) - Ember Hollow at dusk, lanterns failing; Nia introduced charting winds on the hill.
2. **The Last Flame** (0:50-1:50) - Yara entrusts Nia with the keeper's lantern; the wind map reveals the high cairn path.
3. **The Mossback** (1:50-2:50) - Valley crossing; Ruel appears, tests Nia, then carries her across the washed-out bridge gorge.
4. **The Ascent** (2:50-3:50) - Storm climb, flame nearly lost, wind motif turns from adversary to guide.
5. **Hearthlight** (3:50-4:30) - Cairn lighting, valley lanterns rekindle in a wave of light; quiet coda with Nia as keeper.

## The cast

- **Nia** - 12, apprentice wind-cartographer. Clever-but-hasty becoming steady. Reads air like rivers.
- **Grandmother Yara** - 78, retired keeper. Gives the flame, the chart, and the storm-ribbon; stillness is her power.
- **Ruel** - the ancient mossback boar. Guardian of the gorge, dry humor, carries Nia across the ford.
- **The valley wind** - a presence, never a person. Adversary turned guide; its only face is its musical motif.

Full bible with model-sheet parameters: `film/story/characters.md`.
Full timed shot list: `film/story/screenplay.json`. Cue map:
`film/story/music-direction.md`.

## The trailer (30 s)

Six moments cut from the same timeline, played on the same stage through
the same renderer, score, and captions: the dimming (S01), the entrusting
(S06), Ruel (S10), the gorge ford (S12), the blue thread (S14), the
hearthlight (S17). The cut is data (`film/story/trailer.json`: shot plus
local in-point and duration per segment); the mapping
(`film/engine/trailer.js`) sends every trailer instant to exactly one film
instant on the 24 fps lattice, so each trailer frame is the same film
frame a full-film seek would paint. When the trailer ends, the end card
offers the full film; when the film ends, it offers the trailer.
