from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import json
import re
from ..utils.memory_db import (
    get_history, get_review, delete_review,
    get_chat_history, save_chat_message,
    get_preferences, set_preference, get_adaptive_learning
)
from ..analyzers.ai_reviewer import client

router = APIRouter(prefix="/api")

class PreferenceUpdate(BaseModel):
    preferences: Dict[str, str]

class ChatRequest(BaseModel):
    message: str
    review_id: Optional[str] = None


@router.get("/history")
def fetch_history():
    try:
        return get_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{review_id}")
def fetch_review_details(review_id: str):
    review = get_review(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review session not found")
    
    # Load associated chat history
    chat_history = get_chat_history(review_id)
    return {
        "review": review,
        "chat_history": chat_history
    }


@router.delete("/history/{review_id}")
def remove_review(review_id: str):
    success = delete_review(review_id)
    return {"success": success}


@router.get("/preferences")
def fetch_preferences():
    return get_preferences()


@router.post("/preferences")
def update_preferences(data: PreferenceUpdate):
    for k, v in data.preferences.items():
        set_preference(k, v)
    return {"success": True, "preferences": get_preferences()}


@router.get("/recommendations")
def fetch_recommendations():
    """
    Generates smart developer recommendations based on:
    1. User's chosen experience level and target style guide.
    2. Adaptive learning metrics (violations they trigger frequently in audits).
    """
    prefs = get_preferences()
    metrics = get_adaptive_learning()
    
    exp_level = prefs.get('experience_level', 'Intermediate')
    framework = prefs.get('framework_focus', 'General Python')
    style = prefs.get('coding_style', 'PEP8 standard')
    
    recs = []
    
    # 1. Experience level recommendations
    if exp_level == 'Beginner':
        recs.append({
            "category": "Education",
            "title": "Mastering Docstrings & Documentation",
            "description": "Your code quality score suffers when modules and functions lack documentation. Learn Python PEP 257 standards for writing docstrings.",
            "action_link": "https://peps.python.org/pep-0257/"
        })
    elif exp_level == 'Advanced':
        recs.append({
            "category": "Architecture",
            "title": "Designing High-Performance Systems",
            "description": "Ensure your functions conform to single-responsibility. Audit data processing paths for caching options and async task queues.",
            "action_link": "https://fastapi.tiangolo.com/advanced/"
        })

    # 2. Framework focus recommendations
    if "FastAPI" in framework:
        recs.append({
            "category": "Framework Tip",
            "title": "Use FastAPI Dependency Injection",
            "description": "Avoid instantiating database clients globally inside routers. Leverage Depends() to maintain testability and clean architecture.",
            "action_link": "https://fastapi.tiangolo.com/tutorial/dependencies/"
        })
    elif "Data" in framework or "pandas" in framework:
        recs.append({
            "category": "Performance",
            "title": "Optimizing Pandas Vectorization",
            "description": "Avoid using loops (for, iterrows) to process Pandas dataframes. Leverage vectorized operations or .apply() for up to 100x speedups.",
            "action_link": "https://pandas.pydata.org/pandas-docs/stable/user_guide/enhancingperf.html"
        })

    # 3. Adaptive learning triggers (Scan SQLite logs for frequent warnings)
    high_complexity = metrics.get("high_complexity_functions")
    if high_complexity and high_complexity["count"] > 0:
        recs.append({
            "category": "Complexity Alert",
            "title": "Refactoring Complex Logic",
            "description": f"We noticed {high_complexity['count']} occurrences of high function complexity (radon value > 5). Extract nested blocks into helper functions.",
            "action_link": "https://radon.readthedocs.io/en/latest/intro.html"
        })

    security_high = metrics.get("security_high_vulns")
    if security_high and security_high["count"] > 0:
        recs.append({
            "category": "Security Hazard",
            "title": "Mitigating High-Risk Vulnerabilities",
            "description": "Bandit detected high-severity vulnerabilities (e.g. command injection or hardcoded credentials). Audit variables using environmental configurations.",
            "action_link": "https://bandit.readthedocs.io/en/latest/"
        })

    # Generic style recommendation based on pylint scores
    recs.append({
        "category": "Style Guide",
        "title": f"Adhering to {style}",
        "description": "Run auto-formatters like Black or Ruff in your IDE to automatically format code, resolve style warnings, and keep your quality score at 10/10.",
        "action_link": "https://github.com/psf/black"
    })
    
    return recs


@router.post("/chat")
def chat_assistant(request: ChatRequest):
    user_message = request.message
    review_id = request.review_id
    
    # 1. Fetch user preferences to provide personalized context
    prefs = get_preferences()
    exp_level = prefs.get('experience_level', 'Intermediate')
    style = prefs.get('coding_style', 'PEP8 standard')
    framework = prefs.get('framework_focus', 'General Python')
    
    # Save user message
    save_chat_message("user", user_message, review_id)
    
    # 2. Check if OpenAI is configured
    if client:
        # Construct system prompt
        system_prompt = f"""
        You are a supportive, high-caliber AI Programming Coach and Code Review assistant.
        
        Developer Profile:
        - Experience Level: {exp_level}
        - Coding Style Target: {style}
        - Framework Focus: {framework}
        
        Keep your advice actionable, clear, and specifically tailored to their experience level.
        """
        
        if review_id:
            review = get_review(review_id)
            if review:
                system_prompt += f"""
                
                You are discussing the file "{review['filename']}". Here is the review context:
                - Pylint score: {review['pylint_score']}/10
                - Security Status: {review['security_status']}
                - McCabe Complexity: {review['complexity_label']}
                - Bug Risk Prediction: {review['bug_risk_label']}
                
                Code being discussed:
                ```python
                {review['code']}
                ```
                
                Refer to this code and these analysis results if the user asks questions about their script.
                """
        
        messages = [{"role": "system", "content": system_prompt}]
        
        # Load previous messages for short-term memory
        chat_hist = get_chat_history(review_id)
        # Add historical messages (excluding the last one we just saved to DB to prevent duplicate)
        for msg in chat_hist[:-1]:
            messages.append({"role": msg['role'], "content": msg['content']})
            
        # Add the current message
        messages.append({"role": "user", "content": user_message})
        
        try:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=messages
            )
            ai_reply = response.choices[0].message.content
            save_chat_message("assistant", ai_reply, review_id)
            return {"reply": ai_reply}
        except Exception as e:
            # If OpenAI fails, fall back to local rule-based assistant
            pass
            
    # 3. Local Rule-Based Chatbot Fallback
    # Scrape review info for local context
    code_info = ""
    quality_notes = ""
    if review_id:
        review = get_review(review_id)
        if review:
            code_info = review['code']
            quality_notes = f"Pylint rate: {review['pylint_score']}/10, security status: {review['security_status']}, complexity: {review['complexity_label']}"

    ai_reply = generate_local_bot_reply(user_message, exp_level, framework, style, code_info, quality_notes)
    save_chat_message("assistant", ai_reply, review_id)
    return {"reply": ai_reply}


