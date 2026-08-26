#pragma once
#include "prism/codec/tokenize.h"
#include <cstdint>
#include <string>
#include <vector>

namespace prism::codec::sandbox {

// ----- Keying providers (blueprint "Keying providers") -----
//
// Pluggable context structure interface. V0 shipped the two flat controls;
// V1 adds KGRID128 (position tiles, pin V-P1) and KTREE (learned context
// partition, pin V-P2) against this SAME interface so nothing is reshaped
// later. A keying maps the causal residual-DIFF context id (0..342) - or,
// for KGRID128, the sample position - to a raw cluster id.

enum class KeyingId : uint8_t {
    KSHARED = 0,
    KFLAT16 = 1,
    KFLAT343 = 2,
    KGRID128 = 3,
    KTREE = 4,
    KPROP = 5,
    KGROUP64 = 6,
    KGROUP128 = 7
};

int keying_cluster_count(KeyingId k);   // nominal count (grid/tree: see below)
uint32_t keying_cluster(KeyingId k, int cx);   // cx = residual_diff_context(...)
bool parse_keying(const std::string& s, KeyingId& out);
const char* keying_name(KeyingId k);

// Cluster budget (addendum 18.2): K_MAX caps transmitted models;
// MIN_SAMPLES_PER_CLUSTER floors them (anchor configs exempt, pin D4).
constexpr int K_MAX = 256;
constexpr int MIN_SAMPLES_PER_CLUSTER = 4096;

// Interleaved-static rANS state count (B-RANS engine).
constexpr uint32_t RANS_NS = 4;

// KGRID128 tile edge (pin V-P1): tiles are 128 x 128 pixels.
constexpr uint32_t GRID_TILE = 128;

// ----- T-series group machinery (spec addendum 20; builder pins
// 2026-08-26T08-05-00 BEFORE any measurement). FORMAT-UNWIRED: nothing
// here touches any container or production path. -----

// Pinned group tile edges (addendum 20.2 GROUP GEOMETRY).
constexpr uint32_t GROUP_PX64 = 64;
constexpr uint32_t GROUP_PX128 = 128;

// Deterministic Lloyd loop cap (addendum 20.2).
constexpr int LLOYD_ITER_CAP = 16;

// The K set is measured WHOLE whenever T1b runs; never re-selected.
inline constexpr int CODEBOOK_K_SET[4] = {4, 8, 16, 24};

// Class16 axis width folded into every group stack / prototype row
// (pins P-T0-1/P-T0-6: row id = k * 16 + c).
inline constexpr int GROUP_CLASS_AXIS = 16;

// Joint (group tile, class16) keyings: raw cluster id = g * 16 +
// ac_v2_prior_class(cx), g plane-major raster (pins P-T0-1/P-T0-6).
bool keying_is_group(KeyingId k);
uint32_t keying_group_px(KeyingId k);

// ----- S3 extended causal properties (addendum 19.4; pins P-S3-1..P-S3-12
// in decisions/builder/2026-08-25T23-00-00 BEFORE any measurement) -----
//
// Flat hashed keying over the frozen P_ext property list. The hasher is an
// INCREMENTAL causal object: it consumes the residual stream in raster
// order and answers per-sample raw cluster ids from prior samples only,
// so a decoder running a fresh hasher over its decoded history reproduces
// the encoder's sequence exactly (prefix-invariant by construction; pinned
// unit tests bind determinism, prefix-invariance, decode-mirror equality).

struct PropSpec {
    bool qW = false, qN = false, qNW = false, qNE = false;  // quotients
    bool gbW = false, gbN = false;   // CALIC gradient magnitude buckets
    bool plane = false;              // plane id coordinate
    bool emax = false;               // e_max_prev bucket per 18.4
    bool any() const {
        return qW || qN || qNW || qNE || gbW || gbN || plane || emax;
    }
};

class PropHasher {
public:
    // spec must enable at least one coordinate; bd_shift = bd - 8.
    PropHasher(uint32_t w, uint32_t h, uint32_t plane_id,
               const PropSpec& spec, int k_raw, int bd_shift);
    // Causal raw cluster id of sample idx from hist[0..idx) (the caller
    // walks i = 0..n-1 exactly once per hasher instance).
    uint32_t at(size_t idx, const std::vector<int32_t>& hist);
    int k_raw() const { return k_raw_; }

private:
    uint32_t octile_bucket(int which, int32_t v);   // quotient coords 0..6
    uint32_t w_, h_, plane_id_;
    PropSpec spec_;
    int k_raw_;
    int bd_shift_;
    uint32_t counts_[4][7];   // qW,qN,qNW,qNE histograms over seen values
    uint64_t totals_[4];
};

// ----- Cluster resolution -----
//
// One place that turns (sample index, decoded history) into the FINAL
// cluster id a coder indexes tables with: the raw keying result, mapped
// through the budget merge map ('SBP1'), or - for oracle rows - read from
// an explicit per-sample assignment (pin V-P4/Pin V-P5).

struct ClusterMap {
    enum class Kind : uint8_t { KEYED = 0, EXPLICIT = 1 };
    Kind kind = Kind::KEYED;
    KeyingId keying{};
    uint32_t w = 0;
    const std::vector<uint32_t>* ctx_leaf = nullptr;  // KTREE: [343]
    const std::vector<uint32_t>* merge = nullptr;     // raw -> final ('SBP1')
    const uint32_t* explicit_map = nullptr;           // EXPLICIT: per sample
    PropHasher* hasher = nullptr;                     // KPROP: live hasher

