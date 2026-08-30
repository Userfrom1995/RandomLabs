#!/usr/bin/env python3
"""
Train Option C learned pyramid weights for Prism #130.

Collects (lv, rv, target=odd - (lv+rv)//2) tuples at every predict step across
all 3 scales on real Kodak YCoCgR planes, trains a 2->16->1 ReLU integer MLP
per scale (separate row/col weights), and bakes int16 fixed-point (Q=1024) weights
to prism/src/codec/option_c_data.inc.

Usage:
    python3 train_option_c.py --kodak-dir path/to/kodak [--epochs 50] [--lr 0.001]

The trained network minimises prediction residual entropy (MAE objective) across
all 3 scales. Separate weights for rows and columns at each scale give 6 MLPs total.
"""

import argparse
import os
import struct
import sys
import numpy as np
from pathlib import Path


def load_kodak_ppm(path):
    """Load a PPM file as uint16 planes (YCoCg-R color transform)."""
    with open(path, 'rb') as f:
        magic = f.readline().strip()
        if magic not in (b'P6', b'P5'):
            # Try raw header parsing
            f.seek(0)
            magic = f.readline().strip()
            assert magic in (b'P6', b'P5'), f"Not a PPM: {path} (magic={magic})"
        # Skip comments
        line = f.readline()
        while line.startswith(b'#'):
            line = f.readline()
        w, h = map(int, line.split())
        maxval = int(f.readline().strip())
        data = f.read()

        if magic == b'P6':
            if maxval > 255:
                # 16-bit PPM
                pixels = np.frombuffer(data, dtype='>u2').reshape(h, w, 3)
            else:
                pixels = np.frombuffer(data, dtype='u1').reshape(h, w, 3).astype(np.uint16) * 257
        else:
            if maxval > 255:
                pixels = np.frombuffer(data, dtype='>u2').reshape(h, w)
            else:
                pixels = np.frombuffer(data, dtype='u1').reshape(h, w).astype(np.uint16) * 257
            return pixels  # grayscale

    # Apply YCoCg-R color transform
    r, g, b = pixels[:,:,0].astype(np.int32), pixels[:,:,1].astype(np.int32), pixels[:,:,2].astype(np.int32)
    y  = ((r + 2*g + b) >> 2).astype(np.int32)
    co = (r - b).astype(np.int32)
    cg = ((b - g - (r - g) // 2)).astype(np.int32)  # simplified CoCg-R
    # Actually use standard YCoCg-R:
    # t = (r + b) >> 1
    # co = r - b
    # cg = g - t
    # y = t + (cg >> 1)
    t = ((r + b) >> 1).astype(np.int32)
    co = (r - b).astype(np.int32)
    cg = (g - t).astype(np.int32)
    y = (t + (cg >> 1)).astype(np.int32)

    return y, co, cg


def forward_1d_collect(even, odd):
    """Forward lifting and collect (lv, rv, target) tuples."""
    en = len(even)
    on = len(odd)
    tuples = []
    for k in range(on):
        lv = even[k]
        rv = even[k + 1] if k + 1 < en else even[k]
        base = (lv + rv) >> 1
        target = int(odd[k]) - base  # correction that MLP needs to learn
        tuples.append((lv, rv, target))
    return tuples


def collect_training_data(kodak_dir):
    """Collect (lv, rv, target) tuples from all Kodak images at all 3 scales."""
    all_tuples = {scale: {'row': [], 'col': []} for scale in range(3)}
    kodak_path = Path(kodak_dir)

    ppm_files = sorted(kodak_path.glob('*.ppm'))
    if not ppm_files:
        # Try kodimXX naming
        ppm_files = sorted(kodak_path.glob('kodim*.ppm'))
    if not ppm_files:
        print(f"No PPM files found in {kodak_dir}")
        sys.exit(1)

    print(f"Found {len(ppm_files)} Kodak images")
    for ppm in ppm_files:
        try:
            planes = load_kodak_ppm(ppm)
        except Exception as e:
            print(f"  Skipping {ppm.name}: {e}")
            continue

        if isinstance(planes, tuple):
            plane_list = planes
        else:
            plane_list = (planes,)

        for plane in planes if isinstance(planes, tuple) else [planes]:
            if plane is None:
                continue
            h, w = plane.shape
            buf = plane.astype(np.int32)

            for scale in range(3):
                # Row lifting
                for y in range(buf.shape[0]):
                    row = buf[y, :]
                    en = (len(row) + 1) // 2
                    on = len(row) // 2
                    even = row[0::2]
                    odd = row[1::2]
                    tuples = forward_1d_collect(even, odd)
                    all_tuples[scale]['row'].extend(tuples)

                # Col lifting
                for x in range(buf.shape[1]):
                    col = buf[:, x]
                    en = (len(col) + 1) // 2
                    on = len(col) // 2
                    even = col[0::2]
                    odd = col[1::2]
                    tuples = forward_1d_collect(even, odd)
                    all_tuples[scale]['col'].extend(tuples)

                # Apply lifting to get the LL for next scale
                new_h = (h + 1) // 2
                new_w = (w + 1) // 2

                # Row lifting
                for y in range(h):
                    row = buf[y, :]
                    en = (len(row) + 1) // 2
                    on = len(row) // 2
                    even = row[0::2]
                    odd = row[1::2]
                    # Forward predict
                    residual = np.zeros(on, dtype=np.int32)
                    for k in range(on):
                        lv = int(even[k])
                        rv = int(even[k+1]) if k+1 < en else int(even[k])
                        residual[k] = int(odd[k]) - ((lv + rv) >> 1)
                    # Forward update (floor division)
                    out_even = np.zeros(en, dtype=np.int32)
                    for k in range(en):
                        lo = int(residual[k-1]) if k > 0 else int(residual[0])
                        ro = int(residual[k]) if k < on else (int(residual[on-1]) if on > 0 else 0)
                        s = lo + ro
                        out_even[k] = int(even[k]) + (s >> 1)
                    # Interleave back
                    for k in range(en):
                        buf[y, 2*k] = out_even[k]
                    for k in range(on):
                        buf[y, 2*k+1] = residual[k]

                # Column lifting
                for x in range(w):
                    col = buf[:, x]
                    en = (len(col) + 1) // 2
                    on = len(col) // 2
                    even = col[0::2]
                    odd = col[1::2]
                    residual = np.zeros(on, dtype=np.int32)
                    for k in range(on):
                        lv = int(even[k])
                        rv = int(even[k+1]) if k+1 < en else int(even[k])
                        residual[k] = int(odd[k]) - ((lv + rv) >> 1)
                    out_even = np.zeros(en, dtype=np.int32)
                    for k in range(en):
                        lo = int(residual[k-1]) if k > 0 else int(residual[0])
                        ro = int(residual[k]) if k < on else (int(residual[on-1]) if on > 0 else 0)
                        s = lo + ro
                        out_even[k] = int(even[k]) + (s >> 1)
                    for k in range(en):
                        buf[2*k, x] = out_even[k]
                    for k in range(on):
                        buf[2*k+1, x] = residual[k]

                # Extract LL at stride-2 positions
                new_buf = np.zeros((new_h, new_w), dtype=np.int32)
                for ry in range(new_h):
                    for rx in range(new_w):
                        new_buf[ry, rx] = buf[2*ry, 2*rx]

                h, w = new_h, new_w
                buf = new_buf

    for scale in range(3):
        for direction in ('row', 'col'):
            n = len(all_tuples[scale][direction])
            print(f"  Scale {scale} {direction}: {n} tuples")

    return all_tuples


def train_mlp(tuples, epochs=50, lr=0.001, hidden=16):
    """Train a 2->H->1 ReLU MLP using Adam optimiser (MAE loss)."""
    if len(tuples) == 0:
        return np.zeros((hidden, 2), dtype=np.int16), np.zeros(hidden, dtype=np.int16), \
               np.zeros(hidden, dtype=np.int16), np.int16(0)

    data = np.array(tuples, dtype=np.float32)
    X = data[:, :2]  # (lv, rv)
    y = data[:, 2:3]  # target correction

    # No normalization - train raw weights directly so baked int16 Q=1024
    # weights correspond exactly to the trained model (matching option_c.cpp predict).

    # He initialization
    W1 = np.random.randn(hidden, 2) * np.sqrt(2.0 / 2)
    b1 = np.zeros(hidden)
    W2 = np.random.randn(hidden) * np.sqrt(2.0 / hidden)
    b2 = 0.0

    # Adam state
    mW1 = np.zeros_like(W1); vW1 = np.zeros_like(W1)
    mb1 = np.zeros_like(b1); vb1 = np.zeros_like(b1)
    mW2 = np.zeros_like(W2); vW2 = np.zeros_like(W2)
    mb2 = 0.0; vb2 = 0.0
    beta1, beta2, eps_adam = 0.9, 0.999, 1e-8

    batch_size = 4096
    n = len(X_n)
    best_loss = float('inf')

    for epoch in range(epochs):
        perm = np.random.permutation(n)
        epoch_loss = 0.0
        n_batches = 0
        for i in range(0, n, batch_size):
            idx = perm[i:i+batch_size]
            xb = X[idx]
            yb = y[idx]

            # Forward
            z1 = xb @ W1.T + b1  # (B, H)
            h1 = np.maximum(z1, 0)  # ReLU
            pred = h1 @ W2 + b2  # (B,)

            loss = np.mean(np.abs(pred - yb[:, 0]))
            epoch_loss += loss
            n_batches += 1

            # Backward
            dl_dpred = np.where(pred > yb[:, 0], 1.0/len(idx), -1.0/len(idx))  # MAE grad
            dW2 = dl_dpred @ h1  # (H,)
            db2 = dl_dpred.sum()
            dh1 = np.outer(dl_dpred, W2)  # (B, H)
            dz1 = dh1 * (z1 > 0).astype(float)  # ReLU mask
            dW1 = dz1.T @ xb  # (H, 2)
            db1 = dz1.sum(axis=0)

            # Adam update
            t_step = epoch * (n // batch_size + 1) + (i // batch_size) + 1

            mW1 = beta1 * mW1 + (1 - beta1) * dW1
            vW1 = beta2 * vW1 + (1 - beta2) * dW1**2
            mW1_hat = mW1 / (1 - beta1**t_step)
            vW1_hat = vW1 / (1 - beta2**t_step)
            W1 -= lr * mW1_hat / (np.sqrt(vW1_hat) + eps_adam)

            mb1 = beta1 * mb1 + (1 - beta1) * db1
            vb1 = beta2 * vb1 + (1 - beta2) * db1**2
            mb1_hat = mb1 / (1 - beta1**t_step)
            vb1_hat = vb1 / (1 - beta2**t_step)
            b1 -= lr * mb1_hat / (np.sqrt(vb1_hat) + eps_adam)

            mW2 = beta1 * mW2 + (1 - beta1) * dW2
            vW2 = beta2 * vW2 + (1 - beta2) * dW2**2
            mW2_hat = mW2 / (1 - beta1**t_step)
            vW2_hat = vW2 / (1 - beta2**t_step)
            W2 -= lr * mW2_hat / (np.sqrt(vW2_hat) + eps_adam)

        avg_loss = epoch_loss / max(n_batches, 1)
        if epoch % 10 == 0:
            print(f"  Epoch {epoch}: MAE={avg_loss:.6f} (y_std={y_std:.2f})")

        if avg_loss < best_loss:
            best_loss = avg_loss

    # Quantise to int16 Q=1024 (raw weights, no normalization)
    Q = 1024
    W1_q = np.clip(np.round(W1 * Q), -32768, 32767).astype(np.int16)
    b1_q = np.clip(np.round(b1 * Q), -32768, 32767).astype(np.int16)
    W2_q = np.clip(np.round(W2 * Q), -32768, 32767).astype(np.int16)
    b2_q = np.clip(np.round(b2 * Q), -32768, 32767).astype(np.int16)

    return W1_q, b1_q, W2_q, int(b2_q)


def generate_inc(all_weights, output_path):
    """Generate option_c_data.inc with baked weights."""
    H = 16
    with open(output_path, 'w') as f:
        f.write("// Option C baked weights (generated by train_option_c.py).\n")
        f.write("// 3 scales x 2 directions (row, col) x 16 hidden units.\n\n")
        f.write('#include "prism/codec/option_c.h"\n\n')
        f.write("namespace prism::codec {\n\n")
        f.write("namespace {\n")

        def write_predict(f, varname, W1, b1, W2, b2):
            f.write(f"const OptionCPredict {varname} = {{\n")
            f.write("    .W1 = {\n")
            for j in range(H):
                f.write(f"        {{{W1[j,0]}, {W1[j,1]}}},\n")
            f.write("    },\n")
            f.write("    .b1 = {")
            f.write(", ".join(str(b1[j]) for j in range(H)))
            f.write("},\n")
            f.write("    .W2 = {")
            f.write(", ".join(str(W2[j]) for j in range(H)))
            f.write("},\n")
            f.write(f"    .b2 = {b2}\n")
            f.write("};\n")

        for direction in ('row', 'col'):
            for scale in range(3):
                W1, b1, W2, b2 = all_weights[(scale, direction)]
                write_predict(f, f"g_{direction}{scale}_pred", W1, b1, W2, b2)

        f.write("const OptionCUpdate g_default_update = { .scale_num = 1, .scale_den = 1 };\n\n")

        f.write("const OptionCParams g_params = {\n")
        f.write("    .row_predict = {\n")
        for scale in range(3):
            f.write(f"        g_row{scale}_pred,\n")
        f.write("    },\n")
        f.write("    .col_predict = {\n")
        for scale in range(3):
            f.write(f"        g_col{scale}_pred,\n")
        f.write("    },\n")
        f.write("    .row_update = {\n")
        for _ in range(3):
            f.write("        g_default_update,\n")
        f.write("    },\n")
        f.write("    .col_update = {\n")
        for _ in range(3):
            f.write("        g_default_update,\n")
        f.write("    }\n")
        f.write("};\n")
        f.write("} // namespace\n\n")
        f.write("const OptionCParams& baked_option_c_params() {\n")
        f.write("    return g_params;\n")
        f.write("}\n\n")
        f.write("} // namespace prism::codec\n")

    print(f"Written baked weights to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Train Option C learned pyramid weights")
    parser.add_argument("--kodak-dir", required=True, help="Path to Kodak PPM directory")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--lr", type=float, default=0.001)
    parser.add_argument("--hidden", type=int, default=16)
    parser.add_argument("--output", default=None, help="Output .inc file path")
    args = parser.parse_args()

    print("Collecting training data from Kodak images...")
    all_tuples = collect_training_data(args.kodak_dir)

    all_weights = {}
    H = args.hidden

    for scale in range(3):
        for direction in ('row', 'col'):
            tuples = all_tuples[scale][direction]
            print(f"\nTraining scale {scale} {direction} ({len(tuples)} samples)...")
            W1, b1, W2, b2 = train_mlp(tuples, epochs=args.epochs, lr=args.lr, hidden=H)
            all_weights[(scale, direction)] = (W1, b1, W2, b2)

    if args.output is None:
        args.output = os.path.join(os.path.dirname(__file__), "..", "src", "codec", "option_c_data.inc")

    generate_inc(all_weights, args.output)
    print("Training complete!")


if __name__ == "__main__":
    main()
