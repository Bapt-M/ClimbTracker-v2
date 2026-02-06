<#
.SYNOPSIS
    Run Selenium E2E tests for ClimbTracker

.DESCRIPTION
    This script:
    1. Creates a Python virtual environment
    2. Installs dependencies
    3. Runs the specified tests
    4. Generates an HTML report
    5. Cleans up (removes venv and test artifacts)

.PARAMETER TestType
    Type of tests to run: full, admin, lambda (default: full)

.PARAMETER KeepVenv
    If specified, keeps the virtual environment after tests

.PARAMETER Headless
    If specified, runs tests in headless mode

.EXAMPLE
    .\run-selenium-tests.ps1 -TestType full
    .\run-selenium-tests.ps1 -TestType admin -Headless
#>

param(
    [Parameter(Position=0)]
    [ValidateSet("full", "admin", "lambda")]
    [string]$TestType = "full",

    [switch]$KeepVenv,
    [switch]$Headless
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Step($message) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $message -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host "[OK] $message" -ForegroundColor Green
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Yellow
}

# Get script directory and e2e directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$E2EDir = Join-Path $ProjectRoot "e2e"
$VenvDir = Join-Path $E2EDir "venv"
$ReportsDir = Join-Path $E2EDir "reports"
$ScreenshotsDir = Join-Path $E2EDir "screenshots"

# Determine test file based on type
$TestFile = switch ($TestType) {
    "full"   { "test_full_navigation.py" }
    "admin"  { "test_admin_navigation.py" }
    "lambda" { "test_lambda_user_navigation.py" }
}

$StartTime = Get-Date

Write-Host ""
Write-Host "  ____  _ _           _                     _____         _       " -ForegroundColor Magenta
Write-Host " / ___|| (_)_ __ ___ | |__   ___ _ __ ___  |_   _|__  ___| |_ ___ " -ForegroundColor Magenta
Write-Host " \___ \| | | '_ \` _ \| '_ \ / _ \ '__/ _ \   | |/ _ \/ __| __/ __|" -ForegroundColor Magenta
Write-Host "  ___) | | | | | | | | |_) |  __/ | |  __/   | |  __/\__ \ |_\__ \" -ForegroundColor Magenta
Write-Host " |____/|_|_|_| |_| |_|_.__/ \___|_|  \___|   |_|\___||___/\__|___/" -ForegroundColor Magenta
Write-Host ""
Write-Host "  ClimbTracker E2E Selenium Tests" -ForegroundColor White
Write-Host ""

Write-Info "Test type: $TestType"
Write-Info "Test file: $TestFile"
Write-Info "Headless mode: $Headless"
Write-Info "Keep venv: $KeepVenv"

# Check if Python is installed
Write-Step "Checking Python installation"
try {
    $pythonVersion = python --version 2>&1
    Write-Success "Python found: $pythonVersion"
} catch {
    Write-Error "Python is not installed or not in PATH"
    exit 1
}

# Navigate to e2e directory
Write-Step "Navigating to e2e directory"
if (-not (Test-Path $E2EDir)) {
    Write-Error "E2E directory not found: $E2EDir"
    exit 1
}
Set-Location $E2EDir
Write-Success "Changed to: $E2EDir"

# Create reports and screenshots directories
Write-Step "Creating output directories"
New-Item -ItemType Directory -Force -Path $ReportsDir | Out-Null
New-Item -ItemType Directory -Force -Path $ScreenshotsDir | Out-Null
Write-Success "Created reports and screenshots directories"

# Create virtual environment
Write-Step "Creating Python virtual environment"
if (Test-Path $VenvDir) {
    Write-Info "Removing existing venv..."
    Remove-Item -Recurse -Force $VenvDir
}
python -m venv venv
Write-Success "Virtual environment created"

# Activate virtual environment
Write-Step "Activating virtual environment"
$ActivateScript = Join-Path $VenvDir "Scripts\Activate.ps1"
. $ActivateScript
Write-Success "Virtual environment activated"

# Install dependencies
Write-Step "Installing dependencies"
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
Write-Success "Dependencies installed"

# Set headless mode if requested
if ($Headless) {
    $env:HEADLESS = "true"
    Write-Info "Headless mode enabled"
}

# Run tests
Write-Step "Running Selenium tests: $TestType"
$ReportFile = Join-Path $ReportsDir "test_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').html"

$pytestArgs = @(
    "-v",
    "--tb=short",
    "--html=$ReportFile",
    "--self-contained-html",
    $TestFile
)

Write-Info "Running: pytest $($pytestArgs -join ' ')"
Write-Host ""

$TestResult = 0
try {
    pytest @pytestArgs
    $TestResult = $LASTEXITCODE
} catch {
    $TestResult = 1
    Write-Error "Tests failed with exception: $_"
}

# Deactivate virtual environment
Write-Step "Deactivating virtual environment"
deactivate
Write-Success "Virtual environment deactivated"

# Cleanup
Write-Step "Cleaning up"

# Remove virtual environment unless --KeepVenv is specified
if (-not $KeepVenv) {
    Write-Info "Removing virtual environment..."
    Remove-Item -Recurse -Force $VenvDir -ErrorAction SilentlyContinue
    Write-Success "Virtual environment removed"
} else {
    Write-Info "Keeping virtual environment (--KeepVenv specified)"
}

# Remove __pycache__ directories
Get-ChildItem -Path $E2EDir -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Write-Success "Python cache cleaned"

# Remove .pytest_cache
$PytestCache = Join-Path $E2EDir ".pytest_cache"
if (Test-Path $PytestCache) {
    Remove-Item -Recurse -Force $PytestCache -ErrorAction SilentlyContinue
    Write-Success "Pytest cache cleaned"
}

# Calculate duration
$EndTime = Get-Date
$Duration = $EndTime - $StartTime

# Final report
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "           TEST SUMMARY                 " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($TestResult -eq 0) {
    Write-Host "  Status: " -NoNewline
    Write-Host "PASSED" -ForegroundColor Green
} else {
    Write-Host "  Status: " -NoNewline
    Write-Host "FAILED" -ForegroundColor Red
}

Write-Host "  Test Type: $TestType"
Write-Host "  Duration: $($Duration.ToString('mm\:ss'))"
Write-Host "  Report: $ReportFile"
Write-Host ""

# Open report in browser
if (Test-Path $ReportFile) {
    Write-Info "Opening test report in browser..."
    Start-Process $ReportFile
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Return to project root
Set-Location $ProjectRoot

exit $TestResult
