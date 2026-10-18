# Postformer

An archived lab experiment (issue #294): a matched-budget CPU training
harness for small transformer-family models. Development is frozen; the
harness is preserved here for provenance.

## Contents

- `harness/train_chunk.py` - chunked and resumable CPU training driver.
  Each invocation advances at most `--chunk-steps` optimizer steps and
  exits 0; the next invocation (same `--out`) resumes bit-identically:
  same data episode order, same cosine schedule position, same optimizer
  state, with a loud refusal on hyperparameter mismatches rather than a
  silently forked stream.
- `harness/gate_matrix.json` - the full-budget CPU gate matrix the driver
  consumed: presets, matched steps/batch/data stream per seed, and the
  model arm lists.

## Notes

- The driver targets the `postformer` training package (models, trainer
  helpers, evaluation harnesses) it was written against; that package is
  not part of this repository, so the harness serves as reference material
  rather than a standalone runnable tool.
- See [archive/README.md](../README.md) for the full archive catalog and
  the root [README.md](../../README.md) for active and recent projects.
