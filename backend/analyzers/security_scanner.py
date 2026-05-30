import subprocess


def run_bandit_scan(file_path):
    if not file_path.lower().endswith(".py"):
        return {
            "tool": "bandit",
            "report": "Skipped: Bandit scan only supports Python files."
        }

    try:
        result = subprocess.run(
            ["bandit", "-r", file_path],
            capture_output=True,
            text=True,
            check=False
        )

        report = result.stdout or result.stderr
        return {
            "tool": "bandit",
            "report": report.strip()
        }
    except FileNotFoundError:
        return {
            "tool": "bandit",
            "report": "Skipped: bandit is not installed in the environment."
        }
    except Exception as exc:
        return {
            "tool": "bandit",
            "report": f"Bandit execution failed: {exc}"
        }
