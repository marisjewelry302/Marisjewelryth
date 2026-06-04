@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-next-dev.ps1" %*