    // Raw (pre-merge) cluster id from the keying definition.
    uint32_t raw_at(size_t idx, const std::vector<int32_t>& hist) const;
    // Final cluster id (merge applied; EXPLICIT bypasses everything).
    uint32_t at(size_t idx, const std::vector<int32_t>& hist) const;
};

ClusterMap cluster_map_keyed(KeyingId k);
ClusterMap cluster_map_grid(uint32_t w);
ClusterMap cluster_map_tree(const std::vector<uint32_t>& ctx_leaf,
                            const std::vector<uint32_t>& merge);
// KPROP: the hasher is owned by the CALLER; every counting/coding pass
// must run against a FRESH hasher instance (state advances per sample).
ClusterMap cluster_map_prop(PropHasher* hasher, uint32_t w,
                            const std::vector<uint32_t>& merge);
ClusterMap cluster_map_explicit(const uint32_t* per_sample);

// ----- Per-image counting model -----

struct SandboxModel {
    TokProfile profile{};
    KeyingId keying{};
    int clusters = 1;
    // Binary kinds: n0/n1 per (cluster, kind, key) in flat layout
    // [(cluster * stride) + kind_offset + key]. TOKEN: symbol histogram.
    std::vector<uint64_t> n0, n1;
    std::vector<uint64_t> tok;                 // [cluster][T_ESC+1]
    std::vector<uint64_t> samples_per_cluster; // residual samples (floor rule)
    uint64_t raw_bits = 0;                     // RAWBITS bypass bits (pin D3)

