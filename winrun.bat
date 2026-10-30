@echo off
setlocal
title Locket Web Launcher (Windows)
cd /d "%~dp0"

echo =========================================================
echo   Dang khoi chay Locket Web (Windows System Python)...
echo =========================================================

where py >nul 2>nul
if %errorlevel% equ 0 (
    py app.py %*
) else (
    where python >nul 2>nul
    if %errorlevel% equ 0 (
        python app.py %*
    ) else (
        echo [!] Khong tim thay Python tren he thong Windows!
        echo [*] Vui long cai dat Python tai https://www.python.org/ va tich chon "Add to PATH".
        pause
        exit /b 1
    )
)

if %errorlevel% neq 0 (
    echo.
    echo [!] Da co loi xay ra khi chay ung dung.
    pause
)
