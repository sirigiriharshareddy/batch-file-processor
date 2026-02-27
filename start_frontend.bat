@echo off
SET PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0frontend"
echo Starting React frontend...
cmd /c "C:\Program Files\nodejs\npm.cmd" run dev
pause
