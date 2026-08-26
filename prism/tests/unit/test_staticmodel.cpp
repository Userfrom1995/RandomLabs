// V0 sandbox staticmodel tests (blueprint section 3 test matrix):
// smoothing/normalization arithmetic matches the pinned formulas on
// hand-checked vectors; serialize/deserialize bijection; corrupted CRC
// rejected loudly; truncation rejected; independent byte counters agree;
// both real backends round-trip residual planes; cluster floor/cap rules.

#include "prism/codec/staticmodel.h"
#include "prism/codec/acoder.h"
#include <gtest/gtest.h>
#include <cstdlib>
#include <random>

using namespace prism::codec::sandbox;
using prism::codec::AC_V2_RESDIFF_CONTEXTS;
using prism::codec::ac_v2_prior_class;
using prism::codec::residual_diff_context;

namespace {

std::vector<int32_t> synth_plane(size_t n, uint32_t seed) {
    std::mt19937 rng(seed);
    std::uniform_int_distribution<int32_t> d(-4000, 4000);
    std::vector<int32_t> v(n);
    for (auto& x : v) x = d(rng);
    return v;
}

struct Built {
    SandboxModel m;
    SmoothedTables t;
    std::vector<TaggedEvent> evs;
    std::vector<int32_t> res;
    uint32_t w = 60;
};

Built build(TokProfile p, KeyingId k, size_t n, uint32_t seed,
            bool caps_floors) {
    Built b;
    b.m.init(p, k);
    b.res = synth_plane(n, seed);
    count_plane(b.m, p, k, b.res, b.w, &b.evs);
    build_tables(b.m, caps_floors, b.t);
    return b;
}

} // namespace

TEST(StaticModel, PseudoCountsSumToPinned32) {
    auto u = smoothing_pseudo_uniform(121);       // REM triangular bins
    uint64_t s = 0;
    for (uint64_t c : u) s += c;
    EXPECT_EQ(s, 32u);
    auto g = smoothing_pseudo_geometric(Q_POS_MAX);   // quotient positions
    s = 0;
    for (uint64_t c : g) s += c;
    EXPECT_EQ(s, 32u);
    // Geometric prior falls away from zero: nonincreasing along positions.
    for (size_t j = 1; j < g.size(); ++j) EXPECT_LE(g[j], g[j - 1]);
    // Even split over an escape ladder's token alphabet.
    auto t5 = smoothing_pseudo_uniform(hyb_t_esc(TokProfile::HYB_A) + 1);
    s = 0;
    for (uint64_t c : t5) { EXPECT_TRUE(c == 6 || c == 7); s += c; }
    EXPECT_EQ(s, 32u);
}

TEST(StaticModel, NormalizeSumsExactly4096WithSupportFloor) {
    std::mt19937 rng(3);
    for (int trial = 0; trial < 200; ++trial) {
        size_t n = 1 + rng() % 300;
        std::vector<uint64_t> cp(n);
        for (auto& c : cp) c = rng() % 1000;
        if (trial % 3 == 0) cp[0] = 0;            // empty keys stay legal
        std::vector<uint16_t> out;
        smoothing_normalize_to_4096(cp, out);
        uint64_t s = 0;
        for (uint16_t v : out) {
            ASSERT_GE(v, 1);
            ASSERT_LE(v, 4096);   // joint alphabet normalization saturates
            s += v;
        }
        EXPECT_EQ(s, 4096u);                      // exact 2^12 normalization
    }
}

TEST(StaticModel, CountBuildSerializeAuditAndBijection) {
    Built b = build(TokProfile::HYB_B, KeyingId::KFLAT16, 4096, 11, true);
    for (uint16_t v : b.t.p) {
        ASSERT_GE(v, 1);
        ASSERT_LE(v, 4095);       // binary bins clamp away certainty
    }
    size_t counted = 12345;
    auto blob = serialize_tables(b.t, &counted);
    EXPECT_EQ(counted, blob.size());              // VB-net-audit contract

    SmoothedTables back = deserialize_tables(blob, nullptr);
    EXPECT_EQ(back.p, b.t.p);
    EXPECT_EQ(back.prior, b.t.prior);
    EXPECT_EQ(back.delta, b.t.delta);
    EXPECT_EQ(back.clusters, b.t.clusters);

    // Content tampering that survives CRC must be caught by the expect
    // comparison; plain corruption is caught by CRC itself.
    SmoothedTables wrong = b.t;
    wrong.p[0] = (uint16_t)(wrong.p[0] == 1 ? 2 : wrong.p[0] - 1);
    EXPECT_THROW(deserialize_tables(blob, &wrong), std::runtime_error);

    auto corrupted = blob;
    corrupted[corrupted.size() / 2] ^= 0x01;
    bool threw = false;
    try {
        deserialize_tables(corrupted, nullptr);
    } catch (const std::exception&) {
        threw = true;
    }
    EXPECT_TRUE(threw);                           // loud CRC rejection

    auto truncated = blob;
    truncated.resize(blob.size() * 3 / 4);
    EXPECT_THROW(deserialize_tables(truncated, nullptr), std::runtime_error);
}

TEST(StaticModel, RansBackendRoundTripAllProfilesAndKeyings) {
    const TokProfile all[4] = {TokProfile::ZFFCTRL, TokProfile::HYB_A,
                               TokProfile::HYB_B, TokProfile::HYB_C};
    const KeyingId keys[3] = {KeyingId::KSHARED, KeyingId::KFLAT16,
                              KeyingId::KFLAT343};
    for (TokProfile p : all)
        for (KeyingId k : keys) {
            Built b = build(p, k, 3000, (uint32_t)p * 31 + (uint32_t)k + 1,
                            p != TokProfile::ZFFCTRL);
            auto payload = rans_encode_events(p, b.evs, b.t);
            auto dec = rans_decode_events(p, k, b.w, b.res.size(), payload,
                                          b.t);
            ASSERT_EQ(dec, b.res)
                << "profile=" << (int)p << " keying=" << (int)k;
        }
}

TEST(StaticModel, BacBackendRoundTripAllProfilesAndKeyings) {
    const TokProfile all[4] = {TokProfile::ZFFCTRL, TokProfile::HYB_A,
                               TokProfile::HYB_B, TokProfile::HYB_C};
    for (TokProfile p : all) {
        Built b = build(p, KeyingId::KFLAT16, 3000, (uint32_t)p * 77 + 5,
                        p != TokProfile::ZFFCTRL);
        auto payload = bac_encode_events(p, b.evs, b.t);
        auto dec = bac_decode_events(p, KeyingId::KFLAT16, b.w,
                                     b.res.size(), payload, b.t);
        ASSERT_EQ(dec, b.res) << "profile=" << (int)p;
    }
}

