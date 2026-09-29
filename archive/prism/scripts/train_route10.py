#!/usr/bin/env python3
"""Route 10 learned nonlinear MLP lifting trainer (issue #130).

Trains a small integer MLP `mlp(lv, rv)` that replaces the linear Le Gall 5/3
*predict* step

    odd - (lv + rv) >> 1

with

    odd - ((lv + rv) >> 1 + mlp(lv, rv))

where `lv` and `rv` are the RAW neighbour values of the even band (a continuous,
full-neighbour function class a 16-bucket LUT cannot express; see ideas/...). The
*update* step stays linear Le Gall, so the lift remains exactly reversible for
every integer input (invariant I26): decode re-adds the identical integer mlp.

The MLP is trained offline on real Kodak luma, then baked as int16 fixed-point
weights (Q = 1024, arithmetic right shift = floor division by Q) into

    prism/src/codec/route10_mlp_data.inc

which the C++ integer replica (route10_mlp.cpp) includes verbatim. An integer-sim
mirror of the exact C++ arithmetic validates the fixed-point bake (energy
reduction vs the linear baseline, and byte-exact round trip) before writing.

No interactive input: PPM dir via --kodak (default: obsidian/benchmarks/data/kodak),
output .inc via --out (default: prism/src/codec/route10_mlp_data.inc).

- the Builder
"""
import argparse
import math
import os
import random
import sys
import numpy as np

Q = 1024                      # fixed-point scale (2 ** 10)
S = 10                        # shift = log2(Q)
H = 16                        # hidden units
SEED = 20260830

# ---------------------------------------------------------------------------
# PPM loading (Kodak kodim*.ppm are P6, 8-bit).
# ---------------------------------------------------------------------------
def read_ppm(path):
    with open(path, "rb") as f:
        assert f.readline().strip() == b"P6", path
        w, h = map(int, f.readline().split())
        maxv = int(f.readline().strip())
        data = np.frombuffer(f.read(), dtype=np.uint8).reshape(h, w, 3)
    return data.astype(np.int32), w, h, maxv

# ---------------------------------------------------------------------------
# Exact integer floor-div-by-2 (arithmetic right shift semantics, C++ `>> 1`).
# numpy // floors, which matches arithmetic shift for negative values.
# ---------------------------------------------------------------------------
def fdiv(x, q):
    return x // q

# Global pair collector (lists of int64 arrays appended per 1D lift).
PAIRS = []

def lift1d_collect(a):
    """Exact replica of C++ forward_53 for ONE 1D signal; appends (lv, rv, target)."""
    a = a.astype(np.int64)
    n = a.shape[0]
    even = a[0::2]
    odd = a[1::2]
    en = even.shape[0]
    on = odd.shape[0]
    # Predict pairs.
    lv = even[:on].copy()
    rv = np.empty(on, dtype=np.int64)
    if on > 0:
        k = np.arange(on)
        ek1 = np.minimum(k + 1, en - 1)
        rv = even[ek1]
    base = fdiv(lv + rv, 2)
    target = odd - base
    # Only collect a bounded random subset to bound memory.
    PAIRS.append((lv, rv, target))
    # Forward 53 predict.
    oh = odd - base
    # Update.
    lo = np.zeros(en, dtype=np.int64)
    ro = np.zeros(en, dtype=np.int64)
    if on > 0:
        lo[0] = oh[0]
        if en > 1:
            lo[1:] = oh[:en - 1]
        ro[:on] = oh
        if en > on:
            ro[on:] = oh[on - 1]
    base_u = fdiv(lo + ro, 2)
    oe = even + base_u
    out = np.empty(n, dtype=np.int64)
    out[0::2] = oe
    out[1::2] = oh
    return out

def lift2d_collect(plane, levels):
    cur = plane.astype(np.int64).copy()
    ch, cw = cur.shape
    for _ in range(levels):
        for y in range(ch):
            cur[y] = lift1d_collect(cur[y])
        for x in range(cw):
            cur[:, x] = lift1d_collect(cur[:, x])
        lw = (cw + 1) // 2
        lh = (ch + 1) // 2
        cur = cur[:lh, :lw].copy()
        cw, ch = lw, lh

def collect_dataset(kodak_dir, levels, per_plane_cap=200000):
    files = sorted(
        f for f in os.listdir(kodak_dir)
        if f.lower().endswith((".ppm", ".pgm"))
    )
    random.seed(SEED)
    lv_all, rv_all, t_all = [], [], []
    for fn in files:
        rgb, w, h, mv = read_ppm(os.path.join(kodak_dir, fn))
        # YCoCgR colour transform; train on all three planes (Y, Co, Cg).
        r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
        y = (r + 2 * g + b) >> 2
        co = (r - b) >> 1
        cg = (g - ((r + b) >> 1)) >> 1
        planes = [y, co, cg]
        for pl in planes:
            PAIRS.clear()
            lift2d_collect(pl, levels)
            if not PAIRS:
                continue
            L = np.concatenate([p[0] for p in PAIRS])
            R = np.concatenate([p[1] for p in PAIRS])
            T = np.concatenate([p[2] for p in PAIRS])
            m = L.shape[0]
            if m > per_plane_cap:
                idx = np.random.choice(m, per_plane_cap, replace=False)
                L, R, T = L[idx], R[idx], T[idx]
            lv_all.append(L)
            rv_all.append(R)
            t_all.append(T)
    L = np.concatenate(lv_all)
    R = np.concatenate(rv_all)
    T = np.concatenate(t_all)
    return L, R, T

