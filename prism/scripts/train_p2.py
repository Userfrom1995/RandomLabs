#!/usr/bin/env python3
"""P2 learned spatial MLP predictor trainer (issue #130).

Trains a 17->64->32->1 MLP that predicts the current pixel value from a causal
spatial neighbourhood of raw pixels. Applied BEFORE the wavelet transform.

Design: raw (unnormalized) integer features -> int16 Q=256 MLP -> int32
accumulation -> prediction in pixel units. Both encoder and decoder compute the
same integer prediction from the same causal neighbours, so the roundtrip is
byte-exact (invariant I29).

Feature categories (all int16, no normalization needed):
  [0-6]   spatial: W, N, NW, NE, W-N, N-NW, W-NW
  [7-10]  gradient: W-WW, N-NN, avg_gradient, triple_avg
  [11-12] position: (x%8)<<4, (y%8)<<4  (scaled to 0-120)
  [13-16] texture: local_var_16, edge_mag_16, range_16, local_mean_16

No interactive input.

- the Builder
"""
import argparse, os, sys, glob
import numpy as np

SEED = 20260830
np.random.seed(SEED)

def read_ppm(path):
    with open(path, "rb") as f:
        assert f.readline().strip() == b"P6", path
        w, h = map(int, f.readline().split())
        maxv = int(f.readline().strip())
        data = np.frombuffer(f.read(), dtype=np.uint8).reshape(h, w, 3)
    return data.astype(np.int32), w, h, maxv

def extract_features_i16(plane, w, h, x, y):
    """17 causal features, all int16 (no normalization)."""
    def px(ix, iy):
        ix = max(0, min(ix, w - 1))
        iy = max(0, min(iy, h - 1))
        return int(plane[iy, ix])

    W  = px(x - 1, y); N  = px(x, y - 1)
    NW = px(x - 1, y - 1); NE = px(x + 1, y - 1)
    WW = px(x - 2, y); NN = px(x, y - 2)

    f = np.zeros(17, dtype=np.int32)
    f[0] = W; f[1] = N; f[2] = NW; f[3] = NE
    f[4] = W - N; f[5] = N - NW; f[6] = W - NW
    f[7] = W - WW; f[8] = N - NN
    f[9] = (W + N) // 2 - NW
    f[10] = (W + N + NW) // 3

    # Position: scaled 0-120 (8 positions * 16)
    f[11] = (x % 8) << 4
    f[12] = (y % 8) << 4

    # Texture features (scaled to similar range as pixel values)
    vals = [W, N, NW, NE]
    mean_v = sum(vals) / 4
    var_v = sum((v - mean_v) ** 2 for v in vals) / 4
    f[13] = min(int(np.sqrt(var_v) + 0.5), 255)  # std dev
    f[14] = abs(W - N)
    f[15] = max(abs(v1 - v2) for v1 in vals for v2 in vals)
    f[16] = (W + N + NW + NE + 2) // 4  # local mean

    return f.astype(np.int16)

