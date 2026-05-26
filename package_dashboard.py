"""Build a distributable V06 dashboard package."""

from __future__ import annotations

import shutil
import subprocess
import zipfile
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
WEB_DIR = ROOT_DIR / "web"
RELEASE_DIR = ROOT_DIR / "release"
PACKAGE_ZIP = RELEASE_DIR / "MuhuratFinder_V06_Dashboard_Package.zip"


EXCLUDED_DIRS = {"node_modules", "__pycache__", "release", ".tmp"}
EXCLUDED_SUFFIXES = {".bak", ".backup", ".tmp", ".temp"}


def package_path(path: Path) -> str:
    return path.relative_to(ROOT_DIR).as_posix()


def should_exclude(path: Path) -> bool:
    parts = set(path.relative_to(ROOT_DIR).parts)
    if parts & EXCLUDED_DIRS:
        return True
    name = path.name
    if name.startswith("~$"):
        return True
    if name.endswith("~"):
        return True
    return path.suffix.lower() in EXCLUDED_SUFFIXES


def run_export() -> None:
    subprocess.run(["python", "export_excel_to_json.py"], cwd=ROOT_DIR, check=True)


def run_npm_build_if_available() -> str:
    npm = shutil.which("npm.cmd") or shutil.which("npm")
    if npm is None:
        return "skipped: npm not available"
    subprocess.run([npm, "run", "build"], cwd=WEB_DIR, check=True)
    return "success"


def create_package() -> None:
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    if PACKAGE_ZIP.exists():
        PACKAGE_ZIP.unlink()

    with zipfile.ZipFile(PACKAGE_ZIP, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        pending = [ROOT_DIR]
        while pending:
            current_dir = pending.pop()
            for path in current_dir.iterdir():
                if path == PACKAGE_ZIP or should_exclude(path):
                    continue
                if path.is_dir():
                    pending.append(path)
                elif path.is_file():
                    archive.write(path, package_path(path))


def main() -> None:
    run_export()
    build_result = run_npm_build_if_available()
    create_package()
    print(f"BUILD_RESULT={build_result}")
    print(f"PACKAGE_ZIP={package_path(PACKAGE_ZIP)}")


if __name__ == "__main__":
    main()
