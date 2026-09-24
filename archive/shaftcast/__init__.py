"""Shaftcast - a first-person raycasting engine in the terminal."""

from .shaftcast import (
    DEFAULT_RAMP,
    FILL_RAMP,
    Map,
    MapError,
    Player,
    TEXTURES,
    __version__,
    cast_ray,
    generate_maze,
    main,
    parse_map,
    render_frame,
    shade_char,
)

__all__ = [
    "DEFAULT_RAMP",
    "FILL_RAMP",
    "Map",
    "MapError",
    "Player",
    "TEXTURES",
    "__version__",
    "cast_ray",
    "generate_maze",
    "main",
    "parse_map",
    "render_frame",
    "shade_char",
]
