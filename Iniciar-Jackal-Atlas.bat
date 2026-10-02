@echo off
title Jackal Atlas Local Server
cd /d "%~dp0"
cls
echo ========================================================
echo       🌙 JACKAL ATLAS - CENTRAL TÁTICA (ROUND 2)
echo ========================================================
echo.
echo [1] Servidor local: http://localhost:3001
echo [2] Abrindo navegador no Mapa Tático...
echo.
start http://localhost:3001/index.html
node server.js
pause
