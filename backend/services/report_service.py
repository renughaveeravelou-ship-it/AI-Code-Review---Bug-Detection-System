import re

def generate_report(
    pylint_report,
    security_report,
    complexity_report,
    bug_prediction,
    ai_response
):
    # 1. Code Quality (Pylint)
    pylint_score = "N/A"
    pylint_status = "success"
    pylint_label = "Good"
    pylint_body = ""
    if pylint_report and isinstance(pylint_report, dict):
        pylint_body = pylint_report.get("report", "")
        match = re.search(r"Your code has been rated at (\-?[0-9\.]+)/10", pylint_body)
        if match:
            pylint_score = f"{match.group(1)}/10"
            try:
                score_val = float(match.group(1))
                if score_val >= 9.0:
                    pylint_status = "success"
                    pylint_label = "Excellent"
                elif score_val >= 6.0:
                    pylint_status = "success"
                    pylint_label = "Good"
                else:
                    pylint_status = "warning"
                    pylint_label = "Needs improvement"
            except ValueError:
                pass
        
        if any(w in pylint_body for w in ["missing-docstring", "C0114", "C0115", "C0116"]):
            pylint_status = "warning"
            pylint_label = "Needs docstrings"
        elif "error" in pylint_report:
            pylint_status = "error"
            pylint_label = "Analysis failed"

    # 2. Security (Bandit)
    security_status = "success"
    security_label = "No issues"
    if security_report and isinstance(security_report, dict):
        report_body = security_report.get("report", "")
        if "error" in security_report:
            security_status = "error"
            security_label = "Scan failed"
        elif "No issues identified" not in report_body and "Test results:" in report_body:
            high_count = 0
            med_count = 0
            low_count = 0
            for line in report_body.split("\n"):
                if "Severity: High" in line:
                    high_count += 1
                elif "Severity: Medium" in line:
                    med_count += 1
                elif "Severity: Low" in line:
                    low_count += 1
            
            if high_count > 0:
                security_status = "error"
                security_label = f"Vulnerabilities found ({high_count} High)"
            elif med_count > 0:
                security_status = "warning"
                security_label = f"Vulnerabilities found ({med_count} Med)"
            else:
                security_status = "warning"
                security_label = f"Low risk findings ({low_count} Low)"

    # 3. Complexity (Radon)
    complexity_status = "success"
    max_complexity = 1
    if complexity_report and isinstance(complexity_report, list):
        for item in complexity_report:
            if isinstance(item, dict) and "complexity" in item:
                comp = item["complexity"]
                if comp > max_complexity:
                    max_complexity = comp
    
    if max_complexity <= 5:
        complexity_status = "success"
        complexity_label = f"Excellent ({max_complexity})"
    elif max_complexity <= 10:
        complexity_status = "warning"
        complexity_label = f"Moderate complexity ({max_complexity})"
    else:
        complexity_status = "error"
        complexity_label = f"High complexity ({max_complexity})"

    if complexity_report and isinstance(complexity_report, list) and len(complexity_report) > 0:
        first = complexity_report[0]
        if isinstance(first, dict) and "warning" in first:
            if "failed" in first["warning"].lower():
                complexity_status = "error"
                complexity_label = "Analysis failed"
            else:
                complexity_status = "warning"
                complexity_label = "Complexity skipped"

    # 4. Bug Risk (CodeBERT)
    bug_status = "success"
    bug_label = "No bugs detected"
    if bug_prediction and isinstance(bug_prediction, dict):
        if "error" in bug_prediction:
            bug_status = "error"
            bug_label = "Risk evaluation failed"
        elif bug_prediction.get("bug_detected", False):
            bug_status = "error"
            bug_label = "Bug detected"

    # 5. AI Review
    ai_status = "success"
    ai_label = "Review generated"
    if ai_response and "Local AI Fallback Review" in ai_response:
        ai_status = "error"
        ai_label = "Failed due to OpenAI quota error"
    elif ai_response and ("failed" in ai_response.lower() or "error" in ai_response.lower()):
        ai_status = "error"
        ai_label = "AI Review failed"

    return {
        "summary": {
            "code_quality": {
                "status": pylint_status,
                "label": pylint_label,
                "score": pylint_score
            },
            "security": {
                "status": security_status,
                "label": security_label
            },
            "complexity": {
                "status": complexity_status,
                "label": complexity_label
            },
            "bug_risk": {
                "status": bug_status,
                "label": bug_label
            },
            "ai_review": {
                "status": ai_status,
                "label": ai_label
            }
        },
        "static_analysis": pylint_report,
        "security_analysis": security_report,
        "complexity_analysis": complexity_report,
        "bug_prediction": bug_prediction,
        "ai_review": ai_response
    }

