# V0 sandbox spine: structural disambiguation pins before any measurement

- **Role:** the Builder
- **Date:** 2026-08-25 (Builder slice 1 of the V-series, PR #145, issue #130)
- **Authority:** spec addendum 17 (algorithmic-spec.md section 18) is binding;
  every CONSTANT there is implemented verbatim and never retuned by this
  record. This record only fixes STRUCTURAL readings the addendum text leaves
  open, BEFORE any `bench-sandbox` row exists (same discipline as the
  addendum itself; deviations after a measurement are forbidden).

## D1 Escape magnitude off-by-one (addendum 18.3)

Addendum: "token t = u for 0 < u < T_ESC, escape token T_ESC ... m = u -
T_ESC > 0 (m >= 1 guaranteed)". Literal subtraction gives m = 0 at u =
T_ESC, contradicting the guarantee. PINNED READING: escape when u >= T_ESC,
m = u - T_ESC + 1 (so m >= 1 always); direct tokens are 1..T_ESC-1. The
guarantee is treated as the binding constraint.

## D2 Per-token escape contexts (addendum 18.3)

ESC-B/C provide "T_ESC separate unary contexts" for escape quotients.
PINNED READING: escape unary context id = min(q, T_ESC - 1) where q =
bit_length(m) - 1. Exactly T_ESC contexts per ladder; deeper quotients
absorb into the last context. ESC-A keeps one shared unary context as
written.

## D3 Raw low bits are unmodeled

"then the low q bits of m raw": PINNED as uncoded raw bits at exactly q bits
cost, no table entries (JXL hybrid-uint precedent, the research's own
literature anchor). They still count fully in payload bytes.

## D4 Anchor poolings bypass floors and caps

VB-anchor rails require bit-for-bit reproduction of the committed ctx343 /
class16 / shared references. The addendum's cluster floor (4096 samples) and
K_MAX = 256 would merge clusters and break that equality. PINNED: anchor
configurations (profile ZFFCTRL x keyings KSHARED/KFLAT16/KFLAT343 x backend
B-IDEAL/B-ADAPT) run with floors/caps EXEMPT; every non-anchor configuration
applies them to its transmitted models (all backends of one config share the
same merged clustering, so per-config comparisons stay apples-to-apples).

## D5 Table granularity and support caps

Tables are PER IMAGE (planes pooled into one table set; residual-DIFF
contexts carry no plane identity). Unary supports are capped at
ESCQ_POS_MAX = Q_POS_MAX = 18 positions (BD16 quotients are <= 15 deep, +3
slack; deeper events absorb into the last slot). ZFFCTRL REM bins use
triangular indexing over L in 1..15 plus one overflow bucket for L >= 16.
State budget stays inside blueprint section 5 (~35 KB peak per family set).

## D6 Delta-stream compression depth

"delta stream compressed recursively by the same backend" is implemented as
ONE application of the interleaved binary rANS engine over the delta bytes
(8 MSB-first bit planes, static per-plane models built from the delta bytes
themselves in a two-pass). Recursion depth 1; no model recurses into itself.

## D7 TOKEN pseudo-counts

The addendum specifies even pseudo over "sign and ZERO tokens"; the HYB
TOKEN alphabet gets the same treatment: PSEUDO=32 spread EVENLY over the
T_ESC+1 symbols. No shape is assumed before counting.

## D8 VB-corrupt artifact surface

V0 has flat keyings only (KGRID/KTREE arrive at V3 per the interface
timeline), so no map ids or tree blobs exist yet. V0 exercises ALL THREE
detection mechanisms on the surfaces that exist: flipped table delta ->
CRC32 hard-detect; truncated blob -> length-prefix hard-detect; tampered
table content that survives CRC (CRC disabled injection) -> deserialized-
model mismatch flag + cost inflation > +10 percent. Map-id and tree-blob
injections activate with their artifacts at V3 (reserved-slot style note;
this record IS the pre-registration of that deferral).

## Consequence

Any change to these readings after the first sandbox measurement requires a
numbered amendment BEFORE that measurement lands or it never happens.

- the Builder

## Amendment A1 (2026-08-25, still BEFORE any measurement)

Structural readings forced by implementation, recorded before the first
sandbox row exists:

- **A1/D2 amendment (escape contexts)**: escape unary contexts are visited
  PROGRESSIVELY: continuation position k codes in context min(k, T_ESC-1),
  so the terminator lands in context min(q, T_ESC-1) exactly as D2 pinned -
  this form is decodable, since the decoder learns q only at the terminator.
  The addendum's "exactly T_ESC contexts" and "deeper absorb into the last"
  are preserved verbatim.
- **D9 (cap reduction rule)**: when active clusters exceed K_MAX = 256, the
  adjacent ACTIVE pair with the smallest combined sample count merges,
  keeping the lower id; repeated until legal. Floor merges go to the
  NEAREST NONEMPTY sibling (ties: lower id); empty slots are not clusters.
- **D10 (fidelity reference)**: VB-coder-fidelity compares each real
  backend's payload against ceil(bits_tbl/8), where bits_tbl is the ideal
  length implied by the transmitted (smoothed) tables - isolating ENGINE
  overhead from smoothing drag. The raw-ML bracket stays the anchor figure.
- **D11 (support floor)**: normalization keeps every key >= 1/4096 so both
  coders stay legal; binary bins clamp to [1, 4095].
- **D12 (anchor reference file)**: the committed quad reference is
  benchmarks/results/2026-08-25-ideal-probe-e0-eval.csv (per-image med rows;
  supersedes the two-image 2026-08-24 file, which stays frozen for G-repro).
- **D13 (HYB sign)**: the zigzag fold fixes the unsigned token ladder; the
  sample sign rides the dedicated SIGN bin immediately after each nonzero
  token (addendum 18.3 closing rule + L-C5). Token selection uses u = |r|.
- **D14 (single-entry groups)**: a kind whose table has one entry per bin
  normalizes per bin; saturation is clamped to 4095/4096 bounds by the
  coders' common p16 clamp [16, 65535].
- **D15 (per-bin normalization)**: every binary key is an INDEPENDENT bin:
  pseudo joins the bin's own support and P(bit==0) = round((c0+ps)*4096/
  (c0+c1+ps)) clamped [1,4095]. Only the TOKEN alphabet normalizes jointly
  to exactly 2^12. (An earlier cross-key reading was structurally wrong and
  was corrected before any measurement existed.)

- the Builder
