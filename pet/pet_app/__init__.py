"""On-screen companion package: procedural sprite plus native window."""

from .controller import WindowController
from .platform import capabilities, clamp_alpha, clamp_scale

__all__ = [
    "WindowController",
    "capabilities",
    "clamp_alpha",
    "clamp_scale",
    "launch",
]


def launch(alpha: float = 1.0, scale: float = 1.0, topmost: bool = True,
           save_path: str | None = None, seed: int | None = None,
           name: str | None = None) -> int:
    """Open the companion window (lazy import keeps this module headless-safe)."""
    from .window import launch as open_window
    return open_window(alpha=alpha, scale=scale, topmost=topmost,
                       save_path=save_path, seed=seed, name=name)
