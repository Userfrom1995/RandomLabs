// V0 sandbox staticmodel tests (blueprint section 3 test matrix):
// smoothing/normalization arithmetic matches the pinned formulas on
// hand-checked vectors; serialize/deserialize bijection; corrupted CRC
// rejected loudly; truncation rejected; independent byte counters agree;
// both real backends round-trip residual planes; cluster floor/cap rules.

#include "prism/codec/staticmodel.h"
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
    // which is exactly what NET accounting must see.
    for (TokProfile p : {TokProfile::ZFFCTRL, TokProfile::HYB_A,
                         TokProfile::HYB_B, TokProfile::HYB_C}) {
        Built sparse = build(p, KeyingId::KFLAT16, 800, (uint32_t)p + 7, false);
        double ml_s = ml_ideal_bits(sparse.m);
        double tbl_s = table_ideal_bits(p, sparse.evs, sparse.t);
        EXPECT_GE(tbl_s, ml_s - 1e-6) << "profile=" << (int)p;
        Built dense = build(p, KeyingId::KFLAT16, 40000, (uint32_t)p + 99,
                            false);
        double ml_d = ml_ideal_bits(dense.m);
        double tbl_d = table_ideal_bits(p, dense.evs, dense.t);
        EXPECT_GE(tbl_d, ml_d - 1e-6) << "profile=" << (int)p;
        EXPECT_LE(tbl_d, ml_d * 1.02 + 4096.0)
            << "profile=" << (int)p << " (smoothing drag unbounded)";
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
