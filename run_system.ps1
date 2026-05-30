Set-Location -LiteralPath "$PSScriptRoot"

Write-Host "Starting AI Code Review & Bug Detection System..." -ForegroundColor Cyan

# 1. Start FastAPI backend in a new window
Write-Host "1. Launching FastAPI backend server on http://127.0.0.1:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-File", "$PSScriptRoot\run_backend.ps1"

# 2. Start Vite frontend in a new window
Write-Host "2. Launching Vite frontend server on http://localhost:5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-File", "$PSScriptRoot\run_frontend.ps1"

# 3. Wait for initialization
Write-Host "3. Waiting for servers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 4. Open in browser
Write-Host "4. Opening Web App in browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host "System started successfully!" -ForegroundColor Green
