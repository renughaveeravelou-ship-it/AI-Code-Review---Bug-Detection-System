from pathlib import Path
import tempfile
import json

UPLOAD_DIR = Path(tempfile.gettempdir()) / "ai_code_review_uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def save_uploaded_file(file):
    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as f:
        f.write(file.file.read())

    # If it is a Jupyter Notebook, extract code cells to a .py file
    if file_path.suffix.lower() == ".ipynb":
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                notebook = json.load(f)
            
            code_lines = []
            for cell in notebook.get("cells", []):
                if cell.get("cell_type") == "code":
                    source = cell.get("source", [])
                    if isinstance(source, list):
                        code_lines.extend(source)
                    elif isinstance(source, str):
                        code_lines.append(source)
                    code_lines.append("\n\n")  # Space out cells

            extracted_code = "".join(code_lines)
            extracted_path = file_path.with_suffix(".py")
            with open(extracted_path, "w", encoding="utf-8") as f:
                f.write(extracted_code)

            return str(extracted_path)
        except Exception:
            # Fall back to original file if parsing fails
            pass

    return str(file_path)

