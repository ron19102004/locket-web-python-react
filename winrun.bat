@echo off
setlocal
title Locket Web Launcher (Windows)
cd /d "%~dp0"

echo =========================================================
echo   Dang khoi chay Locket Web (Windows System Python)...
echo =========================================================

:: 1. Xac dinh trinh khoi chay Python (uu tien 'py', sau do la 'python')
set "PY_CMD="
where py >nul 2>nul
if %errorlevel% equ 0 (
    set "PY_CMD=py"
) else (
    where python >nul 2>nul
    if %errorlevel% equ 0 (
        set "PY_CMD=python"
    )
)

if "%PY_CMD%"=="" (
    echo [!] Khong tim thay Python tren he thong Windows!
    echo [*] Vui long cai dat Python tai https://www.python.org/ va tich chon "Add Python to PATH".
    pause
    exit /b 1
)

:: 2. Kiem tra xem da cai dat cac thu vien trong requirements.txt chua
echo [*] Dang kiem tra thu vien Python...
%PY_CMD% -c "import flask, flask_cors, requests, PIL" >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Phat hien chua cai dat day du thu vien.
    echo [*] Dang tien hanh tu dong cai dat tu requirements.txt...
    echo ---------------------------------------------------------
    %PY_CMD% -m pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo.
        echo [!] Cai dat thu vien that bai. Vui long kiem tra ket noi mang.
        pause
        exit /b 1
    )
    echo ---------------------------------------------------------
    echo [OK] Da cai dat day du thu vien thanh cong!
) else (
    echo [OK] Thu vien da duoc cai dat day du.
)

:: 3. Khoi chay ung dung Locket Web
echo.
echo [*] Dang khoi dong may chu Locket Web...
%PY_CMD% app.py %*

if %errorlevel% neq 0 (
    echo.
    echo [!] Da co loi xay ra khi chay ung dung.
    pause
)
