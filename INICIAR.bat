@echo off
title Sistema Financeiro - Novera Academy
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js nao encontrado. Instale em https://nodejs.org e execute este arquivo novamente.
  echo.
  pause
  exit /b 1
)

start "" http://localhost:3300
node servidor.js
pause
