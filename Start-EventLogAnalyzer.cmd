@echo off
title Windows Logs Analyzer
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0scripts\EventLogAnalyzer.ps1"
if errorlevel 1 pause
