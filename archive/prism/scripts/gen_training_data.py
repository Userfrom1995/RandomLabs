#!/usr/bin/env python3
"""
Procedural training data generator for the Prism neural codec (E1, issue #226).

Generates ~100K 256x256 uint16 RGB patches on-the-fly from procedural textures,
synthetic images, and augmented patterns. No external dependencies beyond NumPy.

Usage:
    python3 gen_training_data.py --output-dir /tmp/neural_train --num-patches 100000
    python3 gen_training_data.py --output-dir /tmp/neural_train --num-patches 100000 --seed 42

Output: uint16 RGB PPM files (P6, maxval 65535) in --output-dir.

The generator never uses Kodak images (those are reserved for measurement/gates).
"""

import argparse
import os
import struct
import sys
import numpy as np
from pathlib import Path


def perlin_noise_2d(shape, res, seed=None):
    """Generate 2D Perlin noise at given resolution."""
    rng = np.random.RandomState(seed)
    h, w = shape
    # Generate gradient grid
    angles = 2 * np.pi * rng.rand(res[0]+1, res[1]+1)
    grad_x = np.cos(angles)
    grad_y = np.sin(angles)
    # Compute fractional positions
    yy, xx = np.mgrid[0:h, 0:w]
    # Scale to grid coordinates
    fx = xx * res[1] / w
    fy = yy * res[0] / h
    # Integer grid cell
    ix = fx.astype(int)
    iy = fy.astype(int)
    # Fractional part within cell
    tx = fx - ix
    ty = fy - iy
    # Quintic interpolation
    tx5 = 6*tx**5 - 15*tx**4 + 10*tx**3
    ty5 = 6*ty**5 - 15*ty**4 + 10*ty**3
    # Clamp indices
    ix = np.clip(ix, 0, res[0]-1)
    iy = np.clip(iy, 0, res[1]-1)
    # Dot products at four corners
    n00 = (tx * grad_x[iy, ix] + ty * grad_y[iy, ix])
    n10 = ((tx-1) * grad_x[iy, np.clip(ix+1, 0, res[0])] + ty * grad_y[iy, np.clip(ix+1, 0, res[0])])
    n01 = (tx * grad_x[np.clip(iy+1, 0, res[1]), ix] + (ty-1) * grad_y[np.clip(iy+1, 0, res[1]), ix])
    n11 = ((tx-1) * grad_x[np.clip(iy+1, 0, res[1]), np.clip(ix+1, 0, res[0])] +
           (ty-1) * grad_y[np.clip(iy+1, 0, res[1]), np.clip(ix+1, 0, res[0])])
    # Bilinear interpolation
    nx0 = n00 * (1 - tx5) + n10 * tx5
    nx1 = n01 * (1 - tx5) + n11 * tx5
    return np.sqrt(2) * (nx0 * (1 - ty5) + nx1 * ty5)


