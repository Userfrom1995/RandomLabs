"""Allow ``python -m shaftcast``."""

from .shaftcast import main

if __name__ == "__main__":
    raise SystemExit(main())
