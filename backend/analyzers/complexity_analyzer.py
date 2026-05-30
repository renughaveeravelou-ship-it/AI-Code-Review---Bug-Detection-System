from radon.complexity import cc_visit


def analyze_complexity(file_path):
    if not file_path.lower().endswith(".py"):
        return [
            {"warning": "Skipped: complexity analysis only supports Python files."}
        ]

    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        code = f.read()

    try:
        complexity = cc_visit(code)
    except SyntaxError as exc:
        return [
            {"warning": f"Complexity analysis skipped due to parse error: {exc}"}
        ]
    except Exception as exc:
        return [
            {"warning": f"Complexity analysis failed: {exc}"}
        ]

    results = []

    for item in complexity:
        results.append({
            "function": item.name,
            "complexity": item.complexity
        })

    return results