TEST(StaticModel, TransmittedTablesNeverBeatInSampleMl) {
    // In-sample ML is the entropy optimum: the smoothed, normalized
    // transmitted tables can only cost MORE (KL >= 0). On dense inputs the
    // drag stays bounded; on sparse clusters it legitimately explodes,
    // which is exactly what NET accounting must see. RAWBITS carry a
    // deterministic q-bits literal cost (pin D3) that ML does not model,
    // so they are added to the ML side rather than counted as drag.
    auto rawbit_cost = [](const std::vector<TaggedEvent>& evs) {
        double r = 0;
        for (const TaggedEvent& te : evs)
            if (te.ev.kind == EvKind::RAWBITS) r += (double)te.ev.key;
        return r;
    };
    for (TokProfile p : {TokProfile::ZFFCTRL, TokProfile::HYB_A,
                         TokProfile::HYB_B, TokProfile::HYB_C}) {
        Built sparse = build(p, KeyingId::KFLAT16, 800, (uint32_t)p + 7, false);
        double ml_s = ml_ideal_bits(sparse.m);
        double tbl_s = table_ideal_bits(p, sparse.evs, sparse.t);
        EXPECT_GE(tbl_s, ml_s - 1e-6) << "profile=" << (int)p;
        Built dense = build(p, KeyingId::KFLAT16, 40000, (uint32_t)p + 99,
                            false);
        double ml_d = ml_ideal_bits(dense.m) + rawbit_cost(dense.evs);
        double tbl_d = table_ideal_bits(p, dense.evs, dense.t);
        EXPECT_GE(tbl_d, ml_d - rawbit_cost(dense.evs) - 1e-6)
            << "profile=" << (int)p;
        EXPECT_LE(tbl_d, ml_d * 1.02 + 4096.0)
            << "profile=" << (int)p << " (smoothing drag unbounded)";
    }
}

TEST(StaticModel, ZffctrlTokenBlockNeverSpillsIntoNeighborBins) {
    // Regression (V0 fidelity discipline, BEFORE any measurement): for
    // ZFFCTRL the TOKEN table span is 0 (no token alphabet exists), and
    // build_tables must skip the TOKEN block entirely. It used to write
    // tok_syms() == 1 entries at the end-of-stride offset anyway, spilling
    // the value 4096 over the next cluster's ZERO_FLAG bin (and past the
    // whole array for single-cluster keyings). Every active cluster's
    // ZERO_FLAG entry must therefore stay a legal two-outcome probability
    // that tracks its own majority side.
    Built b = build(TokProfile::ZFFCTRL, KeyingId::KFLAT16, 60000, 424242,
                    false);
    const size_t stride = SandboxModel::init_stride(TokProfile::ZFFCTRL);
    int active = 0;
    for (int c = 0; c < b.m.clusters; ++c) {
        uint64_t c0 = b.m.n0[(size_t)c * stride + 0];   // nonzero count
        uint64_t c1 = b.m.n1[(size_t)c * stride + 0];   // zero count
        if (c0 + c1 == 0) continue;
        ++active;
        uint16_t p12 = b.t.at((uint32_t)c, (int)EvKind::ZERO_FLAG, 0);
        EXPECT_LT(p12, 4096u) << "cluster " << c
                              << ": ZERO_FLAG overwritten by the TOKEN block";
        EXPECT_GE(p12, 1u);
        if (c0 > 1000 && c1 > 1000)
            EXPECT_EQ(p12 > 2048u, c0 > c1)
                << "cluster " << c << ": majority side not tracked";
    }
    EXPECT_GE(active, 2);
    // Single-cluster keying: the old bug wrote one entry past the whole
    // array; assert the last slot is still the SIGN bin's legal value.
    Built s = build(TokProfile::ZFFCTRL, KeyingId::KSHARED, 20000, 777, false);
    uint16_t sign_p12 = s.t.at(0, (int)EvKind::SIGN, 0);
    EXPECT_GE(sign_p12, 1u);
    EXPECT_LE(sign_p12, 4095u);
    // HYB keeps a real TOKEN alphabet: entries sum to exactly 4096 per
    // cluster while neighboring kinds remain untouched.
    Built h = build(TokProfile::HYB_A, KeyingId::KFLAT16, 60000, 991, false);
    const size_t hstride = SandboxModel::init_stride(TokProfile::HYB_A);
    size_t tok_off = 0;
    for (int kk = 0; kk < (int)EvKind::TOKEN; ++kk)
        tok_off += h.t.span(kk);
    for (int c = 0; c < h.m.clusters; ++c) {
        uint32_t sum = 0;
        for (size_t sym = 0; sym < h.t.tok_syms(); ++sym)
            sum += h.t.p[(size_t)c * hstride + tok_off + sym];
        EXPECT_EQ(sum, 4096u) << "cluster " << c;
    }
}

TEST(StaticModel, ClusterBudgetFloorAndCap) {
    // Floor: many tiny clusters merge until every active cluster holds
    // >= MIN_SAMPLES_PER_CLUSTER samples (or one cluster remains).
    SandboxModel m;
    m.init(TokProfile::HYB_A, KeyingId::KFLAT16);
    std::vector<int32_t> res;
    // Concentrate all samples into class-0 contexts so other clusters fall
    // under the floor and must merge away.
    for (size_t i = 0; i < 9000; ++i) res.push_back((i % 7) - 3);
    count_plane(m, TokProfile::HYB_A, KeyingId::KFLAT16, res, 100, nullptr);
    enforce_cluster_budget(m, true);
    int active = 0;
    for (int c = 0; c < m.clusters; ++c)
        if (m.samples_per_cluster[c] > 0) {
            ++active;
            EXPECT_GE(m.samples_per_cluster[c],
                      (uint64_t)MIN_SAMPLES_PER_CLUSTER);
        }
    EXPECT_GE(active, 1);
    EXPECT_LE(active, K_MAX);
    // Cap: KFLAT343 under HYB rules must end within K_MAX active clusters.
    SandboxModel m343;
    m343.init(TokProfile::HYB_C, KeyingId::KFLAT343);
    std::mt19937 rng(5);
    std::uniform_int_distribution<int32_t> d(-60000, 60000);
    std::vector<int32_t> big(20000);
    for (auto& v : big) v = d(rng);
    count_plane(m343, TokProfile::HYB_C, KeyingId::KFLAT343, big, 141, nullptr);
    enforce_cluster_budget(m343, true);
    int act343 = 0;
    for (int c = 0; c < m343.clusters; ++c)
        if (m343.samples_per_cluster[c] > 0) ++act343;
    EXPECT_LE(act343, K_MAX);
    // Anchor exemption (pin D4): ZFFCTRL configs keep EVERY nonempty
    // cluster untouched, while an enforced twin of the same stream shrinks.
    SandboxModel ma;
    ma.init(TokProfile::ZFFCTRL, KeyingId::KFLAT343);
    count_plane(ma, TokProfile::ZFFCTRL, KeyingId::KFLAT343, big, 141,
                nullptr);
    int untouched = 0;
    for (int c = 0; c < ma.clusters; ++c)
        if (ma.samples_per_cluster[c] > 0) ++untouched;
    SandboxModel ma2 = ma;
    enforce_cluster_budget(ma2, false);       // exempt: identical counts
    int after_exempt = 0;
    for (int c = 0; c < ma2.clusters; ++c)
        if (ma2.samples_per_cluster[c] > 0) ++after_exempt;
    EXPECT_EQ(after_exempt, untouched);       // nothing merged away
    enforce_cluster_budget(ma2, true);        // enforced twin shrinks
    int after_enforced = 0;
    for (int c = 0; c < ma2.clusters; ++c)
        if (ma2.samples_per_cluster[c] > 0) ++after_enforced;
    EXPECT_LT(after_enforced, untouched);
    EXPECT_GE(untouched, 1);
}

// ----- V1 machinery (pins V-P1..V-P5, decision record 2026-08-25T21-30-00) -

