#!/usr/bin/env python3
"""
Neural codec measurement for Prism #130.

Trains a small Ballé-style hyperprior codec in float32 on Kodak-24,
then measures the actual bitrate achievable. This gives us a theoretical
ceiling for what the C++ int8/int16 codec could achieve.

Usage:
    python3 measure_neural.py --kodak-dir prism/benchmarks/data/kodak \
        --epochs 50 --batch-size 2 --N 32 --M 32
"""

import argparse
import os
import sys
import time
import math
import numpy as np
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim


# ---------------------------------------------------------------------------
# GDN / IGDN
# ---------------------------------------------------------------------------

class GDN(nn.Module):
    def __init__(self, ch):
        super().__init__()
        self.beta = nn.Parameter(torch.ones(ch) * 1.0 + 1e-6)

    def forward(self, x):
        B, C, H, W = x.shape
        beta = self.beta.view(1, C, 1, 1)
        return x / torch.sqrt(beta + x**2 + 1e-6)

    def inverse(self, y):
        beta = self.beta.view(1, -1, 1, 1)
        return y * torch.sqrt(beta + y**2 + 1e-6)


class IGDN(nn.Module):
    def __init__(self, ch):
        super().__init__()
        self.beta = nn.Parameter(torch.ones(ch) * 1.0 + 1e-6)

    def forward(self, x):
        B, C, H, W = x.shape
        beta = self.beta.view(1, C, 1, 1)
        return x * torch.sqrt(beta + x**2 + 1e-6)

    def inverse(self, y):
        beta = self.beta.view(1, -1, 1, 1)
        return y / torch.sqrt(beta + y**2 + 1e-6)


# ---------------------------------------------------------------------------
# Networks
# ---------------------------------------------------------------------------

def conv3x3(in_ch, out_ch, stride=1):
    return nn.Conv2d(in_ch, out_ch, 3, stride=stride, padding=1)


class AnalysisNet(nn.Module):
    def __init__(self, in_ch=3, N=32):
        super().__init__()
        self.net = nn.Sequential(
            conv3x3(in_ch, 64, stride=2), GDN(64),
            conv3x3(64, 64, stride=1), GDN(64),
            conv3x3(64, 64, stride=2), GDN(64),
            conv3x3(64, N, stride=1),
        )

    def forward(self, x):
        return self.net(x)


class HyperAnalysisNet(nn.Module):
    def __init__(self, N=32, M=32):
        super().__init__()
        self.net = nn.Sequential(
            conv3x3(N, 64, stride=1), GDN(64),
            conv3x3(64, 64, stride=2), GDN(64),
            conv3x3(64, M, stride=1),
        )

    def forward(self, x):
        return self.net(x)


class SynthesisNet(nn.Module):
    def __init__(self, out_ch=3, N=32):
        super().__init__()
        self.net = nn.Sequential(
            conv3x3(N, 64, stride=1), IGDN(64),
            nn.ConvTranspose2d(64, 64, 3, stride=2, padding=1, output_padding=1), IGDN(64),
            conv3x3(64, 64, stride=1), IGDN(64),
            nn.ConvTranspose2d(64, out_ch, 3, stride=2, padding=1, output_padding=1),
        )

    def forward(self, x):
        return self.net(x)


class HyperSynthesisNet(nn.Module):
    def __init__(self, N=32, M=32):
        super().__init__()
        self.net = nn.Sequential(
            conv3x3(M, 32, stride=1), nn.ReLU(inplace=True),
            conv3x3(32, 2 * N, stride=1),
        )

    def forward(self, x):
        x = F.interpolate(x, scale_factor=2, mode='nearest')
        return self.net(x)


