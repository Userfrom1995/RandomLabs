# E1-E Entropy Coding Complete (2026-09-01)

## Decision
Entropy coding implemented and tested. rANS geometric coding per symbol for Y_q|sigma and Z_q.

## What was done
1. Created `neural_entropy.h/cpp` with rANS geometric coding
2. Updated `neural_frame.cpp` to use entropy-coded payload
3. Fixed rANS LIFO bit ordering within symbols
4. Fixed MAX_MAG=128 for int8 -128 value
5. Fixed int32 residual (int16 overflow with untrained weights)
6. sigma NOT transmitted (re-derived from Z_q on decode)
7. Added3 new unit tests

## Payload layout
```
[yh u32][yw u32][zh u32][zw u32]
[zq_size u32][yq_size u32][res_size u32]
[Z_q rANS stream]
[Y_q rANS stream] (conditioned on sigma)
[Residual rANS stream]
```

## Test results
- 253/253 tests pass
- Frame round-trip byte-exact on 16x16 and 32x32 test images
- Y_q and Z_q round-trip verified at various sizes

## Next
- Re-measure via bench_gate.sh
- Update honest ledger with new measurements
