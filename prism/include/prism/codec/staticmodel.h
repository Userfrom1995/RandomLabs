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
    KTREE = 4
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

    // Raw (pre-merge) cluster id from the keying definition.
    uint32_t raw_at(size_t idx, const std::vector<int32_t>& hist) const;
    // Final cluster id (merge applied; EXPLICIT bypasses everything).
    uint32_t at(size_t idx, const std::vector<int32_t>& hist) const;
};

ClusterMap cluster_map_keyed(KeyingId k);
ClusterMap cluster_map_grid(uint32_t w);
ClusterMap cluster_map_tree(const std::vector<uint32_t>& ctx_leaf,
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
