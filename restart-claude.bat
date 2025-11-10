@echo off
echo ========================================
echo  Claude Desktop Restart Script
echo ========================================
echo.

echo [1/3] Killing Claude Desktop process...
taskkill /F /IM "Claude.exe" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Claude Desktop closed successfully
) else (
    echo ℹ Claude Desktop was not running
)

echo.
echo [2/3] Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo [3/3] Starting Claude Desktop...
start "" "%LOCALAPPDATA%\Programs\claude-desktop\Claude.exe"

echo.
echo ✓ Done! Claude Desktop is restarting...
echo ========================================
echo.
pause