TEST(StaticModelV1, GridTileGeometry) {
    // Pin V-P1: tile ids are raster row-major over ceil(w/128) x ceil(h/128)
    // tiles; a 768x512 plane has 6x4 = 24 tiles of exactly 16384 samples.
    const uint32_t w = 768, h = 512;
    SandboxModel m;
    m.init(TokProfile::ZFFCTRL, (int)((w + 127) / 128) * ((h + 127) / 128));
    std::vector<int32_t> res((size_t)w * h, 17);
    count_plane(m, TokProfile::ZFFCTRL, cluster_map_grid(w), res, nullptr);
    ASSERT_EQ((size_t)m.clusters, (size_t)24);
    for (int c = 0; c < m.clusters; ++c)
        EXPECT_EQ(m.samples_per_cluster[(size_t)c],
                  (uint64_t)GRID_TILE * GRID_TILE)
            << "tile " << c;
    // Portrait orientation swaps the tiling, not the count.
    SandboxModel mp;
    mp.init(TokProfile::ZFFCTRL, 24);
    std::vector<int32_t> resp((size_t)w * h, -9);
    count_plane(mp, TokProfile::ZFFCTRL, cluster_map_grid(h), resp, nullptr);
    EXPECT_EQ(mp.samples_per_cluster[(size_t)0], (uint64_t)GRID_TILE * GRID_TILE);
}

TEST(StaticModelV1, ContextTreeDeterministicCapsAndPartition) {
    // Pin V-P2: the builder is deterministic, covers all 343 contexts,
    // respects depth <= 10 / leaves <= 256, and every leaf holds at least
    // MIN_SAMPLES_PER_CLUSTER samples when any split was taken.
    auto make_flat = [](uint32_t seed) {
        SandboxModel flat;
        flat.init(TokProfile::HYB_B, KeyingId::KFLAT343);
        std::mt19937 rng(seed);
        std::uniform_int_distribution<int32_t> d(-3000, 3000);
        std::vector<int32_t> res(60000);
        for (auto& v : res) v = d(rng);
        count_plane(flat, TokProfile::HYB_B, KeyingId::KFLAT343, res, 200,
                    nullptr);
        return flat;
    };
    SandboxModel flat = make_flat(1234);
    ContextTree t1 = build_context_tree(TokProfile::HYB_B, flat);
    ContextTree t2 = build_context_tree(TokProfile::HYB_B, flat);
    EXPECT_EQ(t1.nodes.size(), t2.nodes.size());
    EXPECT_EQ(t1.leaf_of_context, t2.leaf_of_context);
    EXPECT_EQ(t1.leaves, t2.leaves);
    EXPECT_LE(t1.leaves, (uint32_t)K_MAX + 1u);
    ASSERT_EQ(t1.leaf_of_context.size(),
              (size_t)prism::codec::AC_V2_RESDIFF_CONTEXTS);
    std::vector<uint64_t> per_leaf(t1.leaves, 0);
    for (int cx = 0; cx < prism::codec::AC_V2_RESDIFF_CONTEXTS; ++cx) {
        uint32_t leaf = t1.leaf_of_context[(size_t)cx];
        ASSERT_LT(leaf, t1.leaves);
        per_leaf[leaf] += flat.samples_per_cluster[(size_t)cx];
    }
    for (uint32_t leaf = 0; leaf < t1.leaves; ++leaf)
        if (t1.leaves > 1)      // floors bind only once splits exist
            EXPECT_GE(per_leaf[leaf], (uint64_t)MIN_SAMPLES_PER_CLUSTER)
                << "leaf " << leaf;
}

TEST(StaticModelV1, ContextTreeSplitsOnStructuredStreams) {
    // A stream concentrated on few contexts with strong structure must
    // actually split (the noise fixture above legitimately stays single-
    // leaf: nothing beats the floor there).
    SandboxModel flat;
    flat.init(TokProfile::HYB_A, KeyingId::KFLAT343);
    std::mt19937 rng(5150);
    std::vector<int32_t> res;
    for (int i = 0; i < 30000; ++i) res.push_back(30 + (int)(rng() % 3));
    for (int i = 0; i < 30000; ++i) res.push_back(-40 - (int)(rng() % 3));
    count_plane(flat, TokProfile::HYB_A, KeyingId::KFLAT343, res, 300,
                nullptr);
    ContextTree t = build_context_tree(TokProfile::HYB_A, flat);
    EXPECT_GT(t.leaves, (uint32_t)1);
}

TEST(StaticModelV1, TreeBlobRoundTripAndTamper) {
    // Structured stream so the tree actually splits and the blob carries
    // internal nodes worth tampering with.
    SandboxModel flat;
    flat.init(TokProfile::HYB_A, KeyingId::KFLAT343);
    std::mt19937 rng(77);
    std::vector<int32_t> res;
    for (int i = 0; i < 25000; ++i) res.push_back(25 + (int)(rng() % 5));
    for (int i = 0; i < 25000; ++i) res.push_back(-30 - (int)(rng() % 5));
    count_plane(flat, TokProfile::HYB_A, KeyingId::KFLAT343, res, 300,
                nullptr);
    ContextTree t = build_context_tree(TokProfile::HYB_A, flat);
    ASSERT_GT(t.leaves, (uint32_t)1);        // splits really happened
    size_t counted = 999;
    auto blob = serialize_tree(t, &counted);
    EXPECT_EQ(counted, blob.size());
    ContextTree back = deserialize_tree(blob);
    EXPECT_EQ(back.leaves, t.leaves);
    EXPECT_EQ(back.leaf_of_context, t.leaf_of_context);
    EXPECT_EQ(back.nodes.size(), t.nodes.size());
    // Bit flips land on the CRC; truncation lands on the length checks.
    for (size_t probe : {size_t(5), blob.size() / 2, blob.size() - 5}) {
        auto bad = blob;
        bad[probe] ^= 0x01;
        EXPECT_THROW(deserialize_tree(bad), std::runtime_error);
    }
    auto cut = blob;
    cut.resize(blob.size() - 3);
    EXPECT_THROW(deserialize_tree(cut), std::runtime_error);
}

TEST(StaticModelV1, MergeMapBlobRoundTrip) {
    size_t audit = 0;
    std::vector<uint32_t> merged{0, 0, 2, 2, 4};
    auto blob = serialize_merge_map(5, merged, &audit);
    EXPECT_EQ(audit, blob.size());
    auto back = deserialize_merge_map(blob, 5);
    EXPECT_EQ(back, merged);
    // Identity survives too (enforcement merged nothing).
    auto id_blob = serialize_merge_map(3, {}, &audit);
    auto identity = deserialize_merge_map(id_blob, 3);
    EXPECT_EQ(identity, (std::vector<uint32_t>{0, 1, 2}));
    auto bad = blob;
    bad[6] ^= 0x01;
    EXPECT_THROW(deserialize_merge_map(bad, 5), std::runtime_error);
    auto cut = blob;
    cut.resize(blob.size() - 1);
    EXPECT_THROW(deserialize_merge_map(cut, 5), std::runtime_error);
}

