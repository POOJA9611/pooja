@echo off
setlocal enabledelayedexpansion
title Smart Real-Time Project Team Finder System - Starting Portal...

echo ==============================================================================
echo       SMART REAL-TIME PROJECT TEAM FINDER SYSTEM - ACADEMIC PORTAL
echo           Python Flask + MySQL + Vanilla JS + Socket.IO Architecture
echo ==============================================================================
echo.

:: Detect Python
set PYTHON_CMD=python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
        set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    ) else (
        echo [ERROR] Python 3 was not detected in PATH or standard installation folder!
        echo Please ensure Python 3.10+ is installed.
        pause
        exit /b 1
    )
)

echo [*] Python executable found: %PYTHON_CMD%
%PYTHON_CMD% --version

:: Ensure UTF-8 output encoding for emojis and clean logs
set PYTHONIOENCODING=utf-8

:: Initialize database & seed demo accounts
echo [*] Checking database seed status...
%PYTHON_CMD% -c "import backend.demo_seed; backend.demo_seed.seed_all()" >nul 2>&1

:: Launch browser in background after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5000"

:: Start the Flask + Socket.IO server
echo [*] Launching Flask Application on http://localhost:5000 ...
echo [*] Press Ctrl+C at any time to stop the server.
echo.
%PYTHON_CMD% app.py

pause
