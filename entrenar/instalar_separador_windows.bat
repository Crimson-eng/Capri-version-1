@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Separador de voz y musica para Capri
rem OPCIONAL. Instala audio-separator (open source, MIT: https://github.com/nomadkaraoke/python-audio-separator)
rem en el Python de tu Applio, para que Capri pueda separar la voz de la musica de una cancion completa.
rem Uso:  instalar_separador_windows.bat  [carpeta de Applio]

set "APPLIO=%~1"
if "%APPLIO%"=="" (
  for %%D in ("%USERPROFILE%\Applio" "%USERPROFILE%\Desktop\Applio" "%USERPROFILE%\Documents\Applio" "%USERPROFILE%\Downloads\Applio" "C:\Applio" "D:\Applio") do (
    if "!APPLIO!"=="" if exist "%%~D\env\python.exe" set "APPLIO=%%~D"
  )
)
if "%APPLIO%"=="" (
  echo No encontre Applio. Uso: instalar_separador_windows.bat C:\ruta\de\Applio
  pause
  exit /b 1
)
echo Instalando audio-separator en %APPLIO%\env ...
rem sin [gpu]: usa el onnxruntime que ya trae Applio y no le cambia torch
"%APPLIO%\env\python.exe" -m pip install "audio-separator>=0.30"
echo.
echo Listo. Reinicia el servidor RVC de Capri. La primera separacion baja el modelo (~200 MB).
pause