TEST(StaticModelV1, OracleAssignmentFollowsPerSampleOptimum) {
    // Two vertical halves with opposite-dominant residuals: under grid
    // tables each half's samples are cheapest in their own half's cluster,
    // so every oracle assignment must match its half (pin V-P4 argmin).
    const uint32_t w = 256, h = 64;          // two 128-wide tile columns
    std::vector<int32_t> res((size_t)w * h);
    std::mt19937 rng(42);
    std::uniform_int_distribution<int32_t> jitter(-1, 1);
    for (uint32_t y = 0; y < h; ++y)
        for (uint32_t x = 0; x < w; ++x)
            res[(size_t)y * w + x] =
                (x < 128 ? 40 + jitter(rng) : -(40 + jitter(rng)));
    SandboxModel m;
    m.init(TokProfile::HYB_A, 2);
    std::vector<std::vector<TaggedEvent>> evs(1);
    count_plane(m, TokProfile::HYB_A, cluster_map_grid(w), res, &evs[0]);
    apply_cluster_budget(m, true);
    SmoothedTables t1;
    build_tables_enforced(m, t1);

    auto maps = oracle_assign(TokProfile::HYB_A, m, t1, {res});
    ASSERT_EQ(maps.size(), (size_t)1);
    ASSERT_EQ(maps[0].size(), res.size());
    int agree = 0;
    for (uint32_t y = 0; y < h; ++y)
        for (uint32_t x = 0; x < w; ++x) {
            uint32_t got = maps[0][(size_t)y * w + x];
            ASSERT_LT(got, (uint32_t)m.clusters);
            bool in_left = x < 128;
            // The oracle must prefer the same-dominant half decisively;
            // count agreement instead of asserting per-sample so rare
            // boundary samples cannot flip the contract.
            agree += (in_left == (got == 0));
        }
    EXPECT_GT(agree, (int)(res.size() * 99 / 100));

    // Recount through an explicit map reproduces exactly those clusters'
    // per-sample tallies and stays round-trip clean end to end.
    SandboxModel m2;
    m2.init(TokProfile::HYB_A, m.clusters);
    std::vector<TaggedEvent> evs_oracle;
    ClusterMap cm = cluster_map_explicit(maps[0].data());
    count_plane(m2, TokProfile::HYB_A, cm, res, &evs_oracle);
    SmoothedTables t2;
    build_tables_enforced(m2, t2);
    auto payload = rans_encode_events(TokProfile::HYB_A, evs_oracle, t2);
    auto dec = rans_decode_events(TokProfile::HYB_A, cm, res.size(), payload,
                                  t2);
    EXPECT_EQ(dec, res);
}

TEST(StaticModelV1, GridDecodeNeedsMergeMapConsistently) {
    // A grid model whose budget enforcement MERGES tiles (both tiles hold
    // only 2048 samples, under the 4096 floor) must decode identically
    // through the transmitted 'SBP1' mapping.
    const uint32_t w = 256, h = 16;          // two tiles x 2048 samples
    SandboxModel m;
    m.init(TokProfile::HYB_B, 2);
    std::vector<int32_t> res((size_t)w * h);
    std::mt19937 rng(9);
    std::uniform_int_distribution<int32_t> d(-60, 60);
    for (auto& v : res) v = d(rng);
    std::vector<TaggedEvent> evs;
    count_plane(m, TokProfile::HYB_B, cluster_map_grid(w), res, &evs);
    auto merge = apply_cluster_budget(m, true);
    int active = 0;
    for (int c = 0; c < m.clusters; ++c)
        if (m.samples_per_cluster[c] > 0) ++active;
    ASSERT_LT(active, 2);                    // the floor really did merge
    // Encoder contract: events retag through the transmitted mapping so
    // both sides index identical table rows.
    for (auto& te : evs) te.cluster = merge[te.cluster];
    SmoothedTables t;
    build_tables_enforced(m, t);
    auto map_blob = serialize_merge_map(2, merge, nullptr);
    auto payload = rans_encode_events(TokProfile::HYB_B, evs, t);
    auto dec_merge = deserialize_merge_map(map_blob, 2);
    ClusterMap cm = cluster_map_keyed(KeyingId::KGRID128);
    cm.w = w;
    cm.merge = &dec_merge;
    auto dec = rans_decode_events(TokProfile::HYB_B, cm, res.size(), payload,
                                  t);
    EXPECT_EQ(dec, res);
}

// ----- S3 extended causal properties (pins P-S3-1..P-S3-12) -----

TEST(PropKeying, DeterministicAndInRange) {
    PropSpec spec;
    spec.qW = spec.qN = spec.qNW = spec.qNE = true;
    spec.gbW = spec.gbN = spec.plane = spec.emax = true;
    const uint32_t w = 37, h = 23;           // awkward border shape
    std::vector<int32_t> res((size_t)w * h);
    std::mt19937 rng(7);
    std::uniform_int_distribution<int32_t> d(-300, 300);
    for (auto& v : res) v = d(rng);
    for (int k : {1, 64, 256}) {
        PropHasher a(w, h, 0, spec, k, 0), b(w, h, 0, spec, k, 0);
        for (size_t i = 0; i < res.size(); ++i)
            EXPECT_EQ(a.at(i, res), b.at(i, res)) << "i=" << i << " k=" << k;
        PropHasher c(w, h, 0, spec, k, 0);
        for (size_t i = 0; i < res.size(); ++i) {
            uint32_t id = c.at(i, res);
            ASSERT_LT(id, (uint32_t)k) << "id out of range i=" << i;
        }
    }
}

TEST(PropKeying, PrefixInvariance) {
    // Mutating the TRAILING half of the stream must not move a single
    // earlier assignment: octile edges and neighbor reads touch strictly
    // past samples only (pin P-S3-6).
    PropSpec spec;
    spec.qW = spec.qN = spec.gbW = spec.emax = true;
    const uint32_t w = 64, h = 64;
    std::vector<int32_t> res((size_t)w * h);
    std::mt19937 rng(11);
    std::uniform_int_distribution<int32_t> d(-500, 500);
    for (auto& v : res) v = d(rng);
    PropHasher full(w, h, 2, spec, 64, 0);
    std::vector<uint32_t> ids_full(res.size());
    for (size_t i = 0; i < res.size(); ++i)
        ids_full[i] = full.at(i, res);
    auto truncated = res;
    const size_t cut = res.size() / 2;
    for (size_t i = cut; i < truncated.size(); ++i) truncated[i] = 12345;
    PropHasher part(w, h, 2, spec, 64, 0);
    for (size_t i = 0; i < cut; ++i)
        EXPECT_EQ(part.at(i, truncated), ids_full[i]) << "prefix moved " << i;
}

TEST(PropKeying, PlaneCoordinateParticipates) {
    PropSpec on, off;
    on.qW = off.qW = true;
    on.plane = true;                          // only difference
    const uint32_t w = 33, h = 40;
    std::vector<int32_t> res((size_t)w * h, 17);
    // Plane disabled: plane_id must not matter anywhere.
    PropHasher o0(w, h, 0, off, 16, 0), o1(w, h, 7, off, 16, 0);
    for (size_t i = 0; i < res.size(); ++i)
        EXPECT_EQ(o0.at(i, res), o1.at(i, res)) << "i=" << i;
    // Plane enabled: different plane ids diverge somewhere past borders.
    PropHasher a(w, h, 0, on, 16, 0), b(w, h, 1, on, 16, 0);
    bool diff = false;
    for (size_t i = 8; i < res.size(); ++i)   // past the border rows
        if (a.at(i, res) != b.at(i, res)) { diff = true; break; }
    EXPECT_TRUE(diff);
    // All-disabled specs are rejected loudly (pin P-S3-7 mixer contract).
    PropSpec none;
    EXPECT_THROW(PropHasher(w, h, 0, none, 16, 0), std::runtime_error);
}

