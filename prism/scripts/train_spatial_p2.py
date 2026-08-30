#!/usr/bin/env python3
"""Route 10 D2 Phase R10-3: P2 MLP spatial predictor on raw RGB (issue #130).

Trains a small integer MLP `mlp(features)` that predicts a raw RGB pixel value
from its causal neighbours. The 17-feature input vector is:

  [R_W, G_W, B_W, R_N, G_N, B_N, R_NW, G_NW, B_NW, R_NE, G_NE, B_NE,
   R_WW, G_WW, B_WW, x_norm, y_norm]

where W/N/NW/NE/WW are the causal neighbours and x_norm = x/w, y_norm = y/h.

Architecture: 17 -> 16 -> 8 -> 1, ReLU hidden, linear output.
The same MLP weights are shared across R, G, B channels (the spatial
statistics are channel-independent at the neighbourhood level).

Training target: the raw pixel value (0..255). Loss: MSE + L2 regularization.

Baked int16 fixed-point weights (Q = 1024) are written to
  prism/src/codec/spatial_predictor_p2_data.inc

No interactive input: PPM dir via --kodak, output via --out.

- the Builder
"""
import argparse
import os
import random
import sys
import numpy as np

Q = 1024                      # fixed-point scale (2 ** 10)
S = 10                        # shift = log2(Q)
H1 = 16                       # hidden layer 1
H2 = 8                        # hidden layer 2
NF = 17                       # input features
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
# Feature extraction (causal neighbours, same at encode and decode).
# ---------------------------------------------------------------------------
def get_pixel(plane, w, h, x, y):
    """Get pixel value with boundary mirroring (same as C++ gp())."""
    if x < 0 or x >= w or y < 0 or y >= h:
        return 0
    return int(plane[y, x])

def extract_features(rgb, w, h, x, y):
    """Extract 17-feature causal neighbourhood for pixel (x,y).
    
    Features:
      0-2:  R/G/B at W  (x-1, y)
      3-5:  R/G/B at N  (x, y-1)
      6-8:  R/G/B at NW (x-1, y-1)
      9-11: R/G/B at NE (x+1, y-1)
      12-14: R/G/B at WW (x-2, y)
      15: x / width  (position normalised)
      16: y / height (position normalised)
    """
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    feat = np.zeros(NF, dtype=np.float64)
    # W
    feat[0] = get_pixel(r, w, h, x-1, y)
    feat[1] = get_pixel(g, w, h, x-1, y)
    feat[2] = get_pixel(b, w, h, x-1, y)
    # N
    feat[3] = get_pixel(r, w, h, x, y-1)
    feat[4] = get_pixel(g, w, h, x, y-1)
    feat[5] = get_pixel(b, w, h, x, y-1)
    # NW
    feat[6] = get_pixel(r, w, h, x-1, y-1)
    feat[7] = get_pixel(g, w, h, x-1, y-1)
    feat[8] = get_pixel(b, w, h, x-1, y-1)
    # NE
    feat[9] = get_pixel(r, w, h, x+1, y-1)
    feat[10] = get_pixel(g, w, h, x+1, y-1)
    feat[11] = get_pixel(b, w, h, x+1, y-1)
    # WW
    feat[12] = get_pixel(r, w, h, x-2, y)
    feat[13] = get_pixel(g, w, h, x-2, y)
    feat[14] = get_pixel(b, w, h, x-2, y)
    # Position
    feat[15] = x / max(w, 1)
    feat[16] = y / max(h, 1)
    return feat

