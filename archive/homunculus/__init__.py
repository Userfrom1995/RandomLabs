"""Homunculus - a genetic-algorithm CLI that evolves random strings into a target phrase."""

from .homunculus import __version__, fitness, main, uniform_crossover

__all__ = ["__version__", "fitness", "main", "uniform_crossover"]