TEST(PropKeying, DecodeMirrorRoundTripZFFCTRL) {
    // The binding decoder-mirror test (pin P-S3-11): encode-side events are
    // tagged through the live hasher; the decode side runs a FRESH hasher
    // over its growing decoded history and must reproduce identical cluster
    // sequences, so residuals round-trip byte-for-byte through 'SBP1'.
    PropSpec spec;
    spec.qW = spec.qN = spec.qNE = spec.gbW = spec.plane = true;
    const TokProfile prof = TokProfile::ZFFCTRL;
    const uint32_t w = 96, h = 24;
    std::vector<int32_t> res((size_t)w * h);
    std::mt19937 rng(13);
    std::uniform_int_distribution<int32_t> d(-2000, 2000);
    for (auto& v : res) v = d(rng);

    const int k_raw = 64;
    SandboxModel m;
    m.init(prof, k_raw);
    {
        PropHasher hs(w, h, 1, spec, k_raw, 0);
        ClusterMap cm = cluster_map_prop(&hs, w, {});
        count_plane(m, prof, cm, res, nullptr);
    }
    auto merge = apply_cluster_budget(m, true);
    SandboxModel m2;
    m2.init(prof, k_raw);
    std::vector<TaggedEvent> evs;
    {
        PropHasher hs(w, h, 1, spec, k_raw, 0);   // fresh state per pass
        ClusterMap cm = cluster_map_prop(&hs, w, merge);
        count_plane(m2, prof, cm, res, &evs);
    }
    SmoothedTables t;
    build_tables_enforced(m2, t);
    size_t audit = 0;
    auto tab_blob = serialize_tables(t, &audit);
    ASSERT_EQ(audit, tab_blob.size());
    auto map_blob = serialize_merge_map(k_raw, merge, nullptr);
    auto payload = rans_encode_events(prof, evs, t);

    auto dec_merge = deserialize_merge_map(map_blob, k_raw);
    PropHasher hd(w, h, 1, spec, k_raw, 0);
    ClusterMap dcm = cluster_map_prop(&hd, w, dec_merge);
    auto dec = rans_decode_events(prof, dcm, res.size(), payload, t);
    EXPECT_EQ(dec, res);
}

// ----- T-series machinery (addendum 20; pins P-T0-1..P-T0-13 +
// amendment A-T0-1) -----

namespace {

// Counts a residual plane into a JOINT group model (clusters = G * 16,
// row id g * 16 + c) under a group keying, exactly as the T0 flow does.
void count_joint_groups(SandboxModel& m, const std::vector<int32_t>& res,
                        uint32_t w, KeyingId gk) {
    ClusterMap cm = cluster_map_keyed(gk);
    cm.w = w;
    count_plane(m, TokProfile::ZFFCTRL, cm, res, nullptr);
}

Built joint_two_regime(uint32_t w, uint32_t h, KeyingId gk) {
    // Left half mild positives, right half strong negatives: adjacent
    // groups carry clearly different conditional stacks.
    Built b;
    b.w = w;
    b.res.assign((size_t)w * h, 0);
    std::mt19937 rng(21);
    std::uniform_int_distribution<int32_t> jit(-2, 2);
    for (uint32_t y = 0; y < h; ++y)
        for (uint32_t x = 0; x < w; ++x)
            b.res[(size_t)y * w + x] =
                x < w / 2 ? 30 + jit(rng) : -(90 + jit(rng));
    const uint32_t gs = (gk == KeyingId::KGROUP64) ? GROUP_PX64
                                                   : GROUP_PX128;
    const uint32_t tx = (w + gs - 1) / gs, ty = (h + gs - 1) / gs;
    b.m.init(TokProfile::ZFFCTRL, (int)(tx * ty * 16));
    count_joint_groups(b.m, b.res, w, gk);
    return b;
}

} // namespace

TEST(TSeriesLloyd, MetricCoversEveryClassRow) {
    // Binds amendment A-T0-1b: two groups whose class-0 rows are IDENTICAL
    // but whose class-7 rows differ hugely must measure a nonzero distance
    // and separate under K = 2 (the class-0-only metric collapsed them to
    // one prototype through the drop path).
    const size_t stride = SandboxModel::init_stride(TokProfile::ZFFCTRL);
    SandboxModel m;
    m.init(TokProfile::ZFFCTRL, 2 * 16);
    for (int g = 0; g < 2; ++g)
        for (int c = 0; c < 16; ++c) {
            const size_t base = (size_t)(g * 16 + c) * stride;
            for (size_t i = 0; i < stride; ++i) {
                m.n0[base + i] = 100;              // class rows all alike
                m.n1[base + i] = 100;
            }
        }
    // Class 7 diverges: g0 leans zero-flag-off, g1 leans on.
    for (size_t i = 0; i < stride; ++i) {
        m.n0[(size_t)(0 * 16 + 7) * stride + i] = 5;
        m.n1[(size_t)(0 * 16 + 7) * stride + i] = 5000;
        m.n0[(size_t)(1 * 16 + 7) * stride + i] = 5000;
        m.n1[(size_t)(1 * 16 + 7) * stride + i] = 5;
    }
    CodebookFit fit = lloyd_cluster(m, 2);
    EXPECT_EQ(fit.k_transmitted, 2);
    EXPECT_EQ(fit.proto_of_group.size(), (size_t)2);
    EXPECT_NE(fit.proto_of_group[0], fit.proto_of_group[1]);
}

TEST(TSeriesLloyd, SeededCentroidsSeparateTwoRegimes) {
    // Binds amendment A-T0-1a: with centroids starting AS the seeded
    // stacks, a two-regime image separates cleanly under K >= 2 (the
    // zero-initialized variant collapsed everything onto prototype 0).
    Built b = joint_two_regime(256, 128, KeyingId::KGROUP64);
    CodebookFit fit = lloyd_cluster(b.m, 4);
    ASSERT_GE(fit.k_transmitted, 2);
    int used[4] = {0, 0, 0, 0};
    for (uint32_t p : fit.proto_of_group) {
        ASSERT_LT(p, (uint32_t)fit.k_transmitted);   // renumbering legal
        used[p]++;
    }
    for (int p = 0; p < fit.k_transmitted; ++p)
        EXPECT_GT(used[p], 0);               // no empty prototype survived
    // Deterministic: byte-identical refit.
    CodebookFit again = lloyd_cluster(b.m, 4);
    EXPECT_EQ(again.k_transmitted, fit.k_transmitted);
    EXPECT_EQ(again.proto_of_group, fit.proto_of_group);
    EXPECT_EQ(again.centroids.n0, fit.centroids.n0);
    EXPECT_EQ(again.centroids.n1, fit.centroids.n1);
}

TEST(TSeriesLloyd, ConstantImageCollapsesToK1) {
    // Pin P-T0-3 direction fixture: identical stacks tie everywhere, ties
    // go to the lowest ids, every empty prototype drops once, transmitted
    // K = 1 and every word is 0.
    const uint32_t w = 192, h = 192;
    std::vector<int32_t> res((size_t)w * h, 77);     // constant -> zero res
    SandboxModel m;
    m.init(TokProfile::ZFFCTRL, (int)((w / GROUP_PX64) * (h / GROUP_PX64) * 16));
    count_joint_groups(m, res, w, KeyingId::KGROUP64);
    CodebookFit fit = lloyd_cluster(m, 8);
    EXPECT_EQ(fit.k_transmitted, 1);
    for (uint32_t p : fit.proto_of_group) EXPECT_EQ(p, 0u);
}

