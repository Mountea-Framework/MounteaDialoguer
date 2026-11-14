@echo off
rem Mountea Dialoguer CLI, run with the installed app's own runtime (no separate Node.js needed).
rem Lives in <install folder>\resources\cli; add that folder to PATH to type "dialoguer" anywhere.
setlocal
set ELECTRON_RUN_AS_NODE=1
"%~dp0..\..\Mountea Dialoguer.exe" "%~dp0dialoguer.mjs" %*
exit /b %ERRORLEVEL%
