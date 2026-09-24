"""Chunked/resumed CPU driver for the PostFormer matched-budget trainer.

Wraps postformer.harness.train with byte-identical training semantics and
adds crash-safe chunking for standard GitHub CPU runners (no GPU):

- Global budget (--steps/--batch/--lr/...) is identical to train.py. Each
  invocation advances at most --chunk-steps optimizer steps, persists an
  extended resume sidecar, and exits 0. The next invocation (same --out)
  resumes bit-identically: same data episode order, same cosine schedule
  position, same optimizer state.
- Matched-budget discipline is preserved: data RNG keyed by (seed, data)
  only, init RNG keyed by (seed, model, data), cosine LR over the GLOBAL
  total. Resuming never re-keys or reshuffles the stream.
- checkpoint.pt format is unchanged (state_dict + config + args +
  params_no_embed + train_tokens) so every harness --checkpoint flag keeps
  working. Resume state lives in resume.pt alongside it and is never read
  by the eval harnesses.
- New file only (binding parallelization order 2026-09-09): train.py is
  untouched. The Builder owns integrating native --resume into train.py;
  until then this driver is the supported CPU execution method.

Example (one arm, 3000-step gate in 250-step chunks, resumable)::

  export PYTHONPATH=.
  for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
    python -m postformer.harness.train_chunk --model p1-tiny --data mqar \\
      --vocab 256 --n-pairs 64 --steps 3000 --batch 16 --lr 3e-4 --seed 0 \\
      --chunk-steps 250 --out postformer/ledger/checkpoints/p1-tiny-s0
  done

Refs #294.
"""

import argparse
import os
import random

import numpy as np
import torch
import torch.nn.functional as F

from ..models.common import param_count_no_embed, seed_all
from ..models.factory import build_model, parse_model_name
from .train import batch_markov, batch_mqar, cosine_lr
from .util import env_info, write_csv, write_json


RESUME_NAME = "resume.pt"
CKPT_NAME = "checkpoint.pt"
CURVE_NAME = "train_curve.csv"
SUMMARY_NAME = "train_summary.json"
DONE_NAME = "CHUNK_DONE"

# Must match train.py exactly (data stream key).
_DATA_MAGIC = 0x5F3D2917


def _same(a, b):
    return a == b


def _check_resume_compat(saved_args, a):
    """Refuse loudly when a resume dir was created with different hparams.

    Same silent-invalidation class as the train.py family guards: a resumed
    run with a different stream shape would silently break the matched
    budget, so any mismatch is a hard error, never a quiet continue.
    """
    keys = ("model", "seed", "data", "vocab", "n_pairs", "seq_len", "steps",
            "batch", "lr", "warmup", "weight_decay", "grad_clip",
            "window", "slots", "no_accumulator")
    for k in keys:
        if not _same(saved_args.get(k), getattr(a, k)):
            raise SystemExit(
                f"--out resume mismatch on {k}: saved={saved_args.get(k)!r} "
                f"requested={getattr(a, k)!r}; refusing to silently fork "
                f"the matched stream (use a fresh --out)")