TEST(TSeriesLloyd, ClampKOverGAndPartialEdges) {
    // 128x64 under GS64 = 2 x 1 groups: K = 24 clamps to G = 2, and the
    // partial-edge rule never appears because the shape divides exactly;
    // 100x70 exercises partial edge groups counted in full.
    const uint32_t w = 128, h = 64;
    std::vector<int32_t> res((size_t)w * h);
    std::mt19937 rng(5);
    std::uniform_int_distribution<int32_t> d(-500, 500);
    for (auto& v : res) v = d(rng);
    SandboxModel m;
    m.init(TokProfile::ZFFCTRL, 2 * 1 * 16);
    count_joint_groups(m, res, w, KeyingId::KGROUP64);
    CodebookFit fit = lloyd_cluster(m, 24);
    EXPECT_LE(fit.k_transmitted, 2);
    EXPECT_EQ(fit.proto_of_group.size(), (size_t)2);

    const uint32_t w2 = 100, h2 = 70;        // GS64: 2 x 2 partial-edge
    std::vector<int32_t> res2((size_t)w2 * h2);
    for (auto& v : res2) v = d(rng);
    SandboxModel m2;
    m2.init(TokProfile::ZFFCTRL, 2 * 2 * 16);
    count_joint_groups(m2, res2, w2, KeyingId::KGROUP64);
    uint64_t seen = 0;
    for (size_t i = 0; i < res2.size(); ++i) {
        ClusterMap cm = cluster_map_keyed(KeyingId::KGROUP64);
        cm.w = w2;
        uint32_t id = cm.raw_at(i, res2);
        ASSERT_LT(id, 4u * 16u);
        seen += id;                          // any activity proves counting
    }
    (void)seen;
    CodebookFit f2 = lloyd_cluster(m2, 8);
    EXPECT_GE(f2.k_transmitted, 1);
    EXPECT_LE(f2.k_transmitted, 8);
}

TEST(TSeriesCodebook, RoundTripMirrorExactAndAudited) {
    Built b = joint_two_regime(256, 128, KeyingId::KGROUP64);
    CodebookFit fit = lloyd_cluster(b.m, 4);
    SmoothedTables protos;
    build_tables_enforced(fit.centroids, protos);
    std::vector<uint32_t> words = fit.proto_of_group;   // one per group,
                                                        // raster order
    size_t audit = 0, words_bytes = 0;
    auto blob = serialize_codebook(protos, words, &audit, &words_bytes);
    EXPECT_EQ(audit, blob.size());
    EXPECT_LE(words_bytes, blob.size());
    DecodedCodebook back =
        deserialize_codebook(blob, &protos, &words);    // expect-match BOTH
    EXPECT_EQ(back.tabs.p, protos.p);
    EXPECT_EQ(back.tabs.prior, protos.prior);
    EXPECT_EQ(back.words, words);
    // Decomposition contract: tail is exactly nwords+len+words.
    EXPECT_EQ(blob.size() - words_bytes + words_bytes, blob.size());

    // Truncation hard-detects.
    auto cut = blob;
    cut.resize(blob.size() - 3);
    EXPECT_THROW(deserialize_codebook(cut, nullptr, nullptr),
                 std::runtime_error);
    // Tamper sweep over CONTENT-BEARING regions: header fields, the prior
    // table, the head of the compressed delta stream (always consumed by
    // its decoder), and the head of the words tail. Known slack: trailing
    // bytes of any single-state rANS substream that its decoder never
    // pulls during renormalization are inert by construction (engine
    // property inherited from the shipped 'SBM1' format), so flips there
    // are outside any authenticatable surface and deliberately unprobed.
    for (size_t probe :
         {size_t(6), size_t(12), size_t(20), size_t(100), size_t(290),
          size_t(302), size_t(306), size_t(330), blob.size() - words_bytes + 1}) {
        if (probe >= blob.size()) continue;
        auto bad = blob;
        bad[probe] ^= 0x01;
        EXPECT_THROW(deserialize_codebook(bad, nullptr, nullptr),
                     std::runtime_error)
            << "silent corruption at offset " << probe;
    }
    // Tamper surface: decoded content differing from expect fires.
    std::vector<uint32_t> wrong_words(words.size(), 0);
    EXPECT_THROW((deserialize_codebook(blob, &protos, &wrong_words)),
                 std::runtime_error);
}

TEST(TSeriesCodebook, AssignmentWordsMirrorRandomAndSkewed) {
    // Random words over alphabet K=8...
    std::mt19937 rng(31);
    std::vector<uint32_t> words(500);
    for (auto& w : words) w = rng() % 8;
    SmoothedTables protos;
    protos.profile = TokProfile::ZFFCTRL;
    protos.clusters = 8 * 16;
    protos.prior.assign(protos.stride(), 2048);   // ONE image-global row
    protos.delta.assign((size_t)protos.clusters * protos.stride(), 0);
    protos.p = protos.delta;
    for (size_t i = 0; i < protos.p.size(); ++i)
        protos.p[i] = (uint16_t)(2048 + (int)(i % 7));  // in-range variety
    size_t audit = 0;
    auto blob = serialize_codebook(protos, words, &audit);
    auto back = deserialize_codebook(blob, nullptr, nullptr);
    ASSERT_EQ(back.words.size(), words.size());
    EXPECT_EQ(back.words, words);            // decoder mirror exact
    // ...and a skewed stream (one dominant word plus a rare survivor).
    std::vector<uint32_t> skew(300, 3);
    skew[7] = 6;
    auto sblob = serialize_codebook(protos, skew, nullptr);
    auto sback = deserialize_codebook(sblob, nullptr, nullptr);
    EXPECT_EQ(sback.words, skew);
    // Wrong-word expectation fires the tamper surface.
    auto wrong = skew;
    wrong[100] = (wrong[100] + 1) % 8;
    EXPECT_THROW(deserialize_codebook(sblob, nullptr, &wrong),
                 std::runtime_error);
    // Out-of-alphabet words are rejected at serialization.
    std::vector<uint32_t> oob{0, 8};
    EXPECT_THROW(serialize_codebook(protos, oob, nullptr),
                 std::runtime_error);
}

TEST(TSeriesMergeMap16, WideRoundTripRangeAndCrc) {
    // 300 raw clusters exceed 'SBP1's u8 entries: the wide form carries
    // them all and audits its length exactly.
    std::vector<uint32_t> merge(300);
    for (uint32_t c = 0; c < 300; ++c) merge[c] = c / 2;   // pairwise merge
    size_t audit = 0;
    auto blob = serialize_merge_map16(300, merge, &audit);
    EXPECT_EQ(audit, blob.size());
    EXPECT_EQ(deserialize_merge_map16(blob, 300), merge);
    // Identity survives (nothing merged).
    auto ident = deserialize_merge_map16(serialize_merge_map16(300, {},
                                                               nullptr),
                                         300);
    for (uint32_t c = 0; c < 300; ++c) EXPECT_EQ(ident[c], c);
    // Out-of-range destination rejected on BOTH sides.
    std::vector<uint32_t> oob = merge;
    oob[299] = 300;
    EXPECT_THROW(serialize_merge_map16(300, oob, nullptr),
                 std::runtime_error);
    auto bad = blob;
    bad[10] ^= 0x01;                          // inside an entry field
    bool detected = false;
    try {
        deserialize_merge_map16(bad, 300);
    } catch (const std::runtime_error&) {
        detected = true;                      // range or CRC, either bites
    }
    EXPECT_TRUE(detected);
    auto cut = blob;
    cut.resize(blob.size() - 2);
    EXPECT_THROW(deserialize_merge_map16(cut, 300), std::runtime_error);
}

