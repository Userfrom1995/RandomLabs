#!/usr/bin/env python3
"""
Train the Prism neural codec (E1, issue #226).

Three-phase training protocol:
  Phase 1: Pre-train analysis (g_a) + synthesis (g_s) on MSE reconstruction.
  Phase 2: Train hyper-analysis (h_a) + hyper-synthesis (h_s) on entropy model.
  Phase 3: Joint fine-tune all networks with L = H(Y_q) + H(R|Y_q).

Architecture (Ballé/L3C style):
  g_a: HxWxC -> H/4 x W/4 x N (analysis, 4 conv layers with GDN)
  h_a: H/4 x W/4 x N -> H/8 x W/8 x M (hyper-analysis, 3 conv layers with GDN)
  g_s: H/4 x W/4 x N -> HxWxC (synthesis, mirror of g_a with IGDN)
  h_s: H/8 x W/8 x M -> H/4 x W/4 x 2N (hyper-synthesis, scale+bias)

Quantization: Y_q = round(Y + 0.5), Z_q = round(Z + 0.5)
Lossless round-trip: R = X - g_s(Y_q) coded with rANS.

Usage:
    python3 train_neural_codec.py --data-dir /tmp/neural_train --output-dir /tmp/neural_weights \\
        --epochs-phase1 100 --epochs-phase2 50 --epochs-phase3 200

Requires: numpy, torch (CPU or CUDA).
"""

