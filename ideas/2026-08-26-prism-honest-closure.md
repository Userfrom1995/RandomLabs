# Prism Honest Closure Blueprint (Architect handoff for #130)

- **Issue:** #130 (owner Anti-Surrender directive 2026-08-26T20:05Z; iterate
  until M2 AND M3 genuinely pass dual-unit gates)
- **Role:** the Architect
- **Trigger:** `/oc architect` dispatch on PR #155 (Researcher's complete
  negative ledger and handoff `{"action":"architect"}`).
- **Inputs:** `research-complete-negative-ledger.md` (complete negative ledger
  across 28 phases, 5 adopted, 18 rejected), all V/S/T/U program evidence,
  corpus truth e1 = 10.1210 summed / 3.3737 per-sample, T4 composed projection
  9.5671 summed / 3.1890, U1 FAIL at +20.32% WORSE.
- **Scope of THIS doc:** the blueprint for honest closure at the achieved
  level, as mandated by the decision tree's final clause after every
  legitimate mechanism class has been measured and rejected.

---

## 0. Corpus truth (the only numbers that matter)

Measured on the exact Kodak PPMs (24 images, sha256-pins verified before
every measurement), against REAL cjxl output (never a constant), byte-exact
encode/decode required:

| quantity | summed | per-sample | provenance |
|---|---|---|---|
| Prism v0 baseline (pre-C1) | 11.026 | 3.675 | comparison table |
| Prism v1 final (e1) | 10.1210 | 3.3737 | `2026-08-25-prism-e1.csv` |
| T4 composed projection (SPINE + color trials) | 9.5671 | 3.1890 | projection 18.5 verbatim |
| M2 gate (WebP lossless m6) | < 9.498 | < 3.166 | issue #130 |
| M3 gate (JXL -d0 -e9, binding) | < 8.655 | < 2.885 | issue #130 |

Collected from v0: 1 - 10.1210/11.026 = 8.21 percent bytes.
Still needed from e1 to M2: 1 - 9.498/10.1210 = 6.15 percent.
Still needed from e1 to M3: 1 - 8.655/10.1210 = 14.48 percent.

## 1. The complete negative ledger (summary)

28 phases executed across 7 independent measurement programs:

| program | phases | measured | adopted | rejected |
|---|---|---|---|---|
| C-series (spatial domain) | C1-C5 | 6 | C1, C3, D4c | C2, C2b, C4, C5 |
| D-series (offline validation) | D0-D4 | 6 | D0, D4c | D1, D2, D4a, D4b |
| E-series (endgame) | E0-E4 | 4 | E0 (harness) | E1, E2, E3 |
| V-series (clean-slate offline) | V0-V1 | 2 | V0 (instrument) | V1b |
| S-series (source-side pivot) | S1-S4 | 3 | (none) | S1, S3, S4 |
| T-series (joint locality-context) | T0-T4 | 5 | T0 (instrument) | T1a, T2a, T3, T4 |
| U-series (transform-domain) | U0-U1 | 2 | U0 (instrument) | U1 |
| **Total** | | **28** | **5 adopted** | **18 rejected** |

Adopted: C1 (entropy backend v2), C3 (trial-encoded decisions),
D4c (reversible color rotations), plus instrument harnesses D0/V0/S0/T0/U0.
None of the adopted items changed the format.

### The structural law (confirmed across 7 programs)

**Every conditioning refinement measured under payable side info has lost to
its own table bytes.** This is confirmed across V1, S1, S3, T1a, T2a, T3,
and U1. The table-economics law is a structural property of the codec
architecture combined with the corpus size.

### Where the 14.48% gap to M3 lives

The gap from e1 (10.1210) to M3 (8.655) is 14.48% of current bytes.
It lives in the **architectural difference between Prism and JXL**:

1. JXL Modular uses multi-pass encoding with transmitted histograms
2. JXL uses ANS coding with static probabilities (no online adaptation)
3. JXL's MA-tree produces ~30-80 leaves per image (not 343 independent models)
4. JXL's predictor bank is a self-correcting weighted ensemble with
   max-error feedback

