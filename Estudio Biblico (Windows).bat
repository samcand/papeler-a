@echo off
chcp 65001 >nul
title Estudio Biblico
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Falta Node.js. Descargalo de https://nodejs.org ^(version LTS^), instalalo
  echo   y vuelve a hacer doble clic en este archivo.
  echo.
  start "" "https://nodejs.org"
  pause
  exit /b 1
)
node tools\servidor.mjs --abrir /biblia/
pause
