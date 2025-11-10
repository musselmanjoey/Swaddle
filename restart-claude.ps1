# Claude Desktop Restart Script (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Claude Desktop Restart Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill Claude Desktop
Write-Host "[1/3] Killing Claude Desktop process..." -ForegroundColor Yellow
$process = Get-Process -Name "Claude" -ErrorAction SilentlyContinue

if ($process) {
    $process | Stop-Process -Force
    Write-Host "✓ Claude Desktop closed successfully" -ForegroundColor Green
} else {
    Write-Host "ℹ Claude Desktop was not running" -ForegroundColor Gray
}

# Step 2: Wait
Write-Host ""
Write-Host "[2/3] Waiting 2 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Step 3: Restart Claude Desktop
Write-Host ""
Write-Host "[3/3] Starting Claude Desktop..." -ForegroundColor Yellow

$claudePath = "$env:LOCALAPPDATA\Programs\claude-desktop\Claude.exe"

if (Test-Path $claudePath) {
    Start-Process $claudePath
    Write-Host "✓ Done! Claude Desktop is restarting..." -ForegroundColor Green
} else {
    Write-Host "✗ Could not find Claude.exe at: $claudePath" -ForegroundColor Red
    Write-Host "Please update the path in this script" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
