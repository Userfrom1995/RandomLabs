"""Allow ``python -m cadence``."""

from .cadence import main

if __name__ == "__main__":
    raise SystemExit(main())
