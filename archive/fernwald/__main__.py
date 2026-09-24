"""Allow ``python -m fernwald``."""

from .fernwald import main

if __name__ == "__main__":
    raise SystemExit(main())
