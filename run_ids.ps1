# --------------------------------------------
# Realtime IDS — Run Script (no reinstall)
# --------------------------------------------

$projectRoot = "C:\Desktop\TEST_IDS\Realtime-unsupervised-models-AI-based-IDS"

Write-Host "Starting Realtime IDS..." -ForegroundColor Cyan

# Activate venv
& "$projectRoot\venv\Scripts\Activate.ps1"

# Start backend
Start-Process powershell -ArgumentList "-NoExit","-Command `"cd $projectRoot; .\venv\Scripts\Activate.ps1; python server_v2.py`""

# Start frontend
$frontendPath = "$projectRoot\frontend"
if (Test-Path $frontendPath) {
    Start-Process powershell -ArgumentList "-NoExit","-Command `"cd $frontendPath; npm start`""
} else {
    Write-Host "Frontend folder not found at $frontendPath" -ForegroundColor Red
}

Write-Host "Realtime IDS is running." -ForegroundColor Green
