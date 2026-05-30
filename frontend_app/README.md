# AI-Powered Code Review & Vulnerability Detection System

An intelligent AI-driven code review platform that automatically analyzes source code and Jupyter notebooks for code quality, security vulnerabilities, bugs, and best-practice violations. The system combines traditional static analysis tools with transformer-based deep learning models to provide comprehensive code insights and actionable recommendations.

## overview

This project helps developers improve software quality by performing automated code reviews using:

Static Code Analysis
Security Vulnerability Detection
AI-Based Bug Detection
Jupyter Notebook Analysis
Code Quality Assessment
Automated Review Reports

The platform exposes a REST API that accepts Python files or Jupyter notebooks and returns detailed review reports containing detected issues, vulnerabilities, and improvement suggestions.
This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## React + Vite

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

### React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

### Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Features
### Static Code Analysis
- Detects coding standard violations
- Finds code smells
- Identifies maintainability issues
- Generates linting reports

### Security Analysis
- Detects common security vulnerabilities
- Identifies unsafe coding patterns
- Security-focused code inspection

### AI-Powered Bug Detection
- Uses CodeBERT Transformer Model
- Trained on the Devign Vulnerability Dataset
- Predicts potential vulnerabilities in source code
- Binary classification of secure/insecure code segments

### Jupyter Notebook Support
- Upload and analyze .ipynb files
- Extracts code cells automatically
- Performs security and quality analysis

### REST API
- Easy integration with IDEs and CI/CD pipelines
- JSON-based responses
- Fast analysis workflow

### System Architecture
                ┌─────────────────┐

                │ Source Code File│

                └────────┬────────┘

                         │

                         ▼
                ┌─────────────────┐

                │ File Upload API │

                └────────┬────────┘

                         │

        ┌────────────────┼────────────────┐

        ▼                ▼                ▼
 ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
 │ Static      │ │ Security    │ │ AI Bug      │

 │ Analysis    │ │ Analysis    │ │ Detection   │

 └─────────────┘ └─────────────┘ └─────────────┘

        │                │                │

        └────────────────┼────────────────┘

                         ▼
                ┌─────────────────┐

                │ Review Report   │
                
                └─────────────────┘

## Technologies Used
- Programming Language
   - Python 3.x
- Backend Framework
   - FastAPI
- Machine Learning
   - Hugging Face Transformers
   - CodeBERT
   - PyTorch
- Static Analysis
    - Pylint
    - Security Analysis
    - Bandit
- Dataset
    - DetectVul / Devign Dataset
- API Testing
    - Requests
    - Notebook Processing
    - Jupyter Notebook Parser

The vulnerability detection model is built using Microsoft's CodeBERT transformer architecture and trained using the DetectVul/Devign dataset.

##  Project Structure
AI-Code-Review-System/

│

├── app.py                      # FastAPI application

├── train_bug_detector.py       # Model training script

├── sample_test_code.py         # Sample code for testing

├── test_api.py                 # API testing script

├── test_ipynb_api.py           # Notebook testing script

├── test_notebook.ipynb         # Sample notebook

├── config.json                 # CodeBERT model configuration

│

├── models/

│   └── codebert/

│

├── reports/

│

├── requirements.txt

│

└── README.md

##  AI Model Information
 - Model

- CodeBERT (microsoft/codebert-base)

- Key Specifications:

    - Transformer Architecture
    - 12 Hidden Layers
    - 12 Attention Heads
    -  Hidden Size: 768
    - Vocabulary Size: 50,265
    - Binary Classification Output

Configured for vulnerability classification tasks.

## Installation
Clone Repository
git clone https://github.com/your-username/AI-Code-Review-System.git

cd AI-Code-Review-System

Create Virtual Environment

python -m venv venv

Activate Environment

Windows

venv\Scripts\activate

Linux / Mac

source venv/bin/activate

Install Dependencies

pip install -r requirements.txt

▶️ Run the Application

Start the FastAPI server:

uvicorn app:app --reload

Server:

http://127.0.0.1:8000

API Documentation:

http://127.0.0.1:8000/docs
🧪 Testing the API

Analyze Python File

python test_api.py

The script uploads a Python file to:

POST /analyze

and receives a JSON report.

Analyze Jupyter Notebook

python test_ipynb_api.py

The notebook is uploaded and analyzed similarly through the API endpoint.

## Sample Output
{
  "static_analysis": {
    "tool": "pylint",
    "report": "Code quality issues detected"
  },
  "security_analysis": {
    "tool": "bandit",
    "report": "Security warnings found"
  },
  "ai_vulnerability_prediction": {
    "prediction": "Potential Vulnerability"
  }
}

## Use Cases
- Automated Code Reviews
- Secure Software Development
- CI/CD Quality Gates
- Educational Programming Labs
- Vulnerability Detection Research
- Software Engineering Projects
- AI-Assisted Development

## Future Enhancements
- Multi-language Support (Java, C++, JavaScript)
- GitHub Integration
- Pull Request Analysis
- AI-generated Fix Suggestions
- Code Refactoring Recommendations
- Docker Deployment
- Real-time IDE Plugin
- Severity-Based Risk Scoring

### Author
Renugha V

📜 License

This project is licensed under the Education Purpose only

 If you found this project useful, consider starring the repository.