def collect_data(kodak_dir, max_pairs_per_image=80000):
    ppms = sorted(glob.glob(os.path.join(kodak_dir, "*.ppm")))
    if not ppms:
        print(f"Error: no PPM files in {kodak_dir}", file=sys.stderr); sys.exit(1)

    all_X, all_y = [], []
    for ppm_path in ppms:
        data, w, h, maxv = read_ppm(ppm_path)
        total = w * h
        stride = max(1, total * 3 // max_pairs_per_image)
        count = 0
        for y in range(h):
            for x in range(w):
                for c in range(3):
                    if (y * w + x) % stride != 0: continue
                    feat = extract_features_i16(data[:, :, c], w, h, x, y)
                    all_X.append(feat)
                    all_y.append(float(data[y, x, c]))
                    count += 1
        print(f"  {os.path.basename(ppm_path)}: {count}", flush=True)

    X = np.array(all_X, dtype=np.float32)
    y = np.array(all_y, dtype=np.float32)
    print(f"Total: {len(y)} pairs, features dtype={X.dtype}")
    return X, y

def relu(x): return np.maximum(0, x)

def mlp_forward(v, W1, b1, W2, b2, W3, b3):
    h1 = relu(W1 @ v + b1)
    h2 = relu(W2 @ h1 + b2)
    return float((W3 @ h2 + b3)[0])

def train_mlp(X, y, h1=64, h2=32, epochs=50, lr=0.0005, batch=8192, l2=1e-7):
    nf = X.shape[1]; n = len(y)
    W1 = np.random.randn(h1, nf).astype(np.float32) * np.sqrt(2.0 / nf)
    b1 = np.zeros(h1, np.float32)
    W2 = np.random.randn(h2, h1).astype(np.float32) * np.sqrt(2.0 / h1)
    b2 = np.zeros(h2, np.float32)
    W3 = np.random.randn(1, h2).astype(np.float32) * np.sqrt(2.0 / h2) * 0.5
    b3 = np.zeros(1, np.float32)

    params = [W1, b1, W2, b2, W3, b3]
    ms = [np.zeros_like(p) for p in params]
    vs = [np.zeros_like(p) for p in params]
    best_mse, best = float('inf'), None

    for ep in range(epochs):
        perm = np.random.permutation(n)
        Xs, ys = X[perm], y[perm]
        tl, nb = 0.0, 0
        for s in range(0, n, batch):
            e = min(s + batch, n)
            xb, yb = Xs[s:e], ys[s:e]; bs = e - s
            z1 = xb @ W1.T + b1; a1 = relu(z1)
            z2 = a1 @ W2.T + b2; a2 = relu(z2)
            p = (a2 @ W3.T + b3)[:, 0]
            d = p - yb; mse = np.mean(d**2) + l2 * sum(np.sum(q**2) for q in [W1,W2,W3])
            tl += mse; nb += 1

            dz3 = (2.0/bs) * d
            gW3 = dz3[:,None].T @ a2 + 2*l2*W3
            gb3 = np.sum(dz3, keepdims=True)
            da2 = dz3[:,None] @ W3; dz2 = da2 * (z2 > 0)
            gW2 = dz2.T @ a1 + 2*l2*W2; gb2 = np.sum(dz2, axis=0)
            da1 = dz2 @ W2; dz1 = da1 * (z1 > 0)
            gW1 = dz1.T @ xb + 2*l2*W1; gb1 = np.sum(dz1, axis=0)
            g = [gW1, gb1, gW2, gb2, gW3, gb3]

            t = ep * (n // batch) + nb
            for i in range(6):
                ms[i] = 0.9*ms[i] + 0.1*g[i]
                vs[i] = 0.999*vs[i] + 0.001*g[i]**2
                mh = ms[i]/0.1; vh = vs[i]/0.001
                params[i] -= lr * mh / (np.sqrt(vh) + 1e-8)

        W1,b1,W2,b2,W3,b3 = params
        avg = tl / nb
        if avg < best_mse: best_mse = avg; best = [p.copy() for p in params]
        if (ep+1) % 10 == 0:
            print(f"  Epoch {ep+1}: MSE={avg:.2f} (best={best_mse:.2f})")

    W1,b1,W2,b2,W3,b3 = best
    return W1, b1, W2, b2, W3, b3

def verify_integer(X, y, W1, b1, W2, b2, W3, b3, n=3000):
    """Verify integer inference matches float within 1 pixel."""
    QW = 256  # weight quantization scale
    QF = 256  # feature quantization scale (but features are already int16 pixel-scale)

    W1q = np.clip(np.round(W1 * QW), -32768, 32767).astype(np.int16)
    b1q = np.clip(np.round(b1 * QW * QW), -2**31, 2**31-1).astype(np.int32)  # bias scaled by QW^2
    W2q = np.clip(np.round(W2 * QW), -32768, 32767).astype(np.int16)
    b2q = np.clip(np.round(b2 * QW * QW), -2**31, 2**31-1).astype(np.int32)
    W3q = np.clip(np.round(W3 * QW), -32768, 32767).astype(np.int16)
    b3q = np.clip(np.round(b3 * QW * QW * QW), -2**31, 2**31-1).astype(np.int32)

    def int_forward(v_raw_int16):
        v = v_raw_int16.astype(np.int32)
        # h1 = relu(W1 @ v + b1) >> (2*log2(QW))
        h1_raw = W1q.astype(np.int64) @ v.astype(np.int64) + b1q.astype(np.int64)
        h1 = np.maximum(0, h1_raw >> 16).astype(np.int32)
        h1 = np.clip(h1, -32768, 32767).astype(np.int16)
        # h2 = relu(W2 @ h1 + b2) >> (2*log2(QW))
        h2_raw = W2q.astype(np.int64) @ h1.astype(np.int64) + b2q.astype(np.int64)
        h2 = np.maximum(0, h2_raw >> 16).astype(np.int32)
        h2 = np.clip(h2, -32768, 32767).astype(np.int16)
        # out = (W3 @ h2 + b3) >> (2*log2(QW))
        out_raw = W3q.astype(np.int64) @ h2.astype(np.int64) + b3q.astype(np.int64)
        return float(int(out_raw[0]) >> 16)

    n = min(n, len(X))
    errs = []
    for i in range(n):
        fp = mlp_forward(X[i], W1, b1, W2, b2, W3, b3)
        ip = int_forward(X[i].astype(np.int16))
        errs.append(abs(fp - ip))
    errs = np.array(errs)
    print(f"  Integer check ({n}): avg={errs.mean():.2f} max={errs.max():.2f} p99={np.percentile(errs,99):.2f}")
    return errs.max() < 3.0

def bake(W1, b1, W2, b2, W3, b3, out_path):
    QW = 256

    def q(arr, scale):
        return np.clip(np.round(arr * scale), -32768, 32767).astype(np.int16)

    W1q = q(W1, QW); W2q = q(W2, QW); W3q = q(W3, QW)
    # Biases scaled by QW^2 (since they accumulate through two QW multiplications)
    b1q = np.clip(np.round(b1 * QW * QW), -2147483648, 2147483647).astype(np.int32)
    b2q = np.clip(np.round(b2 * QW * QW), -2147483648, 2147483647).astype(np.int32)
    b3q = np.clip(np.round(b3 * QW * QW * QW), -2147483648, 2147483647).astype(np.int32)

    def f2d(arr, name):
        r, c = arr.shape
        lines = [", ".join(str(arr[i,j]) for j in range(c)) for i in range(r)]
        body = ",\n  ".join("{" + l + "}" for l in lines)
        return f"static const int16_t {name}[{r}][{c}] = {{\n  {body}\n}};"

    def f1d_i16(arr, name):
        vals = ", ".join(str(v) for v in arr)
        return f"static const int16_t {name}[{len(arr)}] = {{{vals}}};"

    def f1d_i32(arr, name):
        vals = ", ".join(str(v) for v in arr)
        return f"static const int32_t {name}[{len(arr)}] = {{{vals}}};"

    with open(out_path, "w") as f:
        f.write("// Auto-generated by train_p2.py. DO NOT EDIT.\n")
        f.write(f"// QW = {QW} (weight scale), QW^2 = {QW*QW} (bias scale for hidden layers)\n")
        f.write("// Features are raw pixel-scale int16 (no normalization needed).\n")
        f.write("// Accumulation: int64, shift by 2*log2(QW) = 16 after each layer.\n")
        f.write("#pragma once\n#include <cstdint>\n\n")
        f.write("namespace prism::codec::p2 {\n\n")
        f.write(f"constexpr int P2_QW = {QW};\n")
        f.write(f"constexpr int P2_SHIFT = {int(np.log2(QW*QW))};\n\n")
        f.write(f2d(W1q, "W1"))
        f.write("\n\n" + f1d_i32(b1q, "B1"))
        f.write("\n\n" + f2d(W2q, "W2"))
        f.write("\n\n" + f1d_i32(b2q, "B2"))
        f.write("\n\n" + f2d(W3q, "W3"))
        f.write("\n\n" + f1d_i32(b3q, "B3"))
        f.write("\n\n} // namespace prism::codec::p2\n")
    print(f"Baked to {out_path}")

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--kodak", default="prism/benchmarks/data/kodak")
    p.add_argument("--out", default="prism/src/codec/spatial_predictor_p2_data.inc")
    p.add_argument("--epochs", type=int, default=50)
    p.add_argument("--lr", type=float, default=0.0005)
    args = p.parse_args()

    print("=== P2 Spatial MLP Trainer (raw features, int16) ===\n")
    print("Collecting...")
    X, y = collect_data(args.kodak)
    print(f"\nFeature range: [{X.min():.0f}, {X.max():.0f}]")

    print("\nTraining...")
    W1, b1, W2, b2, W3, b3 = train_mlp(X, y, epochs=args.epochs, lr=args.lr)

    print("\nVerifying integer inference...")
    ok = verify_integer(X, y, W1, b1, W2, b2, W3, b3)
    if not ok:
        print("WARNING: integer error too large", file=sys.stderr)

    print("\nBaking weights...")
    bake(W1, b1, W2, b2, W3, b3, args.out)
    print("\nDone.")

if __name__ == "__main__":
    main()