def fractal_noise_2d(shape, octaves=6, seed=None):
    """Generate fractal Brownian motion noise."""
    noise = np.zeros(shape, dtype=np.float64)
    rng = np.random.RandomState(seed)
    for i in range(octaves):
        freq = 2**i
        amp = 0.5**i
        res = (max(4, shape[0]//freq), max(4, shape[1]//freq))
        noise += amp * perlin_noise_2d(shape, res, seed=rng.randint(0, 2**31))
    # Normalize to [0, 1]
    noise = (noise - noise.min()) / (noise.max() - noise.min() + 1e-10)
    return noise


def voronoi_noise_2d(shape, num_points=50, seed=None):
    """Generate Voronoi cell noise."""
    rng = np.random.RandomState(seed)
    points_x = rng.randint(0, shape[0], num_points)
    points_y = rng.randint(0, shape[1], num_points)
    values = rng.rand(num_points)
    xx, yy = np.mgrid[0:shape[0], 0:shape[1]]
    min_dist = np.full(shape, np.inf)
    min_val = np.zeros(shape, dtype=np.float64)
    for i in range(num_points):
        dist = (xx - points_x[i])**2 + (yy - points_y[i])**2
        mask = dist < min_dist
        min_val[mask] = values[i]
        min_dist[mask] = dist[mask]
    return min_val


def diamond_square(size, seed=None, roughness=0.5):
    """Generate diamond-square heightmap."""
    rng = np.random.RandomState(seed)
    n = size
    if n < 2:
        return np.zeros((1, 1))
    # Pad to power of 2
    p = 1
    while p < n:
        p *= 2
    grid = rng.rand(p+1, p+1).astype(np.float64)
    step = p
    scale = 1.0
    while step > 1:
        half = step // 2
        # Diamond
        for y in range(0, p, step):
            for x in range(0, p, step):
                avg = (grid[y,x] + grid[y+step,x] + grid[y,x+step] + grid[y+step,x+step]) / 4.0
                grid[y+half, x+half] = avg + scale * (rng.rand() - 0.5)
        # Square
        for y in range(0, p+1, half):
            for x in range((y + half) % step, p+1, step):
                neighbors = []
                if y >= half: neighbors.append(grid[y-half, x])
                if y+half <= p: neighbors.append(grid[y+half, x])
                if x >= half: neighbors.append(grid[y, x-half])
                if x+half <= p: neighbors.append(grid[y, x+half])
                grid[y, x] = np.mean(neighbors) + scale * (rng.rand() - 0.5)
        step = half
        scale *= roughness
    return grid[:n, :n]


def generate_gradient_field(w, h, seed=None):
    """Generate gradient field (linear, radial, or angular)."""
    rng = np.random.RandomState(seed)
    kind = rng.choice(['linear', 'radial', 'angular'])
    xx, yy = np.meshgrid(np.linspace(0, 1, w), np.linspace(0, 1, h))
    angle = rng.rand() * 2 * np.pi
    if kind == 'linear':
        val = xx * np.cos(angle) + yy * np.sin(angle)
    elif kind == 'radial':
        cx, cy = rng.rand(2)
        val = np.sqrt((xx - cx)**2 + (yy - cy)**2)
    else:
        cx, cy = rng.rand(2)
        val = np.arctan2(yy - cy, xx - cx) / (2 * np.pi) + 0.5
    return (val - val.min()) / (val.max() - val.min() + 1e-10)


def generate_checkerboard(w, h, seed=None, num_squares=None):
    """Generate checkerboard pattern with varying square sizes."""
    rng = np.random.RandomState(seed)
    if num_squares is None:
        num_squares = rng.randint(2, 32)
    sq_w = w // num_squares
    sq_h = h // num_squares
    xx = np.arange(w) // max(sq_w, 1)
    yy = np.arange(h) // max(sq_h, 1)
    board = (xx[np.newaxis, :] + yy[:, np.newaxis]) % 2
    return board.astype(np.float64)


def generate_sine_interference(w, h, seed=None, num_waves=5):
    """Generate sine wave interference pattern."""
    rng = np.random.RandomState(seed)
    xx, yy = np.meshgrid(np.linspace(0, 2*np.pi, w), np.linspace(0, 2*np.pi, h))
    val = np.zeros((h, w), dtype=np.float64)
    for _ in range(num_waves):
        freq = rng.uniform(0.5, 8.0)
        phase = rng.uniform(0, 2*np.pi)
        angle = rng.uniform(0, 2*np.pi)
        val += np.sin(freq * (xx * np.cos(angle) + yy * np.sin(angle)) + phase)
    val = (val - val.min()) / (val.max() - val.min() + 1e-10)
    return val


def generate_concentric_circles(w, h, seed=None):
    """Generate concentric circle pattern."""
    rng = np.random.RandomState(seed)
    cx, cy = rng.rand(2)
    xx, yy = np.meshgrid(np.linspace(0, 1, w), np.linspace(0, 1, h))
    r = np.sqrt((xx - cx)**2 + (yy - cy)**2)
    freq = rng.uniform(5, 20)
    val = np.sin(freq * r * np.pi)
    val = (val - val.min()) / (val.max() - val.min() + 1e-10)
    return val


def augment_patch(patch, rng):
    """Apply random augmentation to a uint16 RGB patch."""
    # Random horizontal flip
    if rng.rand() < 0.5:
        patch = patch[:, ::-1, :].copy()
    # Random vertical flip
    if rng.rand() < 0.5:
        patch = patch[::-1, :, :].copy()
    # Random 90-degree rotation
    k = rng.randint(0, 4)
    if k > 0:
        patch = np.rot90(patch, k, axes=(0, 1)).copy()
    # Random crop (already cropped to target size, but shift by up to 32 pixels)
    if patch.shape[0] > 256 and patch.shape[1] > 256:
        y0 = rng.randint(0, patch.shape[0] - 256)
        x0 = rng.randint(0, patch.shape[1] - 256)
        patch = patch[y0:y0+256, x0:x0+256, :].copy()
    # Small color jitter (additive noise in int16 range)
    jitter = rng.randint(-500, 501, size=patch.shape, dtype=np.int32)
    patch = np.clip(patch.astype(np.int32) + jitter, 0, 65535).astype(np.uint16)
    return patch


def generate_synthetic_rgb(w, h, seed=None):
    """Generate a synthetic RGB image from random procedural generator."""
    rng = np.random.RandomState(seed)
    generators = [
        lambda: fractal_noise_2d((h, w), octaves=rng.randint(3, 7), seed=seed),
        lambda: voronoi_noise_2d((h, w), num_points=rng.randint(10, 200), seed=seed),
        lambda: generate_gradient_field(w, h, seed=seed),
        lambda: generate_checkerboard(w, h, seed=seed),
        lambda: generate_sine_interference(w, h, seed=seed),
        lambda: generate_concentric_circles(w, h, seed=seed),
    ]
    # Pick 3 different generators for R, G, B
    gen_indices = rng.choice(len(generators), 3, replace=True)
    planes = []
    for gi in gen_indices:
        planes.append(generators[gi]())
    rgb = np.stack(planes, axis=-1)  # (H, W, 3) in [0, 1]
    # Convert to uint16
    rgb_u16 = (rgb * 65535).astype(np.uint16)
    return rgb_u16


def generate_perlin_rgb(w, h, seed=None, scales=None):
    """Generate RGB image from multi-scale Perlin noise."""
    rng = np.random.RandomState(seed)
    if scales is None:
        scales = [rng.randint(2, 8) for _ in range(3)]
    planes = []
    for ch in range(3):
        res = (scales[ch], scales[ch])
        n = perlin_noise_2d((h, w), res, seed=rng.randint(0, 2**31))
        n = (n - n.min()) / (n.max() - n.min() + 1e-10)
        planes.append(n)
    rgb = np.stack(planes, axis=-1)
    return (rgb * 65535).astype(np.uint16)


def generate_diamond_square_rgb(w, h, seed=None):
    """Generate RGB image from diamond-square heightmaps."""
    rng = np.random.RandomState(seed)
    planes = []
    for _ in range(3):
        roughness = rng.uniform(0.3, 0.8)
        hm = diamond_square(max(w, h), seed=rng.randint(0, 2**31), roughness=roughness)
        hm = hm[:h, :w]
        hm = (hm - hm.min()) / (hm.max() - hm.min() + 1e-10)
        planes.append(hm)
    rgb = np.stack(planes, axis=-1)
    return (rgb * 65535).astype(np.uint16)


def write_ppm_u16(path, img_u16):
    """Write uint16 RGB image as PPM P6."""
    h, w, _ = img_u16.shape
    with open(path, 'wb') as f:
        f.write(f'P6\n{w} {h}\n65535\n'.encode())
        # Big-endian uint16
        f.write(img_u16.astype('>u2').tobytes())


def main():
    parser = argparse.ArgumentParser(description="Generate procedural training data for neural codec")
    parser.add_argument("--output-dir", required=True, help="Output directory for PPM files")
    parser.add_argument("--num-patches", type=int, default=100000, help="Number of patches to generate")
    parser.add_argument("--patch-size", type=int, default=256, help="Patch size (NxN)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    rng = np.random.RandomState(args.seed)

    print(f"Generating {args.num_patches} {args.patch_size}x{args.patch_size} uint16 RGB patches...")
    print(f"Output: {args.output_dir}")
    print(f"Seed: {args.seed}")

    # Generator weights (probability of each type)
    gen_types = ['fractal', 'voronoi', 'gradient', 'checkerboard', 'sine', 'concentric',
                 'perlin_rgb', 'diamond_square']
    gen_probs = [0.25, 0.15, 0.15, 0.1, 0.1, 0.1, 0.075, 0.075]

    for i in range(args.num_patches):
        kind = rng.choice(gen_types, p=gen_probs)
        child_seed = rng.randint(0, 2**31)

        if kind == 'fractal':
            img = generate_synthetic_rgb(args.patch_size, args.patch_size, seed=child_seed)
        elif kind == 'voronoi':
            img = generate_synthetic_rgb(args.patch_size, args.patch_size, seed=child_seed)
        elif kind == 'gradient':
            img = generate_synthetic_rgb(args.patch_size, args.patch_size, seed=child_seed)
        elif kind == 'checkerboard':
            img = generate_synthetic_rgb(args.patch_size, args.patch_size, seed=child_seed)
        elif kind == 'sine':
            img = generate_synthetic_rgb(args.patch_size, args.patch_size, seed=child_seed)
        elif kind == 'concentric':
            img = generate_synthetic_rgb(args.patch_size, args.patch_size, seed=child_seed)
        elif kind == 'perlin_rgb':
            img = generate_perlin_rgb(args.patch_size, args.patch_size, seed=child_seed)
        elif kind == 'diamond_square':
            img = generate_diamond_square_rgb(args.patch_size, args.patch_size, seed=child_seed)
        else:
            img = generate_synthetic_rgb(args.patch_size, args.patch_size, seed=child_seed)

        # Augment
        img = augment_patch(img, rng)

        fname = f"synth_{i:06d}.ppm"
        write_ppm_u16(os.path.join(args.output_dir, fname), img)

        if (i + 1) % 10000 == 0:
            print(f"  Generated {i+1}/{args.num_patches} patches...")

    print(f"Done. {args.num_patches} patches written to {args.output_dir}")


if __name__ == "__main__":
    main()