    static size_t init_stride(TokProfile p);
    void init(TokProfile p, KeyingId kk);      // nominal keying count
    void init(TokProfile p, int nclusters);    // explicit count (V1 grid/tree)
    size_t span(int kind) const;
    size_t stride() const;
    size_t tok_syms() const { return (size_t)hyb_t_esc(profile) + 1; }
};

// Tokenize one residual plane into cluster-tagged events, counting into the
// model. Returns the tagged event stream (consumed by the backends).
struct TaggedEvent {
    uint32_t cluster;
    TokEvent ev;
};
void count_plane(SandboxModel& m, TokProfile p, KeyingId k,
                 const std::vector<int32_t>& res, uint32_t w,
                 std::vector<TaggedEvent>* events_out);
// General form: cluster resolution through a ClusterMap (V1 grid/tree/
// oracle rows; the KeyingId form above delegates to cluster_map_keyed).
void count_plane(SandboxModel& m, TokProfile p, const ClusterMap& cm,
                 const std::vector<int32_t>& res,
                 std::vector<TaggedEvent>* events_out);

// Integer Lloyd clustering over per-group stacks carried by a SandboxModel
// whose cluster axis indexes joint (g, c) cells (clusters = G * 16, row id
// g * 16 + c). Returns the transmitted fit AFTER the one-shot empty-
// prototype drop: survivors renumbered ascending, every group reassigned to
// its nearest surviving prototype by the pinned metric, centroids NOT
// recomputed after the drop.
struct CodebookFit {
    int k_transmitted = 0;                 // survivor count
    std::vector<uint32_t> proto_of_group;  // [G] final prototype ids
    SandboxModel centroids;                // clusters = k * 16 joint rows
    int iterations = 0;                    // iterations actually run
};
CodebookFit lloyd_cluster(const SandboxModel& groups_joint, int k_want);

// Budget enforcement as a visible step (V1): merges under-filled clusters
// IN PLACE and returns the raw -> final mapping ('SBP1' payload; empty
// result = identity, nothing merged). Anchor configs call with enforce=false
// and get an identity mapping.
std::vector<uint32_t> apply_cluster_budget(SandboxModel& m, bool enforce);

// V0-era in-place form kept for tests and anchor flows; discards the merge
// mapping. Prefer apply_cluster_budget when decoders must mirror merges.
void enforce_cluster_budget(SandboxModel& m, bool enforce);

// ----- Smoothing + normalization (addendum 18.2, pinned formulas) -----

struct SmoothedTables {
    TokProfile profile{};
    int clusters = 1;
    // 12-bit frequencies summing to exactly 4096 per group; binary kinds
    // carry P(bit==0); TOKEN carries per-symbol mass; escape-tree node
    // masses derive deterministically from the symbol histogram.
    std::vector<uint16_t> p;      // [(cluster * stride) + kind_off + key]
    std::vector<uint16_t> prior;  // image-level prior, one-cluster layout
    std::vector<uint16_t> delta;  // per-entry s16 (p - prior)

