#pragma once
#include "prism/codec/tokenize.h"
#include <cstdint>
#include <string>
#include <vector>

namespace prism::codec::sandbox {

// ----- Keying providers (blueprint "Keying providers") -----
//
// Pluggable context structure interface. V0 ships the two flat controls;
// KGRID(tile) and KTREE(caps) arrive at V3 against this SAME interface so
// nothing is reshaped later. A keying maps the causal residual-DIFF context
// id (0..342) of every sample to a cluster id.

enum class KeyingId : uint8_t { KSHARED = 0, KFLAT16 = 1, KFLAT343 = 2 };

int keying_cluster_count(KeyingId k);
uint32_t keying_cluster(KeyingId k, int cx);   // cx = residual_diff_context(...)
bool parse_keying(const std::string& s, KeyingId& out);
const char* keying_name(KeyingId k);

// Cluster budget (addendum 18.2): K_MAX caps transmitted models;
// MIN_SAMPLES_PER_CLUSTER floors them (anchor configs exempt, pin D4).
constexpr int K_MAX = 256;
constexpr int MIN_SAMPLES_PER_CLUSTER = 4096;

// Interleaved-static rANS state count (B-RANS engine).
constexpr uint32_t RANS_NS = 4;

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
    void init(TokProfile p, KeyingId kk);
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

// Floor/cap enforcement (addendum 18.2 + pins D4/D9). Anchor configurations
// call this with enforce=false.
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

// B-BAC payload: 'SBB1', u32 ncoded, u32 len + arithmetic-coder bytes,
// u32 rawlen + packed literal bits (MSB-first).
std::vector<uint8_t> bac_encode_events(TokProfile p,
                                       const std::vector<TaggedEvent>& ev,
                                       const SmoothedTables& t);
std::vector<int32_t> bac_decode_events(TokProfile p, KeyingId kk, uint32_t w,
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
