@echo off
title Instalador AdminFincas MVP
echo ===========================================
echo   BIENVENIDO AL INSTALADOR DE ADMINFINCAS
echo ===========================================
echo.
node install.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Hubo un error durante la instalacion.
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo Proceso de instalacion finalizado.
pause
