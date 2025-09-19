# --------------------------------------------
# Realtime IDS — Windows 1-Click Setup Script
# --------------------------------------------

# 1. Set project root
$projectRoot = "C:\Desktop\TEST_IDS\Realtime-unsupervised-models-AI-based-IDS"

Write-Host "Starting setup for Realtime IDS at $projectRoot" -ForegroundColor Cyan

# 2. Check Python
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "Python is not installed or not in PATH. Please install Python 3.10+" -ForegroundColor Red
    exit
}

# 3. Create virtual environment
if (-not (Test-Path "$projectRoot\venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv "$projectRoot\venv"
} else {
    Write-Host "Virtual environment already exists." -ForegroundColor Green
}

# 4. Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& "$projectRoot\venv\Scripts\Activate.ps1"

# 5. Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# 6. Fix requirements.txt for dependency conflicts
$reqFile = "$projectRoot\requirements.txt"
(Get-Content $reqFile) -replace "python-engineio==4.4.0","python-engineio>=4.7.0,<5.0" | Set-Content $reqFile

# 7. Install Python dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
pip install -r $reqFile

# 8. Check WinPcap/Npcap
$npcapPath = "C:\Program Files\Npcap\"
$winpcapPath = "C:\Program Files (x86)\WinPcap\"
if ((Test-Path $npcapPath) -or (Test-Path $winpcapPath)) {
    Write-Host "Npcap/WinPcap detected." -ForegroundColor Green
} else {
    Write-Host "Warning: Npcap/WinPcap not found. Install from https://nmap.org/npcap/ or https://www.winpcap.org/install/" -ForegroundColor Red
}

# 9. Start Backend
Write-Host "Starting backend server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit","-Command `"cd $projectRoot; .\venv\Scripts\Activate.ps1; python server_v2.py`""

# 10. Start Frontend
$frontendPath = "$projectRoot\frontend"
if (Test-Path $frontendPath) {
    Write-Host "Starting frontend..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit","-Command `"cd $frontendPath; npm install; npm start`""
} else {
    Write-Host "Frontend folder not found at $frontendPath" -ForegroundColor Red
}

Write-Host "Setup script finished. Backend and frontend should now be running." -ForegroundColor Green