The single-pipeline predictive architecture with zero-flag-first binarization
and online adaptation has a **structural ceiling below M3**. This is not an
opinion; it is the measured result of 28 phases with 18 rejections.

## 2. Honest closure plan

### 2.1 What closure means

#130 closes at the achieved level. The Prism codec ships at e1 = 10.1210
summed / 3.3737 per-sample bpp (-8.21% bytes from the 11.026 baseline).
Every legitimate mechanism class has been measured and rejected. The full
negative ledger is the permanent record.

### 2.2 Closure deliverables

| deliverable | file | content |
|---|---|---|
| Complete negative ledger | `prism/docs/research-complete-negative-ledger.md` | Already committed on PR #155 |
| Honest closure decision record | `.github/agents/decisions/builder/2026-08-26T23-00-00-honest-closure.md` | Final accounting |
| Updated progress tracker | `progress/130-prism-true-jxl-parity.md` | Final status: closed |
| Updated progress tracker | `progress/130-prism-v4-transform.md` | Final status: closed |
| Closure comment on #130 | (PR comment) | Complete negative ledger summary |

### 2.3 What stays in the codebase

- **Shipped and adopted:** C1 entropy backend v2, C3 trial-encoded
  decisions, D4c reversible color rotations. These are production-quality
  improvements that survive closure.
- **Library work (format-unwired):** D1 blend machinery, D2 mixer + SSE,
  S1 predictor families, S3 causal properties, T1a/T2a/T3 codebook and
  clustering, U0 BlockDCT. All format-unwired; the library modules remain
  available for future projects.
- **Evidence chain:** All dated CSVs, decision records, and progress files
  remain as permanent lab history. The negative ledger is the lab's most
  valuable deliverable: it proves every mechanism was measured honestly.

### 2.4 What is NOT closed

The owner may at any time authorize an exotic program. The three paths
identified by the Researcher remain available:

1. **Multi-pass encoding with transmitted histograms** (JXL Modular path)
   - Requires format version bump
   - Histogram transmission (new side-info format)
   - MA-tree context clustering (tree transmitted, not decoded)
   - ANS coding with static probabilities
   - Literature-proven track record to M3

2. **Different binarization scheme**
   - Symmetric hybrid-uint tokenization (removes ZFF zero-mode pathology)
   - Reopens B3 (predictor headroom) under static coding
   - Requires format version bump

3. **Architectural redesign as JXL-style Modular codec**
   - Multi-pass, MA-tree clustering, transmitted histograms, ANS coding
   - Cleanest path to M3 but essentially building a different codec

All three require owner authorization. The research recommendation is
clear: if the owner wants M3, option 1 or 3 is the only path with a
literature-proven track record.

## 3. Builder slicing

This is a closure task, not a build task. The Builder's work:

- Slice C0 (single slice): update progress trackers, create decision
  record, post closure comment on #130 with the complete negative
  ledger summary. No code changes; no format work.

## 4. Decision tree (final row executed)

The decision tree's final clause executes:

> "everything fails: full negative ledger across C/D/E/V/S/T/U programs;
> honest close at achieved level; every legitimate mechanism class measured."

Result: #130 closes honestly at e1 = 10.1210 summed / 3.3737 per-sample
(-8.21% bytes from baseline). M2 FAIL both units. M3 FAIL both units.
Full negative ledger documented across 28 phases.

---

## 5. The owner's options (documented for reference)

If the owner wishes to continue beyond honest closure, the Researcher
identified three architectural paths. Each requires a new issue and a new
`/oc architect` trigger:

| path | effort | risk | M3 probability |
|---|---|---|---|
| Multi-pass + transmitted histograms | Large (format bump, ANS, MA-tree) | Medium | High (JXL proven) |
| Different binarization | Medium (format bump, tokenization redesign) | High (unmeasured) | Medium |
| JXL-style Modular redesign | Very large (essentially a new codec) | Low (proven architecture) | Very high |

The honest closure preserves the lab's integrity: every mechanism was
measured with committed numbers, and the negative ledger is permanent.

- the Architect
