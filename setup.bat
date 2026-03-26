@echo off
setlocal enabledelayedexpansion

REM ── Figma → Klaviyo Plugin — Setup Script ────────────────────────────────────
REM Requirements: Docker Desktop only — Git, Node.js, and Python are NOT needed.
REM Docker handles everything: cloning, installing dependencies, and building.

set REPO_URL=https://github.com/RFBadmin/figma-klaviyo.git
set REPO_DIR=figma-klaviyo

echo.
echo ==========================================
echo   Figma to Klaviyo  --  Plugin Setup
echo ==========================================
echo.

REM ── 1. Check Docker is running ───────────────────────────────────────────────
docker info >nul 2>&1
if errorlevel 1 (
  echo  X  Docker is not running.
  echo     Open Docker Desktop, wait for it to start,
  echo     then run this script again.
  echo.
  pause
  exit /b 1
)
echo  OK  Docker is running
echo.

REM ── 2. Clone the repository (using Docker — no Git install needed) ───────────
if exist "plugin\" (
  echo  OK  Repository already present
) else if exist "%REPO_DIR%\plugin\" (
  echo  OK  Repository already present
  cd %REPO_DIR%
) else (
  echo Cloning repository ^(no Git install needed -- using Docker^)...
  docker run --rm -v "%CD%":/workspace -w /workspace alpine/git clone %REPO_URL%
  if errorlevel 1 (
    echo.
    echo  X  Clone failed. Check your internet connection and try again.
    echo.
    pause
    exit /b 1
  )
  echo  OK  Repository cloned
  cd %REPO_DIR%
)
echo.

REM ── 3. Build the plugin (Node.js runs inside Docker — not installed locally) ──
echo Installing dependencies and building plugin...
echo (First run takes ~30-60s while Docker downloads the Node.js image)
echo.

docker compose --profile build run --rm build-plugin

if errorlevel 1 (
  echo.
  echo  X  Build failed. Check the output above for errors.
  echo.
  pause
  exit /b 1
)

REM ── 4. Done ──────────────────────────────────────────────────────────────────
echo.
echo ==========================================
echo    Done!
echo ==========================================
echo.
echo  Load the plugin in Figma:
echo.
echo  1. Open Figma Desktop App
echo  2. Main Menu (three lines) - Plugins - Development
echo     - Import plugin from manifest...
echo  3. Select this file:
echo     %CD%\plugin\manifest.json
echo.
echo  The plugin will appear under:
echo  Plugins - Development - Figma to Klaviyo
echo.
pause
