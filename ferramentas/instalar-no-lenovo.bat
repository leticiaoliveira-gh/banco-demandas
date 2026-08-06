@echo off
rem =====================================================================
rem  DUPLO CLIQUE AQUI para instalar o site num computador novo.
rem  Ele chama o instalador de verdade (instalar-no-lenovo.ps1), que
rem  confere o Git, cria a pasta limpa C:\Projetos, baixa o site e
rem  coloca a biblioteca de design no lugar certo.
rem  Nao apaga nada.
rem =====================================================================
title Instalador do site - Central de Demandas NP
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar-no-lenovo.ps1"
echo.
echo Terminou. Leia o relatorio acima.
pause
