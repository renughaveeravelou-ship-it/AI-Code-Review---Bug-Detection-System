import os
import re
from openai import OpenAI, OpenAIError
from ..utils.memory_db import get_preferences, get_adaptive_learning

api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key) if api_key else None


def generate_fallback_review(file_path, pylint_report, security_report, complexity_report, bug_prediction):
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            code = f.read()
    except Exception:
        code = ""

    # Load preferences for personalization
    prefs = get_preferences()
    exp_level = prefs.get('experience_level', 'Intermediate')
    style = prefs.get('coding_style', 'PEP8 standard')
    framework = prefs.get('framework_focus', 'General Python')
    sec_priority = prefs.get('security_priority', 'High')

    pylint_score = "N/A"
    pylint_body = ""
    if pylint_report and isinstance(pylint_report, dict):
        pylint_body = pylint_report.get("report", "")
        match = re.search(r"Your code has been rated at (\-?[0-9\.]+)/10", pylint_body)
        if match:
            pylint_score = match.group(1)

    bandit_body = ""
    has_security_issues = False
    if security_report and isinstance(security_report, dict):
        bandit_body = security_report.get("report", "")
        if "No issues identified" not in bandit_body and "Test results:" in bandit_body:
            has_security_issues = True

    max_complexity = 1
    complex_functions = []
    if complexity_report and isinstance(complexity_report, list):
        for item in complexity_report:
            if isinstance(item, dict) and "complexity" in item:
                comp = item["complexity"]
                func = item.get("function", "anonymous")
                if comp > max_complexity:
                    max_complexity = comp
                if comp > 5:
                    complex_functions.append(f"`{func}` (Complexity: {comp})")

    bug_risk = False
    if bug_prediction and isinstance(bug_prediction, dict):
        bug_risk = bug_prediction.get("bug_detected", False)

    review = []
    review.append("### Personalized Local Quality Review")
    review.append(f"\n> [!NOTE]")
    review.append(f"> **Adaptive Persona**: Level: `{exp_level}` | Focus: `{framework}` | Style: `{style}`")
    if not client:
        review.append("> *(OpenAI API key not configured; using local parser customized to your profile)*")
    
    review.append("\n#### 1. Code Quality & Standards")
    if pylint_score != "N/A":
        review.append(f"- **Pylint Score**: `{pylint_score}/10` (Targeting {style})")
    else:
        review.append("- **Pylint Score**: Not available")
        
    docstring_issues = []
    other_warnings = []
    if pylint_body:
        for line in pylint_body.split("\n"):
            if "missing-docstring" in line or "C0114" in line or "C0115" in line or "C0116" in line:
                docstring_issues.append(line.split(":")[-1].strip())
            elif any(code in line for code in ["C0", "W0", "R0", "E0"]):
                other_warnings.append(line.split(":")[-1].strip())

    if docstring_issues:
        review.append("- **Documentation Needed**: Missing module or function docstrings.")
    if other_warnings:
        review.append(f"- **Style/Refactoring Points**: Found {len(other_warnings)} violations relative to {style}.")
    if not docstring_issues and not other_warnings and pylint_score != "N/A" and float(pylint_score) >= 9.0:
        review.append("- **Excellent Standards**: The code conforms well to standard guidelines.")

    review.append("\n#### 2. Security Assessment")
    if has_security_issues:
        review.append(f"- **Security Alerts (Priority: {sec_priority})**: Bandit scan detected potential vulnerabilities.")
        for line in bandit_body.split("\n"):
            if "Severity:" in line or "Confidence:" in line or "Location:" in line:
                review.append(f"  - {line.strip()}")
    else:
        review.append("- **No Security Issues**: Bandit scan did not find any common security flaws.")

    review.append("\n#### 3. Complexity & Maintainability")
    if max_complexity <= 5:
        review.append(f"- **Low Complexity**: Maximum complexity is `{max_complexity}`, indicating high readability.")
    else:
        review.append(f"- **High Complexity**: Maximum complexity is `{max_complexity}`. Highly complex functions require decomposition. Complex functions: " + ", ".join(complex_functions))

    review.append("\n#### 4. Bug Risk Prediction")
    if bug_risk:
        review.append("- **High Bug Risk**: The CodeBERT classifier predicted a high probability of logical bugs.")
    else:
        review.append("- **Low Bug Risk**: CodeBERT did not detect common bug patterns.")

    review.append("\n#### 5. Adaptive recommendations for you")
    recommendations = []
    if docstring_issues:
        recommendations.append(f"Add docstrings to all modules, classes, and functions to satisfy your `{style}` target.")
    if other_warnings:
        recommendations.append("Clean up unused variables and style warnings.")
    if max_complexity > 5:
        recommendations.append("Refactor highly complex functions into smaller helper functions.")
    if bug_risk:
        recommendations.append("Carefully audit exception handling and edge-case inputs.")
    
    # Adaptive additions based on experience level
    if exp_level == 'Beginner':
        recommendations.append("Tip: Focus on writing readable code and adding docstrings before optimizing performance.")
    elif exp_level == 'Advanced':
        recommendations.append("Tip: Audit performance bottlenecks, ensure code is modular, and check computational complexity.")
        
    if not recommendations:
        recommendations.append("Keep up the good work! The code looks solid and clean.")

    for rec in recommendations:
        review.append(f"- {rec}")

    # Tailor skeleton framework focus
    review.append(f"\n**Suggested starter skeleton for {framework} developers:**")
    review.append("```python")
    review.append('"""')
    review.append(f"Module docstring explaining the {framework} script.")
    review.append('"""')
    if 'FastAPI' in framework:
        review.append("from fastapi import FastAPI")
        review.append("app = FastAPI()")
        review.append("")
        review.append("@app.get('/')")
        review.append("def index():")
        review.append("    return {'message': 'Hello World'}")
    elif 'Data' in framework or 'pandas' in framework or 'Machine Learning' in framework:
        review.append("import pandas as pd")
        review.append("import numpy as np")
        review.append("")
        review.append("def process_data(filepath):")
        review.append("    df = pd.read_csv(filepath)")
        review.append("    return df.describe()")
    else:
        review.append("def main():")
        review.append("    # Your implementation here")
        review.append("    pass")
    review.append("```")

    return "\n".join(review)