# ---------------------------------------------------------------------------
# Dataset collection.
# ---------------------------------------------------------------------------
def collect_dataset_vectorized(kodak_dir, per_image_cap=10000):
    """Vectorized feature extraction for speed."""
    files = sorted(
        f for f in os.listdir(kodak_dir)
        if f.lower().endswith((".ppm", ".pgm"))
    )
    random.seed(SEED)
    all_feat = []
    all_tgt = []
    for fn in files:
        rgb, w, h, mv = read_ppm(os.path.join(kodak_dir, fn))
        r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
        npx = w * h
        # Build feature array vectorized.
        # Pad with zeros at borders (same as get_pixel returning 0).
        rp = np.pad(r, ((1,2),(1,2)), mode='constant', constant_values=0)
        gp = np.pad(g, ((1,2),(1,2)), mode='constant', constant_values=0)
        bp = np.pad(b, ((1,2),(1,2)), mode='constant', constant_values=0)
        # Coordinates in padded array: pixel (x,y) in original = (x+1, y+1) in padded.
        # But we need (x-1) etc. so the padding shifts things.
        # Let's use a simpler approach: create shifted arrays.
        H, W = h, w
        # W neighbour: shift right by 1
        rW = np.zeros((H, W), dtype=np.float64); rW[:, 1:] = r[:, :-1].astype(np.float64)
        gW = np.zeros((H, W), dtype=np.float64); gW[:, 1:] = g[:, :-1].astype(np.float64)
        bW = np.zeros((H, W), dtype=np.float64); bW[:, 1:] = b[:, :-1].astype(np.float64)
        # N neighbour: shift down by 1
        rN = np.zeros((H, W), dtype=np.float64); rN[1:, :] = r[:-1, :].astype(np.float64)
        gN = np.zeros((H, W), dtype=np.float64); gN[1:, :] = g[:-1, :].astype(np.float64)
        bN = np.zeros((H, W), dtype=np.float64); bN[1:, :] = b[:-1, :].astype(np.float64)
        # NW neighbour: shift right+down by 1
        rNW = np.zeros((H, W), dtype=np.float64); rNW[1:, 1:] = r[:-1, :-1].astype(np.float64)
        gNW = np.zeros((H, W), dtype=np.float64); gNW[1:, 1:] = g[:-1, :-1].astype(np.float64)
        bNW = np.zeros((H, W), dtype=np.float64); bNW[1:, 1:] = b[:-1, :-1].astype(np.float64)
        # NE neighbour: shift left+down by 1
        rNE = np.zeros((H, W), dtype=np.float64); rNE[1:, :-1] = r[:-1, 1:].astype(np.float64)
        gNE = np.zeros((H, W), dtype=np.float64); gNE[1:, :-1] = g[:-1, 1:].astype(np.float64)
        bNE = np.zeros((H, W), dtype=np.float64); bNE[1:, :-1] = b[:-1, 1:].astype(np.float64)
        # WW neighbour: shift right by 2
        rWW = np.zeros((H, W), dtype=np.float64); rWW[:, 2:] = r[:, :-2].astype(np.float64)
        gWW = np.zeros((H, W), dtype=np.float64); gWW[:, 2:] = g[:, :-2].astype(np.float64)
        bWW = np.zeros((H, W), dtype=np.float64); bWW[:, 2:] = b[:, :-2].astype(np.float64)
        # Position
        yy, xx = np.meshgrid(np.arange(H), np.arange(W), indexing='ij')
        xnorm = xx.astype(np.float64) / max(W, 1)
        ynorm = yy.astype(np.float64) / max(H, 1)
        # Stack features: (H, W, NF)
        feat = np.stack([rW, gW, bW, rN, gN, bN, rNW, gNW, bNW,
                         rNE, gNE, bNE, rWW, gWW, bWW, xnorm, ynorm], axis=-1)
        feat = feat.reshape(-1, NF)  # (npx, NF)
        tgt = np.stack([r.astype(np.float64), g.astype(np.float64), b.astype(np.float64)], axis=-1)
        tgt = tgt.reshape(-1, 3)  # (npx, 3)
        if npx > per_image_cap:
            idx = random.sample(range(npx), per_image_cap)
            feat = feat[idx]
            tgt = tgt[idx]
        all_feat.append(feat)
        all_tgt.append(tgt)
    X = np.concatenate(all_feat, axis=0)
    Y = np.concatenate(all_tgt, axis=0)
    return X, Y

def collect_dataset(kodak_dir, per_image_cap=100000):
    return collect_dataset_vectorized(kodak_dir, per_image_cap)