class NeuralCodec(nn.Module):
    def __init__(self, N=32, M=32):
        super().__init__()
        self.g_a = AnalysisNet(3, N)
        self.h_a = HyperAnalysisNet(N, M)
        self.g_s = SynthesisNet(3, N)
        self.h_s = HyperSynthesisNet(N, M)

    def encode(self, x):
        y = self.g_a(x)
        y_q = torch.round(y + 0.5)
        z = self.h_a(y_q.detach())
        z_q = torch.round(z + 0.5)
        h = self.h_s(z_q.detach())
        mu = h[:, :h.shape[1]//2, :, :]
        log_sigma = h[:, h.shape[1]//2:, :, :]
        sigma = torch.exp(log_sigma)
        return y_q, z_q, mu, sigma

    def decode(self, y_q):
        return self.g_s(y_q)

    def forward(self, x):
        y = self.g_a(x)
        y_q = torch.round(y + 0.5)
        z = self.h_a(y_q)
        z_q = torch.round(z + 0.5)
        h = self.h_s(z_q)
        mu = h[:, :h.shape[1]//2, :, :]
        log_sigma = h[:, h.shape[1]//2:, :, :]
        sigma = torch.exp(log_sigma)
        x_hat = self.g_s(y_q)
        return x_hat, y_q, z_q, mu, sigma


# ---------------------------------------------------------------------------
# Loss: rate-distortion
# ---------------------------------------------------------------------------

def gaussian_nll(y_q, mu, sigma):
    upper = 0.5 * (1 + torch.erf((y_q + 0.5 - mu) / (sigma * math.sqrt(2) + 1e-10)))
    lower = 0.5 * (1 + torch.erf((y_q - 0.5 - mu) / (sigma * math.sqrt(2) + 1e-10)))
    prob = torch.clamp(upper - lower, min=1e-10)
    return -torch.log(prob).mean()


def entropy_bits(y_q, mu, sigma):
    upper = 0.5 * (1 + torch.erf((y_q + 0.5 - mu) / (sigma * math.sqrt(2) + 1e-10)))
    lower = 0.5 * (1 + torch.erf((y_q - 0.5 - mu) / (sigma * math.sqrt(2) + 1e-10)))
    prob = torch.clamp(upper - lower, min=1e-10)
    return (-torch.log2(prob)).mean()


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_ppm(path):
    with open(path, 'rb') as f:
        magic = f.readline().strip()
        assert magic == b'P6', f"Not P6: {path}"
        line = f.readline()
        while line.startswith(b'#'):
            line = f.readline()
        w, h = map(int, line.split())
        maxval = int(f.readline().strip())
        data = f.read()
    if maxval > 255:
        pixels = np.frombuffer(data, dtype='>u2').reshape(h, w, 3)
    else:
        pixels = np.frombuffer(data, dtype='u1').reshape(h, w, 3).astype(np.uint16) * 257
    return pixels


def load_batch(paths, target_h=None, target_w=None):
    batch = []
    for p in paths:
        img = load_ppm(p)
        h, w = img.shape[:2]
        img_f = img.astype(np.float32) / 65535.0
        img_t = torch.from_numpy(img_f.transpose(2, 0, 1)).unsqueeze(0)
        batch.append(img_t)
    if len(batch) == 1:
        return batch[0]
    min_h = min(b.shape[2] for b in batch)
    min_w = min(b.shape[3] for b in batch)
    min_h = min_h - (min_h % 4)
    min_w = min_w - (min_w % 4)
    cropped = [b[:, :, :min_h, :min_w] for b in batch]
    return torch.cat(cropped, dim=0)


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train(model, kodak_dir, epochs, lr, batch_size, device, lambda_rate=0.01):
    ppm_files = sorted(Path(kodak_dir).glob("*.ppm"))
    n = len(ppm_files)
    print(f"Training on {n} images, batch_size={batch_size}, device={device}")

    params = list(model.parameters())
    optimizer = optim.Adam(params, lr=lr)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    rng = np.random.default_rng(42)

    for epoch in range(epochs):
        perm = rng.permutation(n)
        steps_per_epoch = max(1, n // batch_size)
        epoch_loss = 0
        epoch_mse = 0
        epoch_rate = 0
        t0 = time.time()

        for step in range(steps_per_epoch):
            idx = perm[step * batch_size : (step + 1) * batch_size]
            batch_paths = [ppm_files[i] for i in idx]
            x = load_batch(batch_paths).to(device)

            x_hat, y_q, z_q, mu, sigma = model(x)

            mse = F.mse_loss(x_hat, x)
            rate = gaussian_nll(y_q, mu, sigma)
            loss = mse + lambda_rate * rate

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            epoch_loss += loss.item()
            epoch_mse += mse.item()
            epoch_rate += rate.item()

        scheduler.step()
        dt = time.time() - t0
        avg_loss = epoch_loss / max(steps_per_epoch, 1)
        avg_mse = epoch_mse / max(steps_per_epoch, 1)
        avg_rate = epoch_rate / max(steps_per_epoch, 1)

        if (epoch + 1) % 5 == 0 or epoch == 0:
            psnr = 10 * math.log10(1.0 / max(avg_mse, 1e-10))
            print(f"  Epoch {epoch+1}/{epochs}: loss={avg_loss:.6f} mse={avg_mse:.6f} "
                  f"rate={avg_rate:.4f} nats psnr={psnr:.2f}dB ({dt:.1f}s)")

    return model


# ---------------------------------------------------------------------------
# Measurement
# ---------------------------------------------------------------------------

@torch.no_grad()
def measure(model, kodak_dir, device):
    ppm_files = sorted(Path(kodak_dir).glob("*.ppm"))
    results = []
    total_summed = 0.0
    total_samples = 0

    print(f"\nMeasuring on {len(ppm_files)} images...")

    for p in ppm_files:
        img = load_ppm(p)
        h, w = img.shape[:2]
        n_samples = h * w * 3

        img_f = img.astype(np.float32) / 65535.0
        x = torch.from_numpy(img_f.transpose(2, 0, 1)).unsqueeze(0).to(device)

        x_hat, y_q, z_q, mu, sigma = model(x)

        # Verify lossless (or near-lossless for measurement)
        mse = F.mse_loss(x_hat, x).item()
        psnr = 10 * math.log10(1.0 / max(mse, 1e-10))

        # Rate: entropy of Y_q under Gaussian(mu, sigma) + entropy of Z_q
        y_rate = entropy_bits(y_q, mu, sigma).item()
        z_rate = 8.0  # naive: int8 uniform (upper bound for Z_q)
        # Residual: H(R) where R = round(X * 65535) - round(X_hat * 65535)
        x_int = torch.round(x * 65535).clamp(0, 65535)
        x_hat_int = torch.round(x_hat * 65535).clamp(0, 65535)
        residual = (x_int - x_hat_int).float()

        # Residual entropy (measured via histogram)
        res_np = residual.cpu().numpy().flatten().astype(np.int32)
        hist, _ = np.histogram(res_np, bins=np.arange(res_np.min(), res_np.max() + 2))
        probs = hist / hist.sum()
        probs = probs[probs > 0]
        res_entropy = -np.sum(probs * np.log2(probs))

        # Total bpp = (Y_rate * n_y + Z_rate * n_z + res_entropy * n_res) / n_samples
        n_y = y_q.numel()
        n_z = z_q.numel()
        n_res = residual.numel()
        total_bits = y_rate * n_y + z_rate * n_z + res_entropy * n_res
        bpp = total_bits / n_samples
        summed_bpp = bpp * 3  # for C=3

        results.append({
            'image': p.name,
            'bpp': bpp,
            'summed_bpp': summed_bpp,
            'y_rate': y_rate,
            'res_entropy': res_entropy,
            'psnr': psnr,
            'n_samples': n_samples,
        })
        total_summed += summed_bpp
        total_samples += 1

        status = "OK" if psnr > 40 else "LOW PSNR"
        print(f"  {p.name}: {bpp:.4f} bpp/sample, {summed_bpp:.4f} summed, "
              f"y_rate={y_rate:.3f} res_ent={res_entropy:.3f} psnr={psnr:.1f}dB [{status}]")

    mean_bpp = total_summed / total_samples
    print(f"\n--- Summary ---")
    print(f"Mean per-sample bpp: {mean_bpp:.4f}")
    print(f"Mean summed bpp (x3): {mean_bpp * 3:.4f}")
    print(f"M2 gate: per-sample < 3.166, summed < 9.498")
    print(f"M3 gate: per-sample < 2.885, summed < 8.655")
    m2_pass = mean_bpp < 3.166 and (mean_bpp * 3) < 9.498
    m3_pass = mean_bpp < 2.885 and (mean_bpp * 3) < 8.655
    print(f"M2: {'PASS' if m2_pass else 'FAIL'}")
    print(f"M3: {'PASS' if m3_pass else 'FAIL'}")

    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Neural codec measurement for #130")
    parser.add_argument("--kodak-dir", required=True)
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument("--N", type=int, default=32, help="Latent channels")
    parser.add_argument("--M", type=int, default=32, help="Hyper-latent channels")
    parser.add_argument("--lr", type=float, default=5e-4)
    parser.add_argument("--lambda-rate", type=float, default=0.01)
    parser.add_argument("--device", default=None)
    parser.add_argument("--resume", default=None, help="Resume from checkpoint")
    parser.add_argument("--measure-only", action="store_true", help="Skip training, measure only")
    args = parser.parse_args()

    device = torch.device(args.device or ("cuda" if torch.cuda.is_available() else "cpu"))
    print(f"Device: {device}")
    print(f"Architecture: N={args.N}, M={args.M}")

    model = NeuralCodec(args.N, args.M).to(device)

    if args.resume:
        model.load_state_dict(torch.load(args.resume, map_location=device))
        print(f"Resumed from {args.resume}")

    if not args.measure_only:
        model = train(model, args.kodak_dir, args.epochs, args.lr,
                      args.batch_size, device, args.lambda_rate)
        save_path = "neural_codec_trained.pt"
        torch.save(model.state_dict(), save_path)
        print(f"Saved to {save_path}")

    results = measure(model, args.kodak_dir, device)
    return results


if __name__ == "__main__":
    main()
