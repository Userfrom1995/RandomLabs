#!/usr/bin/env python3
"""
Evaluate neural codec on Kodak-24 dataset.

Measures reconstruction quality, entropy rate, and integration with
bench_gate.sh for milestone gates M2/M3.

Usage:
    python3 eval_neural_codec.py --kodak-dir path/to/kodak --checkpoint model.pt
    python3 eval_neural_codec.py --kodak-dir path/to/kodak --checkpoint model.pt --csv results.csv

Output: per-image CSV with (image, bytes, bpp) and aggregate statistics.
"""

import argparse
import csv
import os
import struct
import sys
import time
import numpy as np
from pathlib import Path

try:
    import torch
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

try:
    sys.path.insert(0, os.path.dirname(__file__))
    from train_neural_codec import NeuralCodec, load_ppm_u16, quantize
    HAS_MODEL = True
except ImportError:
    HAS_MODEL = False


def load_ppm_as_tensor(path):
    """Load PPM as float32 torch tensor [1, C, H, W] in [0, 1]."""
    img = load_ppm_u16(path)
    img_f = img.astype(np.float32) / 65535.0
    img_t = torch.from_numpy(img_f.transpose(2, 0, 1)).unsqueeze(0)
    return img_t, img


def measure_entropy(y_q, sigma):
    """Measure entropy H(Y_q) in bits per element using rounded Gaussian model."""
    upper = 0.5 * (1 + torch.erf((y_q + 0.5) / (sigma * np.sqrt(2) + 1e-10)))
    lower = 0.5 * (1 + torch.erf((y_q - 0.5) / (sigma * np.sqrt(2) + 1e-10)))
    prob = torch.clamp(upper - lower, min=1e-10)
    nll = -torch.log2(prob)
    return nll.mean().item()


def evaluate_single(model, ppm_path, device):
    """Evaluate neural codec on a single image."""
    x_tensor, x_orig = load_ppm_as_tensor(ppm_path)
    x_tensor = x_tensor.to(device)

    with torch.no_grad():
        y_q, z_q, sigma = model.encode(x_tensor)
        x_hat = model.decode(y_q)

    # MSE
    mse = torch.mean((x_tensor - x_hat) ** 2).item()

    # Entropy rate (bits per latent element)
    entropy = measure_entropy(y_q, sigma)

    # Residual: R = X - g_s(Y_q)
    # For lossless: we'd code R with rANS. For now, measure R entropy.
    residual = (x_tensor * 65535 - x_hat * 65535).round()
    residual_flat = residual.flatten().cpu().numpy()
    # Simple entropy estimate of residual
    unique, counts = np.unique(residual_flat.astype(np.int32), return_counts=True)
    probs = counts / counts.sum()
    residual_entropy = -np.sum(probs * np.log2(probs + 1e-10))

    # Total estimated bits
    n_latent = y_q.numel()
    n_residual = residual.numel()
    latent_bits = entropy * n_latent
    residual_bits = residual_entropy * n_residual
    total_bits = latent_bits + residual_bits

    # Bytes (rounded up)
    total_bytes = int(np.ceil(total_bits / 8))

    h, w = x_orig.shape[:2]
    bpp = total_bits / (h * w * 3)  # bits per pixel

    return {
        'mse': mse,
        'entropy': entropy,
        'residual_entropy': residual_entropy,
        'total_bytes': total_bytes,
        'bpp': bpp,
        'h': h,
        'w': w,
    }


def main():
    parser = argparse.ArgumentParser(description="Evaluate neural codec on Kodak-24")
    parser.add_argument("--kodak-dir", required=True, help="Path to Kodak PPM directory")
    parser.add_argument("--checkpoint", required=True, help="PyTorch checkpoint path")
    parser.add_argument("--csv", default=None, help="Output CSV path")
    parser.add_argument("--N", type=int, default=192)
    parser.add_argument("--M", type=int, default=192)
    parser.add_argument("--device", default=None)
    args = parser.parse_args()

    if not HAS_TORCH:
        print("ERROR: PyTorch required", file=sys.stderr)
        sys.exit(1)
    if not HAS_MODEL:
        print("ERROR: train_neural_codec.py not found", file=sys.stderr)
        sys.exit(1)

    device = torch.device(args.device if args.device else ("cuda" if torch.cuda.is_available() else "cpu"))
    print(f"Device: {device}")

    # Load model
    model = NeuralCodec(args.N, args.M).to(device)
    checkpoint = torch.load(args.checkpoint, map_location=device)
    model.load_state_dict(checkpoint)
    model.eval()
    print(f"Loaded checkpoint: {args.checkpoint}")

    # Find Kodak images
    kodak_path = Path(args.kodak_dir)
    ppm_files = sorted(kodak_path.glob("*.ppm"))
    if not ppm_files:
        ppm_files = sorted(kodak_path.glob("kodim*.ppm"))
    if not ppm_files:
        print(f"ERROR: No PPM files in {args.kodak_dir}")
        sys.exit(1)

    print(f"Found {len(ppm_files)} Kodak images")

    results = []
    total_bytes = 0
    total_pixels = 0
    total_mse = 0.0
    t0 = time.time()

    for ppm in ppm_files:
        try:
            result = evaluate_single(model, ppm, device)
            result['image'] = ppm.name
            results.append(result)
            total_bytes += result['total_bytes']
            total_pixels += result['h'] * result['w'] * 3
            total_mse += result['mse']
            print(f"  {ppm.name}: {result['total_bytes']} bytes, {result['bpp']:.4f} bpp, MSE={result['mse']:.6f}")
        except Exception as e:
            print(f"  ERROR {ppm.name}: {e}")

    dt = time.time() - t0
    n = len(results)
    if n == 0:
        print("ERROR: No images evaluated")
        sys.exit(1)

    avg_bpp = total_bytes * 8 / total_pixels
    sum_bpp = sum(r['bpp'] for r in results)
    avg_mse = total_mse / n

    print(f"\n=== Results ===")
    print(f"Images evaluated: {n}")
    print(f"Total bytes: {total_bytes}")
    print(f"Average bpp: {avg_bpp:.4f}")
    print(f"Sum bpp: {sum_bpp:.4f}")
    print(f"Average MSE: {avg_mse:.6f}")
    print(f"Time: {dt:.1f}s")

    # Gate checks
    print(f"\n=== Gate Checks ===")
    m2_sum = sum_bpp
    m2_per = avg_bpp
    print(f"M2 (target < 9.498 sum, < 3.166 per): sum={m2_sum:.4f} {'PASS' if m2_sum < 9.498 else 'FAIL'}, per={m2_per:.4f} {'PASS' if m2_per < 3.166 else 'FAIL'}")
    print(f"M3 (target < 8.655 sum, < 2.885 per): sum={m2_sum:.4f} {'PASS' if m2_sum < 8.655 else 'FAIL'}, per={m2_per:.4f} {'PASS' if m2_per < 2.885 else 'FAIL'}")

    # Write CSV
    if args.csv:
        with open(args.csv, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['image', 'bytes', 'bpp', 'mse'])
            for r in results:
                writer.writerow([r['image'], r['total_bytes'], f"{r['bpp']:.6f}", f"{r['mse']:.6f}"])
            writer.writerow(['TOTAL', total_bytes, f"{sum_bpp:.6f}", f"{avg_mse:.6f}"])
        print(f"\nCSV written to {args.csv}")


if __name__ == "__main__":
    main()