def generate_local_bot_reply(message: str, exp_level: str, framework: str, style: str, code_info: str, quality_notes: str) -> str:
    msg_lower = message.lower()
    
    # Greeting / General query
    if any(g in msg_lower for g in ["hello", "hi", "hey", "greetings"]):
        return f"Hello! I am your AI Code Assistant. I have loaded your developer profile (Level: **{exp_level}**, Style: **{style}**, Focus: **{framework}**). How can I help you improve your code today?"
    
    # Audit queries
    if any(q in msg_lower for q in ["audit", "report", "score", "vulnerability", "complexity"]):
        if quality_notes:
            return f"Looking at your uploaded script, here is what I found: **{quality_notes}**. For detailed styling violations, check the Pylint tab, or let me know if you would like a skeleton structure to refactor this logic."
        else:
            return "You haven't analyzed a file in this chat yet. Upload a script in the Code Auditor tab, and I'll break down the report for you here!"
            
    # Requesting Refactoring / Fixes
    if any(f in msg_lower for f in ["fix", "refactor", "correct", "clean"]):
        if code_info:
            return f"Here is a refactored skeleton incorporating `{style}` quality standards for your `{framework}` project:\n\n```python\n# Cleaned skeleton helper\nimport sys\n\ndef main():\n    \"\"\"\n    Main execution block targeting {exp_level} level practices.\n    \"\"\"\n    print('Executing optimized routines...')\n    # TODO: Migrate your logic here safely\n\nif __name__ == '__main__':\n    main()\n```\n\nTo clean up complexity, avoid nesting loops more than 2 levels deep, and pull nested blocks into standalone functions."
        else:
            return "Sure! Upload a script first, and I will help you refactor it. For now, a clean standard python function template looks like this:\n\n```python\ndef execute_task(data: list) -> dict:\n    \"\"\"\n    Tailored for {exp_level} developer focusing on {framework}.\n    \"\"\"\n    results = [x for x in data if x is not None]\n    return {'processed_items': len(results)}\n```"

    # Preference Queries
    if "preference" in msg_lower or "profile" in msg_lower:
        return f"Your preferences are: Experience Level: `{exp_level}`, Target Style: `{style}`, Framework Focus: `{framework}`. You can update these at any time in the Dashboard tab, and my review criteria will adapt instantly."

    # General fallback response
    return f"I see you are working on a **{framework}** script. As a **{exp_level}** developer, here is a quick tip: writing clean, modular helper functions and documenting them using **{style}** headers keeps code maintainable and minimizes bug risk. Let me know if you have a specific question about imports or error handling!"
