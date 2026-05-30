import subprocess


def run_pylint_analysis(file_path):
    if not file_path.lower().endswith(".py"):
        return {
            "tool": "pylint",
            "report": "Skipped: Pylint analysis only supports Python files."
        }

    try:
        result = subprocess.run(
            ["pylint", file_path],
            capture_output=True,
            text=True,
            check=False
        )

        report = result.stdout or result.stderr
        return {
            "tool": "pylint",
            "report": report.strip()
        }
    except FileNotFoundError:
        return {
            "tool": "pylint",
            "report": "Skipped: pylint is not installed in the environment."
        }
    except Exception as exc:
        return {
            "tool": "pylint",
            "report": f"Pylint execution failed: {exc}"
        }
