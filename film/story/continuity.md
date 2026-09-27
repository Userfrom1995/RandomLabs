# Hearthlight Reimagined - Continuity Ledger

Binding rule (audit-enforced): every shot in `screenplay.json` carries a
`continuity` object with `entry` (who is where, holding what, flame level,
what each character knows), `exit` (the changed state), `cause` (the link to
the previous shot, naming its id), and the flame pair `flameIn`/`flameOut`
from the controlled vocabulary below. The next shot's `flameIn` must equal
the previous shot's `flameOut`. No teleporting props, no knowledge a
character should not have, no weather that resets between cuts.

Flame vocabulary: `full` (untended but whole), `faltering` (low, at risk),
`dark` (out), `kindled` (rekindled on Yara's hearth), `guarded` (carried and
sheltered), `half` (halved by the choice), `stub` (guttering), `cairn-lit`
(the cairn burning), `many` (the valley rekindled).

## Flame chain

| Shot | flameIn | flameOut | Cause link |
|------|---------|----------|------------|
| s01 | full | faltering | Opening image: lantern, ribbons, divided attention |
| s02 | faltering | dark | Follows s01: untended low flame meets the warned-about gust |
| s03 | dark | dark | Follows s02: solitary repair attempted before facing Yara |
| s04 | dark | dark | Follows s03: repair failed, so Nia runs to Yara |
| s05 | dark | kindled | Follows s04: confession answered with a price, not a pardon |
| s06 | kindled | guarded | Follows s05: protest becomes acceptance, flame entrusted |
| s07 | guarded | guarded | Follows s06: with the flame comes the charge (two children) |
| s08 | guarded | guarded | Follows s07: path learned, errand begins with the ribbon |
| s09 | guarded | guarded | Follows s08: first free choice is generosity (shepherd's hearth) |
| s10 | guarded | guarded | Follows s09: road ends at the station, marks become children |
| s11 | guarded | guarded | Follows s10: strangers become a party with a plan |
| s12 | guarded | guarded | Follows s11: the crossing inverts the debt (children save Nia) |
| s13 | guarded | guarded | Follows s12: the gorge's price surfaces as Lumi's fever |
| s14 | guarded | half | Follows s13: no third way, Nia spends half the flame (the choice) |
| s15 | half | half | Follows s14: the paid price turns the wind to a guide |
| s16 | half | stub | Follows s15: strength spent reaching the cold brazier |
| s17 | stub | cairn-lit | Follows s16: the stub fails, the valley's sparks answer |
| s18 | cairn-lit | many | Follows s17: the lit cairn answers down the hill road |
| s19 | many | many | Follows s18: the valley brings its keepers home to the knot |
| s20 | many | many | Follows s19: opening image restated with the fault repaired |

## Prop and knowledge ledger (checked by eye on every phase)

- The keeper's lantern: dead s02-s04, kindled s05, in Nia's hands s06-s17,
  tipped into the brazier s17. Never in another character's hands.
- The striker: Nia's table s03 only; it never reappears (she stops trying
  to fix things alone).
- Yara's storm-ribbon: knotted into Nia's scarf s08, present in every Nia
  shot after, retied by Lumi s19.
- Lumi's ankle binding: white and neat s10-s11, loosened s13 (fever),
  re-wrapped tighter s14 (Nia's hands busy while the flame halves), walking
  stick souvenir s19-s20.
- Tam's oar: shoulder-yoke s10-s11, belay tool s12, left at the gorge s12
  exit (never seen again: boats are behind him now).
- The cliff path knowledge: Yara's finger s07, Lumi's corrections s11
  (she knows the station side: established s10), Tam's counts s12/s16 (same
  tic, repurposed from fear to work).
- Weather: dusk s01, night s02-s04, lamplight interior s05-s06, first light
  s08, pushing day s09-s12, sleet s13-s14, breaking snow s15-s16, edge of
  night s17, dawn s18-s20. No resets: the storm spends itself exactly once.
