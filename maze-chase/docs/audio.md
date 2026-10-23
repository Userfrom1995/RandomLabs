# Sound identity and mix

One authored sound world shared by the terminal, desktop, and browser
layers. The shared score data, effect recipes, and mix defaults live in
`crates/audio/src/score.rs`; each layer voices them with its own synth
(the voice timbre tables and bus ceilings live in
`crates/desktop/src/sound.rs` and `web/maze-chase.js`), all synthesized
at runtime from data: no samples, audio files, or external sound
sources ship anywhere.

## Musical identity

The score is pond-at-dusk: a mallet lead over still water, a quiet reed
counterline, and small water-drop accents. Everything derives from one
tempo, `TEMPO = 108` BPM. Swing is applied to consecutive same-track
eighth notes in pairs (long-short) without changing the bar length, so
the three layers hear the same groove.

Five original tunes cover the whole arc:

- `TITLE_LOOP`: three tracks (mallet lead, reed counterline, drop
  accents), looping.
- `FRIGHT_LOOP`: a low rising drone, a reed pulse, and a two-note fall,
  looping.
- `DEATH_STING`: a sinking glass glissando over a low drone.
- `CLEAR_JINGLE`: exactly three rising notes closing on a warm bell.
- `GAMEOVER_STING`: a settled low reed cadence over a drone.

Each note carries a voice, length, velocity, and track lane. The lanes
are scheduled independently, so the lead, counterline, and accents keep
their own timing and loop seams.

## Voice and effect bank

Seven voice families generate every sound:

- `Mallet`: short sine pluck with a soft harmonic.
- `Drop`: quick falling sine blip.
- `Reed`: hollow triangle with a breathy edge.
- `Drone`: low sine fundamental with a subharmonic at ratio 0.50
  (mix 0.28), an 80 ms attack, and a 1.2 exponential decay to the
  note end.
- `Glass`: bright sine with a slow decay.
- `Bell`: warm sine pair with a long tail.
- `Pluck`: dry triangle pluck with no harmonic partial, a 4 ms
  attack, and a 5.0 exponential decay.

Rendered PCM is peak-normalized to the bus ceiling, so the layers
inside one recipe never clip; the music bus peaks at 0.32 and the SFX
bus at 0.50 before the user mix. The browser sample model keeps 1.5%
headroom under the SFX ceiling because its band-limited oscillators can
peak slightly above the ideal waveform model; the desktop render lands
on the ceiling.

Overlap between separate recipes is bounded by a summed-output stage,
not by the per-recipe normalization. The browser routes the summed
music and SFX buses through a master limiter (a `DynamicsCompressorNode`
followed by a soft-clip `WaveShaperNode`) before the destination. The
desktop scales both buses down by the worst-case active source count
(`active_music * 0.32 * music_gain + active_sfx * 0.50 * sfx_gain`) when
that sum would exceed full scale, so four loud effects plus a loop and a
sting at a 100/100 mix stay at or below 1.0. The web and desktop offline
mix tests pin the bound; the desktop test also pins the pre-limiter sum
above full scale.

Effects are layered recipes rather than single sweeps. A recipe is a
list of tones with voice, start and end frequency, length, delay, gain,
and an optional per-play variation. Crumbs, for example, use a 40 ms
soft pluck with slight pitch variation; the warden chain doubles the
whole recipe per link; relish, sunseed, spare wick, respawn, refill,
sprint, time-up, eyes, and every menu cue have their own layers.

## Default mix and live changes

| Control | Default | Range | Behavior |
|---|---|---|---|
| Master | 80% | 0-100% | Scales both buses |
| Music | 60% | 0-100% | Loops and stings |
| SFX | 80% | 0-100% | One-shot recipes |
| Mute | off | on/off | Silences both buses, keeps visuals |
| Fade | 120 ms | fixed | Applied to live gain changes; static-screen commits settle immediately |

The previous loud default is gone: master starts at 80 percent, music
at 60 percent, and effects at 80 percent. Slider moves on the static
settings screen settle immediately (no frame is scheduled); live fades
still take 120 ms. Mute is a bus change, not a pause, and the visual
twin for every cue still plays.

## Per-layer synthesis

- **Terminal** (`crates/terminal/src/chime.rs`): an opt-in BEL chime,
  off by default, marks sharp beats. The status-line ticker always
  narrates the run, independent of the chime, mute, or volume. The
  Settings screen carries a persistent `Terminal chime` row; visual
  flashes are rendered by the playing surface from game state, so the
  visual twin never depends on the mute or chime gates.
- **Desktop** (`crates/desktop/src/sound.rs`): rodio renders the shared
  recipes at 44.1 kHz. The sink tracks music and SFX gain separately,
  applies 120 ms live fades (static-screen commits settle in the input
  path), and schedules tune track lanes with a short loop-seam fade. A
  missing device opens a null sink instead of failing.
- **Browser** (`crates/web/src/audio_map.rs`, `web/maze-chase.js`): the
  page maps the same cue, tune, tone, and track data through the C ABI
  (`mc_sfx_tone_count`, `mc_sfx_tone_field`, `mc_tune_meta`,
  `mc_fade_ms`). WebAudio schedules every tone and lane, applies the
  same fades, and shows a "Sound is asleep - tap to wake" chip until the
  context is running. Without WebAudio the game plays silent with a
  visible note in the HUD.

## Accessibility and truthfulness

- Every cue has a visual twin: flashes, badges, floaters, the fright
  meter, the ticker, and the death/clear animations.
- No cue depends on audio to be understood, and silencing audio never
  hides a state change.
- Reduced flashing and reduced motion are independent of the mix.
- A terminal without audio hardware still gets the ticker; a desktop
  without a device still boots; a browser with a blocked context shows
  the unlock chip instead of pretending to play.

## Verification

- `crates/audio` tests pin the tempo, swing invariants, track lengths,
  voice codes, recipe sanity, layer counts, crumb length and variation,
  and chain pitch.
- `crates/config` tests pin the defaults, persistence round-trip, and
  corruption handling, including the terminal chime flag.
- Desktop tests measure offline PCM for every tune and SFX: finite
  samples, peak-normalized to each bus ceiling, and 0.154/0.320 peaks at
  the documented 80/60/80 default mix. They also pin the summed-output
  limiter at a 100/100 mix, a nonzero fade constant (the exact 120 ms is
  pinned by the audio and config suites), the null-sink fallback, and
  the sting cue mapping. Terminal tests pin the opt-in BEL,
  mute/chime gating, settings persistence, and the ticker; visual twins
  are rendered from game state and never depend on the audio gates.
- Web tests pin the ABI exports, first-tone legacy views, tune metadata,
  and routed cues; `wasm-smoke`, `boot-gate-e2e`, and `browser-e2e`
  exercise the shipped artifact, including the unlock chip, the
  persisted 35/45 mix, loop-stop transitions, the 0.32/0.50 offline
  peaks, the summed-output limiter at 100/100, the live mix-row labels,
  every warden chain pitch, and the persisted mute/low-volume startup.
  The web session unit test pins two same-tick warden cues at different
  chain arms; the browser harnesses cover the chain pitches, not
  same-tick cue ordering.
