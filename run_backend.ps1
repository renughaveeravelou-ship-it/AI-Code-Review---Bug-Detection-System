Set-Location -LiteralPath "$PSScriptRoot"
uvicorn backend.app:app --reload --reload-dir backend --host 127.0.0.1 --port 8000
