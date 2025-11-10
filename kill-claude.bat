@echo off
echo Killing Claude Desktop...
taskkill /F /IM "Claude.exe" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Claude Desktop closed successfully
) else (
    echo ℹ Claude Desktop was not running
)
echo.
pause
