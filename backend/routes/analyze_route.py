from fastapi import APIRouter, UploadFile, File
import re
from ..utils.file_handler import save_uploaded_file
from ..analyzers.static_analyzer import run_pylint_analysis
from ..analyzers.security_scanner import run_bandit_scan
from ..analyzers.complexity_analyzer import analyze_complexity
from ..analyzers.ai_reviewer import ai_review
from ..models.bug_detector import predict_bug
from ..services.report_service import generate_report
from ..utils.memory_db import save_review, update_adaptive_metric, set_preference, get_preferences

router = APIRouter()


@router.post("/analyze")
async def analyze_code(file: UploadFile = File(...)):

    file_path = save_uploaded_file(file)

    try:
        pylint_report = run_pylint_analysis(file_path)
    except Exception as exc:
        pylint_report = {
            "tool": "pylint",
            "error": f"Pylint analysis failed: {exc}"
        }

    try:
        security_report = run_bandit_scan(file_path)
    except Exception as exc:
        security_report = {
            "tool": "bandit",
            "error": f"Bandit scan failed: {exc}"
        }

    try:
        complexity_report = analyze_complexity(file_path)
    except Exception as exc:
        complexity_report = [{
            "warning": f"Complexity analysis failed: {exc}"
        }]

    try:
        bug_prediction = predict_bug(file_path)
    except Exception as exc:
        bug_prediction = {
            "bug_detected": False,
            "error": f"Bug prediction failed: {exc}"
        }

    try:
        ai_response = ai_review(
            file_path,
            pylint_report=pylint_report,
            security_report=security_report,
            complexity_report=complexity_report,
            bug_prediction=bug_prediction
        )
    except Exception as exc:
        ai_response = f"AI review failed: {exc}"

    final_report = generate_report(
        pylint_report,
        security_report,
        complexity_report,
        bug_prediction,
        ai_response
    )

    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            code_content = f.read()
            final_report["analyzed_code"] = code_content
    except Exception:
        code_content = ""

    # SAVE TO MEMORY DATABASE & ADAPTIVE LEARNING UPDATE
    try:
        # Extract numerical score
        pylint_score_str = final_report["summary"]["code_quality"]["score"]
        pylint_score_val = None
        if pylint_score_str and "/" in pylint_score_str:
            try:
                pylint_score_val = float(pylint_score_str.split("/")[0])
            except ValueError:
                pass
        
        sec_status = final_report["summary"]["security"]["label"]
        comp_label = final_report["summary"]["complexity"]["label"]
        bug_risk_label = final_report["summary"]["bug_risk"]["label"]
        
        # Save to DB
        review_id = save_review(
            filename=file.filename,
            pylint_score=pylint_score_val,
            security_status=sec_status,
            complexity_label=comp_label,
            bug_risk_label=bug_risk_label,
            ai_review=ai_response,
            code=code_content,
            full_report_json=final_report
        )
        
        # Inject DB id into response
        final_report["id"] = review_id
        
        # 1. Update style warning frequencies
        pylint_body = pylint_report.get("report", "") if isinstance(pylint_report, dict) else ""
        warnings_found = re.findall(r"\(([CWER0-9]+)\)", pylint_body)
        for w in warnings_found:
            update_adaptive_metric(f"pylint_warning_{w}", 1, w)
            
        # 2. Update security warnings
        report_body = security_report.get("report", "") if isinstance(security_report, dict) else ""
        if "Severity: High" in report_body:
            update_adaptive_metric("security_high_vulns", 1, "High Severity Vulnerability")
        if "Severity: Medium" in report_body:
            update_adaptive_metric("security_medium_vulns", 1, "Medium Severity Vulnerability")
            
        # 3. Update complexity metric
        if complexity_report and isinstance(complexity_report, list):
            for item in complexity_report:
                if isinstance(item, dict) and "complexity" in item:
                    if item["complexity"] > 5:
                        update_adaptive_metric("high_complexity_functions", 1, f"Function: {item.get('function')}")
                        
        # 4. Update bug prediction count
        if bug_prediction and isinstance(bug_prediction, dict) and bug_prediction.get("bug_detected", False):
            update_adaptive_metric("bugs_predicted_count", 1, "Logical Bug Detected")
            
        # 5. Smart Preference Learning: Auto-learn Framework from import scanning
        imports = re.findall(r"^(?:import|from)\s+([a-zA-Z0-9_]+)", code_content, re.MULTILINE)
        if imports:
            current_prefs = get_preferences()
            detected_fw = None
            if "fastapi" in imports:
                detected_fw = "FastAPI Web App"
            elif "django" in imports:
                detected_fw = "Django Web App"
            elif "flask" in imports:
                detected_fw = "Flask Web App"
            elif any(x in imports for x in ["pandas", "numpy", "sklearn", "torch", "tensorflow"]):
                detected_fw = "Data Science & ML"
                
            if detected_fw and current_prefs.get("framework_focus") != detected_fw:
                set_preference("framework_focus", detected_fw)
                update_adaptive_metric("detected_frameworks", 1, f"Detected developer focus: {detected_fw}")
                
    except Exception as db_exc:
        print(f"Database saving failed: {db_exc}")

    return final_report


