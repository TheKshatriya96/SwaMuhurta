"""Compatibility wrapper for the standalone V06 exporter."""

from __future__ import annotations

import runpy
from pathlib import Path


if __name__ == "__main__":
    runpy.run_path(
        str(Path(__file__).resolve().parent / "build" / "export_excel_to_json.py"),
        run_name="__main__",
    )
