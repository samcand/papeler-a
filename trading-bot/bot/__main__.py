"""Permite ejecutar el bot con ``python -m bot``."""

import sys

from .cli import main

if __name__ == "__main__":
    sys.exit(main())
