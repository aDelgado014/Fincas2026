@echo off
chcp 65001 > nul
title AdminFincas MVP - Servidor
echo ===========================================
echo   INICIANDO ADMINFINCAS MVP...
echo ===========================================
echo.

:: Ir al directorio donde esta este .bat
cd /d "%~dp0"

:: 1. Comprobar Node.js
node --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js no esta instalado o no esta en el PATH.
    echo Descargalo de: https://nodejs.org
    pause
    exit /b 1
)

:: 2. Comprobar archivo .env
if not exist ".env" (
    echo AVISO: No se encontro el archivo .env
    echo Copiando .env.example como .env...
    if exist ".env.example" (
        copy ".env.example" ".env" > nul
        echo Archivo .env creado. EDITA las claves antes de continuar.
        echo.
        notepad ".env"
    ) else (
        echo ERROR: Tampoco existe .env.example. Crea el archivo .env manualmente.
        pause
        exit /b 1
    )
) else (
    echo [1/3] Archivo .env OK
)

:: 3. Instalar dependencias si no existen
if not exist "node_modules" (
    echo [2/3] Instalando dependencias ^(primera vez, puede tardar unos minutos^)...
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Fallo al instalar dependencias.
        pause
        exit /b 1
    )
) else (
    echo [2/3] Dependencias OK
)

:: 4. Arrancar servidor
echo [3/3] Arrancando servidor...
echo.
echo Aplicacion disponible en: http://localhost:3000
echo Usuario por defecto: admin@bluecrabai.es / 0000
echo Para detener el servidor pulsa Ctrl+C
echo.
npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo El servidor se detuvo con un error. Revisa los mensajes anteriores.
    pause
)
