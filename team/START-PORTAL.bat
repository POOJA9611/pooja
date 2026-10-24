@echo off
setlocal
title Project Guidance and Team Portal Launcher

echo ====================================================
echo   Project Guidance & Team Portal Launcher
echo ====================================================
echo.

:: Ensure we are in the folder where this batch file lives
cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed on this computer!
    echo.
    echo To run this portal, please install Node.js (LTS):
    echo   1. Visit: https://nodejs.org
    echo   2. Download and run the recommended LTS installer
    echo   3. After installation finishes, double-click this file again!
    echo.
    echo ====================================================
    pause
    exit /b 1
)

echo [OK] Node.js detected:
node -v
echo.

:: Check / install server dependencies
if not exist "server\node_modules" (
    echo [1/2] Installing backend packages (first-time setup, please wait)...
    cd server
    call npm install
    cd ..
) else (
    echo [1/2] Backend packages verified.
)

:: Check / install client dependencies if needed
if not exist "client\node_modules" (
    echo [2/2] Installing frontend packages (first-time setup, please wait)...
    cd client
    call npm install --legacy-peer-deps
    cd ..
) else (
    echo [2/2] Frontend packages verified.
)

echo.
echo ====================================================
echo   Launching Portal Application
echo ====================================================
echo   URL: http://localhost:5000
echo   HOD Demo Login:     hod.cs@college.edu / HodPass@2026
echo   Faculty Demo Login: sarah.jenkins@college.edu / Password@123
echo   Student Demo Login: alex.chen@student.edu / Password@123
echo ====================================================
echo.

:: Automatically open default browser after 3 seconds
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:5000"

:: Run the server in this window so logs are clearly visible and window stays open
cd server
call npm start

pause