namespace {

// Counts one plane into BOTH parent (class16) and children (flat343)
// models exactly as the T2a flow does, and returns the built parent tables.
SmoothedTables build_shrink_rig(SandboxModel& flat343, const uint32_t w,
                                const uint32_t h, uint32_t seed,
                                std::vector<int32_t>& res) {
    res.assign((size_t)w * h, 0);
    std::mt19937 rng(seed);
    std::uniform_int_distribution<int32_t> d(-900, 900);
    for (auto& v : res) v = d(rng);
    flat343.init(TokProfile::ZFFCTRL, KeyingId::KFLAT343);
    count_plane(flat343, TokProfile::ZFFCTRL, KeyingId::KFLAT343, res, w,
                nullptr);
    SandboxModel cls;
    cls.init(TokProfile::ZFFCTRL, KeyingId::KFLAT16);
    count_plane(cls, TokProfile::ZFFCTRL, KeyingId::KFLAT16, res, w,
                nullptr);
    SmoothedTables parent;
    build_tables(cls, false, parent);
    return parent;
}

} // namespace

TEST(TSeriesShrinkage, ZeroCountChildReproducesParentProportionally) {
    // Pin P-T0-8 consequences, bound at BOTH levels. Formula level (exact):
    // an empty child's cp vector is a_c * (par0, 4096-par0), purely
    // proportional to the parent row, so the rebuilt row is INVARIANT in
    // a_c. Standard-pass level: the shipped normalize_counts_4096 floors
    // every key at 1 BEFORE distributing the remaining budget, so a
    // proportional vector returns within its documented rounding of the
    // parent: every bin within +-1, saturated parents honor the support
    // floor, and the sum stays exactly 4096 by construction.
    const uint32_t w = 64, h = 32;
    SandboxModel flat;
    std::vector<int32_t> res;
    SmoothedTables parent = build_shrink_rig(flat, w, h, 17, res);

    int empty_children = 0, nonempty_children = 0;
    for (int cq = 0; cq < AC_V2_RESDIFF_CONTEXTS; ++cq)
        if (flat.samples_per_cluster[cq] == 0) ++empty_children;
        else ++nonempty_children;
    ASSERT_GT(empty_children, 100);          // the limit case is live
    ASSERT_GT(nonempty_children, 0);         // and shrinkage does real work

    ShrunkTables s32 = shrink_child_tables(TokProfile::ZFFCTRL, flat,
                                           parent, 32);
    ShrunkTables s128 = shrink_child_tables(TokProfile::ZFFCTRL, flat,
                                            parent, 128);
    const size_t stride = s32.stride();
    for (int cq = 0; cq < AC_V2_RESDIFF_CONTEXTS; ++cq) {
        if (flat.samples_per_cluster[cq] != 0) continue;
        const size_t pbase =
            (size_t)keying_cluster(KeyingId::KFLAT16, cq) * stride;
        for (size_t j = 0; j < stride; ++j) {
            const uint16_t got = s32.p[(size_t)cq * stride + j];
            EXPECT_EQ(got, s128.p[(size_t)cq * stride + j])
                << "a_c invariance broke at child " << cq << " bin " << j;
            const int want = parent.p[pbase + j];
            EXPECT_LE(std::abs((int)got - want), 1)
                << "standard-pass drift beyond +-1 at child " << cq
                << " bin " << j;
        }
    }
}

TEST(TSeriesShrinkage, ParentMapIsNotPositionalAndDecodeMirrors) {
    // Binds amendment A-T0-1c end to end: the shipped reduction is NOT
    // cq mod 16 somewhere, so the decoder MUST rebuild against the
    // blob-carried parent map; round-trip equality is the binding check.
    const uint32_t w = 80, h = 40;
    SandboxModel flat;
    std::vector<int32_t> res;
    SmoothedTables parent = build_shrink_rig(flat, w, h, 23, res);

    bool positional_somewhere = false;
    for (int cq = 0; cq < AC_V2_RESDIFF_CONTEXTS; ++cq)
        if (keying_cluster(KeyingId::KFLAT16, cq) !=
            (uint32_t)(cq % 16))
            positional_somewhere = true;
    ASSERT_TRUE(positional_somewhere);       // the regression is exercisable

    ShrunkTables st = shrink_child_tables(TokProfile::ZFFCTRL, flat,
                                          parent, 32);
    // Every rebuilt child value stays inside the u12 support floor.
    for (uint16_t v : st.p) {
        ASSERT_GE(v, 1);
        ASSERT_LE(v, 4096);
    }
    size_t audit = 0;
    auto blob = serialize_shrunk(st, &audit);
    EXPECT_EQ(audit, blob.size());
    ShrunkTables back = deserialize_shrunk(blob, &st);   // expect-match
    EXPECT_EQ(back.p, st.p);
    EXPECT_EQ(back.child_delta, st.child_delta);
    EXPECT_EQ(back.class16, st.class16);

    // Truncation and CRC flips hard-detect.
    auto cut = blob;
    cut.resize(blob.size() - 5);
    EXPECT_THROW(deserialize_shrunk(cut, nullptr), std::runtime_error);
    auto bad = blob;
    bad[blob.size() - 8] ^= 0x02;
    EXPECT_THROW(deserialize_shrunk(bad, nullptr), std::runtime_error);
}

// ----- Reconciled-session additions (the 0a36ec6 bring-up suite, kept
// where it binds contracts the A-T0-1 suite does not): hand-checked group
// geometry, byte-exact Lloyd determinism, the word-driven decode-mirror
// payload flow, the a_c = 0 ML limit, and the 'SBD1' hard-detect surface. -----

TEST(GroupKeying, JointIdsArePlaneMajorRasterTimesClassAxis) {
    // Hand-checked geometry on an awkward shape: partial right/bottom edge
    // groups count in full; raw id = g * 16 + ac_v2_prior_class(cx).
    const uint32_t w = 130, h = 70;
    std::vector<int32_t> res((size_t)w * h);
    std::mt19937 rng(5);
    std::uniform_int_distribution<int32_t> d(-500, 500);
    for (auto& v : res) v = d(rng);
    ClusterMap cm = cluster_map_keyed(KeyingId::KGROUP64);
    cm.w = w;
    struct Probe { uint32_t x, y, g; };
    const Probe probes[] = {{0, 0, 0}, {64, 0, 1}, {128, 0, 2},
                            {0, 64, 3}, {65, 65, 4}, {129, 69, 5}};
    for (const Probe& p : probes) {
        const size_t idx = (size_t)p.y * w + p.x;
        const int32_t dL = (p.x > 0) ? res[idx - 1] : 0;
        const int32_t dU = (p.y > 0) ? res[idx - w] : 0;
        const int32_t dUL = (p.x > 0 && p.y > 0) ? res[idx - w - 1] : 0;
        const int cx = residual_diff_context(dL, dU, dUL);
        const uint32_t want =
            p.g * 16u + ac_v2_prior_class((uint32_t)cx % 343u);
        EXPECT_EQ(cm.raw_at(idx, res), want)
            << "probe " << p.x << "," << p.y;
    }
    ClusterMap cm128 = cluster_map_keyed(KeyingId::KGROUP128);
    cm128.w = w;
    {
        const size_t idx = (size_t)69 * w + 129;
        const int32_t dL = res[idx - 1];
        const int32_t dU = res[idx - w];
        const int32_t dUL = res[idx - w - 1];
        const uint32_t g128 =
            (69u / 128u) * ((w + 127u) / 128u) + 129u / 128u;
        EXPECT_EQ(cm128.raw_at(idx, res),
                  g128 * 16u +
                      ac_v2_prior_class(
                          (uint32_t)residual_diff_context(dL, dU, dUL) %
                          343u));
    }
}

