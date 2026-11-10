@echo off
chcp 65001 >nul
title Cerebro de Capri
cd /d "%~dp0"
rem Busca Python (el lanzador py, python o python3). No necesita instalar nada más.
set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY where python3 >nul 2>nul && set "PY=python3"
if not defined PY (
  echo No encuentro Python en esta PC.
  echo Opcion 1: usa Capri-Cerebro.exe ^(no necesita Python^).
  echo Opcion 2: instala Python 3 desde https://www.python.org/downloads/ ^(marca "Add python.exe to PATH"^)
  echo           o escribe en una terminal:  winget install Python.Python.3.12
  pause
  exit /b 1
)
%PY% capri_cerebro.py --abrir %*
if errorlevel 1 pause