# ---------------------------------------------------------------------------
# Float MLP: NF -> H1 -> H2 -> 1, ReLU, shared weights for R/G/B.
# We predict one channel at a time using the same 17 features.
# ---------------------------------------------------------------------------
class MLP:
    def __init__(self):
        rng = np.random.default_rng(SEED)
        self.W1 = (rng.standard_normal((H1, NF)) * 0.1).astype(np.float64)
        self.b1 = np.zeros(H1, dtype=np.float64)
        self.W2 = (rng.standard_normal((H2, H1)) * 0.1).astype(np.float64)
        self.b2 = np.zeros(H2, dtype=np.float64)
        self.W3 = (rng.standard_normal((H2,)) * 0.1).astype(np.float64)
        self.b3 = 0.0
        # Adam state.
        self.m = [np.zeros_like(p) for p in self.params()]
        self.v = [np.zeros_like(p) for p in self.params()]

    def params(self):
        return [self.W1, self.b1, self.W2, self.b2, self.W3, np.array([self.b3])]

    def set_b3(self, v):
        self.b3 = float(v)

    def forward(self, X):
        """Forward pass: X shape (N, NF) -> (N,)"""
        z1 = self.b1[None, :] + X @ self.W1.T
        a1 = np.maximum(0.0, z1)
        z2 = self.b2[None, :] + a1 @ self.W2.T
        a2 = np.maximum(0.0, z2)
        out = self.b3 + a2 @ self.W3
        return out

    def integer_predict(self, X):
        """Exact integer replica of the C++ inference (floor shift)."""
        X = X.astype(np.int64)
        qW1 = np.round(self.W1 * Q).astype(np.int64)
        qb1 = np.round(self.b1 * Q).astype(np.int64)
        qW2 = np.round(self.W2 * Q).astype(np.int64)
        qb2 = np.round(self.b2 * Q).astype(np.int64)
        qW3 = np.round(self.W3 * Q).astype(np.int64)
        qb3 = int(round(self.b3 * Q))
        # Layer 1: ReLU
        z1 = qb1[None, :] + X @ qW1.T  # (N, H1) in Q space
        a1 = np.maximum(0, z1 // Q)
        # Layer 2: ReLU
        z2 = qb2[None, :] + a1 @ qW2.T  # (N, H2) in Q space
        a2 = np.maximum(0, z2 // Q)
        # Layer 3: linear
        out = qb3 + (a2 @ qW3) // Q
        return out.astype(np.int64)

def train(X, Y, epochs=40, batch=16384, lr=0.002, l2=1e-4):
    """Train one MLP per channel (shared architecture, separate weights)."""
    mlps = []
    for ch in range(3):
        sys.stderr.write(f"  training channel {ch}...\n")
        mlp = MLP()
        n = X.shape[0]
        T = Y[:, ch]
        rng = np.random.default_rng(SEED + ch)
        for ep in range(epochs):
            perm = rng.permutation(n)
            for i in range(0, n, batch):
                idx = perm[i:i + batch]
                xbatch = X[idx]
                ybatch = T[idx]
                # Forward
                z1 = mlp.b1[None, :] + xbatch @ mlp.W1.T
                a1 = np.maximum(0.0, z1)
                z2 = mlp.b2[None, :] + a1 @ mlp.W2.T
                a2 = np.maximum(0.0, z2)
                out = mlp.b3 + a2 @ mlp.W3
                # MSE + L2 loss gradient
                err = (out - ybatch) / idx.shape[0]
                grad_out = err
                # dW3, db3
                gW3 = a2.T @ grad_out
                gb3 = np.sum(grad_out)
                # da2
                ga2 = np.outer(grad_out, mlp.W3)
                ga2[z2 <= 0] = 0.0
                # dW2, db2
                gW2 = ga2.T @ xbatch  # Note: wrong shape, need a1 not xbatch
                gW2 = ga2.T @ a1
                gb2 = ga2.sum(axis=0)
                # da1
                da1 = ga2 @ mlp.W2
                da1[z1 <= 0] = 0.0
                # dW1, db1
                gW1 = da1.T @ xbatch
                gb1 = da1.sum(axis=0)
                # L2 regularization
                gW1 += l2 * mlp.W1
                gW2 += l2 * mlp.W2
                gW3 += l2 * mlp.W3
                grads = [gW1, gb1, gW2, gb2, gW3, np.array([gb3])]
                # Adam
                for j, p in enumerate(mlp.params()):
                    mlp.m[j] = 0.9 * mlp.m[j] + 0.1 * grads[j]
                    mlp.v[j] = 0.999 * mlp.v[j] + 0.001 * (grads[j] ** 2)
                    mhat = mlp.m[j] / (1 - 0.9 ** (ep + 1))
                    vhat = mlp.v[j] / (1 - 0.999 ** (ep + 1))
                    p -= lr * mhat / (np.sqrt(vhat) + 1e-8)
                mlp.b3 = float(mlp.params()[5][0])
            if ep % 10 == 0 or ep == epochs - 1:
                pred = mlp.forward(X[:min(100000, n)])
                mse = float(np.mean((pred - T[:min(100000, n)]) ** 2))
                pred_i = mlp.integer_predict(X[:min(100000, n)])
                mse_i = float(np.mean((pred_i - T[:min(100000, n)]) ** 2))
                sys.stderr.write(f"    epoch {ep:3d}  float_mse {mse:7.4f}  int_mse {mse_i:7.4f}\n")
        mlps.append(mlp)
    return mlps

def write_inc(mlps, path):
    """Write baked int16 fixed-point weights for all 3 channels."""
    lines = []
    lines.append("// AUTO-GENERATED by prism/scripts/train_spatial_p2.py (Route 10 D2 R10-3).")
    lines.append("// Baked int16 fixed-point weights for the P2 MLP spatial predictor on raw RGB.")
    lines.append("// Q = %d (arithmetic right shift by %d). Do not edit by hand." % (Q, S))
    lines.append("#ifndef PRISM_SPATIAL_PREDICTOR_P2_DATA_INC")
    lines.append("#define PRISM_SPATIAL_PREDICTOR_P2_DATA_INC")
    lines.append('#include "prism/codec/spatial_predictor.h"')
    lines.append("namespace prism::codec {")
    lines.append("// NF=%d, H1=%d, H2=%d, output=1 per channel, shared across R/G/B." % (NF, H1, H2))
    for ch in range(3):
        mlp = mlps[ch]
        qW1 = np.clip(np.round(mlp.W1 * Q).astype(np.int64), -32768, 32767)
        qb1 = np.clip(np.round(mlp.b1 * Q).astype(np.int64), -32768, 32767)
        qW2 = np.clip(np.round(mlp.W2 * Q).astype(np.int64), -32768, 32767)
        qb2 = np.clip(np.round(mlp.b2 * Q).astype(np.int64), -32768, 32767)
        qW3 = np.clip(np.round(mlp.W3 * Q).astype(np.int64), -32768, 32767)
        qb3 = int(np.clip(round(mlp.b3 * Q), -32768, 32767))
        ch_name = ["R", "G", "B"][ch]
        lines.append("// Channel %s" % ch_name)
        lines.append("const int16_t SP2_W1_%s[%d][%d] = {" % (ch_name, H1, NF))
        for j in range(H1):
            row = ", ".join("%d" % v for v in qW1[j])
            lines.append("  {%s}," % row)
        lines.append("};")
        lines.append("const int16_t SP2_B1_%s[%d] = {" % (ch_name, H1))
        lines.append("  " + ", ".join("%d" % v for v in qb1) + "};")
        lines.append("const int16_t SP2_W2_%s[%d][%d] = {" % (ch_name, H2, H1))
        for j in range(H2):
            row = ", ".join("%d" % v for v in qW2[j])
            lines.append("  {%s}," % row)
        lines.append("};")
        lines.append("const int16_t SP2_B2_%s[%d] = {" % (ch_name, H2))
        lines.append("  " + ", ".join("%d" % v for v in qb2) + "};")
        lines.append("const int16_t SP2_W3_%s[%d] = {" % (ch_name, H2))
        lines.append("  " + ", ".join("%d" % v for v in qW3) + "};")
        lines.append("const int16_t SP2_B3_%s = %d;" % (ch_name, qb3))
    lines.append("} // namespace prism::codec")
    lines.append("#endif")
    with open(path, "w") as f:
        f.write("\n".join(lines) + "\n")

def main():
    ap = argparse.ArgumentParser()
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.abspath(os.path.join(here, "..", ".."))
    ap.add_argument("--kodak", default=os.path.join(root, "obsidian", "benchmarks", "data", "kodak"))
    ap.add_argument("--out", default=os.path.join(root, "prism", "src", "codec", "spatial_predictor_p2_data.inc"))
    ap.add_argument("--epochs", type=int, default=60)
    args = ap.parse_args()

    if not os.path.isdir(args.kodak):
        sys.stderr.write("kodak dir not found: %s\n" % args.kodak)
        return 2

    sys.stderr.write("[spatial-p2] collecting dataset from %s\n" % args.kodak)
    X, Y = collect_dataset(args.kodak)
    sys.stderr.write("[spatial-p2] dataset: %d samples, %d features\n" % (X.shape[0], X.shape[1]))

    # Linear baseline MSE per channel.
    for ch, name in enumerate(["R", "G", "B"]):
        base_mse = float(np.mean((Y[:, ch] - np.mean(Y[:, ch])) ** 2))
        sys.stderr.write("[spatial-p2] channel %s: baseline variance MSE %.4f\n" % (name, base_mse))

    # Cap total dataset at 500K for training speed.
    max_total = 500000
    if X.shape[0] > max_total:
        idx = np.random.default_rng(SEED).choice(X.shape[0], max_total, replace=False)
        X = X[idx]
        Y = Y[idx]
    sys.stderr.write("[spatial-p2] training set: %d samples\n" % X.shape[0])
    sys.stderr.write("[spatial-p2] training 3 channel MLPs (%d->%d->%d->1, epochs=%d)...\n"
                     % (NF, H1, H2, args.epochs))
    mlps = train(X, Y, epochs=args.epochs)

    # Per-channel eval.
    for ch, name in enumerate(["R", "G", "B"]):
        pred = mlps[ch].forward(X[:min(200000, X.shape[0])])
        mse = float(np.mean((pred - Y[:min(200000, X.shape[0]), ch]) ** 2))
        pred_i = mlps[ch].integer_predict(X[:min(200000, X.shape[0])])
        mse_i = float(np.mean((pred_i - Y[:min(200000, X.shape[0]), ch]) ** 2))
        base = float(np.mean(Y[:min(200000, X.shape[0]), ch] ** 2))
        sys.stderr.write("[spatial-p2] %s: float_mse=%.4f  int_mse=%.4f  (signal_power=%.1f)\n"
                         % (name, mse, mse_i, base))

    write_inc(mlps, args.out)
    sys.stderr.write("[spatial-p2] baked weights -> %s\n" % args.out)
    return 0

if __name__ == "__main__":
    sys.exit(main())