    size_t span(int kind) const;
    size_t stride() const;
    size_t tok_syms() const { return (size_t)hyb_t_esc(profile) + 1; }
    uint16_t at(uint32_t cl, int kind, uint32_t key) const;
};

void build_tables(const SandboxModel& m, bool apply_caps_floors,
                  SmoothedTables& out);
// Tables from an ALREADY-enforced model (V1 flow: apply_cluster_budget then
// this; keeps enforcement visible exactly once).
void build_tables_enforced(const SandboxModel& m, SmoothedTables& out);

// Pinned smoothing/normalization arithmetic (addendum 18.2), exposed for
// exact unit tests: PSEUDO = 32 counts per group as uniform or geometric
// (r = 15/16) integer distributions, then normalization to exactly 2^12
// with a support floor of 1 and ascending-id largest-remainder ties.
std::vector<uint64_t> smoothing_pseudo_uniform(uint64_t n);
std::vector<uint64_t> smoothing_pseudo_geometric(size_t n);
void smoothing_normalize_to_4096(const std::vector<uint64_t>& cp,
                                 std::vector<uint16_t>& out);

// ----- Serialization (hierarchical blob, CRC32, length prefixes) -----
//
// Layout (little-endian, fixed order): magic 'SBM1', u32 profile,
// u32 clusters, u32 prior_len, prior table (u16 each), delta stream
// (s16 each) compressed ONCE by the plane-rANS engine (pin D6: 8 MSB-first
// bit planes, static per-plane models built two-pass from the delta bytes),
// CRC32 over the UNCOMPRESSED table bytes (prior ++ deltas).

std::vector<uint8_t> serialize_tables(const SmoothedTables& t,
                                      size_t* audit_counted);
// Throws std::runtime_error on truncation or CRC mismatch (hard detect).
// When expect is non-null the deserialized tables must match it exactly or
// a mismatch exception fires (content-tampering detection surface).
SmoothedTables deserialize_tables(const std::vector<uint8_t>& blob,
                                  const SmoothedTables* expect);

// ----- Context tree (KTREE at V1; pins V-P2/V-P3) -----
//
// Greedy entropy-split partition of the 343 residual-DIFF contexts over the
// three components (qL, qU, qUL) ONLY - no information beyond KFLAT343 -
// inheriting matree caps (depth <= 10, leaves <= 256) and the sandbox floor
// (4096 aggregated samples per side), octile-quantile candidates weighted by
// per-context sample counts, fixed property/threshold scan order, strict
// maximum gain, DFS preorder leaves.

struct ContextTree {
    struct Node {                 // internal node, preorder
        uint8_t prop;             // 0 = qL, 1 = qU, 2 = qUL
        uint8_t thr;              // split: component <= thr goes left
    };
    std::vector<Node> nodes;
    std::vector<uint32_t> leaf_of_context;   // [343]
    uint32_t leaves = 1;
};

// `flat343` must be counted under KFLAT343 (cluster index == context id),
// planes pooled, so induction reads per-context histograms directly.
ContextTree build_context_tree(TokProfile p, const SandboxModel& flat343);

// 'SBT1': magic, u32 leaves, u16 internal-node count, preorder node bytes,
// CRC32 over everything before it. Throws on truncation/CRC/bad shape.
std::vector<uint8_t> serialize_tree(const ContextTree& t,
                                    size_t* audit_counted);
ContextTree deserialize_tree(const std::vector<uint8_t>& blob);

// 'SBP1' budget merge-map: magic, u16 raw-cluster count, one byte per raw
// cluster (final id), CRC32. Throws on truncation/CRC/out-of-range ids.
std::vector<uint8_t> serialize_merge_map(uint32_t raw_clusters,
                                         const std::vector<uint32_t>& merge,
                                         size_t* audit_counted);
// Returns raw_clusters entries (identity when the blob encodes none).
std::vector<uint32_t> deserialize_merge_map(const std::vector<uint8_t>& blob,
                                            uint32_t raw_clusters);

// 'SBP2' wide merge map (pin P-T0-7): joint raw ids exceed 'SBP1's u8
// entries. Magic, u16 raw-cluster count, u16 entry per raw cluster
// (final id, range-checked), trailing u32 CRC32 over everything before it.
std::vector<uint8_t> serialize_merge_map16(uint32_t raw_clusters,
                                           const std::vector<uint32_t>& merge,
                                           size_t* audit_counted);
std::vector<uint32_t> deserialize_merge_map16(const std::vector<uint8_t>& blob,
                                              uint32_t raw_clusters);

// ----- T-series codebook ('SBC1') + assignment words -----

// Serializes the transmitted prototype tables (clusters = K * 16 joint
// rows; prior tables ride raw) plus the 4096-normalized assignment context,
// then the words themselves as a symbol-rANS stream under that context.
// Words are one per group in plane-major raster order (pin P-T0-4).
// Layout pinned in decisions/builder/2026-08-26T08-05-00 P-T0-5. When
// words_bytes is non-null it receives the exact tail size (u32 nwords +
// u32 len + coded words) so callers can decompose NET into prototype-table
// and assignment-word columns without reparsing the blob.
std::vector<uint8_t> serialize_codebook(const SmoothedTables& protos,
                                        const std::vector<uint32_t>& words,
                                        size_t* audit_counted,
                                        size_t* words_bytes = nullptr);

struct DecodedCodebook {
    SmoothedTables tabs;                // clusters = K * 16 joint rows
    std::vector<uint16_t> assign_ctx;   // [K] u12 histogram
    std::vector<uint32_t> words;        // decoded, raster group order
};

// Throws on truncation/CRC/bad shape. When expect_tabs / expect_words are
// non-null the decoded content must match exactly or a mismatch exception
// fires (content-tamper surface identical to deserialize_tables).
DecodedCodebook deserialize_codebook(const std::vector<uint8_t>& blob,
                                     const SmoothedTables* expect_tabs,
                                     const std::vector<uint32_t>* expect_words);

// ----- T-series shrinkage estimator + 'SBD1' (addendum 20.3) -----

struct ShrunkTables {
    TokProfile profile{};
    std::vector<uint16_t> class16;      // [16 * stride] pooled parent rows
    std::vector<int16_t> child_delta;   // [343 * stride] child - parent s16
    std::vector<uint16_t> p;            // [343 * stride] rebuilt on decode

