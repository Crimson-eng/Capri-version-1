@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Servidor RVC de Capri
rem Arranca el servidor RVC de Capri con TU Applio (open source, MIT: https://github.com/IAHispano/Applio).
rem Uso:  iniciar_rvc_windows.bat            (busca Applio solo)
rem       iniciar_rvc_windows.bat D:\Applio  (si lo tienes en otra carpeta)
rem La app de escritorio de Capri ya lo hace sola (RELIC - Voz - RVC - Servidor - Iniciar); esto es para la página web.

set "APPLIO=%~1"
if "%APPLIO%"=="" (
  for %%D in ("%USERPROFILE%\Applio" "%USERPROFILE%\Desktop\Applio" "%USERPROFILE%\Documents\Applio" "%USERPROFILE%\Downloads\Applio" "C:\Applio" "D:\Applio") do (
    if "!APPLIO!"=="" if exist "%%~D\env\python.exe" set "APPLIO=%%~D"
  )
)
if "%APPLIO%"=="" (
  echo No encontre Applio. Instalalo primero ^(ver capri-rvc.md^) y vuelve a correr:
  echo     iniciar_rvc_windows.bat C:\ruta\de\Applio
  pause
  exit /b 1
)
if not exist "%APPLIO%\env\python.exe" (
  echo En "%APPLIO%" falta env\python.exe. Corre primero run-install.bat de Applio.
  pause
  exit /b 1
)
set "MODELOS=%USERPROFILE%\Documents\Capri\RVC\modelos"
if not exist "%MODELOS%" mkdir "%MODELOS%"
echo Applio:  %APPLIO%
echo Modelos: %MODELOS%   ^(pon aqui tu .pth y tu .index^)
echo.
"%APPLIO%\env\python.exe" -u "%~dp0capri_rvc_servidor.py" --applio "%APPLIO%" --modelos "%MODELOS%" --puerto 5050
pause
