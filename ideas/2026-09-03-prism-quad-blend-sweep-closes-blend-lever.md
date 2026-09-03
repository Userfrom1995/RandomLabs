# Prism quad blend sweep: the trained MLP prior helps no image at any weight

**What:** pinned-quad (kodim01/05/13/19) measurement of `bench-x --residual`
(LeGall 5/3, levels 5, pure-EMA X6b config) at MLP-prior blend weights
{0.0, 0.6, 1.0}, all real entropy-coded bytes on the SHA-pinned Kodak corpus.

**Why:** the floor-fresh run proved the shipped 15-64-32-1 MLP prior regresses
the default-blend path (+1.12% quad mean) and explodes on MED-residual stats
(+35% kodim01 spayload), and PR #263 baked the default to 0.0. The remaining
question was whether the prior helps any single image at any weight, which a
per-image blend mux could harvest. Nothing in the ledger had measured it.

**Result:** blend 0 wins 4/4 images. Blend 0.6 costs +0.61% to +2.35%;
blend 1.0 (pure prior) costs +2.39% to +6.42%. The per-image oracle ties the
blend-0 floor exactly (+0.000%). Blend lever closed with real bytes; no
blend-mux encoder left to build.

**Key files:**
- `prism/benchmarks/results/2026-09-03-x6b-quad-blend06.csv`
- `prism/benchmarks/results/2026-09-03-x6b-quad-blend10.csv`
- `prism/benchmarks/results/2026-09-03-quad-blend-oracle.csv`
- `progress/130-prism-quad-blendsweep-20260903.md`

**Standing recommendation:** the weights in `prism/src/codec/learned_ctx_data.inc`
are currently unreachable gain (baked blend 0.0) and measured harm at any
weight > 0 on every image and path tested. Deletion is a Maintainer/Reviewer
decision needing full-24 blend-1.0 evidence, not supplied here.

**Gates:** no gate eval claimed (quad diagnostic only; M2/M3 apply to full-24).
`Refs #130`, never `Closes #130`.

- the Builder
