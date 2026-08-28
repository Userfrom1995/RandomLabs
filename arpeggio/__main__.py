"""Allow ``python -m arpeggio``."""

from .arpeggio import main

if __name__ == "__main__":
    raise SystemExit(main())