import argparse
import os
import struct
import sys
import json
import time
import numpy as np
from pathlib import Path

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    import torch.optim as optim
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    print("WARNING: PyTorch not found. Install with: pip install torch", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# GDN / IGDN layers (Ballé et al., 2018)
# ---------------------------------------------------------------------------

class GDN(nn.Module):
    """Generalized Divisive Normalization."""
    def __init__(self, num_channels, beta_min=1e-6):
        super().__init__()
        self.num_channels = num_channels
        self.beta = nn.Parameter(torch.ones(num_channels) + beta_min)
        self.gamma = nn.Parameter(torch.eye(num_channels))

    def forward(self, x):
        # x: (B, C, H, W)
        B, C, H, W = x.shape
        # beta: (C,)
        beta = self.beta.view(1, C, 1, 1)
        # gamma: (C, C)
        gamma = self.gamma.view(C, C, 1, 1)
        # normalized = gamma @ x, then divide by sqrt(beta + sum((gamma @ x)^2))
        # For efficiency: just do element-wise with pre-computed
        norm = torch.sqrt(beta + F.conv2d(x**2, gamma.view(C, C, 1, 1), padding=0, groups=1)[:, :, :H, :W])
        # Pad gamma if needed
        if gamma.shape[1] != C:
            gamma = nn.Parameter(torch.eye(C, device=x.device))
        norm = torch.sqrt(beta + F.conv2d(x**2, torch.eye(C, device=x.device).unsqueeze(2).unsqueeze(3), padding=0, groups=1))
        return x / (norm + 1e-6)

    def inverse(self, y):
        """Approximate inverse GDN (IGDN)."""
        B, C, H, W = y.shape
        beta = self.beta.view(1, C, 1, 1)
        gamma = self.gamma.view(C, C, 1, 1)
        norm = torch.sqrt(beta + F.conv2d(y**2, torch.eye(C, device=y.device).unsqueeze(2).unsqueeze(3), padding=0, groups=1))
        return y * norm


class GDN1(nn.Module):
    """GDN with identity gamma (simplified, for inference speed)."""
    def __init__(self, num_channels):
        super().__init__()
        self.beta = nn.Parameter(torch.ones(num_channels) * 1.0 + 1e-6)

    def forward(self, x):
        B, C, H, W = x.shape
        beta = self.beta.view(1, C, 1, 1)
        norm = torch.sqrt(beta + x**2)
        return x / (norm + 1e-6)

    def inverse(self, y):
        beta = self.beta.view(1, -1, 1, 1)
        norm = torch.sqrt(beta + y**2)
        return y * norm


# ---------------------------------------------------------------------------
# Network architectures
# ---------------------------------------------------------------------------

def conv3x3(in_ch, out_ch, stride=1):
    """3x3 convolution with proper padding."""
    return nn.Conv2d(in_ch, out_ch, 3, stride=stride, padding=1)


class AnalysisNet(nn.Module):
    """g_a: HxWxC -> H/4 x W/4 x N."""
    def __init__(self, in_ch=3, N=192):
        super().__init__()
        self.net = nn.Sequential(
            conv3x3(in_ch, 128, stride=2), GDN1(128),
            conv3x3(128, 128, stride=1), GDN1(128),
            conv3x3(128, 128, stride=2), GDN1(128),
            conv3x3(128, N, stride=1),
        )

    def forward(self, x):
        return self.net(x)


class HyperAnalysisNet(nn.Module):
    """h_a: H/4 x W/4 x N -> H/8 x W/8 x M."""
    def __init__(self, N=192, M=192):
        super().__init__()
        self.net = nn.Sequential(
            conv3x3(N, 128, stride=1), GDN1(128),
            conv3x3(128, 128, stride=2), GDN1(128),
            conv3x3(128, M, stride=1),
        )

    def forward(self, x):
        return self.net(x)


class SynthesisNet(nn.Module):
    """g_s: H/4 x W/4 x N -> HxWxC."""
    def __init__(self, out_ch=3, N=192):
        super().__init__()
        self.net = nn.Sequential(
            conv3x3(N, 128, stride=1), GDN1(128),
            nn.ConvTranspose2d(128, 128, 3, stride=2, padding=1, output_padding=1), GDN1(128),
            conv3x3(128, 128, stride=1), GDN1(128),
            nn.ConvTranspose2d(128, out_ch, 3, stride=2, padding=1, output_padding=1),
        )

    def forward(self, x):
        return self.net(x)


class HyperSynthesisNet(nn.Module):
    """h_s: H/8 x W/8 x M -> H/4 x W/4 x 2N (scale, bias)."""
    def __init__(self, N=192, M=192):
        super().__init__()
        self.net = nn.Sequential(
            conv3x3(M, 32, stride=1), nn.ReLU(inplace=True),
            conv3x3(32, 2 * N, stride=1),
        )

    def forward(self, x):
        return self.net(x)


# ---------------------------------------------------------------------------
# Entropy model (conditional Gaussian)
# ---------------------------------------------------------------------------

def gaussian_entropy_loss(y_q, sigma):
    """Negative log-likelihood of rounded Gaussian for integer y_q.
    
    sigma: (B, C, H, W) per-channel scale from hyper-synthesis.
    y_q: (B, C, H, W) quantized latent.
    """
    # p(y_q) = Phi(y_q + 0.5) - Phi(y_q - 0.5) for each element
    # Using the "rounded Gaussian" model
    upper = 0.5 * (1 + torch.erf((y_q + 0.5 - 0) / (sigma * np.sqrt(2) + 1e-10)))
    lower = 0.5 * (1 + torch.erf((y_q - 0.5 - 0) / (sigma * np.sqrt(2) + 1e-10)))
    prob = torch.clamp(upper - lower, min=1e-10)
    nll = -torch.log(prob)
    return nll.mean()


# ---------------------------------------------------------------------------
# Training data loader
# ---------------------------------------------------------------------------

def load_ppm_batch(paths, augment=True, rng=None):
    """Load a batch of PPM files as torch tensors."""
    batch = []
    for p in paths:
        img = load_ppm_u16(p)
        if augment and rng is not None:
            img = augment_ppm(img, rng)
        # To float32 [0, 1]
        img_f = img.astype(np.float32) / 65535.0
        # HWC -> CHW
        img_t = torch.from_numpy(img_f.transpose(2, 0, 1)).unsqueeze(0)
        batch.append(img_t)
    return torch.cat(batch, dim=0)


def load_ppm_u16(path):
    """Load PPM P6 uint16 as HWC uint16."""
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


def augment_ppm(img, rng):
    """Augment uint16 HWC image."""
    # Random horizontal flip
    if rng.random() < 0.5:
        img = img[:, ::-1, :].copy()
    # Random vertical flip
    if rng.random() < 0.5:
        img = img[::-1, :, :].copy()
    # Random 90-degree rotation
    k = rng.integers(0, 4)
    if k > 0:
        img = np.rot90(img, k, axes=(0, 1)).copy()
    # Random crop to 256x256 if larger
    if img.shape[0] > 256 and img.shape[1] > 256:
        y0 = rng.integers(0, img.shape[0] - 256)
        x0 = rng.integers(0, img.shape[1] - 256)
        img = img[y0:y0+256, x0:x0+256, :].copy()
    # Small color jitter
    jitter = rng.integers(-300, 301, size=img.shape, dtype=np.int32)
    img = np.clip(img.astype(np.int32) + jitter, 0, 65535).astype(np.uint16)
    return img


# ---------------------------------------------------------------------------
# Quantization (straight-through estimator)
# ---------------------------------------------------------------------------

def quantize_with_ste(x):
    """Round-to-integer with straight-through estimator."""
    x_floor = torch.floor(x)
    diff = x - x_floor
    # Forward: round(x + 0.5)
    y = torch.round(x + 0.5)
    # Straight-through: gradient passes through as if no rounding
    return y + (x - (x - 0.5).round())  # STE approximation


def quantize(x):
    """Integer quantization: y = round(x + 0.5)."""
    return torch.round(x + 0.5)


# ---------------------------------------------------------------------------
# Full model
# ---------------------------------------------------------------------------

class NeuralCodec(nn.Module):
    """Full neural codec: g_a -> quantize -> h_a -> quantize -> h_s -> g_s."""
    def __init__(self, N=192, M=192):
        super().__init__()
        self.g_a = AnalysisNet(3, N)
        self.h_a = HyperAnalysisNet(N, M)
        self.g_s = SynthesisNet(3, N)
        self.h_s = HyperSynthesisNet(N, M)

    def encode(self, x):
        """Encode: x -> Y_q, Z_q, sigma."""
        y = self.g_a(x)           # (B, N, H/4, W/4)
        y_q = quantize(y)         # quantize latent
        z = self.h_a(y_q)         # (B, M, H/8, W/8)
        z_q = quantize(z)         # quantize hyper-latent
        # sigma from hyper-synthesis
        h = self.h_s(z_q)         # (B, 2N, H/4, W/4)
        sigma = torch.exp(h[:, :h.shape[1]//2, :, :])  # positive scale
        return y_q, z_q, sigma

    def decode(self, y_q):
        """Decode: Y_q -> X_hat."""
        return self.g_s(y_q)

    def forward(self, x):
        """Full forward: encode + decode."""
        y_q, z_q, sigma = self.encode(x)
        x_hat = self.decode(y_q)
        return x_hat, y_q, z_q, sigma


# ---------------------------------------------------------------------------
# Loss functions
# ---------------------------------------------------------------------------

def reconstruction_loss(x, x_hat):
    """MSE reconstruction loss."""
    return F.mse_loss(x, x_hat)


def rate_loss(y_q, sigma):
    """Entropy rate loss: negative log-likelihood of rounded Gaussian."""
    return gaussian_entropy_loss(y_q, sigma)


def total_loss(x, x_hat, y_q, sigma, lambda_rate=1.0):
    """L = MSE + lambda * H(Y_q)."""
    mse = reconstruction_loss(x, x_hat)
    rate = rate_loss(y_q, sigma)
    return mse + lambda_rate * rate, mse, rate


# ---------------------------------------------------------------------------
# Training phases
# ---------------------------------------------------------------------------

def train_phase1(model, data_dir, epochs, lr, batch_size, device, save_dir):
    """Phase 1: Pre-train g_a + g_s on MSE reconstruction (h_a, h_s frozen)."""
    print(f"\n=== Phase 1: Pre-train g_a + g_s (MSE) ===")
    print(f"  Epochs: {epochs}, LR: {lr}, Batch: {batch_size}")

    # Freeze h_a, h_s
    for p in model.h_a.parameters():
        p.requires_grad = False
    for p in model.h_s.parameters():
        p.requires_grad = False

    params = list(model.g_a.parameters()) + list(model.g_s.parameters())
    optimizer = optim.Adam(params, lr=lr)

    ppm_files = sorted(Path(data_dir).glob("*.ppm"))
    if not ppm_files:
        print("ERROR: No PPM files found in", data_dir)
        return

    rng = np.random.default_rng(42)
    n = len(ppm_files)
    steps_per_epoch = max(1, n // batch_size)

    for epoch in range(epochs):
        epoch_loss = 0.0
        perm = rng.permutation(n)
        t0 = time.time()

        for step in range(steps_per_epoch):
            idx = perm[step * batch_size : (step + 1) * batch_size]
            batch_paths = [ppm_files[i] for i in idx]
            x = load_ppm_batch(batch_paths, augment=True, rng=rng).to(device)

            x_hat, y_q, _, sigma = model(x)
            loss, mse, rate = total_loss(x, x_hat, y_q, sigma, lambda_rate=0.0)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()

        dt = time.time() - t0
        avg = epoch_loss / max(steps_per_epoch, 1)
        print(f"  Epoch {epoch+1}/{epochs}: loss={avg:.6f} ({dt:.1f}s)")

        if (epoch + 1) % 10 == 0:
            save_path = os.path.join(save_dir, f"phase1_epoch{epoch+1}.pt")
            torch.save(model.state_dict(), save_path)

    save_path = os.path.join(save_dir, "phase1_final.pt")
    torch.save(model.state_dict(), save_path)
    print(f"  Phase 1 complete. Saved to {save_path}")


def train_phase2(model, data_dir, epochs, lr, batch_size, device, save_dir):
    """Phase 2: Train h_a + h_s on entropy (g_a, g_s frozen)."""
    print(f"\n=== Phase 2: Train h_a + h_s (entropy) ===")
    print(f"  Epochs: {epochs}, LR: {lr}, Batch: {batch_size}")

    # Freeze g_a, g_s
    for p in model.g_a.parameters():
        p.requires_grad = False
    for p in model.g_s.parameters():
        p.requires_grad = False
    # Unfreeze h_a, h_s
    for p in model.h_a.parameters():
        p.requires_grad = True
    for p in model.h_s.parameters():
        p.requires_grad = True

    params = list(model.h_a.parameters()) + list(model.h_s.parameters())
    optimizer = optim.Adam(params, lr=lr)

    ppm_files = sorted(Path(data_dir).glob("*.ppm"))
    rng = np.random.default_rng(42)
    n = len(ppm_files)
    steps_per_epoch = max(1, n // batch_size)

    for epoch in range(epochs):
        epoch_loss = 0.0
        perm = rng.permutation(n)
        t0 = time.time()

        for step in range(steps_per_epoch):
            idx = perm[step * batch_size : (step + 1) * batch_size]
            batch_paths = [ppm_files[i] for i in idx]
            x = load_ppm_batch(batch_paths, augment=True, rng=rng).to(device)

            y = model.g_a(x)
            y_q = quantize(y)
            z = model.h_a(y_q)
            z_q = quantize(z)
            h = model.h_s(z_q)
            sigma = torch.exp(h[:, :h.shape[1]//2, :, :])

            loss = gaussian_entropy_loss(y_q, sigma)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()

        dt = time.time() - t0
        avg = epoch_loss / max(steps_per_epoch, 1)
        print(f"  Epoch {epoch+1}/{epochs}: entropy_loss={avg:.6f} ({dt:.1f}s)")

        if (epoch + 1) % 10 == 0:
            save_path = os.path.join(save_dir, f"phase2_epoch{epoch+1}.pt")
            torch.save(model.state_dict(), save_path)

    save_path = os.path.join(save_dir, "phase2_final.pt")
    torch.save(model.state_dict(), save_path)
    print(f"  Phase 2 complete. Saved to {save_path}")


def train_phase3(model, data_dir, epochs, lr, batch_size, device, save_dir, lambda_rate=1.0):
    """Phase 3: Joint fine-tune all networks with L = H(Y_q) + H(R|Y_q)."""
    print(f"\n=== Phase 3: Joint fine-tune (rate-distortion) ===")
    print(f"  Epochs: {epochs}, LR: {lr}, Batch: {batch_size}, lambda: {lambda_rate}")

    # Unfreeze all
    for p in model.parameters():
        p.requires_grad = True

    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    ppm_files = sorted(Path(data_dir).glob("*.ppm"))
    rng = np.random.default_rng(42)
    n = len(ppm_files)
    steps_per_epoch = max(1, n // batch_size)

    best_loss = float('inf')

    for epoch in range(epochs):
        epoch_loss = 0.0
        epoch_mse = 0.0
        epoch_rate = 0.0
        perm = rng.permutation(n)
        t0 = time.time()

        for step in range(steps_per_epoch):
            idx = perm[step * batch_size : (step + 1) * batch_size]
            batch_paths = [ppm_files[i] for i in idx]
            x = load_ppm_batch(batch_paths, augment=True, rng=rng).to(device)

            x_hat, y_q, _, sigma = model(x)
            loss, mse, rate = total_loss(x, x_hat, y_q, sigma, lambda_rate)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
            epoch_mse += mse.item()
            epoch_rate += rate.item()

        scheduler.step()
        dt = time.time() - t0
        avg = epoch_loss / max(steps_per_epoch, 1)
        avg_mse = epoch_mse / max(steps_per_epoch, 1)
        avg_rate = epoch_rate / max(steps_per_epoch, 1)
        print(f"  Epoch {epoch+1}/{epochs}: loss={avg:.6f} mse={avg_mse:.6f} rate={avg_rate:.6f} lr={scheduler.get_last_lr()[0]:.6f} ({dt:.1f}s)")

        if avg < best_loss:
            best_loss = avg
            save_path = os.path.join(save_dir, "phase3_best.pt")
            torch.save(model.state_dict(), save_path)

        if (epoch + 1) % 20 == 0:
            save_path = os.path.join(save_dir, f"phase3_epoch{epoch+1}.pt")
            torch.save(model.state_dict(), save_path)

    save_path = os.path.join(save_dir, "phase3_final.pt")
    torch.save(model.state_dict(), save_path)
    print(f"  Phase 3 complete. Best loss: {best_loss:.6f}. Saved to {save_path}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Train Prism neural codec (E1)")
    parser.add_argument("--data-dir", required=True, help="Directory with training PPM files")
    parser.add_argument("--output-dir", required=True, help="Output directory for checkpoints")
    parser.add_argument("--N", type=int, default=192, help="Latent channels")
    parser.add_argument("--M", type=int, default=192, help="Hyper-latent channels")
    parser.add_argument("--batch-size", type=int, default=4, help="Batch size")
    parser.add_argument("--epochs-phase1", type=int, default=100, help="Phase 1 epochs")
    parser.add_argument("--epochs-phase2", type=int, default=50, help="Phase 2 epochs")
    parser.add_argument("--epochs-phase3", type=int, default=200, help="Phase 3 epochs")
    parser.add_argument("--lr-phase1", type=float, default=1e-3, help="Phase 1 learning rate")
    parser.add_argument("--lr-phase2", type=float, default=1e-4, help="Phase 2 learning rate")
    parser.add_argument("--lr-phase3", type=float, default=1e-4, help="Phase 3 learning rate")
    parser.add_argument("--lambda-rate", type=float, default=1.0, help="Rate-distortion trade-off")
    parser.add_argument("--phase", type=int, default=0, help="Start from phase N (0=all, 1=skip p1, 2=skip p1+p2)")
    parser.add_argument("--checkpoint", default=None, help="Resume from checkpoint")
    parser.add_argument("--device", default=None, help="Device (cuda/cpu)")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    device = torch.device(args.device if args.device else ("cuda" if torch.cuda.is_available() else "cpu"))
    print(f"Device: {device}")

    model = NeuralCodec(args.N, args.M).to(device)

    if args.checkpoint:
        print(f"Loading checkpoint: {args.checkpoint}")
        model.load_state_dict(torch.load(args.checkpoint, map_location=device))

    # Phase 1
    if args.phase <= 0:
        train_phase1(model, args.data_dir, args.epochs_phase1, args.lr_phase1,
                      args.batch_size, device, args.output_dir)

    # Phase 2
    if args.phase <= 1:
        # Load phase 1 result if not starting from it
        if args.phase == 1 and not args.checkpoint:
            p1_path = os.path.join(args.output_dir, "phase1_final.pt")
            if os.path.exists(p1_path):
                model.load_state_dict(torch.load(p1_path, map_location=device))
        train_phase2(model, args.data_dir, args.epochs_phase2, args.lr_phase2,
                      args.batch_size, device, args.output_dir)

    # Phase 3
    if args.phase <= 2:
        if args.phase == 2 and not args.checkpoint:
            p2_path = os.path.join(args.output_dir, "phase2_final.pt")
            if os.path.exists(p2_path):
                model.load_state_dict(torch.load(p2_path, map_location=device))
        train_phase3(model, args.data_dir, args.epochs_phase3, args.lr_phase3,
                      args.batch_size, device, args.output_dir, args.lambda_rate)

    print("\nTraining complete!")
    print(f"Final model: {os.path.join(args.output_dir, 'phase3_final.pt')}")


if __name__ == "__main__":
    main()
