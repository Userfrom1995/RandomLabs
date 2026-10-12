#!/usr/bin/env python3
"""Launcher: `python3 pacman/pacman.py [flags]`. No install step required."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "src"))

from shell.cli import main

if __name__ == "__main__":
    sys.exit(main())