def main(argv=None):
    p = argparse.ArgumentParser(description="Chunked matched-budget trainer")
    p.add_argument("--model", required=True, help="e.g. p1-tiny, transformer-tiny")
    p.add_argument("--data", default="mqar", choices=["mqar", "markov"])
    p.add_argument("--vocab", type=int, default=64)
    p.add_argument("--n-pairs", type=int, default=8)
    p.add_argument("--seq-len", type=int, default=128)
    p.add_argument("--steps", type=int, default=3000,
                   help="GLOBAL total steps (identical to train.py --steps)")
    p.add_argument("--batch", type=int, default=16)
    p.add_argument("--lr", type=float, default=3e-4)
    p.add_argument("--warmup", type=int, default=100)
    p.add_argument("--weight-decay", type=float, default=0.1)
    p.add_argument("--grad-clip", type=float, default=1.0)
    p.add_argument("--window", type=int, default=None)
    p.add_argument("--slots", type=int, default=None)
    p.add_argument("--no-accumulator", action="store_true")
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--device", default="cpu")
    p.add_argument("--out", required=True)
    p.add_argument("--log-every", type=int, default=100)
    p.add_argument("--chunk-steps", type=int, default=250,
                   help="max optimizer steps this invocation (resume follows)")
    a = p.parse_args(argv)

    # Same guards as train.py (kept in sync by hand; see module docstring).
    if a.vocab < 16:
        raise SystemExit("--vocab must be >= 16")
    if a.n_pairs > a.vocab:
        raise SystemExit("--n-pairs must be <= --vocab (keys sampled without replacement)")
    if a.n_pairs < 1:
        raise SystemExit("--n-pairs must be >= 1")
    if a.steps < 1:
        raise SystemExit("--steps must be >= 1")
    if a.batch < 1:
        raise SystemExit("--batch must be >= 1")
    if a.log_every < 1:
        raise SystemExit("--log-every must be >= 1")
    if a.chunk_steps < 1:
        raise SystemExit("--chunk-steps must be >= 1")
    if a.lr <= 0:
        raise SystemExit("--lr must be > 0")
    if a.warmup < 0:
        raise SystemExit("--warmup must be >= 0")
    if a.grad_clip <= 0:
        raise SystemExit("--grad-clip must be > 0")
    if a.weight_decay < 0:
        raise SystemExit("--weight-decay must be >= 0")
    if a.seq_len <= 3:
        raise SystemExit("--seq-len must exceed the Markov order (3)")

    family, scale = parse_model_name(a.model)
    if a.window is not None and family not in ("p1", "p2", "p3", "p4", "p5"):
        raise SystemExit("--window applies to p1/p2/p3/p4/p5 arms only (transformer has no window)")
    if a.slots is not None and family != "p2":
        raise SystemExit("--slots applies to p2 arms only")
    if a.no_accumulator and family != "p3":
        raise SystemExit("--no-accumulator applies to p3 arms only")
    if a.window is not None and a.window < 0:
        raise SystemExit("--window must be >= 0")
    if a.slots is not None and a.slots < 0:
        raise SystemExit("--slots must be >= 0")

    os.makedirs(a.out, exist_ok=True)
    resume_path = os.path.join(a.out, RESUME_NAME)
    ckpt_path = os.path.join(a.out, CKPT_NAME)

    overrides = {"vocab_size": a.vocab + 2}
    if a.window is not None:
        overrides["window"] = a.window
    if a.slots is not None:
        overrides["slots"] = a.slots
    if a.no_accumulator:
        overrides["use_accumulator"] = False

    dev = torch.device(a.device)

    if os.path.exists(resume_path):
        blob = torch.load(resume_path, map_location="cpu", weights_only=False)
        _check_resume_compat(blob.get("args") or {}, a)
        # Rebuild the identical graph, then overwrite params (init RNG
        # consumption below is harmless: weights come from the checkpoint).
        seed_all(a.seed, f"train-init-{a.model}-{a.data}")
        model, cfg = build_model(family, scale, dict(overrides))
        ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
        model.load_state_dict(ckpt["state_dict"])
        cfg = ckpt.get("config", cfg)
        model = model.to(dev).train()
        n_params = int(ckpt.get("params_no_embed", param_count_no_embed(model)))
        opt = torch.optim.AdamW(model.parameters(), lr=a.lr,
                                betas=(0.9, 0.95), weight_decay=a.weight_decay)
        opt.load_state_dict(blob["optimizer"])
        data_rng = np.random.default_rng()
        data_rng.bit_generator.state = blob["data_rng_state"]
        torch.set_rng_state(blob["torch_rng_state"])
        random.setstate(blob["random_state"])
        start = int(blob["step"])
        tokens = int(blob["tokens"])
        curve = list(blob.get("curve") or [])
        print(f"[{a.model} s{a.seed}] resumed at step {start}/{a.steps} "
              f"({tokens} tokens)", flush=True)
    else:
        data_sub = seed_all(a.seed, f"train-data-{a.data}")
        data_rng = np.random.default_rng(data_sub ^ _DATA_MAGIC)
        seed_all(a.seed, f"train-init-{a.model}-{a.data}")
        model, cfg = build_model(family, scale, dict(overrides))
        model = model.to(dev).train()
        n_params = param_count_no_embed(model)
        opt = torch.optim.AdamW(model.parameters(), lr=a.lr,
                                betas=(0.9, 0.95), weight_decay=a.weight_decay)
        start = 0
        tokens = 0
        curve = []

    end = min(a.steps, start + a.chunk_steps)
    if start >= a.steps:
        open(os.path.join(a.out, DONE_NAME), "w").write("complete\n")
        print(f"[{a.model} s{a.seed}] already complete ({tokens} tokens)")
        return

    for step in range(start, end):
        lr = cosine_lr(step, a.steps, a.warmup, a.lr)
        for g in opt.param_groups:
            g["lr"] = lr
        if a.data == "mqar":
            ids = batch_mqar(data_rng, a.vocab, a.n_pairs, a.batch).to(dev)
        else:
            ids = batch_markov(data_rng, a.vocab, a.seq_len, a.batch).to(dev)
        logits = model(ids[:, :-1])
        loss = F.cross_entropy(logits.reshape(-1, logits.shape[-1]),
                               ids[:, 1:].reshape(-1))
        opt.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), a.grad_clip)
        opt.step()
        tokens += ids.numel()
        if step % a.log_every == 0 or step == a.steps - 1 or step == end - 1:
            curve.append({"step": step, "loss": float(loss.item()),
                          "lr": lr, "train_tokens": tokens})
            print(f"[{a.model} s{a.seed}] step {step}/{a.steps} "
                  f"loss={loss.item():.4f}", flush=True)

    torch.save({"state_dict": model.state_dict(), "config": cfg,
                "args": vars(a), "params_no_embed": n_params,
                "train_tokens": tokens}, ckpt_path)
    torch.save({"args": vars(a), "step": end, "tokens": tokens,
                "curve": curve, "optimizer": opt.state_dict(),
                "data_rng_state": data_rng.bit_generator.state,
                "torch_rng_state": torch.get_rng_state(),
                "random_state": random.getstate(),
                "params_no_embed": n_params}, resume_path)
    write_csv(os.path.join(a.out, CURVE_NAME),
              ["step", "loss", "lr", "train_tokens"], curve)
    write_json(os.path.join(a.out, SUMMARY_NAME),
               {"model": a.model, "config": cfg, "data": a.data,
                "params_no_embed": n_params, "train_tokens": tokens,
                "final_loss": curve[-1]["loss"],
                "steps_done": end, "steps_total": a.steps,
                "complete": end >= a.steps, "env": env_info()})
    if end >= a.steps:
        open(os.path.join(a.out, DONE_NAME), "w").write("complete\n")
        print(f"saved {ckpt_path} COMPLETE ({tokens} tokens)")
    else:
        print(f"saved {ckpt_path} chunk {end}/{a.steps} ({tokens} tokens)")


if __name__ == "__main__":
    main()
