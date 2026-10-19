#!/usr/bin/env python3
"""YT-Studio Project Validation Script."""

import subprocess
import sys
from datetime import datetime
from pathlib import Path


def colored(text: str, color: str | None = None) -> str:
    """Add color to text for terminal output."""
    colors: dict[str, str] = {
        "red": "31",
        "green": "32",
        "yellow": "33",
        "blue": "34",
        "magenta": "35",
        "cyan": "36",
    }
    if color and color in colors:
        return f"\033[{colors[color]}m{text}\033[0m"
    return text


def run_command(cmd: str, description: str) -> bool:
    """Run a shell command and return success status."""
    print(colored(f"\n🔧 {description}...", "cyan"))
    try:
        cwd: str = str(Path.cwd())
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd)
        if result.returncode == 0:
            print(colored(f"   ✅ {description} passed", "green"))
            if result.stdout.strip():
                print(f"   📝 {result.stdout.strip()[:200]}")
            return True
        print(colored(f"   ❌ {description} failed", "red"))
        if result.stderr.strip():
            print(f"   Error: {result.stderr.strip()[:200]}")
        return False
    except Exception as e:
        print(colored(f"   ❌ Error: {e}", "red"))
        return False


def check_file_exists(filepath: str, description: str) -> bool:
    """Check if a file exists and print status."""
    exists: bool = Path(filepath).exists()
    status: str = "✅" if exists else "❌"
    color: str = "green" if exists else "red"
    print(colored(f"   {status} {description}: {filepath}", color))
    return exists


def check_pyproject() -> bool:
    """Parse and validate pyproject.toml."""
    print(colored("\n📋 Checking pyproject.toml...", "cyan"))

    pyproject_path = Path("pyproject.toml")
    if not pyproject_path.exists():
        print(colored("   ❌ pyproject.toml not found!", "red"))
        return False

    try:
        import tomllib

        with pyproject_path.open("rb") as f:
            data = tomllib.load(f)

        project = data.get("project", {})
        print(colored(f"   ✅ Project: {project.get('name', 'N/A')}", "green"))
        print(colored(f"   ✅ Version: {project.get('version', 'N/A')}", "green"))
        print(colored(f"   ✅ Python: {project.get('requires-python', 'N/A')}", "green"))
        return True
    except Exception as e:
        print(colored(f"   ❌ Error parsing: {e}", "red"))
        return False


def check_pre_commit() -> bool:
    """Check pre-commit configuration."""
    print(colored("\n🔗 Checking pre-commit hooks...", "cyan"))

    if check_file_exists(".pre-commit-config.yaml", "Pre-commit config"):
        result = subprocess.run("pre-commit --version", shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(colored(f"   ✅ pre-commit installed: {result.stdout.strip()}", "green"))
            return True
        print(colored("   ⚠️ pre-commit not installed. Run: pip install pre-commit", "yellow"))
        return False
    return False


def check_circleci() -> bool:
    """Check CircleCI configuration."""
    print(colored("\n🔄 Checking CircleCI configuration...", "cyan"))

    checks_passed: bool = True
    checks_passed &= check_file_exists(".circleci/config.yml", "CircleCI config")
    checks_passed &= check_file_exists(".circleci/deploy.yml", "CircleCI deploy")

    return checks_passed


def check_github_actions() -> bool:
    """Check GitHub Actions workflows."""
    print(colored("\n⚙️ Checking GitHub Actions workflows...", "cyan"))

    workflows_dir = Path(".github/workflows")
    if not workflows_dir.exists():
        print(colored("   ❌ .github/workflows directory not found", "red"))
        return False

    workflow_files: list[Path] = list(workflows_dir.glob("*.yml")) + list(
        workflows_dir.glob("*.yaml"),
    )
    print(colored(f"   ✅ Found {len(workflow_files)} workflow(s)", "green"))

    for wf in workflow_files:
        print(colored(f"      - {wf.name}", "dim"))

    return len(workflow_files) > 0


def run_ruff_check() -> bool:
    """Run ruff linter."""
    print(colored("\n🔍 Running Ruff checks...", "cyan"))

    result = subprocess.run("ruff --version", shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(colored("   ⚠️ ruff not installed. Run: pip install ruff", "yellow"))
        return False

    return run_command("ruff check . --statistics", "Ruff linting")


def run_mypy_check() -> bool:
    """Run mypy type checker."""
    print(colored("\n📝 Running MyPy type checks...", "cyan"))

    result = subprocess.run("mypy --version", shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(colored("   ⚠️ mypy not installed. Run: pip install mypy", "yellow"))
        return False

    py_files: list[Path] = list(Path().rglob("*.py"))
    py_files = [f for f in py_files if ".venv" not in str(f) and "node_modules" not in str(f)]

    if not py_files:
        print(colored("   ⚠️ No Python files found to check", "yellow"))
        return True

    return run_command("mypy . --ignore-missing-imports", "MyPy type checking")


def check_nodejs() -> bool:
    """Check Node.js/TypeScript configuration."""
    print(colored("\n📦 Checking Node.js/TypeScript setup...", "cyan"))

    checks_passed: bool = True
    checks_passed &= check_file_exists("package.json", "package.json")
    checks_passed &= check_file_exists("functions/package.json", "functions/package.json")
    checks_passed &= check_file_exists("functions/tsconfig.json", "TypeScript config")

    result = subprocess.run("pnpm --version", shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        print(colored(f"   ✅ pnpm available: v{result.stdout.strip()}", "green"))
    else:
        print(colored("   ⚠️ pnpm not found. Install with: npm install -g pnpm", "yellow"))

    return checks_passed


def generate_summary(results: dict[str, bool]) -> None:
    """Generate a summary report."""
    print(colored("\n" + "=" * 60, "cyan"))
    print(colored("📊 YT-Studio Validation Summary", "bold"))
    print(colored("=" * 60, "cyan"))

    passed: int = sum(1 for v in results.values() if v)
    total: int = len(results)

    for name, passed_flag in results.items():
        status: str = "✅" if passed_flag else "❌"
        color: str = "green" if passed_flag else "red"
        print(colored(f"   {status} {name}", color))

    print(colored("\n" + "-" * 40, "dim"))

    if passed == total:
        print(colored(f"🎉 All {total} checks passed!", "green"))
    else:
        print(colored(f"⚠️ {passed}/{total} checks passed", "yellow"))

    print(colored(f"\n📅 Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", "dim"))
    print(colored("=" * 60, "cyan"))


def main() -> None:
    """Main execution function."""
    print(colored("\n🚀 YT-Studio Project Validation", "cyan"))
    print(colored("=" * 60, "cyan"))

    results: dict[str, bool] = {
        "pyproject.toml": check_pyproject(),
        "Pre-commit hooks": check_pre_commit(),
        "CircleCI": check_circleci(),
        "GitHub Actions": check_github_actions(),
        "Ruff linting": run_ruff_check(),
        "MyPy type check": run_mypy_check(),
        "Node.js/TypeScript": check_nodejs(),
    }

    generate_summary(results)

    if not all(results.values()):
        sys.exit(1)


if __name__ == "__main__":
    main()