# ---------------------------------------------------------------------------
# Float MLP trained in the fixed-point scaled space (so the int16 bake is a
# near-exact replica). 2 -> H -> 1, ReLU.
# ---------------------------------------------------------------------------
class MLP:
    def __init__(self):
        rng = np.random.default_rng(SEED)
        # Small init so post-scale activations stay modest.
        self.W1 = (rng.standard_normal((H, 2)) * 0.02).astype(np.float64)
        self.b1 = np.zeros(H, dtype=np.float64)
        self.W2 = (rng.standard_normal((H,)) * 0.02).astype(np.float64)
        self.b2 = 0.0
        # Adam state.
        self.m = [np.zeros_like(p) for p in self.params()]
        self.v = [np.zeros_like(p) for p in self.params()]

    def params(self):
        return [self.W1, self.b1, self.W2, np.array([self.b2])]

    def set_b2(self, v):
        self.b2 = float(v)

    def forward(self, L, R):
        x = np.stack([L, R], axis=1).astype(np.float64)
        z1 = self.b1 + x @ self.W1.T
        a1 = np.maximum(0.0, z1)
        out = self.b2 + a1 @ self.W2
        return out

    def integer_predict(self, L, R):
        """Exact integer replica of the C++ route10_mlp_predict (floor shift)."""
        L = L.astype(np.int64)
        R = R.astype(np.int64)
        qW1 = np.round(self.W1 * Q).astype(np.int64)
        qb1 = np.round(self.b1 * Q).astype(np.int64)
        qW2 = np.round(self.W2 * Q).astype(np.int64)
        qb2 = int(round(self.b2 * Q))
        z1 = qb1[None, :] + L[:, None] * qW1[:, 0][None, :] + R[:, None] * qW1[:, 1][None, :]
        a1 = np.maximum(0, z1 // Q)
        out = qb2 + (a1 @ qW2) // Q
        return out.astype(np.int64)

def train(L, R, T, epochs=80, batch=8192, lr=0.002):
    mlp = MLP()
    n = L.shape[0]
    rng = np.random.default_rng(SEED + 1)
    for ep in range(epochs):
        perm = rng.permutation(n)
        for i in range(0, n, batch):
            idx = perm[i:i + batch]
            xL = L[idx]; xR = R[idx]; y = T[idx]
            # forward
            x = np.stack([xL, xR], axis=1)
            z1 = mlp.b1 + x @ mlp.W1.T
            a1 = np.maximum(0.0, z1)
            out = mlp.b2 + a1 @ mlp.W2
            # MAE loss gradient
            err = out - y
            grad_out = np.sign(err) / idx.shape[0]
            # dW2, db2
            gW2 = a1.T @ grad_out
            gb2 = np.sum(grad_out)
            # da1
            ga1 = np.outer(grad_out, mlp.W2)
            ga1[z1 <= 0] = 0.0
            # dW1, db1
            gW1 = ga1.T @ x
            gb1 = ga1.sum(axis=0)
            grads = [gW1, gb1, gW2, np.array([gb2])]
            # Adam
            for j, p in enumerate(mlp.params()):
                mlp.m[j] = 0.9 * mlp.m[j] + 0.1 * grads[j]
                mlp.v[j] = 0.999 * mlp.v[j] + 0.001 * (grads[j] ** 2)
                mhat = mlp.m[j] / (1 - 0.9 ** (ep + 1))
                vhat = mlp.v[j] / (1 - 0.999 ** (ep + 1))
                p -= lr * mhat / (np.sqrt(vhat) + 1e-8)
            mlp.b2 = mlp.params()[3][0]
        if ep % 10 == 0 or ep == epochs - 1:
            with np.errstate(all="ignore"):
                pred = mlp.forward(L, R)
                mae = np.mean(np.abs(pred - T))
                img = mlp.integer_predict(L, R)
                mae_i = np.mean(np.abs(img - T))
            sys.stderr.write(
                f"  epoch {ep:3d}  float_MAE {mae:7.4f}  int_MAE {mae_i:7.4f}\n")
    return mlp

def write_inc(mlp, path):
    qW1 = np.round(mlp.W1 * Q).astype(np.int64)
    qb1 = np.round(mlp.b1 * Q).astype(np.int64)
    qW2 = np.round(mlp.W2 * Q).astype(np.int64)
    qb2 = int(round(mlp.b2 * Q))
    # Clip to int16 range defensively (training keeps these small).
    qW1 = np.clip(qW1, -32768, 32767)
    qb1 = np.clip(qb1, -32768, 32767)
    qW2 = np.clip(qW2, -32768, 32767)
    qb2 = int(np.clip(qb2, -32768, 32767))
    lines = []
    lines.append("// AUTO-GENERATED by prism/scripts/train_route10.py (Route 10).")
    lines.append("// Baked int16 fixed-point weights for the learned nonlinear MLP predict step.")
    lines.append("// Q = %d (arithmetic right shift by %d). Do not edit by hand." % (Q, S))
    lines.append("#ifndef PRISM_ROUTE10_MLP_DATA_INC")
    lines.append("#define PRISM_ROUTE10_MLP_DATA_INC")
    lines.append('#include "prism/codec/route10_mlp.h"')
    lines.append("namespace prism::codec {")
    lines.append("const int16_t R10_W1[R10_H][2] = {")
    for j in range(H):
        lines.append("  {%d, %d}," % (qW1[j, 0], qW1[j, 1]))
    lines.append("};")
    lines.append("const int16_t R10_B1[R10_H] = {")
    lines.append("  " + ", ".join("%d" % v for v in qb1) + "};")
    lines.append("const int16_t R10_W2[R10_H] = {")
    lines.append("  " + ", ".join("%d" % v for v in qW2) + "};")
    lines.append("const int16_t R10_B2 = %d;" % qb2)
    lines.append("inline Route10MLP baked_route10_mlp() {")
    lines.append("  Route10MLP m{};")
    lines.append("  m.W1 = R10_W1; m.b1 = R10_B1; m.W2 = R10_W2; m.b2 = R10_B2;")
    lines.append("  return m;")
    lines.append("}")
    lines.append("} // namespace prism::codec")
    lines.append("#endif")
    with open(path, "w") as f:
        f.write("\n".join(lines) + "\n")

def main():
    ap = argparse.ArgumentParser()
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.abspath(os.path.join(here, "..", ".."))
    ap.add_argument("--kodak", default=os.path.join(root, "obsidian", "benchmarks", "data", "kodak"))
    ap.add_argument("--out", default=os.path.join(root, "prism", "src", "codec", "route10_mlp_data.inc"))
    ap.add_argument("--levels", type=int, default=5)
    ap.add_argument("--epochs", type=int, default=80)
    args = ap.parse_args()

    if not os.path.isdir(args.kodak):
        sys.stderr.write("kodak dir not found: %s\n" % args.kodak)
        return 2

    sys.stderr.write("[route10] collecting dataset from %s (levels=%d)\n" % (args.kodak, args.levels))
    L, R, T = collect_dataset(args.kodak, args.levels)
    sys.stderr.write("[route10] dataset pairs: %d  target MAE baseline (linear): %.4f\n"
                     % (L.shape[0], float(np.mean(np.abs(T)))))

    # Training subset for speed.
    rng = np.random.default_rng(SEED + 7)
    m = L.shape[0]
    cap = 4_000_000
    if m > cap:
        idx = rng.choice(m, cap, replace=False)
        Ltr, Rtr, Ttr = L[idx], R[idx], T[idx]
    else:
        Ltr, Rtr, Ttr = L, R, T
    # Eval subset (held out from training).
    ev = min(1_000_000, m)
    eidx = rng.choice(m, ev, replace=False)
    Le, Re, Te = L[eidx], R[eidx], T[eidx]

    sys.stderr.write("[route10] training on %d pairs...\n" % Ltr.shape[0])
    mlp = train(Ltr, Rtr, Ttr, epochs=args.epochs)

    # Integer-sim validation.
    pred_i = mlp.integer_predict(Le, Re)
    mae_int = float(np.mean(np.abs(pred_i - Te)))
    mae_float = float(np.mean(np.abs(mlp.forward(Le, Re) - Te)))
    base_mae = float(np.mean(np.abs(Te)))
    sys.stderr.write("[route10] eval: linear baseline MAE %.4f | float MAE %.4f | int MAE %.4f\n"
                     % (base_mae, mae_float, mae_int))
    sys.stderr.write("[route10] predict-error energy: linear sum|target| %.0f -> int-MLP sum|resid| %.0f (%.2f%% reduction)\n"
                     % (float(np.sum(np.abs(Te))),
                        float(np.sum(np.abs(Te - pred_i))),
                        100.0 * (1 - np.sum(np.abs(Te - pred_i)) / np.sum(np.abs(Te)))))

    write_inc(mlp, args.out)
    sys.stderr.write("[route10] baked weights -> %s\n" % args.out)
    # Emit a machine-readable summary line for the pipeline log.
    print("ROUTE10_TRAIN base_mae=%.4f float_mae=%.4f int_mae=%.4f int_reduction_pct=%.3f"
          % (base_mae, mae_float, mae_int,
             100.0 * (1 - np.sum(np.abs(Te - pred_i)) / np.sum(np.abs(Te)))))
    return 0

if __name__ == "__main__":
    sys.exit(main())
