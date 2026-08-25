// V0 sandbox staticmodel tests (blueprint section 3 test matrix):
// smoothing/normalization arithmetic matches the pinned formulas on
// hand-checked vectors; serialize/deserialize bijection; corrupted CRC
// rejected loudly; truncation rejected; independent byte counters agree;
// both real backends round-trip residual planes; cluster floor/cap rules.

#include "prism/codec/staticmodel.h"
#include "prism/codec/acoder.h"
#include <gtest/gtest.h>
#include <random>

using namespace prism::codec::sandbox;

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
