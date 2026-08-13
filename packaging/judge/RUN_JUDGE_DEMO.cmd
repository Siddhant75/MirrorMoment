@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN_JUDGE_DEMO.ps1"
exit /b %ERRORLEVEL%
