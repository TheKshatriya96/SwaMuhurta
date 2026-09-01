"""Wrap the existing GitHub Pages deployment flow for V06."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent


def run_git(command: list[str], capture_output: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *command],
        cwd=PROJECT_ROOT,
        check=True,
        text=True,
        capture_output=capture_output,
    )


def has_changes() -> bool:
    result = run_git(["status", "--porcelain"], capture_output=True)
    return bool(result.stdout.strip())


def main() -> None:
    parser = argparse.ArgumentParser(description="Commit and push V06 dashboard updates.")
    parser.add_argument(
        "--message",
        default="Update dashboard data",
        help="Commit message for the dashboard update.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show whether there are changes, but do not push anything.",
    )
    args = parser.parse_args()

    if not (PROJECT_ROOT / ".git").exists():
        raise SystemExit(f"Git repository not found at {PROJECT_ROOT}")

    if not has_changes():
        print("STATUS=No changes to commit.")
        return

    if args.dry_run:
        print("STATUS=Changes detected. Dry run only.")
        return

    run_git(["add", "."])
    if not has_changes():
        print("STATUS=Nothing to commit after staging.")
        return

    run_git(["commit", "-m", args.message])
    run_git(["push"])
    print("STATUS=Changes pushed. GitHub Actions will publish the dashboard.")


if __name__ == "__main__":
    main()
