# Continuity ledger: cause-effect chain (audit-enforced)

Rule: every beat's entry state must equal the previous beat's exit state
(fighter pos, weapon, wounds, fatigue, storm, knowledge). The audit tool
checks this field by field.

| Beat | Entry (= prev exit) | Exit | Cause link |
|------|---------------------|------|------------|
| b01 | fresh, storm 1 | fresh, storm 1 | opening: free storm gathers |
| b02 | b01 exit | center-west/center-east, raised, fatigue 1, storm 2 | weapons rise into circling |
| b03 | b02 exit | Thor center haft-low f2; Zeus center-east shaft-high f2 | Thor commits first |
| b04 | b03 exit | gripped, fatigue 3, storm 3 | blocked swing becomes throwing wager |
| b05 | b04 exit | split-brow / bruised-ribs, fatigue 5, Zeus shaft-dropped | clinch range after recall |
| b06 | b05 exit | grounded weapons, fatigue 6, storm 4 | storm breaks mid-clinch |
| b07 | b06 exit | lowered weapons, fatigue 7, storm 2 | spent storm, one last exchange |
| b08 | b07 exit | west/east marks, grounded, storm 0 | withheld blow becomes resolution |

Weapon honesty: the shaft is dropped in b05 and grounded in b06 entry; it is
never teleported. Wounds persist: the split brow and bruised ribs carry from
b05 through b08. Fatigue never decreases. Storm never resets between cuts
except by the on-screen loosing in b08.
