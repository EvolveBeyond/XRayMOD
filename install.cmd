@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1

REM ═══════════════════════════════════════════════════════════════
REM  XrayMOD — Windows one-command install (CMD)
REM
REM  CMD:
REM    powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (iwr -UseBasicParsing 'https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.ps1').Content"
REM
REM  PowerShell (prompt starts with PS):
REM    irm https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.ps1 | iex
REM
REM  Support: https://t.me/MRROBOT_DT
REM ═══════════════════════════════════════════════════════════════

echo.
echo  XrayMOD - automatic installer
echo  DEPRECATED: prefer Wizard /install. Shell path kept for compatibility.
echo  Support: https://t.me/MRROBOT_DT
echo.

where powershell >nul 2>&1
if errorlevel 1 (
  echo [X] PowerShell not found.
  exit /b 1
)

REM Single-quoted -Command so CMD does not mangle the script.
REM Cache-bust query so raw CDN is less likely to serve a stale bootstrap.
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (iwr -UseBasicParsing ('https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.ps1?t=' + [guid]::NewGuid().ToString('N'))).Content"
exit /b %ERRORLEVEL%
