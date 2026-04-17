@echo off
REM Golden Reset Command - Full System Recovery (Windows CMD)
REM Use this when the system is in an unknown/unrecoverable state

echo ============================================
echo  GOLDEN RESET - Deep System Recovery
echo ============================================
echo.

REM STEP 1: Kill Node processes
echo [STEP] Terminating Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% == 0 (
    echo [OK] Node processes terminated
) else (
    echo [WARN] No Node processes found or access denied
)
timeout /t 2 /nobreak >nul

REM STEP 2: Clear .next cache
echo.
echo [STEP] Clearing Next.js build cache...
if exist ".next" (
    rmdir /S /Q ".next" 2>nul
    if %errorlevel% == 0 (
        echo [OK] .next cache deleted
    ) else (
        echo [WARN] Could not delete .next (files may be locked)
    )
) else (
    echo [INFO] No .next directory found
)

REM STEP 3: Clear node_modules cache
echo.
echo [STEP] Clearing node_modules cache...
if exist "node_modules\.cache" (
    rmdir /S /Q "node_modules\.cache" 2>nul
    echo [OK] node_modules/.cache cleared
)
if exist "node_modules\.vite" (
    rmdir /S /Q "node_modules\.vite" 2>nul
)
if exist "node_modules\.turbo" (
    rmdir /S /Q "node_modules\.turbo" 2>nul
)

REM STEP 4: Check for skip install flag
if "%1"=="--skip-install" goto SKIP_INSTALL

REM STEP 5: Reinstall dependencies
echo.
echo [STEP] Reinstalling dependencies...
if exist "node_modules" (
    echo [INFO] Backing up node_modules...
    ren node_modules "node_modules_backup_%random%"
)

echo [INFO] Running npm install...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed!
    echo [INFO] Trying with --legacy-peer-deps...
    npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo [ERROR] Recovery install also failed!
        pause
        exit /b 1
    )
)
echo [OK] Dependencies installed

:SKIP_INSTALL
echo.
echo [WARN] Skipping dependency reinstall (--skip-install)

:START_SERVER
echo.
echo ============================================
echo  GOLDEN RESET COMPLETE
echo ============================================
echo.
echo Starting development server...
echo.

npm run dev