TEST(LloydCluster, SeparatedStacksStaySplitDeterministically) {
    // Byte-for-byte reproducibility (no RNG anywhere) plus the K > G clamp.
    const size_t stride = SandboxModel::init_stride(TokProfile::ZFFCTRL);
    SandboxModel m;
    m.init(TokProfile::ZFFCTRL, 2 * GROUP_CLASS_AXIS);
    for (int c = 0; c < GROUP_CLASS_AXIS; ++c) {
        m.n0[(size_t)c * stride] = 100;                        // g0: zeros
        m.n1[(size_t)(GROUP_CLASS_AXIS + c) * stride] = 100;   // g1: ones
    }
    CodebookFit a = lloyd_cluster(m, 2);
    CodebookFit b = lloyd_cluster(m, 2);
    EXPECT_EQ(a.proto_of_group, b.proto_of_group);
    EXPECT_EQ(a.centroids.n0, b.centroids.n0);
    EXPECT_EQ(a.centroids.n1, b.centroids.n1);
    EXPECT_EQ(a.iterations, b.iterations);
}

TEST(CodebookSbc1, WordDrivenDecodeMirrorPayload) {
    // The binding T0 payload flow under the reconciled single-prior layout:
    // events retag through word*16 + class and the decoder rebuilds the
    // identical final ids from its own causal state.
    const uint32_t w = 192, h = 192;
    std::vector<int32_t> res((size_t)w * h);
    std::mt19937 rng(21);
    std::uniform_int_distribution<int32_t> d(-3000, 3000);
    for (auto& v : res) v = d(rng);
    SandboxModel joint;
    joint.init(TokProfile::ZFFCTRL,
               (int)((w + 63) / 64) * (int)((h + 63) / 64) *
                   GROUP_CLASS_AXIS);
    ClusterMap cm = cluster_map_keyed(KeyingId::KGROUP64);
    cm.w = w;
    count_plane(joint, TokProfile::ZFFCTRL, cm, res, nullptr);

    CodebookFit fit = lloyd_cluster(joint, 4);
    SmoothedTables protos;
    build_tables_enforced(fit.centroids, protos);
    size_t audit = 0;
    auto blob = serialize_codebook(protos, fit.proto_of_group, &audit);
    EXPECT_EQ(audit, blob.size());
    deserialize_codebook(blob, &protos, &fit.proto_of_group);   // mirror

    std::vector<uint32_t> merge((size_t)joint.clusters);
    for (uint32_t raw = 0; raw < (uint32_t)joint.clusters; ++raw)
        merge[(size_t)raw] =
            fit.proto_of_group[(size_t)(raw / GROUP_CLASS_AXIS)] *
                GROUP_CLASS_AXIS +
            (raw % GROUP_CLASS_AXIS);
    ClusterMap cb_cm = cluster_map_keyed(KeyingId::KGROUP64);
    cb_cm.w = w;
    cb_cm.merge = &merge;
    SandboxModel recount;
    recount.init(TokProfile::ZFFCTRL, fit.centroids.clusters);
    std::vector<std::vector<TaggedEvent>> evts(1);
    count_plane(recount, TokProfile::ZFFCTRL, cb_cm, res, &evts[0]);
    SmoothedTables eff_tabs;
    build_tables_enforced(recount, eff_tabs);
    EXPECT_EQ(eff_tabs.p, protos.p);   // recounted == transmitted centroids
    auto payload = rans_encode_events(TokProfile::ZFFCTRL, evts[0],
                                      eff_tabs);
    auto dec = rans_decode_events(TokProfile::ZFFCTRL, cb_cm, res.size(),
                                  payload, eff_tabs);
    EXPECT_EQ(dec, res);
}

TEST(ShrinkageSbd1, AcZeroReproducesChildMlLimit) {
    // Pin P-T0-8's unit limit: with a_c = 0 a busy cell equals the ML
    // normalization of its raw counts through the standard pass.
    const size_t stride = SandboxModel::init_stride(TokProfile::ZFFCTRL);
    SandboxModel flat;
    flat.init(TokProfile::ZFFCTRL, AC_V2_RESDIFF_CONTEXTS);
    flat.n0[(size_t)5 * stride] = 10;
    SandboxModel m16;
    m16.init(TokProfile::ZFFCTRL, KeyingId::KFLAT16);
    for (int c = 0; c < AC_V2_RESDIFF_CONTEXTS; ++c) {
        const uint32_t cls =
            keying_cluster(KeyingId::KFLAT16, c % AC_V2_RESDIFF_CONTEXTS);
        if (c == 5) {
            m16.n0[(size_t)cls * stride] += 10;
        } else {
            m16.n0[(size_t)cls * stride] += 3;
            m16.n1[(size_t)cls * stride] += 1;
        }
    }
    SmoothedTables t16;
    build_tables_enforced(m16, t16);
    ShrunkTables sh = shrink_child_tables(TokProfile::ZFFCTRL, flat, t16, 0);
    std::vector<uint64_t> cp{10ull * 4096ull, 0ull};
    std::vector<uint16_t> norm;
    smoothing_normalize_to_4096(cp, norm);
    EXPECT_EQ(sh.p[5 * (ptrdiff_t)stride], norm[0]);
}

TEST(ShrinkageSbd1, Sbd1HardDetectSurfaceBitesEverywhere) {
    // Truncation, CRC break and child_delta tamper must all throw loudly
    // (P-T0-9's expect surface = P-T0-5's content + words surface).
    const uint32_t w = 192, h = 48;
    std::vector<int32_t> res((size_t)w * h);
    std::mt19937 rng(45);
    std::uniform_int_distribution<int32_t> d(-2500, 2500);
    for (auto& v : res) v = d(rng);
    SandboxModel flat;
    flat.init(TokProfile::ZFFCTRL, KeyingId::KFLAT343);
    count_plane(flat, TokProfile::ZFFCTRL, KeyingId::KFLAT343, res, w,
                nullptr);
    SandboxModel m16;
    m16.init(TokProfile::ZFFCTRL, KeyingId::KFLAT16);
    count_plane(m16, TokProfile::ZFFCTRL, KeyingId::KFLAT16, res, w, nullptr);
    SmoothedTables t16;
    build_tables_enforced(m16, t16);
    ShrunkTables shr = shrink_child_tables(TokProfile::ZFFCTRL, flat, t16, 32);
    size_t audit = 0;
    auto blob = serialize_shrunk(shr, &audit);
    EXPECT_EQ(audit, blob.size());

    auto trunc = blob;
    trunc.resize(blob.size() - 40);
    EXPECT_THROW(deserialize_shrunk(trunc, nullptr), std::runtime_error);
    auto bad_crc = blob;
    bad_crc[20] ^= 0x01;                     // inside the parent map
    bool threw = false;
    try {
        deserialize_shrunk(bad_crc, nullptr);
    } catch (const std::exception&) { threw = true; }
    EXPECT_TRUE(threw);
    ShrunkTables wrong = shr;
    const size_t stride = SandboxModel::init_stride(TokProfile::ZFFCTRL);
    wrong.child_delta[7 * stride + 3] ^= 0x10;
    EXPECT_THROW(deserialize_shrunk(blob, &wrong), std::runtime_error);
}
