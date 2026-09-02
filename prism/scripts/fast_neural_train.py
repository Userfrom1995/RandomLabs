#!/usr/bin/env python3
"""
Fast neural codec training using random crops.
Uses 128x128 crops from Kodak-24 for rapid iteration.
"""

import argparse, os, sys, time, math
import numpy as np
from pathlib import Path
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim


class GDN(nn.Module):
    def __init__(self, ch):
        super().__init__()
        self.beta = nn.Parameter(torch.ones(ch) * 1.0 + 1e-6)
    def forward(self, x):
        beta = self.beta.view(1, -1, 1, 1)
        return x / torch.sqrt(beta + x**2 + 1e-6)


class IGDN(nn.Module):
    def __init__(self, ch):
        super().__init__()
        self.beta = nn.Parameter(torch.ones(ch) * 1.0 + 1e-6)
    def forward(self, x):
        beta = self.beta.view(1, -1, 1, 1)
        return x * torch.sqrt(beta + x**2 + 1e-6)


def conv3x3(a, b, s=1):
    return nn.Conv2d(a, b, 3, stride=s, padding=1)


class NeuralCodec(nn.Module):
    def __init__(self, N=64, M=64, base=64):
        super().__init__()
        self.g_a = nn.Sequential(
            conv3x3(3, base, 2), GDN(base),
            conv3x3(base, base, 1), GDN(base),
            conv3x3(base, base, 2), GDN(base),
            conv3x3(base, N, 1),
        )
        self.h_a = nn.Sequential(
            conv3x3(N, base, 1), GDN(base),
            conv3x3(base, base, 2), GDN(base),
            conv3x3(base, M, 1),
        )
        self.g_s = nn.Sequential(
            conv3x3(N, base, 1), IGDN(base),
            nn.ConvTranspose2d(base, base, 3, stride=2, padding=1, output_padding=1), IGDN(base),
            conv3x3(base, base, 1), IGDN(base),
            nn.ConvTranspose2d(base, 3, 3, stride=2, padding=1, output_padding=1),
        )
        self.h_s = nn.Sequential(
            conv3x3(M, 32, 1), nn.ReLU(inplace=True),
            conv3x3(32, 2 * N, 1),
        )

    def forward(self, x):
        y = self.g_a(x)
        y_q = torch.round(y + 0.5)
        z = self.h_a(y_q)
        z_q = torch.round(z + 0.5)
        h = self.h_s(F.interpolate(z_q, scale_factor=2, mode='nearest'))
        mu = h[:, :h.shape[1]//2]
        sigma = torch.exp(h[:, h.shape[1]//2:])
        x_hat = self.g_s(y_q)
        return x_hat, y_q, z_q, mu, sigma


def load_ppm(path):
    with open(path, 'rb') as f:
        f.readline()  # P6
        line = f.readline()
        while line.startswith(b'#'): line = f.readline()
        w, h = map(int, line.split())
        maxval = int(f.readline().strip())
        data = f.read()
    if maxval > 255:
        return np.frombuffer(data, dtype='>u2').reshape(h, w, 3)
    return np.frombuffer(data, dtype='u1').reshape(h, w, 3).astype(np.uint16) * 257


def random_crop(img, crop_h=128, crop_w=128, rng=None):
    h, w = img.shape[:2]
    if h < crop_h or w < crop_w:
        y0, x0 = 0, 0
        crop_h, crop_w = min(crop_h, h), min(crop_w, w)
    else:
        y0 = rng.integers(0, h - crop_h + 1)
        x0 = rng.integers(0, w - crop_w + 1)
    crop = img[y0:y0+crop_h, x0:x0+crop_w]
    f = crop.astype(np.float32) / 65535.0
    return torch.from_numpy(f.transpose(2, 0, 1)).unsqueeze(0)


def train_and_measure(kodak_dir, epochs=200, N=64, M=64, base=64, lr=3e-4, crops_per_img=8, crop_size=128, device='cpu'):
    ppm_files = sorted(Path(kodak_dir).glob("*.ppm"))
    n = len(ppm_files)
    print(f"Training: {n} images, N={N}, M={M}, base={base}, crop={crop_size}x{crop_size}, crops_per_img={crops_per_img}")
    print(f"Device: {device}")

    model = NeuralCodec(N, M, base).to(device)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"Model params: {n_params:,}")

    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    rng = np.random.default_rng(42)

    all_imgs = [load_ppm(str(p)) for p in ppm_files]

    best_loss = float('inf')
    for epoch in range(epochs):
        model.train()
        epoch_loss = 0
        epoch_mse = 0
        epoch_rate = 0
        t0 = time.time()
        n_steps = n * crops_per_img

        for step in range(n_steps):
            img_idx = step % n
            img = all_imgs[img_idx]
            x = random_crop(img, crop_size, crop_size, rng).to(device)

            x_hat, y_q, z_q, mu, sigma = model(x)
            mse = F.mse_loss(x_hat, x)
            upper = 0.5 * (1 + torch.erf((y_q + 0.5 - mu) / (sigma * math.sqrt(2) + 1e-10)))
            lower = 0.5 * (1 + torch.erf((y_q - 0.5 - mu) / (sigma * math.sqrt(2) + 1e-10)))
            prob = torch.clamp(upper - lower, min=1e-10)
            rate = -torch.log(prob).mean()

            loss = mse + 0.001 * rate
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            epoch_loss += loss.item()
            epoch_mse += mse.item()
            epoch_rate += rate.item()

        scheduler.step()
        dt = time.time() - t0
        avg_loss = epoch_loss / n_steps
        avg_mse = epoch_mse / n_steps
        avg_rate = epoch_rate / n_steps
        psnr = 10 * math.log10(1.0 / max(avg_mse, 1e-10))

        if avg_loss < best_loss:
            best_loss = avg_loss
            torch.save(model.state_dict(), "neural_best.pt")

        if (epoch + 1) % 10 == 0 or epoch < 3:
            print(f"  Epoch {epoch+1}/{epochs}: loss={avg_loss:.6f} mse={avg_mse:.6f} "
                  f"rate={avg_rate:.4f} psnr={psnr:.2f}dB ({dt:.1f}s)")

    print(f"\nBest loss: {best_loss:.6f}")

    # Measure on full images
    print("\n=== Measuring on full images ===")
    model.eval()
    model.load_state_dict(torch.load("neural_best.pt", map_location=device))
    results = []
    total_per_sample = 0.0

    for p, img in zip(ppm_files, all_imgs):
        h, w = img.shape[:2]
        n_samples = h * w * 3
        f = img.astype(np.float32) / 65535.0
        x = torch.from_numpy(f.transpose(2, 0, 1)).unsqueeze(0).to(device)

        with torch.no_grad():
            x_hat, y_q, z_q, mu, sigma = model(x)

        mse = F.mse_loss(x_hat, x).item()
        psnr = 10 * math.log10(1.0 / max(mse, 1e-10))

        # Per-element rate for Y_q
        upper = 0.5 * (1 + torch.erf((y_q + 0.5 - mu) / (sigma * math.sqrt(2) + 1e-10)))
        lower = 0.5 * (1 + torch.erf((y_q - 0.5 - mu) / (sigma * math.sqrt(2) + 1e-10)))
        prob = torch.clamp(upper - lower, min=1e-10)
        y_bits = (-torch.log2(prob)).mean().item()

        n_y = y_q.numel()
        n_z = z_q.numel()

        # Residual
        x_int = torch.round(x * 65535).clamp(0, 65535)
        x_hat_int = torch.round(x_hat * 65535).clamp(0, 65535)
        res = (x_int - x_hat_int).cpu().numpy().flatten().astype(np.int32)

        # Residual entropy via histogram
        hist, _ = np.histogram(res, bins=np.arange(max(res.min(), -1000), min(res.max(), 1000) + 2))
        probs = hist / hist.sum()
        probs = probs[probs > 0]
        res_ent = -np.sum(probs * np.log2(probs))

        total_bits = y_bits * n_y + 8.0 * n_z + res_ent * n_samples
        bpp = total_bits / n_samples

        results.append((p.name, bpp, psnr, y_bits, res_ent))
        total_per_sample += bpp

        print(f"  {p.name}: {bpp:.4f} bpp/sample psnr={psnr:.1f}dB y_bits={y_bits:.3f} res_ent={res_ent:.3f}")

    mean_bpp = total_per_sample / len(results)
    print(f"\n=== Summary ===")
    print(f"Mean per-sample: {mean_bpp:.4f}")
    print(f"Mean summed (x3): {mean_bpp*3:.4f}")
    print(f"M2 gate: <3.166 / <9.498 -> {'PASS' if mean_bpp < 3.166 else 'FAIL'} ({(mean_bpp-3.166)/3.166*100:+.1f}%)")
    print(f"M3 gate: <2.885 / <8.655 -> {'PASS' if mean_bpp < 2.885 else 'FAIL'} ({(mean_bpp-2.885)/2.885*100:+.1f}%)")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--kodak-dir", required=True)
    parser.add_argument("--epochs", type=int, default=200)
    parser.add_argument("--N", type=int, default=64)
    parser.add_argument("--M", type=int, default=64)
    parser.add_argument("--base", type=int, default=64)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--crops-per-img", type=int, default=8)
    parser.add_argument("--crop-size", type=int, default=128)
    args = parser.parse_args()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    train_and_measure(args.kodak_dir, args.epochs, args.N, args.M, args.base,
                      args.lr, args.crops_per_img, args.crop_size, device)
