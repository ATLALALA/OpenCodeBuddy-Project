@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║           OpenCode Buddy - One-Click Setup                   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Check Node.js
echo [1/5] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo ✅ Node.js found: %NODE_VER%

:: Check pnpm
echo.
echo [2/5] Checking pnpm...
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo pnpm not found, installing...
    npm install -g pnpm
    if %errorlevel% neq 0 (
        echo ❌ Failed to install pnpm
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%i in ('pnpm -v') do set PNPM_VER=%%i
echo ✅ pnpm found: v%PNPM_VER%

:: Install dependencies
echo.
echo [3/5] Installing dependencies...
call pnpm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed

:: Build packages
echo.
echo [4/5] Building packages...
call pnpm --filter shared build
call pnpm --filter game-core build
call pnpm --filter renderer-pixi build
if %errorlevel% neq 0 (
    echo ❌ Failed to build packages
    pause
    exit /b 1
)
echo ✅ Packages built

:: Build Electron main process
echo.
echo [5/5] Building Electron app...
cd apps\desktop-electron
call npx tsc --project src\main\tsconfig.preload.json
call npx tsc --project tsconfig.json
cd ..\..
if %errorlevel% neq 0 (
    echo ❌ Failed to build Electron app
    pause
    exit /b 1
)
echo ✅ Electron app built

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    Setup Complete! 🎉                        ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  To start the app:                                           ║
echo ║    pnpm --filter desktop-electron electron:dev               ║
echo ║                                                              ║
echo ║  To install OpenCode plugin:                                 ║
echo ║    Copy packages/bridge-plugin to your OpenCode plugins dir  ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

pause