    size_t stride() const;
};

// Children = the flat343 model's per-context rows (cluster == context id,
// planes pooled); parents = the SHIPPED class16 reduction's pooled u12
// rows from `class16_tabs` (a KFLAT16-built SmoothedTables). Shrinkage runs
// the pinned normalize_counts_4096 arithmetic verbatim per binary cell:
// cp_i = n_i * 4096 + a_c * parent_u12(i) (pins P-T0-8).
ShrunkTables shrink_child_tables(TokProfile p, const SandboxModel& flat343,
                                 const SmoothedTables& class16_tabs, int a_c);

std::vector<uint8_t> serialize_shrunk(const ShrunkTables& t,
                                      size_t* audit_counted);
// Throws on truncation/CRC. expect-match tamper surface as P-T0-5.
ShrunkTables deserialize_shrunk(const std::vector<uint8_t>& blob,
                                const ShrunkTables* expect);

// ----- Oracle-map pass (V1a; pin V-P4) -----
//
// Assigns every sample of every plane to the lowest-pinned-cost ACTIVE
// cluster (samples > 0 in the enforced source model) under tables built
// from that model; single pass, ties to the lowest cluster id, memoized by
// exact event-vector signature. Returns one explicit map per plane, in the
// caller's plane order (indexing matches the residual planes).
std::vector<std::vector<uint32_t>> oracle_assign(
    TokProfile p, const SandboxModel& source, const SmoothedTables& t,
    const std::vector<std::vector<int32_t>>& plane_residuals);

// ----- Backends -----

// B-RANS payload: 'SBR1', u32 ncoded, RANS_NS x (u32 len + state bytes),
// u32 rawlen + packed literal bits (MSB-first).
std::vector<uint8_t> rans_encode_events(TokProfile p,
                                        const std::vector<TaggedEvent>& ev,
                                        const SmoothedTables& t);
std::vector<int32_t> rans_decode_events(TokProfile p, KeyingId kk,
                                        uint32_t w, size_t nres,
                                        const std::vector<uint8_t>& bytes,
                                        const SmoothedTables& t);
std::vector<int32_t> rans_decode_events(TokProfile p, const ClusterMap& cm,
                                        size_t nres,
                                        const std::vector<uint8_t>& bytes,
                                        const SmoothedTables& t);

// B-BAC payload: 'SBB1', u32 ncoded, u32 len + arithmetic-coder bytes,
// u32 rawlen + packed literal bits (MSB-first).
std::vector<uint8_t> bac_encode_events(TokProfile p,
                                       const std::vector<TaggedEvent>& ev,
                                       const SmoothedTables& t);
std::vector<int32_t> bac_decode_events(TokProfile p, KeyingId kk, uint32_t w,
                                       size_t nres,
                                       const std::vector<uint8_t>& bytes,
                                       const SmoothedTables& t);
std::vector<int32_t> bac_decode_events(TokProfile p, const ClusterMap& cm,
                                       size_t nres,
                                       const std::vector<uint8_t>& bytes,
                                       const SmoothedTables& t);

// Ideal length implied by the transmitted tables (fidelity reference).
double table_ideal_bits(TokProfile p, const std::vector<TaggedEvent>& ev,
                        const SmoothedTables& t);

// ML bracket over a sandbox event stream (generic profiles; the ZFFCTRL
// anchor brackets come from the shared frozen walk instead).
double ml_ideal_bits(const SandboxModel& m);

bool parse_backend(const std::string& s, int& out);   // 0 IDEAL 1 RANS 2 BAC 3 ADAPT
const char* backend_name(int b);

} // namespace prism::codec::sandbox