def ai_review(file_path, pylint_report=None, security_report=None, complexity_report=None, bug_prediction=None):
    # Fetch user personalization context
    prefs = get_preferences()
    exp_level = prefs.get('experience_level', 'Intermediate')
    style = prefs.get('coding_style', 'PEP8 standard')
    framework = prefs.get('framework_focus', 'General Python')
    strictness = prefs.get('review_strictness', 'Normal')
    sec_priority = prefs.get('security_priority', 'High')

    if not client:
        return generate_fallback_review(file_path, pylint_report, security_report, complexity_report, bug_prediction)

    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        code = f.read()

    prompt = f"""
    You are an expert AI code reviewer. Please review this code with a personalized perspective.
    
    USER PROFILE & PREFERENCES:
    - Experience Level: {exp_level}
    - Target Coding Style: {style}
    - Framework Focus: {framework}
    - Review Strictness: {strictness}
    - Security Priority: {sec_priority}

    INSTRUCTIONS:
    1. Adapt your review tone and technical depth to the user's level ({exp_level}).
       - Beginner: explain concepts simply, focus on basic readability and standard library helpers.
       - Advanced: focus on design patterns, async performance, scalability, and type hints.
    2. Assess standard styling adherence relative to "{style}".
    3. Provide actionable suggestions specifically targeting "{framework}".
    4. Highlight any bugs, logical defects, or security concerns. Adjust strictness to "{strictness}".
    
    REPORTS FROM STATIC SCANNERS:
    - Pylint: {pylint_report}
    - Security (Bandit): {security_report}
    - McCabe Complexity (Radon): {complexity_report}
    - Bug Risk Prediction (CodeBERT): {bug_prediction}

    CODE TO REVIEW:
    {code}

    Please return your review formatted beautifully using Markdown headers (###), lists (-), and alerts if necessary (> [!NOTE] or > [!WARNING]). Include a recommendation section and suggested refactored code blocks.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        return response.choices[0].message.content
    except (OpenAIError, Exception) as exc:
        print(f"OpenAI error, falling back to local review: {exc}")
        return generate_fallback_review(file_path, pylint_report, security_report, complexity_report, bug_prediction)


